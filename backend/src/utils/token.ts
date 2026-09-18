import jwt from 'jsonwebtoken';

export type AuthTokenPayload = {
  sub: string;
  role: 'BUYER' | 'SELLER';
  purpose: 'auth' | 'refresh' | '2fa_pending' | 'password_reset';
  jti: string;
};

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  return secret;
};

export const verifyToken = (token: string): AuthTokenPayload => {
  const decoded = jwt.verify(token, getJwtSecret());

  if (
    typeof decoded !== 'object' ||
    decoded === null ||
    typeof decoded.sub !== 'string' ||
    (decoded.role !== 'BUYER' && decoded.role !== 'SELLER') ||
    !['auth', 'refresh', '2fa_pending', 'password_reset'].includes(decoded.purpose) ||
    typeof decoded.jti !== 'string'
  ) {
    throw new Error('Invalid token payload');
  }

  return decoded as AuthTokenPayload;
};
