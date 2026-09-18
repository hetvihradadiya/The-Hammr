import crypto from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';

import { prisma } from '../prisma.js';
import { AppError } from '../utils/app-error.js';
import type { TokenType } from '../generated/prisma/client.js';

type TokenPayload = {
  sub: string;
  role: 'BUYER' | 'SELLER';
  purpose: 'auth' | 'refresh' | '2fa_pending' | 'password_reset';
  jti: string;
};

const ACCESS_TOKEN_EXPIRES_IN = (process.env.JWT_ACCESS_EXPIRES_IN ??
  '15m') as SignOptions['expiresIn'];

const REFRESH_TOKEN_EXPIRES_IN = (process.env.JWT_REFRESH_EXPIRES_IN ??
  '7d') as SignOptions['expiresIn'];

const TWO_FACTOR_PENDING_EXPIRES_IN = (process.env.JWT_2FA_PENDING_EXPIRES_IN ??
  '10m') as SignOptions['expiresIn'];

const PASSWORD_RESET_EXPIRES_IN = (process.env.PASSWORD_RESET_EXPIRES_IN ??
  '15m') as SignOptions['expiresIn'];

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  return secret;
};

const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const createJti = (): string => {
  return crypto.randomUUID();
};

const getExpiryDate = (expiresIn: SignOptions['expiresIn']): Date => {
  if (typeof expiresIn === 'number') {
    return new Date(Date.now() + expiresIn * 1000);
  }

  const value = String(expiresIn);

  const match = value.match(/^(\d+)([smhd])$/);

  if (!match) {
    throw new Error(`Unsupported token expiry format: ${value}`);
  }

  const amount = Number(match[1]);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return new Date(Date.now() + amount * multipliers[unit]);
};

const createJwtToken = (
  userId: number,
  role: 'BUYER' | 'SELLER',
  purpose: TokenPayload['purpose'],
  expiresIn: SignOptions['expiresIn'],
): {
  token: string;
  jti: string;
  expiresAt: Date;
} => {
  const jti = createJti();

  const token = jwt.sign(
    {
      sub: String(userId),
      role,
      purpose,
      jti,
    },
    getJwtSecret(),
    {
      expiresIn,
    },
  );

  return {
    token,
    jti,
    expiresAt: getExpiryDate(expiresIn),
  };
};

const saveToken = async ({
  userId,
  type,
  token,
  expiresAt,
}: {
  userId: number;
  type: TokenType;
  token: string;
  expiresAt: Date;
}) => {
  return prisma.token.create({
    data: {
      userId,
      type,
      tokenHash: hashToken(token),
      expiresAt,
    },
  });
};

export const createAccessToken = async (userId: number, role: 'BUYER' | 'SELLER') => {
  const generated = createJwtToken(userId, role, 'auth', ACCESS_TOKEN_EXPIRES_IN);

  await saveToken({
    userId,
    type: 'ACCESS',
    token: generated.token,
    expiresAt: generated.expiresAt,
  });

  return generated.token;
};

export const createRefreshToken = async (userId: number, role: 'BUYER' | 'SELLER') => {
  const generated = createJwtToken(userId, role, 'refresh', REFRESH_TOKEN_EXPIRES_IN);

  await saveToken({
    userId,
    type: 'REFRESH',
    token: generated.token,
    expiresAt: generated.expiresAt,
  });

  return generated.token;
};

export const createTwoFactorPendingToken = async (userId: number, role: 'BUYER' | 'SELLER') => {
  const generated = createJwtToken(userId, role, '2fa_pending', TWO_FACTOR_PENDING_EXPIRES_IN);

  await saveToken({
    userId,
    type: 'TWO_FACTOR_PENDING',
    token: generated.token,
    expiresAt: generated.expiresAt,
  });

  return generated.token;
};

export const createPasswordResetToken = async (userId: number) => {
  const token = crypto.randomBytes(32).toString('hex');

  const expiresAt = getExpiryDate(PASSWORD_RESET_EXPIRES_IN);

  await saveToken({
    userId,
    type: 'PASSWORD_RESET',
    token,
    expiresAt,
  });

  return token;
};

export const verifyRefreshToken = async (token: string) => {
  let payload: TokenPayload;

  try {
    payload = jwt.verify(token, getJwtSecret()) as TokenPayload;
  } catch {
    throw new AppError(401, 'Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
  }

  if (payload.purpose !== 'refresh') {
    throw new AppError(401, 'Invalid refresh token', 'INVALID_REFRESH_TOKEN');
  }

  const tokenRecord = await prisma.token.findFirst({
    where: {
      tokenHash: hashToken(token),
      type: 'REFRESH',
      revokedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
  });

  if (!tokenRecord) {
    throw new AppError(401, 'Refresh token is invalid or revoked', 'INVALID_REFRESH_TOKEN');
  }

  return {
    userId: Number(payload.sub),
    role: payload.role,
    tokenId: tokenRecord.id,
  };
};

export const revokeToken = async (token: string) => {
  await prisma.token.updateMany({
    where: {
      tokenHash: hashToken(token),
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
};

export const revokeAllUserTokens = async (userId: number) => {
  await prisma.token.updateMany({
    where: {
      userId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
};

export const revokeUserAccessTokens = async (userId: number) => {
  await prisma.token.updateMany({
    where: {
      userId,
      type: 'ACCESS',
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
};

export const rotateRefreshToken = async (refreshToken: string) => {
  const existing = await verifyRefreshToken(refreshToken);

  await revokeToken(refreshToken);

  const accessToken = await createAccessToken(existing.userId, existing.role);

  const newRefreshToken = await createRefreshToken(existing.userId, existing.role);

  return {
    accessToken,
    refreshToken: newRefreshToken,
    userId: existing.userId,
  };
};
