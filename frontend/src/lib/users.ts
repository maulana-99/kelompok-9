import { api } from './api';
import type { BackendUser, Paged, UserDetail } from '../types';

// GET /users?q=&page=&limit= — public, searches name/username via ILIKE on backend.
export async function searchUsers(
  query: string,
  token?: string | null,
  page = 1,
  limit = 20,
): Promise<Paged<BackendUser>> {
  const params = new URLSearchParams({ q: query, page: String(page), limit: String(limit) });
  return api<Paged<BackendUser>>(`/users?${params.toString()}`, { token: token ?? undefined });
}

// GET /users/:id — token opsional: balasan memuat is_following saat login.
export async function getUser(id: number | string, token?: string | null): Promise<UserDetail> {
  return api<UserDetail>(`/users/${id}`, { token: token ?? undefined });
}

// GET /users/:id/followers?page=&limit=
export async function getFollowers(id: number | string, page = 1, limit = 20): Promise<Paged<BackendUser>> {
  return api<Paged<BackendUser>>(`/users/${id}/followers?page=${page}&limit=${limit}`);
}

// GET /users/:id/following?page=&limit=
export async function getFollowing(id: number | string, page = 1, limit = 20): Promise<Paged<BackendUser>> {
  return api<Paged<BackendUser>>(`/users/${id}/following?page=${page}&limit=${limit}`);
}

// POST /users/:id/follow — requires auth token.
export async function followUser(id: number | string, token: string): Promise<void> {
  await api<unknown>(`/users/${id}/follow`, { method: 'POST', token });
}

// DELETE /users/:id/follow — requires auth token.
export async function unfollowUser(id: number | string, token: string): Promise<void> {
  await api<unknown>(`/users/${id}/follow`, { method: 'DELETE', token });
}

export interface UpdateUserInput {
  name?: string;
  username?: string;
  password?: string;
}

// PUT /users/:id — owner-only, requires auth token.
export async function updateUser(id: number | string, body: UpdateUserInput, token: string): Promise<BackendUser> {
  return api<BackendUser>(`/users/${id}`, { method: 'PUT', body, token });
}
