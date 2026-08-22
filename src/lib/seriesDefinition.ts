// Shared series vocabulary — Phase 8.0.
//
// Before this file, "cadence" existed as two independently-declared unions:
//   - src/lib/freshness/freshnessEngine.ts's ReleaseCadence (8 values)
//   - src/lib/comparisons/comparisonRegistry.ts's ComparisonFrequency (3 values)
// Both describe the same real-world fact about a series (how often it's
// published) with no relationship between the two declarations — a future
// cadence added to one had no reason to appear in the other, and nothing
// enforced that the 3-value one was actually a subset of the 8-value one.
//
// This file is the single place that vocabulary is declared. It contains
// ONLY facts that are true of a series regardless of which consumer
// (freshness engine, comparison engine, a future provider adapter) is
// asking — deliberately not a "god registry": no grace periods, no UI
// labels/colors, no FAQ copy. Those stay in their own consumer-specific
// registries (seriesRegistry.ts, comparisonRegistry.ts), which compose this
// shared shape rather than re-declaring it.
//
// Dependency-light by design (only MarketType, itself a pure leaf module) so
// this is safe to import from both server-only and client-reachable code —
// exactly the constraint comparisonCompatibility.ts already relies on for
// the free-form selector's client-side gate (Phase 7).

import type { MarketType } from "@/lib/marketCalendar";

/**
 * The full cadence vocabulary. Every value that is genuinely used anywhere
 * in this repository today — not expanded speculatively. `ComparisonFrequency`
 * (comparisonRegistry.ts) is a narrowed subset of this, not a parallel
 * declaration; `ReleaseCadence` (freshnessEngine.ts) is a direct alias of it.
 */
export type SeriesCadence =
  | "real-time"
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "annual"
  | "as-needed";

/**
 * Facts true of a series independent of consumer. `SeriesDefinition`
 * (freshness) extends this with grace/provenance-expectation fields;
 * `ComparisonSeriesConfig` (comparisons) keeps its own field names
 * (`id`/`frequency` instead of `seriesId`/`cadence`, for zero Phase 7
 * call-site churn) but narrows its `frequency` type from this same
 * `SeriesCadence` vocabulary rather than declaring an independent one.
 *
 * `unit` stays optional here to match freshness's existing (currently
 * unpopulated) usage exactly — this extraction changes no runtime data.
 */
export interface SharedSeriesDefinition {
  seriesId: string;
  provider: string;
  unit?: string;
  cadence: SeriesCadence;
  /** Set only for series backed by an actual tradeable market/session. */
  marketType?: MarketType;
}

// ── Series metadata catalog — Phase 8.20 ────────────────────────────────────
//
// THE PROBLEM THIS SOLVES (Phase 8.19 audit finding, confirmed directly
// against the repository, not assumed): unit/frequency facts for the same
// series were hand-duplicated in up to three independent places —
// comparisonRegistry.ts (once per comparison pair that used the series, so
// some series' values were typed 2+ times), seriesOptions.ts (once per
// SeriesProviderId), and, for the non-SBP Phase 8.1-contract providers,
// again inside seriesRegistry.ts's freshness definitions. Nothing enforced
// agreement between them — a future edit to one had no reason to touch the
// others.
//
// THE FIX: SERIES_CATALOG below is the one authoritative place a series'
// `unit` and comparison-facing `frequency` are declared. comparisonRegistry.ts
// and seriesOptions.ts both construct their ComparisonSeriesConfig entries
// through comparisonSeriesConfig() (comparisonRegistry.ts), which reads
// unit/frequency from here — neither file has its own unit/frequency
// literal anymore. seriesRegistry.ts's non-SBP freshness entries (World
// Bank, FRED, Yahoo Gold) derive their `cadence` from this same table for
// the series where "comparison frequency" and "freshness cadence" are
// genuinely the same fact (verified below) — see that file's own comments
// for exactly which entries do this and why.
//
// SCOPE: only the 19 SeriesProviderId values actually used by the
// Comparisons feature today (comparisonRegistry.ts's own union) — not a
// general-purpose "every economic indicator" registry, and deliberately not
// a replacement for seriesRegistry.ts (freshness config), sbp.ts (SBP's own
// 20-indicator CONFIGS, which covers indicators never used in a comparison
// too), or any provider adapter's own config (which owns transport-level
// facts like the provider-native source series ID, not duplicated here).
//
// CONFIRMED PRE-EXISTING EXCEPTION (Phase 8.20 audit finding, not
// introduced by this consolidation): sbp:moneySupplyM2, sbp:policyRate, and
// sbp:tbillYield3m are declared "monthly" here and in every existing
// comparisonRegistry.ts/seriesOptions.ts entry, but sbp.ts's own CONFIGS
// declares their REAL cadence as "Weekly" (moneySupplyM2) and "As-Needed"
// (policyRate, tbillYield3m) — confirmed by direct inspection of
// src/lib/data/sbp.ts's CONFIGS object. This is NOT a bug this
// consolidation introduces or silently resolves: "weekly"/"as-needed" are
// not members of ComparisonFrequency (Extract<SeriesCadence, "monthly" |
// "quarterly" | "annual">), so the comparisons subsystem could not
// literally represent their true cadence without first teaching
// classifyFrequencyPair()/toAlignmentKey()/mergeSeries() a weekly/as-needed
// grid-alignment model — a materially larger change than metadata
// consolidation, explicitly out of Phase 8.20's scope. comparisonData.test.ts's
// own existing "policy-rate step function forward-fill" test (case 11/12)
// confirms treating policyRate as a monthly-grid series for CHART alignment
// is a deliberate, already-tested design choice, not an oversight — sparse
// as-needed/weekly observations are intentionally forward-filled onto the
// monthly grid for display purposes, which is a different concern from
// freshness's "how often should a NEW value arrive before this looks
// stale" question. seriesRegistry.ts's freshness cadence for these three
// SBP indicators is therefore deliberately NOT derived from this catalog —
// it continues to come from sbp.ts's own accurate Frequency, unchanged.
// Whether "comparison frequency" and "freshness cadence" should eventually
// be unified for as-needed/weekly SBP series is a genuine open policy
// question, flagged here for a future phase, not resolved by this one.
export const SERIES_CATALOG: Record<string, SharedSeriesDefinition> = {
  "sbp:usdPkr": { seriesId: "sbp:usdPkr", provider: "sbp-easydata", unit: "PKR", cadence: "monthly" },
  "sbp:foreignReserves": { seriesId: "sbp:foreignReserves", provider: "sbp-easydata", unit: "B USD", cadence: "monthly" },
  "sbp:currentAccount": { seriesId: "sbp:currentAccount", provider: "sbp-easydata", unit: "B USD", cadence: "monthly" },
  "sbp:exports": { seriesId: "sbp:exports", provider: "sbp-easydata", unit: "B USD", cadence: "monthly" },
  "sbp:imports": { seriesId: "sbp:imports", provider: "sbp-easydata", unit: "B USD", cadence: "monthly" },
  "sbp:tradeBalance": { seriesId: "sbp:tradeBalance", provider: "sbp-easydata", unit: "B USD", cadence: "monthly" },
  // policyRate: comparison-facing "monthly" intentionally differs from
  // sbp.ts's real "As-Needed" cadence — see file-header exception note.
  "sbp:policyRate": { seriesId: "sbp:policyRate", provider: "sbp-easydata", unit: "%", cadence: "monthly" },
  "sbp:cpiInflation": { seriesId: "sbp:cpiInflation", provider: "sbp-easydata", unit: "%", cadence: "monthly" },
  "sbp:coreInflation": { seriesId: "sbp:coreInflation", provider: "sbp-easydata", unit: "%", cadence: "monthly" },
  // moneySupplyM2: comparison-facing "monthly" intentionally differs from
  // sbp.ts's real "Weekly" cadence — see file-header exception note.
  "sbp:moneySupplyM2": { seriesId: "sbp:moneySupplyM2", provider: "sbp-easydata", unit: "T PKR", cadence: "monthly" },
  // tbillYield3m: comparison-facing "monthly" intentionally differs from
  // sbp.ts's real "As-Needed" cadence — see file-header exception note.
  "sbp:tbillYield3m": { seriesId: "sbp:tbillYield3m", provider: "sbp-easydata", unit: "%", cadence: "monthly" },
  "sbp:foodInflationUrban": { seriesId: "sbp:foodInflationUrban", provider: "sbp-easydata", unit: "%", cadence: "monthly" },
  "sbp:externalDebt": { seriesId: "sbp:externalDebt", provider: "sbp-easydata", unit: "B USD", cadence: "quarterly" },
  "worldbank:gdpGrowthPak": { seriesId: "worldbank:gdpGrowthPak", provider: "world-bank", unit: "%", cadence: "annual" },
  "worldbank:gdpGrowthIndia": { seriesId: "worldbank:gdpGrowthIndia", provider: "world-bank", unit: "%", cadence: "annual" },
  "worldbank:gdpGrowthBangladesh": { seriesId: "worldbank:gdpGrowthBangladesh", provider: "world-bank", unit: "%", cadence: "annual" },
  "fred:fedFunds": { seriesId: "fred:fedFunds", provider: "fred", unit: "%", cadence: "monthly" },
  "fred:usCpiInflation": { seriesId: "fred:usCpiInflation", provider: "fred", unit: "%", cadence: "monthly" },
  // Comparison-facing id "yfinance:gold" intentionally differs from the
  // canonical ingestion indicatorKey "yahoo:goldMonthly" (Phase 8.17 design
  // — see yahooGoldAdapter.ts's header for the transformation-identity
  // rationale). seriesRegistry.ts's Yahoo Gold entry looks up THIS catalog
  // entry by this same "yfinance:gold" key, documented explicitly there.
  "yfinance:gold": { seriesId: "yfinance:gold", provider: "yahoo-finance", unit: "$/oz", cadence: "monthly" },
};

/** SBP series whose comparison-facing `frequency` is a deliberate simplification of their real (non-monthly/quarterly/annual) freshness cadence — see SERIES_CATALOG's own header comment. Exported so tests can assert this exception set explicitly rather than re-deriving it. */
export const SERIES_CATALOG_FRESHNESS_CADENCE_EXCEPTIONS: readonly string[] = [
  "sbp:moneySupplyM2",
  "sbp:policyRate",
  "sbp:tbillYield3m",
];

export function getSeriesCatalogEntry(seriesId: string): SharedSeriesDefinition | null {
  return SERIES_CATALOG[seriesId] ?? null;
}
