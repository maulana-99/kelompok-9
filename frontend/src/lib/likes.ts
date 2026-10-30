
import { api } from './api';

export interface LikedSong {
  id: number;
  user_id: number;
  music_id: string;
  created_at: string;
}

export function fetchLikedSongs(token: string): Promise<LikedSong[]> {
  return api<LikedSong[]>('/likes', { token });
}

export function likeSong(
  musicId: string,
  token: string,
): Promise<LikedSong> {
  return api<LikedSong>('/likes', {
    method: 'POST',
    body: { music_id: musicId },
    token,
  });
}

export function unlikeSong(
  musicId: string,
  token: string,
): Promise<null> {
  return api<null>(`/likes/${encodeURIComponent(musicId)}`, {
    method: 'DELETE',
    token,
  });
}
