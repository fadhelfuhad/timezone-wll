import type { PaginatedResponse, User } from '../types';
import { del, get, patch, post } from './client';

interface GetUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  isActive?: boolean;
}

interface CreateUserData {
  email: string;
  firstName: string;
  lastName: string;
  role: User['role'];
  password: string;
}

type UpdateUserData = Partial<Omit<CreateUserData, 'password'> & { isActive: boolean; password?: string }>;

export function getUsers(params?: GetUsersParams): Promise<PaginatedResponse<User>> {
  return get<PaginatedResponse<User>>('/users', params as Record<string, unknown>);
}

export function getUser(id: string): Promise<User> {
  return get<User>(`/users/${id}`);
}

export function createUser(data: CreateUserData): Promise<User> {
  return post<User>('/users', data);
}

export function updateUser(id: string, data: UpdateUserData): Promise<User> {
  return patch<User>(`/users/${id}`, data);
}

export function deleteUser(id: string): Promise<void> {
  return del<void>(`/users/${id}`);
}
