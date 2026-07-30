// Household Allocation — the Decision Support Lab's shared spending state
// (Phase 2). This is the concrete fix for "no duplicate inputs, everything
// reuses shared state": Budget Allocation and Personal Inflation both read
// and write THIS ONE store instead of each keeping its own copy of "how
// much do you spend on Food, Housing, Transport, ...". Allocate your
// budget once in either tool and the other picks it up automatically.
//
// Same localStorage + useSyncExternalStore pattern as economicIdentity.ts
// and localScenarios.ts, for the same reasons (SSR-safe, no
// react-hooks/set-state-in-effect anti-pattern). Keyed by the same 12
// official CPI_GROUPS (cpiGroups.ts) both tools already share.
"use client";

import { useSyncExternalStore } from "react";

export type AllocationMode = "percent" | "spending";

export interface HouseholdAllocationState {
  mode: AllocationMode;
  /** PKR ceiling — the % mode uses it only to derive PKR-equivalent display figures; spending mode treats it as the budget "remaining" is tracked against. */
  monthlyBudget: number;
  /** groupNo -> percent (mode "percent") or PKR amount (mode "spending"). */
  allocation: Record<number, number>;
}

export const DEFAULT_HOUSEHOLD_ALLOCATION: HouseholdAllocationState = {
  mode: "percent",
  monthlyBudget: 0,
  allocation: {},
};

const STORAGE_KEY = "peic-household-allocation";

let cache: HouseholdAllocationState = DEFAULT_HOUSEHOLD_ALLOCATION;
let cachedRaw: string | null = null;
const listeners = new Set<() => void>();

function readFromStorage(): HouseholdAllocationState {
  if (typeof window === "undefined") return cache;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cache;
  cachedRaw = raw;
  if (!raw) {
    cache = DEFAULT_HOUSEHOLD_ALLOCATION;
    return cache;
  }
  try {
    const parsed = JSON.parse(raw);
    cache = { ...DEFAULT_HOUSEHOLD_ALLOCATION, ...parsed, allocation: { ...(parsed.allocation ?? {}) } };
  } catch {
    cache = DEFAULT_HOUSEHOLD_ALLOCATION;
  }
  return cache;
}

function getServerSnapshot(): HouseholdAllocationState {
  return DEFAULT_HOUSEHOLD_ALLOCATION;
}

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

function persist(next: HouseholdAllocationState): void {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(next);
  window.localStorage.setItem(STORAGE_KEY, raw);
  cache = next;
  cachedRaw = raw;
  listeners.forEach((listener) => listener());
}

/** Reactive read of the shared household spending allocation — re-renders automatically after any of the setters below runs. */
export function useHouseholdAllocation(): HouseholdAllocationState {
  return useSyncExternalStore(subscribe, readFromStorage, getServerSnapshot);
}

export function setHouseholdAllocation(patch: Partial<HouseholdAllocationState>): void {
  persist({ ...readFromStorage(), ...patch });
}

/** Convenience for a single category edit — merges into the existing allocation map rather than replacing it. */
export function setAllocationValue(groupNo: number, value: number): void {
  const current = readFromStorage();
  persist({ ...current, allocation: { ...current.allocation, [groupNo]: value } });
}

/** Replaces the whole allocation map at once (e.g. loading a preset/saved profile) — mode and monthlyBudget are untouched unless also passed. */
export function replaceAllocation(allocation: Record<number, number>, mode?: AllocationMode): void {
  const current = readFromStorage();
  persist({ ...current, allocation, ...(mode ? { mode } : {}) });
}
