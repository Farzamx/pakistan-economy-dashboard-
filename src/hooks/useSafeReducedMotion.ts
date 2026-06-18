"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

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

// Used for the server render AND the client's first hydration render —
// both must return the same value so there is nothing to mismatch.
function getServerSnapshot(): boolean {
  return false;
}

/**
 * Hydration-safe replacement for framer-motion's useReducedMotion().
 *
 * framer-motion's hook reads window.matchMedia synchronously during a
 * component's very first render (not inside an effect). On the server
 * there is no window, so it returns null; on the client's first hydration
 * render window already exists, so it returns a real boolean immediately.
 * For any user with OS-level "reduce motion" enabled, the server renders
 * based on a falsy `null` while the client's first render gets `true` — a
 * real hydration mismatch wherever the value drives rendered markup,
 * classNames, or inline styles.
 *
 * useSyncExternalStore is React's own primitive for exactly this class of
 * problem: it takes a separate `getServerSnapshot` that's used for both the
 * server render and the client's first render (guaranteeing they match),
 * then switches to the live `getSnapshot` only after hydration has
 * committed — and, as a bonus over a one-time mount effect, it also reacts
 * live if the user changes their OS-level preference while the page is open.
 */
export function useSafeReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
