import { API_URL, api } from './api';
import type { MusicSearchResult } from '../types';

// GET /music/search — public, no auth needed
export async function searchMusic(query: string, limit = 20): Promise<MusicSearchResult[]> {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  return api<MusicSearchResult[]>(`/music/search?${params.toString()}`);
}

// Stream audio for one track
export function streamUrl(videoId: string): string {
  return `${API_URL}/music/${encodeURIComponent(videoId)}/stream`;
}

// Thumbnail di-proxy lewat backend; sebagian ad-blocker/firewall memblokir
// request langsung ke domain googleusercontent.com dari origin lain.
export function thumbUrl(rawUrl: string): string {
  return `${API_URL}/music/thumb?url=${encodeURIComponent(rawUrl)}`;
}

// GET /music/info?ids=a,b,c — metadata lagu untuk music_id tersimpan
// (dipakai untuk hydrate isi playlist setelah reload).
export async function fetchMusicInfos(ids: string[]): Promise<MusicSearchResult[]> {
  const unique = [...new Set(ids)].filter(Boolean);
  if (unique.length === 0) return [];

  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += 100) {
    chunks.push(unique.slice(i, i + 100));
  }

  const batches = await Promise.all(
    chunks.map((chunk) =>
      api<MusicSearchResult[]>(`/music/info?ids=${chunk.map(encodeURIComponent).join(',')}`),
    ),
  );
  return batches.flat();
}
