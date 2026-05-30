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

/**
 * Choose which access token to send.
 *
 *   - Parent surfaces (`/api/auth/*`, `/api/children`, `/api/templates`,
 *     `/api/assignments`, `/api/devices`): parent token if present.
 *   - Child surfaces (`/api/scheduling/calendar`, `/api/instances`): child
 *     token if present, else parent token (parent inspecting a kid's
 *     calendar).
 *   - Public surfaces (lookup, login, register, refresh, logout,
 *     use-reset): no Authorization header at all.
 */
function pickAuthHeader(path: string): Record<string, string> {
  const PUBLIC_PATHS = [
    '/api/auth/register',
    '/api/auth/login',
    '/api/auth/refresh',
    '/api/auth/logout',
    '/api/devices/lookup',
    '/api/devices/child-login',
    '/api/children/pin/use-reset',
  ];
  if (PUBLIC_PATHS.some((p) => path.startsWith(p))) return {};

  const { parentAccessToken, childAccessToken } = useAuthStore.getState();
  const CHILD_BIASED = ['/api/scheduling/', '/api/instances/'];
  if (CHILD_BIASED.some((p) => path.startsWith(p))) {
    const t = childAccessToken ?? parentAccessToken;
    return t ? { Authorization: `Bearer ${t}` } : {};
  }
  return parentAccessToken ? { Authorization: `Bearer ${parentAccessToken}` } : {};
}

async function request<T = unknown>(
  method: string,
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const { json, headers, ...rest } = init;
  const res = await fetch(`${env.VITE_API_BASE_URL}${path}`, {
    method,
    credentials: 'include',
    headers: {
      ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...pickAuthHeader(path),
      ...headers,
    },
    ...(json !== undefined ? { body: JSON.stringify(json) } : {}),
    ...rest,
  });

  const text = await res.text();
  const body: unknown = text ? safeJson(text) : undefined;

  if (!res.ok) {
    throw new ApiError(res.status, `HTTP ${res.status}`, body);
  }
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
  get: <T = unknown>(path: string) => request<T>('GET', path),
  post: <T = unknown>(path: string, json?: unknown) => request<T>('POST', path, { json }),
  put: <T = unknown>(path: string, json?: unknown) => request<T>('PUT', path, { json }),
  patch: <T = unknown>(path: string, json?: unknown) => request<T>('PATCH', path, { json }),
  delete: <T = unknown>(path: string) => request<T>('DELETE', path),
};

export { ApiError };
