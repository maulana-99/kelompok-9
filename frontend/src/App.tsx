import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

import MelodiMusicDashboard from "./pages/MelodiMusicDashboard";
import Search from "./pages/search";
import Library from "./pages/library";
import LikedSongs from "./pages/likedSongs";

import "./index.css";

function RequireAuth({ children }: { children: ReactNode }) {
  const { token, ready } = useAuth();

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#1b1b1b] flex items-center justify-center text-[#f3f3f3]/50">
        Memuat...
      </div>
    );
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
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route
            path="/"
            element={
              <RequireAuth>
                <MelodiMusicDashboard />
              </RequireAuth>
            }
          />

          <Route
            path="/home"
            element={
              <RequireAuth>
                <MelodiMusicDashboard />
              </RequireAuth>
            }
          />

          <Route
            path="/search"
            element={
              <RequireAuth>
                <Search />
              </RequireAuth>
            }
          />

          <Route
            path="/library"
            element={
              <RequireAuth>
                <Library />
              </RequireAuth>
            }
          />

          <Route
            path="/liked-songs"
            element={
              <RequireAuth>
                <LikedSongs />
              </RequireAuth>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;