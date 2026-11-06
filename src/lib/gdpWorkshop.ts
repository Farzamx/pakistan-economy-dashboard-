// GDP Breakdown Workshop — pure view-model builders.
//
// No I/O and no React: every input is already-fetched data from the existing
// canonical functions (getGdpSectorComposition, getGdpGrowthHistory,
// getQuarterlyGdpKpi), so the rules below are unit-testable on their own and
// the page adds no new data source.
//
// WHAT THIS MODULE DELIBERATELY DOES NOT DO
// The audited sources expose growth RATES and value-added SHARES only. They
// contain no nominal GDP level, no real GDP level, no expenditure components
// and no per-sector growth rate. Contribution-to-growth decomposition is a
// function of levels, so it cannot be derived here. Nothing in this file
// infers, rebases or normalises its way around those gaps — see
// GDP_DATA_LIMITATIONS, which the page renders verbatim.

import type { TrendPoint } from "@/components/charts/TrendLineChart";

/** Oldest -> newest series of annual observations, as the World Bank reports them. */
export interface AnnualPoint {
  /** Calendar year, e.g. "2025". */
  year: string;
  value: number;
}

export interface SectorSharePoint {
  year: string;
  agriculture: number;
  industry: number;
  services: number;
  /** agriculture + industry + services. Deliberately NOT 100 — see sectorShareNote(). */
  total: number;
  /** 100 - total: net taxes on products plus any residual the source excludes. */
  residual: number;
}

export type PeerCountry = "PAK" | "IND" | "BGD";

export interface PeerYearPoint {
  year: string;
  /** Growth %, or null when that country has no observation for this year. */
  PAK: number | null;
  IND: number | null;
  BGD: number | null;
}

export const PEER_LABEL: Record<PeerCountry, string> = {
  PAK: "Pakistan",
  IND: "India",
  BGD: "Bangladesh",
};

/**
 * Sector value-added shares aligned by year.
 *
 * Only years present in ALL THREE series are returned: a year where one
 * sector is missing would otherwise render as a shorter stack and read as a
 * genuine structural shift rather than absent data.
 */
export function buildSectorShares(
  agriculture: TrendPoint[],
  industry: TrendPoint[],
  services: TrendPoint[],
): SectorSharePoint[] {
  const ind = new Map(industry.map((p) => [p.month, p.value]));
  const srv = new Map(services.map((p) => [p.month, p.value]));
  const out: SectorSharePoint[] = [];
  for (const a of agriculture) {
    const i = ind.get(a.month);
    const s = srv.get(a.month);
    if (i === undefined || s === undefined) continue;
    const total = a.value + i + s;
    out.push({
      year: a.month,
      agriculture: a.value,
      industry: i,
      services: s,
      total,
      residual: 100 - total,
    });
  }
  return out.sort((x, y) => x.year.localeCompare(y.year));
}

/**
 * The note shown beside the stacked area, derived from the data rather than
 * hardcoded: the three World Bank value-added shares do not sum to 100%
 * because the measure excludes net taxes on products (and subsidies). The
 * page must never normalise them to 100 or call them a complete breakdown.
 */
export function sectorShareNote(points: SectorSharePoint[]): {
  latestTotal: number | null;
  latestResidual: number | null;
  latestYear: string | null;
} {
  const latest = points[points.length - 1];
  if (!latest) return { latestTotal: null, latestResidual: null, latestYear: null };
  return {
    latestTotal: Number(latest.total.toFixed(1)),
    latestResidual: Number(latest.residual.toFixed(1)),
    latestYear: latest.year,
  };
}

/** TrendPoint[] (month-keyed by convention) -> year-keyed annual points. */
export function toAnnualPoints(history: TrendPoint[]): AnnualPoint[] {
  return history.map((p) => ({ year: p.month, value: p.value }));
}

/**
 * Pakistan/India/Bangladesh annual real GDP growth aligned by year, for the
 * clustered comparison.
 *
 * All three come from the SAME World Bank indicator (NY.GDP.MKTP.KD.ZG),
 * so the unit (annual % change in real GDP) and the period basis are
 * identical — the precondition for plotting them on one shared scale. A
 * country with no observation in a given year yields null for that bar
 * rather than a zero, which would read as "no growth".
 */
export function buildPeerComparison(
  byCountry: Partial<Record<PeerCountry, TrendPoint[]>>,
  recentYears: number,
): PeerYearPoint[] {
  const maps = new Map<PeerCountry, Map<string, number>>();
  const years = new Set<string>();
  for (const c of ["PAK", "IND", "BGD"] as PeerCountry[]) {
    const h = byCountry[c];
    if (!h) continue;
    maps.set(c, new Map(h.map((p) => [p.month, p.value])));
    for (const p of h) years.add(p.month);
  }
  return [...years]
    .sort((a, b) => a.localeCompare(b))
    .slice(-recentYears)
    .map((year) => ({
      year,
      PAK: maps.get("PAK")?.get(year) ?? null,
      IND: maps.get("IND")?.get(year) ?? null,
      BGD: maps.get("BGD")?.get(year) ?? null,
    }));
}

/** Which peers actually have data — so the page can name them rather than implying a complete set. */
export function availablePeers(points: PeerYearPoint[]): PeerCountry[] {
  return (["PAK", "IND", "BGD"] as PeerCountry[]).filter((c) => points.some((p) => p[c] !== null));
}

/**
 * The most recent `count` observations, oldest -> newest.
 *
 * Used to keep the bar charts readable: 30 annual bars or 40 quarterly bars
 * are illegible on a phone. The full series stays available to the caller;
 * this only narrows what one chart draws, and the page states the window.
 */
export function latestN<T>(series: T[], count: number): T[] {
  return count >= series.length ? [...series] : series.slice(series.length - count);
}

/** Inclusive period label for a series, e.g. "1996–2025". */
export function periodLabel(points: { year: string }[]): string | null {
  if (points.length === 0) return null;
  const first = points[0].year;
  const last = points[points.length - 1].year;
  return first === last ? first : `${first}–${last}`;
}

/** Inclusive period label for the fiscal-quarter series, e.g. "Q1 FY17–Q4 FY26". */
export function quarterPeriodLabel(trend: TrendPoint[]): string | null {
  if (trend.length === 0) return null;
  const first = trend[0].month;
  const last = trend[trend.length - 1].month;
  return first === last ? first : `${first}–${last}`;
}

/**
 * What the audited sources do NOT provide. Rendered verbatim by the page so
 * a reader can tell the difference between "Pakistan has no such economy"
 * and "this dashboard has no such series".
 */
export const GDP_DATA_LIMITATIONS: { title: string; detail: string }[] = [
  {
    title: "No nominal or real GDP levels",
    detail:
      "Every GDP figure here is a growth RATE or a SHARE. The audited sources carry no nominal GDP (in rupees or dollars) and no real GDP level, so questions like “how large is the economy?” cannot be answered from this page.",
  },
  {
    title: "No expenditure components",
    detail:
      "Consumption, investment, government spending and net exports are not fetched by any current data source. The sector shares below are production-side value added, which is a different decomposition — they are not expenditure components.",
  },
  {
    title: "No per-sector growth rates",
    detail:
      "Only each sector's share of GDP is available, not how fast that sector itself grew. A rising share can reflect a sector growing faster than the rest of the economy, or the rest of the economy shrinking; the share alone cannot distinguish them.",
  },
  {
    title: "No contribution-to-growth decomposition",
    detail:
      "Splitting GDP growth into “agriculture contributed X points” requires sector levels, which are not available. Value-added shares cannot be converted into growth contributions without them, so no such figure is shown.",
  },
];
