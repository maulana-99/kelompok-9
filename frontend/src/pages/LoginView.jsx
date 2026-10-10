import { useState } from 'react';
import { Music2, Eye, EyeOff, Check } from 'lucide-react';
import { cx } from '../lib/utils';

const inputClass =
  'w-full border border-white/10 bg-sunken px-[17px] py-[13px] text-[14px] leading-5 text-ink outline-none transition-colors placeholder:text-muted focus:border-primary/60';

/** Login View (frame "Login"). Tab Log In / Sign Up berpindah tanpa halaman baru. */
export default function LoginView({ defaultEmail, onLogin }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [name, setName] = useState('');
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');

  const isLogin = mode === 'login';

  const submit = (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return setError('Please fill in your email and password.');
    if (!isLogin && !name.trim()) return setError('Please enter your name.');
    setError('');
    onLogin({ email: email.trim(), name: name.trim() });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-base p-4">
      <div className="flex w-full max-w-[440px] flex-col items-center gap-2 overflow-hidden border border-white/5 bg-raised pb-[33px] pt-px shadow-card">
        {/* Header & branding */}
        <div className="flex w-full flex-col items-center px-8 pb-4 pt-8">
          <div className="pb-4">
            <div className="flex size-12 items-center justify-center bg-primary text-on-primary shadow-logo">
              <Music2 className="size-6" strokeWidth={2.5} />
            </div>
          </div>
          <p className="pb-2 text-[14px] font-semibold uppercase leading-5 tracking-[0.7px] text-primary-soft">MELODI</p>
          <h1 className="text-[24px] font-bold leading-8 text-ink">{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
          <p className="pt-[6px] text-center text-[14px] leading-5 text-dim">
            {isLogin ? 'Enter your credentials to access your music.' : 'Join Melodi and start building your library.'}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex w-[calc(100%-66px)] bg-card p-1" role="tablist">
          {[
            { id: 'login', label: 'Log In' },
            { id: 'signup', label: 'Sign Up' },
          ].map((tab) => (
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
            <label htmlFor="email" className="text-[12px] font-medium leading-4 text-dim">
              Email
            </label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          </div>

          <div className="flex flex-col gap-[6px]">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-[12px] font-medium leading-4 text-dim">
                Password
              </label>
              {isLogin && (
                <button type="button" className="text-[12px] leading-4 text-primary-soft hover:underline">
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
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

          <label className="flex h-7 cursor-pointer items-center gap-[10px] text-[12px] leading-4 text-dim">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="peer sr-only" />
            <span
              className={cx(
                'flex size-[18px] items-center justify-center border',
                remember ? 'border-transparent bg-primary text-on-primary' : 'border-white/20 bg-sunken text-transparent',
                'peer-focus-visible:ring-2 peer-focus-visible:ring-primary/50',
              )}
            >
              <Check className="size-[13px]" strokeWidth={3.5} />
            </span>
            Remember me
          </label>

          {error && (
            <p role="alert" className="text-[12px] leading-4 text-primary-soft">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full bg-primary py-3 text-[14px] font-semibold leading-5 text-on-primary shadow-primary transition hover:brightness-110"
          >
            {isLogin ? 'Log In' : 'Create Account'}
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
