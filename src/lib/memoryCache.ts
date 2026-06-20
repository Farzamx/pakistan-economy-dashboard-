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

// In-flight request coalescing ("singleflight"). A TTL cache alone only
// catches *sequential* repeat calls — it can't help with calls that arrive
// concurrently (e.g. Promise.all over several comparisons that each need
// the same underlying series), since they all check the cache before any
// of them has resolved and populated it. This tracks promises that are
// still pending so concurrent callers for the same key share one
// in-flight request instead of each starting their own.
const inFlight = new Map<string, Promise<unknown>>();

/**
 * Runs `fn()` for `key`, but if a call for the same `key` is already in
 * flight, returns that same promise instead of starting a second one.
 * Pair with getFresh/setCache for full dedup: check getFresh first (catches
 * sequential repeats within the TTL), then wrap the actual fetch in
 * dedupeInFlight (catches concurrent repeats while the first is pending).
 */
export function dedupeInFlight<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inFlight.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const promise = fn().finally(() => {
    inFlight.delete(key);
  });
  inFlight.set(key, promise);
  return promise;
}
