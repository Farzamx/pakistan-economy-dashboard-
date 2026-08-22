// Pure trend transformations — Phase 9.1.
//
// Deliberately NOT technical-indicator logic (no RSI/MACD/moving-average
// crossovers — see Phase 9.1 brief step 5). These are plain, economically
// legible transformations: absolute/percent change between two adjacent
// observations, direction (sign only), and acceleration (change-of-change).
//
// NO INVENTED THRESHOLDS: "direction" is the literal sign of the delta.
// There is no "materially flat" epsilon band — a value one unit off zero is
// Rising or Falling, never "flat but we rounded it away". Introducing an
// epsilon would require an economically-justified threshold this phase has
// no evidence for (Phase 9.1 brief step 4: "Do NOT invent economic
// thresholds... STOP and report the missing decision" — this file avoids
// needing one at all rather than inventing one).
//
// Pure, synchronous, zero I/O — safe to unit test with plain fixtures and
// safe to call from a Server Component without any async boundary.

import type { SignalDirection } from "./types";

export interface TrendChange {
  direction: SignalDirection;
  absolute: number | null;
  percent: number | null;
}

/** Sign-only direction between two numbers. Null latest/previous -> "Unknown", never a guessed direction. */
export function computeDirection(latest: number | null, previous: number | null): SignalDirection {
  if (latest === null || previous === null) return "Unknown";
  if (latest > previous) return "Rising";
  if (latest < previous) return "Falling";
  return "Flat";
}

/**
 * Change between the latest value and the immediately preceding one.
 * `percent` is null when `previous` is 0 (division is undefined, not
 * fabricated as Infinity/0) or when either input is null.
 */
export function computeChange(latest: number | null, previous: number | null): TrendChange {
  const direction = computeDirection(latest, previous);
  if (latest === null || previous === null) {
    return { direction, absolute: null, percent: null };
  }
  const absolute = latest - previous;
  const percent = previous !== 0 ? (absolute / Math.abs(previous)) * 100 : null;
  return { direction, absolute, percent };
}

export type AccelerationState = "Accelerating" | "Decelerating" | "Steady" | "Unknown";

/**
 * Second-derivative sign: is the most recent period-over-period change
 * itself larger or smaller (in magnitude, same-signed) than the prior
 * period's change? "Accelerating" means the trend is moving faster in the
 * SAME direction as the latest change; "Decelerating" means it is slowing,
 * still describing the same directional move, never re-labeled as a
 * reversal (a reversal is a `direction` change, a separate fact).
 */
export function computeAcceleration(latestChange: number | null, priorChange: number | null): AccelerationState {
  if (latestChange === null || priorChange === null) return "Unknown";
  if (latestChange === 0 && priorChange === 0) return "Steady";
  const latestMagnitude = Math.abs(latestChange);
  const priorMagnitude = Math.abs(priorChange);
  if (latestMagnitude > priorMagnitude) return "Accelerating";
  if (latestMagnitude < priorMagnitude) return "Decelerating";
  return "Steady";
}

/** Minimal shape trend analysis needs — deliberately not TrendPoint (components/charts) to keep this lib decoupled from UI component types. Callers map their own TrendPoint[]/history rows into this. */
export interface TrendSeriesPoint {
  value: number;
}

/**
 * Convenience wrapper for a read model's own trend/history array (oldest
 * first, matching every existing read model's convention — sbp.ts,
 * worldBank.ts, the canonical stores). Returns null fields when there are
 * fewer than 2 points (change) or fewer than 3 (acceleration) — never
 * fabricates a trend from insufficient history.
 */
export interface SeriesTrendSummary {
  latestValue: number | null;
  previousValue: number | null;
  change: TrendChange;
  acceleration: AccelerationState;
}

export function summarizeTrend(points: readonly TrendSeriesPoint[]): SeriesTrendSummary {
  const n = points.length;
  const latestValue = n >= 1 ? points[n - 1].value : null;
  const previousValue = n >= 2 ? points[n - 2].value : null;
  const change = computeChange(latestValue, previousValue);

  let acceleration: AccelerationState = "Unknown";
  if (n >= 3) {
    const priorChange = points[n - 2].value - points[n - 3].value;
    acceleration = computeAcceleration(change.absolute, priorChange);
  }

  return { latestValue, previousValue, change, acceleration };
}
