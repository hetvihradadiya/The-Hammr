import type { RequestHandler } from 'express';
import { AppError } from '../utils/app-error.js';

type Role = 'BUYER' | 'SELLER';

export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) {
      return next(new AppError(401, 'Authentication required', 'UNAUTHORIZED'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, 'You do not have permission for this resource', 'FORBIDDEN'));
    }

    next();
  };
