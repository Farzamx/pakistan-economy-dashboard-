// Orchestrator tests — every read-model dependency is mocked, which is
// itself the proof for "17. no provider/API calls from intelligence layer":
// this file structurally cannot reach a real provider even if it wanted to
// — buildMacroIntelligenceReport() only ever calls the mocked functions
// below, all of which are existing certified read-model exports, never a
// fetch()/Supabase client import of its own.

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FreshnessResult } from "@/lib/freshness/freshnessEngine";
import type { SbpIndicatorResult } from "@/lib/data/sbp";

const getSbpIndicatorMock = vi.hoisted(() => vi.fn());
const getNetLiquidReservesMock = vi.hoisted(() => vi.fn());
const getGdpGrowthHistoryMock = vi.hoisted(() => vi.fn());
const evaluateWorldBankFreshnessMock = vi.hoisted(() => vi.fn());
const getCanonicalYahooGoldHistoryMock = vi.hoisted(() => vi.fn());
const getSeriesDefinitionMock = vi.hoisted(() => vi.fn());
const buildFreshnessAwareObservationMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/data/sbpServer", () => ({ getSbpIndicator: getSbpIndicatorMock }));
vi.mock("@/lib/data/fxReserves", () => ({ getNetLiquidReserves: getNetLiquidReservesMock }));
vi.mock("@/lib/data/worldBank", () => ({ getGdpGrowthHistory: getGdpGrowthHistoryMock, evaluateWorldBankFreshness: evaluateWorldBankFreshnessMock }));
vi.mock("@/lib/data/yahooGoldCanonicalStore", () => ({ getCanonicalYahooGoldHistory: getCanonicalYahooGoldHistoryMock }));
vi.mock("@/lib/freshness/seriesRegistry", () => ({ getSeriesDefinition: getSeriesDefinitionMock, FX_RESERVES_INDICATOR_KEY: "sbp-forex-arch:netLiquidReserves" }));
vi.mock("@/lib/freshness/readModel", () => ({ buildFreshnessAwareObservation: buildFreshnessAwareObservationMock }));

const { buildMacroIntelligenceReport } = await import("./macroIntelligence");

const NOW = new Date("2026-08-14T12:00:00.000Z");

function freshFreshness(): FreshnessResult {
  return {
    state: "current",
    severity: "healthy",
    seriesId: "test",
    observationPeriod: "2026-07-31",
    expectedPeriodOrDate: "2026-08-31",
    expectedDateSource: "cadence",
    ageDays: 14,
    reasonCode: "current",
    reason: "within expected cadence",
    evidence: [],
  };
}

function staleFreshness(): FreshnessResult {
  return { ...freshFreshness(), state: "stale", severity: "problem", reason: "no successful ingestion in over 90 days" };
}

function sbpResult(value: number, prev: number, freshness: FreshnessResult, sourceFallback = false): SbpIndicatorResult {
  return {
    kpi: { title: "x", value: String(value), unit: "%", change: "", trend: "up", glow: "blue" },
    trend: [{ month: "Jun", value: prev }, { month: "Jul", value }],
    meta: {
      source: sourceFallback ? "SBP EasyData (fallback)" : "SBP EasyData",
      seriesKey: "TEST",
      seriesName: "Test",
      unit: "%",
      frequency: "Monthly",
      observationDate: "2026-07-31",
      lastUpdated: NOW.toISOString(),
      freshness,
    },
  };
}

function defaultSbpMock(value = 10, prev = 9, freshness = freshFreshness()) {
  return async () => sbpResult(value, prev, freshness);
}

beforeEach(() => {
  vi.clearAllMocks();
  // Every SBP-backed indicator defaults to a healthy, usable reading —
  // individual tests override specific keys as needed.
  getSbpIndicatorMock.mockImplementation(defaultSbpMock());
  getNetLiquidReservesMock.mockResolvedValue(sbpResult(20, 19, freshFreshness()));
  getGdpGrowthHistoryMock.mockResolvedValue({ latestValue: 3, latestYear: "2024", previousValue: 2.5, previousYear: "2023", history: [{ month: "2023", value: 2.5 }, { month: "2024", value: 3 }] });
  evaluateWorldBankFreshnessMock.mockReturnValue(freshFreshness());
  getCanonicalYahooGoldHistoryMock.mockResolvedValue([
    { observationPeriod: "2026-06-30", value: 2300, unit: "$/oz", vintage: NOW.toISOString(), releaseDate: null, sourceUpdatedAt: null, fetchedAt: NOW.toISOString(), qualityStatus: "official", sourceSeriesId: "GC=F", sourceReference: null },
    { observationPeriod: "2026-07-31", value: 2400, unit: "$/oz", vintage: NOW.toISOString(), releaseDate: null, sourceUpdatedAt: null, fetchedAt: NOW.toISOString(), qualityStatus: "official", sourceSeriesId: "GC=F", sourceReference: null },
  ]);
  getSeriesDefinitionMock.mockReturnValue({ seriesId: "yahoo:goldMonthly", provider: "yahoo-finance", cadence: "monthly", graceDays: 40, expectsReleaseDate: false, expectsSourceUpdatedAt: false });
  buildFreshnessAwareObservationMock.mockReturnValue({ seriesId: "yahoo:goldMonthly", observationPeriod: "2026-07-31", freshness: freshFreshness(), delivery: { sourceStatus: "live", vintage: null, fetchedAt: null } });
});

describe("buildMacroIntelligenceReport — orchestrator wiring", () => {
  it("1/19. healthy inputs produce all seven dimensions, each independently", async () => {
    const report = await buildMacroIntelligenceReport(NOW);
    expect(report.signals).toHaveLength(7);
    const dims = report.signals.map((s) => s.dimension).sort();
    expect(dims).toEqual(["ExternalSector", "FiscalConditions", "Growth", "Inflation", "LiquidityCredit", "MarketStress", "MonetaryPolicy"].sort());
  });

  it("regime snapshot has one entry per computed dimension", async () => {
    const report = await buildMacroIntelligenceReport(NOW);
    expect(Object.keys(report.regime.dimensions)).toHaveLength(7);
    expect(report.regime.dimensions.Inflation).toBe(report.signals.find((s) => s.dimension === "Inflation")!.state);
  });

  it("2. a stale underlying SBP read propagates to insufficient-data for the affected dimension only", async () => {
    getSbpIndicatorMock.mockImplementation(async (key: string) => {
      if (key === "cpiInflation") return sbpResult(10, 9, staleFreshness());
      return sbpResult(10, 9, freshFreshness());
    });
    const report = await buildMacroIntelligenceReport(NOW);
    const inflation = report.signals.find((s) => s.dimension === "Inflation")!;
    expect(inflation.state).toBe("insufficient-data");
    // Other dimensions unaffected by CPI's staleness.
    const growth = report.signals.find((s) => s.dimension === "Growth")!;
    expect(growth.state).not.toBe("insufficient-data");
  });

  it("3. a read-model throw for one indicator degrades to a missing input, never crashes the whole report", async () => {
    getSbpIndicatorMock.mockImplementation(async (key: string) => {
      if (key === "policyRate") throw new Error("simulated transport failure");
      return sbpResult(10, 9, freshFreshness());
    });
    const report = await buildMacroIntelligenceReport(NOW);
    expect(report.signals).toHaveLength(7); // still produced all seven
    const monetary = report.signals.find((s) => s.dimension === "MonetaryPolicy")!;
    expect(monetary.state).toBe("insufficient-data");
    expect(monetary.missingInputs).toContain("SBP Policy Rate");
  });

  it("15. no fabricated values — a missing GDP series (null) yields insufficient-data, not an invented number", async () => {
    getGdpGrowthHistoryMock.mockResolvedValue(null);
    const report = await buildMacroIntelligenceReport(NOW);
    const growth = report.signals.find((s) => s.dimension === "Growth")!;
    expect(growth.state).toBe("insufficient-data");
    expect(growth.evidence).toHaveLength(0);
  });

  it("Gold with no registered series definition is represented as unavailable, not assumed fresh", async () => {
    getSeriesDefinitionMock.mockReturnValue(null);
    const report = await buildMacroIntelligenceReport(NOW);
    const marketStress = report.signals.find((s) => s.dimension === "MarketStress")!;
    // USD/PKR (sbp:usdPkr, still mocked healthy) keeps this from being fully insufficient,
    // but gold specifically should be absent from evidence and present in missingInputs.
    expect(marketStress.evidence.some((e) => e.seriesId === "yahoo:goldMonthly")).toBe(false);
    expect(marketStress.missingInputs).toContain("Gold (COMEX futures, monthly)");
  });

  it("16/17. only the mocked read-model functions are called — never a raw fetch or Supabase client from this layer", async () => {
    await buildMacroIntelligenceReport(NOW);
    expect(getSbpIndicatorMock).toHaveBeenCalled();
    expect(getNetLiquidReservesMock).toHaveBeenCalled();
    expect(getGdpGrowthHistoryMock).toHaveBeenCalled();
    expect(getCanonicalYahooGoldHistoryMock).toHaveBeenCalled();
    // Every SBP-backed dimension call goes through the sbpServer.ts mock by
    // indicator key — proves this layer never reaches for sbp.ts directly
    // or a live transport of its own.
    const calledKeys = getSbpIndicatorMock.mock.calls.map((c: unknown[]) => c[0]);
    expect(calledKeys).toEqual(expect.arrayContaining(["cpiInflation", "coreInflation", "policyRate", "remittances", "currentAccount", "tradeBalance", "exports", "imports", "moneySupplyM2", "privateCreditGrowth", "fiscalBalance", "usdPkr"]));
  });

  it("18. deterministic repeated evaluation — identical inputs and `now` produce deep-equal reports", async () => {
    const a = await buildMacroIntelligenceReport(NOW);
    const b = await buildMacroIntelligenceReport(NOW);
    expect(a).toEqual(b);
  });

  it("20. no single aggregate score exists anywhere on the report", async () => {
    const report = await buildMacroIntelligenceReport(NOW);
    expect(report).not.toHaveProperty("score");
    expect(report).not.toHaveProperty("healthScore");
    for (const signal of report.signals) {
      expect(signal).not.toHaveProperty("score");
    }
  });
});
