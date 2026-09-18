import type { Response } from 'express';

const isProduction = process.env.NODE_ENV === 'production';

const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax' as const,
  path: '/',
};

export const setAccessTokenCookie = (res: Response, token: string) => {
  res.cookie('hammr_access_token', token, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000,
  });
};

export const setRefreshTokenCookie = (res: Response, token: string) => {
  res.cookie('hammr_refresh_token', token, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

export const clearAuthCookies = (res: Response) => {
  res.clearCookie('hammr_access_token', cookieOptions);

  res.clearCookie('hammr_refresh_token', cookieOptions);
};
