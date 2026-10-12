import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
  useParams,
} from 'react-router-dom';
import AppShell from './components/AppShell';
import ModalCreatePlaylist from './components/ModalCreatePlaylist';
import LoginView from './pages/LoginView';
import HomeView from './pages/HomeView';
import SearchView from './pages/SearchView';
import PlaylistView from './pages/PlaylistView';
import LibraryView from './pages/LibraryView';
import { currentUser, playlists as seedPlaylists, tracks } from './data/mock';
import {
  clearAuthToken,
  createPlaylist as createPlaylistApi,
  getMe,
  hasAuthToken,
  listPlaylists,
  logout as logoutApi,
} from './lib/api';
import { toDurationLabel, toSeconds } from './lib/utils';
import type { AppContext, AppUser, CreatePlaylistInput, Playlist, Track, AppView } from './types';

const DEMO_MODE = import.meta.env.DEV && import.meta.env.VITE_DEMO_MODE === 'true';

function PlaylistRouteWrapper({
  playlists,
  tracks,
  currentTrackId,
  isPlaying,
  likedIds,
  onPlayTrack,
  onToggleLike,
  onTogglePlay,
}: {
  playlists: Playlist[];
  tracks: Track[];
  currentTrackId: string;
  isPlaying: boolean;
  likedIds: string[];
  onPlayTrack: (id: string) => void;
  onToggleLike: (id: string) => void;
  onTogglePlay: () => void;
}) {
  const { playlistId } = useParams<{ playlistId: string }>();
  const playlist = playlists.find((p) => p.id === playlistId) ?? playlists[0];

  if (!playlist) {
    return <p className="px-8 py-12 text-center text-[14px] text-muted">Playlist not found.</p>;
  }

  return (
    <PlaylistView
      playlist={playlist}
      tracks={tracks}
      currentTrackId={currentTrackId}
      isPlaying={isPlaying}
      likedIds={likedIds}
      onPlayTrack={onPlayTrack}
      onToggleLike={onToggleLike}
      onTogglePlay={onTogglePlay}
    />
  );
}

function MelodiApp() {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState<AppUser>(() => {
    if (DEMO_MODE) {
      return { name: 'Demo User', username: 'demo', handle: '@demo', plan: 'Free Plan' };
    }
    try {
      const stored = localStorage.getItem('melodi_user');
      if (stored) return JSON.parse(stored) as AppUser;
    } catch {
      // ignore
    }
    return currentUser;
  });

  const [query, setQueryState] = useState('');
  const [playlists, setPlaylists] = useState(seedPlaylists);
  const [knownTracks, setKnownTracks] = useState<Track[]>(tracks);
  const [showCreate, setShowCreate] = useState(false);

  // Player
  const [currentTrackId, setCurrentTrackId] = useState('t1');
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(134); // 2:14
  const [volume, setVolume] = useState(0.7);
  const [likedIds, setLikedIds] = useState(['t1']);

  // Routes & View inspection
  const pathname = location.pathname;
  const isSearch = pathname === '/search';
  const isLibrary = pathname === '/library';
  const isPlaylist = pathname.startsWith('/playlist/');
  const isLogin = pathname === '/login' || pathname === '/signup';
  const isHome = pathname === '/' || pathname === '/home';

  const view: AppView = isLogin ? 'login' : isSearch ? 'search' : isPlaylist ? 'playlist' : isLibrary ? 'library' : 'home';
  const activePlaylistId = isPlaylist ? pathname.replace('/playlist/', '') : null;
  const variant = isHome ? 'dash' : 'base';

  const currentTrack = knownTracks.find((track) => track.id === currentTrackId) ?? tracks[0];
  const isAuthenticated = DEMO_MODE || hasAuthToken();

  // Validate token & load backend playlists on mount if authenticated
  useEffect(() => {
    if (!DEMO_MODE && hasAuthToken()) {
      void getMe()
        .then((profile) => {
          setUser({
            ...profile,
            handle: `@${profile.username}`,
            plan: 'Free Plan',
          });
        })
        .catch(() => {
          clearAuthToken();
          localStorage.removeItem('melodi_user');
          setUser(currentUser);
          navigate('/login');
        });

      void listPlaylists()
        .then((backendPlaylists) => {
          const loaded: Playlist[] = backendPlaylists.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            trackIds: p.track_ids,
            trackCount: p.track_count,
            durationLabel: p.duration_label,
            cover: p.cover,
          }));
          setPlaylists(loaded);
          setKnownTracks((existing) => {
            const byId = new Map(existing.map((track) => [track.id, track]));
            backendPlaylists.forEach((p) => p.tracks.forEach((track) => byId.set(track.id, track)));
            return [...byId.values()];
          });
        })
        .catch((err) => {
          console.error('Failed to load playlists from backend:', err);
        });
    }
  }, [navigate]);

  // ---- Navigation ----
  const navigateTo = (target: 'home' | 'search' | 'library') => {
    if (target === 'home') {
      setQueryState('');
      navigate('/');
    }
    if (target === 'search') {
      if (!query) setQueryState('Frank Ocean');
      navigate('/search');
    }
    if (target === 'library') {
      navigate('/library');
    }
  };

  const openPlaylist = (id: string) => navigate(`/playlist/${id}`);

  const setQuery = (value: string) => {
    setQueryState(value);
    if (value && pathname !== '/search') navigate('/search');
    if (!value && pathname === '/search') navigate('/');
  };

  const login = async (authenticatedUser: AppUser) => {
    let loadedPlaylists: Playlist[] = seedPlaylists;
    if (!DEMO_MODE) {
      try {
        const backendPlaylists = await listPlaylists();
        loadedPlaylists = backendPlaylists.map((playlist) => ({
          id: playlist.id,
          name: playlist.name,
          description: playlist.description,
          trackIds: playlist.track_ids,
          trackCount: playlist.track_count,
          durationLabel: playlist.duration_label,
          cover: playlist.cover,
        }));
        setKnownTracks((existing) => {
          const byId = new Map(existing.map((track) => [track.id, track]));
          backendPlaylists.forEach((playlist) => playlist.tracks.forEach((track) => byId.set(track.id, track)));
          return [...byId.values()];
        });
      } catch (err) {
        console.error('Failed to fetch user playlists on login:', err);
      }
    }
    setUser(authenticatedUser);
    localStorage.setItem('melodi_user', JSON.stringify(authenticatedUser));
    setPlaylists(loadedPlaylists);
    navigate('/');
  };

  const logout = () => {
    if (!DEMO_MODE) {
      void logoutApi().catch((error: unknown) => {
        console.error('Unable to log out from the backend:', error);
      });
    }
    clearAuthToken();
    localStorage.removeItem('melodi_user');
    setQueryState('');
    navigate('/login');
  };

  // ---- Player ----
  const playTrack = (id: string) => {
    if (id === currentTrackId) {
      setIsPlaying((p) => !p);
    } else {
      setCurrentTrackId(id);
      setProgress(0);
      setIsPlaying(true);
    }
  };

  const step = (dir: number) => {
    const i = knownTracks.findIndex((t) => t.id === currentTrackId);
    const nextIndex = (Math.max(i, 0) + dir + knownTracks.length) % knownTracks.length;
    const next = knownTracks[nextIndex];
    setCurrentTrackId(next.id);
    setProgress(0);
    setIsPlaying(true);
  };

  const toggleLike = (id: string) =>
    setLikedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const rememberTracks = useCallback((results: Track[]) => {
    setKnownTracks((existing) => {
      const byId = new Map(existing.map((track) => [track.id, track]));
      results.forEach((track) => byId.set(track.id, track));
      return [...byId.values()];
    });
  }, []);

  // Timer progres lagu
  useEffect(() => {
    if (!isPlaying || isLogin) return undefined;
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
  }, [isPlaying, currentTrackId, isLogin]);

  // ---- Create Playlist ----
  const createPlaylist = async (input: CreatePlaylistInput) => {
    let newPlaylist: Playlist;
    if (DEMO_MODE) {
      const total = input.trackIds.reduce((sum, trackId) => {
        const track = knownTracks.find((item) => item.id === trackId);
        return sum + (track ? toSeconds(track.duration) : 0);
      }, 0);
      newPlaylist = {
        id: `p${Date.now()}`,
        name: input.name,
        description: input.description,
        trackIds: input.trackIds,
        trackCount: input.trackIds.length,
        durationLabel: total ? toDurationLabel(total) : '0 min',
        cover: input.cover,
      };
    } else {
      const created = await createPlaylistApi(input, knownTracks);
      newPlaylist = {
        id: created.id,
        name: created.name,
        description: created.description,
        trackIds: created.track_ids,
        trackCount: created.track_count,
        durationLabel: created.duration_label,
        cover: created.cover,
      };
      setKnownTracks((existing) => {
        const byId = new Map(existing.map((track) => [track.id, track]));
        created.tracks.forEach((track) => byId.set(track.id, track));
        return [...byId.values()];
      });
    }
    setPlaylists((list) => [...list, newPlaylist]);
    setShowCreate(false);
    navigate(`/playlist/${newPlaylist.id}`);
  };

  const app: AppContext = useMemo(
    () => ({
      view,
      user,
      query,
      setQuery,
      playlists,
      activePlaylistId,
      navigate: navigateTo,
      openPlaylist,
      openCreate: () => setShowCreate(true),
      logout,
      back: () => navigate(-1),
      forward: () => navigate(1),
      canBack: true,
      canForward: true,
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
    [view, user, query, playlists, activePlaylistId, currentTrack, isPlaying, progress, volume, likedIds],
  );

  // If not authenticated and trying to access protected routes
  if (!isAuthenticated && !isLogin) {
    return <Navigate to="/login" replace />;
  }

  // If already authenticated and trying to access login/signup
  if (isAuthenticated && isLogin) {
    return <Navigate to="/" replace />;
  }

  // Render Login / Signup view
  if (isLogin) {
    return (
      <LoginView
        defaultUsername={user.username}
        defaultMode={pathname === '/signup' ? 'signup' : 'login'}
        onLogin={login}
      />
    );
  }

  return (
    <>
      <AppShell
        variant={variant}
        navLabel={isSearch ? 'NAVIGATION' : undefined}
        app={app}
        autoFocusSearch={isSearch}
      >
        <Routes>
          <Route
            path="/"
            element={
              <HomeView
                playlists={playlists}
                currentTrackId={currentTrackId}
                isPlaying={isPlaying}
                onPlayTrack={playTrack}
                onOpenPlaylist={openPlaylist}
                onCreatePlaylist={() => setShowCreate(true)}
              />
            }
          />
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route
            path="/library"
            element={
              <LibraryView
                playlists={playlists}
                currentTrackId={currentTrackId}
                isPlaying={isPlaying}
                likedIds={likedIds}
                onPlayTrack={playTrack}
                onOpenPlaylist={openPlaylist}
                onCreatePlaylist={() => setShowCreate(true)}
              />
            }
          />
          <Route
            path="/search"
            element={
              <SearchView
                query={query}
                currentTrackId={currentTrackId}
                isPlaying={isPlaying}
                likedIds={likedIds}
                onPlayTrack={playTrack}
                onToggleLike={toggleLike}
                onTracksFound={rememberTracks}
              />
            }
          />
          <Route
            path="/playlist/:playlistId"
            element={
              <PlaylistRouteWrapper
                playlists={playlists}
                tracks={knownTracks}
                currentTrackId={currentTrackId}
                isPlaying={isPlaying}
                likedIds={likedIds}
                onPlayTrack={playTrack}
                onToggleLike={toggleLike}
                onTogglePlay={() => setIsPlaying((p) => !p)}
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>

      {showCreate && (
        <ModalCreatePlaylist
          tracks={knownTracks}
          onClose={() => setShowCreate(false)}
          onCreate={createPlaylist}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <MelodiApp />
    </BrowserRouter>
  );
}
