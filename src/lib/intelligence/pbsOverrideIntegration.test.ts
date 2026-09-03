// Phase 9.6A regression coverage — end-to-end through the REAL
// override-applying getSbpIndicator() boundary (sbpServer.ts), not a mock of
// it. Mirrors sbpServer.test.ts's own mocking boundary (mocks only
// @/lib/data/sbp and @/lib/data/latestReleasedEventValue — the two true I/O
// modules underneath sbpServer.ts) and macroIntelligence.test.ts's mocking
// boundary for every other read model — but, unlike macroIntelligence.test.ts,
// this file does NOT mock @/lib/data/sbpServer itself, so
// applyCanonicalOverride() genuinely executes on every call.
//
// Root cause (Phase 9.6, confirmed by direct reproduction against this exact
// scenario before any fix existed): sbpServer.ts's applyCanonicalOverride
// rewrites kpi.value/meta.observationDate to a newer PBS advance-release
// figure but deliberately leaves the shared SBP trend/sparkline (`trend`)
// at its older, pre-override tail. macroIntelligence.ts's safeSbpEvidence
// used to read `value` from that trend array, so an active override produced
// an evidence record pairing the NEW observationPeriod with the OLD value —
// exactly the defect this file protects against regressing.

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FreshnessResult } from "@/lib/freshness/freshnessEngine";

const getSbpIndicatorMock = vi.hoisted(() => vi.fn());
const evaluateSbpFreshnessMock = vi.hoisted(() => vi.fn());
const getLatestReleasedEventValueMock = vi.hoisted(() => vi.fn());
const getNetLiquidReservesMock = vi.hoisted(() => vi.fn());
const getGdpGrowthHistoryMock = vi.hoisted(() => vi.fn());
const evaluateWorldBankFreshnessMock = vi.hoisted(() => vi.fn());
const getCanonicalYahooGoldHistoryMock = vi.hoisted(() => vi.fn());
const getSeriesDefinitionMock = vi.hoisted(() => vi.fn());
const buildFreshnessAwareObservationMock = vi.hoisted(() => vi.fn());

// Same boundary sbpServer.test.ts already uses — sbpServer.ts is NOT mocked,
// so its real applyCanonicalOverride/getSbpIndicator run on every call.
vi.mock("@/lib/data/sbp", () => ({
  getSbpIndicator: getSbpIndicatorMock,
  evaluateSbpFreshness: evaluateSbpFreshnessMock,
  getAllSbpIndicators: vi.fn(),
  getSbpIndicatorHistory: vi.fn(),
  getSbpIndicatorFresh: vi.fn(),
  getFoodInflationUrbanHistory: vi.fn(),
  getMoneySupplyM2YoyGrowth: vi.fn(),
  sbpCacheTag: vi.fn(),
}));
vi.mock("@/lib/data/latestReleasedEventValue", () => ({
  getLatestReleasedEventValue: getLatestReleasedEventValueMock,
}));
// Every other buildMacroIntelligenceReport dependency, mocked exactly as in
// macroIntelligence.test.ts — this file's focus is the SBP/PBS-override
// chain only.
vi.mock("@/lib/data/fxReserves", () => ({ getNetLiquidReserves: getNetLiquidReservesMock }));
vi.mock("@/lib/data/worldBank", () => ({ getGdpGrowthHistory: getGdpGrowthHistoryMock, evaluateWorldBankFreshness: evaluateWorldBankFreshnessMock }));
vi.mock("@/lib/data/yahooGoldCanonicalStore", () => ({ getCanonicalYahooGoldHistory: getCanonicalYahooGoldHistoryMock }));
vi.mock("@/lib/freshness/seriesRegistry", () => ({ getSeriesDefinition: getSeriesDefinitionMock, FX_RESERVES_INDICATOR_KEY: "sbp-forex-arch:netLiquidReserves" }));
vi.mock("@/lib/freshness/readModel", () => ({ buildFreshnessAwareObservation: buildFreshnessAwareObservationMock }));

const { buildMacroIntelligenceReport } = await import("./macroIntelligence");
const { CANONICAL_VALUE_PARSERS } = await import("@/lib/data/canonicalObservationParsers");

const NOW = new Date("2026-08-14T12:00:00.000Z");

function freshFreshness(observationPeriod = "2026-06-30"): FreshnessResult {
  return { state: "current", severity: "healthy", seriesId: "test", observationPeriod, expectedPeriodOrDate: "2026-08-31", expectedDateSource: "cadence", ageDays: 14, reasonCode: "current", reason: "within expected cadence", evidence: [] };
}

/** The raw, pre-override SBP EasyData reading for one indicator — trend ends at the OLD period, exactly as sbp.ts's real seriesToIndicatorResult would build it. */
function sbpRawResult(oldValue: number, olderValue: number, oldObservationDate: string) {
  return {
    kpi: { title: "x", value: oldValue.toFixed(2), unit: "B USD", change: "", trend: "neutral" as const, glow: "blue" as const },
    trend: [{ month: "prev", value: olderValue }, { month: "latest", value: oldValue }],
    meta: { source: "SBP EasyData" as const, seriesKey: "TEST", seriesName: "Test", unit: "B USD", frequency: "Monthly" as const, observationDate: oldObservationDate, lastUpdated: NOW.toISOString(), freshness: freshFreshness(oldObservationDate) },
  };
}

/** A generic healthy, no-override SBP reading, reused for every non-tradeBalance key so buildMacroIntelligenceReport's other 6 dimensions don't degrade to insufficient-data and clutter the assertions. */
function genericHealthySbpResult() {
  return sbpRawResult(10, 9, "2026-07-31");
}

beforeEach(() => {
  vi.clearAllMocks();
  evaluateSbpFreshnessMock.mockImplementation((_key: string, meta: { observationDate: string }) => freshFreshness(meta.observationDate));
  getSbpIndicatorMock.mockImplementation(async () => genericHealthySbpResult());
  getLatestReleasedEventValueMock.mockResolvedValue(null); // no PBS override by default; overridden per-test below
  getNetLiquidReservesMock.mockResolvedValue({ kpi: { unit: "B USD", value: "20.00" }, trend: [{ value: 19 }, { value: 20 }], meta: { observationDate: "2026-07-31", freshness: freshFreshness("2026-07-31"), source: "x" } });
  getGdpGrowthHistoryMock.mockResolvedValue(null);
  getCanonicalYahooGoldHistoryMock.mockResolvedValue([]);
});

function externalSectorEvidence(report: Awaited<ReturnType<typeof buildMacroIntelligenceReport>>, seriesId: string) {
  const ext = report.signals.find((s) => s.dimension === "ExternalSector")!;
  return ext.evidence.find((e) => e.seriesId === seriesId);
}

function inflationEvidence(report: Awaited<ReturnType<typeof buildMacroIntelligenceReport>>, seriesId: string) {
  const inf = report.signals.find((s) => s.dimension === "Inflation")!;
  return inf.evidence.find((e) => e.seriesId === seriesId);
}

describe("PBS canonical override -> getSbpIndicator() -> Macro Intelligence evidence (Phase 9.6A)", () => {
  it("1. Trade Balance: PBS override active -> evidence carries the corrected -3.98/2026-07-31 pair, NEVER the stale -3.32", async () => {
    getSbpIndicatorMock.mockImplementation(async (key: string) => (key === "tradeBalance" ? sbpRawResult(-3.32, -3.10, "2026-06-30") : genericHealthySbpResult()));
    getLatestReleasedEventValueMock.mockImplementation(async (slug: string) =>
      slug === "trade-balance" ? { value: CANONICAL_VALUE_PARSERS["trade-balance"]("$-3.98B"), observationDate: "2026-07-31", sourceName: "PBS", formattedValue: "$-3.98B" } : null,
    );

    const report = await buildMacroIntelligenceReport(NOW);
    const tb = externalSectorEvidence(report, "sbp:tradeBalance");

    expect(getLatestReleasedEventValueMock).toHaveBeenCalledWith("trade-balance"); // proves the override path was genuinely exercised, not short-circuited
    expect(tb?.value).toBe(-3.98);
    expect(tb?.observationPeriod).toBe("2026-07-31");
    expect(tb?.value).not.toBe(-3.32); // the exact discovered defect, asserted negatively
    // No fabricated comparison across the override boundary.
    expect(tb?.direction).toBe("Unknown");
    expect(tb?.changeAbsolute).toBeNull();
  });

  it("2. Exports: PBS override active (positive value) -> evidence carries the corrected value/period pair", async () => {
    getSbpIndicatorMock.mockImplementation(async (key: string) => (key === "exports" ? sbpRawResult(2.55, 2.40, "2026-06-30") : genericHealthySbpResult()));
    getLatestReleasedEventValueMock.mockImplementation(async (slug: string) =>
      slug === "exports-release" ? { value: CANONICAL_VALUE_PARSERS["exports-release"]("$3.01B"), observationDate: "2026-07-31", sourceName: "PBS", formattedValue: "$3.01B" } : null,
    );

    const report = await buildMacroIntelligenceReport(NOW);
    const exp = externalSectorEvidence(report, "sbp:exports");

    expect(exp?.value).toBe(3.01);
    expect(exp?.observationPeriod).toBe("2026-07-31");
    expect(exp?.value).not.toBe(2.55);
  });

  it("3. Imports: PBS override active (positive value) -> evidence carries the corrected value/period pair", async () => {
    getSbpIndicatorMock.mockImplementation(async (key: string) => (key === "imports" ? sbpRawResult(5.90, 5.70, "2026-06-30") : genericHealthySbpResult()));
    getLatestReleasedEventValueMock.mockImplementation(async (slug: string) =>
      slug === "imports-release" ? { value: CANONICAL_VALUE_PARSERS["imports-release"]("$6.15B"), observationDate: "2026-07-31", sourceName: "PBS", formattedValue: "$6.15B" } : null,
    );

    const report = await buildMacroIntelligenceReport(NOW);
    const imp = externalSectorEvidence(report, "sbp:imports");

    expect(imp?.value).toBe(6.15);
    expect(imp?.observationPeriod).toBe("2026-07-31");
    expect(imp?.value).not.toBe(5.90);
  });

  it("4. CPI: PBS override active -> evidence still respects the value/observationPeriod invariant (no special-cased methodology comparison invented)", async () => {
    getSbpIndicatorMock.mockImplementation(async (key: string) => (key === "cpiInflation" ? sbpRawResult(9.0, 8.6, "2026-06-30") : genericHealthySbpResult()));
    getLatestReleasedEventValueMock.mockImplementation(async (slug: string) =>
      slug === "cpi-inflation-release" ? { value: CANONICAL_VALUE_PARSERS["cpi-inflation-release"]("+9.2% YoY"), observationDate: "2026-07-31", sourceName: "PBS", formattedValue: "+9.2% YoY" } : null,
    );

    const report = await buildMacroIntelligenceReport(NOW);
    const cpi = inflationEvidence(report, "sbp:cpiInflation");

    expect(cpi?.value).toBe(9.2);
    expect(cpi?.observationPeriod).toBe("2026-07-31");
    expect(cpi?.value).not.toBe(9.0);
    expect(cpi?.direction).toBe("Unknown"); // conservative by design — see evidence.ts's header
  });

  it("5. No PBS override anywhere (ordinary SBP reading) -> evidence unchanged, direction computed normally from the trend", async () => {
    getSbpIndicatorMock.mockImplementation(async () => sbpRawResult(-3.32, -3.60, "2026-07-31"));
    getLatestReleasedEventValueMock.mockResolvedValue(null);

    const report = await buildMacroIntelligenceReport(NOW);
    const tb = externalSectorEvidence(report, "sbp:tradeBalance");

    expect(getLatestReleasedEventValueMock).toHaveBeenCalled();
    expect(tb?.value).toBe(-3.32);
    expect(tb?.observationPeriod).toBe("2026-07-31");
    expect(tb?.direction).toBe("Rising"); // -3.60 -> -3.32 is a genuine, validly-computed improvement
  });

  it("6. PBS observation is the SAME period as SBP's (not newer) -> applyCanonicalOverride's own short-circuit fires, no divergence to guard against", async () => {
    getSbpIndicatorMock.mockImplementation(async (key: string) => (key === "tradeBalance" ? sbpRawResult(-3.32, -3.60, "2026-07-31") : genericHealthySbpResult()));
    getLatestReleasedEventValueMock.mockImplementation(async (slug: string) =>
      slug === "trade-balance" ? { value: -3.32, observationDate: "2026-07-31", sourceName: "PBS", formattedValue: "$-3.32B" } : null,
    );

    const report = await buildMacroIntelligenceReport(NOW);
    const tb = externalSectorEvidence(report, "sbp:tradeBalance");

    expect(tb?.value).toBe(-3.32);
    expect(tb?.observationPeriod).toBe("2026-07-31");
    expect(tb?.direction).toBe("Rising"); // trend-derived direction is valid — no override actually applied
  });

  it("7. Missing PBS observation (getLatestReleasedEventValue resolves null) -> no override, ordinary SBP evidence", async () => {
    getSbpIndicatorMock.mockImplementation(async (key: string) => (key === "tradeBalance" ? sbpRawResult(-3.32, -3.60, "2026-07-31") : genericHealthySbpResult()));
    getLatestReleasedEventValueMock.mockResolvedValue(null);

    const report = await buildMacroIntelligenceReport(NOW);
    const tb = externalSectorEvidence(report, "sbp:tradeBalance");

    expect(tb?.value).toBe(-3.32);
    expect(tb?.direction).toBe("Rising");
  });

  it("8. an active override never bypasses freshness gating — a Stale-classified overridden reading is still excluded from an assertive signal", async () => {
    getSbpIndicatorMock.mockImplementation(async (key: string) =>
      key === "tradeBalance" ? { ...sbpRawResult(-3.32, -3.10, "2026-06-30"), meta: { ...sbpRawResult(-3.32, -3.10, "2026-06-30").meta, freshness: { ...freshFreshness("2026-06-30"), state: "stale" as const, severity: "problem" as const } } } : genericHealthySbpResult(),
    );
    evaluateSbpFreshnessMock.mockImplementation((_key: string, meta: { observationDate: string }) => ({ ...freshFreshness(meta.observationDate), state: "stale" as const, severity: "problem" as const }));
    getLatestReleasedEventValueMock.mockImplementation(async (slug: string) =>
      slug === "trade-balance" ? { value: CANONICAL_VALUE_PARSERS["trade-balance"]("$-3.98B"), observationDate: "2026-07-31", sourceName: "PBS", formattedValue: "$-3.98B" } : null,
    );

    const report = await buildMacroIntelligenceReport(NOW);
    const tb = externalSectorEvidence(report, "sbp:tradeBalance");

    expect(tb?.value).toBe(-3.98); // value/period consistency still holds
    expect(tb?.availability).toBe("Stale"); // but it is correctly excluded from usable evidence
  });
});
