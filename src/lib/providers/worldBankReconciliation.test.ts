// Phase 8.2 Step 4/5 — reconciles the new WorldBankAdapter against the
// EXISTING src/lib/data/worldBank.ts path (the source of truth for this
// comparison, per the brief). Both the old path (getGdpGrowthHistory) and
// the new adapter (fetchWorldBankSeries) are exercised as real code —
// neither is reimplemented here — against identical mocked fetch
// responses captured live on 2026-08-13 (lastupdated "2026-07-13"), so the
// "identical dataset" cases below are a genuine reconciliation of real,
// previously-observed World Bank data, not a synthetic proof. Sections
// marked "synthetic" build hypothetical fixtures purely for taxonomy
// coverage (categories the live pilot data never actually exercises) and
// say so explicitly — they are not evidence of a real defect.
//
// CI-safety: fetch is mocked in every test; nothing here calls the live
// World Bank endpoint.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getGdpGrowthHistory, type IndicatorSeries } from "@/lib/data/worldBank";
import { fetchWorldBankSeries, yearToObservationPeriod, WORLD_BANK_SERIES } from "./worldBankAdapter";
import { reconcile, type OldObservation } from "./reconciliation";
import type { NormalizedObservation } from "./providerAdapter";

function jsonResponse(body: unknown): Response {
  return { ok: true, status: 200, json: async () => body } as Response;
}

/** Raw API shape (page 1 of 1) for a given country's captured GDP growth data. */
function rawFixture(country: { code: string; name: string; iso2: string }, rows: { date: string; value: number }[]) {
  return [
    { page: 1, pages: 1, per_page: 50, total: rows.length, sourceid: "2", lastupdated: "2026-07-13" },
    rows.map((r) => ({
      indicator: { id: "NY.GDP.MKTP.KD.ZG", value: "GDP growth (annual %)" },
      country: { id: country.iso2, value: country.name },
      countryiso3code: country.code,
      date: r.date,
      value: r.value,
      unit: "",
      obs_status: "",
      decimal: 1,
    })),
  ];
}

const PAK_ROWS = [
  { date: "2025", value: 3.69842668749033 },
  { date: "2024", value: 3.08176295579301 },
  { date: "2023", value: -0.414935997088406 },
  { date: "2022", value: 4.7781068690358 },
  { date: "2021", value: 6.51388575852702 },
  { date: "2020", value: -1.27408744338709 },
];
const IND_ROWS = [
  { date: "2025", value: 7.56666179284244 },
  { date: "2024", value: 7.09927893176518 },
  { date: "2023", value: 7.210224629335 },
  { date: "2022", value: 7.6093649776932 },
  { date: "2021", value: 9.68959249191741 },
  { date: "2020", value: -5.77772470687303 },
];
const BGD_ROWS = [
  { date: "2025", value: 3.48990671836833 },
  { date: "2024", value: 4.22325911250161 },
  { date: "2023", value: 5.77511237007889 },
  { date: "2022", value: 7.09982877575158 },
  { date: "2021", value: 6.93867912442445 },
  { date: "2020", value: 3.44801755122445 },
];

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

/** Converts the OLD path's IndicatorSeries.history (bare-year TrendPoints) into OldObservation[], applying the SAME year->Dec-31 normalization the new adapter applies, so period strings are comparable. Unit is supplied separately because IndicatorSeries carries no unit field at all (see Phase 8.2 Step 1 audit finding). */
function toOldObservations(series: IndicatorSeries, unit: string): OldObservation[] {
  return series.history.map((p) => ({ observationPeriod: yearToObservationPeriod(p.month), value: p.value, unit }));
}

async function realReconciliation(countryCode: "worldbank:gdpGrowthPak" | "worldbank:gdpGrowthIndia" | "worldbank:gdpGrowthBangladesh", wbCountry: "PAK" | "IND" | "BGD", rows: typeof PAK_ROWS, iso2: string, name: string) {
  const fixture = rawFixture({ code: wbCountry, iso2, name }, rows);
  // Both the old and new paths read from the SAME mocked fetch response.
  fetchMock.mockResolvedValue(jsonResponse(fixture));

  const oldSeries = await getGdpGrowthHistory(wbCountry);
  if (!oldSeries) throw new Error("old path returned null — cannot reconcile");
  const oldObs = toOldObservations(oldSeries, "%");

  const newObs = await fetchWorldBankSeries(countryCode, WORLD_BANK_SERIES[countryCode]);
  return reconcile(oldObs, newObs, { expectedUnit: "%" });
}

describe("17. identical existing/new datasets — real captured data", () => {
  it("Pakistan: zero discrepancies, safe to migrate", async () => {
    const result = await realReconciliation("worldbank:gdpGrowthPak", "PAK", PAK_ROWS, "PK", "Pakistan");
    expect(result.discrepancies).toHaveLength(0);
    expect(result.missingInNew).toHaveLength(0);
    expect(result.additionalInNew).toHaveLength(0);
    expect(result.safeToMigrate).toBe(true);
  });

  it("India: zero discrepancies, safe to migrate", async () => {
    const result = await realReconciliation("worldbank:gdpGrowthIndia", "IND", IND_ROWS, "IN", "India");
    expect(result.discrepancies).toHaveLength(0);
    expect(result.safeToMigrate).toBe(true);
  });

  it("Bangladesh: zero discrepancies, safe to migrate", async () => {
    const result = await realReconciliation("worldbank:gdpGrowthBangladesh", "BGD", BGD_ROWS, "BD", "Bangladesh");
    expect(result.discrepancies).toHaveLength(0);
    expect(result.safeToMigrate).toBe(true);
  });
});

describe("18. expected normalization difference (Category A — the date-format change itself)", () => {
  it("the old path's bare-year strings and the new adapter's YYYY-12-31 dates describe the same periods once both are normalized the same way — this normalization alone produces zero spurious discrepancies", () => {
    const oldSeries: IndicatorSeries = { latestValue: 3.7, latestYear: "2025", previousValue: 3.1, previousYear: "2024", history: [{ month: "2024", value: 3.08176295579301 }, { month: "2025", value: 3.69842668749033 }] };
    const oldObs = toOldObservations(oldSeries, "%");
    expect(oldObs.map((o) => o.observationPeriod)).toEqual(["2024-12-31", "2025-12-31"]);

    const newObs: NormalizedObservation[] = oldObs.map((o) => ({
      indicatorKey: "worldbank:gdpGrowthPak", observationPeriod: o.observationPeriod, value: o.value, unit: "%",
      cadence: "annual", provider: "world-bank", sourceSeriesId: "NY.GDP.MKTP.KD.ZG", qualityStatus: "official",
      releaseDate: null, sourceUpdatedAt: null, sourceReference: null, methodology: null,
    }));
    const result = reconcile(oldObs, newObs);
    expect(result.discrepancies).toHaveLength(0); // the format difference was fully absorbed by normalization — no Category A record is ever materialized, it's simply the absence of a discrepancy
    expect(result.safeToMigrate).toBe(true);
  });
});

describe("19. precision difference (Category C) — SYNTHETIC, no real defect found for World Bank", () => {
  it("a hypothetical old-path rounding defect (analogous to the real PBS .toFixed(1) finding) would be classified C, not D", () => {
    // Real audit finding: unlike PBS, worldBank.ts's IndicatorSeries.history
    // stores full-precision numbers -- .toFixed(1) is only ever applied to
    // Kpi.value, a display string never parsed back into a number. This
    // scenario is therefore hypothetical, included only so the taxonomy is
    // exercised against a World Bank-shaped fixture.
    const oldObs: OldObservation[] = [{ observationPeriod: "2025-12-31", value: 3.7, unit: "%" }]; // hypothetically rounded
    const newObs: NormalizedObservation[] = [{
      indicatorKey: "worldbank:gdpGrowthPak", observationPeriod: "2025-12-31", value: 3.69842668749033, unit: "%",
      cadence: "annual", provider: "world-bank", sourceSeriesId: "NY.GDP.MKTP.KD.ZG", qualityStatus: "official",
      releaseDate: null, sourceUpdatedAt: null, sourceReference: null, methodology: null,
    }];
    const result = reconcile(oldObs, newObs, { precisionDigits: 1 });
    expect(result.discrepancies[0]?.category).toBe("C");
  });
});

describe("20. date difference — SYNTHETIC (no real occurrence found)", () => {
  it("a hypothetical off-by-one-year mismatch surfaces as one missing + one additional period, both category D", () => {
    const oldObs: OldObservation[] = [{ observationPeriod: "2024-12-31", value: 3.08176295579301, unit: "%" }];
    const newObs: NormalizedObservation[] = [{
      indicatorKey: "worldbank:gdpGrowthPak", observationPeriod: "2025-12-31", value: 3.08176295579301, unit: "%",
      cadence: "annual", provider: "world-bank", sourceSeriesId: "NY.GDP.MKTP.KD.ZG", qualityStatus: "official",
      releaseDate: null, sourceUpdatedAt: null, sourceReference: null, methodology: null,
    }];
    const result = reconcile(oldObs, newObs);
    expect(result.missingInNew).toEqual(["2024-12-31"]);
    expect(result.additionalInNew).toEqual(["2025-12-31"]);
    expect(result.blockedByCategoryD).toBe(true);
  });
});

// Note: getGdpGrowthHistory() is memoized per-country in a module-level
// cache (src/lib/memoryCache.ts) with a 24h TTL that survives across test
// cases in this file (the same pattern documented for
// latestReleasedEventValue.test.ts in Phase 8.0). Section 17 above already
// calls it once each for PAK/IND/BGD. Rather than invoking it again for
// PAK here (which would silently return the cached 6-row result and throw
// off fetchMock's call ordering for the still-pending new-adapter mock),
// sections 21/22 build oldObs directly from the same PAK_ROWS fixture
// already verified equal to the real old-path output by section 17 --
// only the NEW adapter path is invoked fresh here.
const PAK_OLD_OBS: OldObservation[] = PAK_ROWS.map((r) => ({ observationPeriod: yearToObservationPeriod(r.date), value: r.value, unit: "%" }));

describe("21. missing observation", () => {
  it("a period the old path has but the new adapter's fixture omits blocks migration", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(rawFixture({ code: "PAK", iso2: "PK", name: "Pakistan" }, PAK_ROWS.slice(1)))); // drop 2025
    const newObs = await fetchWorldBankSeries("worldbank:gdpGrowthPak", WORLD_BANK_SERIES["worldbank:gdpGrowthPak"]);

    const result = reconcile(PAK_OLD_OBS, newObs, { expectedUnit: "%" });
    expect(result.missingInNew).toEqual(["2025-12-31"]);
    expect(result.blockedByCategoryD).toBe(true);
    expect(result.safeToMigrate).toBe(false);
  });
});

describe("22. additional observation", () => {
  it("a period the new adapter has but the old path's fixture omits blocks migration", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(rawFixture({ code: "PAK", iso2: "PK", name: "Pakistan" }, PAK_ROWS)));
    const newObs = await fetchWorldBankSeries("worldbank:gdpGrowthPak", WORLD_BANK_SERIES["worldbank:gdpGrowthPak"]);

    const result = reconcile(PAK_OLD_OBS.slice(1), newObs, { expectedUnit: "%" }); // old side is missing 2025
    expect(result.additionalInNew).toEqual(["2025-12-31"]);
    expect(result.blockedByCategoryD).toBe(true);
  });
});

describe("23. unit difference — SYNTHETIC", () => {
  it("an undeclared unit change is D", () => {
    const oldObs: OldObservation[] = [{ observationPeriod: "2025-12-31", value: 3.7, unit: "% (annual)" }];
    const newObs: NormalizedObservation[] = [{
      indicatorKey: "worldbank:gdpGrowthPak", observationPeriod: "2025-12-31", value: 3.7, unit: "%",
      cadence: "annual", provider: "world-bank", sourceSeriesId: "NY.GDP.MKTP.KD.ZG", qualityStatus: "official",
      releaseDate: null, sourceUpdatedAt: null, sourceReference: null, methodology: null,
    }];
    expect(reconcile(oldObs, newObs).discrepancies[0]?.category).toBe("D");
  });

  it("a caller-declared expected unit change (the real, deliberate mapping this pilot uses) is B", () => {
    const oldObs: OldObservation[] = [{ observationPeriod: "2025-12-31", value: 3.7, unit: "% (annual)" }];
    const newObs: NormalizedObservation[] = [{
      indicatorKey: "worldbank:gdpGrowthPak", observationPeriod: "2025-12-31", value: 3.7, unit: "%",
      cadence: "annual", provider: "world-bank", sourceSeriesId: "NY.GDP.MKTP.KD.ZG", qualityStatus: "official",
      releaseDate: null, sourceUpdatedAt: null, sourceReference: null, methodology: null,
    }];
    expect(reconcile(oldObs, newObs, { expectedUnit: "%" }).discrepancies[0]?.category).toBe("B");
  });
});

describe("24. unexplained discrepancy classified as D", () => {
  it("a value mismatch with no precision or unit explanation is D and blocks migration", () => {
    const oldObs: OldObservation[] = [{ observationPeriod: "2025-12-31", value: 3.69842668749033, unit: "%" }];
    const newObs: NormalizedObservation[] = [{
      indicatorKey: "worldbank:gdpGrowthPak", observationPeriod: "2025-12-31", value: 5.0, unit: "%",
      cadence: "annual", provider: "world-bank", sourceSeriesId: "NY.GDP.MKTP.KD.ZG", qualityStatus: "official",
      releaseDate: null, sourceUpdatedAt: null, sourceReference: null, methodology: null,
    }];
    const result = reconcile(oldObs, newObs);
    expect(result.discrepancies[0]?.category).toBe("D");
    expect(result.blockedByCategoryD).toBe(true);
    expect(result.safeToMigrate).toBe(false);
  });
});

describe("25. Category C requires explicit sign-off", () => {
  it("blocks by default, passes only with categoryCApproved: true", () => {
    const oldObs: OldObservation[] = [{ observationPeriod: "2025-12-31", value: 3.7, unit: "%" }];
    const newObs: NormalizedObservation[] = [{
      indicatorKey: "worldbank:gdpGrowthPak", observationPeriod: "2025-12-31", value: 3.69842668749033, unit: "%",
      cadence: "annual", provider: "world-bank", sourceSeriesId: "NY.GDP.MKTP.KD.ZG", qualityStatus: "official",
      releaseDate: null, sourceUpdatedAt: null, sourceReference: null, methodology: null,
    }];
    const unapproved = reconcile(oldObs, newObs, { precisionDigits: 1 });
    expect(unapproved.requiresCategoryCSignOff).toBe(true);
    expect(unapproved.safeToMigrate).toBe(false);

    const approved = reconcile(oldObs, newObs, { precisionDigits: 1, categoryCApproved: true });
    expect(approved.requiresCategoryCSignOff).toBe(false);
    expect(approved.safeToMigrate).toBe(true);
  });
});

describe("26. Category D always blocks migration, regardless of other approvals", () => {
  it("a Category D discrepancy blocks safeToMigrate even with categoryCApproved: true", () => {
    const oldObs: OldObservation[] = [{ observationPeriod: "2025-12-31", value: 3.69842668749033, unit: "%" }];
    const newObs: NormalizedObservation[] = [{
      indicatorKey: "worldbank:gdpGrowthPak", observationPeriod: "2025-12-31", value: 5.0, unit: "%",
      cadence: "annual", provider: "world-bank", sourceSeriesId: "NY.GDP.MKTP.KD.ZG", qualityStatus: "official",
      releaseDate: null, sourceUpdatedAt: null, sourceReference: null, methodology: null,
    }];
    const result = reconcile(oldObs, newObs, { categoryCApproved: true });
    expect(result.safeToMigrate).toBe(false);
    expect(result.blockedByCategoryD).toBe(true);
  });
});
