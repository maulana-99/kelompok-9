import { api } from './api';
import type { BackendHistoryEntry } from '../types';

// GET /history?limit= (auth) — terbaru dulu, satu baris per lagu.
export async function fetchHistory(token: string, limit = 12): Promise<BackendHistoryEntry[]> {
  return api<BackendHistoryEntry[]>(`/history?limit=${limit}`, { token });
}

// POST /history (auth) — lagu yang sama hanya memperbarui last_played.
export async function recordHistory(musicId: string, token: string): Promise<BackendHistoryEntry> {
  return api<BackendHistoryEntry>('/history', { method: 'POST', body: { music_id: musicId }, token });
}
