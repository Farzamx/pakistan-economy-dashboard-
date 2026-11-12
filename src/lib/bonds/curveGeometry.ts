// Geometry for the Yield Curve Explorer: the maturity axis, the yield axis and the paths. Pure, so the layout is tested without a browser.
//
// MATURITY AXIS. Tenors run from one month to fifteen years, so a linear axis would crush the short end. The axis is a square-root scale of the tenor in years:
// the position is proportional to sqrt(years). It is a display scale only; every point sits at its true tenor and no value is interpolated.
//
// PATHS BREAK AT A MISSING POINT. A tenor that failed (bids rejected, no bids) or was not offered has no yield, so the line stops there and restarts at the
// next tenor that has one. Joining across the gap would draw a yield that SBP never set.

import { TENOR_YEARS, type Tenor } from "./types";

export const MATURITY_TICKS: { tenor: Tenor; label: string }[] = [
  { tenor: "1M", label: "1M" },
  { tenor: "3M", label: "3M" },
  { tenor: "6M", label: "6M" },
  { tenor: "12M", label: "1Y" },
  { tenor: "2Y", label: "2Y" },
  { tenor: "3Y", label: "3Y" },
  { tenor: "5Y", label: "5Y" },
  { tenor: "10Y", label: "10Y" },
  { tenor: "15Y", label: "15Y" },
];

const MAX_YEARS = 15;

/** 0 to 1 along the maturity axis for a tenor length in years. */
export const maturityFraction = (years: number): number => Math.sqrt(Math.max(years, 0)) / Math.sqrt(MAX_YEARS);

/** A "nice" set of tick values covering [min, max], at 1, 2 or 5 times a power of ten. Always includes values at or beyond both ends. */
export function niceTicks(min: number, max: number, target = 5): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
  if (max <= min) return [Math.floor(min) - 1, Math.ceil(max) + 1].filter((v, i, a) => a.indexOf(v) === i);
  const raw = (max - min) / Math.max(target, 1);
  const pow = 10 ** Math.floor(Math.log10(raw));
  const f = raw / pow;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pow;
  const out: number[] = [];
  for (let v = Math.floor(min / step) * step; v <= Math.ceil(max / step) * step + step / 1e6; v += step) out.push(Math.round(v / step) * step);
  return out;
}

export interface ChartMargin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface CurveLayout {
  width: number;
  height: number;
  margin: ChartMargin;
  innerWidth: number;
  innerHeight: number;
  yMin: number;
  yMax: number;
  yTicks: number[];
  xTicks: { tenor: Tenor; label: string; x: number }[];
  /** Horizontal position for a tenor length in years. */
  xOf: (years: number) => number;
  /** Vertical position for a yield. */
  yOf: (value: number) => number;
  /** The empty stretch between the longest T-bill tenor and the shortest PIB tenor, where no auction exists. */
  gap: { x0: number; x1: number };
}

/**
 * Layout for a given pixel width and the yields on screen. The yield axis is padded and snapped to nice ticks, and always includes the zero-free range of
 * the data (it does not start at zero: a yield axis is about differences between curves, and the label says so).
 */
export function buildCurveLayout(width: number, height: number, yields: readonly number[]): CurveLayout {
  const margin: ChartMargin = { top: 16, right: width < 420 ? 14 : 22, bottom: 40, left: width < 420 ? 40 : 48 };
  const innerWidth = Math.max(width - margin.left - margin.right, 40);
  const innerHeight = Math.max(height - margin.top - margin.bottom, 40);
  const finite = yields.filter((v) => Number.isFinite(v));
  const lo = finite.length ? Math.min(...finite) : 0;
  const hi = finite.length ? Math.max(...finite) : 1;
  const pad = Math.max((hi - lo) * 0.18, 0.25);
  const ticks = niceTicks(lo - pad, hi + pad, innerHeight < 220 ? 4 : 5);
  const yMin = ticks[0];
  const yMax = ticks[ticks.length - 1];
  const xOf = (years: number) => margin.left + maturityFraction(years) * innerWidth;
  const yOf = (v: number) => margin.top + (1 - (v - yMin) / (yMax - yMin || 1)) * innerHeight;
  return {
    width,
    height,
    margin,
    innerWidth,
    innerHeight,
    yMin,
    yMax,
    yTicks: ticks,
    xTicks: MATURITY_TICKS.map((t) => ({ ...t, x: xOf(TENOR_YEARS[t.tenor]) })),
    xOf,
    yOf,
    gap: { x0: xOf(TENOR_YEARS["12M"]), x1: xOf(TENOR_YEARS["2Y"]) },
  };
}

export interface PlotPoint {
  tenor: Tenor;
  x: number;
  /** Null when the tenor has no yield: the path breaks here. */
  y: number | null;
}

/** SVG path data, one `M…L…` run per stretch of consecutive points that have a yield. A lone point yields no path (it is drawn as a marker). */
export function pathRuns(points: readonly PlotPoint[]): string[] {
  const runs: PlotPoint[][] = [];
  let cur: PlotPoint[] = [];
  for (const p of points) {
    if (p.y === null) {
      if (cur.length) runs.push(cur);
      cur = [];
    } else cur.push(p);
  }
  if (cur.length) runs.push(cur);
  return runs.filter((r) => r.length >= 2).map((r) => r.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${(p.y as number).toFixed(1)}`).join(" "));
}

/**
 * The closed band between two curves where BOTH have a yield at consecutive tenors, so the shaded area never spans a tenor either curve lacks. One polygon per
 * unbroken stretch.
 */
export function bandRuns(a: readonly PlotPoint[], b: readonly PlotPoint[]): string[] {
  const both = a.map((p, i) => (p.y !== null && b[i]?.y !== null && b[i]?.y !== undefined ? { x: p.x, ya: p.y, yb: b[i].y as number } : null));
  const runs: { x: number; ya: number; yb: number }[][] = [];
  let cur: { x: number; ya: number; yb: number }[] = [];
  for (const p of both) {
    if (!p) {
      if (cur.length) runs.push(cur);
      cur = [];
    } else cur.push(p);
  }
  if (cur.length) runs.push(cur);
  return runs
    .filter((r) => r.length >= 2)
    .map((r) => `${r.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.ya.toFixed(1)}`).join(" ")} ${[...r].reverse().map((p) => `L${p.x.toFixed(1)},${p.yb.toFixed(1)}`).join(" ")} Z`);
}
