import { api } from './api';
import type { AdminStats, AdminUserList } from '../types';

// GET /admin/users?q=&page=&limit= (admin) — daftar user terdaftar, terbaru dulu
export async function getAdminUsers(token: string, query: string, page: number, limit = 20): Promise<AdminUserList> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (query) params.set('q', query);
  return api<AdminUserList>(`/admin/users?${params}`, { token });
}

// GET /admin/stats (admin)
export async function getAdminStats(token: string): Promise<AdminStats> {
  return api<AdminStats>('/admin/stats', { token });
}
