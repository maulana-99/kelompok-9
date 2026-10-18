import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { fetchMusicInfos, streamUrl } from '../lib/music';
import {
  addPlaylistSong,
  createPlaylist as createPlaylistApi,
  deletePlaylistApi,
  fetchPlaylistDetail,
  fetchPlaylists,
  removePlaylistSong,
  toPlaylist,
} from '../lib/playlists';
import { toSeconds, toTrack } from '../lib/utils';
import ModalCreatePlaylist from '../components/ModalCreatePlaylist';
import type { AppView, CreatePlaylistInput, NavTarget, Playlist, Track } from '../types';

/** Seluruh state + aksi yang dipakai halaman dan kerangka aplikasi. */
export interface PlayerStore {
  // Navigasi
  view: AppView;
  activePlaylistId: string | null;
  navigate: (target: NavTarget) => void;
  openPlaylist: (id: string) => void;
  openLiked: () => void;
  openProfile: (id: number | string) => void;
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

  /** Hydrate track metadata (cache -> /music/info) untuk music_id tersimpan. */
  tracksOf: (ids: string[]) => Track[];
  /** Ambil detail playlist dari backend bila belum ada di state (throw bila 404). */
  loadPlaylist: (id: string) => Promise<void>;

  // Playlist mutation
  addToPlaylist: (playlistId: string, track: Track) => Promise<void>;
  removeFromPlaylist: (playlistId: string, trackId: string) => Promise<void>;
  deletePlaylist: (playlistId: string) => Promise<void>;

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

// Metadata track di-cache agar cover playlist & judul tetap tampil instan
// setelah reload; /music/info tetap jadi sumber kebenaran bila cache kosong.
const TRACKS_CACHE_KEY = 'melodi_tracks';
const TRACKS_CACHE_CAP = 600;

function readTracksCache(): Track[] {
  try {
    const raw = localStorage.getItem(TRACKS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is Track => Boolean(item) && typeof (item as Track).id === 'string',
    );
  } catch {
    return [];
  }
}

function writeTracksCache(finalTracks: Track[]) {
  try {
    localStorage.setItem(TRACKS_CACHE_KEY, JSON.stringify(finalTracks.slice(-TRACKS_CACHE_CAP)));
  } catch {
    // localStorage tidak tersedia — cache hanya di memori.
  }
}

/**
 * Pemutar musik + state aplikasi.
 *
 * Berdiri DI ATAS <Routes>, sehingga `<audio>` tidak pernah unmount saat
 * user pindah halaman — musik tetap jalan.
 */
export function PlayerProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { token, user, logout: authLogout } = useAuth();

  const [query, setQueryState] = useState('');
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [knownTracks, setKnownTracks] = useState<Track[]>(() => readTracksCache());
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

  // Mirror agar tracksOf tidak tergantung closure state yang basi.
  const knownRef = useRef<Map<string, Track>>(new Map(readTracksCache().map((track) => [track.id, track])));

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
    : pathname.startsWith('/users/')
      ? 'profile'
      : pathname === '/search' || pathname.startsWith('/explore')
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

  // ---- Known tracks: persist ke localStorage ----
  useEffect(() => {
    writeTracksCache(knownTracks);
  }, [knownTracks]);

  const mergeKnownTracks = useCallback((incoming: Track[]) => {
    if (!incoming.length) return;
    incoming.forEach((track) => knownRef.current.set(track.id, track));
    setKnownTracks((existing) => {
      const byId = new Map(existing.map((track) => [track.id, track]));
      incoming.forEach((track) => byId.set(track.id, track));
      return [...byId.values()];
    });
  }, []);

  // ---- Hydrate metadata: cache dulu, sisanya via /music/info ----
  const hydrateTracks = useCallback(
    async (ids: string[]) => {
      const idList = [...new Set(ids.filter(Boolean))];
      const missing = idList.filter((id) => !knownRef.current.has(id));
      if (missing.length === 0) return;

      try {
        const infos = await fetchMusicInfos(missing);
        const byId = new Map(infos.map((info) => [info.video_id, info]));
        const resolved: Track[] = missing.map((id) => {
          const info = byId.get(id);
          if (!info) {
            return {
              id,
              videoId: id,
              title: 'Unknown title',
              artist: 'Unknown artist',
              album: '-',
              duration: '',
              explicit: false,
              added: '',
            };
          }
          const track = toTrack(info);
          if (!track.title) track.title = 'Unknown title';
          if (!track.artist) track.artist = 'Unknown artist';
          return track;
        });
        mergeKnownTracks(resolved);
      } catch {
        // Gagal ambil metadata (server mati/jaringan) — baris tetap dirender
        // dari cache bila ada; streaming punya jalur sendiri.
      }
    },
    [mergeKnownTracks],
  );

  const tracksOf = useCallback(
    (ids: string[]): Track[] => {
      const out: Track[] = [];
      for (const id of ids) {
        const track = knownRef.current.get(id) ?? knownTracks.find((item) => item.id === id);
        if (track) out.push(track);
      }
      return out;
    },
    [knownTracks],
  );

  // ---- Muat playlist milik user dari backend ----
  const loadedForRef = useRef<number | null>(null);
  useEffect(() => {
    const userId = user?.id;
    if (!token || !userId) return undefined;
    if (loadedForRef.current === userId) return undefined;
    loadedForRef.current = userId;

    let cancelled = false;
    void (async () => {
      try {
        const list = await fetchPlaylists(userId, token);
        const details = await Promise.all(
          list.map((backend) => fetchPlaylistDetail(String(backend.id), token).catch(() => null)),
        );
        if (cancelled) return;
        const mapped: Playlist[] = [];
        for (const detail of details) {
          if (!detail) continue;
          mapped.push(toPlaylist(detail.playlist, detail.songs));
        }
        setPlaylists(mapped);
        void hydrateTracks(mapped.flatMap((p) => p.trackIds));
      } catch {
        // Backend tidak tersedia / sesi mati: daftar dibiarkan kosong,
        // user tetap bisa memakai player.
      }
    })();

    return () => {
      cancelled = true;
      loadedForRef.current = null;
    };
  }, [token, user?.id, hydrateTracks]);

  // ---- Navigasi ----
  const navigateTo = (target: NavTarget) => {
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
  const openProfile = (id: number | string) => navigate(`/users/${id}`);
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
    const track = knownRef.current.get(id) ?? knownTracks.find((item) => item.id === id);
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
          .map((id) => knownRef.current.get(id) ?? knownTracks.find((track) => track.id === id))
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

  const rememberTracks = useCallback(
    (results: Track[]) => {
      setKnownTracks((existing) => {
        const byId = new Map(existing.map((track) => [track.id, track]));
        results.forEach((track) => byId.set(track.id, track));
        return [...byId.values()];
      });
      results.forEach((track) => knownRef.current.set(track.id, track));
    },
    [],
  );

  // ---- Playlist: create ----
  const createPlaylist = async (input: CreatePlaylistInput) => {
    if (!token) throw new Error('Sesi berakhir, login ulang untuk membuat playlist.');
    const backend = await createPlaylistApi(input, token);
    const playlist = toPlaylist(backend);
    setPlaylists((list) => [playlist, ...list]);
    setShowCreate(false);
    navigate(`/playlist/${playlist.id}`);
  };

  // ---- Playlist: load single (untuk akses langsung ke URL) ----
  const loadPlaylist = useCallback(
    async (id: string) => {
      if (!token) throw new Error('Playlist tidak ditemukan.');
      const detail = await fetchPlaylistDetail(id, token);
      const playlist = toPlaylist(detail.playlist, detail.songs);
      setPlaylists((list) => (list.some((p) => p.id === id) ? list : [playlist, ...list]));
      void hydrateTracks(playlist.trackIds);
    },
    [token, hydrateTracks],
  );

  // ---- Playlist: add song ----
  const addToPlaylist = async (playlistId: string, track: Track) => {
    if (!token) throw new Error('Sesi berakhir, login ulang untuk menambah lagu.');
    if (!track.videoId) throw new Error('Lagu tidak dapat ditambahkan.');

    const row = await addPlaylistSong(playlistId, track.videoId, token);
    rememberTracks([track]);
    setPlaylists((list) =>
      list.map((p) =>
        p.id === playlistId
          ? {
              ...p,
              trackIds: [...p.trackIds, track.id],
              songRowIds: { ...p.songRowIds, [track.id]: row.id },
              songAdded: { ...p.songAdded, [track.id]: row.created_at },
            }
          : p,
      ),
    );
  };

  // ---- Playlist: remove song ----
  const removeFromPlaylist = async (playlistId: string, trackId: string) => {
    if (!token) return;
    const rowId = playlists.find((p) => p.id === playlistId)?.songRowIds[trackId];
    if (!rowId) return;

    await removePlaylistSong(playlistId, rowId, token);
    setPlaylists((list) =>
      list.map((p) => {
        if (p.id !== playlistId) return p;
        const songRowIds = { ...p.songRowIds };
        const songAdded = { ...p.songAdded };
        delete songRowIds[trackId];
        delete songAdded[trackId];
        return { ...p, trackIds: p.trackIds.filter((id) => id !== trackId), songRowIds, songAdded };
      }),
    );
  };

  // ---- Playlist: delete ----
  const deletePlaylist = async (playlistId: string) => {
    if (!token) return;
    await deletePlaylistApi(playlistId, token);
    setPlaylists((list) => list.filter((p) => p.id !== playlistId));
    if (activePlaylistId === playlistId) navigate('/', { replace: true });
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
    openProfile,
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

    tracksOf,
    loadPlaylist,
    addToPlaylist,
    removeFromPlaylist,
    deletePlaylist,

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
        <ModalCreatePlaylist onClose={() => setShowCreate(false)} onCreate={createPlaylist} />
      )}
    </PlayerContext.Provider>
  );
}
