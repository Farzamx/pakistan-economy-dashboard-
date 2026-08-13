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
// Imports — see sbpServer.ts's PBS_PRIMARY_SERIES_SLUGS) also applies to
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
import { getCanonicalFredHistory } from "@/lib/data/fredCanonicalStore";
import { getGoldHistory } from "@/lib/data/yfinance";
import { getCanonicalYahooGoldHistory } from "@/lib/data/yahooGoldCanonicalStore";
import { getExternalDebtHistory } from "@/lib/data/externalDebt";
import { getSeriesOption } from "./seriesOptions";
import type { ComparisonDef, ComparisonFrequency, SeriesProviderId } from "./comparisonRegistry";
import { validateComparisonCompatibility, type CompatibilityResult } from "./comparisonCompatibility";
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
  /**
   * Phase 7: previously "annual" | "monthly" only — externalDebt (genuinely
   * quarterly, see src/lib/data/externalDebt.ts) was silently mislabeled
   * "monthly" prior to this phase. Now sourced from the series registry (via
   * getSeriesOption below) instead of being hand-typed per branch, so this
   * value can never drift from comparisonRegistry.ts's declared frequency.
   */
  frequency: ComparisonFrequency;
  /**
   * Phase 7: unit is now present on the RUNTIME fetch result, not just
   * authoring-time registry metadata — the compatibility gate needs runtime
   * access to it (see comparisonCompatibility.ts's file header).
   */
  unit: string;
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

interface RawFetch {
  points: RawSeriesPoint[];
  source: string;
}

// Phase 8.13: DB-first read for the two FRED series canonicalized in Phase
// 8.12 (fred:fedFunds, fred:usCpiInflation only -- see fredAdapter.ts for
// why every other FRED series stays on the legacy live path). Mirrors
// src/lib/data/fred.ts's getFedFundsHistory()/getUsCpiInflationHistory()'s
// own default startDate ("2016-01-01") exactly, so the canonical path
// serves the SAME observation window the legacy path already does -- the
// canonical store itself holds much more history (back to the 1940s/50s)
// than this comparison has ever shown; trimming it here (not in
// fredCanonicalStore.ts, which stays a plain, comparison-agnostic reader)
// is what keeps comparison output unchanged. A live baseline comparison
// (Phase 8.13 report Section F) confirmed zero value/count differences
// between the two paths at equivalent logical periods.
const FRED_COMPARISON_START_DATE = "2016-01-01";

/**
 * canonical DB read first; legacy live FRED fetch as fallback. Dates
 * returned by the canonical store are already period-END ("YYYY-MM-31" or
 * the month's actual last day) -- fredAdapter.ts's normalization, verified
 * live in Phase 8.12 -- so no date transformation happens here; reapplying
 * it would double-transform an already-correct date.
 *
 * getCanonicalFredHistory() never throws (returns [] on any failure, per
 * its own contract) -- the try/catch below is defense in depth, not the
 * primary fallback mechanism. A canonical read that is unavailable, errors,
 * or has no observations within the comparison window falls straight
 * through to the unchanged legacy path; a canonical-read problem must never
 * be visible to this feature's callers.
 */
async function fetchFredComparisonSeries(id: "fred:fedFunds" | "fred:usCpiInflation"): Promise<RawFetch | null> {
  try {
    const canonicalRows = await getCanonicalFredHistory(id, 200); // 200 months comfortably covers back to FRED_COMPARISON_START_DATE (2016) with margin
    const windowed = canonicalRows.filter((r) => r.observationPeriod >= FRED_COMPARISON_START_DATE);
    if (windowed.length > 0) {
      return { points: windowed.map((r) => ({ date: r.observationPeriod, value: r.value })), source: "FRED" };
    }
  } catch {
    // Falls through to the legacy live path below.
  }

  if (id === "fred:fedFunds") {
    const points = await getFedFundsHistory();
    return points ? { points, source: "FRED" } : null;
  }
  const points = await getUsCpiInflationHistory();
  return points ? { points, source: "FRED" } : null;
}

// Phase 8.17: DB-first read for yahoo:goldMonthly, the one Yahoo series
// canonicalized so far (see src/lib/providers/yahooGoldAdapter.ts's own
// header). This is the SAME canonical indicatorKey ("yahoo:goldMonthly")
// used for ingestion/canonical storage; it is deliberately NOT the same
// string as the comparisons-facing SeriesProviderId ("yfinance:gold",
// comparisonRegistry.ts, unchanged by this phase) — the two are related
// through this function alone, exactly as FRED's pilot kept
// indicatorKey/sourceSeriesId distinct rather than conflated.
const YAHOO_GOLD_MONTHLY_INDICATOR_KEY = "yahoo:goldMonthly"; // must exactly match yahooGoldAdapter.ts's YAHOO_GOLD_INDICATOR_KEY

/**
 * canonical DB read first; legacy live Yahoo fetch (getGoldHistory) as
 * fallback. Mirrors fetchFredComparisonSeries()'s exact DB-first/fallback
 * shape (Phase 8.13).
 *
 * getCanonicalYahooGoldHistory() never throws (returns [] on any failure,
 * per its own contract) — the try/catch below is defense in depth, not the
 * primary fallback mechanism.
 *
 * Stale-canonical policy (Phase 8.17 Section 14): mirrors the established
 * FRED pattern exactly — canonical data is preferred whenever it is
 * non-empty, even if it has since gone stale (e.g. ingestion hasn't run
 * this month yet), rather than falling back to a fresher live fetch purely
 * because time has passed. This is a deliberate reuse of the existing,
 * already-running FRED decision, not a fresh policy call — no repository
 * evidence surfaced during this pilot to justify a different rule for gold.
 *
 * KNOWN, INTENDED difference from the legacy path: legacy getGoldHistory()
 * includes Yahoo's current, still-open month as its trailing point (an
 * intraday-updating value, sometimes more than one such row — see
 * yahooGoldAdapter.ts's header); the canonical path never does, by design
 * (Phase 8.16 Decision 1). Once this cutover is live, the Gold comparisons
 * chart's most recent point becomes the last COMPLETED month rather than a
 * live in-progress print — this is the deliberate purpose of this
 * migration, not a regression.
 */
async function fetchYahooGoldComparisonSeries(): Promise<RawFetch | null> {
  try {
    const canonicalRows = await getCanonicalYahooGoldHistory(YAHOO_GOLD_MONTHLY_INDICATOR_KEY, 150);
    if (canonicalRows.length > 0) {
      return { points: canonicalRows.map((r) => ({ date: r.observationPeriod, value: r.value })), source: "Yahoo Finance" };
    }
  } catch {
    // Falls through to the legacy live path below.
  }

  const points = await getGoldHistory();
  return points ? { points: points.map((p) => ({ date: p.date, value: p.close })), source: "Yahoo Finance" } : null;
}

async function fetchRaw(id: SeriesProviderId): Promise<RawFetch | null> {
  const sbpKey = SBP_KEY_BY_PROVIDER[id];
  if (sbpKey) {
    const { points, meta } = await getSbpIndicatorHistory(sbpKey);
    return { points, source: meta.source };
  }

  const wbCountry = WORLD_BANK_COUNTRY_BY_PROVIDER[id];
  if (wbCountry) {
    const series = await getGdpGrowthHistory(wbCountry);
    if (!series) return null;
    return { points: series.history.map((p) => ({ date: p.month, value: p.value })), source: "World Bank" };
  }

  if (id === "fred:fedFunds" || id === "fred:usCpiInflation") {
    return fetchFredComparisonSeries(id);
  }

  if (id === "yfinance:gold") {
    return fetchYahooGoldComparisonSeries();
  }

  if (id === "sbp:foodInflationUrban") {
    const result = await getFoodInflationUrbanHistory();
    return result ? { points: result.points, source: result.source } : null;
  }

  if (id === "sbp:externalDebt") {
    const result = await getExternalDebtHistory();
    return result ? { points: result.points, source: result.source } : null;
  }

  return null;
}

/**
 * Fetches one named series, dispatching to whichever underlying provider
 * (SBP/World Bank/FRED/Yahoo Finance) backs it. Returns null on failure —
 * callers must render an error state, never substitute a guess.
 *
 * Phase 7: `unit`/`frequency` are attached HERE, in one place, from
 * getSeriesOption(id) — the same registry entry the compatibility gate and
 * every UI surface already trust — rather than being hand-typed per
 * provider branch above. This is what fixed externalDebt's frequency
 * without touching its parser: the mislabeling lived in the old per-branch
 * literal, not in the data.
 */
export async function fetchComparisonSeries(id: SeriesProviderId): Promise<SeriesFetchResult | null> {
  try {
    const raw = await fetchRaw(id);
    if (!raw) return null;
    const config = getSeriesOption(id);
    return { points: raw.points, source: raw.source, unit: config.unit, frequency: config.frequency };
  } catch {
    return null;
  }
}

function toAlignmentKey(date: string, frequency: ComparisonFrequency): string {
  if (frequency === "annual") return date.length === 4 ? date : date.slice(0, 4);
  // monthly AND quarterly share this key format: a quarter-end date
  // ("2016-06-30") slices to a valid monthly key ("2016-06") and lands in
  // the correct month of its own quarter — no separate quarterly key format
  // is needed (see comparisonCompatibility.ts's classifyFrequencyPair).
  return date.slice(0, 7); // "YYYY-MM-DD" -> "YYYY-MM"
}

export type PointOrigin = "observed" | "carried-forward";

/**
 * Merges two series onto a shared timeline by year-month (or year, for
 * annual series) key.
 *
 * For sparse/"as-needed" series (e.g. the policy rate, which only has an
 * observation on MPC decision dates) and for quarterly series merged onto a
 * monthly grid (e.g. external debt), months with no new observation are
 * forward-filled from the last known value — that is the value genuinely in
 * effect that month, not an invented number. Forward-fill never runs before
 * a series' first real observation (those months stay null, producing a gap
 * rather than a backdated guess).
 *
 * Phase 7: every point now also carries WHETHER it was actually observed
 * this period or carried forward from an earlier one (`aOrigin`/`bOrigin`),
 * and, when carried forward, WHICH period it was actually observed in
 * (`aSourcePeriod`/`bSourcePeriod`) — see comparisonTransforms.ts's
 * MergedPoint. This does not change which numbers appear; it makes the
 * existing forward-fill honest about itself instead of indistinguishable
 * from a fresh observation.
 *
 * Callers MUST validate compatibility (validateComparisonCompatibility)
 * before calling this — an incompatible pair should never reach merge. This
 * function does not re-check; comparisonData.ts's own callers
 * (getComparisonBundle) and the /api/comparisons/series route both gate
 * before calling it, per the "incompatible pair never reaches mergeSeries"
 * requirement.
 */
export function mergeSeries(
  seriesA: SeriesFetchResult,
  seriesB: SeriesFetchResult,
): MergedPoint[] {
  const mapA = new Map<string, { value: number; date: string }>();
  for (const p of seriesA.points) mapA.set(toAlignmentKey(p.date, seriesA.frequency), { value: p.value, date: p.date });
  const mapB = new Map<string, { value: number; date: string }>();
  for (const p of seriesB.points) mapB.set(toAlignmentKey(p.date, seriesB.frequency), { value: p.value, date: p.date });

  const allKeys = Array.from(new Set([...mapA.keys(), ...mapB.keys()])).sort();

  let lastA: number | null = null;
  let lastB: number | null = null;
  let lastAObservedDate: string | null = null;
  let lastBObservedDate: string | null = null;

  return allKeys.map((key) => {
    const aObservedNow = mapA.has(key);
    const bObservedNow = mapB.has(key);

    if (aObservedNow) {
      const entry = mapA.get(key)!;
      lastA = entry.value;
      lastAObservedDate = entry.date;
    }
    if (bObservedNow) {
      const entry = mapB.get(key)!;
      lastB = entry.value;
      lastBObservedDate = entry.date;
    }

    return {
      key,
      a: lastA,
      b: lastB,
      aOrigin: lastA === null ? null : aObservedNow ? "observed" : "carried-forward",
      bOrigin: lastB === null ? null : bObservedNow ? "observed" : "carried-forward",
      ...(lastA !== null && !aObservedNow && lastAObservedDate ? { aSourcePeriod: lastAObservedDate } : {}),
      ...(lastB !== null && !bObservedNow && lastBObservedDate ? { bSourcePeriod: lastBObservedDate } : {}),
    };
  });
}

/**
 * Fetches and merges both series for a comparison definition.
 *
 * Phase 7: validates compatibility against the ACTUAL fetched result's own
 * unit/frequency (not just the static registry) before ever calling
 * mergeSeries — an incompatible pair never reaches merge. In practice this
 * never fires for a curated ComparisonDef today (every entry in
 * comparisonRegistry.ts was audited against this same gate and passes — see
 * the Phase 7 report), so this is defence-in-depth for curated cards, not an
 * expected path; `compatibility` is still surfaced on the bundle so the UI
 * can show the existing "different units" dual-axis context.
 */
export async function getComparisonBundle(def: ComparisonDef): Promise<ComparisonChartBundle> {
  const [a, b] = await Promise.all([
    fetchComparisonSeries(def.seriesA.id),
    fetchComparisonSeries(def.seriesB.id),
  ]);

  if (!a || !b) {
    return { def, merged: [], sourceA: "", sourceB: "", hasError: true, compatibility: null };
  }

  const compatibility = validateComparisonCompatibility(a, b);
  if (!compatibility.compatible) {
    return { def, merged: [], sourceA: a.source, sourceB: b.source, hasError: true, compatibility };
  }

  return {
    def,
    merged: mergeSeries(a, b),
    sourceA: a.source,
    sourceB: b.source,
    hasError: false,
    compatibility,
  };
}

export type { CompatibilityResult };
