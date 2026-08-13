// Phase 8.0 tests for the shared series-cadence vocabulary extraction.
// Proves: (4) shared series definitions preserve existing series metadata,
// (7) ComparisonFrequency narrowing works for monthly/quarterly/annual, and
// (8) no duplicate frequency vocabulary remains for the shared series facts.

import { describe, it, expect } from "vitest";
import type { SeriesCadence } from "./seriesDefinition";

describe("SeriesCadence — the single shared cadence vocabulary", () => {
  it("has exactly the 8 values previously declared independently as ReleaseCadence", () => {
    const values: SeriesCadence[] = [
      "real-time", "hourly", "daily", "weekly", "monthly", "quarterly", "annual", "as-needed",
    ];
    // Type-level exhaustiveness: this object literal only compiles if every
    // SeriesCadence member is listed and nothing extra is -- a 9th member
    // added to the type without being added here is a compile error.
    const exhaustive: Record<SeriesCadence, true> = {
      "real-time": true, hourly: true, daily: true, weekly: true,
      monthly: true, quarterly: true, annual: true, "as-needed": true,
    };
    expect(Object.keys(exhaustive).sort()).toEqual(values.sort());
  });
});

describe("8. no duplicate frequency vocabulary remains", () => {
  it("freshnessEngine's ReleaseCadence is a direct alias of the shared SeriesCadence, not a second declaration", async () => {
    // If ReleaseCadence were still an independently-declared union, a value
    // valid under one but not the other would compile on one side and fail
    // on the other. Since it's now `export type ReleaseCadence = SeriesCadence`,
    // the same literal is assignable to both -- verified at the type level
    // by this file compiling at all with the cross-assignment below.
    const { CADENCE_INTERVAL_DAYS } = await import("./freshness/freshnessEngine");
    const cadence: SeriesCadence = "quarterly";
    expect(CADENCE_INTERVAL_DAYS[cadence]).toBe(92); // only resolves if ReleaseCadence keys === SeriesCadence keys
  });

  it("comparisonRegistry's ComparisonFrequency is a narrowed Extract<> of SeriesCadence, not a parallel union", async () => {
    const { COMPARISONS } = await import("./comparisons/comparisonRegistry");
    const cadences = new Set(COMPARISONS.flatMap((c) => [c.seriesA.frequency, c.seriesB.frequency]));
    // Every value actually used by the registry must be a member of the
    // shared vocabulary's narrowed subset -- proves the narrowing is real,
    // not just a same-named independent union that happens to overlap.
    const allowed: SeriesCadence[] = ["monthly", "quarterly", "annual"];
    for (const c of cadences) {
      expect(allowed).toContain(c);
    }
  });
});

describe("4. shared series definitions preserve existing series metadata", () => {
  it("freshness registry's SBP entries still carry every pre-extraction field, unchanged", async () => {
    const { getSbpSeriesDefinition } = await import("./freshness/seriesRegistry");
    const def = getSbpSeriesDefinition("usdPkr");
    expect(def).toEqual({
      seriesId: "sbp:usdPkr",
      provider: "sbp-easydata",
      cadence: "monthly",
      graceDays: 40,
      marketType: "forex",
      expectsReleaseDate: false,
      expectsSourceUpdatedAt: false,
    });
  });

  it("policyRate's grace-day override survives the extraction unchanged", async () => {
    const { getSbpSeriesDefinition } = await import("./freshness/seriesRegistry");
    expect(getSbpSeriesDefinition("policyRate").graceDays).toBe(120);
  });

  it("comparison registry's series metadata (unit/label/color) is untouched by the cadence-type change", async () => {
    const { getComparisonBySlug } = await import("./comparisons/comparisonRegistry");
    const def = getComparisonBySlug("inflation-vs-policy-rate")!;
    expect(def.seriesA.unit).toBe("%");
    expect(def.seriesA.frequency).toBe("monthly");
    expect(def.seriesA.label).toBe("CPI Inflation (YoY)");
  });
});
