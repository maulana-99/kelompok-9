import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api } from '../lib/api';

export interface User {
  id: number;
  name: string;
  username: string;
  created_at: string;
}

interface LoginResponse {
  token: string;
  user: User;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  ready: boolean;
  login: (username: string, password: string) => Promise<void>;
  signup: (name: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const STORAGE_KEY = 'melodi_auth';

const AuthContext = createContext<AuthContextValue | null>(null);

interface StoredSession {
  token: string;
  user: User;
}

function readStorage(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed?.token || !parsed?.user) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStorage(session: StoredSession | null) {
  try {
    if (session) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // localStorage cant be accessed, session only stays in memory.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(() => readStorage());
  const [ready, setReady] = useState(false);

  // When the app is opened, validate the token against the backend to ensure that expired sessions are no longer used
  useEffect(() => {
    let cancelled = false;

    async function validate() {
      const stored = readStorage();
      if (!stored) {
        setReady(true);
        return;
      }

      try {
        const user = await api<User>('/auth/me', { token: stored.token });
        if (!cancelled) setSession({ token: stored.token, user });
      } catch {
        if (!cancelled) {
          setSession(null);
          writeStorage(null);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    validate();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const data = await api<LoginResponse>('/auth/login', {
      method: 'POST',
      body: { username, password },
    });
    const next: StoredSession = { token: data.token, user: data.user };
    setSession(next);
    writeStorage(next);
  }, []);

  const signup = useCallback(
    async (name: string, username: string, password: string) => {
      // 1. sign up an account
      await api('/users', { method: 'POST', body: { name, username, password } });
      // 2. Log in directly so users no need to fill the username and password again
      await login(username, password);
    },
    [login],
  );

  const logout = useCallback(async () => {
    const current = session;
    // Clear the local state first, so the UI updated even if the server is lagging / slow
    setSession(null);
    writeStorage(null);
    if (current) {
      try {
        await api('/auth/logout', { method: 'POST', token: current.token });
      } catch {
        // The token has expired so no problem, the local session has been deleted right?
      }
    }
  }, [session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      token: session?.token ?? null,
      ready,
      login,
      signup,
      logout,
    }),
    [session, ready, login, signup, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth harus dipakai di dalam <AuthProvider>');
  }
  return ctx;
}
