// Shapes series into what the chart components take. Pure, so the mapping from
// "a series and a range" to "the numbers a chart draws" is tested, not assumed.
//
// The one rule here that matters: merging several series onto a shared month
// axis leaves a month with no observation as `null` — which the line charts draw
// as a gap and the tooltips print as "no data" — never as zero.

import { monthIndex, shortMonthLabel, monthLabel, type MonthKey, type MonthlyPoint } from "@/lib/inflation/periods";
import { formatValue } from "@/lib/analytics/scales";

export type RangeKey = "12" | "24" | "60" | "all";

export const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: "12", label: "12 months" },
  { value: "24", label: "24 months" },
  { value: "60", label: "5 years" },
  { value: "all", label: "All" },
];

/** The last N months of a series ending at its newest observation (all of it for "all"). */
export function sliceRange<T extends { month: MonthKey }>(points: readonly T[], range: RangeKey): T[] {
  if (range === "all" || points.length === 0) return [...points];
  const n = Number(range);
  const newest = monthIndex(points[points.length - 1].month);
  // By CALENDAR months back from the newest point, not "the last n entries" — they differ if the series has gaps.
  return points.filter((p) => monthIndex(p.month) > newest - n);
}

export function toBars(points: readonly MonthlyPoint[]): { period: string; value: number }[] {
  return points.map((p) => ({ period: shortMonthLabel(p.month), value: p.value }));
}

/** Months covered by any of the series, ascending. */
export function unionMonths(series: Record<string, readonly MonthlyPoint[]>): MonthKey[] {
  return [...new Set(Object.values(series).flatMap((s) => s.map((p) => p.month)))].sort();
}

/** Months present in EVERY series, ascending — the only months a like-for-like comparison may use. */
export function commonMonths(series: Record<string, readonly MonthlyPoint[]>): MonthKey[] {
  const sets = Object.values(series).map((s) => new Set(s.map((p) => p.month)));
  if (sets.length === 0) return [];
  return [...sets[0]].filter((m) => sets.every((s) => s.has(m))).sort();
}

/** One row per month; a series with no observation that month gets null (never 0). */
export function mergeSeries(series: Record<string, readonly MonthlyPoint[]>, months: readonly MonthKey[]): ({ period: string; month: MonthKey } & Record<string, number | string | null>)[] {
  const maps = Object.fromEntries(Object.entries(series).map(([k, pts]) => [k, new Map(pts.map((p) => [p.month, p.value]))]));
  return months.map((month) => {
    const row: { period: string; month: MonthKey } & Record<string, number | string | null> = { period: shortMonthLabel(month), month };
    for (const k of Object.keys(series)) row[k] = maps[k].get(month) ?? null;
    return row;
  });
}

/** Table-alternative rows: month label then each series' value as text (or null for "no data"). */
export function tableRowsFor(series: Record<string, readonly MonthlyPoint[]>, months: readonly MonthKey[], decimals = 1, suffix = "%"): (string | null)[][] {
  const maps = Object.fromEntries(Object.entries(series).map(([k, pts]) => [k, new Map(pts.map((p) => [p.month, p.value]))]));
  return months.map((m) => [monthLabel(m), ...Object.keys(series).map((k) => (maps[k].has(m) ? `${formatValue(maps[k].get(m) as number, decimals)}${suffix}` : null))]);
}

/** "Jul 2022 – Oct 2026 (52 months)" for a plain list of months. */
export function monthsCoverage(months: readonly MonthKey[]): string {
  if (months.length === 0) return "no observations";
  return `${monthLabel(months[0])} – ${monthLabel(months[months.length - 1])} (${months.length} months)`;
}

export function coverageText(points: readonly MonthlyPoint[]): string {
  if (points.length === 0) return "no observations";
  return `${monthLabel(points[0].month)} – ${monthLabel(points[points.length - 1].month)} (${points.length} months)`;
}
