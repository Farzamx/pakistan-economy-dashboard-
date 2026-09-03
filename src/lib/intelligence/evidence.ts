// Freshness gating + evidence construction + confidence — Phase 9.1.
//
// FRESHNESS: this file NEVER recomputes or infers freshness. Every
// classification below is a direct, documented mapping FROM the existing
// authoritative FreshnessResult.state (freshnessEngine.ts) — via the
// engine's own FRESHNESS_SEVERITY table where possible — never derived from
// sourceStatus (kpiData.ts's own doc comment: "Never read sourceStatus to
// answer 'is this current?'"). A caller that has no FreshnessResult at all
// (an indicator with no seriesRegistry.ts entry — see macroIntelligence.ts
// for the one series this applies to, the live intraday USD/PKR quote)
// passes `undefined`; that is represented honestly as "not-registered", not
// silently treated as fresh.
//
// CONFIDENCE: reuses src/lib/riskModels.ts's own ConfidenceLevel/
// IndicatorStatus/computeDataConfidence() verbatim — the repository already
// has a defensible, reviewed confidence model (deductions for fallback/stale
// inputs, High >=90 / Moderate >=70 / Low otherwise). This file adds exactly
// one thing that function does not model: zero valid inputs. Calling
// computeDataConfidence([]) would silently return {score:100, level:"High"}
// — a false-confidence bug for literally no evidence — so this file never
// calls it on an empty list; that case is represented as "Insufficient"
// with a null score instead (Phase 9.1 brief step 7).

import type { FreshnessResult } from "@/lib/freshness/freshnessEngine";
import { computeDataConfidence, type IndicatorStatus, type DataConfidence } from "@/lib/riskModels";
import type { TrendSeriesPoint } from "./trendAnalysis";
import { summarizeTrend } from "./trendAnalysis";
import type { IndicatorObservationEvidence, SignalConfidence, SignalInputAvailability } from "./types";

/**
 * Maps one FreshnessResult's state to the coarser 4-way availability a
 * signal rule reasons over. Documented per case — never a blanket default:
 *   current / market-closed / awaiting-release -> Fresh
 *     (all three are FRESHNESS_SEVERITY "healthy": the served observation
 *     IS the correct current answer, whether because it's genuinely current,
 *     the market is closed and the last session's print is still correct, or
 *     the next release simply isn't due yet.)
 *   delayed-release / ingestion-lagging -> DelayedRelease
 *     (both "caution": late, but with a benign/self-resolving explanation on
 *     the table per the engine's own evidence — still usable, but the signal
 *     must say so rather than presenting it as current.)
 *   source-unavailable -> Unavailable
 *     (also "caution" in the engine's severity table, but this file treats
 *     it more conservatively than the engine's own UI severity would imply:
 *     "we could not reach the source" gives no positive evidence the served
 *     value is even the right one, unlike delayed-release/ingestion-lagging
 *     which both mean "we know the value, we know why it's late." A signal
 *     should not reason over a value it cannot vouch for at all.)
 *   stale / validation-failed -> Stale
 *     (both "problem": confirmed too old or confirmed rejected — never used
 *     as if current.)
 */
export function classifyAvailability(state: FreshnessResult["state"] | undefined): SignalInputAvailability {
  if (state === undefined) return "Unavailable";
  switch (state) {
    case "current":
    case "market-closed":
    case "awaiting-release":
      return "Fresh";
    case "delayed-release":
    case "ingestion-lagging":
      return "DelayedRelease";
    case "source-unavailable":
      return "Unavailable";
    case "stale":
    case "validation-failed":
      return "Stale";
  }
}

/** Whether an indicator at this availability level may be used as the basis for an assertive signal state (vs. forcing "insufficient-data"). Fresh and DelayedRelease both qualify — DelayedRelease is still the right value, just late for a known reason; Stale and Unavailable never qualify. */
export function isUsableForSignal(availability: SignalInputAvailability): boolean {
  return availability === "Fresh" || availability === "DelayedRelease";
}

export interface BuildEvidenceInput {
  seriesId: string;
  label: string;
  unit: string;
  /** Oldest-first history/trend points, matching every existing read model's convention. */
  points: readonly TrendSeriesPoint[];
  observationPeriod: string | null;
  freshness: FreshnessResult | undefined;
  /** True only when the source module itself already reported this value as a hardcoded/static fallback (e.g. SbpMeta.source.includes("fallback"), Kpi.sourceStatus === "fallback"). Never guessed — see the per-source construction in macroIntelligence.ts. Defaults to false when the source has no such concept exposed (e.g. FRED/Yahoo Gold canonical rows). */
  isFallback?: boolean;
  /**
   * Phase 9.6A fix. The read model's own authoritative current-value string
   * (e.g. `result.kpi.value`), when the caller's read model can produce a
   * value for `observationPeriod` that is NOT guaranteed to already be the
   * last element of `points` — concretely, sbpServer.ts's applyCanonicalOverride
   * rewrites kpi.value/meta.observationDate to a newer PBS advance-release
   * figure while deliberately leaving the SBP trend/sparkline (`points`)
   * unchanged (that array is shared with every KPI card/chart/comparison
   * consumer — see sbpServer.ts's own header). Before this fix, this
   * function always read `value` from `points`' last element, so an active
   * PBS override produced an evidence record pairing the NEW
   * `observationPeriod` with the OLD, pre-override value — two fields
   * describing different observations. Root-caused and reproduced in Phase
   * 9.6 (STOP), fixed here in Phase 9.6A.
   *
   * When provided (and parseable), `value` always comes from this string
   * instead of `points`, so `value` and `observationPeriod` can never
   * disagree about which observation they describe — the Phase 9.6A
   * invariant. Trend-derived direction/changeAbsolute/changePercent/
   * acceleration remain as computed from `points` ONLY when `points`' last
   * value would itself round to this same authoritative string (i.e. no
   * override/divergence is actually active — the ordinary case, verified
   * unchanged for every existing indicator: sbp.ts's seriesToIndicatorResult
   * builds both kpi.value and the trend's last point from the same raw
   * value with the same rounding). When they disagree, this function has no
   * validated way to know what the PRIOR comparable reading was — sbpServer.ts
   * itself only computes a same-methodology diff for CPI/Core/LSM, and
   * explicitly declines to for Trade Balance/Exports/Imports (BPM6 vs
   * customs-basis mismatch) — so direction/change/acceleration are reported
   * as Unknown/null rather than either fabricating a comparison or silently
   * reusing sbpServer.ts's per-indicator judgment (which isn't exposed here
   * and would have to be re-guessed). Omitted entirely by callers whose read
   * model has no such split concept (Reserves, GDP, Yahoo Gold) — for those,
   * behavior is byte-identical to before this fix.
   */
  authoritativeValueDisplay?: string | null;
}

/** Number of digits after the decimal point in a numeric string, e.g. "-3.98" -> 2, "9" -> 0. Used to compare a rounded trend point against an authoritative display string at the SAME precision it was actually displayed at, so ordinary display rounding (e.g. a 1-decimal KPI vs a 2-decimal-stored trend point) is never mistaken for a genuine value/trend divergence. */
function countDecimalPlaces(numericString: string): number {
  const dotIndex = numericString.indexOf(".");
  return dotIndex === -1 ? 0 : numericString.length - dotIndex - 1;
}

/** Builds one indicator's evidence entry, including its trend-derived direction/change — the single place read-model output is converted into the shape a signal rule consumes. */
export function buildIndicatorEvidence(input: BuildEvidenceInput): IndicatorObservationEvidence {
  const trend = summarizeTrend(input.points);
  const availability = classifyAvailability(input.freshness?.state);

  let value = trend.latestValue;
  let direction = trend.change.direction;
  let changeAbsolute = trend.change.absolute;
  let changePercent = trend.change.percent;
  let acceleration = trend.acceleration;

  if (input.authoritativeValueDisplay != null) {
    const authoritative = parseFloat(input.authoritativeValueDisplay);
    if (!Number.isNaN(authoritative)) {
      // The authoritative reading always wins for `value` — it is, by
      // definition, the same observation `observationPeriod` describes.
      value = authoritative;
      const decimals = countDecimalPlaces(input.authoritativeValueDisplay);
      const trendAgrees = trend.latestValue !== null && trend.latestValue.toFixed(decimals) === authoritative.toFixed(decimals);
      if (!trendAgrees) {
        // `points` does not (yet) include this observation — e.g. an active
        // PBS advance-release override. No validated prior comparable
        // reading is available here, so direction/change/acceleration are
        // Unknown rather than a comparison against a period `points` never
        // actually reached.
        direction = "Unknown";
        changeAbsolute = null;
        changePercent = null;
        acceleration = "Unknown";
      }
    }
  }

  return {
    seriesId: input.seriesId,
    label: input.label,
    value,
    unit: input.unit,
    observationPeriod: input.observationPeriod,
    direction,
    changeAbsolute,
    changePercent,
    acceleration,
    availability,
    freshnessState: input.freshness?.state ?? "not-registered",
    freshnessReason: input.freshness?.reason ?? "No freshness registry entry exists for this series — its currency cannot be verified by the freshness engine.",
    isFallback: input.isFallback ?? false,
  };
}

export interface SignalConfidenceResult {
  confidence: SignalConfidence;
  confidenceScore: number | null;
}

/**
 * Confidence for a signal built from `evidence`. Gate first: zero USABLE
 * indicators (Fresh or DelayedRelease) -> "Insufficient"/null, never a
 * fabricated high-confidence empty-input score (see file header).
 *
 * Otherwise, ALL evidence passed in — including any Stale/Unavailable
 * entries alongside the usable ones — feeds computeDataConfidence()'s own
 * deduction math, not just the usable subset. This matters: a signal with 1
 * fresh indicator and 5 stale ones must not score "High" by silently
 * dropping the 5 degraded ones from the calculation (they remain visible
 * separately via IntelligenceSignal.missingInputs) — every indicator that
 * was part of this signal's evidence set counts toward its confidence,
 * exactly matching how overview/page.tsx already uses this same function
 * for its Recession/Default indicator lists (every listed indicator
 * contributes a deduction if degraded; none are silently excluded).
 * Unavailable is treated as the stronger "isFallback"-shaped deduction
 * (-10) since it means the value could not be vouched for at all — a more
 * severe gap than a known-late-but-usable DelayedRelease value (-5, mapped
 * to isStale).
 */
export function computeSignalConfidence(evidence: readonly IndicatorObservationEvidence[], calculatedAt: string): SignalConfidenceResult {
  const usableCount = evidence.filter((e) => isUsableForSignal(e.availability)).length;
  if (usableCount === 0) {
    return { confidence: "Insufficient", confidenceScore: null };
  }
  const statuses: IndicatorStatus[] = evidence.map((e) => ({
    label: e.label,
    isFallback: e.isFallback || e.availability === "Unavailable",
    isStale: e.availability === "DelayedRelease" || e.availability === "Stale",
  }));
  const result: DataConfidence = computeDataConfidence(statuses, calculatedAt);
  return { confidence: result.level, confidenceScore: result.score };
}
