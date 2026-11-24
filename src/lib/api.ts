/** Base URL of the SubTracker API, set at build time, e.g. EXPO_PUBLIC_API_URL=https://api.example.com */
const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export const accountsConfigured = API_URL.length > 0;

async function request<T>(path: string, opts: { method?: string; body?: unknown; token?: string } = {}): Promise<T> {
  if (!API_URL) throw new ApiError(0, 'not_configured', 'Accounts are not available in this build.');
  const headers: Record<string, string> = { accept: 'application/json' };
  if (opts.body !== undefined) headers['content-type'] = 'application/json';
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;

  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'network', 'Could not reach SubTracker. Check your connection and try again.');
  }

  if (res.status === 204) return undefined as T;
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, json.error ?? 'error', json.message ?? 'Something went wrong.');
  }
  return json as T;
}

export const api = {
  signup: (input: { email: string; password: string; name: string }) =>
    request<{ message: string }>('/auth/signup', { method: 'POST', body: input }),
  resend: (email: string) => request<{ message: string }>('/auth/resend', { method: 'POST', body: { email } }),
  login: (input: { email: string; password: string }) =>
    request<{ token: string; expiresAt: string }>('/auth/login', { method: 'POST', body: input }),
  me: (token: string) => request<{ id: string; name: string }>('/auth/me', { token }),
  logout: (token: string) => request<void>('/auth/logout', { method: 'POST', token }),
};
