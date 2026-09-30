import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import MelodiMusicDashboard from './pages/MelodiMusicDashboard';
import Signup from './pages/Signup';
import './index.css';

// RequireAuth (only accessible if the user are logged in.. otherwise, redirect to login page)
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;