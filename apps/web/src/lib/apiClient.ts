import { env } from './env';
import { useAuthStore } from '@/features/auth/store';

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestInitX extends RequestInit {
  json?: unknown;
  /** Skip the Authorization header for this call. */
  anonymous?: boolean;
}

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const res = await fetch(`${env.VITE_API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { accessToken: string; expiresAt: string };
    useAuthStore.getState().setToken(body.accessToken, body.expiresAt);
    return body.accessToken;
  })();
  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

async function performRequest(
  method: string,
  path: string,
  init: RequestInitX,
  token: string | null,
): Promise<Response> {
  const { json, anonymous: _anonymous, headers, ...rest } = init;
  return fetch(`${env.VITE_API_BASE_URL}${path}`, {
    method,
    credentials: 'include',
    headers: {
      ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(json !== undefined ? { body: JSON.stringify(json) } : {}),
    ...rest,
  });
}

async function request<T = unknown>(
  method: string,
  path: string,
  init: RequestInitX = {},
): Promise<T> {
  const initialToken = init.anonymous ? null : useAuthStore.getState().accessToken;

  let res = await performRequest(method, path, init, initialToken);

  // One automatic refresh-and-retry on 401, except on the refresh endpoint
  // itself and except for explicitly anonymous calls.
  if (res.status === 401 && !init.anonymous && path !== '/api/auth/refresh') {
    const newToken = await refreshAccessToken();
    if (newToken) {
      res = await performRequest(method, path, init, newToken);
    } else {
      useAuthStore.getState().clear();
    }
  }

  const text = await res.text();
  const body: unknown = text ? safeJson(text) : undefined;

  if (!res.ok) throw new ApiError(res.status, `HTTP ${res.status}`, body);
  return body as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export const apiClient = {
  get: <T = unknown>(path: string, init?: RequestInitX) => request<T>('GET', path, init),
  post: <T = unknown>(path: string, json?: unknown, init?: RequestInitX) =>
    request<T>('POST', path, { ...(init ?? {}), json }),
  put: <T = unknown>(path: string, json?: unknown, init?: RequestInitX) =>
    request<T>('PUT', path, { ...(init ?? {}), json }),
  patch: <T = unknown>(path: string, json?: unknown, init?: RequestInitX) =>
    request<T>('PATCH', path, { ...(init ?? {}), json }),
  delete: <T = unknown>(path: string, init?: RequestInitX) => request<T>('DELETE', path, init),
};

export { ApiError };
