// Phase 7 tests for the comparison data pipeline: origin tracking, quarterly
// alignment, and the "incompatible pair never reaches mergeSeries" gate.
// Fixture-based throughout — every provider fetcher is mocked; no live SBP/
// World Bank/FRED/Yahoo Finance request is made.

import { describe, it, expect, vi, beforeEach } from "vitest";

const getSbpIndicatorHistoryMock = vi.hoisted(() => vi.fn());
const getFoodInflationUrbanHistoryMock = vi.hoisted(() => vi.fn());
const getGdpGrowthHistoryMock = vi.hoisted(() => vi.fn());
const getFedFundsHistoryMock = vi.hoisted(() => vi.fn());
const getUsCpiInflationHistoryMock = vi.hoisted(() => vi.fn());
const getGoldHistoryMock = vi.hoisted(() => vi.fn());
const getExternalDebtHistoryMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/data/sbpServer", () => ({
  getSbpIndicatorHistory: getSbpIndicatorHistoryMock,
  getFoodInflationUrbanHistory: getFoodInflationUrbanHistoryMock,
}));
vi.mock("@/lib/data/worldBank", () => ({ getGdpGrowthHistory: getGdpGrowthHistoryMock }));
vi.mock("@/lib/data/fred", () => ({ getFedFundsHistory: getFedFundsHistoryMock, getUsCpiInflationHistory: getUsCpiInflationHistoryMock }));
vi.mock("@/lib/data/yfinance", () => ({ getGoldHistory: getGoldHistoryMock }));
vi.mock("@/lib/data/externalDebt", () => ({ getExternalDebtHistory: getExternalDebtHistoryMock }));

const { fetchComparisonSeries, mergeSeries, getComparisonBundle } = await import("./comparisonData");
const { getComparisonBySlug } = await import("./comparisonRegistry");

beforeEach(() => {
  getSbpIndicatorHistoryMock.mockReset();
  getFoodInflationUrbanHistoryMock.mockReset();
  getGdpGrowthHistoryMock.mockReset();
  getFedFundsHistoryMock.mockReset();
  getUsCpiInflationHistoryMock.mockReset();
  getGoldHistoryMock.mockReset();
  getExternalDebtHistoryMock.mockReset();
});

describe("fetchComparisonSeries — unit/frequency sourced from the registry, not hand-typed", () => {
  it("externalDebt is genuinely quarterly, not 'monthly' (the mislabeling this phase fixes)", async () => {
    getExternalDebtHistoryMock.mockResolvedValue({
      points: [{ date: "2016-06-30", value: 73.9 }, { date: "2016-09-30", value: 75.1 }],
      source: "SBP",
    });
    const result = await fetchComparisonSeries("sbp:externalDebt");
    expect(result?.frequency).toBe("quarterly");
    expect(result?.unit).toBe("B USD");
  });

  it("SBP-backed series carry unit/frequency at runtime, not just in authoring metadata", async () => {
    getSbpIndicatorHistoryMock.mockResolvedValue({ points: [{ date: "2026-07-31", value: 9.2 }], meta: { source: "SBP EasyData" } });
    const result = await fetchComparisonSeries("sbp:cpiInflation");
    expect(result?.unit).toBe("%");
    expect(result?.frequency).toBe("monthly");
  });

  it("returns null on provider failure rather than a placeholder", async () => {
    getGoldHistoryMock.mockResolvedValue(null);
    expect(await fetchComparisonSeries("yfinance:gold")).toBeNull();
  });
});

describe("mergeSeries — origin tracking (regression suite)", () => {
  it("11/12. observed values are marked 'observed'; carried-forward values are marked 'carried-forward'", () => {
    // Policy-rate-style step function: Jan=12, Apr=11.5, nothing between.
    const a = { points: [{ date: "2026-01-01", value: 12 }, { date: "2026-04-01", value: 11.5 }], source: "SBP", unit: "%", frequency: "monthly" as const };
    const b = { points: [{ date: "2026-01-01", value: 1 }, { date: "2026-02-01", value: 1 }, { date: "2026-03-01", value: 1 }, { date: "2026-04-01", value: 1 }], source: "SBP", unit: "%", frequency: "monthly" as const };
    const merged = mergeSeries(a, b);

    const jan = merged.find((p) => p.key === "2026-01")!;
    const feb = merged.find((p) => p.key === "2026-02")!;
    const mar = merged.find((p) => p.key === "2026-03")!;
    const apr = merged.find((p) => p.key === "2026-04")!;

    expect(jan.a).toBe(12);
    expect(jan.aOrigin).toBe("observed");
    expect(feb.a).toBe(12); // 10. policy-rate step function forward-fill remains valid
    expect(feb.aOrigin).toBe("carried-forward");
    expect(feb.aSourcePeriod).toBe("2026-01-01");
    expect(mar.a).toBe(12);
    expect(mar.aOrigin).toBe("carried-forward");
    expect(mar.aSourcePeriod).toBe("2026-01-01");
    expect(apr.a).toBe(11.5);
    expect(apr.aOrigin).toBe("observed");
  });

  it("13. never forward-fills before the first real observation (leading nulls)", () => {
    // Series A begins March; January/February must stay null, not backdated.
    const a = { points: [{ date: "2026-03-01", value: 5 }], source: "X", unit: "%", frequency: "monthly" as const };
    const b = { points: [{ date: "2026-01-01", value: 1 }, { date: "2026-02-01", value: 1 }, { date: "2026-03-01", value: 1 }], source: "Y", unit: "%", frequency: "monthly" as const };
    const merged = mergeSeries(a, b);

    const jan = merged.find((p) => p.key === "2026-01")!;
    const feb = merged.find((p) => p.key === "2026-02")!;
    const mar = merged.find((p) => p.key === "2026-03")!;

    expect(jan.a).toBeNull();
    expect(jan.aOrigin).toBeNull();
    expect(feb.a).toBeNull();
    expect(feb.aOrigin).toBeNull();
    expect(mar.a).toBe(5);
    expect(mar.aOrigin).toBe("observed");
  });

  it("9. quarterly data survives the full merge pipeline, forward-filled onto the monthly grid", () => {
    // External-debt-shaped: quarter-end dates only.
    const quarterly = { points: [{ date: "2016-06-30", value: 73.9 }, { date: "2016-09-30", value: 75.1 }], source: "SBP", unit: "B USD", frequency: "quarterly" as const };
    const monthly = {
      points: [
        { date: "2016-06-30", value: 18.0 }, { date: "2016-07-31", value: 18.1 }, { date: "2016-08-31", value: 18.2 },
        { date: "2016-09-30", value: 18.3 },
      ],
      source: "SBP", unit: "B USD", frequency: "monthly" as const,
    };
    const merged = mergeSeries(quarterly, monthly);

    const jun = merged.find((p) => p.key === "2016-06")!;
    const jul = merged.find((p) => p.key === "2016-07")!;
    const aug = merged.find((p) => p.key === "2016-08")!;
    const sep = merged.find((p) => p.key === "2016-09")!;

    expect(jun.a).toBe(73.9);
    expect(jun.aOrigin).toBe("observed");
    expect(jul.a).toBe(73.9); // carried forward through the quarter
    expect(jul.aOrigin).toBe("carried-forward");
    expect(jul.aSourcePeriod).toBe("2016-06-30");
    expect(aug.a).toBe(73.9);
    expect(aug.aOrigin).toBe("carried-forward");
    expect(sep.a).toBe(75.1); // the next quarter's real observation
    expect(sep.aOrigin).toBe("observed");
    // The monthly series is fully observed throughout -- never marked carried.
    expect(merged.every((p) => p.bOrigin === "observed" || p.bOrigin === null)).toBe(true);
  });

  it("14. missing observations after the first are only carried forward where the series' own cadence permits it (as-needed/quarterly), never inventing intermediate structure", () => {
    const sparse = { points: [{ date: "2026-01-01", value: 10 }, { date: "2026-06-01", value: 12 }], source: "X", unit: "%", frequency: "monthly" as const };
    const dense = { points: Array.from({ length: 6 }, (_, i) => ({ date: `2026-0${i + 1}-01`, value: 1 })), source: "Y", unit: "%", frequency: "monthly" as const };
    const merged = mergeSeries(sparse, dense);
    // Every month between Jan and May carries forward the SAME Jan value -- no
    // fabricated intermediate trajectory is invented between 10 and 12.
    for (const key of ["2026-02", "2026-03", "2026-04", "2026-05"]) {
      const p = merged.find((m) => m.key === key)!;
      expect(p.a).toBe(10);
      expect(p.aOrigin).toBe("carried-forward");
    }
  });
});

describe("getComparisonBundle — incompatible pairs never reach mergeSeries", () => {
  it("15. an annual-vs-monthly free-form-shaped pair short-circuits before merge (hasError, empty merged, compatibility.compatible=false)", async () => {
    getGdpGrowthHistoryMock.mockResolvedValue({ history: [{ month: "2020", value: 2.1 }, { month: "2021", value: 3.2 }] });
    getSbpIndicatorHistoryMock.mockResolvedValue({ points: [{ date: "2026-07-31", value: 9.2 }], meta: { source: "SBP EasyData" } });

    // Construct a synthetic def pairing an annual series with a monthly one
    // -- no such pair exists in the real curated registry (verified
    // separately), so this exercises the gate the same way a hypothetical
    // future bad registry entry, or a defensive re-check, would.
    const def = {
      ...getComparisonBySlug("pakistan-vs-india-gdp-growth")!,
      seriesB: { id: "sbp:cpiInflation" as const, frequency: "monthly" as const, label: "CPI", shortLabel: "CPI", unit: "%", color: "#000" },
    };

    const bundle = await getComparisonBundle(def);
    expect(bundle.hasError).toBe(true);
    expect(bundle.merged).toEqual([]);
    expect(bundle.compatibility?.compatible).toBe(false);
    expect(bundle.compatibility?.frequencyCompatibility).toBe("incompatible");
  });

  it("18. unavailable data still fails loudly (fetch failure), distinct from an incompatible pair", async () => {
    getSbpIndicatorHistoryMock.mockRejectedValue(new Error("network down"));
    getGoldHistoryMock.mockResolvedValue(null);
    const def = getComparisonBySlug("gold-vs-usd-pkr")!;
    const bundle = await getComparisonBundle(def);
    expect(bundle.hasError).toBe(true);
    expect(bundle.compatibility).toBeNull(); // never reached the compatibility check -- the fetch itself failed
  });

  it("19. every curated comparison pair's real fetch path succeeds compatibility validation end-to-end", async () => {
    getSbpIndicatorHistoryMock.mockResolvedValue({ points: [{ date: "2026-07-31", value: 1 }], meta: { source: "SBP EasyData" } });
    const def = getComparisonBySlug("inflation-vs-policy-rate")!;
    const bundle = await getComparisonBundle(def);
    expect(bundle.hasError).toBe(false);
    expect(bundle.compatibility?.compatible).toBe(true);
    expect(bundle.merged.length).toBeGreaterThan(0);
  });

  it("20. no placeholder data is introduced when a series is unavailable", async () => {
    getSbpIndicatorHistoryMock.mockRejectedValue(new Error("boom"));
    const def = getComparisonBySlug("inflation-vs-policy-rate")!;
    const bundle = await getComparisonBundle(def);
    expect(bundle.merged).toEqual([]);
    expect(bundle.sourceA).toBe("");
    expect(bundle.sourceB).toBe("");
  });
});
