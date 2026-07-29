// Economic Identity — the Decision Support Lab's shared user profile.
// Every current and future tool (Personal Inflation, Purchasing Power,
// Salary Purchasing Power, Budget Allocation, ...) reads from the SAME
// profile instead of each collecting its own copy of "how much do you
// spend a month" — set it once on the Lab landing page, and any tool that
// wants a sensible default (e.g. Personal Inflation Calculator's Monthly
// Spending field) reads it via useEconomicIdentity().
//
// localStorage-only for now, same scope decision as localScenarios.ts and
// the same reasoning: keeps this phase's schema-change surface at zero.
// Cross-device sync via user_preferences is a natural, isolated future
// extension — swapping the storage backend here wouldn't require any
// consuming tool to change, since they only ever see the hook's return
// value.
//
// Reactive via useSyncExternalStore (not useState+useEffect) for the same
// reason localScenarios.ts uses it: reading localStorage inside an effect
// and calling setState synchronously trips this repo's
// react-hooks/set-state-in-effect rule and is a genuine extra-render
// anti-pattern, not just a lint nag.
"use client";

import { useSyncExternalStore } from "react";

export type FilerStatus = "filer" | "non-filer" | "unknown";

export interface EconomicIdentity {
  city: string;
  monthlyIncome: number;
  monthlySpending: number;
  householdSize: number;
  filerStatus: FilerStatus;
  /** Only PKR today — kept as a field (not hardcoded inline) so a future multi-currency tool doesn't need a schema change, only a wider union here. */
  preferredCurrency: "PKR";
}

export const DEFAULT_ECONOMIC_IDENTITY: EconomicIdentity = {
  city: "",
  monthlyIncome: 0,
  monthlySpending: 0,
  householdSize: 1,
  filerStatus: "unknown",
  preferredCurrency: "PKR",
};

const STORAGE_KEY = "peic-economic-identity";

let cache: EconomicIdentity = DEFAULT_ECONOMIC_IDENTITY;
let cachedRaw: string | null = null;
const listeners = new Set<() => void>();

function readFromStorage(): EconomicIdentity {
  if (typeof window === "undefined") return cache;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cache;
  cachedRaw = raw;
  if (!raw) {
    cache = DEFAULT_ECONOMIC_IDENTITY;
    return cache;
  }
  try {
    const parsed = JSON.parse(raw);
    cache = { ...DEFAULT_ECONOMIC_IDENTITY, ...parsed };
  } catch {
    cache = DEFAULT_ECONOMIC_IDENTITY;
  }
  return cache;
}

function getServerSnapshot(): EconomicIdentity {
  return DEFAULT_ECONOMIC_IDENTITY;
}

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

/** Reactive read of the shared Economic Identity — re-renders automatically after setEconomicIdentity(). */
export function useEconomicIdentity(): EconomicIdentity {
  return useSyncExternalStore(subscribe, readFromStorage, getServerSnapshot);
}

/** Merges `patch` into the stored identity (partial update — callers only pass the fields their form actually edited). */
export function setEconomicIdentity(patch: Partial<EconomicIdentity>): void {
  if (typeof window === "undefined") return;
  const next = { ...readFromStorage(), ...patch };
  const raw = JSON.stringify(next);
  window.localStorage.setItem(STORAGE_KEY, raw);
  cache = next;
  cachedRaw = raw;
  listeners.forEach((listener) => listener());
}

/** True once the visitor has set at least one real field — used to decide whether to show a "set up your profile" prompt vs. the filled-in summary. */
export function hasEconomicIdentity(identity: EconomicIdentity): boolean {
  return identity.city.trim() !== "" || identity.monthlyIncome > 0 || identity.monthlySpending > 0;
}
