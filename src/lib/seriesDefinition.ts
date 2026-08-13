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
