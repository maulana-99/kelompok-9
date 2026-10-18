import { type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AuthProvider, useAuth } from './context/AuthContext';
import { PlayerProvider } from './context/PlayerContext';
import AppShell from './components/AppShell';
import HomeView from './pages/HomeView';
import LibraryView from './pages/LibraryView';
import LoginView from './pages/LoginView';
import PlaylistView from './pages/PlaylistView';
import SearchView from './pages/SearchView';
import GenreView from './pages/GenreView';
import ExplorePlaylistView from './pages/ExplorePlaylistView';
import LikedSongs from './pages/likedSongs';

import './index.css';

// RequireAuth (only accessible if the user are logged in.. otherwise, redirect to login page)
function RequireAuth({ children }: { children: ReactNode }) {
  const { token, ready } = useAuth();

  if (!ready) {
    return <div className="min-h-screen flex items-center justify-center bg-base text-ink/50">Memuat...</div>;
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        {/* PlayerProvider berada di atas <Routes>: <audio> tidak unmount saat pindah halaman. */}
        <PlayerProvider>
          <Routes>
            <Route path="/login" element={<LoginView />} />
            <Route path="/signup" element={<LoginView defaultMode="signup" />} />

            <Route
              path="/"
              element={
                <RequireAuth>
                  <AppShell>
                    <HomeView />
                  </AppShell>
                </RequireAuth>
              }
            />
            <Route path="/home" element={<Navigate to="/" replace />} />

            <Route
              path="/search"
              element={
                <RequireAuth>
                  <AppShell autoFocusSearch>
                    <SearchView />
                  </AppShell>
                </RequireAuth>
              }
            />

            <Route path="/explore" element={<Navigate to="/search" replace />} />

            <Route
              path="/explore/playlist/:playlistId"
              element={
                <RequireAuth>
                  <AppShell>
                    <ExplorePlaylistView />
                  </AppShell>
                </RequireAuth>
              }
            />

            <Route
              path="/explore/:genreId"
              element={
                <RequireAuth>
                  <AppShell>
                    <GenreView />
                  </AppShell>
                </RequireAuth>
              }
            />

            <Route
              path="/library"
              element={
                <RequireAuth>
                  <AppShell>
                    <LibraryView />
                  </AppShell>
                </RequireAuth>
              }
            />

            <Route
              path="/playlist/:playlistId"
              element={
                <RequireAuth>
                  <AppShell>
                    <PlaylistView />
                  </AppShell>
                </RequireAuth>
              }
            />

            <Route
              path="/liked-songs"
              element={
                <RequireAuth>
                  <AppShell>
                    <LikedSongs />
                  </AppShell>
                </RequireAuth>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </PlayerProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
