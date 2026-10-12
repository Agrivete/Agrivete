/**
 * Client-side in-memory cache for read-only (GET) endpoints.
 *
 * Substitutes for server-side `unstable_cache`: BFF routes are
 * authenticated and per-role-filtered, so revalidation cannot be
 * forced per-user through URL-keyed rewrites. Client-side TTL
 * keyed by full URL is the safe, equivalent mechanism.
 *
 * Used only by `api.get(..., { cache: true })` — opt-in per call.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

/** Per-endpoint TTL in milliseconds. TTL of 0 means no caching. */
export const CACHE_TTLS: Record<string, number> = {
  '/api/dashboard': 60_000, // 60 s — KPIs change often
  '/api/alerts': 60_000, // 60 s — low-stock / expiring lists
  '/api/products': 300_000, // 5 min — catalog changes rarely
};

export function getCached<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCached<T>(key: string, data: T, ttlMs?: number): void {
  if (typeof window === 'undefined') return;
  const ttl = ttlMs ?? CACHE_TTLS[key] ?? 0;
  if (ttl <= 0) return;
  store.set(key, { data, expiresAt: Date.now() + ttl });
}
