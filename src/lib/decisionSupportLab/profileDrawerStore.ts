"use client";

// A single global open/close flag for ProfileCompletionDrawer.tsx, mounted
// once in the decision-support-lab layout so any tool page can open it —
// e.g. from a ConfidenceBadge's "Incomplete profile" chip — without prop
// drilling. Same useSyncExternalStore pattern as economicProfile.ts.
import { useSyncExternalStore } from "react";

interface DrawerState {
  open: boolean;
  highlightFieldId: string | null;
}

let state: DrawerState = { open: false, highlightFieldId: null };
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function openProfileDrawer(highlightFieldId?: string): void {
  state = { open: true, highlightFieldId: highlightFieldId ?? null };
  emit();
}

export function closeProfileDrawer(): void {
  state = { open: false, highlightFieldId: null };
  emit();
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function getSnapshot(): DrawerState {
  return state;
}

// Phase M1 fix: must return the SAME reference every call — a fresh
// object literal here fails useSyncExternalStore's Object.is stability
// check and produces a real "getServerSnapshot should be cached" console
// warning on every page (confirmed live via a Playwright pass), since
// ProfileCompletionDrawer mounts in the root layout on every route.
const SERVER_SNAPSHOT: DrawerState = { open: false, highlightFieldId: null };
function getServerSnapshot(): DrawerState {
  return SERVER_SNAPSHOT;
}

export function useProfileDrawer(): DrawerState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
