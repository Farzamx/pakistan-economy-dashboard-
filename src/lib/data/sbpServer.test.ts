// Phase 8.0 tests — the freshness-invariant fix in applyCanonicalOverride /
// applyCanonicalOverrideToHistory (sbpServer.ts), plus the PBS_PRIMARY_SERIES_SLUGS
// rename's behavioral equivalence. All I/O (sbp.ts, latestReleasedEventValue.ts)
// is mocked; no live SBP/PBS/Supabase access.

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FreshnessResult } from "@/lib/freshness/freshnessEngine";

const getSbpIndicatorMock = vi.hoisted(() => vi.fn());
const getAllSbpIndicatorsMock = vi.hoisted(() => vi.fn());
const getSbpIndicatorHistoryMock = vi.hoisted(() => vi.fn());
const evaluateSbpFreshnessMock = vi.hoisted(() => vi.fn());
const getLatestReleasedEventValueMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/data/sbp", () => ({
  getSbpIndicator: getSbpIndicatorMock,
  getAllSbpIndicators: getAllSbpIndicatorsMock,
  getSbpIndicatorHistory: getSbpIndicatorHistoryMock,
  evaluateSbpFreshness: evaluateSbpFreshnessMock,
  // Pass-through re-exports sbpServer.ts also re-exports from sbp.ts —
  // stubbed only so the module resolves; not exercised by these tests.
  getSbpIndicatorFresh: vi.fn(),
  getFoodInflationUrbanHistory: vi.fn(),
  getMoneySupplyM2YoyGrowth: vi.fn(),
  sbpCacheTag: vi.fn(),
}));
vi.mock("@/lib/data/latestReleasedEventValue", () => ({
  getLatestReleasedEventValue: getLatestReleasedEventValueMock,
}));

const { getSbpIndicator, getAllSbpIndicators, getSbpIndicatorHistory } = await import("./sbpServer");

const OLD_FRESHNESS: FreshnessResult = {
  state: "stale", severity: "problem", seriesId: "sbp:cpiInflation", observationPeriod: "2026-06-30",
  expectedPeriodOrDate: null, expectedDateSource: null, ageDays: 60, reasonCode: "beyond-grace",
  reason: "old", evidence: [],
};
const NEW_FRESHNESS: FreshnessResult = {
  state: "current", severity: "healthy", seriesId: "sbp:cpiInflation", observationPeriod: "2026-07-31",
  expectedPeriodOrDate: "2026-08-31", expectedDateSource: "cadence", ageDays: 12, reasonCode: "within-cadence-window",
  reason: "new", evidence: [],
};

function sbpResult(observationDate: string) {
  return {
    kpi: { title: "CPI Inflation", value: "9.0", unit: "%", change: "+0.2 pp vs Jun", trend: "up" as const, glow: "purple" as const, source: "SBP EasyData", seriesId: "TS_X", latestDate: observationDate, frequency: "Monthly" as const, sourceStatus: "live" as const, freshness: OLD_FRESHNESS },
    trend: [{ month: "Jun 2026", value: 9.0 }],
    meta: { source: "SBP EasyData" as const, seriesKey: "TS_X", seriesName: "CPI", unit: "Percent", frequency: "Monthly" as const, observationDate, lastUpdated: "2026-08-01T00:00:00.000Z", sourceStatus: "live" as const, freshness: OLD_FRESHNESS },
  };
}

function sbpHistory(latestDate: string) {
  return {
    points: [{ date: latestDate, value: 9.0 }],
    meta: { source: "SBP EasyData" as const, seriesKey: "TS_X", seriesName: "CPI", unit: "Percent", frequency: "Monthly" as const, observationDate: latestDate, lastUpdated: "2026-08-01T00:00:00.000Z", sourceStatus: "live" as const, freshness: OLD_FRESHNESS },
  };
}

beforeEach(() => {
  getSbpIndicatorMock.mockReset();
  getAllSbpIndicatorsMock.mockReset();
  getSbpIndicatorHistoryMock.mockReset();
  evaluateSbpFreshnessMock.mockReset();
  getLatestReleasedEventValueMock.mockReset();
  evaluateSbpFreshnessMock.mockReturnValue(NEW_FRESHNESS);
});

describe("applyCanonicalOverride (via getSbpIndicator) — freshness invariant fix", () => {
  it("9/10. recomputes freshness for the NEW observation date and stamps both meta.freshness and kpi.freshness", async () => {
    getSbpIndicatorMock.mockResolvedValue(sbpResult("2026-06-30"));
    getLatestReleasedEventValueMock.mockResolvedValue({ value: 9.2, observationDate: "2026-07-31", sourceName: "PBS", formattedValue: "+9.2% YoY" });

    const result = await getSbpIndicator("cpiInflation");

    // The engine must be asked about the NEW date, never the stale SBP one.
    expect(evaluateSbpFreshnessMock).toHaveBeenCalledTimes(1);
    const [, metaArg] = evaluateSbpFreshnessMock.mock.calls[0];
    expect(metaArg.observationDate).toBe("2026-07-31");

    expect(result.meta.freshness).toBe(NEW_FRESHNESS);
    expect(result.kpi.freshness).toBe(NEW_FRESHNESS);
    expect(result.meta.observationDate).toBe("2026-07-31");
  });

  it("11. the stale verdict from the OLD observation date is never left attached (the exact Phase 6 regression)", async () => {
    getSbpIndicatorMock.mockResolvedValue(sbpResult("2026-06-30"));
    getLatestReleasedEventValueMock.mockResolvedValue({ value: 9.2, observationDate: "2026-07-31", sourceName: "PBS", formattedValue: "+9.2% YoY" });

    const result = await getSbpIndicator("cpiInflation");

    expect(result.meta.freshness).not.toBe(OLD_FRESHNESS);
    expect(result.kpi.freshness).not.toBe(OLD_FRESHNESS);
  });

  it("12. no override, no recompute: when PBS does not cover a newer period, the result (including its original freshness) is untouched", async () => {
    const served = sbpResult("2026-07-31");
    getSbpIndicatorMock.mockResolvedValue(served);
    getLatestReleasedEventValueMock.mockResolvedValue({ value: 9.0, observationDate: "2026-07-31", sourceName: "PBS", formattedValue: "+9.0% YoY" });

    const result = await getSbpIndicator("cpiInflation");

    expect(evaluateSbpFreshnessMock).not.toHaveBeenCalled();
    expect(result.meta.freshness).toBe(OLD_FRESHNESS);
    expect(result.kpi.freshness).toBe(OLD_FRESHNESS);
    expect(result).toEqual(served);
  });

  it("non-PBS-primary indicators short-circuit immediately -- getLatestReleasedEventValue is never called", async () => {
    getSbpIndicatorMock.mockResolvedValue(sbpResult("2026-07-31"));

    await getSbpIndicator("usdPkr");

    expect(getLatestReleasedEventValueMock).not.toHaveBeenCalled();
    expect(evaluateSbpFreshnessMock).not.toHaveBeenCalled();
  });
});

describe("applyCanonicalOverrideToHistory (via getSbpIndicatorHistory) — freshness invariant fix", () => {
  it("9/10. recomputes and stamps meta.freshness for the appended PBS point's date", async () => {
    getSbpIndicatorHistoryMock.mockResolvedValue(sbpHistory("2026-06-30"));
    getLatestReleasedEventValueMock.mockResolvedValue({ value: 9.2, observationDate: "2026-07-31", sourceName: "PBS", formattedValue: "+9.2% YoY" });

    const result = await getSbpIndicatorHistory("cpiInflation");

    const [, metaArg] = evaluateSbpFreshnessMock.mock.calls[0];
    expect(metaArg.observationDate).toBe("2026-07-31");
    expect(result.meta.freshness).toBe(NEW_FRESHNESS);
    expect(result.points[result.points.length - 1]).toEqual({ date: "2026-07-31", value: 9.2 });
  });

  it("12. no override when PBS does not cover a newer period than the last history point", async () => {
    const served = sbpHistory("2026-07-31");
    getSbpIndicatorHistoryMock.mockResolvedValue(served);
    getLatestReleasedEventValueMock.mockResolvedValue({ value: 9.0, observationDate: "2026-07-31", sourceName: "PBS", formattedValue: "+9.0% YoY" });

    const result = await getSbpIndicatorHistory("cpiInflation");

    expect(evaluateSbpFreshnessMock).not.toHaveBeenCalled();
    expect(result).toEqual(served);
  });
});

describe("getAllSbpIndicators — every existing caller inherits the fix", () => {
  it("applies the recomputed freshness to every PBS-primary indicator in the bulk fetch, unmodified for the rest", async () => {
    const base: Record<string, ReturnType<typeof sbpResult>> = {
      cpiInflation: sbpResult("2026-06-30"),
      usdPkr: sbpResult("2026-07-31"),
    };
    getAllSbpIndicatorsMock.mockResolvedValue(base);
    getLatestReleasedEventValueMock.mockImplementation(async (slug: string) =>
      slug === "cpi-inflation-release" ? { value: 9.2, observationDate: "2026-07-31", sourceName: "PBS", formattedValue: "+9.2% YoY" } : null,
    );

    const result = await getAllSbpIndicators();

    expect(result.cpiInflation.meta.freshness).toBe(NEW_FRESHNESS);
    // usdPkr is not PBS-primary -- getAllSbpIndicators only maps PBS-primary
    // keys through the override, so it is returned byte-for-byte from `base`.
    expect(result.usdPkr).toBe(base.usdPkr);
  });
});
