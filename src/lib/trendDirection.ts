import type { Trend } from "@/data/kpiData";

/**
 * The single canonical place a period-over-period `diff` becomes an arrow
 * direction — every Kpi builder should call this instead of hand-rolling
 * `diff >= 0 ? "up" : "down"`. That pattern has two failure modes: it
 * silently reads "no previous observation" as "up" (a missing diff was
 * defaulted to 0, and 0 >= 0), and it can't express "unchanged" at all.
 *
 * null/undefined (no valid previous observation) and an exact-zero diff
 * both mean "neutral" — green only for a genuine increase, red only for a
 * genuine decrease, matching institutional-dashboard convention (PEIC v2.2).
 */
export function getTrendDirection(diff: number | null | undefined): Trend {
  if (diff === null || diff === undefined || diff === 0) return "neutral";
  return diff > 0 ? "up" : "down";
}
