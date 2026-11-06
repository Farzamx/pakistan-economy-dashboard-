// Derived quantities for the Inflation page.
//
// EVERYTHING here is pure and deterministic (no I/O, no clock, no randomness)
// so it can be unit-tested against hand-computed values. Anything that is
// DERIVED rather than published is named as such, and its formula is in the
// comment above the function that computes it — the page's methodology section
// repeats those formulas for the reader.
//
// Rules this module never breaks:
//   - A missing observation is absent from the output or `null` in a matrix.
//     It is never replaced by zero, an average or an interpolated value.
//   - A change is only computed between two months that are EXACTLY the
//     requested distance apart. A gap in the data produces no point.
//   - Index LEVELS and inflation RATES are different types of number; no
//     function accepts one where it needs the other.

import { fromMonthIndex, monthIndex, monthNumber, shiftMonth, toMonthMap, yearOf, type MonthKey, type MonthlyPoint } from "@/lib/inflation/periods";
import type { CpiGroupPanel } from "@/lib/inflation/pbsGroups";
import { FOOD_GROUP_NO } from "@/lib/inflation/groups";

// ───────────────────────────── changes from an index ─────────────────────────────

/**
 * Percentage change of an index over `lag` months ending at `month`:
 *     (index[month] / index[month − lag] − 1) × 100
 * lag 12 gives YoY, lag 1 gives MoM. Returns null if either month is absent.
 */
export function pctChangeOverLag(index: ReadonlyMap<MonthKey, number>, month: MonthKey, lag: number): number | null {
  const now = index.get(month);
  const then = index.get(shiftMonth(month, -lag));
  if (now === undefined || then === undefined || then === 0) return null;
  return (now / then - 1) * 100;
}

/** `pctChangeOverLag` for every month in `months` where both ends exist, ascending. */
export function changeSeries(index: ReadonlyMap<MonthKey, number>, lag: number, months: readonly MonthKey[]): MonthlyPoint[] {
  const out: MonthlyPoint[] = [];
  for (const month of months) {
    const value = pctChangeOverLag(index, month, lag);
    if (value !== null) out.push({ month, value });
  }
  return out;
}

/** Headline index series -> YoY (lag 12) or MoM (lag 1) as a point list. */
export function indexChange(indexPoints: readonly MonthlyPoint[], lag: number): MonthlyPoint[] {
  const map = toMonthMap(indexPoints);
  return changeSeries(map, lag, indexPoints.map((p) => p.month).sort());
}

// ───────────────────────── contributions (exact decomposition) ─────────────────────────

export interface ContributionRow {
  month: MonthKey;
  /** The month the change is measured from (`month − lag`). */
  baseMonth: MonthKey;
  /** The headline % change over the lag, computed from the headline index. */
  headlinePct: number;
  /** Σ of the group contributions, percentage points. Equals `headlinePct` to within rounding of the published weights. */
  total: number;
  /** Percentage-point contribution of each group, keyed by group number. */
  byGroup: Record<number, number>;
}

/**
 * Each group's contribution to the headline % change over `lag` months:
 *
 *     contribution_i = (w_i / Σw) × (I_i[t] − I_i[t−lag]) / I[t−lag] × 100
 *
 * where w_i is the group's FIXED basket weight, I_i its index and I the
 * headline index. Because PBS's headline is the weighted mean of the group
 * indices (the identity `parseCpiGroupPanel` enforces), these contributions ADD
 * UP to the headline change: Σ contribution_i = headline % change, to within the
 * rounding of PBS's published index values (≤ 0.01 percentage points in the live
 * data). This is the same arithmetic as the "impact" columns in PBS's own
 * monthly inflation report.
 *
 * It is a contribution to the CHANGE IN THE INDEX, not a weight and not a group
 * inflation rate: a group with a small weight and a large rate and a group with
 * a large weight and a small rate can contribute the same.
 */
export function contributionsOverLag(panel: CpiGroupPanel, lag: number): ContributionRow[] {
  const weightSum = panel.groups.reduce((s, g) => s + g.weight, 0);
  const out: ContributionRow[] = [];
  for (const month of panel.months) {
    const baseMonth = shiftMonth(month, -lag);
    const base = panel.headlineIndex.get(baseMonth);
    const headlineNow = panel.headlineIndex.get(month);
    if (base === undefined || headlineNow === undefined || base === 0) continue;
    const byGroup: Record<number, number> = {};
    let total = 0;
    let complete = true;
    for (const g of panel.groups) {
      const now = g.index.get(month);
      const then = g.index.get(baseMonth);
      if (now === undefined || then === undefined) {
        complete = false;
        break;
      }
      const c = ((g.weight / weightSum) * (now - then)) / base * 100;
      byGroup[g.groupNo] = c;
      total += c;
    }
    if (!complete) continue;
    out.push({ month, baseMonth, headlinePct: (headlineNow / base - 1) * 100, total, byGroup });
  }
  return out;
}

/**
 * Index of "all groups except Food & Non-Alcoholic Beverages (group 1)":
 *     I_other[t] = Σ_{i≠1} w_i I_i[t] / Σ_{i≠1} w_i
 * A valid fixed-weight sub-aggregate of the same basket. It is NOT PBS's own
 * "non-food" measure (PBS publishes none) and must not be labelled as one: PBS's
 * food definition is wider than group 1, and the SBP "Urban Food" series covers
 * urban households only.
 */
export function otherGroupsIndex(panel: CpiGroupPanel): Map<MonthKey, number> {
  const others = panel.groups.filter((g) => g.groupNo !== FOOD_GROUP_NO);
  const wSum = others.reduce((s, g) => s + g.weight, 0);
  const out = new Map<MonthKey, number>();
  for (const month of panel.months) {
    let acc = 0;
    let ok = true;
    for (const g of others) {
      const v = g.index.get(month);
      if (v === undefined) {
        ok = false;
        break;
      }
      acc += g.weight * v;
    }
    if (ok) out.set(month, acc / wSum);
  }
  return out;
}

// ───────────────────────────── waterfall ─────────────────────────────

export interface WaterfallStep {
  groupNo: number;
  /** Change in this group's contribution between the two months, percentage points. */
  delta: number;
}

export interface Waterfall {
  from: MonthKey;
  to: MonthKey;
  /** Σ contributions at `from` = headline YoY at `from`. */
  start: number;
  steps: WaterfallStep[];
  /** Σ contributions at `to` = headline YoY at `to`. Always `start + Σ steps`. */
  end: number;
}

/**
 * How the headline YoY rate moved between two months, split by group:
 *   end − start = Σ_i ( contribution_i[to] − contribution_i[from] )
 * This is exactly additive (it is an identity of the contributions above), which
 * is the condition for a waterfall to be honest. Returns null unless both months
 * have a full decomposition.
 */
export function buildWaterfall(rows: readonly ContributionRow[], from: MonthKey, to: MonthKey): Waterfall | null {
  const a = rows.find((r) => r.month === from);
  const b = rows.find((r) => r.month === to);
  if (!a || !b) return null;
  const steps = Object.keys(a.byGroup)
    .map(Number)
    .sort((x, y) => x - y)
    .map((groupNo) => ({ groupNo, delta: b.byGroup[groupNo] - a.byGroup[groupNo] }));
  return { from, to, start: a.total, steps, end: b.total };
}

// ───────────────────────────── acceleration ─────────────────────────────

/**
 * Month-to-month change in an inflation RATE, in percentage points:
 *     Δrate[t] = rate[t] − rate[t−1]
 * Only between consecutive months. A positive value means the rate rose
 * (inflation accelerated), which is not the same as prices rising — prices keep
 * rising whenever the rate is above zero.
 */
export function acceleration(points: readonly MonthlyPoint[]): MonthlyPoint[] {
  const map = toMonthMap(points);
  const out: MonthlyPoint[] = [];
  for (const p of [...points].sort((a, b) => a.month.localeCompare(b.month))) {
    const prev = map.get(shiftMonth(p.month, -1));
    if (prev !== undefined) out.push({ month: p.month, value: p.value - prev });
  }
  return out;
}

// ───────────────────────────── alignment ─────────────────────────────

export interface AlignedPair<T> {
  latestMonth: MonthKey;
  /** The month immediately before `latestMonth`, present in every series; null if some series lacks it. */
  previousMonth: MonthKey | null;
  latest: T;
  previous: T | null;
}

/**
 * The newest month present in EVERY series, and its immediate predecessor when
 * every series also has that. Series that end in different months are therefore
 * compared at the last month they share, never at their own latest points.
 */
export function alignedLatest(series: Record<string, readonly MonthlyPoint[]>): AlignedPair<Record<string, number>> | null {
  const keys = Object.keys(series);
  if (keys.length === 0) return null;
  const maps = keys.map((k) => toMonthMap(series[k]));
  let shared = new Set(maps[0].keys());
  for (const m of maps.slice(1)) shared = new Set([...shared].filter((k) => m.has(k)));
  if (shared.size === 0) return null;
  const latestMonth = [...shared].sort().at(-1) as MonthKey;
  const prior = shiftMonth(latestMonth, -1);
  const valuesAt = (month: MonthKey): Record<string, number> => Object.fromEntries(keys.map((k, i) => [k, maps[i].get(month) as number]));
  const hasPrior = maps.every((m) => m.has(prior));
  return { latestMonth, previousMonth: hasPrior ? prior : null, latest: valuesAt(latestMonth), previous: hasPrior ? valuesAt(prior) : null };
}

// ───────────────────────────── distributions ─────────────────────────────

export interface HistogramBin {
  from: number;
  to: number;
  count: number;
}

/**
 * Equal-width histogram. Bins are [from, to) except the last, which is closed.
 * Bin edges are multiples of `binWidth`. Every value lands in exactly one bin,
 * so the counts sum to values.length.
 */
export function histogram(values: readonly number[], binWidth: number): HistogramBin[] {
  if (values.length === 0 || binWidth <= 0) return [];
  const lo = Math.floor(Math.min(...values) / binWidth) * binWidth;
  const hi = Math.max(Math.floor(Math.max(...values) / binWidth) * binWidth + binWidth, lo + binWidth);
  const bins: HistogramBin[] = [];
  const decimals = (binWidth.toString().split(".")[1] ?? "").length;
  const round = (n: number) => Number(n.toFixed(decimals + 2));
  for (let edge = lo; edge < hi - 1e-9; edge += binWidth) bins.push({ from: round(edge), to: round(edge + binWidth), count: 0 });
  for (const v of values) {
    let i = Math.floor((v - lo) / binWidth + 1e-9);
    if (i >= bins.length) i = bins.length - 1;
    if (i < 0) i = 0;
    bins[i].count++;
  }
  return bins;
}

export interface BoxStats {
  n: number;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  /** Lowest/highest value within 1.5 × IQR of the quartiles (Tukey). */
  whiskerLow: number;
  whiskerHigh: number;
  outliers: number[];
}

/** Linear-interpolation quantile (the "type 7" method used by Excel's QUARTILE.INC and R's default). */
export function quantile(sortedAscending: readonly number[], p: number): number {
  const n = sortedAscending.length;
  if (n === 0) return NaN;
  const pos = (n - 1) * p;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sortedAscending[lo] + (sortedAscending[hi] - sortedAscending[lo]) * (pos - lo);
}

/** Minimum observations before a box plot is meaningful — fewer would only show the values themselves. */
export const BOX_MIN_OBSERVATIONS = 8;

export function boxStats(values: readonly number[]): BoxStats | null {
  if (values.length < BOX_MIN_OBSERVATIONS) return null;
  const s = [...values].sort((a, b) => a - b);
  const q1 = quantile(s, 0.25);
  const q3 = quantile(s, 0.75);
  const fence = 1.5 * (q3 - q1);
  const inside = s.filter((v) => v >= q1 - fence && v <= q3 + fence);
  return {
    n: s.length,
    min: s[0],
    q1,
    median: quantile(s, 0.5),
    q3,
    max: s[s.length - 1],
    whiskerLow: inside[0],
    whiskerHigh: inside[inside.length - 1],
    outliers: s.filter((v) => v < q1 - fence || v > q3 + fence),
  };
}

// ───────────────────────────── matrices ─────────────────────────────

export interface MonthYearMatrix {
  years: number[];
  /** Twelve rows, January first. `cells[y]` is null where that month has no observation — never zero. */
  rows: { month: number; cells: (number | null)[] }[];
}

/** Rows = calendar month (1–12), columns = year; one cell per observation. */
export function monthYearMatrix(points: readonly MonthlyPoint[]): MonthYearMatrix {
  const years = [...new Set(points.map((p) => yearOf(p.month)))].sort((a, b) => a - b);
  const byKey = toMonthMap(points);
  const rows = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    return {
      month,
      cells: years.map((y) => {
        const v = byKey.get(`${y}-${String(month).padStart(2, "0")}`);
        return v === undefined ? null : v;
      }),
    };
  });
  return { years, rows };
}

/** Months from `from` to `to` inclusive, ascending. */
export function monthRange(from: MonthKey, to: MonthKey): MonthKey[] {
  const out: MonthKey[] = [];
  for (let i = monthIndex(from); i <= monthIndex(to); i++) out.push(fromMonthIndex(i));
  return out;
}

export { monthNumber };

// ───────────────────────────── policy rate alignment ─────────────────────────────

export interface PolicyDecision {
  /** "YYYY-MM-DD" date of the rate decision. */
  date: string;
  value: number;
}

/**
 * The SBP policy rate IN EFFECT at the end of `month`: the value of the latest
 * decision dated in or before that month. A policy rate is a step function — it
 * holds until the next decision — so this is the definition of the rate, not an
 * interpolation. Null before the first decision on record.
 */
export function policyRateAt(decisions: readonly PolicyDecision[], month: MonthKey): number | null {
  let value: number | null = null;
  let lastDate = "";
  for (const d of decisions) {
    if (d.date.slice(0, 7) <= month && d.date >= lastDate) {
      value = d.value;
      lastDate = d.date;
    }
  }
  return value;
}

/**
 * One value per month: the policy rate in effect. Months with no decision on
 * record yet are omitted (not zero). `horizon` is the last month the rate may be
 * assumed unchanged to — the latest month of data the page actually has.
 */
export function policyStepSeries(decisions: readonly PolicyDecision[], months: readonly MonthKey[], horizon: MonthKey): MonthlyPoint[] {
  const out: MonthlyPoint[] = [];
  for (const month of months) {
    if (month > horizon) continue;
    const v = policyRateAt(decisions, month);
    if (v !== null) out.push({ month, value: v });
  }
  return out;
}

export interface ScatterPair {
  /** The month of the inflation reading. */
  month: MonthKey;
  inflation: number;
  /** The policy rate in effect `lagMonths` after that reading. */
  policyRate: number;
}

/**
 * Pairs each inflation reading with the policy rate in effect `lagMonths` LATER
 * (0 = the same month). Pairs whose policy month lies beyond `horizon` are
 * dropped rather than extended — the data does not say what the rate will be.
 * The pairing says nothing about cause: it only aligns two series in time.
 */
export function laggedPairs(
  inflation: readonly MonthlyPoint[],
  decisions: readonly PolicyDecision[],
  lagMonths: number,
  horizon: MonthKey,
): ScatterPair[] {
  const out: ScatterPair[] = [];
  for (const p of inflation) {
    const policyMonth = shiftMonth(p.month, lagMonths);
    if (policyMonth > horizon) continue;
    const rate = policyRateAt(decisions, policyMonth);
    if (rate === null) continue;
    out.push({ month: p.month, inflation: p.value, policyRate: rate });
  }
  return out;
}

// ───────────────────────────── international ─────────────────────────────

export interface AnnualPoint {
  year: number;
  value: number | null;
}

export interface CountryYearMatrix {
  years: number[];
  /** `cells[i]` aligns with `years[i]`; null = no observation (never zero). */
  rows: { code: string; cells: (number | null)[] }[];
}

/** Rows = country, columns = year. Years are those where at least one listed country has a value. */
export function countryYearMatrix(series: Record<string, readonly AnnualPoint[]>, years?: readonly number[]): CountryYearMatrix {
  const codes = Object.keys(series);
  const present = new Set<number>();
  for (const code of codes) for (const p of series[code]) if (p.value !== null) present.add(p.year);
  const cols = (years ? [...years] : [...present]).sort((a, b) => a - b);
  return {
    years: cols,
    rows: codes.map((code) => {
      const byYear = new Map(series[code].map((p) => [p.year, p.value]));
      return { code, cells: cols.map((y) => byYear.get(y) ?? null) };
    }),
  };
}

/** The newest year in which EVERY listed country has a value, or null. */
export function latestCommonYear(series: Record<string, readonly AnnualPoint[]>): number | null {
  const sets = Object.values(series).map((s) => new Set(s.filter((p) => p.value !== null).map((p) => p.year)));
  if (sets.length === 0) return null;
  const common = [...sets[0]].filter((y) => sets.every((s) => s.has(y)));
  return common.length ? Math.max(...common) : null;
}

// ───────────────────────────── ranking ─────────────────────────────

/** Descending by `value`; ties keep the input order (stable), so a chart's order never flickers. */
export function rankDescending<T>(items: readonly T[], value: (item: T) => number): T[] {
  return items
    .map((item, i) => ({ item, i, v: value(item) }))
    .sort((a, b) => b.v - a.v || a.i - b.i)
    .map((x) => x.item);
}
