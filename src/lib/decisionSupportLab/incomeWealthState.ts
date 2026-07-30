// Income & Wealth Intelligence — shared salary/savings state (Phase 3).
// Same role as householdAllocation.ts one layer up: Salary Purchasing
// Power, Raise Reality Check, Salary Required, Future Salary Projection,
// Savings Erosion and the Health Score all read and write THIS ONE store
// instead of each collecting its own "what's your current salary" input —
// set it once in any tool, every other tool in this section picks it up
// automatically, per the brief's "users should never re-enter information."
//
// Same localStorage + useSyncExternalStore pattern as economicIdentity.ts
// and householdAllocation.ts, for the same SSR-safety reasons.
"use client";

import { useSyncExternalStore } from "react";

export interface IncomeWealthState {
  /** Current monthly (or however the visitor thinks of it) salary in PKR — the anchor value every salary tool reads. */
  currentSalary: number;
  /** The nominal % raise the visitor actually received most recently — Raise Reality Check's headline input. */
  lastRaisePct: number;
  /** Expected/assumed future annual raise % — Future Salary Projection's growth assumption. */
  annualRaisePct: number;
  /** Idle savings amount in PKR — Savings Erosion's principal. */
  savingsAmount: number;
  /** Projection horizon in years, shared by Future Salary Projection and Savings Erosion. */
  projectionYears: number;
}

export const DEFAULT_INCOME_WEALTH_STATE: IncomeWealthState = {
  currentSalary: 0,
  lastRaisePct: 0,
  annualRaisePct: 0,
  savingsAmount: 0,
  projectionYears: 5,
};

const STORAGE_KEY = "peic-income-wealth-state";

let cache: IncomeWealthState = DEFAULT_INCOME_WEALTH_STATE;
let cachedRaw: string | null = null;
const listeners = new Set<() => void>();

function readFromStorage(): IncomeWealthState {
  if (typeof window === "undefined") return cache;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cache;
  cachedRaw = raw;
  if (!raw) {
    cache = DEFAULT_INCOME_WEALTH_STATE;
    return cache;
  }
  try {
    const parsed = JSON.parse(raw);
    cache = { ...DEFAULT_INCOME_WEALTH_STATE, ...parsed };
  } catch {
    cache = DEFAULT_INCOME_WEALTH_STATE;
  }
  return cache;
}

function getServerSnapshot(): IncomeWealthState {
  return DEFAULT_INCOME_WEALTH_STATE;
}

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

function persist(next: IncomeWealthState): void {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(next);
  window.localStorage.setItem(STORAGE_KEY, raw);
  cache = next;
  cachedRaw = raw;
  listeners.forEach((listener) => listener());
}

/** Reactive read of the shared Income & Wealth state — re-renders automatically after setIncomeWealthState(). */
export function useIncomeWealthState(): IncomeWealthState {
  return useSyncExternalStore(subscribe, readFromStorage, getServerSnapshot);
}

/** Merges `patch` into the stored state (partial update — callers only pass the fields their form actually edited). */
export function setIncomeWealthState(patch: Partial<IncomeWealthState>): void {
  persist({ ...readFromStorage(), ...patch });
}
