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
}

/** Pulls the first signed number out of strings like "6.8% YoY", "-$0.4B", "11.0% (hold expected)", "$11.2B". Returns null for non-numeric values ("Federal Budget 2026-27", "Not available"). */
export function parseEventValue(value: string | null | undefined): ParsedValue | null {
  if (!value) return null;
  const match = value.match(/(-?\$?-?[\d,]+\.?\d*)\s*([%A-Za-z]*)/);
  if (!match) return null;
  const numStr = match[1].replace(/\$/g, "").replace(/,/g, "");
  const num = parseFloat(numStr);
  if (Number.isNaN(num)) return null;
  const decimalPart = numStr.split(".")[1];
  return { num, decimals: decimalPart ? decimalPart.length : 0, unit: match[2] };
}

export function calculateSurprise(actual: string | null | undefined, forecast: string | null | undefined): SurpriseResult {
  const parsedActual = parseEventValue(actual);
  const parsedForecast = parseEventValue(forecast);
  if (!parsedActual || !parsedForecast) {
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
  const deltaLabel = `${delta >= 0 ? "+" : ""}${delta.toFixed(decimals)}${unit}`;

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
