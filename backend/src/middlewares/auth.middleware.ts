import crypto from 'node:crypto';
import type { RequestHandler } from 'express';

import { prisma } from '../prisma.js';
import { AppError } from '../utils/app-error.js';
import { verifyToken } from '../utils/token.js';

export const authenticate: RequestHandler = async (req, _res, next) => {
  const cookieToken = req.cookies?.hammr_access_token as string | undefined;

  const authorization = req.headers.authorization;

  const bearerToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;

  const token = cookieToken ?? bearerToken;

  if (!token) {
    return next(new AppError(401, 'Authentication required', 'UNAUTHORIZED'));
  }

  try {
    const payload = verifyToken(token);

    if (payload.purpose !== 'auth') {
      return next(new AppError(401, 'Authentication required', 'UNAUTHORIZED'));
    }

    const tokenRecord = await prisma.token.findFirst({
      where: {
        tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
        type: 'ACCESS',
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!tokenRecord) {
      return next(new AppError(401, 'Authentication token is invalid or revoked', 'INVALID_TOKEN'));
    }

    req.user = payload;

    next();
  } catch {
    next(new AppError(401, 'Invalid or expired authentication token', 'INVALID_TOKEN'));
  }
};
