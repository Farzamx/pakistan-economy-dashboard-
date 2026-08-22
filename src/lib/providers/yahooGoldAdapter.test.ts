// Phase 8.17 tests for the Yahoo Gold Monthly adapter. Fixtures are built
// from real values captured live during the Phase 8.15 investigation
// (GC=F, interval=1mo, range=2y, queried 2026-08-13) — including the real,
// observed fact that Yahoo's response contained TWO August-2026-dated
// entries simultaneously (2026-08-01 and 2026-08-13), both sharing the
// month-key "2026-08" — directly grounding the "multiple current-month
// bars" scenario in real data, not a synthetic invention. fetchYfHistory()
// is mocked throughout; no live Yahoo call is made by any test.

import { describe, it, expect, vi, beforeEach } from "vitest";

const fetchYfHistoryMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/data/yfinance", () => ({ fetchYfHistory: fetchYfHistoryMock }));

const {
  fetchYahooGoldSeries,
  yahooGoldAdapter,
  currentUtcMonth,
  monthStartToMonthEnd,
  buildYahooGoldSourceReference,
  GOLD_SYMBOL,
  YAHOO_GOLD_INDICATOR_KEY,
} = await import("./yahooGoldAdapter");
const { validateNormalizedObservation } = await import("./providerAdapter");

// A "now" fixed inside August 2026, matching the real capture window.
const NOW = new Date("2026-08-13T20:00:00.000Z");

beforeEach(() => {
  fetchYfHistoryMock.mockReset();
});

describe("A/B. trailing-bar exclusion — completed month retained, current month excluded", () => {
  it("a completed July bar is retained as a candidate observation", async () => {
    fetchYfHistoryMock.mockResolvedValueOnce([
      { date: "2026-07-01", close: 4049.10009765625 },
    ]);
    const result = await fetchYahooGoldSeries(NOW);
    expect(result).toHaveLength(1);
    expect(result[0].observationPeriod).toBe("2026-07-31");
    expect(result[0].value).toBe(4049.10009765625);
  });

  it("a current-month (August) in-progress bar is excluded", async () => {
    fetchYfHistoryMock.mockResolvedValueOnce([
      { date: "2026-07-01", close: 4049.10009765625 },
      { date: "2026-08-13", close: 4426.2001953125 }, // real trailing live bar, captured Phase 8.15
    ]);
    const result = await fetchYahooGoldSeries(NOW);
    expect(result).toHaveLength(1);
    expect(result.every((o) => o.observationPeriod !== "2026-08-31")).toBe(true);
    expect(result[0].observationPeriod).toBe("2026-07-31");
  });
});

describe("C. multiple current-month bars — both excluded, grounded in real observed Yahoo data", () => {
  it("excludes BOTH the '2026-08-01' and '2026-08-13' entries (real, actually-observed Yahoo response shape)", async () => {
    fetchYfHistoryMock.mockResolvedValueOnce([
      { date: "2026-07-01", close: 4049.10009765625 },
      { date: "2026-08-01", close: 4408.89990234375 },   // real: a month-start-dated bar for the STILL-OPEN month
      { date: "2026-08-13", close: 4426.2001953125 },    // real: the live trailing bar, same month-key
    ]);
    const result = await fetchYahooGoldSeries(NOW);
    expect(result).toHaveLength(1);
    expect(result[0].observationPeriod).toBe("2026-07-31");
    expect(result.some((o) => o.observationPeriod.startsWith("2026-08"))).toBe(false);
  });
});

describe("D. reordered bars — exclusion is per-bar, never positional", () => {
  it("excludes the current-month bar regardless of its position in the array (not merely 'drop the last element')", async () => {
    fetchYfHistoryMock.mockResolvedValueOnce([
      { date: "2026-08-13", close: 4426.2001953125 }, // current month FIRST in the array, not last
      { date: "2026-06-30", close: 4022.89990234375 },
      { date: "2026-07-01", close: 4049.10009765625 },
    ]);
    const result = await fetchYahooGoldSeries(NOW);
    expect(result).toHaveLength(2);
    expect(result.map((o) => o.observationPeriod)).not.toContain("2026-08-31");
    expect(result.map((o) => o.observationPeriod).sort()).toEqual(["2026-06-30", "2026-07-31"]);
  });
});

describe("E. no current-month row present — filter is a safe no-op", () => {
  it("retains every bar unchanged when none falls in the current month", async () => {
    fetchYfHistoryMock.mockResolvedValueOnce([
      { date: "2026-05-01", close: 4560.5 },
      { date: "2026-06-01", close: 4022.89990234375 },
      { date: "2026-07-01", close: 4049.10009765625 },
    ]);
    const result = await fetchYahooGoldSeries(NOW);
    expect(result).toHaveLength(3);
  });
});

describe("F. invalid timestamp — rejected deterministically, never silently guessed", () => {
  it("throws on a malformed bar date rather than passing it through or dropping it silently", async () => {
    fetchYfHistoryMock.mockResolvedValueOnce([
      { date: "2026-07-01", close: 4049.10009765625 },
      { date: "not-a-real-date", close: 9999.99 },
    ]);
    await expect(fetchYahooGoldSeries(NOW)).rejects.toThrow(/unrecognized date/);
  });

  it("throws on an empty-string date", async () => {
    fetchYfHistoryMock.mockResolvedValueOnce([{ date: "", close: 100 }]);
    await expect(fetchYahooGoldSeries(NOW)).rejects.toThrow(/unrecognized date/);
  });
});

describe("G. missing month — gaps are preserved, never synthesized", () => {
  it("a real Yahoo gap (June 2025 absent, per the live Phase 8.15 capture) is not fabricated or interpolated", async () => {
    fetchYfHistoryMock.mockResolvedValueOnce([
      { date: "2025-05-01", close: 3288.89990234375 },
      { date: "2025-07-01", close: 3293.199951171875 }, // June 2025 genuinely absent from Yahoo's own real response
    ]);
    const result = await fetchYahooGoldSeries(NOW);
    expect(result.map((o) => o.observationPeriod)).toEqual(["2025-05-31", "2025-07-31"]);
    expect(result.some((o) => o.observationPeriod.startsWith("2025-06"))).toBe(false);
  });
});

describe("H. full-precision close — never rounded or truncated", () => {
  it("preserves Yahoo's full float precision", async () => {
    fetchYfHistoryMock.mockResolvedValueOnce([{ date: "2026-07-01", close: 4049.10009765625 }]);
    const result = await fetchYahooGoldSeries(NOW);
    expect(result[0].value).toBe(4049.10009765625);
  });
});

describe("I. provenance sanitization", () => {
  it("sourceReference contains only non-secret endpoint metadata", () => {
    const ref = buildYahooGoldSourceReference();
    expect(ref).toEqual({
      endpoint: "https://query1.finance.yahoo.com/v8/finance/chart",
      symbol: "GC=F",
      interval: "1mo",
      range: "10y",
    });
    expect(JSON.stringify(ref)).not.toMatch(/key|token|auth|cookie|secret/i);
  });

  it("releaseDate and sourceUpdatedAt are always null; qualityStatus is 'official'; sourceSeriesId is 'GC=F'", async () => {
    fetchYfHistoryMock.mockResolvedValueOnce([{ date: "2026-07-01", close: 4049.10009765625 }]);
    const [obs] = await fetchYahooGoldSeries(NOW);
    expect(obs.releaseDate).toBeNull();
    expect(obs.sourceUpdatedAt).toBeNull();
    expect(obs.qualityStatus).toBe("official");
    expect(obs.sourceSeriesId).toBe(GOLD_SYMBOL);
    expect(obs.indicatorKey).toBe(YAHOO_GOLD_INDICATOR_KEY);
  });

  it("every normalized observation passes validateNormalizedObservation's credential-shape scan", async () => {
    fetchYfHistoryMock.mockResolvedValueOnce([{ date: "2026-07-01", close: 4049.10009765625 }]);
    const result = await fetchYahooGoldSeries(NOW);
    for (const obs of result) expect(validateNormalizedObservation(obs)).toEqual({ valid: true });
  });
});

describe("J. month-start -> month-end conversion", () => {
  it("converts a plain month-start date to that month's actual last calendar day", () => {
    expect(monthStartToMonthEnd("2026-07-01")).toBe("2026-07-31");
    expect(monthStartToMonthEnd("2026-04-01")).toBe("2026-04-30"); // 30-day month
    expect(monthStartToMonthEnd("2026-02-01")).toBe("2026-02-28"); // non-leap Feb
    expect(monthStartToMonthEnd("2028-02-01")).toBe("2028-02-29"); // leap Feb
  });

  it("currentUtcMonth derives 'YYYY-MM' from an injected clock, never the system clock implicitly inside fetchYahooGoldSeries", () => {
    expect(currentUtcMonth(new Date("2026-08-13T20:00:00.000Z"))).toBe("2026-08");
    expect(currentUtcMonth(new Date("2026-01-01T00:00:01.000Z"))).toBe("2026-01");
  });
});

describe("K. raw close vs adjclose", () => {
  it("only ever reads .close — an adjclose field present on the fixture is structurally ignored (the adapter's type never references it)", async () => {
    fetchYfHistoryMock.mockResolvedValueOnce([
      { date: "2026-07-01", close: 4049.10009765625, adjclose: 3999.0 } as unknown as { date: string; close: number },
    ]);
    const result = await fetchYahooGoldSeries(NOW);
    expect(result[0].value).toBe(4049.10009765625); // never 3999.0
  });
});

describe("configuration and dispatch", () => {
  it("yahooGoldAdapter.providerId is 'yahoo-finance'", () => {
    expect(yahooGoldAdapter.providerId).toBe("yahoo-finance");
  });

  it("rejects an indicatorKey outside the Phase 8.17 pilot scope (e.g. a hypothetical silver key)", async () => {
    await expect(yahooGoldAdapter.fetchObservations({ indicatorKey: "yahoo:silverMonthly" })).rejects.toThrow(/no series configuration/);
    expect(fetchYfHistoryMock).not.toHaveBeenCalled();
  });

  it("yahooGoldAdapter.fetchObservations dispatches through the same path for the real indicatorKey", async () => {
    fetchYfHistoryMock.mockResolvedValueOnce([{ date: "2026-07-01", close: 4049.10009765625 }]);
    const result = await yahooGoldAdapter.fetchObservations({ indicatorKey: YAHOO_GOLD_INDICATOR_KEY });
    expect(result).toHaveLength(1);
  });

  it("declares monthly cadence and $/oz unit for every observation", async () => {
    fetchYfHistoryMock.mockResolvedValueOnce([
      { date: "2026-06-01", close: 1 },
      { date: "2026-07-01", close: 2 },
    ]);
    const result = await fetchYahooGoldSeries(NOW);
    expect(result.every((o) => o.cadence === "monthly")).toBe(true);
    expect(result.every((o) => o.unit === "$/oz")).toBe(true);
    expect(result.every((o) => o.provider === "yahoo-finance")).toBe(true);
  });

  it("propagates a fetchYfHistory transport failure unchanged — the adapter itself never retries", async () => {
    fetchYfHistoryMock.mockRejectedValueOnce(new Error("Yahoo Finance HTTP 503 for GC=F history"));
    await expect(fetchYahooGoldSeries(NOW)).rejects.toThrow(/503/);
    expect(fetchYfHistoryMock).toHaveBeenCalledTimes(1);
  });
});
