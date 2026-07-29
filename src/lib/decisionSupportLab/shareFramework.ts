// Decision Support Lab — shared sharing framework. Every tool's "Share
// your result" section (X, LinkedIn, WhatsApp, Copy Link, native device
// share) builds its message through buildShareMessage() and dispatches
// through these functions, instead of each tool re-implementing its own
// twitter.com/intent URL. Extracted from the Personal Inflation
// Calculator's original ShareCard.tsx, generalized so a result summary
// string is the only per-tool input.
"use client";

import { useSyncExternalStore } from "react";

export interface ShareMessageInput {
  /** A complete, human-readable sentence describing the result, e.g. "My personal inflation rate is 11.3% — 0.3pp higher than the official CPI of 11.0%." */
  summary: string;
  /** Defaults to a generic call-to-action; pass a tool-specific one if it reads better. */
  cta?: string;
}

export function buildShareMessage({ summary, cta = "Calculate yours:" }: ShareMessageInput): string {
  return `${summary} ${cta}`;
}

export function shareToX(message: string, url: string): void {
  const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(url)}`;
  window.open(shareUrl, "_blank", "noopener,noreferrer");
}

export function shareToLinkedIn(url: string): void {
  const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
  window.open(shareUrl, "_blank", "noopener,noreferrer");
}

export function shareToWhatsApp(message: string, url: string): void {
  const shareUrl = `https://wa.me/?text=${encodeURIComponent(`${message} ${url}`)}`;
  window.open(shareUrl, "_blank", "noopener,noreferrer");
}

export async function copyShareLink(url: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    // Clipboard API unavailable (older browser / permissions denied) — the
    // caller shows no change rather than a fabricated success state.
    return false;
  }
}

function nativeShareSnapshot(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}
function nativeShareServerSnapshot(): boolean {
  return false;
}
function noopSubscribe(): () => void {
  return () => {};
}

/**
 * Feature-detects the Web Share API reactively — most desktop browsers
 * don't implement it, so callers should only render a "Share" button when
 * this is true. Routed through useSyncExternalStore (server snapshot
 * always false, matching useIsMobile.ts's pattern) rather than a plain
 * function call in render, since navigator.share's presence differs
 * between the server (never present) and the client — calling it directly
 * during render would be a hydration mismatch.
 */
export function useCanNativeShare(): boolean {
  return useSyncExternalStore(noopSubscribe, nativeShareSnapshot, nativeShareServerSnapshot);
}

export async function nativeShare(input: { title: string; text: string; url: string }): Promise<boolean> {
  if (!nativeShareSnapshot()) return false;
  try {
    await navigator.share(input);
    return true;
  } catch {
    // Includes the user simply cancelling the native share sheet — not a
    // real error, so no error state is surfaced for it either.
    return false;
  }
}
