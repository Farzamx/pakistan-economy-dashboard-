import { describe, it, expect } from "vitest";
import { classifyAvailability, isUsableForSignal, buildIndicatorEvidence, computeSignalConfidence } from "./evidence";
import type { FreshnessResult } from "@/lib/freshness/freshnessEngine";

function freshness(state: FreshnessResult["state"], reason = "test reason"): FreshnessResult {
  return {
    state,
    severity: state === "stale" || state === "validation-failed" ? "problem" : state === "delayed-release" || state === "ingestion-lagging" || state === "source-unavailable" ? "caution" : "healthy",
    seriesId: "test:series",
    observationPeriod: "2026-06-30",
    expectedPeriodOrDate: null,
    expectedDateSource: null,
    ageDays: 10,
    reasonCode: state,
    reason,
    evidence: [],
  };
}

describe("classifyAvailability — direct mapping from FreshnessResult.state only", () => {
  it("current / market-closed / awaiting-release -> Fresh", () => {
    expect(classifyAvailability("current")).toBe("Fresh");
    expect(classifyAvailability("market-closed")).toBe("Fresh");
    expect(classifyAvailability("awaiting-release")).toBe("Fresh");
  });
  it("delayed-release / ingestion-lagging -> DelayedRelease", () => {
    expect(classifyAvailability("delayed-release")).toBe("DelayedRelease");
    expect(classifyAvailability("ingestion-lagging")).toBe("DelayedRelease");
  });
  it("source-unavailable -> Unavailable (conservative — cannot vouch for the value at all)", () => {
    expect(classifyAvailability("source-unavailable")).toBe("Unavailable");
  });
  it("stale / validation-failed -> Stale", () => {
    expect(classifyAvailability("stale")).toBe("Stale");
    expect(classifyAvailability("validation-failed")).toBe("Stale");
  });
  it("undefined (no freshness registry entry at all) -> Unavailable, never assumed fresh", () => {
    expect(classifyAvailability(undefined)).toBe("Unavailable");
  });
});

describe("isUsableForSignal", () => {
  it("Fresh and DelayedRelease are usable", () => {
    expect(isUsableForSignal("Fresh")).toBe(true);
    expect(isUsableForSignal("DelayedRelease")).toBe(true);
  });
  it("Stale and Unavailable are never usable", () => {
    expect(isUsableForSignal("Stale")).toBe(false);
    expect(isUsableForSignal("Unavailable")).toBe(false);
  });
});

describe("buildIndicatorEvidence", () => {
  it("stale observation is represented with Stale availability, not silently used as current", () => {
    const ev = buildIndicatorEvidence({
      seriesId: "sbp:cpiInflation",
      label: "CPI Inflation (YoY)",
      unit: "%",
      points: [{ value: 8 }, { value: 9 }],
      observationPeriod: "2026-01-31",
      freshness: freshness("stale", "no successful ingestion in 90 days"),
    });
    expect(ev.availability).toBe("Stale");
    expect(ev.freshnessState).toBe("stale");
    expect(ev.value).toBe(9); // the value is still carried as evidence — it's the AVAILABILITY that flags it, never a fabricated null
    expect(ev.freshnessReason).toBe("no successful ingestion in 90 days");
  });
  it("missing freshness (no registry entry) is represented honestly, not defaulted to fresh", () => {
    const ev = buildIndicatorEvidence({
      seriesId: "unregistered:series",
      label: "Unregistered",
      unit: "x",
      points: [{ value: 1 }],
      observationPeriod: "2026-01-01",
      freshness: undefined,
    });
    expect(ev.availability).toBe("Unavailable");
    expect(ev.freshnessState).toBe("not-registered");
    expect(ev.freshnessReason).toContain("No freshness registry entry");
  });
  it("preserves observation date and exact value — no fabrication", () => {
    const ev = buildIndicatorEvidence({
      seriesId: "sbp:policyRate",
      label: "SBP Policy Rate",
      unit: "%",
      points: [{ value: 11 }, { value: 12 }],
      observationPeriod: "2026-07-31",
      freshness: freshness("current"),
    });
    expect(ev.observationPeriod).toBe("2026-07-31");
    expect(ev.value).toBe(12);
    expect(ev.direction).toBe("Rising");
  });
  it("isFallback is carried through from input, defaulting to false when omitted", () => {
    const withFallback = buildIndicatorEvidence({ seriesId: "s", label: "L", unit: "u", points: [{ value: 1 }], observationPeriod: null, freshness: freshness("current"), isFallback: true });
    const withoutFallback = buildIndicatorEvidence({ seriesId: "s", label: "L", unit: "u", points: [{ value: 1 }], observationPeriod: null, freshness: freshness("current") });
    expect(withFallback.isFallback).toBe(true);
    expect(withoutFallback.isFallback).toBe(false);
  });
});

describe("buildIndicatorEvidence — authoritativeValueDisplay (Phase 9.6A: value/observationPeriod consistency)", () => {
  // Root-caused in Phase 9.6, fixed in Phase 9.6A: sbpServer.ts's
  // applyCanonicalOverride rewrites kpi.value/meta.observationDate to a
  // newer PBS advance-release figure while deliberately leaving the SBP
  // trend/sparkline (`points`) at its older, pre-override tail — see
  // sbpServer.ts's own "SBP trend/sparkline is always preserved" comment.
  // Before this fix, `value` always came from `points`, so an active
  // override paired the NEW observationPeriod with the OLD value.

  it("omitted entirely -> byte-identical to pre-9.6A behavior (value from points, trend-derived direction/change)", () => {
    const ev = buildIndicatorEvidence({ seriesId: "s", label: "L", unit: "u", points: [{ value: 8 }, { value: 9 }], observationPeriod: "2026-07-31", freshness: freshness("current") });
    expect(ev.value).toBe(9);
    expect(ev.direction).toBe("Rising");
    expect(ev.changeAbsolute).toBe(1);
  });

  it("authoritative value agrees with points' last value (ordinary, no override) -> value/direction/change all as computed from points", () => {
    const ev = buildIndicatorEvidence({
      seriesId: "s", label: "L", unit: "u",
      points: [{ value: 8 }, { value: 9 }],
      observationPeriod: "2026-07-31",
      freshness: freshness("current"),
      authoritativeValueDisplay: "9.0",
    });
    expect(ev.value).toBe(9);
    expect(ev.direction).toBe("Rising");
    expect(ev.changeAbsolute).toBe(1);
  });

  it("authoritative value agrees at a COARSER display precision than the stored trend point -> still treated as consistent, never a false-positive divergence", () => {
    // Mirrors real sbp.ts formatting: CPI's kpi.value is toFixed(1) ("9.2")
    // while the trend array stores toFixed(2)-rounded numbers (9.2 exactly,
    // here written as 9.20 to make the precision mismatch explicit).
    const ev = buildIndicatorEvidence({
      seriesId: "s", label: "L", unit: "%",
      points: [{ value: 9.0 }, { value: 9.2 }],
      observationPeriod: "2026-07-31",
      freshness: freshness("current"),
      authoritativeValueDisplay: "9.2",
    });
    expect(ev.value).toBe(9.2);
    expect(ev.direction).toBe("Rising"); // NOT Unknown — this must not be mistaken for an override
    expect(ev.changeAbsolute).toBeCloseTo(0.2);
  });

  it("THE DISCOVERED BUG, FIXED: authoritative value disagrees with points' last value (active PBS override) -> value follows the authoritative reading, never points' stale tail", () => {
    // Exact reproduction of the Phase 9.6 finding: SBP trend still ends at
    // -3.32 (Jun 2026), PBS override says -3.98 (Jul 2026).
    const ev = buildIndicatorEvidence({
      seriesId: "sbp:tradeBalance", label: "Trade Balance", unit: "B USD",
      points: [{ value: -3.10 }, { value: -3.32 }],
      observationPeriod: "2026-07-31", // the NEW, PBS-overridden period
      freshness: freshness("current"),
      authoritativeValueDisplay: "-3.98", // the NEW, PBS-overridden value
    });
    expect(ev.value).toBe(-3.98);
    expect(ev.observationPeriod).toBe("2026-07-31");
    // The exact defective pairing this phase exists to prevent, asserted
    // negatively so a future regression trips this test immediately:
    expect(ev.value).not.toBe(-3.32);
  });

  it("no fabricated comparison when points disagree with the authoritative reading -> direction/change/acceleration are Unknown/null, not a guessed diff", () => {
    const ev = buildIndicatorEvidence({
      seriesId: "sbp:tradeBalance", label: "Trade Balance", unit: "B USD",
      points: [{ value: -3.10 }, { value: -3.32 }],
      observationPeriod: "2026-07-31",
      freshness: freshness("current"),
      authoritativeValueDisplay: "-3.98",
    });
    expect(ev.direction).toBe("Unknown");
    expect(ev.changeAbsolute).toBeNull();
    expect(ev.changePercent).toBeNull();
    expect(ev.acceleration).toBe("Unknown");
  });

  it("empty points + an authoritative value -> value is still the authoritative reading, never null, direction stays Unknown (no fabricated trend from zero history)", () => {
    const ev = buildIndicatorEvidence({
      seriesId: "s", label: "L", unit: "u", points: [],
      observationPeriod: "2026-07-31",
      freshness: freshness("current"),
      authoritativeValueDisplay: "-3.98",
    });
    expect(ev.value).toBe(-3.98);
    expect(ev.direction).toBe("Unknown");
    expect(ev.changeAbsolute).toBeNull();
  });

  it("single-point trend + agreeing authoritative value -> value from the authoritative reading, direction stays Unknown (unchanged: a single point never yields a computable direction)", () => {
    const ev = buildIndicatorEvidence({
      seriesId: "s", label: "L", unit: "u", points: [{ value: -3.32 }],
      observationPeriod: "2026-06-30",
      freshness: freshness("current"),
      authoritativeValueDisplay: "-3.32",
    });
    expect(ev.value).toBe(-3.32);
    expect(ev.direction).toBe("Unknown");
  });

  it("malformed authoritativeValueDisplay (non-numeric) is ignored -> falls back to points-derived value, never NaN", () => {
    const ev = buildIndicatorEvidence({
      seriesId: "s", label: "L", unit: "u", points: [{ value: 8 }, { value: 9 }],
      observationPeriod: "2026-07-31",
      freshness: freshness("current"),
      authoritativeValueDisplay: "n/a",
    });
    expect(ev.value).toBe(9);
    expect(ev.direction).toBe("Rising");
  });

  it("stale availability is still gated correctly even when an authoritative value is present — this fix never bypasses freshness gating", () => {
    const ev = buildIndicatorEvidence({
      seriesId: "sbp:tradeBalance", label: "Trade Balance", unit: "B USD",
      points: [{ value: -3.10 }, { value: -3.32 }],
      observationPeriod: "2026-07-31",
      freshness: freshness("stale", "no successful ingestion in 90 days"),
      authoritativeValueDisplay: "-3.98",
    });
    expect(ev.availability).toBe("Stale");
    expect(ev.value).toBe(-3.98); // value/observationPeriod consistency is orthogonal to availability
  });
});

describe("computeSignalConfidence — reuses riskModels.ts's computeDataConfidence, never a fabricated score", () => {
  const now = "2026-08-14T00:00:00.000Z";

  it("zero usable indicators -> Insufficient / null score, never a fabricated High confidence", () => {
    const staleEvidence = buildIndicatorEvidence({ seriesId: "s", label: "L", unit: "u", points: [{ value: 1 }], observationPeriod: null, freshness: freshness("stale") });
    const result = computeSignalConfidence([staleEvidence], now);
    expect(result.confidence).toBe("Insufficient");
    expect(result.confidenceScore).toBeNull();
  });

  it("empty evidence array -> Insufficient, not the empty-array bug in computeDataConfidence itself (which would otherwise silently score 100/High)", () => {
    const result = computeSignalConfidence([], now);
    expect(result.confidence).toBe("Insufficient");
    expect(result.confidenceScore).toBeNull();
  });

  it("all-fresh, non-fallback indicators score High via computeDataConfidence's own thresholds", () => {
    const a = buildIndicatorEvidence({ seriesId: "a", label: "A", unit: "u", points: [{ value: 1 }], observationPeriod: null, freshness: freshness("current") });
    const b = buildIndicatorEvidence({ seriesId: "b", label: "B", unit: "u", points: [{ value: 1 }], observationPeriod: null, freshness: freshness("current") });
    const result = computeSignalConfidence([a, b], now);
    expect(result.confidence).toBe("High");
    expect(result.confidenceScore).toBe(100);
  });

  it("a delayed-release (usable but late) indicator deducts via isStale, not isFallback", () => {
    const fresh = buildIndicatorEvidence({ seriesId: "a", label: "A", unit: "u", points: [{ value: 1 }], observationPeriod: null, freshness: freshness("current") });
    const delayed = buildIndicatorEvidence({ seriesId: "b", label: "B", unit: "u", points: [{ value: 1 }], observationPeriod: null, freshness: freshness("delayed-release") });
    const result = computeSignalConfidence([fresh, delayed], now);
    expect(result.confidenceScore).toBe(95); // 100 - 5 (one stale-flagged, non-fallback indicator)
  });

  it("a fallback-flagged indicator deducts more than a merely-delayed one", () => {
    const fallback = buildIndicatorEvidence({ seriesId: "a", label: "A", unit: "u", points: [{ value: 1 }], observationPeriod: null, freshness: freshness("current"), isFallback: true });
    const result = computeSignalConfidence([fallback], now);
    expect(result.confidenceScore).toBe(90); // 100 - 10 (fallback)
  });

  it("a Stale indicator alongside a usable one still deducts (-5, isStale) — not silently dropped from the score just because it's excluded from `state` reasoning", () => {
    const fresh = buildIndicatorEvidence({ seriesId: "a", label: "A", unit: "u", points: [{ value: 1 }], observationPeriod: null, freshness: freshness("current") });
    const stale = buildIndicatorEvidence({ seriesId: "b", label: "B", unit: "u", points: [{ value: 1 }], observationPeriod: null, freshness: freshness("stale") });
    const result = computeSignalConfidence([fresh, stale], now);
    // usableCount (1) > 0 so this is NOT "Insufficient" — but the stale
    // entry still counts as an isStale (-5) deduction, proving it isn't
    // silently excluded from the math just because `state` reasoning
    // can't use it. Confirmed old (Stale) maps to the same -5 "isStale"
    // deduction the existing codebase already uses for "older than
    // expected frequency" — Unavailable (no registry entry / source
    // genuinely unreachable) is the more severe -10 case, tested below.
    expect(result.confidenceScore).toBe(95);
    expect(result.confidence).toBe("High");
  });

  it("an Unavailable indicator (no freshness registry entry) deducts the stronger -10, same as a fallback", () => {
    const fresh = buildIndicatorEvidence({ seriesId: "a", label: "A", unit: "u", points: [{ value: 1 }], observationPeriod: null, freshness: freshness("current") });
    const unavailable = buildIndicatorEvidence({ seriesId: "b", label: "B", unit: "u", points: [{ value: 1 }], observationPeriod: null, freshness: undefined });
    const result = computeSignalConfidence([fresh, unavailable], now);
    expect(result.confidenceScore).toBe(90);
  });
});
