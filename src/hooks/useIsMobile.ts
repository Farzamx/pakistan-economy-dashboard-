"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(max-width: 767px)";

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mediaQuery = window.matchMedia(QUERY);
  mediaQuery.addEventListener("change", onChange);
  return () => mediaQuery.removeEventListener("change", onChange);
}

function getSnapshot(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(QUERY).matches;
}

// Same hydration-safety reasoning as useSafeReducedMotion: the server and
// the client's first render must agree, so both use this fixed snapshot;
// only after hydration does the live media-query value take over.
function getServerSnapshot(): boolean {
  return false;
}

/** Tracks the "(max-width: 767px)" breakpoint reactively — for layout decisions (e.g. Recharts props) that plain CSS/Tailwind classes can't reach because they're driven by JS props, not stylesheet rules. */
export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
