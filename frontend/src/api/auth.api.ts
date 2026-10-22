import type { AuthTokens, User } from '../types';
import { get, post } from './client';

export function login(email: string, password: string): Promise<AuthTokens> {
  return post<AuthTokens>('/auth/login', { email, password });
}

// Opens the guest demo: a separate workspace the API never lets touch company data.
export function guestLogin(): Promise<AuthTokens> {
  return post<AuthTokens>('/auth/guest');
}

export function logout(): Promise<void> {
  return post<void>('/auth/logout');
}

export function refreshToken(refreshToken: string): Promise<AuthTokens> {
  return post<AuthTokens>('/auth/refresh', { refreshToken });
}

export function getProfile(): Promise<User> {
  return get<User>('/auth/profile');
}

export function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ message: string }> {
  return post<{ message: string }>('/auth/change-password', {
    currentPassword,
    newPassword,
  });
}
