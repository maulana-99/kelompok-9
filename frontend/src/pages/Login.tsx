import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../lib/api';

export default function Login() {
  const { login, token, ready } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (ready && token) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal login, coba lagi');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#1b1b1b] text-[#f3f3f3] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <header className="mb-12 text-center">
          <p className="text-xs tracking-[0.4em] uppercase text-[#e9204f] mb-4">Melodi</p>
          <h1 className="text-3xl font-light">Selamat datang kembali</h1>
          <p className="mt-2 text-sm text-[#f3f3f3]/50">Masuk untuk lanjutkan musikmu</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <p className="text-sm text-[#e9204f] border border-[#e9204f]/40 rounded-lg px-4 py-3">
              {error}
            </p>
          )}

          <div className="space-y-5">
            <div>
              <label htmlFor="username" className="block text-xs uppercase tracking-widest text-[#f3f3f3]/50 mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username kamu"
                className="w-full bg-transparent border-b border-[#f3f3f3]/20 py-2.5 text-sm placeholder:text-[#f3f3f3]/30 focus:outline-none focus:border-[#e9204f] transition-colors"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs uppercase tracking-widest text-[#f3f3f3]/50 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-transparent border-b border-[#f3f3f3]/20 py-2.5 text-sm placeholder:text-[#f3f3f3]/30 focus:outline-none focus:border-[#e9204f] transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#f3f3f3] text-black hover:bg-[#e9204f] hover:text-[#f3f3f3] hover:shadow-[0_0_24px_rgba(233,32,79,0.55)] disabled:opacity-60 disabled:cursor-not-allowed text-sm font-medium tracking-wide rounded-full py-3 transition-[background-color,color,box-shadow] duration-[2000ms] hover:duration-300 ease-in-out"
          >
            {loading ? 'Masuk...' : 'Masuk'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-[#f3f3f3]/50">
          Belum punya akun?{' '}
          <Link to="/signup" className="text-[#e9204f] hover:underline">
            Daftar di sini
          </Link>
        </p>
      </div>
    </main>
  );
}
