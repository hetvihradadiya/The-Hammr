import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '../generated/prisma/client.js';
import { AppError } from '../utils/app-error.js';

const errorHandler: ErrorRequestHandler = (err, _req, res) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      status: 'fail',
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      errors: err.issues.map((issue) => ({
        field: issue.path.join('.') || 'request',
        message: issue.message,
      })),
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        status: 'fail',
        code: 'DUPLICATE_RESOURCE',
        message: 'A user with that email already exists',
      });
    }
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: err.statusCode >= 500 ? 'error' : 'fail',
      code: err.code,
      message: err.message,
    });
  }

  console.error('Unhandled application error:', err);

  return res.status(500).json({
    status: 'error',
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Something went wrong',
  });
};

export default errorHandler;
