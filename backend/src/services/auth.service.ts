import crypto from 'node:crypto';
import QRCode from 'qrcode';
import * as speakeasy from 'speakeasy';
import type { z } from 'zod';
import { prisma } from '../prisma.js';
import { AppError } from '../utils/app-error.js';
import { decryptSecret, encryptSecret } from '../utils/secret-encryption.js';
import { comparePassword, hashPassword } from '../utils/password.js';
import { verifyToken } from '../utils/token.js';
import { createTwoFactorPendingToken, revokeToken } from './token.service.js';
import type { loginSchema, registerSchema } from './auth.schemas.js';

type RegisterInput = z.infer<typeof registerSchema>;
type LoginInput = z.infer<typeof loginSchema>;

const publicUser = (user: {
  id: number;
  name: string;
  email: string;
  role: 'BUYER' | 'SELLER';
  createdAt: Date;
}) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
});

const createSellerTwoFactor = async (userId: number, email: string) => {
  const generated = speakeasy.generateSecret({
    length: 20,
    name: `Hammr:${email}`,
    issuer: 'Hammr',
  });

  if (!generated.base32 || !generated.otpauth_url) {
    throw new AppError(500, 'Unable to initialize seller 2FA', 'TWO_FACTOR_SETUP_FAILED');
  }

  await prisma.twoFactorAuth.create({
    data: {
      userId,
      secret: encryptSecret(generated.base32),
    },
  });

  return {
    qrCodeDataUrl: await QRCode.toDataURL(generated.otpauth_url),
    manualKey: generated.base32,
  };
};

const setupDataForExistingSecret = async (email: string, encryptedSecret: string) => {
  const secret = decryptSecret(encryptedSecret);
  const otpauthUrl = speakeasy.otpauthURL({
    secret,
    label: `Hammr:${email}`,
    issuer: 'Hammr',
  });

  return {
    qrCodeDataUrl: await QRCode.toDataURL(otpauthUrl),
    manualKey: secret,
  };
};

export const register = async (input: RegisterInput) => {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existing) {
    throw new AppError(409, 'An account with this email already exists', 'EMAIL_ALREADY_EXISTS');
  }

  const passwordHash = await hashPassword(input.password);

  if (input.role === 'BUYER') {
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        role: 'BUYER',
      },
    });

    return {
      user: publicUser(user),
      requiresTwoFactorSetup: false,
    };
  }

  const generated = speakeasy.generateSecret({
    length: 20,
    name: `Hammr:${input.email}`,
    issuer: 'Hammr',
  });

  if (!generated.base32 || !generated.otpauth_url) {
    throw new AppError(500, 'Unable to initialize seller 2FA', 'TWO_FACTOR_SETUP_FAILED');
  }

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      role: 'SELLER',
      twoFactorAuth: {
        create: {
          secret: encryptSecret(generated.base32),
        },
      },
    },
  });

  return {
    user: publicUser(user),
    requiresTwoFactorSetup: true,
    setupToken: await createTwoFactorPendingToken(user.id, user.role),
    qrCodeDataUrl: await QRCode.toDataURL(generated.otpauth_url),
    manualKey: generated.base32,
  };
};

export const login = async (input: LoginInput) => {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: { twoFactorAuth: true },
  });

  if (!user || !user.isActive || !(await comparePassword(input.password, user.passwordHash))) {
    throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  }

  if (user.role === 'SELLER') {
    if (!user.twoFactorAuth) {
      const setup = await createSellerTwoFactor(user.id, user.email);
      return {
        requiresTwoFactorSetup: true,
        setupToken: await createTwoFactorPendingToken(user.id, user.role),
        ...setup,
      };
    }

    if (!user.twoFactorAuth.enabled) {
      const setup = await setupDataForExistingSecret(user.email, user.twoFactorAuth.secret);

      return {
        requiresTwoFactorSetup: true,
        setupToken: await createTwoFactorPendingToken(user.id, user.role),
        ...setup,
      };
    }

    return {
      requiresTwoFactor: true,
      twoFactorToken: await createTwoFactorPendingToken(user.id, user.role),
    };
  }

  return {
    user: publicUser(user),
  };
};

const verifySellerCode = async (token: string, code: string) => {
  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new AppError(401, '2FA session is invalid or expired', 'INVALID_2FA_SESSION');
  }

  if (payload.purpose !== '2fa_pending' || payload.role !== 'SELLER') {
    throw new AppError(401, 'Invalid 2FA session', 'INVALID_2FA_SESSION');
  }

  const pendingToken = await prisma.token.findFirst({
    where: {
      tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
      type: 'TWO_FACTOR_PENDING',
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!pendingToken) {
    throw new AppError(401, '2FA session is invalid or expired', 'INVALID_2FA_SESSION');
  }

  const userId = Number(payload.sub);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { twoFactorAuth: true },
  });

  if (!user || !user.isActive || user.role !== 'SELLER' || !user.twoFactorAuth) {
    throw new AppError(401, 'Invalid 2FA session', 'INVALID_2FA_SESSION');
  }

  const valid = speakeasy.totp.verify({
    secret: decryptSecret(user.twoFactorAuth.secret),
    encoding: 'base32',
    token: code,
    window: 1,
  });

  if (!valid) {
    throw new AppError(401, 'Invalid or expired 2FA code', 'INVALID_2FA_CODE');
  }

  return user;
};

export const verifySellerTwoFactor = async (token: string, code: string) => {
  const user = await verifySellerCode(token, code);

  if (!user.twoFactorAuth?.enabled) {
    throw new AppError(400, 'Seller 2FA setup is not complete', 'TWO_FACTOR_SETUP_REQUIRED');
  }

  await revokeToken(token);

  return { user: publicUser(user) };
};

export const setupSellerTwoFactor = async (setupToken: string, code: string) => {
  const user = await verifySellerCode(setupToken, code);

  await prisma.twoFactorAuth.update({
    where: { userId: user.id },
    data: {
      enabled: true,
      verifiedAt: new Date(),
    },
  });

  await revokeToken(setupToken);

  return { user: publicUser(user) };
};

export const getCurrentUser = async (userId: number) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || !user.isActive) {
    throw new AppError(401, 'User is not available', 'UNAUTHORIZED');
  }

  return publicUser(user);
};
