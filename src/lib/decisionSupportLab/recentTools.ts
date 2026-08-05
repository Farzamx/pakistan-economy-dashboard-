"use client";

// Recently-used tools (Section C4) — localStorage-only, ephemeral UI
// convenience, deliberately not part of the Economic Profile schema (same
// call the Phase 5.5 plan already made for this exact concept). Read via
// useSyncExternalStore (SSR-safe, matches economicProfile.ts's own
// pattern) rather than useEffect+useState, which this codebase avoids —
// a fresh JSON.parse on every read would otherwise return a new array
// reference each call and defeat useSyncExternalStore's stability check,
// so the parsed value is cached and only re-parsed when the raw string
// actually changes.
import { useSyncExternalStore } from "react";

const STORAGE_KEY = "peic-recent-tools";
const MAX_ENTRIES = 6;

const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedIds: string[] = [];

function parseIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function getRecentToolIds(): string[] {
  if (typeof window === "undefined") return cachedIds;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedIds = parseIds(raw);
  }
  return cachedIds;
}

export function recordToolVisit(toolId: string): void {
  if (typeof window === "undefined") return;
  const next = [toolId, ...getRecentToolIds().filter((id) => id !== toolId)].slice(0, MAX_ENTRIES);
  cachedRaw = JSON.stringify(next);
  cachedIds = next;
  window.localStorage.setItem(STORAGE_KEY, cachedRaw);
  listeners.forEach((listener) => listener());
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

// Phase M1 fix: a fresh [] literal each call fails useSyncExternalStore's
// Object.is stability check (confirmed live via a Playwright pass) — must
// return the same reference every time.
const SERVER_SNAPSHOT: string[] = [];
function getServerSnapshot(): string[] {
  return SERVER_SNAPSHOT;
}

export function useRecentToolIds(): string[] {
  return useSyncExternalStore(subscribe, getRecentToolIds, getServerSnapshot);
}
