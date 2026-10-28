export const API_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8080/api/v1';

// Backend responses always wrap the results in this envelope
interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: unknown;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// Pesan untuk pengguna awam: jelaskan apa yang terjadi dan apa yang bisa dilakukan.
export const OFFLINE_MESSAGE = 'Internet kamu sepertinya terputus. Periksa koneksi, lalu coba lagi.';
export const SERVER_DOWN_MESSAGE =
  'Server Melodi sedang tidak aktif. Ini biasanya sementara, coba lagi dalam beberapa menit.';
const SERVER_ERROR_MESSAGE = 'Ada gangguan di server Melodi. Coba lagi sebentar lagi.';
const TOO_MANY_MESSAGE = 'Terlalu banyak permintaan dalam waktu singkat. Tunggu sebentar, lalu coba lagi.';
const UNKNOWN_MESSAGE = 'Terjadi kesalahan yang tidak terduga. Muat ulang halaman, lalu coba lagi.';

/** 0 = request tidak sampai; 502/503/504 = proxy aktif tapi server di belakangnya mati. */
export function isServerUnreachable(status: number): boolean {
  return status === 0 || status === 502 || status === 503 || status === 504;
}

// Banner "server offline" (ServerStatusBanner) mendengarkan event ini.
export const SERVER_STATUS_EVENT = 'melodi:server-status';
// AuthProvider mendengarkan event ini: token ditolak server (401) -> sesi dihapus.
export const AUTH_EXPIRED_EVENT = 'melodi:auth-expired';
function reportServer(online: boolean) {
  window.dispatchEvent(new CustomEvent(SERVER_STATUS_EVENT, { detail: online }));
}

let pinging: Promise<boolean> | null = null;

/**
 * GET /health (di root server, tanpa envelope). Satu-satunya yang boleh menyatakan server
 * "kembali", supaya respons lama yang masih jalan tidak membuat banner berkedip.
 */
export function pingServer(): Promise<boolean> {
  pinging ??= fetch(new URL('/health', API_URL), { cache: 'no-store', signal: AbortSignal.timeout(5000) })
    .then((res) => res.ok)
    .catch(() => false)
    .then((online) => {
      reportServer(online);
      pinging = null;
      return online;
    });
  return pinging;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
}

// Success -> returns the contents of data from the envelope
// Failed -> throws ApiError with a message a non-technical user can act on
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    if (!navigator.onLine) throw new ApiError(OFFLINE_MESSAGE, 0);
    reportServer(false);
    throw new ApiError(SERVER_DOWN_MESSAGE, 0);
  }

  const payload = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (isServerUnreachable(res.status) && !payload) {
    reportServer(false);
    throw new ApiError(SERVER_DOWN_MESSAGE, res.status);
  }

  if (res.status === 401 && token) {
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  }

  if (!res.ok || !payload?.success) {
    // Pesan backend sudah berbahasa Indonesia untuk kesalahan pengguna (4xx); 5xx bisa teknis.
    let message = payload?.message;
    if (res.status === 429) message = TOO_MANY_MESSAGE;
    else if (res.status >= 500) message = SERVER_ERROR_MESSAGE;
    throw new ApiError(message || UNKNOWN_MESSAGE, res.status);
  }

  return payload.data as T;
}
