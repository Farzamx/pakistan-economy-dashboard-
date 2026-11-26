// Date-series primitives shared by the dataset build, the validation report and the derived indicators. Pure functions, no data imports.
//
// Frequency rules (docs/interest-rates-methodology.md):
//   - An administered rate (reverse repo, repo, policy target) is a STEP series: the value "in force" on a day is the last value set on or before it.
//     That is a statement of fact about an administered rate, not an interpolation.
//   - A market series (KIBOR, overnight repo, auction yields) has values only on its own observation dates. It is never carried forward to fill a gap.
//   - A monthly average of a daily series is the arithmetic mean of the days actually observed in that month, reported with the number of days.

import type { DateValue } from "./types";

/** The value of a step series in force on `date` (the last observation dated on or before it); null before the first one. `events` must be sorted. */
export function rateInForce(events: readonly DateValue[], date: string): number | null {
  let lo = 0;
  let hi = events.length - 1;
  let ans: number | null = null;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (events[mid][0] <= date) {
      ans = events[mid][1];
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return ans;
}

/** The step value in force at the END of a month (YYYY-MM), i.e. on its last calendar day. */
export function rateAtMonthEnd(events: readonly DateValue[], month: string): number | null {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return rateInForce(events, `${month}-${String(last).padStart(2, "0")}`);
}

export interface MonthlyMean {
  month: string; // YYYY-MM
  mean: number;
  days: number;
}

/** Monthly arithmetic means of a daily series (only days with a value count; a month with no value is absent, never zero). */
export function monthlyMeans(points: readonly (readonly [string, number | null])[]): MonthlyMean[] {
  const acc = new Map<string, { sum: number; n: number }>();
  for (const [d, v] of points) {
    if (v === null || !Number.isFinite(v)) continue;
    const k = d.slice(0, 7);
    const a = acc.get(k) ?? { sum: 0, n: 0 };
    a.sum += v;
    a.n += 1;
    acc.set(k, a);
  }
  return [...acc.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([month, a]) => ({ month, mean: a.sum / a.n, days: a.n }));
}

/** Months from `from` to `to` inclusive (YYYY-MM). */
export function monthRange(from: string, to: string): string[] {
  const out: string[] = [];
  let [y, m] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m === 13) {
      m = 1;
      y++;
    }
  }
  return out;
}

/** Whole days between two YYYY-MM-DD dates (b - a). */
export const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 864e5);

/** 0 = Sunday ... 6 = Saturday. */
export const weekday = (d: string) => new Date(`${d}T00:00:00Z`).getUTCDay();

/** Round half away from zero to `dp` decimals, avoiding binary noise (for comparisons with SBP's 2-decimal publications). */
export function round(v: number, dp: number): number {
  const f = 10 ** dp;
  return Math.sign(v) * Math.round(Math.abs(v) * f + 1e-9) / f;
}
