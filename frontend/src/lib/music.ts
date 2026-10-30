import { API_URL, api } from './api';
import type {
  MusicGenre,
  MusicGenreDetail,
  MusicPlaylistDetail,
  MusicSearchPage,
  MusicSearchResult,
  MixTrack,
  MusicLyrics,
  Recommendations,
} from '../types';

// GET /music/search — public, no auth needed. Default 50 lagu per halaman.
export async function searchMusic(query: string, page = 1, limit = 50): Promise<MusicSearchPage> {
  const params = new URLSearchParams({ q: query, page: String(page), limit: String(limit) });
  return api<MusicSearchPage>(`/music/search?${params.toString()}`);
}

// Stream audio for one track
export function streamUrl(videoId: string): string {
  return `${API_URL}/music/${encodeURIComponent(videoId)}/stream`;
}

// POST /music/:id/prepare — server menyiapkan URL stream lagu berikutnya di
// latar belakang, supaya saat Next lagunya langsung bunyi. Gagal pun tidak apa-apa.
export function prepareStream(videoId: string): void {
  void fetch(`${API_URL}/music/${encodeURIComponent(videoId)}/prepare`, { method: 'POST', keepalive: true }).catch(
    () => undefined,
  );
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

// GET /music/genres — kategori jelajah (mood & genre) dari YouTube Music
export async function getGenres(): Promise<MusicGenre[]> {
  return api<MusicGenre[]>('/music/genres');
}

// GET /music/genres/:genreId — playlist-playlist dalam satu kategori
export async function getGenre(genreId: string): Promise<MusicGenreDetail> {
  return api<MusicGenreDetail>(`/music/genres/${encodeURIComponent(genreId)}`);
}

// GET /music/playlists/:playlistId — lagu-lagu dalam playlist YouTube Music
export async function getMusicPlaylist(playlistId: string): Promise<MusicPlaylistDetail> {
  return api<MusicPlaylistDetail>(`/music/playlists/${encodeURIComponent(playlistId)}`);
}

// GET /music/:musicId/radio (auth) — radio YouTube Music untuk satu lagu (lagu itu sendiri di urutan pertama)
export async function getRadio(videoId: string, token: string): Promise<MusicSearchResult[]> {
  return api<MusicSearchResult[]>(`/music/${encodeURIComponent(videoId)}/radio`, { token });
}

// GET /recommendations (auth) — mix personal + "Rekomendasi untuk kamu" dari riwayat & playlist
export async function getRecommendations(token: string): Promise<Recommendations> {
  return api<Recommendations>('/recommendations', { token });
}

// GET /music/:musicId/mix (auth) — antrean "Up next" dari satu lagu, diacak ulang setiap dipanggil
export async function getSongMix(videoId: string, token: string): Promise<MixTrack[]> {
  return api<MixTrack[]>(`/music/${encodeURIComponent(videoId)}/mix`, { token });
}

// GET /music/:musicId/lyrics (auth) — lirik teks dari tab "Lirik" YouTube Music (404 kalau tidak ada)
export async function getLyrics(videoId: string, token: string): Promise<MusicLyrics> {
  return api<MusicLyrics>(`/music/${encodeURIComponent(videoId)}/lyrics`, { token });
}

// Thumbnail googleusercontent bisa diminta ukuran lain lewat suffix "=wN-hN".
export function largeThumb(rawUrl: string, size = 544): string {
  return rawUrl.replace(/=w\d+-h\d+/, `=w${size}-h${size}`);
}
