// Generic in-memory TTL cache, shared by the assistant route (search results,
// market-data fallbacks) and the translate route (Roman Urdu translations).
//
// Process-local and resets on redeploy/cold-start — that's fine here, it
// exists purely to absorb repeat requests and provide a stale fallback when
// a live call (Tavily search, OpenRouter) fails or times out, not as a
// durable data store.

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const store = new Map<string, CacheEntry<unknown>>();

/** Returns the cached value only if it's within `ttlMs`; otherwise null (expired or missing). */
export function getFresh<T>(key: string, ttlMs: number): { data: T; ageMs: number } | null {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  const ageMs = Date.now() - entry.timestamp;
  if (ageMs > ttlMs) return null;
  return { data: entry.data, ageMs };
}

/** Returns the cached value regardless of age — used as a last-resort fallback when a live call fails. */
export function getStale<T>(key: string): { data: T; ageMs: number } | null {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  return { data: entry.data, ageMs: Date.now() - entry.timestamp };
}

export function setCache<T>(key: string, data: T): void {
  store.set(key, { data, timestamp: Date.now() });
}
