import { api } from './api';

export type UserRole = 'BUYER' | 'SELLER';

export type User = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
};

type AuthResponse = {
  status: 'success';
  data: {
    user?: User;
    requiresTwoFactor?: boolean;
    requiresTwoFactorSetup?: boolean;
    qrCodeDataUrl?: string;
    manualKey?: string;
  };
};

export function registerUser(data: {
  name: string;
  email: string;
  password: string;
  passwordConfirm: string;
  role: UserRole;
}) {
  return api<AuthResponse>('/api/v1/auth/register', {
    method: 'POST',
    body: data,
  });
}

export function loginUser(data: { email: string; password: string }) {
  return api<AuthResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: data,
  });
}

export function refreshSession() {
  return api<{
    status: 'success';
    message: string;
  }>('/api/v1/auth/refresh', {
    method: 'POST',
  });
}

export function verifyTwoFactor(code: string) {
  return api<AuthResponse>('/api/v1/auth/2fa/verify', {
    method: 'POST',
    body: { code },
  });
}

export function setupTwoFactor(code: string) {
  return api<AuthResponse>('/api/v1/auth/2fa/setup/verify', {
    method: 'POST',
    body: { code },
  });
}

export function getCurrentUser() {
  return api<{
    status: 'success';
    data: {
      user: User;
    };
  }>('/api/v1/auth/me');
}

export function logoutUser() {
  return api('/api/v1/auth/logout', {
    method: 'POST',
  });
}
