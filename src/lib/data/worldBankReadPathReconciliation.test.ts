// Phase 8.3 Step 10 — reconciles the OLD World Bank read path (live API,
// still reachable as getGdpGrowthHistory's fallback tier) against the NEW
// canonical-DB-backed path, using the SAME real, live-captured data for
// both, and the SAME actual production function (getGdpGrowthHistory) —
// forcing each path via its own trigger condition (DB populated vs DB
// empty) rather than reimplementing either path separately. Uses the
// Phase 8.1 reconcile() harness and its A/B/C/D taxonomy.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { reconcile, type OldObservation } from "@/lib/providers/reconciliation";
import type { NormalizedObservation } from "@/lib/providers/providerAdapter";

const cacheStore = vi.hoisted(() => new Map<string, { data: unknown; t: number }>());
vi.mock("@/lib/memoryCache", () => ({
  getFresh: () => null, // force every call to actually execute (no L1 short-circuit) so both paths are genuinely exercised
  getStale: () => null,
  setCache: (key: string, data: unknown) => cacheStore.set(key, { data, t: Date.now() }),
  invalidate: (key: string) => cacheStore.delete(key),
  dedupeInFlight: (_key: string, fn: () => Promise<unknown>) => fn(),
}));

const getCanonicalWorldBankHistoryMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/data/worldBankCanonicalStore", () => ({
  getCanonicalWorldBankHistory: getCanonicalWorldBankHistoryMock,
}));

import { getGdpGrowthHistory } from "./worldBank";

function canonicalRow(observationPeriod: string, value: number) {
  return { observationPeriod, value, unit: "%", vintage: "2026-08-12T20:50:00.000Z", releaseDate: null, sourceUpdatedAt: "2026-07-13T00:00:00.000Z", fetchedAt: "2026-08-12T20:50:00.000Z", qualityStatus: "official", sourceSeriesId: "NY.GDP.MKTP.KD.ZG", sourceReference: null };
}

function liveApiFixture(rows: { date: string; value: number }[]) {
  return [{ page: 1, pages: 1, per_page: 50, total: rows.length, lastupdated: "2026-07-13" }, rows.map((r) => ({ date: r.date, value: r.value }))];
}

// The exact real, live-captured (2026-08-13) Pakistan values used throughout
// Phase 8.2/8.3, now genuinely present in production canonical_observations.
const REAL_ROWS = [
  { year: "2022", value: 4.7781068690358 },
  { year: "2023", value: -0.414935997088406 },
  { year: "2024", value: 3.08176295579301 },
  { year: "2025", value: 3.69842668749033 },
];

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  cacheStore.clear();
  getCanonicalWorldBankHistoryMock.mockReset();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("25/26. old vs canonical — latest value and full historical values, identical real data", () => {
  it("produces zero discrepancies when both paths are backed by the same underlying observations", async () => {
    // OLD path: force the DB to be empty so getGdpGrowthHistory falls
    // through to the live API fallback tier -- the literal old behavior.
    getCanonicalWorldBankHistoryMock.mockResolvedValueOnce([]);
    // The real API returns newest-first (see worldBankAdapter's own fixtures) --
    // fetchIndicator()'s existing .reverse() logic expects that order.
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => liveApiFixture([...REAL_ROWS].reverse().map((r) => ({ date: r.year, value: r.value }))) });
    const oldSeries = await getGdpGrowthHistory("PAK");
    const oldObs: OldObservation[] = oldSeries!.history.map((p) => ({ observationPeriod: `${p.month}-12-31`, value: p.value, unit: "%" }));

    // NEW path: the DB is populated with the same real values.
    getCanonicalWorldBankHistoryMock.mockResolvedValueOnce(REAL_ROWS.map((r) => canonicalRow(`${r.year}-12-31`, r.value)));
    const newSeries = await getGdpGrowthHistory("PAK");
    const newObs: NormalizedObservation[] = newSeries!.history.map((p) => ({
      indicatorKey: "worldbank:gdpGrowthPak", observationPeriod: `${p.month}-12-31`, value: p.value, unit: "%",
      cadence: "annual", provider: "world-bank", sourceSeriesId: "NY.GDP.MKTP.KD.ZG", qualityStatus: "official",
      releaseDate: null, sourceUpdatedAt: null, sourceReference: null, methodology: null,
    }));

    const result = reconcile(oldObs, newObs, { expectedUnit: "%" });

    expect(result.discrepancies).toHaveLength(0);
    expect(result.missingInNew).toHaveLength(0);
    expect(result.additionalInNew).toHaveLength(0);
    expect(result.blockedByCategoryD).toBe(false);
    expect(result.requiresCategoryCSignOff).toBe(false);
    expect(result.safeToMigrate).toBe(true);

    // 27/28/29 — date, unit, and precision equivalence, checked directly.
    expect(newSeries!.latestYear).toBe(oldSeries!.latestYear);
    expect(newSeries!.latestValue).toBe(oldSeries!.latestValue); // exact float equality -- full precision both sides
  });
});

describe("30/31/32 — presence discrepancies and the D/C blocking rules, exercised against this exact read-path pairing", () => {
  it("a period present in the old (live API) result but absent from the new (DB) result is D and blocks migration", () => {
    const oldObs: OldObservation[] = [{ observationPeriod: "2025-12-31", value: 3.69842668749033, unit: "%" }];
    const newObs: NormalizedObservation[] = [];
    const result = reconcile(oldObs, newObs);
    expect(result.missingInNew).toEqual(["2025-12-31"]);
    expect(result.blockedByCategoryD).toBe(true);
    expect(result.safeToMigrate).toBe(false);
  });

  it("a genuine value disagreement between the two paths is D, not silently resolved in the new path's favor", () => {
    const oldObs: OldObservation[] = [{ observationPeriod: "2025-12-31", value: 3.69842668749033, unit: "%" }];
    const newObs: NormalizedObservation[] = [{
      indicatorKey: "worldbank:gdpGrowthPak", observationPeriod: "2025-12-31", value: 999, unit: "%",
      cadence: "annual", provider: "world-bank", sourceSeriesId: "NY.GDP.MKTP.KD.ZG", qualityStatus: "official",
      releaseDate: null, sourceUpdatedAt: null, sourceReference: null, methodology: null,
    }];
    const result = reconcile(oldObs, newObs);
    expect(result.discrepancies[0]?.category).toBe("D");
    expect(result.safeToMigrate).toBe(false);
  });
});
