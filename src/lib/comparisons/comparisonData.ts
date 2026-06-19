// Fetches, normalizes, date-aligns, and derives chart-ready data for the
// Comparisons feature. Every number on a comparison chart traces back to a
// live fetch in src/lib/data/*.ts — nothing here invents or interpolates a
// value beyond a forward-fill of an already-published figure (see
// mergeSeries below for exactly what that means and why it isn't fabrication).

import { getSbpIndicatorHistory, type SbpIndicatorKey } from "@/lib/data/sbp";
import { getGdpGrowthHistory, type WorldBankCountryCode } from "@/lib/data/worldBank";
import { getFedFundsHistory, getUsCpiInflationHistory } from "@/lib/data/fred";
import { getGoldHistory } from "@/lib/data/yfinance";
import type { ComparisonDef, ComparisonSeriesConfig, SeriesProviderId } from "./comparisonRegistry";

export interface RawSeriesPoint {
  /** "YYYY-MM-DD" or "YYYY" (annual series). */
  date: string;
  value: number;
}

export interface SeriesFetchResult {
  points: RawSeriesPoint[];
  source: string;
  frequency: "annual" | "monthly";
}

const SBP_KEY_BY_PROVIDER: Partial<Record<SeriesProviderId, SbpIndicatorKey>> = {
  "sbp:usdPkr": "usdPkr",
  "sbp:foreignReserves": "foreignReserves",
  "sbp:currentAccount": "currentAccount",
  "sbp:exports": "exports",
  "sbp:imports": "imports",
  "sbp:tradeBalance": "tradeBalance",
  "sbp:policyRate": "policyRate",
  "sbp:cpiInflation": "cpiInflation",
  "sbp:coreInflation": "coreInflation",
  "sbp:moneySupplyM2": "moneySupplyM2",
  "sbp:tbillYield3m": "tbillYield3m",
};

const WORLD_BANK_COUNTRY_BY_PROVIDER: Partial<Record<SeriesProviderId, WorldBankCountryCode>> = {
  "worldbank:gdpGrowthPak": "PAK",
  "worldbank:gdpGrowthIndia": "IND",
  "worldbank:gdpGrowthBangladesh": "BGD",
};

/** Fetches one named series, dispatching to whichever underlying provider (SBP/World Bank/FRED/Yahoo Finance) backs it. Returns null on failure — callers must render an error state, never substitute a guess. */
export async function fetchComparisonSeries(id: SeriesProviderId): Promise<SeriesFetchResult | null> {
  try {
    const sbpKey = SBP_KEY_BY_PROVIDER[id];
    if (sbpKey) {
      const { points, meta } = await getSbpIndicatorHistory(sbpKey);
      return { points, source: meta.source, frequency: "monthly" };
    }

    const wbCountry = WORLD_BANK_COUNTRY_BY_PROVIDER[id];
    if (wbCountry) {
      const series = await getGdpGrowthHistory(wbCountry);
      if (!series) return null;
      return {
        points: series.history.map((p) => ({ date: p.month, value: p.value })),
        source: "World Bank",
        frequency: "annual",
      };
    }

    if (id === "fred:fedFunds") {
      const points = await getFedFundsHistory();
      if (!points) return null;
      return { points, source: "FRED", frequency: "monthly" };
    }
    if (id === "fred:usCpiInflation") {
      const points = await getUsCpiInflationHistory();
      if (!points) return null;
      return { points, source: "FRED", frequency: "monthly" };
    }

    if (id === "yfinance:gold") {
      const points = await getGoldHistory();
      if (!points) return null;
      return {
        points: points.map((p) => ({ date: p.date, value: p.close })),
        source: "Yahoo Finance",
        frequency: "monthly",
      };
    }

    return null;
  } catch {
    return null;
  }
}

export interface MergedPoint {
  /** "YYYY-MM" for monthly series, "YYYY" for annual. */
  key: string;
  a: number | null;
  b: number | null;
}

function toAlignmentKey(date: string, frequency: "annual" | "monthly"): string {
  if (frequency === "annual") return date.length === 4 ? date : date.slice(0, 4);
  return date.slice(0, 7); // "YYYY-MM-DD" -> "YYYY-MM"
}

/**
 * Merges two series onto a shared timeline by year-month (or year, for
 * annual series) key.
 *
 * For sparse/"as-needed" series (e.g. the policy rate, which only has an
 * observation on MPC decision dates), months with no new observation are
 * forward-filled from the last known value — that is the policy rate that
 * was genuinely in effect that month, not an invented number. Forward-fill
 * never runs before a series' first real observation (those months stay
 * null, producing a gap rather than a backdated guess).
 */
export function mergeSeries(
  seriesA: SeriesFetchResult,
  seriesB: SeriesFetchResult,
): MergedPoint[] {
  const mapA = new Map<string, number>();
  for (const p of seriesA.points) mapA.set(toAlignmentKey(p.date, seriesA.frequency), p.value);
  const mapB = new Map<string, number>();
  for (const p of seriesB.points) mapB.set(toAlignmentKey(p.date, seriesB.frequency), p.value);

  const allKeys = Array.from(new Set([...mapA.keys(), ...mapB.keys()])).sort();

  let lastA: number | null = null;
  let lastB: number | null = null;
  return allKeys.map((key) => {
    if (mapA.has(key)) lastA = mapA.get(key)!;
    if (mapB.has(key)) lastB = mapB.get(key)!;
    return { key, a: lastA, b: lastB };
  });
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

/** Fetches and merges both series for a comparison definition. */
export async function getComparisonBundle(def: ComparisonDef): Promise<ComparisonChartBundle> {
  const [a, b] = await Promise.all([
    fetchComparisonSeries(def.seriesA.id),
    fetchComparisonSeries(def.seriesB.id),
  ]);

  if (!a || !b) {
    return { def, merged: [], sourceA: "", sourceB: "", hasError: true };
  }

  return {
    def,
    merged: mergeSeries(a, b),
    sourceA: a.source,
    sourceB: b.source,
    hasError: false,
  };
}
