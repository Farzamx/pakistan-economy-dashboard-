import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { SbpIndicatorKey } from "@/lib/data/sbp";
import type { SeriesDefinition } from "@/lib/freshness/freshnessEngine";

const getSbpIndicatorMock = vi.hoisted(() => vi.fn());
const getAllSbpIndicatorKeysMock = vi.hoisted(() => vi.fn());
const getLatestCanonicalProvenanceMock = vi.hoisted(() => vi.fn());
const getSourceHealthSummaryMock = vi.hoisted(() => vi.fn());
const getSbpSeriesDefinitionMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/data/sbp", () => ({
  getSbpIndicator: getSbpIndicatorMock,
  getAllSbpIndicatorKeys: getAllSbpIndicatorKeysMock,
  SBP_FREQ_MAP: { Monthly: "Monthly", "As-Needed": "As Needed", Weekly: "Weekly", Annual: "Annual" },
}));
vi.mock("@/lib/data/canonicalResolutionConfig", () => ({
  canonicalIndicatorKey: (key: string) => `sbp:${key}`,
}));
vi.mock("@/lib/freshness/canonicalProvenanceStore", () => ({
  getLatestCanonicalProvenance: getLatestCanonicalProvenanceMock,
}));
vi.mock("@/lib/economicCalendar/sourceHealthTracker", () => ({
  getSourceHealthSummary: getSourceHealthSummaryMock,
}));
vi.mock("@/lib/freshness/seriesRegistry", () => ({
  getSbpSeriesDefinition: getSbpSeriesDefinitionMock,
}));

const { runShadowFreshnessComparison } = await import("./shadowFreshnessAdapter");

const NOW = new Date("2026-08-12T12:00:00.000Z");

function monthlySeries(key: string): SeriesDefinition {
  return {
    seriesId: `sbp:${key}`,
    provider: "sbp-easydata",
    cadence: "monthly",
    graceDays: 40,
    expectsReleaseDate: false,
    expectsSourceUpdatedAt: false,
  };
}

function servedResult(observationDate: string, sourceStatus: string = "live") {
  return {
    kpi: { title: "Test", value: "1", unit: "", change: "", trend: "neutral" as const, glow: "blue" as const },
    trend: [],
    meta: {
      source: "SBP EasyData" as const,
      seriesKey: "TS_GP_TEST",
      seriesName: "Test Series",
      unit: "Percent",
      frequency: "Monthly" as const,
      observationDate,
      lastUpdated: new Date().toISOString(),
      sourceStatus: sourceStatus as never,
    },
  };
}

beforeEach(() => {
  getSbpIndicatorMock.mockReset();
  getAllSbpIndicatorKeysMock.mockReset();
  getLatestCanonicalProvenanceMock.mockReset();
  getSourceHealthSummaryMock.mockReset();
  getSbpSeriesDefinitionMock.mockReset();
  getSbpSeriesDefinitionMock.mockImplementation((key: string) => monthlySeries(key));
  getSourceHealthSummaryMock.mockResolvedValue([]);
  getLatestCanonicalProvenanceMock.mockResolvedValue(null);

  // NOW is already threaded explicitly into runShadowFreshnessComparison,
  // which covers the NEW freshness engine. The OLD system it is compared
  // against (dataFreshness.ts's getFreshnessStatus) reads `new Date()`
  // internally and has no injection seam, so without pinning the clock these
  // comparisons silently drifted with the real date -- they passed in August
  // and began failing on 2026-09-01 once the fixtures' observation dates aged
  // past the old system's "Delayed" threshold. Faking only Date (timers stay
  // real) aligns both systems on the same NOW without touching production
  // thresholds or classification logic.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("runShadowFreshnessComparison", () => {
  it("never throws when one indicator's evaluation fails, and still evaluates the rest", async () => {
    getAllSbpIndicatorKeysMock.mockReturnValue(["broken", "usdPkr"] as unknown as SbpIndicatorKey[]);
    getSbpIndicatorMock.mockImplementation(async (key: string) => {
      if (key === "broken") throw new Error("simulated failure");
      return servedResult("2026-07-31");
    });

    const entries = await runShadowFreshnessComparison(["broken", "usdPkr"] as unknown as SbpIndicatorKey[], NOW);
    expect(entries).toHaveLength(1);
    expect(entries[0].indicatorKey).toBe("usdPkr");
  });

  // 45 days before NOW, monthly cadence: due date = period + 31d; under the
  // corrected Model A semantics (Phase 5.1 -- graceDays=40 is the TOTAL
  // tolerance from observationPeriod, matching systemHealth.ts, so the
  // remaining buffer past the cadence due date is 40-31=9 days), 45 days
  // overdue by 14 days is beyond that 9-day remaining buffer -> stale. This
  // is still well within the OLD system's much coarser flat Monthly
  // threshold (THRESHOLDS.Monthly delayedAt=60 -- so 45 days still reads
  // "current"/"Verified" there). The real, evidence-based gap Phase 5
  // exists to surface: the old system's flat age threshold is too
  // permissive to notice this indicator has already missed its
  // precisely-modeled expected release window.
  const FORTY_FIVE_DAYS_AGO = "2026-06-28";

  it("flags a disagreement when the old system still says Verified but the new engine has moved past its due date", async () => {
    getSbpIndicatorMock.mockResolvedValue(servedResult(FORTY_FIVE_DAYS_AGO, "live"));
    getLatestCanonicalProvenanceMock.mockResolvedValue({
      observationPeriod: FORTY_FIVE_DAYS_AGO,
      value: 1,
      unit: "Percent",
      vintage: NOW.toISOString(),
      releaseDate: null,
      sourceUpdatedAt: null,
      fetchedAt: NOW.toISOString(),
      qualityStatus: "official",
      sourceSeriesId: "TS_GP_TEST",
      sourceReference: null,
    });

    const entries = await runShadowFreshnessComparison(["cpiInflation"] as unknown as SbpIndicatorKey[], NOW);
    expect(entries).toHaveLength(1);
    const entry = entries[0];
    expect(entry.oldDataQualityState).toBe("Verified");
    expect(entry.newState).toBe("stale");
    expect(entry.agree).toBe(false);
    expect(entry.disagreementReason).toContain("stale");
  });

  it("agrees when both systems consider a fresh observation healthy", async () => {
    getSbpIndicatorMock.mockResolvedValue(servedResult("2026-07-31", "live"));
    getLatestCanonicalProvenanceMock.mockResolvedValue({
      observationPeriod: "2026-07-31",
      value: 1,
      unit: "Percent",
      vintage: NOW.toISOString(),
      releaseDate: null,
      sourceUpdatedAt: null,
      fetchedAt: NOW.toISOString(),
      qualityStatus: "official",
      sourceSeriesId: "TS_GP_TEST",
      sourceReference: null,
    });

    const entries = await runShadowFreshnessComparison(["cpiInflation"] as unknown as SbpIndicatorKey[], NOW);
    expect(entries[0].newState).toBe("current");
    expect(entries[0].agree).toBe(true);
    expect(entries[0].disagreementReason).toBeNull();
  });

  it("agrees when both systems consider a very old observation unhealthy (both escalate, just via different reasoning)", async () => {
    getSbpIndicatorMock.mockResolvedValue(servedResult("2026-01-01", "live"));
    getLatestCanonicalProvenanceMock.mockResolvedValue({
      observationPeriod: "2026-01-01",
      value: 1,
      unit: "Percent",
      vintage: NOW.toISOString(),
      releaseDate: null,
      sourceUpdatedAt: null,
      fetchedAt: NOW.toISOString(),
      qualityStatus: "official",
      sourceSeriesId: "TS_GP_TEST",
      sourceReference: null,
    });

    const entries = await runShadowFreshnessComparison(["cpiInflation"] as unknown as SbpIndicatorKey[], NOW);
    expect(entries[0].newState).toBe("stale");
    expect(entries[0].oldDataQualityState).not.toBe("Verified");
    expect(entries[0].agree).toBe(true);
  });

  it("never calls any write RPC or mutates served data — read-only by construction", async () => {
    getSbpIndicatorMock.mockResolvedValue(servedResult("2026-07-31"));
    await runShadowFreshnessComparison(["cpiInflation"] as unknown as SbpIndicatorKey[], NOW);
    // Structural guarantee: the mocked getSbpIndicator is a read, and no
    // write-shaped function (ingest_raw_observation/resolve_canonical_observation)
    // is imported anywhere in this module — verified by inspection of
    // shadowFreshnessAdapter.ts's import list, and reinforced here by the
    // fact getSbpIndicator was called with no arguments beyond the key.
    expect(getSbpIndicatorMock).toHaveBeenCalledWith("cpiInflation");
    expect(getSbpIndicatorMock.mock.calls[0]).toHaveLength(1);
  });

  it("falls back to the served meta's observationDate when no provenance row exists (never-ingested)", async () => {
    getSbpIndicatorMock.mockResolvedValue(servedResult("2026-07-31"));
    getLatestCanonicalProvenanceMock.mockResolvedValue(null);

    const entries = await runShadowFreshnessComparison(["cpiInflation"] as unknown as SbpIndicatorKey[], NOW);
    expect(entries[0].observationPeriod).toBe("2026-07-31");
  });

  it("treats a failing source_health_log entry as lastIngestionAttemptFailed evidence", async () => {
    getSbpIndicatorMock.mockResolvedValue(servedResult("2026-01-01"));
    getLatestCanonicalProvenanceMock.mockResolvedValue({
      observationPeriod: "2026-01-01",
      value: 1,
      unit: "Percent",
      vintage: NOW.toISOString(),
      releaseDate: null,
      sourceUpdatedAt: null,
      fetchedAt: NOW.toISOString(),
      qualityStatus: "official",
      sourceSeriesId: "TS_GP_TEST",
      sourceReference: null,
    });
    getSourceHealthSummaryMock.mockResolvedValue([
      { sourceName: "sbp-easydata", seriesSlug: "cpiInflation", consecutiveFailures: 3, lastError: "boom" },
    ]);

    const entries = await runShadowFreshnessComparison(["cpiInflation"] as unknown as SbpIndicatorKey[], NOW);
    expect(entries[0].newState).toBe("source-unavailable");
  });
});

describe("runShadowFreshnessComparison — logging", () => {
  const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  afterEach(() => {
    logSpy.mockClear();
    errorSpy.mockClear();
  });

  it("logs a DISAGREEMENT line tagged [FreshnessShadow], with no secrets", async () => {
    getSbpIndicatorMock.mockResolvedValue(servedResult("2026-06-28", "live"));
    await runShadowFreshnessComparison(["cpiInflation"] as unknown as SbpIndicatorKey[], NOW);

    const logs = logSpy.mock.calls.map((c) => c.join(" "));
    expect(logs.some((l) => l.includes("[FreshnessShadow]") && l.includes("DISAGREEMENT"))).toBe(true);
    const allText = logs.join(" ");
    expect(allText).not.toMatch(/api_key/i);
    expect(allText).not.toContain("SBP_EASYDATA_API_KEY");
  });

  it("logs a summary line even when there are zero disagreements", async () => {
    getSbpIndicatorMock.mockResolvedValue(servedResult("2026-07-31", "live"));
    await runShadowFreshnessComparison(["cpiInflation"] as unknown as SbpIndicatorKey[], NOW);

    const logs = logSpy.mock.calls.map((c) => c.join(" "));
    expect(logs.some((l) => l.includes("0 disagreement"))).toBe(true);
  });

  it("logs an error diagnostic (not a thrown exception) when an indicator's evaluation fails", async () => {
    getSbpIndicatorMock.mockRejectedValue(new Error("network blip"));
    await runShadowFreshnessComparison(["cpiInflation"] as unknown as SbpIndicatorKey[], NOW);

    const errors = errorSpy.mock.calls.map((c) => c.join(" "));
    expect(errors.some((l) => l.includes("[FreshnessShadow]"))).toBe(true);
  });
});
