export interface ApiSuccess<T> {
  success: true;
  message?: string;
  data?: T | null;
}

export interface ApiFailure {
  success: false;
  message: string;
  errors?: unknown;
}

export interface BackendUser {
  id: number;
  name: string;
  username: string;
  created_at: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface CreateUserRequest extends LoginRequest {
  name: string;
}

export interface AuthResponse {
  token: string;
  user: BackendUser;
}

export interface MusicSearchResult {
  video_id: string;
  title: string;
  artist: string;
  album?: string;
  thumbnail: string;
  duration: string;
  type?: 'song' | 'video';
}

/** Kategori jelajah YouTube Music — GET /music/genres. */
export interface MusicGenre {
  id: string;
  name: string;
  group: 'mood' | 'genre';
  color?: string;
}

/** Playlist YouTube Music (bukan playlist milik user). */
export interface MusicPlaylist {
  id: string;
  title: string;
  subtitle?: string;
  thumbnail: string;
}

/** Mix personal — GET /recommendations (seperti "My Mix" / "Daily Mix"). */
export interface MusicMix {
  id: string;
  title: string;
  subtitle: string;
  thumbnail: string;
  seeds: string[];
  tracks: MusicSearchResult[];
}

/** Asal lagu di mix per lagu — GET /music/:musicId/mix. */
export type MixReason = 'seed' | 'artist' | 'similar' | 'for_you' | 'favorite';

/** Mode ulangi seperti YouTube Music: mati -> semua (antrean) -> satu lagu. */
export type RepeatMode = 'off' | 'all' | 'one';

export type MixTrack = MusicSearchResult & { reason: MixReason };

export interface Recommendations {
  mixes: MusicMix[];
  for_you: MusicSearchResult[];
}

export interface MusicGenreDetail {
  name: string;
  playlists: MusicPlaylist[];
}

export interface MusicPlaylistDetail {
  id: string;
  title: string;
  thumbnail: string;
  tracks: MusicSearchResult[];
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: string;
  explicit: boolean;
  added: string;
  videoId?: string;
  thumbnail?: string;
}

export interface Playlist {
  /** Backend numeric id, as string. */
  id: string;
  name: string;
  description: string;
  status: 'public' | 'private';
  userId: number;
  /** music ids (videoId) in insertion order. */
  trackIds: string[];
  /** music id -> playlist_song row id (dipakai untuk hapus lagu). */
  songRowIds: Record<string, number>;
  /** music id -> created_at (ISO) lagu ditambahkan. */
  songAdded: Record<string, string>;
}

export interface CreatePlaylistInput {
  name: string;
  description: string;
  status: 'public' | 'private';
}

export interface UpdatePlaylistInput {
  title?: string;
  description?: string;
}

export interface BackendPlaylist {
  id: number;
  title: string;
  description: string;
  user_id: number;
  status: 'public' | 'private';
  created_at: string;
}

export interface BackendHistoryEntry {
  id: number;
  user_id: number;
  music_id: string;
  last_played: string;
}

export interface BackendPlaylistSong {
  id: number;
  playlist_id: number;
  music_id: string;
  created_at: string;
}

export interface AppUser {
  id?: number;
  name: string;
  username: string;
  created_at?: string;
}

export type AppView = 'login' | 'home' | 'search' | 'playlist' | 'library' | 'liked-songs' | 'profile';

/** Halaman yang bisa dibuka dari menu sidebar. */
export type NavTarget = 'home' | 'search' | 'library' | 'liked-songs';

export interface NavigationEntry {
  view: AppView;
  playlistId?: string;
}

export interface AppContext {
  view: AppView;
  user: AppUser;
  query: string;
  setQuery: (value: string) => void;
  playlists: Playlist[];
  activePlaylistId: string | null;
  navigate: (target: NavTarget) => void;
  openPlaylist: (id: string) => void;
  openProfile: (id: number | string) => void;
  openCreate: () => void;
  logout: () => void;
  back: () => void;
  forward: () => void;
  canBack: boolean;
  canForward: boolean;
  currentTrack: Track | null;
  trackDuration: number;
  isPlaying: boolean;
  progress: number;
  volume: number;
  likedIds: string[];
  toggleLike: (id: string) => void;
  togglePlay: () => void;
  prevTrack: () => void;
  nextTrack: () => void;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
}

/** GET /music/:musicId/lyrics — lirik teks biasa (tanpa timing). */
export interface MusicLyrics {
  text: string;
  source?: string;
}
