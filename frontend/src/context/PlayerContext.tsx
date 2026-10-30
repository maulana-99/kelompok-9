import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { fetchMusicInfos, getSongMix, prepareStream, streamUrl } from '../lib/music';
import {
  fetchLikedSongs,
  likeSong,
  unlikeSong,
} from '../lib/likes';
import {
  addPlaylistSong,
  createPlaylist as createPlaylistApi,
  deletePlaylistApi,
  fetchPlaylistDetail,
  fetchPlaylists,
  removePlaylistSong,
  toPlaylist,
  updatePlaylistApi,
} from '../lib/playlists';
import { fetchHistory, recordHistory } from '../lib/history';
import { shuffled, toSeconds, toTrack } from '../lib/utils';
import ModalCreatePlaylist from '../components/ModalCreatePlaylist';
import PlayerNotice, { type PlayerNoticeData } from '../components/PlayerNotice';
import type {
  AppView,
  CreatePlaylistInput,
  MixReason,
  MixTrack,
  NavTarget,
  Playlist,
  RepeatMode,
  Track,
  UpdatePlaylistInput,
} from '../types';

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
  /** Playlist publik milik orang lain yang sedang dibuka (bukan daftar sendiri). */
  visitedPlaylists: Record<string, Playlist>;
  tracks: Track[];
  likedIds: string[];
  recentTracks: Track[];
  likedTracks: Track[];

  /** Hydrate track metadata (cache -> /music/info) untuk music_id tersimpan. */
  tracksOf: (ids: string[]) => Track[];
  /** Hydrate metadata lagu dari luar (mis. kartu playlist profil orang lain). */
  hydrateTrackMetadata: (ids: string[]) => Promise<void>;
  /** Ambil detail playlist dari backend bila belum ada di state (throw bila 404). */
  loadPlaylist: (id: string) => Promise<void>;

  // Playlist mutation
  addToPlaylist: (playlistId: string, track: Track) => Promise<void>;
  removeFromPlaylist: (playlistId: string, trackId: string) => Promise<void>;
  deletePlaylist: (playlistId: string) => Promise<void>;
  /** Ubah judul/deskripsi playlist (owner-only). */
  updatePlaylist: (playlistId: string, input: UpdatePlaylistInput) => Promise<void>;

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
  /** Putar satu lagu lalu isi antrean dengan mix dari lagu itu (diacak setiap kali). */
  playMix: (id: string) => void;
  /** Lagu berikutnya di antrean + asal tiap lagu mix (artis sama, mirip, dst). */
  upNext: Track[];
  /** Lagu antrean sebelum lagu sekarang (sudah diputar), tetap tampil di daftar. */
  played: Track[];
  queueReasons: Record<string, MixReason>;
  playFromQueue: (id: string) => void;
  togglePlay: () => void;
  toggleLike: (id: string) => void;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
  prevTrack: () => void;
  nextTrack: () => void;
  /** Acak: lagu sisa antrean diacak, lagu yang sedang diputar tetap. Mati = urutan asli kembali. */
  shuffle: boolean;
  toggleShuffle: () => void;
  /** Ulangi: off -> all (antrean diulang, tanpa autoplay mix) -> one (lagu ini diulang). */
  repeat: RepeatMode;
  cycleRepeat: () => void;

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

// Mode acak/ulangi diingat per browser, seperti YouTube Music.
const MODES_KEY = 'melodi_player_modes';
const REPEAT_NEXT: Record<RepeatMode, RepeatMode> = { off: 'all', all: 'one', one: 'off' };

function readModes(): { shuffle: boolean; repeat: RepeatMode } {
  try {
    const parsed = JSON.parse(localStorage.getItem(MODES_KEY) ?? '{}') as { shuffle?: unknown; repeat?: unknown };
    const repeat = parsed.repeat === 'all' || parsed.repeat === 'one' ? parsed.repeat : 'off';
    return { shuffle: parsed.shuffle === true, repeat };
  } catch {
    return { shuffle: false, repeat: 'off' };
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
// Stream macet tanpa data selama ini -> muat ulang. Pemutaran pertama bisa butuh ~10 dtk (yt-dlp).
const STREAM_STALL_MS = 15_000;
const STREAM_MAX_RETRIES = 4; // jeda 1, 2, 4, 8 dtk: cukup untuk server yang baru restart

export function PlayerProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { token, user, logout: authLogout } = useAuth();

  const [query, setQueryState] = useState('');
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [visitedPlaylists, setVisitedPlaylists] = useState<Record<string, Playlist>>({});
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
  const [queueReasons, setQueueReasons] = useState<Record<string, MixReason>>({});
  const [shuffle, setShuffle] = useState(() => readModes().shuffle);
  const [repeat, setRepeat] = useState<RepeatMode>(() => readModes().repeat);
  // Urutan asli antrean, dipakai lagi saat acak dimatikan.
  const originalQueue = useRef<string[]>([]);
  // Dibaca callback async (mix yang baru selesai dimuat): state di closure bisa sudah basi.
  const shuffleRef = useRef(shuffle);
  const [notice, setNotice] = useState<PlayerNoticeData | null>(null);
  const clearNotice = useCallback(() => setNotice(null), []);

  // Mirror agar tracksOf tidak tergantung closure state yang basi.
  const knownRef = useRef<Map<string, Track>>(new Map(readTracksCache().map((track) => [track.id, track])));

  const audioRef = useRef<HTMLAudioElement>(null);
  // Percobaan ulang stream untuk lagu yang sedang diputar (lihat recoverAudio).
  // stale = stream perlu dimuat ulang sebelum diputar lagi (gagal, macet, atau retry dibatalkan).
  const recovery = useRef<{ videoId: string | null; tries: number; resumeAt: number; stale: boolean }>({
    videoId: null,
    tries: 0,
    resumeAt: 0,
    stale: false,
  });
  const stallTimer = useRef<number | undefined>(undefined);
  const retryTimer = useRef<number | undefined>(undefined);
  const clearStall = useCallback(() => {
    window.clearTimeout(stallTimer.current);
    stallTimer.current = undefined;
  }, []);
  const clearRetry = useCallback(() => {
    window.clearTimeout(retryTimer.current);
    retryTimer.current = undefined;
  }, []);
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
            : pathname === '/admin'
              ? 'admin'
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
    recovery.current = { videoId: currentVideoId, tries: 0, resumeAt: 0, stale: false };
    clearStall();
    clearRetry();
    audio.src = streamUrl(currentVideoId);
    audio.load();
  }, [currentVideoId, clearStall, clearRetry]);

  // ---- Audio: pulih sendiri saat stream gagal atau macet ----
  // Stream pertama bisa lambat (server memanggil yt-dlp). Kalau gagal atau tidak ada
  // data terlalu lama, muat ulang dari posisi terakhir tanpa user harus ganti lagu.
  const isPlayingRef = useRef(isPlaying);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Muat ulang stream lagu ini, lanjut dari posisi yang disimpan di recovery.resumeAt.
  const reloadStream = (audio: HTMLAudioElement, videoId: string) => {
    recovery.current.stale = false;
    audio.src = streamUrl(videoId);
    audio.load();
  };

  const recoverAudio = () => {
    const audio = audioRef.current;
    const r = recovery.current;
    if (!audio || !currentVideoId || r.videoId !== currentVideoId) return;
    clearStall();
    // onError dan watchdog macet bisa datang bersamaan: satu jadwal muat ulang saja.
    if (retryTimer.current !== undefined) return;
    r.stale = true;
    if (r.tries >= STREAM_MAX_RETRIES) {
      setIsPlaying(false);
      setNotice((prev) => ({
        id: (prev?.id ?? 0) + 1,
        kind: 'error',
        text: 'Lagu ini gagal dimuat. Tekan putar untuk mencoba lagi, atau pilih lagu lain.',
      }));
      r.tries = 0; // tombol putar berikutnya dapat jatah percobaan baru
      return;
    }
    r.tries += 1;
    if (audio.currentTime > 0) r.resumeAt = audio.currentTime;
    const videoId = currentVideoId;
    retryTimer.current = window.setTimeout(() => {
      retryTimer.current = undefined;
      if (recovery.current.videoId !== videoId) return;
      reloadStream(audio, videoId);
      if (isPlayingRef.current) void audio.play().catch(() => undefined);
    }, 1000 * 2 ** (r.tries - 1));
  };

  // Tidak ada data baru selama STREAM_STALL_MS saat sedang diputar -> anggap macet.
  const watchStall = () => {
    if (!isPlayingRef.current || stallTimer.current !== undefined) return;
    stallTimer.current = window.setTimeout(() => {
      stallTimer.current = undefined;
      recoverAudio();
    }, STREAM_STALL_MS);
  };

  // ---- Audio: ikuti state play/pause ----
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentVideoId) return;
    if (isPlaying) {
      // Stream gagal/macet dan belum dimuat ulang (retry habis atau dibatalkan pause):
      // tombol putar memuat ulang sekarang, tanpa menunggu jadwal retry.
      if (audio.error || recovery.current.stale) {
        clearRetry();
        if (audio.currentTime > 0) recovery.current.resumeAt = audio.currentTime;
        reloadStream(audio, currentVideoId);
      }
      void audio.play().catch((err) => {
        // AbortError: src diganti lagu berikutnya. NotSupportedError: stream gagal dimuat,
        // ditangani recoverAudio (onError) yang memutar ulang sendiri. Keduanya bukan "berhenti".
        if (err instanceof DOMException && (err.name === 'AbortError' || err.name === 'NotSupportedError')) return;
        setIsPlaying(false);
      });
    } else {
      // User menekan pause: batalkan muat ulang yang dijadwalkan. stale tetap true,
      // jadi tombol putar berikutnya yang memuat ulang. (Event `pause` dari browser
      // sendiri saat stream gagal tidak boleh membatalkannya, jadi bukan di onPause.)
      clearRetry();
      audio.pause();
    }
  }, [isPlaying, currentVideoId, clearRetry]);

  // ---- Audio: volume ----
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = volume;
  }, [volume]);

  // ---- Siapkan lagu berikutnya di server, supaya Next langsung bunyi ----
  const preparedIds = useRef(new Set<string>());
  useEffect(() => {
    if (!currentTrackId) return;
    const index = queue.indexOf(currentTrackId);
    if (index === -1) return;
    const nextId = queue[index + 1] ?? (repeat === 'all' ? queue[0] : undefined);
    if (!nextId || nextId === currentTrackId) return;
    const videoId = (knownRef.current.get(nextId) ?? knownTracks.find((track) => track.id === nextId))?.videoId;
    if (!videoId || preparedIds.current.has(videoId)) return;
    if (preparedIds.current.size > 200) preparedIds.current.clear();
    preparedIds.current.add(videoId);
    prepareStream(videoId);
  }, [currentTrackId, queue, repeat, knownTracks]);

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
  
    // ---- Muat Like Song dari backend ----
  useEffect(() => {
    let cancelled = false;

    if (!token || !user?.id) {
      setLikedIds([]);
      return;
    }

    const loadLikedSongs = async () => {
      try {
        const likes = await fetchLikedSongs(token);
        if (cancelled) return;

        const ids = (likes ?? []).map((like) => like.music_id);
        setLikedIds(ids);

        await hydrateTracks(ids);
      } catch (error) {
        if (!cancelled) {
          console.error('Gagal memuat Like Song:', error);
        }
      }
    };

    void loadLikedSongs();

    return () => {
      cancelled = true;
    };
  }, [token, user?.id, hydrateTracks]);

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
          list.map((backend) =>
            fetchPlaylistDetail(String(backend.id), token).catch((err) => {
              console.error(`gagal ambil detail playlist ${backend.id}:`, err);
              return null;
            }),
          ),
        );
        if (cancelled) return;
        const mapped: Playlist[] = [];
        for (const detail of details) {
          if (!detail) continue;
          mapped.push(toPlaylist(detail, detail.songs));
        }
        setPlaylists(mapped);
        void hydrateTracks(mapped.flatMap((p) => p.trackIds));
      } catch (err) {
        // Backend tidak tersedia / sesi mati: daftar dibiarkan kosong,
        // user tetap bisa memakai player.
        console.error('gagal memuat daftar playlist:', err);
      }
    })();

    return () => {
      cancelled = true;
      loadedForRef.current = null;
    };
  }, [token, user?.id, hydrateTracks]);

  // ---- Muat riwayat dengar user dari backend (dipakai Recent di Home) ----
  useEffect(() => {
    if (!token) {
      setRecentIds([]);
      return undefined;
    }

    let cancelled = false;
    void (async () => {
      try {
        const entries = await fetchHistory(token);
        if (cancelled) return;
        const ids = entries.map((entry) => entry.music_id);
        // Gabung, jangan timpa: lagu yang diputar sebelum fetch selesai tetap di depan.
        setRecentIds((prev) => [...prev, ...ids.filter((id) => !prev.includes(id))].slice(0, 12));
        void hydrateTracks(ids);
      } catch (err) {
        console.error('gagal memuat riwayat dengar:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, hydrateTracks]);

  // ---- Navigasi ----
  const navigateTo = (target: NavTarget) => {
    if (target === 'home') {
      setQueryState('');
      navigate('/');
    } else if (target === 'search') {
      navigate('/search');
    } else if (target === 'library') {
      navigate('/library');
    } else if (target === 'admin') {
      navigate('/admin');
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
  // Mulai lagu + catat ke riwayat dengar (dipakai halaman Home, disimpan di backend).
  // Naik setiap kali lagu dimulai: hasil radio autoplay yang telat dibuang
  // bila user sudah memilih lagu lain selama radio dimuat.
  const autoplayReq = useRef(0);

  const startTrack = (id: string) => {
    autoplayReq.current += 1;
    setCurrentTrackId(id);
    setProgress(0);
    setIsPlaying(true);
    setRecentIds((prev) => [id, ...prev.filter((x) => x !== id)].slice(0, 12));
    if (token) {
      recordHistory(id, token).catch((err) => console.error('gagal mencatat riwayat dengar:', err));
    }
  };

  // Antrean lagu: diisi dari daftar yang sedang dilihat user (playlist/hasil search/liked),
  // supaya tombol Next/Prev tidak lompat ke lagu dari konteks lain.
  const playTrack = (id: string, context?: Track[]) => {
    const track = knownRef.current.get(id) ?? knownTracks.find((item) => item.id === id);
    if (!track?.videoId) return;

    const contextIds = context?.filter((item) => item.videoId).map((item) => item.id);
    if (contextIds?.length) {
      autoplayReq.current += 1; // antrean baru: buang mix/autoplay yang masih dimuat
      setPlayQueue(contextIds, id);
      setQueueReasons({});
    }

    if (id === currentTrackId) {
      setIsPlaying((p) => !p);
      return;
    }
    startTrack(id);
  };

  // Ganti antrean. Saat acak aktif, `anchor` (lagu yang dipilih) tetap di depan, sisanya diacak.
  const setPlayQueue = (queueIds: string[], anchor?: string) => {
    // Satu lagu satu posisi: daftar dengan lagu dobel bikin "sudah diputar"/berikutnya kacau.
    const ids = [...new Set(queueIds)];
    originalQueue.current = ids;
    if (!shuffleRef.current) {
      setQueue(ids);
      return;
    }
    const rest = shuffled(ids.filter((x) => x !== anchor));
    setQueue(anchor && ids.includes(anchor) ? [anchor, ...rest] : rest);
  };

  const toggleShuffle = () => {
    const next = !shuffle;
    shuffleRef.current = next;
    setShuffle(next);
    setNotice((prev) => ({ id: (prev?.id ?? 0) + 1, kind: 'shuffle', on: next }));
    if (next) {
      originalQueue.current = queue;
      const rest = shuffled(queue.filter((x) => x !== currentTrackId));
      setQueue(currentTrackId && queue.includes(currentTrackId) ? [currentTrackId, ...rest] : rest);
    } else {
      // Urutan asli, plus lagu yang masuk setelah acak dinyalakan (mis. autoplay) di belakang.
      const kept = originalQueue.current.filter((x) => queue.includes(x));
      setQueue([...kept, ...queue.filter((x) => !kept.includes(x))]);
    }
  };

  const cycleRepeat = () => {
    const next = REPEAT_NEXT[repeat];
    setRepeat(next);
    setNotice((prev) => ({ id: (prev?.id ?? 0) + 1, kind: 'repeat', mode: next }));
  };

  useEffect(() => {
    try {
      localStorage.setItem(MODES_KEY, JSON.stringify({ shuffle, repeat }));
    } catch {
      // localStorage tidak tersedia — mode hanya berlaku sampai reload.
    }
  }, [shuffle, repeat]);

  // Ubah hasil GET /music/:id/mix jadi lagu antrean yang belum ada di `exclude`.
  const mixToQueue = (mix: MixTrack[], exclude: Set<string>) => {
    const extra = mix.filter((item) => !exclude.has(item.video_id));
    const tracks = extra.map(toTrack);
    rememberTracks(tracks);
    setQueueReasons((prev) => ({ ...prev, ...Object.fromEntries(extra.map((item) => [item.video_id, item.reason])) }));
    return tracks;
  };

  const playMix = (id: string) => {
    const track = knownRef.current.get(id) ?? knownTracks.find((item) => item.id === id);
    if (!track?.videoId) return;
    if (id === currentTrackId) {
      setIsPlaying((p) => !p);
      return;
    }

    setPlayQueue([id], id);
    setQueueReasons({});
    startTrack(id);
    if (!token) return;
    // startTrack baru saja menaikkan autoplayReq; hasil dibuang bila user pindah lagu.
    const req = autoplayReq.current;
    void getSongMix(track.videoId, token)
      .then((mix) => {
        if (req !== autoplayReq.current) return;
        const tracks = mixToQueue(mix, new Set([id]));
        setPlayQueue([id, ...tracks.map((item) => item.id)], id);
      })
      .catch((err) => console.error('gagal memuat mix:', err));
  };

  const playFromQueue = (id: string) => {
    if (id === currentTrackId) setIsPlaying((p) => !p);
    else if (queue.includes(id)) startTrack(id);
  };

  // Putar ulang lagu ini dari awal. `counted` = lagu selesai sendiri (ulangi), jadi masuk riwayat.
  const restartCurrent = (counted: boolean) => {
    const audio = audioRef.current;
    if (!audio || !currentTrackId) return;
    audio.currentTime = 0;
    setProgress(0);
    if (counted || isPlaying) void audio.play().catch(() => setIsPlaying(false));
    if (counted && token) {
      recordHistory(currentTrackId, token).catch((err) => console.error('gagal mencatat riwayat dengar:', err));
    }
  };

  // `ended` = dipanggil karena lagu selesai (bukan tombol Next/Prev).
  const step = (dir: number, ended = false) => {
    const source = queue.length
      ? queue
          .map((id) => knownRef.current.get(id) ?? knownTracks.find((track) => track.id === id))
          .filter((track): track is Track => track !== undefined)
      : knownTracks;
    const playable = source.filter((track) => track.videoId);
    if (playable.length === 0) return;

    const index = currentTrackId ? playable.findIndex((track) => track.id === currentTrackId) : -1;

    // Autoplay seperti YouTube Music: antrean (mis. playlist) habis -> sambung mix lagu terakhir.
    const last = playable[index];
    // Ulangi semua: antrean diputar dari awal lagi, tanpa autoplay mix.
    if (dir > 0 && repeat === 'off' && queue.length && index === playable.length - 1 && last?.videoId && token) {
      const req = ++autoplayReq.current;
      const queued = new Set(playable.map((track) => track.id));
      void getSongMix(last.videoId, token)
        .then((mix) => {
          if (req !== autoplayReq.current) return;
          const extra = mixToQueue(mix, queued);
          if (extra.length === 0) {
            startTrack(playable[0].id);
            return;
          }
          const extraIds = extra.map((track) => track.id);
          originalQueue.current = [...originalQueue.current, ...extraIds];
          // Functional update: jangan timpa urutan yang diubah (mis. acak) selama mix dimuat.
          setQueue((q) => [...q, ...extraIds.filter((x) => !q.includes(x))]);
          startTrack(extra[0].id);
        })
        .catch((err) => {
          console.error('gagal memuat mix:', err);
          if (req === autoplayReq.current) startTrack(playable[0].id);
        });
      return;
    }

    const base = index === -1 ? (dir > 0 ? -1 : 0) : index;
    // Tanpa antrean (fallback semua lagu yang dikenal), acak = pilih lagu lain secara acak.
    const others = playable.filter((track) => track.id !== currentTrackId);
    const next =
      shuffle && !queue.length && dir > 0 && others.length
        ? shuffled(others)[0]
        : playable[(base + dir + playable.length) % playable.length];

    if (next.id === currentTrackId) {
      restartCurrent(ended);
      return;
    }
    startTrack(next.id);
  };

  // Lagu selesai sendiri: ulangi satu = putar lagi dari awal (dihitung sebagai putar ulang);
  // tombol Next tetap pindah lagu seperti di YouTube Music.
  const handleEnded = () => {
    if (repeat === 'one') restartCurrent(true);
    else step(1, true);
  };

  const togglePlay = () => {
    if (currentVideoId) setIsPlaying((p) => !p);
  };

    const toggleLike = (id: string) => {
    if (!token) {
      console.error('Silakan login untuk menggunakan Like Song.');
      return;
    }

    const isLiked = likedIds.includes(id);
    const musicId = knownRef.current.get(id)?.videoId ?? id;

    void (async () => {
      try {
        if (isLiked) {
          await unlikeSong(musicId, token);
          setLikedIds((ids) => ids.filter((item) => item !== id));
        } else {
          await likeSong(musicId, token);
          setLikedIds((ids) =>
            ids.includes(id) ? ids : [...ids, id],
          );
        }
      } catch (error) {
        console.error('Gagal memperbarui Like Song:', error);
      }
    })();
  };

  const seek = (seconds: number) => {
    const audio = audioRef.current;
    if (audio && currentVideoId) {
      audio.currentTime = seconds;
      setProgress(seconds);
      // Muat ulang yang masih tertunda harus lanjut dari posisi baru, bukan posisi lama.
      recovery.current.resumeAt = recovery.current.stale ? seconds : 0;
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

  // ---- Playlist: update (nama / deskripsi, owner-only) ----
  const updatePlaylist = async (playlistId: string, input: UpdatePlaylistInput) => {
    if (!token) throw new Error('Sesi berakhir, login ulang untuk mengedit playlist.');
    const updated = await updatePlaylistApi(playlistId, input, token);
    const patch = { name: updated.title, description: updated.description, status: updated.status };
    setPlaylists((list) => list.map((p) => (p.id === playlistId ? { ...p, ...patch } : p)));
    setVisitedPlaylists((map) =>
      map[playlistId] ? { ...map, [playlistId]: { ...map[playlistId], ...patch } } : map,
    );
  };

  // ---- Playlist: load single (untuk akses langsung ke URL) ----
  const loadPlaylist = useCallback(
    async (id: string) => {
      if (!token) throw new Error('Playlist tidak ditemukan.');
      const detail = await fetchPlaylistDetail(id, token);
      const playlist = toPlaylist(detail, detail.songs);
      if (playlist.userId === user?.id) {
        setPlaylists((list) => (list.some((p) => p.id === id) ? list : [playlist, ...list]));
      } else {
        // Playlist publik milik orang lain — jangan bocor ke sidebar/profil sendiri.
        setVisitedPlaylists((map) => ({ ...map, [id]: playlist }));
      }
      void hydrateTracks(playlist.trackIds);
    },
    [token, hydrateTracks, user?.id],
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

  const [played, upNext] = useMemo(() => {
    const index = currentTrackId ? queue.indexOf(currentTrackId) : -1;
    if (index === -1) return [[], []];
    const byId = new Map(knownTracks.map((track) => [track.id, track]));
    const toTracks = (ids: string[]) => ids.map((id) => byId.get(id)).filter((track): track is Track => track !== undefined);
    return [toTracks(queue.slice(0, index)), toTracks(queue.slice(index + 1))];
  }, [queue, currentTrackId, knownTracks]);

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
    visitedPlaylists,
    tracks: knownTracks,
    likedIds,
    recentTracks,
    likedTracks,

    tracksOf,
    hydrateTrackMetadata: hydrateTracks,
    loadPlaylist,
    addToPlaylist,
    removeFromPlaylist,
    deletePlaylist,
    updatePlaylist,

    query,
    setQuery,

    currentTrack,
    currentTrackId,
    trackDuration,
    isPlaying,
    progress,
    volume,
    playTrack,
    playMix,
    upNext,
    played,
    queueReasons,
    playFromQueue,
    togglePlay,
    toggleLike,
    seek,
    setVolume,
    prevTrack: () => step(-1),
    nextTrack: () => step(1),
    shuffle,
    toggleShuffle,
    repeat,
    cycleRepeat,

    rememberTracks,
  };

  return (
    <PlayerContext.Provider value={store}>
      <audio
        ref={audioRef}
        preload="metadata"
        onTimeUpdate={(e) => {
          setProgress(e.currentTarget.currentTime);
          clearStall();
        }}
        onLoadedMetadata={(e) => {
          const audio = e.currentTarget;
          setDuration(audio.duration);
          // Setelah muat ulang karena gagal: lanjut dari posisi terakhir.
          if (recovery.current.resumeAt > 0) {
            audio.currentTime = recovery.current.resumeAt;
            recovery.current.resumeAt = 0;
          }
        }}
        onPlaying={() => {
          clearStall();
          recovery.current.tries = 0;
          recovery.current.stale = false;
        }}
        onWaiting={watchStall}
        onStalled={watchStall}
        onPause={clearStall}
        onEnded={handleEnded}
        onError={recoverAudio}
      />

      {children}

      <PlayerNotice notice={notice} onDone={clearNotice} />

      {showCreate && (
        <ModalCreatePlaylist onClose={() => setShowCreate(false)} onCreate={createPlaylist} />
      )}
    </PlayerContext.Provider>
  );
}
