import rateLimit from 'express-rate-limit';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    status: 'fail',
    code: 'RATE_LIMITED',
    message: 'Too many authentication attempts. Please try again later.',
  },
});

export const sensitiveRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    status: 'fail',
    code: 'RATE_LIMITED',
    message: 'Too many requests. Please try again later.',
  },
});
