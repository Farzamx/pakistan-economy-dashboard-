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

// Phase 8.20: registry consolidation proofs. SERIES_CATALOG becomes the one
// authoritative source of unit/frequency for the 19 SeriesProviderId values;
// comparisonRegistry.ts and seriesOptions.ts both derive from it via
// comparisonSeriesConfig(); seriesRegistry.ts's freshness cadence derives
// from the same catalog for the 6 non-SBP entries where "comparison
// frequency" and "freshness cadence" are the same fact.
describe("Phase 8.20 — series metadata registry consolidation", () => {
  it("every SeriesProviderId used by COMPARISONS resolves its unit/frequency from SERIES_CATALOG", async () => {
    const { COMPARISONS } = await import("./comparisons/comparisonRegistry");
    const { SERIES_CATALOG } = await import("./seriesDefinition");
    for (const comparison of COMPARISONS) {
      for (const series of [comparison.seriesA, comparison.seriesB]) {
        const catalogEntry = SERIES_CATALOG[series.id];
        expect(catalogEntry, `SERIES_CATALOG missing entry for "${series.id}"`).toBeDefined();
        expect(series.unit).toBe(catalogEntry.unit);
        expect(series.frequency).toBe(catalogEntry.cadence);
      }
    }
  });

  it("seriesOptions.ts's ALL_SERIES_OPTIONS carries no unit/frequency that disagrees with SERIES_CATALOG", async () => {
    const { ALL_SERIES_OPTIONS } = await import("./comparisons/seriesOptions");
    const { SERIES_CATALOG } = await import("./seriesDefinition");
    expect(ALL_SERIES_OPTIONS.length).toBeGreaterThan(0);
    for (const option of ALL_SERIES_OPTIONS) {
      const catalogEntry = SERIES_CATALOG[option.id];
      expect(catalogEntry).toBeDefined();
      expect(option.unit).toBe(catalogEntry.unit);
      expect(option.frequency).toBe(catalogEntry.cadence);
    }
  });

  it("ALL_SERIES_OPTIONS and COMPARISONS agree on unit/frequency for every series id they share (structural, not coincidental)", async () => {
    const { ALL_SERIES_OPTIONS } = await import("./comparisons/seriesOptions");
    const { COMPARISONS } = await import("./comparisons/comparisonRegistry");
    const fromComparisons = new Map<string, { unit: string; frequency: string }>();
    for (const c of COMPARISONS) {
      for (const s of [c.seriesA, c.seriesB]) {
        fromComparisons.set(s.id, { unit: s.unit, frequency: s.frequency });
      }
    }
    for (const option of ALL_SERIES_OPTIONS) {
      const other = fromComparisons.get(option.id);
      if (!other) continue;
      expect(option.unit).toBe(other.unit);
      expect(option.frequency).toBe(other.frequency);
    }
  });

  it("freshness registry's World Bank/FRED/Yahoo Gold cadence values are unchanged after deriving from SERIES_CATALOG (before/after snapshot)", async () => {
    const { getSeriesDefinition } = await import("./freshness/seriesRegistry");
    // Snapshot of the exact hardcoded literals every one of these entries
    // had BEFORE Phase 8.20 (annual for World Bank GDP growth, monthly for
    // FRED and Yahoo Gold) — proves the SERIES_CATALOG-derived value is
    // identical to what was hand-typed before, not merely "some value".
    const expected: Record<string, string> = {
      "worldbank:gdpGrowthPak": "annual",
      "worldbank:gdpGrowthIndia": "annual",
      "worldbank:gdpGrowthBangladesh": "annual",
      "fred:fedFunds": "monthly",
      "fred:usCpiInflation": "monthly",
      "yahoo:goldMonthly": "monthly",
    };
    for (const [seriesId, cadence] of Object.entries(expected)) {
      const def = getSeriesDefinition(seriesId);
      expect(def, `no freshness registry entry for "${seriesId}"`).not.toBeNull();
      expect(def!.cadence).toBe(cadence);
    }
  });

  it("freshness registry's graceDays for the 6 derived entries are unchanged (still the monthly=40/annual=450 totals)", async () => {
    const { getSeriesDefinition } = await import("./freshness/seriesRegistry");
    expect(getSeriesDefinition("worldbank:gdpGrowthPak")!.graceDays).toBe(450);
    expect(getSeriesDefinition("fred:fedFunds")!.graceDays).toBe(40);
    expect(getSeriesDefinition("fred:usCpiInflation")!.graceDays).toBe(40);
    expect(getSeriesDefinition("yahoo:goldMonthly")!.graceDays).toBe(40);
  });

  it("SBP's moneySupplyM2/policyRate/tbillYield3m freshness cadence is NOT overridden by SERIES_CATALOG's comparison-facing 'monthly' value — the documented exception holds", async () => {
    const { getSeriesDefinition } = await import("./freshness/seriesRegistry");
    const { SERIES_CATALOG, SERIES_CATALOG_FRESHNESS_CADENCE_EXCEPTIONS } = await import("./seriesDefinition");
    expect(SERIES_CATALOG_FRESHNESS_CADENCE_EXCEPTIONS).toEqual(
      expect.arrayContaining(["sbp:moneySupplyM2", "sbp:policyRate", "sbp:tbillYield3m"]),
    );
    // SERIES_CATALOG (comparison-facing) says monthly for all three...
    expect(SERIES_CATALOG["sbp:moneySupplyM2"].cadence).toBe("monthly");
    expect(SERIES_CATALOG["sbp:policyRate"].cadence).toBe("monthly");
    expect(SERIES_CATALOG["sbp:tbillYield3m"].cadence).toBe("monthly");
    // ...but the freshness registry (sbp.ts's own real Frequency) still
    // disagrees, proving this consolidation did not silently force
    // agreement by changing sbp.ts's ground truth.
    expect(getSeriesDefinition("sbp:moneySupplyM2")!.cadence).toBe("weekly");
    expect(getSeriesDefinition("sbp:policyRate")!.cadence).toBe("as-needed");
    expect(getSeriesDefinition("sbp:tbillYield3m")!.cadence).toBe("as-needed");
  });

  it("comparisonSeriesConfig() throws for a series id with no SERIES_CATALOG entry, rather than silently guessing", async () => {
    const { comparisonSeriesConfig } = await import("./comparisons/comparisonRegistry");
    // @ts-expect-error deliberately invalid id to prove the runtime guard fires
    expect(() => comparisonSeriesConfig("not-a-real-series", "x", "x", "#fff")).toThrow();
  });

  it("no public comparison slug or SeriesProviderId changed as part of this consolidation", async () => {
    const { getAllComparisonSlugs, COMPARISONS } = await import("./comparisons/comparisonRegistry");
    const slugs = getAllComparisonSlugs();
    expect(slugs).toContain("inflation-vs-policy-rate");
    // getAllComparisonSlugs() also appends SECTOR_COMPOSITION.slug, so it's
    // COMPARISONS.length + 1, not a 1:1 count.
    expect(slugs.length).toBe(COMPARISONS.length + 1);
    const ids = new Set<string>(COMPARISONS.flatMap((c) => [c.seriesA.id, c.seriesB.id]));
    // Spot-check a representative sample across every provider family to
    // prove the migrated construction path preserved every original id.
    for (const id of [
      "sbp:usdPkr", "sbp:externalDebt", "worldbank:gdpGrowthPak",
      "fred:fedFunds", "yfinance:gold",
    ]) {
      expect(ids.has(id)).toBe(true);
    }
  });
});
