// Surprise Analysis (Phase 2B) — Actual vs Forecast, computed from the same
// free-text value strings already shown on every event ("6.8% YoY",
// "-$0.4B", "11.0% (hold expected)"). Deliberately stays NEUTRAL about
// whether a higher-than-forecast reading is "good" or "bad" — that
// direction-specific interpretation belongs to marketReactionEngine.ts, not
// here. This file only answers "did the actual number come in above,
// below, or in line with what was forecast."

export type SurpriseDirection = "positive" | "negative" | "in-line" | "unavailable";

export interface SurpriseResult {
  direction: SurpriseDirection;
  /** actual - forecast, in the parsed unit (percentage points, $B, etc) — null if either value couldn't be parsed numerically. */
  delta: number | null;
  /** "+0.3" / "-0.4" formatted to the same decimal precision as the input, with the detected unit suffix appended — null if delta is null. */
  deltaLabel: string | null;
}

interface ParsedValue {
  num: number;
  /** Decimal places in the original string, used so deltaLabel doesn't imply false precision (e.g. two whole-number inputs produce a whole-number delta, not "1.00"). */
  decimals: number;
  /** The unit text immediately following the number — "%", "B", "bn", etc. */
  unit: string;
  /**
   * Frequency/metric qualifier extracted from the full value string, uppercased.
   * "YOY" from "6.4% YoY", "MOM" from "+0.3% MoM", "WOW" from "+0.5% WoW".
   * null if no recognised qualifier is present.
   * Used to detect cross-metric comparisons (YoY actual vs MoM forecast) which
   * produce numerically well-formed but economically meaningless surprises.
   */
  metricLabel: string | null;
}

/** Recognised frequency qualifiers. Comparisons across these labels are invalid. */
const FREQUENCY_QUALIFIERS = new Set(["YOY", "MOM", "WOW"]);

/**
 * Pulls the first signed number out of strings like "6.8% YoY", "-$0.4B",
 * "11.0% (hold expected)", "$11.2B". Returns null for non-numeric values
 * ("Federal Budget 2026-27", "Not available").
 */
export function parseEventValue(value: string | null | undefined): ParsedValue | null {
  if (!value) return null;
  const match = value.match(/(-?\$?-?[\d,]+\.?\d*)\s*([%A-Za-z]*)/);
  if (!match) return null;
  const numStr = match[1].replace(/\$/g, "").replace(/,/g, "");
  const num = parseFloat(numStr);
  if (Number.isNaN(num)) return null;
  const decimalPart = numStr.split(".")[1];

  // Detect frequency qualifier anywhere in the full value string.
  const qualifierMatch = value.match(/\b(YoY|MoM|WoW)\b/i);
  const metricLabel = qualifierMatch ? qualifierMatch[1].toUpperCase() : null;

  return { num, decimals: decimalPart ? decimalPart.length : 0, unit: match[2], metricLabel };
}

export function calculateSurprise(actual: string | null | undefined, forecast: string | null | undefined): SurpriseResult {
  const parsedActual = parseEventValue(actual);
  const parsedForecast = parseEventValue(forecast);
  if (!parsedActual || !parsedForecast) {
    return { direction: "unavailable", delta: null, deltaLabel: null };
  }

  // Guard: if both values carry a frequency qualifier (YoY/MoM/WoW) and they
  // differ, the comparison is cross-metric and the surprise is meaningless.
  // e.g. actual "+0.3% MoM" vs forecast "6.4% YoY" → return unavailable rather
  // than displaying a nonsensical "-6.1" surprise.
  // Note: this guard catches mismatches only when the stored label is correct.
  // If a MoM value is MISLABELED as YoY (the root cause of the June 2026 bug),
  // both will read "YOY" and this guard won't fire — fixing the parser patterns
  // in syncCpiFromPbs.ts is the authoritative fix for that case.
  const aLabel = parsedActual.metricLabel;
  const fLabel = parsedForecast.metricLabel;
  if (aLabel && fLabel && FREQUENCY_QUALIFIERS.has(aLabel) && FREQUENCY_QUALIFIERS.has(fLabel) && aLabel !== fLabel) {
    return { direction: "unavailable", delta: null, deltaLabel: null };
  }

  const delta = parsedActual.num - parsedForecast.num;
  // "In line" tolerance: within 5% of the forecast's own magnitude, or a
  // small absolute floor for near-zero forecasts (e.g. a fiscal balance
  // hovering around 0) — avoids flagging immaterial rounding as a surprise.
  const threshold = Math.max(Math.abs(parsedForecast.num) * 0.05, 0.05);
  const direction: SurpriseDirection = Math.abs(delta) <= threshold ? "in-line" : delta > 0 ? "positive" : "negative";
  const decimals = Math.max(parsedActual.decimals, parsedForecast.decimals);
  const unit = parsedActual.unit || parsedForecast.unit;
  // For percentage-unit series, the delta is in percentage points (pp) not percent —
  // "−6.1pp" is unambiguous; "−6.1%" could be misread as a relative change.
  const deltaUnit = unit === "%" ? "pp" : unit;
  const deltaLabel = `${delta >= 0 ? "+" : ""}${delta.toFixed(decimals)}${deltaUnit}`;

  return { direction, delta, deltaLabel };
}

export const SURPRISE_LABELS: Record<SurpriseDirection, string> = {
  positive: "Positive Surprise",
  negative: "Negative Surprise",
  "in-line": "In Line",
  unavailable: "—",
};

export const SURPRISE_BADGE_CLASS: Record<SurpriseDirection, string> = {
  positive: "border-emerald-400/30 bg-emerald-400/10 text-emerald-400",
  negative: "border-rose-400/30 bg-rose-400/10 text-rose-400",
  "in-line": "border-white/20 bg-white/5 text-white/60 light:border-slate-300 light:bg-slate-100 light:text-slate-600",
  unavailable: "border-white/10 bg-white/[0.02] text-white/30 light:border-slate-200 light:bg-slate-50 light:text-slate-400",
};
