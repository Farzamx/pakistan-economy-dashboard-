// Month arithmetic for the Inflation page's analytics.
//
// Every series on the page is MONTHLY, so a period is a "YYYY-MM" key. Working
// in keys (not Date objects) keeps all the alignment logic timezone-free: a
// "2026-10-31" observation date is the month "2026-10" wherever the server
// runs, which a `new Date()` round-trip would not guarantee near midnight.

import { formatMonthLabel } from "@/lib/formatMonthLabel";

export type MonthKey = string; // "YYYY-MM"

export interface MonthlyPoint {
  month: MonthKey;
  value: number;
}

const MONTH_KEY = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function isMonthKey(value: string): boolean {
  return MONTH_KEY.test(value);
}

/** "2026-10-31" -> "2026-10". Throws on anything that is not a YYYY-MM-… date, rather than guessing. */
export function monthKeyOf(date: string): MonthKey {
  const key = date.slice(0, 7);
  if (!isMonthKey(key)) throw new Error(`Not a YYYY-MM date: "${date}"`);
  return key;
}

/** Months since year 0, so two keys can be subtracted. */
export function monthIndex(key: MonthKey): number {
  const m = MONTH_KEY.exec(key);
  if (!m) throw new Error(`Not a month key: "${key}"`);
  return Number(m[1]) * 12 + (Number(m[2]) - 1);
}

export function fromMonthIndex(index: number): MonthKey {
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** The month `delta` months after `key` (negative = before). */
export function shiftMonth(key: MonthKey, delta: number): MonthKey {
  return fromMonthIndex(monthIndex(key) + delta);
}

/** Whole months from `a` to `b` (b − a). */
export function monthsBetween(a: MonthKey, b: MonthKey): number {
  return monthIndex(b) - monthIndex(a);
}

/** "2026-10" -> "Oct 2026". */
export function monthLabel(key: MonthKey): string {
  return formatMonthLabel(`${key}-01`);
}

/** "2026-10" -> "Oct 26" — compact axis label. */
export function shortMonthLabel(key: MonthKey): string {
  const [year, month] = key.split("-");
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[Number(month) - 1]} ${year.slice(2)}`;
}

export function monthNumber(key: MonthKey): number {
  return Number(key.slice(5, 7));
}

export function yearOf(key: MonthKey): number {
  return Number(key.slice(0, 4));
}

/** Index a point list by month. Later duplicates win, which the callers' sources never produce — see `hasDuplicateMonths`. */
export function toMonthMap(points: readonly MonthlyPoint[]): Map<MonthKey, number> {
  return new Map(points.map((p) => [p.month, p.value]));
}

export function hasDuplicateMonths(points: readonly MonthlyPoint[]): boolean {
  return new Set(points.map((p) => p.month)).size !== points.length;
}

/** Observation-date series ("YYYY-MM-DD") -> month series, ascending. Throws on a malformed date or non-finite value. */
export function toMonthlyPoints(points: readonly { date: string; value: number }[]): MonthlyPoint[] {
  return points
    .map((p) => {
      if (!Number.isFinite(p.value)) throw new Error(`Non-finite value for ${p.date}`);
      return { month: monthKeyOf(p.date), value: p.value };
    })
    .sort((a, b) => a.month.localeCompare(b.month));
}

/** The last `n` points (all of them when n >= length). */
export function lastN<T>(items: readonly T[], n: number): T[] {
  return n >= items.length ? [...items] : items.slice(items.length - n);
}

/** Points whose month lies in [from, to] inclusive. */
export function between(points: readonly MonthlyPoint[], from: MonthKey, to: MonthKey): MonthlyPoint[] {
  return points.filter((p) => p.month >= from && p.month <= to);
}

/** Months in [from, to] that `points` does NOT cover — the gaps a chart must show as gaps. */
export function missingMonths(points: readonly MonthlyPoint[], from: MonthKey, to: MonthKey): MonthKey[] {
  const have = new Set(points.map((p) => p.month));
  const out: MonthKey[] = [];
  for (let i = monthIndex(from); i <= monthIndex(to); i++) {
    const key = fromMonthIndex(i);
    if (!have.has(key)) out.push(key);
  }
  return out;
}
