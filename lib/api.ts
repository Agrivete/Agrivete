/**
 * Client-side API helper.
 * Sends the httpOnly cookie (credentials: 'include') and falls back
 * to a Bearer token from localStorage when present.
 *
 * `api.get(url, { cache: true })` consults an in-memory TTL cache
 * (lib/apiCache.ts) before hitting the network. Use for per-user
 * read-only endpoints where a 60–300 s freshness window is acceptable.
 */

import { getCached, setCached } from './apiCache';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers as Record<string, string> | undefined),
  };

  const response = await fetch(endpoint, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(errorData.error || `Request failed (${response.status})`);
  }

  // 204 or empty body
  if (response.status === 204) return {} as T;
  const text = await response.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export const api = {
  get<T>(url: string, opts?: { cache?: boolean }): Promise<T> {
    if (opts?.cache && typeof window !== 'undefined') {
      const hit = getCached<T>(url);
      if (hit !== null) return Promise.resolve(hit);
      return request<T>(url).then((data) => {
        setCached(url, data);
        return data;
      });
    }
    return request<T>(url);
  },
  post<T>(url: string, data?: unknown): Promise<T> {
    return request<T>(url, { method: 'POST', body: data !== undefined ? JSON.stringify(data) : undefined });
  },
  put<T>(url: string, data?: unknown): Promise<T> {
    return request<T>(url, { method: 'PUT', body: data !== undefined ? JSON.stringify(data) : undefined });
  },
  patch<T>(url: string, data?: unknown): Promise<T> {
    return request<T>(url, { method: 'PATCH', body: data !== undefined ? JSON.stringify(data) : undefined });
  },
  delete<T>(url: string): Promise<T> {
    return request<T>(url, { method: 'DELETE' });
  },
};

export default api;
