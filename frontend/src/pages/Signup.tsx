import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../lib/api';

export default function Signup() {
  const { signup, token, ready } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (ready && token) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError('Konfirmasi password tidak sama');
      return;
    }
    if (!/^[a-zA-Z0-9]+$/.test(username)) {
      setError('Username hanya boleh huruf dan angka');
      return;
    }

    setLoading(true);
    try {
      await signup(name.trim(), username.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal mendaftar, coba lagi');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#1b1b1b] text-[#f3f3f3] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <header className="mb-10 text-center">
          <p className="text-xs tracking-[0.4em] uppercase text-[#e9204f] mb-4">Melodi</p>
          <h1 className="text-3xl font-light">Buat akun baru</h1>
          <p className="mt-2 text-sm text-[#f3f3f3]/50">Daftar gratis dan mulai dengarkan musik</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <p className="text-sm text-[#e9204f] border border-[#e9204f]/40 rounded-lg px-4 py-3">
              {error}
            </p>
          )}

          <div className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-xs uppercase tracking-widest text-[#f3f3f3]/50 mb-2">
                Nama
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                required
                minLength={2}
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="nama lengkap"
                className="w-full bg-transparent border-b border-[#f3f3f3]/20 py-2.5 text-sm placeholder:text-[#f3f3f3]/30 focus:outline-none focus:border-[#e9204f] transition-colors"
              />
            </div>

            <div>
              <label htmlFor="username" className="block text-xs uppercase tracking-widest text-[#f3f3f3]/50 mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                required
                minLength={3}
                maxLength={50}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="huruf dan angka, min. 3 karakter"
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
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="min. 8 karakter"
                className="w-full bg-transparent border-b border-[#f3f3f3]/20 py-2.5 text-sm placeholder:text-[#f3f3f3]/30 focus:outline-none focus:border-[#e9204f] transition-colors"
              />
            </div>

            <div>
              <label htmlFor="confirm" className="block text-xs uppercase tracking-widest text-[#f3f3f3]/50 mb-2">
                Ulangi Password
              </label>
              <input
                id="confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="ketik ulang password"
                className="w-full bg-transparent border-b border-[#f3f3f3]/20 py-2.5 text-sm placeholder:text-[#f3f3f3]/30 focus:outline-none focus:border-[#e9204f] transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#f3f3f3] text-black hover:bg-[#e9204f] hover:text-[#f3f3f3] hover:shadow-[0_0_24px_rgba(233,32,79,0.55)] disabled:opacity-60 disabled:cursor-not-allowed text-sm font-medium tracking-wide rounded-full py-3 transition-[background-color,color,box-shadow] duration-[2000ms] hover:duration-300 ease-in-out"
          >
            {loading ? 'Mendaftar...' : 'Daftar'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-[#f3f3f3]/50">
          Sudah punya akun?{' '}
          <Link to="/login" className="text-[#e9204f] hover:underline">
            Masuk di sini
          </Link>
        </p>
      </div>
    </main>
  );
}
