import { env } from './env';

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
