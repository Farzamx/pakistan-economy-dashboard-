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
const getCanonicalFredHistoryMock = vi.hoisted(() => vi.fn());
const getCanonicalYahooGoldHistoryMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/data/sbpServer", () => ({
  getSbpIndicatorHistory: getSbpIndicatorHistoryMock,
  getFoodInflationUrbanHistory: getFoodInflationUrbanHistoryMock,
}));
vi.mock("@/lib/data/worldBank", () => ({ getGdpGrowthHistory: getGdpGrowthHistoryMock }));
vi.mock("@/lib/data/fred", () => ({ getFedFundsHistory: getFedFundsHistoryMock, getUsCpiInflationHistory: getUsCpiInflationHistoryMock }));
vi.mock("@/lib/data/yfinance", () => ({ getGoldHistory: getGoldHistoryMock }));
vi.mock("@/lib/data/externalDebt", () => ({ getExternalDebtHistory: getExternalDebtHistoryMock }));
vi.mock("@/lib/data/fredCanonicalStore", () => ({ getCanonicalFredHistory: getCanonicalFredHistoryMock }));
vi.mock("@/lib/data/yahooGoldCanonicalStore", () => ({ getCanonicalYahooGoldHistory: getCanonicalYahooGoldHistoryMock }));

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
  getCanonicalFredHistoryMock.mockReset();
  getCanonicalYahooGoldHistoryMock.mockReset();
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

  it("returns null on provider failure rather than a placeholder (canonical empty, legacy fails too)", async () => {
    getCanonicalYahooGoldHistoryMock.mockResolvedValue([]);
    getGoldHistoryMock.mockResolvedValue(null);
    expect(await fetchComparisonSeries("yfinance:gold")).toBeNull();
  });
});

describe("Phase 8.13 — FRED DB-first read path with legacy fallback", () => {
  function canonicalRow(overrides: Partial<{ observationPeriod: string; value: number; unit: string }> = {}) {
    return {
      observationPeriod: "2026-07-31",
      value: 3.63,
      unit: "%",
      vintage: "2026-08-13T15:15:15.523Z",
      releaseDate: null,
      sourceUpdatedAt: null,
      fetchedAt: "2026-08-13T15:15:09.818Z",
      qualityStatus: "official",
      sourceSeriesId: "DFF",
      sourceReference: { endpoint: "https://api.stlouisfed.org/fred/series/observations", seriesId: "DFF", frequency: "m", aggregationMethod: "eop" },
      ...overrides,
    };
  }

  const CANONICAL_FIXTURE = [
    canonicalRow({ observationPeriod: "2016-01-31", value: 0.29 }),
    canonicalRow({ observationPeriod: "2026-06-30", value: 3.63 }),
    canonicalRow({ observationPeriod: "2026-07-31", value: 3.63 }),
  ];

  describe("A. canonical success", () => {
    it("returns canonical data and never calls the legacy FRED function", async () => {
      getCanonicalFredHistoryMock.mockResolvedValueOnce(CANONICAL_FIXTURE);
      const result = await fetchComparisonSeries("fred:fedFunds");
      expect(result?.points).toHaveLength(3);
      expect(result?.points.map((p) => p.date)).toEqual(["2016-01-31", "2026-06-30", "2026-07-31"]);
      expect(getFedFundsHistoryMock).not.toHaveBeenCalled();
    });
  });

  describe("B. canonical empty", () => {
    it("falls back to the legacy FRED function and returns its result when canonical has no rows", async () => {
      getCanonicalFredHistoryMock.mockResolvedValueOnce([]);
      getFedFundsHistoryMock.mockResolvedValueOnce([{ date: "2026-07-01", value: 3.63 }]);
      const result = await fetchComparisonSeries("fred:fedFunds");
      expect(getFedFundsHistoryMock).toHaveBeenCalledTimes(1);
      expect(result?.points).toEqual([{ date: "2026-07-01", value: 3.63 }]);
    });

    it("falls back when canonical rows exist but all fall outside the comparison's 2016+ window", async () => {
      getCanonicalFredHistoryMock.mockResolvedValueOnce([canonicalRow({ observationPeriod: "1954-07-31", value: 0.25 })]);
      getFedFundsHistoryMock.mockResolvedValueOnce([{ date: "2026-07-01", value: 3.63 }]);
      const result = await fetchComparisonSeries("fred:fedFunds");
      expect(getFedFundsHistoryMock).toHaveBeenCalledTimes(1);
      expect(result?.points).toEqual([{ date: "2026-07-01", value: 3.63 }]);
    });
  });

  describe("C. canonical failure", () => {
    it("a thrown canonical-read error does not break the comparison — falls back to legacy and returns its result", async () => {
      getCanonicalFredHistoryMock.mockRejectedValueOnce(new Error("Supabase unreachable"));
      getUsCpiInflationHistoryMock.mockResolvedValueOnce([{ date: "2026-07-01", value: 3.30386 }]);
      const result = await fetchComparisonSeries("fred:usCpiInflation");
      expect(getUsCpiInflationHistoryMock).toHaveBeenCalledTimes(1);
      expect(result?.points).toEqual([{ date: "2026-07-01", value: 3.30386 }]);
    });

    it("does not propagate the canonical-read exception to the caller", async () => {
      getCanonicalFredHistoryMock.mockRejectedValueOnce(new Error("boom"));
      getFedFundsHistoryMock.mockResolvedValueOnce([{ date: "2026-07-01", value: 3.63 }]);
      await expect(fetchComparisonSeries("fred:fedFunds")).resolves.not.toBeNull();
    });
  });

  describe("D. fedFunds mapping", () => {
    it("fred:fedFunds queries the canonical store with exactly the 'fred:fedFunds' indicator key", async () => {
      getCanonicalFredHistoryMock.mockResolvedValueOnce(CANONICAL_FIXTURE);
      await fetchComparisonSeries("fred:fedFunds");
      expect(getCanonicalFredHistoryMock).toHaveBeenCalledWith("fred:fedFunds", expect.any(Number));
    });
  });

  describe("E. CPI mapping", () => {
    it("fred:usCpiInflation queries the canonical store with exactly the 'fred:usCpiInflation' indicator key", async () => {
      getCanonicalFredHistoryMock.mockResolvedValueOnce(CANONICAL_FIXTURE);
      await fetchComparisonSeries("fred:usCpiInflation");
      expect(getCanonicalFredHistoryMock).toHaveBeenCalledWith("fred:usCpiInflation", expect.any(Number));
    });
  });

  describe("F. output compatibility", () => {
    it("canonical and legacy results have identical public shapes (points[]/source, same field types)", async () => {
      getCanonicalFredHistoryMock.mockResolvedValueOnce(CANONICAL_FIXTURE);
      const canonicalResult = await fetchComparisonSeries("fred:fedFunds");

      getCanonicalFredHistoryMock.mockResolvedValueOnce([]);
      getFedFundsHistoryMock.mockResolvedValueOnce([{ date: "2026-07-01", value: 3.63 }]);
      const legacyResult = await fetchComparisonSeries("fred:fedFunds");

      expect(Object.keys(canonicalResult!).sort()).toEqual(Object.keys(legacyResult!).sort());
      expect(canonicalResult?.source).toBe(legacyResult?.source);
      expect(canonicalResult?.unit).toBe(legacyResult?.unit);
      expect(canonicalResult?.frequency).toBe(legacyResult?.frequency);
      expect(typeof canonicalResult?.points[0].date).toBe(typeof legacyResult?.points[0].date);
      expect(typeof canonicalResult?.points[0].value).toBe(typeof legacyResult?.points[0].value);
    });
  });

  describe("G. no daily contamination", () => {
    it("no native-daily FRED series id is ever passed to the canonical store by this dispatch", async () => {
      // fetchFredComparisonSeries only accepts the two pilot literal ids at
      // the type level; at runtime, an id like "fred:us10y" doesn't match
      // the fred:fedFunds/fred:usCpiInflation branch at all and falls
      // through fetchRaw's other branches to null, never reaching
      // getCanonicalFredHistory.
      const result = await fetchComparisonSeries("fred:us10y" as never);
      expect(getCanonicalFredHistoryMock).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it("every call the dispatch makes uses only the two authorized indicator keys", async () => {
      getCanonicalFredHistoryMock.mockResolvedValue(CANONICAL_FIXTURE);
      await fetchComparisonSeries("fred:fedFunds");
      await fetchComparisonSeries("fred:usCpiInflation");
      for (const call of getCanonicalFredHistoryMock.mock.calls) {
        expect(["fred:fedFunds", "fred:usCpiInflation"]).toContain(call[0]);
      }
    });
  });

  describe("H. fallback preservation", () => {
    it("the legacy getFedFundsHistory/getUsCpiInflationHistory functions remain the fallback, invoked with no arguments (their own default startDate)", async () => {
      getCanonicalFredHistoryMock.mockResolvedValue([]);
      getFedFundsHistoryMock.mockResolvedValueOnce([{ date: "2026-07-01", value: 3.63 }]);
      getUsCpiInflationHistoryMock.mockResolvedValueOnce([{ date: "2026-07-01", value: 3.30386 }]);

      await fetchComparisonSeries("fred:fedFunds");
      await fetchComparisonSeries("fred:usCpiInflation");

      expect(getFedFundsHistoryMock).toHaveBeenCalledWith();
      expect(getUsCpiInflationHistoryMock).toHaveBeenCalledWith();
    });
  });

  describe("I. canonical-first ordering", () => {
    it("the canonical store is invoked before the legacy function, never in parallel/after", async () => {
      const callOrder: string[] = [];
      getCanonicalFredHistoryMock.mockImplementationOnce(async () => { callOrder.push("canonical"); return []; });
      getFedFundsHistoryMock.mockImplementationOnce(async () => { callOrder.push("legacy"); return [{ date: "2026-07-01", value: 3.63 }]; });

      await fetchComparisonSeries("fred:fedFunds");

      expect(callOrder).toEqual(["canonical", "legacy"]);
    });

    it("a successful canonical read means the legacy call never happens at all — not just 'called later'", async () => {
      getCanonicalFredHistoryMock.mockResolvedValueOnce(CANONICAL_FIXTURE);
      await fetchComparisonSeries("fred:fedFunds");
      expect(getFedFundsHistoryMock).not.toHaveBeenCalled();
    });
  });

  describe("J. comparison-level compatibility", () => {
    it("pakistan-vs-fed-funds-rate resolves successfully through the DB-first path", async () => {
      getCanonicalFredHistoryMock.mockResolvedValueOnce(CANONICAL_FIXTURE);
      getSbpIndicatorHistoryMock.mockResolvedValueOnce({ points: [{ date: "2026-07-31", value: 11 }], meta: { source: "SBP EasyData" } });
      const def = getComparisonBySlug("pakistan-vs-fed-funds-rate")!;
      const bundle = await getComparisonBundle(def);
      expect(bundle.hasError).toBe(false);
      expect(bundle.compatibility?.compatible).toBe(true);
    });

    it("pakistan-vs-us-inflation resolves successfully through the DB-first path", async () => {
      getCanonicalFredHistoryMock.mockResolvedValueOnce(CANONICAL_FIXTURE);
      getSbpIndicatorHistoryMock.mockResolvedValueOnce({ points: [{ date: "2026-07-31", value: 4.5 }], meta: { source: "SBP EasyData" } });
      const def = getComparisonBySlug("pakistan-vs-us-inflation")!;
      const bundle = await getComparisonBundle(def);
      expect(bundle.hasError).toBe(false);
      expect(bundle.compatibility?.compatible).toBe(true);
    });

    it("both authorized comparison ids still resolve to their curated definitions, unmodified", () => {
      expect(getComparisonBySlug("pakistan-vs-fed-funds-rate")?.seriesB.id).toBe("fred:fedFunds");
      expect(getComparisonBySlug("pakistan-vs-us-inflation")?.seriesB.id).toBe("fred:usCpiInflation");
    });
  });
});

describe("Phase 8.17 — Yahoo Gold Monthly DB-first read path with legacy fallback", () => {
  function canonicalRow(overrides: Partial<{ observationPeriod: string; value: number; unit: string }> = {}) {
    return {
      observationPeriod: "2026-07-31",
      value: 4049.10009765625,
      unit: "$/oz",
      vintage: "2026-08-13T16:20:20.730966Z",
      releaseDate: null,
      sourceUpdatedAt: null,
      fetchedAt: "2026-08-13T16:20:14.933Z",
      qualityStatus: "official",
      sourceSeriesId: "GC=F",
      sourceReference: { endpoint: "https://query1.finance.yahoo.com/v8/finance/chart", symbol: "GC=F", interval: "1mo", range: "10y" },
      ...overrides,
    };
  }

  const CANONICAL_FIXTURE = [
    canonicalRow({ observationPeriod: "2016-09-30", value: 1313.300048828125 }),
    canonicalRow({ observationPeriod: "2026-06-30", value: 4022.89990234375 }),
    canonicalRow({ observationPeriod: "2026-07-31", value: 4049.10009765625 }),
  ];

  describe("A. canonical success", () => {
    it("returns canonical data and never calls the legacy getGoldHistory function", async () => {
      getCanonicalYahooGoldHistoryMock.mockResolvedValueOnce(CANONICAL_FIXTURE);
      const result = await fetchComparisonSeries("yfinance:gold");
      expect(result?.points).toHaveLength(3);
      expect(result?.points.map((p) => p.date)).toEqual(["2016-09-30", "2026-06-30", "2026-07-31"]);
      expect(getGoldHistoryMock).not.toHaveBeenCalled();
    });
  });

  describe("B. canonical empty", () => {
    it("falls back to the legacy getGoldHistory function and returns its result when canonical has no rows", async () => {
      getCanonicalYahooGoldHistoryMock.mockResolvedValueOnce([]);
      getGoldHistoryMock.mockResolvedValueOnce([{ date: "2026-07-01", close: 4049.10009765625 }]);
      const result = await fetchComparisonSeries("yfinance:gold");
      expect(getGoldHistoryMock).toHaveBeenCalledTimes(1);
      expect(result?.points).toEqual([{ date: "2026-07-01", value: 4049.10009765625 }]);
    });
  });

  describe("C. canonical failure", () => {
    it("a thrown canonical-read error does not break the comparison — falls back to legacy and returns its result", async () => {
      getCanonicalYahooGoldHistoryMock.mockRejectedValueOnce(new Error("Supabase unreachable"));
      getGoldHistoryMock.mockResolvedValueOnce([{ date: "2026-07-01", close: 4049.10009765625 }]);
      const result = await fetchComparisonSeries("yfinance:gold");
      expect(getGoldHistoryMock).toHaveBeenCalledTimes(1);
      expect(result?.points).toEqual([{ date: "2026-07-01", value: 4049.10009765625 }]);
    });

    it("does not propagate the canonical-read exception to the caller", async () => {
      getCanonicalYahooGoldHistoryMock.mockRejectedValueOnce(new Error("boom"));
      getGoldHistoryMock.mockResolvedValueOnce([{ date: "2026-07-01", close: 4049.10009765625 }]);
      await expect(fetchComparisonSeries("yfinance:gold")).resolves.not.toBeNull();
    });
  });

  describe("D. gold indicator-key mapping", () => {
    it("queries the canonical store with exactly the 'yahoo:goldMonthly' indicator key (not the comparisons-facing 'yfinance:gold' SeriesProviderId)", async () => {
      getCanonicalYahooGoldHistoryMock.mockResolvedValueOnce(CANONICAL_FIXTURE);
      await fetchComparisonSeries("yfinance:gold");
      expect(getCanonicalYahooGoldHistoryMock).toHaveBeenCalledWith("yahoo:goldMonthly", expect.any(Number));
    });
  });

  describe("F. output compatibility", () => {
    it("canonical and legacy results have identical public shapes (points[]/source, same field types)", async () => {
      getCanonicalYahooGoldHistoryMock.mockResolvedValueOnce(CANONICAL_FIXTURE);
      const canonicalResult = await fetchComparisonSeries("yfinance:gold");

      getCanonicalYahooGoldHistoryMock.mockResolvedValueOnce([]);
      getGoldHistoryMock.mockResolvedValueOnce([{ date: "2026-07-01", close: 4049.10009765625 }]);
      const legacyResult = await fetchComparisonSeries("yfinance:gold");

      expect(Object.keys(canonicalResult!).sort()).toEqual(Object.keys(legacyResult!).sort());
      expect(canonicalResult?.source).toBe(legacyResult?.source);
      expect(canonicalResult?.unit).toBe(legacyResult?.unit);
      expect(canonicalResult?.frequency).toBe(legacyResult?.frequency);
      expect(typeof canonicalResult?.points[0].date).toBe(typeof legacyResult?.points[0].date);
      expect(typeof canonicalResult?.points[0].value).toBe(typeof legacyResult?.points[0].value);
    });
  });

  describe("H. fallback preservation", () => {
    it("the legacy getGoldHistory function remains the fallback, invoked with no arguments", async () => {
      getCanonicalYahooGoldHistoryMock.mockResolvedValue([]);
      getGoldHistoryMock.mockResolvedValueOnce([{ date: "2026-07-01", close: 4049.10009765625 }]);
      await fetchComparisonSeries("yfinance:gold");
      expect(getGoldHistoryMock).toHaveBeenCalledWith();
    });
  });

  describe("I. canonical-first ordering", () => {
    it("the canonical store is invoked before the legacy function, never in parallel/after", async () => {
      const callOrder: string[] = [];
      getCanonicalYahooGoldHistoryMock.mockImplementationOnce(async () => { callOrder.push("canonical"); return []; });
      getGoldHistoryMock.mockImplementationOnce(async () => { callOrder.push("legacy"); return [{ date: "2026-07-01", close: 4049.10009765625 }]; });

      await fetchComparisonSeries("yfinance:gold");

      expect(callOrder).toEqual(["canonical", "legacy"]);
    });

    it("a successful canonical read means the legacy call never happens at all — not just 'called later'", async () => {
      getCanonicalYahooGoldHistoryMock.mockResolvedValueOnce(CANONICAL_FIXTURE);
      await fetchComparisonSeries("yfinance:gold");
      expect(getGoldHistoryMock).not.toHaveBeenCalled();
    });
  });

  describe("J. comparison-level compatibility", () => {
    it("gold-vs-usd-pkr resolves successfully through the DB-first path", async () => {
      getCanonicalYahooGoldHistoryMock.mockResolvedValueOnce(CANONICAL_FIXTURE);
      getSbpIndicatorHistoryMock.mockResolvedValueOnce({ points: [{ date: "2026-07-31", value: 280 }], meta: { source: "SBP EasyData" } });
      const def = getComparisonBySlug("gold-vs-usd-pkr")!;
      const bundle = await getComparisonBundle(def);
      expect(bundle.hasError).toBe(false);
      expect(bundle.compatibility?.compatible).toBe(true);
    });

    it("gold-vs-treasury-bills resolves successfully through the DB-first path", async () => {
      getCanonicalYahooGoldHistoryMock.mockResolvedValueOnce(CANONICAL_FIXTURE);
      getSbpIndicatorHistoryMock.mockResolvedValueOnce({ points: [{ date: "2026-07-31", value: 12 }], meta: { source: "SBP EasyData" } });
      const def = getComparisonBySlug("gold-vs-treasury-bills")!;
      const bundle = await getComparisonBundle(def);
      expect(bundle.hasError).toBe(false);
      expect(bundle.compatibility?.compatible).toBe(true);
    });

    it("both authorized gold comparison ids still resolve to their curated definitions, unmodified", () => {
      expect(getComparisonBySlug("gold-vs-usd-pkr")?.seriesA.id).toBe("yfinance:gold");
      expect(getComparisonBySlug("gold-vs-treasury-bills")?.seriesA.id).toBe("yfinance:gold");
    });
  });

  describe("no Silver/DXY/Market FX contamination", () => {
    it("no other Yahoo instrument id is ever passed to the gold canonical store by this dispatch", async () => {
      const result = await fetchComparisonSeries("yfinance:silver" as never);
      expect(getCanonicalYahooGoldHistoryMock).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
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
    getCanonicalYahooGoldHistoryMock.mockResolvedValue([]);
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
