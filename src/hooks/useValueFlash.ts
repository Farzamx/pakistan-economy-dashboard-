"use client";

import { useEffect, useState } from "react";
import { useSafeReducedMotion } from "@/hooks/useSafeReducedMotion";

const FLASH_DURATION_MS = 1600;
const STORAGE_PREFIX = "peic-value-last:";

/**
 * v4 Phase 3 "live data feel": flashes once, green or red, when `value` has
 * genuinely changed since this browser last saw it under this same `key` —
 * never on a visitor's first-ever view (nothing to compare against yet, so
 * no flash), never looping, never firing on a value that hasn't actually
 * moved. Comparing against localStorage (rather than, say, a websocket) is
 * the honest mechanism available here: this dashboard is server-rendered
 * with ISR, so "new data arrived" in practice means "this browser's last
 * render of this card had a different number" — exactly what
 * changed-since-last-seen captures, with no fabricated real-time channel
 * pretending otherwise.
 *
 * Extracted as a shared hook (rather than living inside one card component)
 * because more than one component renders a KPI value — KpiCard and
 * MacroSnapshot's Tier1Cell both need the identical behavior, and a second
 * hand-copy would be exactly the kind of duplication this codebase's own
 * conventions avoid elsewhere (see canonicalObsCacheKey, computeLsmYoY from
 * the data-pipeline hardening pass for the same principle applied there).
 *
 * @param key       Unique identity for this value series (e.g. the KPI title).
 * @param value     The current display value, as a string.
 * @param direction "down" flashes red; anything else (including "up" or
 *                  "neutral") flashes green — matches this app's existing
 *                  TREND_TEXT_COLOR convention where only "down" is adverse.
 */
export function useValueFlash(key: string, value: string, direction: "up" | "down" | "neutral"): "up" | "down" | null {
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const prefersReducedMotion = useSafeReducedMotion();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storageKey = `${STORAGE_PREFIX}${key}`;
    const previous = window.localStorage.getItem(storageKey);
    window.localStorage.setItem(storageKey, value);
    if (previous === null || previous === value || prefersReducedMotion) return;

    // Both setState calls happen inside a timer callback, never synchronously
    // in the effect body — same convention as this codebase's other effects
    // that defer into a .then()/.catch()/.finally() boundary (see
    // PreferencesProvider.tsx), just with a timer as the boundary since
    // there's no async work here.
    const onTimer = window.setTimeout(() => setFlash(direction === "down" ? "down" : "up"), 0);
    const offTimer = window.setTimeout(() => setFlash(null), FLASH_DURATION_MS);
    return () => {
      window.clearTimeout(onTimer);
      window.clearTimeout(offTimer);
    };
  }, [key, value, direction, prefersReducedMotion]);

  return flash;
}

/** Tailwind classes for the flash — apply to a wrapper around the value. */
export function valueFlashClass(flash: "up" | "down" | null): string {
  return flash === "up" ? "value-flash-up" : flash === "down" ? "value-flash-down" : "";
}
