import { accessToken } from './access-token.js';
import { reportUnauthorized } from './session-expiry.js';

export function projectApi(projectSlug: string): string {
  return `/api/projects/${encodeURIComponent(projectSlug)}`;
}

export async function request<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(await authorization()),
      ...options?.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) {
    // A rejected or missing token is not something a screen can act on, so it
    // goes to the gate, which can offer a way back in. The error still throws
    // so the caller stops.
    if (res.status === 401) reportUnauthorized();
    throw new Error(data?.error ?? `リクエストに失敗しました (${res.status})`);
  }
  return data as T;
}

async function authorization(): Promise<Record<string, string>> {
  const token = await accessToken();
  return token ? { authorization: `Bearer ${token}` } : {};
}
