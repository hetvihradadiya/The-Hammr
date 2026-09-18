import type { RequestHandler } from 'express';
import { AppError } from '../utils/app-error.js';
import {
  getCurrentUser,
  login,
  register,
  setupSellerTwoFactor,
  verifySellerTwoFactor,
} from '../services/auth.service.js';
import {
  createAccessToken,
  createRefreshToken,
  revokeAllUserTokens,
  revokeToken,
  rotateRefreshToken,
} from '../services/token.service.js';
import {
  clearAuthCookies,
  setAccessTokenCookie,
  setRefreshTokenCookie,
} from '../utils/auth-cookies.js';

const isProduction = process.env.NODE_ENV === 'production';

const pendingCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? ('none' as const) : ('lax' as const),
  maxAge: 5 * 60 * 1000,
  path: '/',
};

const clearPendingCookie = (res: Parameters<RequestHandler>[1]) => {
  res.clearCookie('hammr_2fa_pending', pendingCookieOptions);
};

const setAuthenticationCookies = async (
  res: Parameters<RequestHandler>[1],
  user: { id: number; role: 'BUYER' | 'SELLER' },
) => {
  const [accessToken, refreshToken] = await Promise.all([
    createAccessToken(user.id, user.role),
    createRefreshToken(user.id, user.role),
  ]);

  setAccessTokenCookie(res, accessToken);
  setRefreshTokenCookie(res, refreshToken);
};

export const registerController: RequestHandler = async (req, res, next) => {
  try {
    const result = await register(req.body);

    if (!result.requiresTwoFactorSetup) {
      await setAuthenticationCookies(res, result.user);
    }

    if ('setupToken' in result) {
      res.cookie('hammr_2fa_pending', result.setupToken, pendingCookieOptions);
    }

    res.status(201).json({
      status: 'success',
      data: {
        user: result.user,
        requiresTwoFactorSetup: result.requiresTwoFactorSetup,
        ...(result.requiresTwoFactorSetup
          ? {
              qrCodeDataUrl: result.qrCodeDataUrl,
              manualKey: result.manualKey,
            }
          : {}),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const loginController: RequestHandler = async (req, res, next) => {
  try {
    const result = await login(req.body);

    if (result.user) {
      await setAuthenticationCookies(res, result.user);
    }

    if (result.twoFactorToken) {
      res.cookie('hammr_2fa_pending', result.twoFactorToken, pendingCookieOptions);
    }

    if ('setupToken' in result) {
      res.cookie('hammr_2fa_pending', result.setupToken, pendingCookieOptions);
    }

    res.status(200).json({
      status: 'success',
      data: {
        ...(result.user ? { user: result.user } : {}),
        ...(result.requiresTwoFactor ? { requiresTwoFactor: true } : {}),
        ...('setupToken' in result
          ? {
              requiresTwoFactorSetup: true,
              qrCodeDataUrl: result.qrCodeDataUrl,
              manualKey: result.manualKey,
            }
          : {}),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const verifyTwoFactorController: RequestHandler = async (req, res, next) => {
  try {
    const pendingToken = req.cookies?.hammr_2fa_pending as string | undefined;

    if (!pendingToken) {
      throw new AppError(401, '2FA verification session is missing', 'INVALID_2FA_SESSION');
    }

    const result = await verifySellerTwoFactor(pendingToken, req.body.code);
    clearPendingCookie(res);
    await setAuthenticationCookies(res, result.user);

    res.status(200).json({
      status: 'success',
      data: { user: result.user },
    });
  } catch (error) {
    next(error);
  }
};

export const setupTwoFactorController: RequestHandler = async (req, res, next) => {
  try {
    const setupToken =
      (req.cookies?.hammr_2fa_pending as string | undefined) ?? req.body.setupToken;

    if (!setupToken) {
      throw new AppError(401, '2FA setup session is missing', 'INVALID_2FA_SETUP_SESSION');
    }

    const result = await setupSellerTwoFactor(setupToken, req.body.code);
    clearPendingCookie(res);
    await setAuthenticationCookies(res, result.user);

    res.status(200).json({
      status: 'success',
      data: { user: result.user },
    });
  } catch (error) {
    next(error);
  }
};

export const meController: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Authentication required', 'UNAUTHORIZED');
    }

    const user = await getCurrentUser(Number(req.user.sub));

    res.status(200).json({
      status: 'success',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

export const refreshController: RequestHandler = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.hammr_refresh_token as string | undefined;

    if (!refreshToken) {
      throw new AppError(401, 'Refresh token is required', 'REFRESH_TOKEN_REQUIRED');
    }

    const result = await rotateRefreshToken(refreshToken);
    setAccessTokenCookie(res, result.accessToken);
    setRefreshTokenCookie(res, result.refreshToken);

    res.status(200).json({ status: 'success', message: 'Session refreshed' });
  } catch (error) {
    next(error);
  }
};

export const logoutController: RequestHandler = async (req, res, next) => {
  try {
    const accessToken = req.cookies?.hammr_access_token as string | undefined;
    const refreshToken = req.cookies?.hammr_refresh_token as string | undefined;

    if (accessToken) await revokeToken(accessToken);
    if (refreshToken) await revokeToken(refreshToken);
    if (req.user?.sub) await revokeAllUserTokens(Number(req.user.sub));

    clearAuthCookies(res);
    clearPendingCookie(res);
    res.status(200).json({ status: 'success', message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};
