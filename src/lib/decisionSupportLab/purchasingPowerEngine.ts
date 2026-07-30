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
