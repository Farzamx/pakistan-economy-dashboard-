// Phase 10.8 dropdown audit — the option lists for every enum-valued select
// in EconomicProfileOnboarding.tsx used to live only as hardcoded <option>
// tags inline in that component's JSX, with no single source of truth tying
// them back to the authoritative types in lib/supabase/economicProfile.ts.
// Extracted here so (a) the component renders options by mapping over data,
// the same pattern already used correctly everywhere else in the app (e.g.
// CustomComparisonBuilder.tsx, the shared Dropdown.tsx consumers), rather
// than by hand-listing JSX tags that can silently drift from the type, and
// (b) each option list is independently testable without needing to render
// the component.

import type { FilerStatus, Province, IncomeType, HousingStatus, RiskTolerance } from "@/lib/supabase/economicProfile";

export interface EconomicProfileOption<T extends string> {
  value: T;
  label: string;
}

export const PROVINCE_OPTIONS: EconomicProfileOption<Province>[] = [
  { value: "punjab", label: "Punjab" },
  { value: "sindh", label: "Sindh" },
  { value: "kp", label: "Khyber Pakhtunkhwa" },
  { value: "balochistan", label: "Balochistan" },
];

export const FILER_STATUS_OPTIONS: EconomicProfileOption<FilerStatus>[] = [
  { value: "unknown", label: "Prefer not to say" },
  { value: "filer", label: "Filer" },
  { value: "non-filer", label: "Non-filer" },
];

export const INCOME_TYPE_OPTIONS: EconomicProfileOption<IncomeType>[] = [
  { value: "salaried", label: "Salaried" },
  { value: "business", label: "Business" },
  { value: "freelance", label: "Freelance" },
  { value: "mixed", label: "Mixed" },
];

export const HOUSING_STATUS_OPTIONS: EconomicProfileOption<HousingStatus>[] = [
  { value: "own", label: "Own" },
  { value: "rent", label: "Rent" },
  { value: "family", label: "Living with family" },
];

export const RISK_TOLERANCE_OPTIONS: EconomicProfileOption<RiskTolerance>[] = [
  { value: "conservative", label: "Conservative" },
  { value: "moderate", label: "Moderate" },
  { value: "aggressive", label: "Aggressive" },
];
