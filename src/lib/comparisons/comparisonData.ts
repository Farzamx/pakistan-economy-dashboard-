import "server-only";

// Fetches, normalizes, date-aligns, and derives chart-ready data for the
// Comparisons feature. Every number on a comparison chart traces back to a
// live fetch in src/lib/data/*.ts — nothing here invents or interpolates a
// value beyond a forward-fill of an already-published figure (see
// mergeSeries below for exactly what that means and why it isn't fabrication).
//
// Phase 6A.1 (2026-08-08): this file now imports getSbpIndicatorHistory /
// getFoodInflationUrbanHistory from sbpServer.ts (not sbp.ts directly), so
// the same PBS canonical-override that homepage/SEO pages' KPI cards apply
// for the 6 PBS-primary indicators (CPI, Core, LSM, Trade Balance, Exports,
// Imports — see sbpServer.ts's CANONICAL_SERIES_SLUGS) also applies to
// comparison charts — one authoritative resolution path, not two. This is
// safe specifically because the pure chart-transform functions ComparisonChart/
// ComparisonWorkspace/etc. (Client Components) need were split out into
// comparisonTransforms.ts, which has no server-only/SBP imports — see that
// file's header. The `import "server-only"` above enforces this boundary at
// build time: any future accidental import of this file from a Client
// Component now fails the build immediately instead of silently leaking a
// data-fetching module (and, transitively, this project's SBP credentials)
// toward the browser bundle.

import { getSbpIndicatorHistory, getFoodInflationUrbanHistory } from "@/lib/data/sbpServer";
import type { SbpIndicatorKey } from "@/lib/data/sbp";
import { getGdpGrowthHistory, type WorldBankCountryCode } from "@/lib/data/worldBank";
import { getFedFundsHistory, getUsCpiInflationHistory } from "@/lib/data/fred";
import { getGoldHistory } from "@/lib/data/yfinance";
import { getExternalDebtHistory } from "@/lib/data/externalDebt";
import type { ComparisonDef, SeriesProviderId } from "./comparisonRegistry";
// NOTE: only types are imported back here, deliberately — do not re-export
// applyTimeRange/applyChartMode/generateInsights from this file. Client
// Components must import those from comparisonTransforms.ts directly; this
// module's `import "server-only"` above would make any re-export just as
// unusable from client code as importing them from here today would be.
import { type MergedPoint, type ComparisonChartBundle } from "./comparisonTransforms";

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

    if (id === "sbp:foodInflationUrban") {
      const result = await getFoodInflationUrbanHistory();
      if (!result) return null;
      return { points: result.points, source: result.source, frequency: "monthly" };
    }

    if (id === "sbp:externalDebt") {
      const result = await getExternalDebtHistory();
      if (!result) return null;
      return { points: result.points, source: result.source, frequency: "monthly" };
    }

    return null;
  } catch {
    return null;
  }
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
