// Phase 10.8 dropdown audit regression tests. Pins every enum-valued select
// in EconomicProfileOnboarding.tsx (Income Type, Province, Filer Status,
// Housing Status, Risk Tolerance) to its authoritative type from
// lib/supabase/economicProfile.ts, so a future edit can't silently drop or
// duplicate an option the way the reported "Income Type only shows
// Salaried" bug suggested (traced separately to a disabled, aria-hidden
// marketing preview widget — not this real, already-fully-populated form —
// but the option lists had no test coverage tying them to their types
// before this, so nothing would have caught it if it had been real).

import { describe, it, expect } from "vitest";
import {
  PROVINCE_OPTIONS,
  FILER_STATUS_OPTIONS,
  INCOME_TYPE_OPTIONS,
  HOUSING_STATUS_OPTIONS,
  RISK_TOLERANCE_OPTIONS,
} from "./economicProfileOptions";
import type { FilerStatus, Province, IncomeType, HousingStatus, RiskTolerance } from "@/lib/supabase/economicProfile";

function values<T extends string>(options: { value: T }[]): T[] {
  return options.map((o) => o.value);
}

function expectNoDuplicates<T>(list: T[]) {
  expect(new Set(list).size).toBe(list.length);
}

describe("economic profile dropdown option lists", () => {
  it("Province offers exactly the 4 authoritative provinces, no duplicates", () => {
    const expected: Province[] = ["punjab", "sindh", "kp", "balochistan"];
    expect(values(PROVINCE_OPTIONS).sort()).toEqual([...expected].sort());
    expectNoDuplicates(values(PROVINCE_OPTIONS));
  });

  it("Filer Status offers exactly the 3 authoritative statuses, no duplicates", () => {
    const expected: FilerStatus[] = ["filer", "non-filer", "unknown"];
    expect(values(FILER_STATUS_OPTIONS).sort()).toEqual([...expected].sort());
    expectNoDuplicates(values(FILER_STATUS_OPTIONS));
  });

  it("Income Type offers all 4 authoritative types — the exact control named in the Phase 10.8 report — no duplicates", () => {
    const expected: IncomeType[] = ["salaried", "business", "freelance", "mixed"];
    expect(values(INCOME_TYPE_OPTIONS).sort()).toEqual([...expected].sort());
    expectNoDuplicates(values(INCOME_TYPE_OPTIONS));
    // Specifically guards the reported symptom: Salaried must never be the
    // only option present.
    expect(INCOME_TYPE_OPTIONS.length).toBeGreaterThan(1);
  });

  it("Housing Status offers exactly the 3 authoritative statuses, no duplicates", () => {
    const expected: HousingStatus[] = ["own", "rent", "family"];
    expect(values(HOUSING_STATUS_OPTIONS).sort()).toEqual([...expected].sort());
    expectNoDuplicates(values(HOUSING_STATUS_OPTIONS));
  });

  it("Risk Tolerance offers exactly the 3 authoritative levels, no duplicates", () => {
    const expected: RiskTolerance[] = ["conservative", "moderate", "aggressive"];
    expect(values(RISK_TOLERANCE_OPTIONS).sort()).toEqual([...expected].sort());
    expectNoDuplicates(values(RISK_TOLERANCE_OPTIONS));
  });

  it("every option list has a non-empty, unique label for every value", () => {
    for (const options of [PROVINCE_OPTIONS, FILER_STATUS_OPTIONS, INCOME_TYPE_OPTIONS, HOUSING_STATUS_OPTIONS, RISK_TOLERANCE_OPTIONS]) {
      const labels = options.map((o) => o.label);
      for (const label of labels) expect(label.length).toBeGreaterThan(0);
      expectNoDuplicates(labels);
    }
  });
});
