// Pure, client-safe chart transforms for the Comparisons feature — no I/O,
// no data fetching, no SBP/provider imports. Split out of comparisonData.ts
// (Phase 6A.1) specifically so these can be imported by Client Components
// (ComparisonWorkspace.tsx and friends, which recompute time-range/chart-mode
// client-side without a full page reload) without pulling comparisonData.ts's
// server-only data-fetching code — and therefore its SBP EasyData/canonical-DB
// access — into the browser bundle. comparisonData.ts now imports the types
// it needs back from here; this file never imports anything from there.

import type { ComparisonDef, ComparisonSeriesConfig } from "./comparisonRegistry";

export interface MergedPoint {
  /** "YYYY-MM" for monthly series, "YYYY" for annual. */
  key: string;
  a: number | null;
  b: number | null;
}

export type TimeRange = "1y" | "3y" | "5y" | "10y" | "max";

/** Filters a merged, sorted-ascending series down to the trailing window implied by `range`. "max" returns everything. */
export function applyTimeRange(points: MergedPoint[], range: TimeRange): MergedPoint[] {
  if (range === "max" || points.length === 0) return points;
  const monthsByRange: Record<Exclude<TimeRange, "max">, number> = {
    "1y": 12,
    "3y": 36,
    "5y": 60,
    "10y": 120,
  };
  // Annual series have ~1 point/year; monthly have ~1 point/month. Using the
  // larger of (months requested) or (years requested) as a point count
  // covers both without needing to know each series' frequency here.
  const yearsByRange: Record<Exclude<TimeRange, "max">, number> = {
    "1y": 1, "3y": 3, "5y": 5, "10y": 10,
  };
  const pointCount = Math.max(monthsByRange[range], yearsByRange[range]);
  return points.slice(-pointCount);
}

export type ChartMode = "raw" | "percentChange" | "baseIndex";

export interface ChartPoint {
  key: string;
  a: number | null;
  b: number | null;
}

/** Recomputes a/b as % change or base-100 index relative to each series' own first available value in the window — derived math, not new data. */
export function applyChartMode(points: MergedPoint[], mode: ChartMode): ChartPoint[] {
  if (mode === "raw") return points;
  const baseA = points.find((p) => p.a !== null)?.a ?? null;
  const baseB = points.find((p) => p.b !== null)?.b ?? null;
  return points.map((p) => ({
    key: p.key,
    a: p.a === null || baseA === null || baseA === 0 ? null : transform(p.a, baseA, mode),
    b: p.b === null || baseB === null || baseB === 0 ? null : transform(p.b, baseB, mode),
  }));
}

function transform(value: number, base: number, mode: ChartMode): number {
  return mode === "percentChange" ? ((value - base) / Math.abs(base)) * 100 : (value / base) * 100;
}

export interface ComparisonInsight {
  text: string;
}

/**
 * Generates plain-English observations computed directly from the merged
 * series — total % change over the window, which series moved more, and
 * whether they moved together or in opposite directions (via Pearson
 * correlation on overlapping points). Every claim is a direct computation
 * from the fetched numbers; nothing here is an inferred causal claim the
 * data itself can't support.
 */
export function generateInsights(
  points: MergedPoint[],
  seriesA: ComparisonSeriesConfig,
  seriesB: ComparisonSeriesConfig,
): ComparisonInsight[] {
  const insights: ComparisonInsight[] = [];
  const validA = points.filter((p): p is MergedPoint & { a: number } => p.a !== null);
  const validB = points.filter((p): p is MergedPoint & { b: number } => p.b !== null);

  if (validA.length >= 2) {
    const first = validA[0].a;
    const last = validA[validA.length - 1].a;
    const pct = first !== 0 ? ((last - first) / Math.abs(first)) * 100 : 0;
    insights.push({
      text: `${seriesA.shortLabel} ${pct >= 0 ? "rose" : "fell"} ${Math.abs(pct).toFixed(1)}% over the selected period — from ${formatNum(first)}${seriesA.unit} to ${formatNum(last)}${seriesA.unit}.`,
    });
  }
  if (validB.length >= 2) {
    const first = validB[0].b;
    const last = validB[validB.length - 1].b;
    const pct = first !== 0 ? ((last - first) / Math.abs(first)) * 100 : 0;
    insights.push({
      text: `${seriesB.shortLabel} ${pct >= 0 ? "rose" : "fell"} ${Math.abs(pct).toFixed(1)}% over the selected period — from ${formatNum(first)}${seriesB.unit} to ${formatNum(last)}${seriesB.unit}.`,
    });
  }

  // Correlation, computed only on dates where both series have a real
  // (non-forward-filled-only-before-start) observation.
  const overlap = points.filter((p) => p.a !== null && p.b !== null) as { key: string; a: number; b: number }[];
  if (overlap.length >= 6) {
    const r = pearsonCorrelation(overlap.map((p) => p.a), overlap.map((p) => p.b));
    if (Number.isFinite(r)) {
      const strength = Math.abs(r) >= 0.6 ? "moved closely together" : Math.abs(r) >= 0.3 ? "showed a moderate relationship" : "showed little consistent relationship";
      const direction = r >= 0 ? "in the same direction" : "in opposite directions";
      insights.push({
        text: `Over this period, ${seriesA.shortLabel} and ${seriesB.shortLabel} ${strength}, moving ${direction} (correlation coefficient: ${r.toFixed(2)}).`,
      });
    }
  }

  return insights;
}

function formatNum(n: number): string {
  return Math.abs(n) >= 100 ? n.toFixed(0) : n.toFixed(2);
}

function pearsonCorrelation(xs: number[], ys: number[]): number {
  const n = xs.length;
  const meanX = xs.reduce((s, v) => s + v, 0) / n;
  const meanY = ys.reduce((s, v) => s + v, 0) / n;
  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  if (denX === 0 || denY === 0) return NaN;
  return num / Math.sqrt(denX * denY);
}

export interface ComparisonChartBundle {
  def: ComparisonDef;
  merged: MergedPoint[];
  sourceA: string;
  sourceB: string;
  /** True if either series failed to fetch entirely (caller should render an error state, not a partial chart presented as complete). */
  hasError: boolean;
}
