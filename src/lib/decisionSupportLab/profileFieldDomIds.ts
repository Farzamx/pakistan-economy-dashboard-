// Maps profile fields to the input `id` EconomicProfileOnboarding.tsx
// renders them with, so a ConfidenceBadge chip (or any other "fix this
// field" affordance) can tell ProfileCompletionDrawer exactly which
// element to open-scroll-focus, instead of just opening the drawer blind.
// Fields with no dedicated input (checkboxes without ids, jsonb
// collections) are intentionally omitted — the drawer still opens, just
// without a specific highlight target.
import type { EconomicProfile } from "@/lib/decisionSupportLab/economicProfile";

export const PROFILE_FIELD_DOM_IDS: Partial<Record<keyof EconomicProfile, string>> = {
  city: "ep-city",
  province: "ep-province",
  filerStatus: "ep-filer",
  monthlyIncome: "ep-income",
  incomeType: "ep-income-type",
  currentSalary: "ep-salary",
  lastRaisePct: "ep-last-raise",
  expectedAnnualRaisePct: "ep-expected-raise",
  householdSize: "ep-household-size",
  monthlySpending: "ep-spending",
  housingStatus: "ep-housing-status",
  monthlyHousingCost: "ep-housing-cost",
  currentSavings: "ep-savings",
  debtAmount: "ep-debt-amount",
  debtInterestRate: "ep-debt-rate",
  currentInvestmentAmount: "ep-investment-amount",
  riskTolerance: "ep-risk",
  investmentPropertyValue: "ep-property-value",
  foreignIncomeAmount: "ep-foreign-income",
};
