// Scenario Profiles — a session-wide layer ABOVE WhatIfToggle, not a
// replacement for it. WhatIfToggle stays tool-local (one field, one
// comparison, fully ephemeral). Scenario Profiles are named, switchable
// overlays across the WHOLE profile at once — "Optimistic," "High
// Inflation," "Career Change," "Retirement" — so a user can see how every
// wired tool's results change under a hypothetical, without ever writing
// to their real Economic Profile. Persistence is localStorage-only in
// this phase (not a new Supabase table) — "saved" means named and kept in
// the browser, explicitly separate from the synced profile.
"use client";

import { useSyncExternalStore } from "react";
import type { EconomicProfile } from "@/lib/decisionSupportLab/economicProfile";

export interface ScenarioProfile {
  id: string;
  name: string;
  fieldOverrides: Partial<EconomicProfile>;
}

// Five starter presets. Deltas are deliberately small, documented,
// illustrative adjustments — not predictions — same spirit as the
// Investment Scenario Simulator's fixed scenario deltas.
export const STARTER_SCENARIOS: ScenarioProfile[] = [
  { id: "current-reality", name: "Current Reality", fieldOverrides: {} },
  {
    id: "optimistic",
    name: "Optimistic",
    fieldOverrides: { expectedAnnualRaisePct: 12 },
  },
  {
    id: "high-inflation",
    name: "High Inflation",
    fieldOverrides: {},
  },
  {
    id: "career-change",
    name: "Career Change",
    fieldOverrides: { currentSalary: 0, incomeType: "freelance" },
  },
  {
    id: "retirement",
    name: "Retirement",
    fieldOverrides: { currentSalary: 0, monthlyIncome: 0, expectedAnnualRaisePct: 0 },
  },
];

interface ScenarioProfilesState {
  activeScenarioId: string | null;
  scenarios: ScenarioProfile[];
}

const STORAGE_KEY = "peic-scenario-profiles";
const DEFAULT_STATE: ScenarioProfilesState = { activeScenarioId: null, scenarios: STARTER_SCENARIOS };

let cache: ScenarioProfilesState = DEFAULT_STATE;
let cachedRaw: string | null = null;
const listeners = new Set<() => void>();

function readFromStorage(): ScenarioProfilesState {
  if (typeof window === "undefined") return cache;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cache;
  cachedRaw = raw;
  if (!raw) {
    cache = DEFAULT_STATE;
    return cache;
  }
  try {
    const parsed = JSON.parse(raw);
    const customScenarios: ScenarioProfile[] = Array.isArray(parsed.customScenarios) ? parsed.customScenarios : [];
    cache = { activeScenarioId: parsed.activeScenarioId ?? null, scenarios: [...STARTER_SCENARIOS, ...customScenarios] };
  } catch {
    cache = DEFAULT_STATE;
  }
  return cache;
}

function getServerSnapshot(): ScenarioProfilesState {
  return DEFAULT_STATE;
}

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

function persist(next: ScenarioProfilesState): void {
  if (typeof window === "undefined") return;
  const customScenarios = next.scenarios.filter((s) => !STARTER_SCENARIOS.some((starter) => starter.id === s.id));
  const raw = JSON.stringify({ activeScenarioId: next.activeScenarioId, customScenarios });
  window.localStorage.setItem(STORAGE_KEY, raw);
  cache = next;
  cachedRaw = raw;
  listeners.forEach((listener) => listener());
}

export function useScenarioProfiles(): ScenarioProfilesState {
  return useSyncExternalStore(subscribe, readFromStorage, getServerSnapshot);
}

export function setActiveScenario(scenarioId: string | null): void {
  persist({ ...readFromStorage(), activeScenarioId: scenarioId });
}

/** Names and persists the CURRENT profile's deltas as a new reusable scenario — explicitly separate from the real profile, per the "single source of truth" rule: this never writes back to setEconomicProfile(). */
export function saveCustomScenario(name: string, fieldOverrides: Partial<EconomicProfile>): void {
  const current = readFromStorage();
  const id = `custom-${Date.now()}`;
  persist({ ...current, scenarios: [...current.scenarios, { id, name, fieldOverrides }] });
}

export function deleteCustomScenario(scenarioId: string): void {
  const current = readFromStorage();
  persist({
    activeScenarioId: current.activeScenarioId === scenarioId ? null : current.activeScenarioId,
    scenarios: current.scenarios.filter((s) => s.id !== scenarioId),
  });
}

/** The one shared merge — used everywhere a tool currently reads useEconomicProfile(), never reimplemented per tool. Returns `profile` unchanged when no scenario is active or "Current Reality" is selected. */
export function getEffectiveProfile(profile: EconomicProfile, activeScenario: ScenarioProfile | null): EconomicProfile {
  if (!activeScenario || Object.keys(activeScenario.fieldOverrides).length === 0) return profile;
  return { ...profile, ...activeScenario.fieldOverrides };
}
