// Phase 8.17 — MANDATORY shadow reconciliation: the new yahooGoldAdapter
// against the EXISTING src/lib/data/yfinance.ts path (getGoldHistory) — the
// source of truth for this comparison. Neither path is reimplemented here;
// both are exercised as real code against IDENTICAL mocked fetch responses
// (real captured-live fixtures from the Phase 8.15 investigation), so this
// is a genuine reconciliation of real, previously-observed Yahoo data, not
// a synthetic proof.
//
// CI-safety: fetch is mocked in every test; nothing here calls the live
// Yahoo endpoint.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getGoldHistory } from "@/lib/data/yfinance";
import { fetchYahooGoldSeries, monthStartToMonthEnd, currentUtcMonth } from "./yahooGoldAdapter";
import { reconcile, type OldObservation } from "./reconciliation";
import type { NormalizedObservation } from "./providerAdapter";

function chartResponse(bars: { ts: number; close: number }[]): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      chart: {
        result: [{
          timestamp: bars.map((b) => b.ts),
          indicators: { quote: [{ close: bars.map((b) => b.close) }] },
        }],
        error: null,
      },
    }),
  } as Response;
}

// Real captured timestamps/closes from the Phase 8.15 live investigation
// (GC=F, interval=1mo, range=2y, queried 2026-08-13).
const REAL_BARS = [
  { ts: 1780286400, close: 4022.89990234375 }, // 2026-06-01T04:00:00Z
  { ts: 1782878400, close: 4049.10009765625 }, // 2026-07-01T04:00:00Z
  { ts: 1785556800, close: 4408.89990234375 }, // 2026-08-01T04:00:00Z -- current month, month-start-dated
  { ts: 1786636195, close: 4426.2001953125 },  // 2026-08-13T15:49:55Z -- current month, live trailing bar
];

const NOW = new Date("2026-08-13T20:00:00.000Z");

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * Converts the OLD path's YfHistoryPoint[] (raw Yahoo period-START dates)
 * into OldObservation[], applying the SAME period-end normalization AND
 * current-month exclusion the new adapter applies, so period strings are
 * genuinely comparable — exactly mirroring fredReconciliation.test.ts's
 * toOldObservations() methodology.
 */
function toOldObservations(points: { date: string; close: number }[], unit: string, now: Date): OldObservation[] {
  const currentMonth = currentUtcMonth(now);
  return points
    .filter((p) => p.date.slice(0, 7) !== currentMonth)
    .map((p) => ({ observationPeriod: monthStartToMonthEnd(p.date), value: p.close, unit }));
}

describe("shadow reconciliation — yahoo:goldMonthly, real captured data", () => {
  it("zero discrepancies, safe to migrate, once the current in-progress month is excluded from BOTH sides", async () => {
    fetchMock.mockResolvedValue(chartResponse(REAL_BARS));

    const oldPointsRaw = await getGoldHistory();
    if (!oldPointsRaw) throw new Error("old path returned null — cannot reconcile");
    const oldObs = toOldObservations(oldPointsRaw, "$/oz", NOW);

    const newObs = await fetchYahooGoldSeries(NOW);
    const result = reconcile(oldObs, newObs, { expectedUnit: "$/oz" });

    expect(result.discrepancies).toHaveLength(0);
    expect(result.missingInNew).toHaveLength(0);
    expect(result.additionalInNew).toHaveLength(0);
    expect(result.safeToMigrate).toBe(true);
    // Both sides correctly reduced to exactly the 2 real completed months.
    expect(oldObs.map((o) => o.observationPeriod)).toEqual(["2026-06-30", "2026-07-31"]);
    expect(newObs.map((o) => o.observationPeriod)).toEqual(["2026-06-30", "2026-07-31"]);
  });
});

describe("expected normalization difference (Category A — the date-format change itself)", () => {
  it("the old path's raw period-start dates and the new adapter's period-end dates describe the SAME logical periods once both are normalized the same way", async () => {
    fetchMock.mockResolvedValue(chartResponse(REAL_BARS));
    const oldPointsRaw = await getGoldHistory();
    if (!oldPointsRaw) throw new Error("old path returned null");

    // Raw, UNNORMALIZED old dates still carry Yahoo's native period-start form
    // (plus the two live current-month entries the exclusion rule removes).
    expect(oldPointsRaw.map((p) => p.date)).toEqual(["2026-06-01", "2026-07-01", "2026-08-01", "2026-08-13"]);

    const newObs = await fetchYahooGoldSeries(NOW);
    expect(newObs.map((o) => o.observationPeriod)).toEqual(["2026-06-30", "2026-07-31"]);

    const oldObsNormalized = toOldObservations(oldPointsRaw, "$/oz", NOW);
    const result = reconcile(oldObsNormalized, newObs, { expectedUnit: "$/oz" });
    expect(result.discrepancies).toHaveLength(0);
    expect(result.safeToMigrate).toBe(true);
  });
});

describe("observation count", () => {
  it("both paths return the exact same number of completed observations for identical fixture data", async () => {
    fetchMock.mockResolvedValue(chartResponse(REAL_BARS));
    const oldPointsRaw = await getGoldHistory();
    const oldObs = toOldObservations(oldPointsRaw!, "$/oz", NOW);
    const newObs = await fetchYahooGoldSeries(NOW);
    expect(oldObs.length).toBe(newObs.length);
    expect(newObs).toHaveLength(2);
  });
});

describe("missing month is preserved on both sides, never fabricated", () => {
  // Note: getGoldHistory() is memoized per-process in a module-level cache
  // (src/lib/memoryCache.ts) with no parameters to vary its cache key —
  // the exact pattern documented in fredReconciliation.test.ts/
  // worldBankReconciliation.test.ts's own headers. The primary reconciliation
  // test above already calls it once, fresh, against REAL_BARS and proves
  // full old==new equivalence generically. Rather than invoking the
  // memoized function again here (which would silently return REAL_BARS'
  // cached result regardless of this test's own mock), oldObs is built
  // directly from the SAME gapBars fixture using the identical
  // normalization toOldObservations() applies — only the NEW adapter path
  // is invoked fresh in this test.
  const gapBars = [
    { date: "2025-05-01", close: 3288.89990234375 },
    { date: "2025-07-01", close: 3293.199951171875 }, // June 2025 genuinely absent
  ];

  it("a genuine gap (June 2025) appears identically absent in both legacy and candidate output", async () => {
    fetchMock.mockResolvedValue(chartResponse([
      { ts: 1746072000, close: 3288.89990234375 }, // 2025-05-01
      { ts: 1751342400, close: 3293.199951171875 }, // 2025-07-01
    ]));
    const oldObs = toOldObservations(gapBars, "$/oz", NOW);
    const newObs = await fetchYahooGoldSeries(NOW);

    const result = reconcile(oldObs, newObs, { expectedUnit: "$/oz" });
    expect(result.discrepancies).toHaveLength(0);
    expect(result.missingInNew).toHaveLength(0);
    expect(oldObs.some((o) => o.observationPeriod.startsWith("2025-06"))).toBe(false);
    expect(newObs.some((o) => o.observationPeriod.startsWith("2025-06"))).toBe(false);
  });
});

describe("unexplained discrepancy classified as D — SYNTHETIC, no real defect found for Yahoo Gold", () => {
  it("a value mismatch with no precision or unit explanation is D and blocks migration", () => {
    const oldObs: OldObservation[] = [{ observationPeriod: "2026-07-31", value: 4049.10009765625, unit: "$/oz" }];
    const newObs: NormalizedObservation[] = [{
      indicatorKey: "yahoo:goldMonthly", observationPeriod: "2026-07-31", value: 9999.99, unit: "$/oz",
      cadence: "monthly", provider: "yahoo-finance", sourceSeriesId: "GC=F", qualityStatus: "official",
      releaseDate: null, sourceUpdatedAt: null, sourceReference: null, methodology: null,
    }];
    const result = reconcile(oldObs, newObs);
    expect(result.discrepancies[0]?.category).toBe("D");
    expect(result.blockedByCategoryD).toBe(true);
    expect(result.safeToMigrate).toBe(false);
  });
});
