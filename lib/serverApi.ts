/**
 * Server-side API helper for use in Server Components.
 * Uses absolute URLs and reads auth from cookies.
 */
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

function getServerUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const cookieStore = await cookies();
  const token = cookieStore.get('agrivet_token')?.value;
  
  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      return { Authorization: `Bearer ${token}` };
    }
  }
  return {};
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getServerUrl();
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;
  
  const authHeaders = await getAuthHeaders();
  const headers: Record<string, string> = {
    ...authHeaders,
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers as Record<string, string> | undefined),
  };

  const response = await fetch(url, {
    ...options,
    headers,
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(errorData.error || `Request failed (${response.status})`);
  }

  if (response.status === 204) return {} as T;
  const text = await response.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export const serverApi = {
  get<T>(url: string): Promise<T> {
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