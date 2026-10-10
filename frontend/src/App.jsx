import { useCallback, useEffect, useMemo, useState } from 'react';
import AppShell from './components/AppShell';
import ModalCreatePlaylist from './components/ModalCreatePlaylist';
import LoginView from './pages/LoginView';
import HomeView from './pages/HomeView';
import SearchView from './pages/SearchView';
import PlaylistView from './pages/PlaylistView';
import { currentUser, getTrack, playlists as seedPlaylists, tracks } from './data/mock';
import { toSeconds } from './lib/utils';

/**
 * State sederhana tanpa router:
 *  view: 'login' | 'home' | 'search' | 'playlist'
 *  showCreate: modal Create Playlist (overlay di atas view mana pun)
 * Riwayat view disimpan agar tombol back/forward di header berfungsi.
 */
export default function App() {
  const [user, setUser] = useState(currentUser);
  const [history, setHistory] = useState([{ view: 'login' }]);
  const [cursor, setCursor] = useState(0);
  const [query, setQueryState] = useState('');
  const [playlists, setPlaylists] = useState(seedPlaylists);
  const [showCreate, setShowCreate] = useState(false);

  // Player
  const [currentTrackId, setCurrentTrackId] = useState('t1');
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(134); // 2:14
  const [volume, setVolume] = useState(0.7);
  const [likedIds, setLikedIds] = useState(['t1']);

  const current = history[cursor];
  const view = current.view;
  const activePlaylistId = current.playlistId ?? null;
  const currentTrack = getTrack(currentTrackId);

  // ---- navigasi ----
  const go = useCallback(
    (next) => {
      setHistory((h) => [...h.slice(0, cursor + 1), next]);
      setCursor((c) => c + 1);
    },
    [cursor],
  );

  const navigate = (target) => {
    if (target === 'home') setQueryState('');
    if (target === 'search' && !query) setQueryState('Frank Ocean');
    go({ view: target });
  };

  const openPlaylist = (id) => go({ view: 'playlist', playlistId: id });

  // Mengetik di search bar otomatis membuka halaman hasil pencarian.
  const setQuery = (value) => {
    setQueryState(value);
    if (value && view !== 'search') go({ view: 'search' });
    if (!value && view === 'search') go({ view: 'home' });
  };

  const login = ({ name }) => {
    if (name) setUser((u) => ({ ...u, name }));
    setHistory([{ view: 'home' }]);
    setCursor(0);
  };

  const logout = () => {
    setQueryState('');
    setHistory([{ view: 'login' }]);
    setCursor(0);
  };

  // ---- player ----
  const playTrack = (id) => {
    if (id === currentTrackId) {
      setIsPlaying((p) => !p);
    } else {
      setCurrentTrackId(id);
      setProgress(0);
      setIsPlaying(true);
    }
  };

  const step = (dir) => {
    const i = tracks.findIndex((t) => t.id === currentTrackId);
    const next = tracks[(i + dir + tracks.length) % tracks.length];
    setCurrentTrackId(next.id);
    setProgress(0);
    setIsPlaying(true);
  };

  const toggleLike = (id) => setLikedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  // Timer progres lagu; lanjut ke lagu berikutnya saat selesai.
  useEffect(() => {
    if (!isPlaying || view === 'login') return undefined;
    const total = toSeconds(currentTrack.duration);
    const timer = setInterval(() => {
      setProgress((p) => {
        if (p + 1 >= total) {
          step(1);
          return 0;
        }
        return p + 1;
      });
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, currentTrackId, view]);

  // ---- create playlist ----
  const createPlaylist = ({ name, description, trackIds, cover }) => {
    const id = `p${Date.now()}`;
    const total = trackIds.reduce((sum, tid) => sum + toSeconds(getTrack(tid).duration), 0);
    const mins = Math.round(total / 60);
    const durationLabel = mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)} hr ${String(mins % 60).padStart(2, '0')} min`;
    setPlaylists((list) => [...list, { id, name, description, trackIds, cover, trackCount: trackIds.length, durationLabel: total ? durationLabel : '0 min' }]);
    setShowCreate(false);
    openPlaylist(id);
  };

  const app = useMemo(
    () => ({
      view,
      user,
      query,
      setQuery,
      playlists,
      activePlaylistId,
      navigate,
      openPlaylist,
      openCreate: () => setShowCreate(true),
      logout,
      back: () => setCursor((c) => Math.max(0, c - 1)),
      forward: () => setCursor((c) => Math.min(history.length - 1, c + 1)),
      canBack: cursor > 0 && history[cursor - 1].view !== 'login',
      canForward: cursor < history.length - 1,
      currentTrack,
      isPlaying,
      progress,
      volume,
      likedIds,
      toggleLike,
      togglePlay: () => setIsPlaying((p) => !p),
      prevTrack: () => step(-1),
      nextTrack: () => step(1),
      seek: setProgress,
      setVolume,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [view, user, query, playlists, activePlaylistId, cursor, history, currentTrack, isPlaying, progress, volume, likedIds],
  );

  // ---- render ----
  if (view === 'login') {
    return <LoginView defaultEmail={user.email} onLogin={login} />;
  }

  const playlist = playlists.find((p) => p.id === activePlaylistId) ?? playlists[0];

  return (
    <>
      {view === 'home' && (
        <AppShell variant="dash" app={app}>
          <HomeView
            playlists={playlists}
            currentTrackId={currentTrackId}
            isPlaying={isPlaying}
            onPlayTrack={playTrack}
            onOpenPlaylist={openPlaylist}
            onCreatePlaylist={() => setShowCreate(true)}
          />
        </AppShell>
      )}

      {view === 'search' && (
        <AppShell variant="base" navLabel="NAVIGATION" app={app} autoFocusSearch>
          <SearchView
            query={query}
            currentTrackId={currentTrackId}
            isPlaying={isPlaying}
            likedIds={likedIds}
            onPlayTrack={playTrack}
            onToggleLike={toggleLike}
          />
        </AppShell>
      )}

      {view === 'playlist' && (
        <AppShell variant="base" app={app}>
          <PlaylistView
            playlist={playlist}
            currentTrackId={currentTrackId}
            isPlaying={isPlaying}
            likedIds={likedIds}
            onPlayTrack={playTrack}
            onToggleLike={toggleLike}
            onTogglePlay={() => setIsPlaying((p) => !p)}
          />
        </AppShell>
      )}

      {showCreate && <ModalCreatePlaylist onClose={() => setShowCreate(false)} onCreate={createPlaylist} />}
    </>
  );
}
