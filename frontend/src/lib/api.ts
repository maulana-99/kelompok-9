import type {
  ApiFailure,
  ApiSuccess,
  AuthResponse,
  BackendUser,
  CreateUserRequest,
  LoginRequest,
  MusicSearchResult,
} from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api/v1').replace(/\/$/, '');
const TOKEN_KEY = 'melodi_token';

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T | null> {
  const headers = new Headers(options.headers);
  if (options.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const payload: ApiSuccess<T> | ApiFailure | null =
    response.status === 204 ? null : await response.json();

  if (!response.ok) {
    const message = payload ? payload.message : `API request failed (${response.status})`;
    throw new ApiError(message ?? `API request failed (${response.status})`, response.status);
  }

  if (!payload || !payload.success) {
    throw new ApiError('Backend returned an invalid response.', response.status);
  }

  return payload.data ?? null;
}

export async function login(credentials: LoginRequest): Promise<AuthResponse> {
  const auth = await apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
  if (!auth) throw new ApiError('Backend did not return an authentication session.', 500);
  localStorage.setItem(TOKEN_KEY, auth.token);
  return auth;
}

export async function createUser(user: CreateUserRequest): Promise<BackendUser> {
  const createdUser = await apiRequest<BackendUser>('/users', {
    method: 'POST',
    body: JSON.stringify(user),
  });
  if (!createdUser) throw new ApiError('Backend did not return the created user.', 500);
  return createdUser;
}

export async function logout(): Promise<null> {
  try {
    await apiRequest<null>('/auth/logout', { method: 'POST' });
    return null;
  } finally {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export async function searchMusic(query: string, limit = 20): Promise<MusicSearchResult[]> {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  const results = await apiRequest<MusicSearchResult[]>(`/music/search?${params.toString()}`);
  if (!results) throw new ApiError('Backend did not return search results.', 500);
  return results;
}

export function hasAuthToken(): boolean {
  return localStorage.getItem(TOKEN_KEY) !== null;
}

export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}
