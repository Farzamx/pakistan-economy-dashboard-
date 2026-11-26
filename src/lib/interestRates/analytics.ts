// Descriptive analytics for the interest-rate dashboard. Everything returns its sample size. Correlation describes co-movement only; nothing here claims,
// or lets a caller present, a causal effect.

export interface Stat {
  date: string;
  value: number;
}

export interface SummaryStats {
  n: number;
  latest: Stat;
  mean: number;
  min: Stat;
  max: Stat;
  first: Stat;
}

/** Latest, mean, minimum and maximum (with their dates) of a dated series; null when it is empty. */
export function summarize(points: readonly Stat[]): SummaryStats | null {
  if (points.length === 0) return null;
  let min = points[0];
  let max = points[0];
  let sum = 0;
  for (const p of points) {
    sum += p.value;
    if (p.value < min.value) min = p;
    if (p.value > max.value) max = p;
  }
  return { n: points.length, latest: points[points.length - 1], first: points[0], mean: sum / points.length, min, max };
}

export interface PeriodDef {
  id: string;
  label: string;
  from: string; // inclusive, YYYY-MM or YYYY-MM-DD
  to: string; // inclusive
  definition: string;
}

/** Mean/min/max/n of a series inside each period (dates compared as strings, so YYYY-MM bounds include the whole month). */
export function comparePeriods(points: readonly Stat[], periods: readonly PeriodDef[]): { period: PeriodDef; stats: SummaryStats | null }[] {
  return periods.map((period) => ({ period, stats: summarize(points.filter((p) => p.date >= period.from && p.date.slice(0, period.to.length) <= period.to)) }));
}

/** Change between two values in percentage points and basis points. */
export function change(from: number, to: number): { pp: number; bp: number } {
  const pp = to - from;
  return { pp, bp: Math.round(pp * 100 * 1e6) / 1e6 };
}

export interface Correlation {
  r: number | null;
  n: number;
}

/** Pearson correlation of paired values; r is null with fewer than 3 pairs or zero variance. */
export function pearson(pairs: readonly (readonly [number, number])[]): Correlation {
  const n = pairs.length;
  if (n < 3) return { r: null, n };
  let sx = 0, sy = 0;
  for (const [x, y] of pairs) {
    sx += x;
    sy += y;
  }
  const mx = sx / n;
  const my = sy / n;
  let cov = 0, vx = 0, vy = 0;
  for (const [x, y] of pairs) {
    cov += (x - mx) * (y - my);
    vx += (x - mx) ** 2;
    vy += (y - my) ** 2;
  }
  return vx === 0 || vy === 0 ? { r: null, n } : { r: cov / Math.sqrt(vx * vy), n };
}

const MONTH = /^\d{4}-\d{2}$/;

function shiftMonth(month: string, k: number): string {
  const [y, m] = month.split("-").map(Number);
  const t = y * 12 + (m - 1) + k;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`;
}

export interface LagResult extends Correlation {
  lag: number;
}

/**
 * Correlation between x in month t and y in month t + lag, for each lag. MONTHLY SERIES ONLY: every key must be YYYY-MM, otherwise it throws (a daily or
 * per-auction series must first be turned into a documented monthly series). Only months where both values exist are paired.
 */
export function lagCorrelations(x: ReadonlyMap<string, number>, y: ReadonlyMap<string, number>, lags: readonly number[] = [0, 1, 3, 6, 12]): LagResult[] {
  for (const k of [...x.keys(), ...y.keys()]) if (!MONTH.test(k)) throw new Error(`lagCorrelations needs monthly keys (YYYY-MM); got "${k}"`);
  return lags.map((lag) => {
    const pairs: [number, number][] = [];
    for (const [m, xv] of x) {
      const yv = y.get(shiftMonth(m, lag));
      if (yv !== undefined) pairs.push([xv, yv]);
    }
    return { lag, ...pearson(pairs) };
  });
}

/** Plain-language strength label for |r| (descriptive only). */
export function strength(r: number | null): string {
  if (r === null) return "not computable";
  const a = Math.abs(r);
  const dir = r > 0 ? "positive" : "negative";
  if (a >= 0.8) return `very strong ${dir}`;
  if (a >= 0.6) return `strong ${dir}`;
  if (a >= 0.4) return `moderate ${dir}`;
  if (a >= 0.2) return `weak ${dir}`;
  return "little or no linear";
}
