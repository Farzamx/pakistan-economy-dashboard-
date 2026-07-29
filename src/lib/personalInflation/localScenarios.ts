// Custom household-spending profiles the user saves from the Personal
// Inflation Calculator. Deliberately localStorage-only for this pass (not a
// new user_preferences JSONB column) — keeps this feature's schema-change
// surface to the one cpi_category_breakdown migration. A natural future
// extension is syncing these to user_preferences for signed-in users across
// devices; not implemented here.
//
// Exposed via useSyncExternalStore (same idiom as useIsMobile/
// useSafeReducedMotion) rather than a useState+useEffect mount read — reading
// localStorage inside an effect and calling setState synchronously is
// flagged by this repo's react-hooks/set-state-in-effect rule (and is a real
// extra-render anti-pattern, not just a lint nag). useSyncExternalStore is
// the mechanism React designed specifically for "external mutable store,
// safe under SSR" and needs no effect at all.
"use client";

import { useSyncExternalStore } from "react";

export interface SavedScenario {
  id: string;
  name: string;
  mode: "percent" | "spending";
  /** groupNo -> percent (mode "percent") or PKR amount (mode "spending"). */
  allocation: Record<number, number>;
  savedAt: string;
}

const STORAGE_KEY = "peic-personal-inflation-scenarios";

let cache: SavedScenario[] = [];
let cachedRaw: string | null = null;
const listeners = new Set<() => void>();

function readFromStorage(): SavedScenario[] {
  if (typeof window === "undefined") return cache;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  // Only re-parse (and hand out a new array reference) when the underlying
  // string actually changed — useSyncExternalStore re-renders on every
  // snapshot identity change, so a fresh array on every call would loop.
  if (raw === cachedRaw) return cache;
  cachedRaw = raw;
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed) ? parsed : [];
  } catch {
    cache = [];
  }
  return cache;
}

function writeAll(scenarios: SavedScenario[]): void {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(scenarios);
  window.localStorage.setItem(STORAGE_KEY, raw);
  cache = scenarios;
  cachedRaw = raw;
  listeners.forEach((listener) => listener());
}

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

// Must be a single stable reference — a fresh [] on every call would fail
// useSyncExternalStore's "getServerSnapshot must be cached" invariant and
// loop.
const EMPTY: SavedScenario[] = [];
function getServerSnapshot(): SavedScenario[] {
  return EMPTY;
}

/** Reactive read of every saved profile — re-renders automatically after saveScenario()/deleteScenario(). */
export function useSavedScenarios(): SavedScenario[] {
  return useSyncExternalStore(subscribe, readFromStorage, getServerSnapshot);
}

export function saveScenario(name: string, mode: "percent" | "spending", allocation: Record<number, number>): void {
  const entry: SavedScenario = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim() || "Untitled profile",
    mode,
    allocation,
    savedAt: new Date().toISOString(),
  };
  writeAll([...readFromStorage(), entry]);
}

export function deleteScenario(id: string): void {
  writeAll(readFromStorage().filter((s) => s.id !== id));
}
