// Decision Support Lab — Purchasing Power engine.
//
// Split generic/specific the same way personalInflation/engine.ts is:
// deflate()/inflate() are the reusable index-ratio primitives every
// time-value-of-money tool in this Lab will eventually need (Future Value,
// Present Value, Real Return, Savings Erosion all reduce to "scale an
// amount by the ratio of two index/rate levels") — computePurchasingPower()
// and buildPurchasingPowerTimeline() are what THIS tool needs from them.
import type { CpiIndexPoint } from "@/lib/data/cpiMonthlyIndex";

/** Nominal amount today that buys what `amount` bought at a period with `fromIndex`, given today's `toIndex`. */
export function inflate(amount: number, fromIndex: number, toIndex: number): number {
  return amount * (toIndex / fromIndex);
}

/** Real (purchasing-power) value, in `fromIndex`-period terms, of an amount that is nominally worth `amount` at `toIndex`. Inverse of inflate(). */
export function deflate(amount: number, fromIndex: number, toIndex: number): number {
  return amount * (fromIndex / toIndex);
}

export interface PurchasingPowerResult {
  amount: number;
  baseDate: string;
  targetDate: string;
  baseIndex: number;
  targetIndex: number;
  /** Nominal amount needed today to buy what `amount` bought at baseDate. */
  inflationAdjustedValue: number;
  /** What `amount`, held as cash since baseDate, is actually worth today in baseDate purchasing-power terms. */
  realValueToday: number;
  /** % change in the index level between the two dates. */
  totalInflationPct: number;
  /** amount − realValueToday — the PKR purchasing power destroyed by inflation. */
  purchasingPowerLost: number;
  /** purchasingPowerLost as a % of the original amount. */
  purchasingPowerLostPct: number;
}

export function computePurchasingPower(amount: number, base: CpiIndexPoint, target: CpiIndexPoint): PurchasingPowerResult {
  const inflationAdjustedValue = inflate(amount, base.indexValue, target.indexValue);
  const realValueToday = deflate(amount, base.indexValue, target.indexValue);
  const totalInflationPct = (target.indexValue / base.indexValue - 1) * 100;
  const purchasingPowerLost = amount - realValueToday;
  const purchasingPowerLostPct = amount > 0 ? (purchasingPowerLost / amount) * 100 : 0;

  return {
    amount,
    baseDate: base.observationDate,
    targetDate: target.observationDate,
    baseIndex: base.indexValue,
    targetIndex: target.indexValue,
    inflationAdjustedValue,
    realValueToday,
    totalInflationPct,
    purchasingPowerLost,
    purchasingPowerLostPct,
  };
}

export interface TimelinePoint {
  date: string;
  /** Real (base-period-equivalent) value of the original amount at this point on the timeline. */
  realValue: number;
  indexValue: number;
}

/**
 * Builds a month-by-month erosion path of `amount`'s real value from
 * baseDate to targetDate (inclusive), for the "interactive timeline" /
 * waterfall visualisations. Points outside [baseDate, targetDate] in the
 * series are excluded — the chart should never imply history before the
 * amount existed or after "today."
 */
export function buildPurchasingPowerTimeline(amount: number, base: CpiIndexPoint, target: CpiIndexPoint, series: CpiIndexPoint[]): TimelinePoint[] {
  return series
    .filter((p) => p.observationDate >= base.observationDate && p.observationDate <= target.observationDate)
    .map((p) => ({
      date: p.observationDate,
      realValue: deflate(amount, base.indexValue, p.indexValue),
      indexValue: p.indexValue,
    }));
}

// Phase 3 — Income & Wealth Intelligence primitives. These generalize
// inflate()/deflate() (which compare two REAL index observations) to the
// case every salary/savings tool actually has: a single annual rate
// (a raise %, an inflation %) applied over N years of compounding. Kept
// here rather than duplicated per-tool per the brief's explicit "Salary
// tools should reuse the Purchasing Power Engine whenever possible"
// instruction — Raise Reality Check, Salary Required, Future Salary
// Projection and Savings Erosion all reduce to one of the two functions
// below.

/**
 * Precise real (inflation-adjusted) rate of change from a nominal rate and
 * an inflation rate, using compounding — NOT the common shorthand
 * `nominal - inflation`, which is only a linear approximation. E.g. a 10%
 * nominal raise against 12% inflation is a real change of
 * ((1.10/1.12)-1)*100 = -1.79%, not -2%. Both inputs are percentages
 * (e.g. 10 for 10%).
 */
export function computeRealRateChange(nominalPct: number, inflationPct: number): number {
  return ((1 + nominalPct / 100) / (1 + inflationPct / 100) - 1) * 100;
}

/** Compounds `baseValue` forward by a constant annual `ratePct` over `years` — the nominal projection primitive every multi-year salary/savings tool needs. */
export function projectCompounding(baseValue: number, ratePct: number, years: number): number {
  return baseValue * Math.pow(1 + ratePct / 100, years);
}

/** Real (today's-purchasing-power) value of a nominal amount after `years` of `inflationPct` compounding — the multi-year generalization of deflate(), for when the two comparison points are "now" and "N years from now at a constant rate" rather than two real index observations. */
export function deflateCompounding(nominalValue: number, inflationPct: number, years: number): number {
  return nominalValue / Math.pow(1 + inflationPct / 100, years);
}

export interface ProjectionYearPoint {
  year: number;
  nominalValue: number;
  realValue: number;
}

/**
 * Year-by-year nominal and real value path of `baseValue` growing at
 * `growthPct` annually while inflation runs at `inflationPct` — the shared
 * data shape behind Future Salary Projection's chart and Savings Erosion's
 * chart alike (a salary growing at a raise rate and idle savings growing
 * at 0% are both just this function called with a different `growthPct`).
 * Year 0 is the starting point (both values equal baseValue).
 */
export function buildProjectionSeries(baseValue: number, growthPct: number, inflationPct: number, years: number): ProjectionYearPoint[] {
  const points: ProjectionYearPoint[] = [];
  for (let y = 0; y <= years; y++) {
    const nominalValue = projectCompounding(baseValue, growthPct, y);
    points.push({ year: y, nominalValue, realValue: deflateCompounding(nominalValue, inflationPct, y) });
  }
  return points;
}

/** Finds the series point closest to (but not after) `date` — used to resolve a user's "Base Year"/"Target Year" selection to the nearest real observation. */
export function findNearestIndexPoint(series: CpiIndexPoint[], date: string): CpiIndexPoint | null {
  const eligible = series.filter((p) => p.observationDate <= date);
  if (eligible.length === 0) return series[0] ?? null;
  return eligible[eligible.length - 1];
}

export interface YearOption {
  year: number;
  /** The actual latest observation within that calendar year — e.g. December for a full year, June for the series' final partial year. Surfaced in the UI so "2026" never silently means a different month than "2023" does. */
  point: CpiIndexPoint;
}

/**
 * One selectable option per calendar year present in the series, each
 * resolved to that year's LATEST real observation (not an interpolated
 * "annual average") — the calculator asks for "Base Year"/"Target Year"
 * but the underlying math always operates on one real monthly index
 * point, disclosed via `point.observationDate`.
 */
export function getAvailableYears(series: CpiIndexPoint[]): YearOption[] {
  const byYear = new Map<number, CpiIndexPoint>();
  for (const p of series) {
    const year = parseInt(p.observationDate.slice(0, 4), 10);
    const existing = byYear.get(year);
    if (!existing || p.observationDate > existing.observationDate) byYear.set(year, p);
  }
  return [...byYear.entries()].sort((a, b) => a[0] - b[0]).map(([year, point]) => ({ year, point }));
}

/**
 * Average annual inflation between two dates, derived directly from the
 * real historical CPI index — the compound annual growth rate of the
 * index level itself, i.e. ((endIndex ÷ startIndex)^(1/years) − 1) × 100.
 * This is what every "Entry Year → Exit Year" tool across the Lab uses
 * to auto-fill an inflation rate instead of asking the visitor to type
 * one in: select two years, and the rate is read off the same official
 * series the Purchasing Power Calculator already uses, not estimated.
 *
 * Returns null when the series doesn't cover the requested range (no
 * historical data available), or when the two dates resolve to the same
 * observation — callers fall back to the latest official CPI rate in
 * that case, never to a fabricated number.
 */
export function calculateAverageAnnualInflation(series: CpiIndexPoint[], startDate: string, endDate: string): number | null {
  if (series.length === 0) return null;
  const [fromDate, toDate] = startDate <= endDate ? [startDate, endDate] : [endDate, startDate];
  const startPoint = findNearestIndexPoint(series, fromDate);
  const endPoint = findNearestIndexPoint(series, toDate);
  if (!startPoint || !endPoint || startPoint.observationDate === endPoint.observationDate || startPoint.indexValue <= 0) return null;

  const msPerYear = 365.25 * 24 * 60 * 60 * 1000;
  const years = (new Date(endPoint.observationDate).getTime() - new Date(startPoint.observationDate).getTime()) / msPerYear;
  if (years <= 0) return null;

  return (Math.pow(endPoint.indexValue / startPoint.indexValue, 1 / years) - 1) * 100;
}
