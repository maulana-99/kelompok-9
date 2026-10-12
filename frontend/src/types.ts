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

export interface PlaylistMeta {
  volume: string;
  code: string;
  format: string;
  length: string;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  trackCount?: number;
  durationLabel?: string;
  trackIds: string[];
  cover?: string | null;
  meta?: PlaylistMeta;
}

export interface CreatePlaylistInput {
  name: string;
  description: string;
  trackIds: string[];
  cover: string | null;
}

export interface AppUser {
  id?: number;
  name: string;
  username: string;
  handle: string;
  plan: string;
  created_at?: string;
}

export type AppView = 'login' | 'home' | 'search' | 'playlist';

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
  navigate: (target: 'home' | 'search') => void;
  openPlaylist: (id: string) => void;
  openCreate: () => void;
  logout: () => void;
  back: () => void;
  forward: () => void;
  canBack: boolean;
  canForward: boolean;
  currentTrack: Track;
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
