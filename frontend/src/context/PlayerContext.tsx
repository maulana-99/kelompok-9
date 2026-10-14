import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { streamUrl } from '../lib/music';
import { toDurationLabel, toSeconds } from '../lib/utils';
import ModalCreatePlaylist from '../components/ModalCreatePlaylist';
import type { AppView, CreatePlaylistInput, Playlist, Track } from '../types';

/** Seluruh state + aksi yang dipakai halaman dan kerangka aplikasi. */
export interface PlayerStore {
  // Navigasi
  view: AppView;
  activePlaylistId: string | null;
  navigate: (target: 'home' | 'search' | 'library' | 'liked-songs') => void;
  openPlaylist: (id: string) => void;
  openLiked: () => void;
  openCreate: () => void;
  back: () => void;
  forward: () => void;
  canBack: boolean;
  canForward: boolean;
  logout: () => Promise<void>;

  // Data
  playlists: Playlist[];
  tracks: Track[];
  likedIds: string[];
  recentTracks: Track[];
  likedTracks: Track[];

  // Pencarian
  query: string;
  setQuery: (value: string) => void;

  // Player
  currentTrack: Track | null;
  currentTrackId: string | null;
  trackDuration: number;
  isPlaying: boolean;
  progress: number;
  volume: number;
  playTrack: (id: string, context?: Track[]) => void;
  togglePlay: () => void;
  toggleLike: (id: string) => void;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
  prevTrack: () => void;
  nextTrack: () => void;

  /** Simpan lagu hasil pencarian agar bisa diputar/ditampilkan di halaman lain. */
  rememberTracks: (tracks: Track[]) => void;
}

const PlayerContext = createContext<PlayerStore | null>(null);

/** Ambil store player. Harus dipakai di dalam <PlayerProvider>. */
export function usePlayer(): PlayerStore {
  const store = useContext(PlayerContext);
  if (!store) throw new Error('usePlayer() harus dipakai di dalam <PlayerProvider>.');
  return store;
}

/**
 * Pemutar musik + state aplikasi.
 *
 * Berdiri DI ATAS <Routes>, sehingga `<audio>` tidak pernah unmount saat
 * user pindah halaman — musik tetap jalan.
 *
 * Catatan: endpoint /playlists belum ada di backend, jadi daftar playlist
 * mulai kosong dan hanya diisi buatan user. Panggilan API ditambahkan di sini
 * saat endpoint-nya sudah tersedia.
 */
export function PlayerProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout: authLogout } = useAuth();

  const [query, setQueryState] = useState('');
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [knownTracks, setKnownTracks] = useState<Track[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  // Player
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [queue, setQueue] = useState<string[]>([]);

  const audioRef = useRef<HTMLAudioElement>(null);
  const pathname = location.pathname;

  // Lacak posisi history supaya tombol Back/Forward benar-benar mencerminkan
  // apakah masih ada halaman sebelumnya/sesudahnya di dalam aplikasi.
  const [navHist, setNavHist] = useState({ canBack: false, canForward: false });
  const visitedKeys = useRef<string[]>([location.key]);
  const histPos = useRef(0);

  useEffect(() => {
    const found = visitedKeys.current.indexOf(location.key);
    if (found === -1) {
      visitedKeys.current = [...visitedKeys.current.slice(0, histPos.current + 1), location.key];
      histPos.current = visitedKeys.current.length - 1;
    } else {
      histPos.current = found;
    }
    setNavHist({
      canBack: histPos.current > 0,
      canForward: histPos.current < visitedKeys.current.length - 1,
    });
  }, [location.key]);

  const currentTrack = useMemo(
    () => (currentTrackId ? (knownTracks.find((track) => track.id === currentTrackId) ?? null) : null),
    [currentTrackId, knownTracks],
  );
  const currentVideoId = currentTrack?.videoId ?? null;
  const trackDuration = duration > 0 ? duration : currentTrack ? toSeconds(currentTrack.duration) : 0;

  const view: AppView = pathname.startsWith('/playlist/')
    ? 'playlist'
    : pathname === '/search'
      ? 'search'
      : pathname === '/library'
        ? 'library'
        : pathname === '/liked-songs'
          ? 'liked-songs'
          : 'home';
  const activePlaylistId = pathname.startsWith('/playlist/') ? pathname.replace('/playlist/', '') : null;

  // ---- Audio: muat ulang saat lagu berganti ----
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setProgress(0);
    setDuration(0);
    if (!currentVideoId) {
      audio.pause();
      audio.removeAttribute('src');
      return;
    }
    audio.src = streamUrl(currentVideoId);
    audio.load();
  }, [currentVideoId]);

  // ---- Audio: ikuti state play/pause ----
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentVideoId) return;
    if (isPlaying) {
      void audio.play().catch((err) => {
        // AbortError muncul saat src diganti oleh lagu berikutnya — bukan kegagalan nyata.
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setIsPlaying(false);
      });
    } else {
      audio.pause();
    }
  }, [isPlaying, currentVideoId]);

  // ---- Audio: volume ----
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = volume;
  }, [volume]);

  // ---- Navigasi ----
  const navigateTo = (target: 'home' | 'search' | 'library' | 'liked-songs') => {
    if (target === 'home') {
      setQueryState('');
      navigate('/');
    } else if (target === 'search') {
      navigate('/search');
    } else if (target === 'library') {
      navigate('/library');
    } else {
      navigate('/liked-songs');
    }
  };

  const openPlaylist = (id: string) => navigate(`/playlist/${id}`);
  const openLiked = () => navigate('/liked-songs');
  const openCreate = () => setShowCreate(true);

  const setQuery = (value: string) => {
    setQueryState(value);
    if (value && pathname !== '/search') navigate('/search');
  };

  const doLogout = async () => {
    await authLogout();
    navigate('/login', { replace: true });
  };

  // ---- Player ----
  // Mulai lagu + catat ke riwayat putar sesi ini (dipakai halaman Home).
  const startTrack = (id: string) => {
    setCurrentTrackId(id);
    setProgress(0);
    setIsPlaying(true);
    setRecentIds((prev) => [id, ...prev.filter((x) => x !== id)].slice(0, 12));
  };

  // Antrean lagu: diisi dari daftar yang sedang dilihat user (playlist/hasil search/liked),
  // supaya tombol Next/Prev tidak lompat ke lagu dari konteks lain.
  const playTrack = (id: string, context?: Track[]) => {
    const track = knownTracks.find((item) => item.id === id);
    if (!track?.videoId) return;

    const contextIds = context?.filter((item) => item.videoId).map((item) => item.id);
    if (contextIds?.length) setQueue(contextIds);

    if (id === currentTrackId) {
      setIsPlaying((p) => !p);
      return;
    }
    startTrack(id);
  };

  const step = (dir: number) => {
    const source = queue.length
      ? queue
          .map((id) => knownTracks.find((track) => track.id === id))
          .filter((track): track is Track => track !== undefined)
      : knownTracks;
    const playable = source.filter((track) => track.videoId);
    if (playable.length === 0) return;

    const index = currentTrackId ? playable.findIndex((track) => track.id === currentTrackId) : -1;
    const base = index === -1 ? (dir > 0 ? -1 : 0) : index;
    const next = playable[(base + dir + playable.length) % playable.length];

    if (next.id === currentTrackId) {
      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = 0;
        setProgress(0);
        if (isPlaying) void audio.play().catch(() => setIsPlaying(false));
      }
      return;
    }
    startTrack(next.id);
  };

  const togglePlay = () => {
    if (currentVideoId) setIsPlaying((p) => !p);
  };

  const toggleLike = (id: string) =>
    setLikedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const seek = (seconds: number) => {
    const audio = audioRef.current;
    if (audio && currentVideoId) {
      audio.currentTime = seconds;
      setProgress(seconds);
    }
  };

  const rememberTracks = useCallback((results: Track[]) => {
    setKnownTracks((existing) => {
      const byId = new Map(existing.map((track) => [track.id, track]));
      results.forEach((track) => byId.set(track.id, track));
      return [...byId.values()];
    });
  }, []);

  // ---- Create Playlist (lokal dulu; backend belum punya endpoint playlist) ----
  const createPlaylist = async (input: CreatePlaylistInput) => {
    const total = input.trackIds.reduce((sum, trackId) => {
      const track = knownTracks.find((item) => item.id === trackId);
      return sum + (track ? toSeconds(track.duration) : 0);
    }, 0);

    const playlist: Playlist = {
      id: `p${Date.now()}`,
      name: input.name,
      description: input.description,
      trackIds: input.trackIds,
      trackCount: input.trackIds.length,
      durationLabel: total ? toDurationLabel(total) : '0 min',
      cover: input.cover,
    };

    setPlaylists((list) => [...list, playlist]);
    setShowCreate(false);
    navigate(`/playlist/${playlist.id}`);
  };

  const recentTracks = useMemo(
    () =>
      recentIds
        .map((id) => knownTracks.find((track) => track.id === id))
        .filter((track): track is Track => track !== undefined),
    [recentIds, knownTracks],
  );

  const likedTracks = useMemo(
    () => knownTracks.filter((track) => likedIds.includes(track.id)),
    [knownTracks, likedIds],
  );

  const store: PlayerStore = {
    view,
    activePlaylistId,
    navigate: navigateTo,
    openPlaylist,
    openLiked,
    openCreate,
    back: () => navigate(-1),
    forward: () => navigate(1),
    canBack: navHist.canBack,
    canForward: navHist.canForward,
    logout: doLogout,

    playlists,
    tracks: knownTracks,
    likedIds,
    recentTracks,
    likedTracks,

    query,
    setQuery,

    currentTrack,
    currentTrackId,
    trackDuration,
    isPlaying,
    progress,
    volume,
    playTrack,
    togglePlay,
    toggleLike,
    seek,
    setVolume,
    prevTrack: () => step(-1),
    nextTrack: () => step(1),

    rememberTracks,
  };

  return (
    <PlayerContext.Provider value={store}>
      <audio
        ref={audioRef}
        preload="metadata"
        onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => step(1)}
        onError={() => setIsPlaying(false)}
      />

      {children}

      {showCreate && (
        <ModalCreatePlaylist tracks={knownTracks} onClose={() => setShowCreate(false)} onCreate={createPlaylist} />
      )}
    </PlayerContext.Provider>
  );
}
