import { useState, type FormEvent } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { cx } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

const inputClass =
  'w-full border border-white/10 bg-sunken px-[17px] py-[13px] text-[14px] leading-5 text-ink outline-none transition-colors placeholder:text-muted focus:border-primary/60';

interface LoginViewProps {
  defaultMode?: 'login' | 'signup';
}

/** Login View (frame "Login"). Tab Log In / Sign Up berpindah tanpa halaman baru. */
export default function LoginView({ defaultMode = 'login' }: LoginViewProps) {
  const { login, signup, ready, token } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'login' | 'signup'>(defaultMode);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isLogin = mode === 'login';

  if (ready && token) {
    return <Navigate to="/" replace />;
  }

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!username.trim() || !password) return setError('Please fill in your username and password.');
    if (!isLogin && !name.trim()) return setError('Please enter your name.');
    setError('');
    setSubmitting(true);
    try {
      if (isLogin) {
        await login(username.trim(), password);
      } else {
        await signup(name.trim(), username.trim(), password);
      }
      navigate('/', { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal masuk. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-base p-4">
      <div className="flex w-full max-w-[440px] flex-col items-center gap-2 overflow-hidden border border-white/5 bg-raised pb-[33px] pt-px shadow-card">
        {/* Header & branding */}
        <div className="flex w-full flex-col items-center px-8 pb-4 pt-8">
          <div className="pb-4">
            <img src="/logo.svg" alt="" className="size-12 shadow-logo" />
          </div>
          <p className="pb-2 text-[14px] font-semibold uppercase leading-5 tracking-[0.7px] text-primary-soft">MELODI</p>
          <h1 className="text-[24px] font-bold leading-8 text-ink">{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
          <p className="pt-[6px] text-center text-[14px] leading-5 text-dim">
            {isLogin ? 'Enter your credentials to access your music.' : 'Join Melodi and start building your library.'}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex w-[calc(100%-66px)] bg-card p-1" role="tablist">
          {([
            { id: 'login', label: 'Log In' },
            { id: 'signup', label: 'Sign Up' },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={mode === tab.id}
              onClick={() => {
                setMode(tab.id);
                setError('');
              }}
              className={cx(
                'flex-1 py-2 text-center text-[14px] font-medium leading-5 transition-colors',
                mode === tab.id ? 'bg-line text-ink drop-shadow-[0_1px_1px_rgba(0,0,0,0.05)]' : 'text-dim hover:text-ink',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={submit} noValidate className="flex w-[calc(100%-66px)] flex-col gap-4 pt-4">
          {!isLogin && (
            <div className="flex flex-col gap-[6px]">
              <label htmlFor="name" className="text-[12px] font-medium leading-4 text-dim">
                Name
              </label>
              <input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={inputClass} />
            </div>
          )}

          <div className="flex flex-col gap-[6px]">
            <label htmlFor="username" className="text-[12px] font-medium leading-4 text-dim">
              Username
            </label>
            <input
            id="username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-[6px]">
            <label htmlFor="password" className="text-[12px] font-medium leading-4 text-dim">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={cx(inputClass, 'pr-[41px]')}
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-dim hover:text-ink"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="text-[12px] leading-4 text-primary-soft">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary py-3 text-[14px] font-semibold leading-5 text-on-primary shadow-primary transition hover:brightness-110"
          >
            {submitting ? 'Please wait...' : isLogin ? 'Log In' : 'Create Account'}
          </button>

          <p className="flex justify-center gap-1 pt-3 text-[12px] leading-4 text-dim">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}
            <button
              type="button"
              onClick={() => setMode(isLogin ? 'signup' : 'login')}
              className="font-medium text-primary-soft hover:underline"
            >
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
