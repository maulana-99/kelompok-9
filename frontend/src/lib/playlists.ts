import { api } from './api';
import type {
  BackendPlaylist,
  BackendPlaylistSong,
  CreatePlaylistInput,
  Playlist,
} from '../types';

// POST /playlists (auth) — backend menyimpan title (bukan name).
export async function createPlaylist(
  input: CreatePlaylistInput,
  token: string | null,
): Promise<BackendPlaylist> {
  return api<BackendPlaylist>('/playlists', {
    method: 'POST',
    body: { title: input.name, description: input.description, status: input.status },
    token,
  });
}

// GET /playlists?user_id= (optional auth)
export async function fetchPlaylists(userId: number, token: string | null): Promise<BackendPlaylist[]> {
  return api<BackendPlaylist[]>(`/playlists?user_id=${encodeURIComponent(String(userId))}`, { token });
}

// GET /playlists/:id (optional auth) — playlist + daftar lagu (music_id saja).
export async function fetchPlaylistDetail(
  id: string,
  token: string | null,
): Promise<{ playlist: BackendPlaylist; songs: BackendPlaylistSong[] }> {
  return api<{ playlist: BackendPlaylist; songs: BackendPlaylistSong[] }>(`/playlists/${id}`, { token });
}

// POST /playlists/:id/songs (auth) — duplicate → 409 ApiError dari backend.
export async function addPlaylistSong(
  playlistId: string,
  musicId: string,
  token: string | null,
): Promise<BackendPlaylistSong> {
  return api<BackendPlaylistSong>(`/playlists/${playlistId}/songs`, {
    method: 'POST',
    body: { music_id: musicId },
    token,
  });
}

// DELETE /playlists/:id/songs/:songId (auth) — songId = playlist_song row id.
export async function removePlaylistSong(
  playlistId: string,
  songRowId: number,
  token: string | null,
): Promise<void> {
  await api(`/playlists/${playlistId}/songs/${songRowId}`, { method: 'DELETE', token });
}

// DELETE /playlists/:id (auth, owner-only)
export async function deletePlaylistApi(playlistId: string, token: string | null): Promise<void> {
  await api(`/playlists/${playlistId}`, { method: 'DELETE', token });
}

// Mapping backend -> model aplikasi.
export function toPlaylist(
  backend: BackendPlaylist,
  songs: BackendPlaylistSong[] = [],
): Playlist {
  return {
    id: String(backend.id),
    name: backend.title,
    description: backend.description,
    status: backend.status,
    userId: backend.user_id,
    trackIds: songs.map((s) => s.music_id),
    songRowIds: Object.fromEntries(songs.map((s) => [s.music_id, s.id])),
    songAdded: Object.fromEntries(songs.map((s) => [s.music_id, s.created_at])),
  };
}
