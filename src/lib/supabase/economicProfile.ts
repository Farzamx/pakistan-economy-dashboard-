"use client";

// CRUD layer for user_economic_profile (supabase/migrations/0045_user_economic_profile.sql)
// and profile_history (0047_profile_history.sql). Mirrors preferences.ts
// exactly: browser client, RLS (auth.uid() = user_id) is the real
// protection, every write goes straight to Supabase. This is the lower
// layer — src/lib/decisionSupportLab/economicProfile.ts (the reactive
// client store every tool actually consumes) imports the type and these
// functions from here, never the other way around, so there's no import
// cycle between the two "economicProfile.ts" files.

import { createClient } from "@/lib/supabase/client";

export type FilerStatus = "filer" | "non-filer" | "unknown";
export type Province = "punjab" | "sindh" | "kp" | "balochistan";
export type IncomeType = "salaried" | "business" | "freelance" | "mixed";
export type HousingStatus = "own" | "rent" | "family";
export type RiskTolerance = "conservative" | "moderate" | "aggressive";

export interface HouseholdAllocationShape {
  mode: "percent" | "spending";
  monthlyBudget: number;
  allocation: Record<number, number>;
}

// Phase 6 — Financial Planning Intelligence. Widened from the original
// { id, name, targetAmount, targetYear } shape (never populated by any UI —
// confirmed via a full-repo grep before this change: every real profile has
// goals: [], so there is no existing data to migrate). Still stored in the
// same `goals` jsonb column (migration 0045) — no schema migration needed.
export type GoalType = "retirement" | "fire" | "emergency-fund" | "wealth-accumulation" | "education" | "child-education" | "home-purchase" | "hajj-umrah" | "custom";
export type GoalPriority = "high" | "medium" | "low";
export type GoalStatus = "active" | "achieved" | "paused";

export interface Goal {
  id: string;
  name: string;
  goalType: GoalType;
  /** Target amount in today's PKR — inflated to a future value by goalEngine.ts, never stored pre-inflated. */
  targetAmountToday: number;
  /** ISO "YYYY-MM-DD". */
  targetDate: string;
  /** Savings already earmarked for this specific goal — distinct from the profile's general currentSavings. */
  currentSavingsForGoal: number;
  monthlyContribution: number;
  /** Nominal annual %. */
  expectedReturnPct: number;
  priority: GoalPriority;
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
}

export interface EconomicProfile {
  schemaVersion: number;
  city: string;
  province: Province | null;
  filerStatus: FilerStatus;
  monthlyIncome: number;
  incomeType: IncomeType | null;
  currentSalary: number;
  lastRaisePct: number;
  expectedAnnualRaisePct: number;
  householdSize: number;
  monthlySpending: number;
  householdAllocation: HouseholdAllocationShape;
  housingStatus: HousingStatus | null;
  monthlyHousingCost: number;
  currentSavings: number;
  hasDebt: boolean;
  debtAmount: number;
  debtInterestRate: number;
  currentInvestmentAmount: number;
  investmentAllocation: Record<string, number>;
  riskTolerance: RiskTolerance | null;
  ownsInvestmentProperty: boolean;
  investmentPropertyValue: number;
  hasForeignIncome: boolean;
  foreignIncomeAmount: number;
  goals: Goal[];
  preferredCurrency: "PKR";
  profileCompletedAt: string | null;
}

export const DEFAULT_ECONOMIC_PROFILE: EconomicProfile = {
  schemaVersion: 1,
  city: "",
  province: null,
  filerStatus: "unknown",
  monthlyIncome: 0,
  incomeType: null,
  currentSalary: 0,
  lastRaisePct: 0,
  expectedAnnualRaisePct: 0,
  householdSize: 1,
  monthlySpending: 0,
  householdAllocation: { mode: "percent", monthlyBudget: 0, allocation: {} },
  housingStatus: null,
  monthlyHousingCost: 0,
  currentSavings: 0,
  hasDebt: false,
  debtAmount: 0,
  debtInterestRate: 0,
  currentInvestmentAmount: 0,
  investmentAllocation: {},
  riskTolerance: null,
  ownsInvestmentProperty: false,
  investmentPropertyValue: 0,
  hasForeignIncome: false,
  foreignIncomeAmount: 0,
  goals: [],
  preferredCurrency: "PKR",
  profileCompletedAt: null,
};

interface EconomicProfileRow {
  schema_version: number;
  city: string | null;
  province: string | null;
  filer_status: string | null;
  monthly_income: number | null;
  income_type: string | null;
  current_salary: number | null;
  last_raise_pct: number | null;
  expected_annual_raise_pct: number | null;
  household_size: number | null;
  monthly_spending: number | null;
  household_allocation: HouseholdAllocationShape | null;
  housing_status: string | null;
  monthly_housing_cost: number | null;
  current_savings: number | null;
  has_debt: boolean | null;
  debt_amount: number | null;
  debt_interest_rate: number | null;
  current_investment_amount: number | null;
  investment_allocation: Record<string, number> | null;
  risk_tolerance: string | null;
  owns_investment_property: boolean | null;
  investment_property_value: number | null;
  has_foreign_income: boolean | null;
  foreign_income_amount: number | null;
  goals: Goal[] | null;
  preferred_currency: string | null;
  profile_completed_at: string | null;
}

// Every writer (setHouseholdAllocationValue, replaceHouseholdAllocation,
// BudgetAllocationCalculator, PersonalInflationCalculator, the legacy
// migration seed) always sends this full shape atomically — none of them
// can produce anything malformed. The only source of a malformed value is
// the DB column's own default ('{}'::jsonb, migration 0045), which fires
// whenever a save never includes this field (e.g. a user who only fills
// the 5 mandatory fields). Confirmed live against production: an account
// that never touched the allocation UI has household_allocation = {}
// stored. Validating the full shape here (not just presence of a key)
// covers that case and any other malformed value, not just this one.
function isValidHouseholdAllocation(value: unknown): value is HouseholdAllocationShape {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<HouseholdAllocationShape>;
  return (
    (v.mode === "percent" || v.mode === "spending") &&
    typeof v.monthlyBudget === "number" &&
    typeof v.allocation === "object" &&
    v.allocation !== null &&
    !Array.isArray(v.allocation)
  );
}

function fromRow(row: EconomicProfileRow): EconomicProfile {
  return {
    schemaVersion: row.schema_version ?? 1,
    city: row.city ?? "",
    province: (row.province as Province | null) ?? null,
    filerStatus: (row.filer_status as FilerStatus | null) ?? "unknown",
    monthlyIncome: row.monthly_income ?? 0,
    incomeType: (row.income_type as IncomeType | null) ?? null,
    currentSalary: row.current_salary ?? 0,
    lastRaisePct: row.last_raise_pct ?? 0,
    expectedAnnualRaisePct: row.expected_annual_raise_pct ?? 0,
    householdSize: row.household_size ?? 1,
    monthlySpending: row.monthly_spending ?? 0,
    householdAllocation: isValidHouseholdAllocation(row.household_allocation) ? row.household_allocation : DEFAULT_ECONOMIC_PROFILE.householdAllocation,
    housingStatus: (row.housing_status as HousingStatus | null) ?? null,
    monthlyHousingCost: row.monthly_housing_cost ?? 0,
    currentSavings: row.current_savings ?? 0,
    hasDebt: row.has_debt ?? false,
    debtAmount: row.debt_amount ?? 0,
    debtInterestRate: row.debt_interest_rate ?? 0,
    currentInvestmentAmount: row.current_investment_amount ?? 0,
    investmentAllocation: row.investment_allocation ?? {},
    riskTolerance: (row.risk_tolerance as RiskTolerance | null) ?? null,
    ownsInvestmentProperty: row.owns_investment_property ?? false,
    investmentPropertyValue: row.investment_property_value ?? 0,
    hasForeignIncome: row.has_foreign_income ?? false,
    foreignIncomeAmount: row.foreign_income_amount ?? 0,
    goals: row.goals ?? [],
    preferredCurrency: "PKR",
    profileCompletedAt: row.profile_completed_at ?? null,
  };
}

export async function getUserEconomicProfile(): Promise<EconomicProfile | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from("user_economic_profile").select("*").maybeSingle();
  if (error) throw error;
  return data ? fromRow(data as EconomicProfileRow) : null;
}

// Field-name map so upsertUserEconomicProfile can build a partial payload
// generically instead of a 25-line if-chain — only keys present in `patch`
// are ever sent, matching upsertUserPreferences's "omitted fields are left
// exactly as they were" behavior.
const COLUMN_BY_FIELD: Record<keyof Partial<EconomicProfile>, string> = {
  schemaVersion: "schema_version",
  city: "city",
  province: "province",
  filerStatus: "filer_status",
  monthlyIncome: "monthly_income",
  incomeType: "income_type",
  currentSalary: "current_salary",
  lastRaisePct: "last_raise_pct",
  expectedAnnualRaisePct: "expected_annual_raise_pct",
  householdSize: "household_size",
  monthlySpending: "monthly_spending",
  householdAllocation: "household_allocation",
  housingStatus: "housing_status",
  monthlyHousingCost: "monthly_housing_cost",
  currentSavings: "current_savings",
  hasDebt: "has_debt",
  debtAmount: "debt_amount",
  debtInterestRate: "debt_interest_rate",
  currentInvestmentAmount: "current_investment_amount",
  investmentAllocation: "investment_allocation",
  riskTolerance: "risk_tolerance",
  ownsInvestmentProperty: "owns_investment_property",
  investmentPropertyValue: "investment_property_value",
  hasForeignIncome: "has_foreign_income",
  foreignIncomeAmount: "foreign_income_amount",
  goals: "goals",
  preferredCurrency: "preferred_currency",
  profileCompletedAt: "profile_completed_at",
};

export async function upsertUserEconomicProfile(userId: string, patch: Partial<EconomicProfile>): Promise<EconomicProfile> {
  const supabase = createClient();
  const payload: Record<string, unknown> = { user_id: userId };
  (Object.keys(patch) as (keyof EconomicProfile)[]).forEach((field) => {
    const column = COLUMN_BY_FIELD[field];
    if (column) payload[column] = patch[field];
  });

  const { data, error } = await supabase.from("user_economic_profile").upsert(payload, { onConflict: "user_id" }).select("*").single();
  if (error) throw error;
  return fromRow(data as EconomicProfileRow);
}

// --- Profile history (0047_profile_history.sql) ---------------------------

export interface ProfileHistoryEntry {
  id: string;
  snapshot: EconomicProfile;
  createdAt: string;
}

/** Throttled by the caller (economicProfile.ts store) to at most one write per UTC day — this function itself has no throttling logic. */
export async function saveProfileHistorySnapshot(userId: string, snapshot: EconomicProfile): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("profile_history").insert({ user_id: userId, snapshot });
  if (error) throw error;
}

export async function getProfileHistory(limit = 50): Promise<ProfileHistoryEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("profile_history").select("id, snapshot, created_at").order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id as string, snapshot: row.snapshot as EconomicProfile, createdAt: row.created_at as string }));
}
