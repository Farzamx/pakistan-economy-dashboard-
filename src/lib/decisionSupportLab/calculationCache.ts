// Shared calculation cache — a small, deliberately scoped memoization
// layer for the handful of pure computations that ~15 tool files each
// currently re-derive independently from the same server-fetched
// breakdown (computeOfficialCpiPct, computePersonalInflation, and
// similar). Wraps existing useMemo call sites; does not replace React's
// own memoization or attempt to cache every calculation in the Lab.
// Invalidated centrally — economicProfile.ts calls clearCalculationCache()
// on every write via onProfileWrite(), so no tool needs to remember to
// invalidate it itself.
import { onProfileWrite } from "@/lib/decisionSupportLab/economicProfile";

const cache = new Map<string, unknown>();

/** Returns the cached value for `key` if present, otherwise computes it with `fn`, caches it, and returns it. `fn` should be a pure function of the (already-in-scope) inputs baked into `key`. */
export function withCalculationCache<T>(key: string, fn: () => T): T {
  if (cache.has(key)) return cache.get(key) as T;
  const value = fn();
  cache.set(key, value);
  return value;
}

export function clearCalculationCache(): void {
  cache.clear();
}

onProfileWrite(clearCalculationCache);
