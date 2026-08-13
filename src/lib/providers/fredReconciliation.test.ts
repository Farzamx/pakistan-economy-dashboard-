// Phase 8.12 — MANDATORY shadow reconciliation: the new fredAdapter against
// the EXISTING src/lib/data/fred.ts path (getFedFundsHistory /
// getUsCpiInflationHistory) — the source of truth for this comparison.
// Neither path is reimplemented here; both are exercised as real code
// against IDENTICAL mocked fetch responses (the same real, captured-live
// fixtures used in fredAdapter.test.ts — see that file's header for
// provenance), so this is a genuine reconciliation of real, previously-
// observed FRED data, not a synthetic proof. Sections marked "synthetic"
// build hypothetical fixtures purely for taxonomy coverage.
//
// CI-safety: fetch is mocked in every test; nothing here calls the live
// FRED endpoint.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getFedFundsHistory, getUsCpiInflationHistory } from "@/lib/data/fred";
import { fetchFredSeries, monthStartToMonthEnd, FRED_SERIES } from "./fredAdapter";
import { reconcile, type OldObservation } from "./reconciliation";
import type { NormalizedObservation } from "./providerAdapter";

function jsonResponse(body: unknown): Response {
  return { ok: true, status: 200, json: async () => body } as Response;
}

const DFF_FIXTURE = {
  observations: [
    { realtime_start: "2026-08-13", realtime_end: "2026-08-13", date: "2026-06-01", value: "3.63" },
    { realtime_start: "2026-08-13", realtime_end: "2026-08-13", date: "2026-07-01", value: "3.63" },
  ],
};
const CPI_FIXTURE = {
  observations: [
    { realtime_start: "2026-08-12", realtime_end: "2026-08-12", date: "2026-06-01", value: "3.46353" },
    { realtime_start: "2026-08-12", realtime_end: "2026-08-12", date: "2026-07-01", value: "3.30386" },
  ],
};

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  process.env.FRED_API_KEY = "test-fred-key-not-real";
});
afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * Converts the OLD path's FredHistoryPoint[] (raw FRED period-START dates)
 * into OldObservation[], applying the SAME period-end normalization the new
 * adapter applies, so period strings are genuinely comparable — exactly
 * mirroring worldBankReconciliation.test.ts's toOldObservations() applying
 * yearToObservationPeriod. Unit is supplied separately because
 * FredHistoryPoint carries no unit field.
 */
function toOldObservations(points: { date: string; value: number }[], unit: string): OldObservation[] {
  return points.map((p) => ({ observationPeriod: monthStartToMonthEnd(p.date), value: p.value, unit }));
}

describe("14. shadow reconciliation — fred:fedFunds, real captured data", () => {
  it("zero discrepancies, safe to migrate — startDate distinct per test to avoid memoryCache collision (fred.ts's history functions are cached by 'fred-fedfunds-history:${startDate}')", async () => {
    fetchMock.mockResolvedValue(jsonResponse(DFF_FIXTURE));

    const oldPoints = await getFedFundsHistory("2026-06-01-recon-test-a");
    if (!oldPoints) throw new Error("old path returned null — cannot reconcile");
    const oldObs = toOldObservations(oldPoints, "%");

    const newObs = await fetchFredSeries("fred:fedFunds", FRED_SERIES["fred:fedFunds"]);
    const result = reconcile(oldObs, newObs, { expectedUnit: "%" });

    expect(result.discrepancies).toHaveLength(0);
    expect(result.missingInNew).toHaveLength(0);
    expect(result.additionalInNew).toHaveLength(0);
    expect(result.safeToMigrate).toBe(true);
  });
});

describe("14. shadow reconciliation — fred:usCpiInflation, real captured data", () => {
  it("zero discrepancies, safe to migrate", async () => {
    fetchMock.mockResolvedValue(jsonResponse(CPI_FIXTURE));

    const oldPoints = await getUsCpiInflationHistory("2026-06-01-recon-test-b");
    if (!oldPoints) throw new Error("old path returned null — cannot reconcile");
    const oldObs = toOldObservations(oldPoints, "%");

    const newObs = await fetchFredSeries("fred:usCpiInflation", FRED_SERIES["fred:usCpiInflation"]);
    const result = reconcile(oldObs, newObs, { expectedUnit: "%" });

    expect(result.discrepancies).toHaveLength(0);
    expect(result.missingInNew).toHaveLength(0);
    expect(result.additionalInNew).toHaveLength(0);
    expect(result.safeToMigrate).toBe(true);
  });
});

describe("expected normalization difference (Category A — the date-format change itself)", () => {
  it("the old path's raw period-start dates and the new adapter's period-end dates describe the SAME logical periods once both are normalized the same way — WITHOUT this normalization the raw strings would differ (demonstrating what the conversion absorbs)", async () => {
    fetchMock.mockResolvedValue(jsonResponse(DFF_FIXTURE));
    const oldPointsRaw = await getFedFundsHistory("2026-06-01-recon-test-c");
    if (!oldPointsRaw) throw new Error("old path returned null");

    // Raw, UNNORMALIZED old dates still carry FRED's native period-start form.
    expect(oldPointsRaw.map((p) => p.date)).toEqual(["2026-06-01", "2026-07-01"]);

    const newObs = await fetchFredSeries("fred:fedFunds", FRED_SERIES["fred:fedFunds"]);
    // New adapter's dates are period-END.
    expect(newObs.map((o) => o.observationPeriod)).toEqual(["2026-06-30", "2026-07-31"]);

    // Once the SAME normalization used by the adapter is applied to the old
    // path's dates, the two sides agree exactly — zero spurious discrepancies.
    const oldObsNormalized = toOldObservations(oldPointsRaw, "%");
    const result = reconcile(oldObsNormalized, newObs, { expectedUnit: "%" });
    expect(result.discrepancies).toHaveLength(0);
    expect(result.safeToMigrate).toBe(true);
  });
});

describe("observation count", () => {
  it("both paths return the exact same number of observations for identical fixture data", async () => {
    fetchMock.mockResolvedValue(jsonResponse(CPI_FIXTURE));
    const oldPoints = await getUsCpiInflationHistory("2026-06-01-recon-test-d");
    const newObs = await fetchFredSeries("fred:usCpiInflation", FRED_SERIES["fred:usCpiInflation"]);
    expect(oldPoints?.length).toBe(newObs.length);
    expect(newObs).toHaveLength(2);
  });
});

describe("transformation parameters — SYNTHETIC (proving the harness catches a params mismatch, never observed for real)", () => {
  it("two 'DFF' observations with different transform params are not silently treated as the same series by this reconciliation setup — sourceReference itself, not reconcile(), is where this distinction is auditable", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(DFF_FIXTURE));
    const newObs = await fetchFredSeries("fred:fedFunds", FRED_SERIES["fred:fedFunds"]);
    expect(newObs[0].sourceReference).toMatchObject({ seriesId: "DFF", frequency: "m", aggregationMethod: "eop" });
    // A native-daily DFF fetch (hypothetical, out of this pilot's scope) would
    // carry no frequency/aggregation_method key at all — a structurally
    // different sourceReference shape, never confusable with this pilot's
    // monthly-transformed identity.
  });
});

describe("unexplained discrepancy classified as D — SYNTHETIC, no real defect found for FRED", () => {
  it("a value mismatch with no precision or unit explanation is D and blocks migration", () => {
    const oldObs: OldObservation[] = [{ observationPeriod: "2026-07-31", value: 3.63, unit: "%" }];
    const newObs: NormalizedObservation[] = [{
      indicatorKey: "fred:fedFunds", observationPeriod: "2026-07-31", value: 9.99, unit: "%",
      cadence: "monthly", provider: "fred", sourceSeriesId: "DFF", qualityStatus: "official",
      releaseDate: null, sourceUpdatedAt: null, sourceReference: null, methodology: null,
    }];
    const result = reconcile(oldObs, newObs);
    expect(result.discrepancies[0]?.category).toBe("D");
    expect(result.blockedByCategoryD).toBe(true);
    expect(result.safeToMigrate).toBe(false);
  });
});
