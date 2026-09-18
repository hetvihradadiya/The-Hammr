import { Router } from 'express';
import {
  loginController,
  logoutController,
  meController,
  refreshController,
  registerController,
  setupTwoFactorController,
  verifyTwoFactorController,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authRateLimiter, sensitiveRateLimiter } from '../middlewares/rate-limit.middleware.js';
import { validateBody } from '../middlewares/validate.middleware.js';
import { loginSchema, registerSchema, twoFactorCodeSchema } from '../services/auth.schemas.js';

const router = Router();

router.post('/register', authRateLimiter, validateBody(registerSchema), registerController);

router.post('/login', authRateLimiter, validateBody(loginSchema), loginController);

router.post('/refresh', refreshController);

router.post(
  '/2fa/setup/verify',
  sensitiveRateLimiter,
  validateBody(twoFactorCodeSchema),
  setupTwoFactorController,
);

router.post(
  '/2fa/verify',
  sensitiveRateLimiter,
  validateBody(twoFactorCodeSchema),
  verifyTwoFactorController,
);

router.get('/me', authenticate, meController);

router.post('/logout', authenticate, logoutController);

export default router;
