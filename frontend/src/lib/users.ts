import { api } from './api';
import type { BackendUser } from '../types';

// GET /users?q= — public, searches name/username via ILIKE on backend.
export async function searchUsers(query: string, token?: string | null): Promise<BackendUser[]> {
  const params = new URLSearchParams({ q: query });
  return api<BackendUser[]>(`/users?${params.toString()}`, { token: token ?? undefined });
}

export async function getUser(id: number | string): Promise<BackendUser> {
  return api<BackendUser>(`/users/${id}`);
}

export async function getFollowers(id: number | string): Promise<BackendUser[]> {
  return api<BackendUser[]>(`/users/${id}/followers`);
}

export async function getFollowing(id: number | string): Promise<BackendUser[]> {
  return api<BackendUser[]>(`/users/${id}/following`);
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
