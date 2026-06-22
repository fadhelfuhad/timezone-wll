import type { AuthTokens, User } from '../types';
import { get, post } from './client';

export function login(email: string, password: string): Promise<AuthTokens> {
  return post<AuthTokens>('/auth/login', { email, password });
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
