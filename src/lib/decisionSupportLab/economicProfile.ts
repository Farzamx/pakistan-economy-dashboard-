// Unified Economic Profile — the Decision Support Lab's single source of
// truth (Phase 5.5), replacing economicIdentity.ts, incomeWealthState.ts
// and householdAllocation.ts (all three deleted in this same change).
// Every tool reads via useEconomicProfile() and writes via
// setEconomicProfile() — nothing is collected twice.
//
// Same useSyncExternalStore + localStorage-cache pattern as the three
// stores this replaces (SSR-safe, avoids the react-hooks/set-state-in-effect
// anti-pattern), extended with a Supabase-backed sync layer:
//
// - Tri-state (four, really) sync status on every snapshot: "guest" (no
//   authenticated user), "loading" (fetch in flight), "local-only" (fetch
//   failed, using the local cache as a best-effort fallback), "synced"
//   (the Supabase round-trip completed — either a real row was found, or
//   we've established none exists yet and legacy data was migrated or a
//   fresh default was adopted). Tools MUST gate "skip form, show results"
//   on status !== "loading" (ideally === "synced") — showing results
//   against a possibly-stale localStorage snapshot that then jumps to a
//   different number once Supabase resolves is worse than a brief skeleton.
// - Writes are optimistic (local cache + localStorage updated instantly)
//   then pushed onto a debounced (~600ms), strictly-ordered upsert queue —
//   never parallel/racing upserts to the same row.
// - A one-time legacy migration seeds the new profile from the 3 old
//   localStorage keys the first time a user with no server-side row is
//   seen, guarded by a flag set SYNCHRONOUSLY before the async upsert so a
//   second racing tab/mount can't double-seed.
"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  DEFAULT_ECONOMIC_PROFILE,
  getUserEconomicProfile,
  upsertUserEconomicProfile,
  saveProfileHistorySnapshot,
  type EconomicProfile,
  type HouseholdAllocationShape,
} from "@/lib/supabase/economicProfile";

export type { EconomicProfile, FilerStatus, Province, IncomeType, HousingStatus, RiskTolerance, Goal, GoalType, GoalPriority, GoalStatus, HouseholdAllocationShape } from "@/lib/supabase/economicProfile";
export { DEFAULT_ECONOMIC_PROFILE };

export type ProfileSyncStatus = "guest" | "loading" | "local-only" | "synced";

export interface EconomicProfileSnapshot {
  status: ProfileSyncStatus;
  profile: EconomicProfile;
}

/** The 5 fields that gate the base "skip form, show results" experience across most tools — deliberately minimal (see plan §4). Investment completion is tracked separately per-category, not folded in here. */
export const MANDATORY_FIELDS: (keyof EconomicProfile)[] = ["city", "monthlyIncome", "householdSize", "monthlySpending", "currentSavings"];

export function isMandatoryComplete(profile: EconomicProfile): boolean {
  return profile.city.trim() !== "" && profile.monthlyIncome > 0 && profile.householdSize > 0 && profile.monthlySpending > 0 && profile.currentSavings > 0;
}

/** profile.currentSalary and profile.monthlyIncome are deliberately distinct fields (salary-trajectory tools vs. household-capacity tools) — this is the one shared fallback every salary tool should use instead of re-deriving it, matching this codebase's `0`-means-unset convention (not `??`, since `0` is a valid falsy default, not `null`). */
export function getEffectiveSalary(profile: EconomicProfile): number {
  return profile.currentSalary > 0 ? profile.currentSalary : profile.monthlyIncome;
}

/** Same fallback pattern for household_allocation's own budget figure vs. the profile's canonical monthly_spending. */
export function getEffectiveMonthlyBudget(profile: EconomicProfile): number {
  return profile.householdAllocation.monthlyBudget > 0 ? profile.householdAllocation.monthlyBudget : profile.monthlySpending;
}

const STORAGE_KEY = "peic-economic-profile";
const MIGRATION_FLAG_KEY = "peic-profile-migrated";
const LEGACY_IDENTITY_KEY = "peic-economic-identity";
const LEGACY_INCOME_WEALTH_KEY = "peic-income-wealth-state";
const LEGACY_ALLOCATION_KEY = "peic-household-allocation";

let currentSnapshot: EconomicProfileSnapshot = { status: "guest", profile: DEFAULT_ECONOMIC_PROFILE };
const listeners = new Set<() => void>();
let fetchedForUserId: string | null = null;
let currentUserId: string | null = null;
let writeQueue: Partial<EconomicProfile> = {};
let writeTimer: ReturnType<typeof setTimeout> | null = null;
let writeChain: Promise<void> = Promise.resolve();
const writeListeners = new Set<() => void>();

function readLocalStorageProfile(): EconomicProfile {
  if (typeof window === "undefined") return DEFAULT_ECONOMIC_PROFILE;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_ECONOMIC_PROFILE;
  try {
    return { ...DEFAULT_ECONOMIC_PROFILE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_ECONOMIC_PROFILE;
  }
}

function writeLocalStorage(profile: EconomicProfile): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

function commit(profile: EconomicProfile, status: ProfileSyncStatus): void {
  currentSnapshot = { status, profile };
  listeners.forEach((listener) => listener());
}

function getSnapshot(): EconomicProfileSnapshot {
  return currentSnapshot;
}

// Phase M1 fix: a fresh object literal each call fails
// useSyncExternalStore's Object.is stability check (confirmed live via a
// Playwright pass) — must return the same reference every time.
const SERVER_SNAPSHOT: EconomicProfileSnapshot = { status: "guest", profile: DEFAULT_ECONOMIC_PROFILE };
function getServerSnapshot(): EconomicProfileSnapshot {
  return SERVER_SNAPSHOT;
}

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

function buildLegacySeed(): Partial<EconomicProfile> | null {
  if (typeof window === "undefined") return null;
  const identityRaw = window.localStorage.getItem(LEGACY_IDENTITY_KEY);
  const incomeWealthRaw = window.localStorage.getItem(LEGACY_INCOME_WEALTH_KEY);
  const allocationRaw = window.localStorage.getItem(LEGACY_ALLOCATION_KEY);
  if (!identityRaw && !incomeWealthRaw && !allocationRaw) return null;

  const patch: Partial<EconomicProfile> = {};
  if (identityRaw) {
    try {
      const identity = JSON.parse(identityRaw);
      if (identity.city) patch.city = identity.city;
      if (identity.monthlyIncome) patch.monthlyIncome = identity.monthlyIncome;
      if (identity.monthlySpending) patch.monthlySpending = identity.monthlySpending;
      if (identity.householdSize) patch.householdSize = identity.householdSize;
      if (identity.filerStatus) patch.filerStatus = identity.filerStatus;
    } catch {
      // ignore malformed legacy data — a partial or empty seed is fine
    }
  }
  if (incomeWealthRaw) {
    try {
      const iw = JSON.parse(incomeWealthRaw);
      if (iw.currentSalary) patch.currentSalary = iw.currentSalary;
      if (iw.lastRaisePct) patch.lastRaisePct = iw.lastRaisePct;
      if (iw.annualRaisePct) patch.expectedAnnualRaisePct = iw.annualRaisePct;
      if (iw.savingsAmount) patch.currentSavings = iw.savingsAmount;
    } catch {
      // ignore malformed legacy data
    }
  }
  if (allocationRaw) {
    try {
      const alloc = JSON.parse(allocationRaw);
      const shape: HouseholdAllocationShape = { mode: alloc.mode ?? "percent", monthlyBudget: alloc.monthlyBudget ?? 0, allocation: alloc.allocation ?? {} };
      patch.householdAllocation = shape;
    } catch {
      // ignore malformed legacy data
    }
  }
  return Object.keys(patch).length > 0 ? patch : null;
}

/** Runs at most once per browser (flag set synchronously before the async upsert) — seeds the new profile from the 3 legacy localStorage stores if the server has no row yet and any legacy data exists. Returns the seeded profile, or null if there was nothing to migrate. */
async function maybeMigrateLegacy(userId: string): Promise<EconomicProfile | null> {
  if (typeof window === "undefined") return null;
  if (window.localStorage.getItem(MIGRATION_FLAG_KEY) === "1") return null;
  window.localStorage.setItem(MIGRATION_FLAG_KEY, "1");
  const seed = buildLegacySeed();
  if (!seed) return null;
  try {
    return await upsertUserEconomicProfile(userId, seed);
  } catch {
    return null;
  }
}

async function syncFromSupabase(userId: string): Promise<void> {
  currentUserId = userId;
  commit(readLocalStorageProfile(), "loading");
  try {
    const remote = await getUserEconomicProfile();
    if (remote) {
      writeLocalStorage(remote);
      commit(remote, "synced");
      return;
    }
    const migrated = await maybeMigrateLegacy(userId);
    const resolved = migrated ?? readLocalStorageProfile();
    writeLocalStorage(resolved);
    commit(resolved, "synced");
  } catch {
    commit(readLocalStorageProfile(), "local-only");
  }
}

function maybeSetCompletion(next: EconomicProfile): EconomicProfile {
  if (!next.profileCompletedAt && isMandatoryComplete(next)) {
    return { ...next, profileCompletedAt: new Date().toISOString() };
  }
  return next;
}

function flushWrites(): void {
  writeTimer = null;
  if (!currentUserId || Object.keys(writeQueue).length === 0) return;
  const patchToSend = writeQueue;
  writeQueue = {};
  writeChain = writeChain
    .then(() => upsertUserEconomicProfile(currentUserId as string, patchToSend))
    .then(() => writeListeners.forEach((listener) => listener()))
    .catch(() => {
      // A failed background sync leaves the optimistic local write in
      // place — the next successful write (or the next mount's fetch)
      // reconciles it. Silently retrying here would risk out-of-order
      // upserts; surfacing an error to the user for a debounced
      // background save would be noisier than useful.
    });
}

/** Reactive read of the shared Economic Profile — re-renders automatically after setEconomicProfile() or once the Supabase fetch-on-mount resolves. */
export function useEconomicProfile(): EconomicProfileSnapshot {
  const { user, loading: authLoading } = useAuth();
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      currentUserId = null;
      commit(DEFAULT_ECONOMIC_PROFILE, "guest");
      return;
    }
    if (fetchedForUserId === user.id) return;
    fetchedForUserId = user.id;
    void syncFromSupabase(user.id);
  }, [user, authLoading]);

  return snapshot;
}

/** Merges `patch` into the profile (partial update). Updates the local cache instantly, then queues a debounced, serialized Supabase upsert. No-ops (aside from the local/optimistic update) for a guest — there is nothing to sync to. */
export function setEconomicProfile(patch: Partial<EconomicProfile>): void {
  const next = maybeSetCompletion({ ...currentSnapshot.profile, ...patch });
  const effectivePatch = next.profileCompletedAt !== currentSnapshot.profile.profileCompletedAt ? { ...patch, profileCompletedAt: next.profileCompletedAt } : patch;
  writeLocalStorage(next);
  commit(next, currentSnapshot.status === "guest" ? "guest" : currentSnapshot.status);
  if (!currentUserId) return;

  writeQueue = { ...writeQueue, ...effectivePatch };
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(flushWrites, 600);
}

export function setHouseholdAllocationValue(groupNo: number, value: number): void {
  const current = currentSnapshot.profile.householdAllocation;
  setEconomicProfile({ householdAllocation: { ...current, allocation: { ...current.allocation, [groupNo]: value } } });
}

export function replaceHouseholdAllocation(allocation: Record<number, number>, mode?: "percent" | "spending"): void {
  const current = currentSnapshot.profile.householdAllocation;
  setEconomicProfile({ householdAllocation: { ...current, allocation, ...(mode ? { mode } : {}) } });
}

export function setInvestmentAllocationValue(assetId: string, weightPct: number): void {
  const current = currentSnapshot.profile.investmentAllocation;
  setEconomicProfile({ investmentAllocation: { ...current, [assetId]: weightPct } });
}

export function replaceInvestmentAllocation(allocation: Record<string, number>): void {
  setEconomicProfile({ investmentAllocation: allocation });
}

/** Registers a listener that fires after every successful background sync (e.g. calculationCache.ts's cache invalidation, this file's own profile-history capture below) — a Set, not a single overwritable callback, so multiple independent modules can each hook in without clobbering one another. Avoids a two-way dependency: this store never imports the listener modules directly. */
export function onProfileWrite(callback: () => void): () => void {
  writeListeners.add(callback);
  return () => writeListeners.delete(callback);
}

let historyThrottleChecked = false;

/** Best-effort, throttled to at most once per UTC day (checked once per session) — called from setEconomicProfile's write-flush path once a real change has synced, not on every keystroke. */
async function maybeSaveProfileHistory(): Promise<void> {
  if (!currentUserId || historyThrottleChecked) return;
  historyThrottleChecked = true;
  const flagKey = `peic-profile-history-${new Date().toISOString().slice(0, 10)}`;
  if (typeof window !== "undefined" && window.localStorage.getItem(flagKey)) return;
  try {
    await saveProfileHistorySnapshot(currentUserId, currentSnapshot.profile);
    if (typeof window !== "undefined") window.localStorage.setItem(flagKey, "1");
  } catch {
    // best-effort only — profile history is a nice-to-have trend dataset, not core functionality
  }
}
onProfileWrite(() => void maybeSaveProfileHistory());
