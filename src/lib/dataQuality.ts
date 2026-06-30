// Unified Data Quality Layer — the single place that decides which of five
// states a KPI is in, combining two previously-separate signals:
//   1. Where the value actually came from this request (live upstream call,
//      a healthy in-memory cache hit, a degraded cache hit after a failed
//      live call, or a static last-resort snapshot) — see SourceStatus.
//   2. How old the value is relative to its expected publish cadence — the
//      existing age-based FreshnessStatus (dataFreshness.ts), unchanged.
//
// Before this file, every KPI exposed (1) only internally (SbpMeta.source/
// sourceStatus existed but no UI ever read it — see sbp.ts) and (2) via a
// freshness badge that KpiCard.tsx rendered inline, duplicated rather than
// shared. This file — plus the <DataQualityBadge> component that consumes
// it — is now the one canonical place this logic lives, per the Production
// Audit's Part 10 finding ("no component should implement its own version
// independently").
//
// Precedence (most concerning first): Unavailable > Fallback > Cached >
// Delayed > Verified. A KPI serving fallback data is ALWAYS labeled
// "Fallback" regardless of how old that snapshot happens to be — the fact
// that it's a static snapshot is the important thing to disclose, not its
// age specifically (that's covered by the Fallback description instead).

import { getFreshnessStatus, type DataFrequency, type FreshnessOptions, type FreshnessStatus } from "@/lib/dataFreshness";
import type { MarketType } from "@/lib/marketCalendar";

/**
 * Where a value actually came from on this request:
 * - "live": a fresh upstream call just succeeded.
 * - "cache-fresh": served from a short-TTL in-memory cache that is still
 *   within its normal window — a performance optimization, not a degraded
 *   state. The underlying value is exactly as trustworthy as "live".
 * - "cache-stale": the live upstream call just failed and this is the
 *   last-known-good value, served regardless of its own age — a genuinely
 *   degraded state worth disclosing.
 * - "fallback": no cached value existed at all; serving the hardcoded
 *   last-resort snapshot.
 * - "unavailable": no value could be produced at all (e.g. SPI's
 *   no-fallback-by-design policy) — there is nothing to show.
 */
export type SourceStatus = "live" | "cache-fresh" | "cache-stale" | "fallback" | "unavailable";

export type DataQualityState = "Verified" | "Delayed" | "Cached" | "Fallback" | "Unavailable";

export interface DataQualityInput {
  sourceStatus: SourceStatus;
  latestDate?: string;
  frequency?: DataFrequency;
  marketType?: MarketType;
  expectedReleaseDate?: string;
  releaseAlreadyReflected?: boolean;
  /** When the fallback/cache snapshot was captured — surfaced in the description so "Fallback" never reads as anonymous. */
  snapshotDate?: string;
}

export interface DataQualityResult {
  state: DataQualityState;
  /** Underlying age-based status when state is Verified/Delayed — null otherwise (source dominates the message at that point). */
  freshnessStatus: FreshnessStatus | null;
  description: string;
}

const DESCRIPTIONS: Record<DataQualityState, (input: DataQualityInput, freshnessStatus: FreshnessStatus | null) => string> = {
  Verified: () => "Live data, confirmed up to date.",
  Delayed: (_, freshnessStatus) => (freshnessStatus === "stale" ? "Live data, but well past its usual publish window — the source may be late." : "Live data, slightly behind its usual publish window."),
  Cached: () => "Live refresh failed just now — showing the last successfully fetched value.",
  Fallback: (i) => (i.snapshotDate ? `Live source unreachable — showing a static snapshot captured ${i.snapshotDate}.` : "Live source unreachable — showing a static snapshot, not current data."),
  Unavailable: () => "Latest data temporarily unavailable.",
};

export function getDataQuality(input: DataQualityInput): DataQualityResult {
  if (input.sourceStatus === "unavailable") {
    return build("Unavailable", null, input);
  }
  if (input.sourceStatus === "fallback") {
    return build("Fallback", null, input);
  }
  if (input.sourceStatus === "cache-stale") {
    return build("Cached", null, input);
  }

  // "live" or "cache-fresh" — both fully trustworthy; age is the only
  // remaining question, via the existing freshness module.
  const freshnessOptions: FreshnessOptions = {
    marketType: input.marketType,
    expectedReleaseDate: input.expectedReleaseDate,
    releaseAlreadyReflected: input.releaseAlreadyReflected,
  };
  const freshness = getFreshnessStatus(input.latestDate, input.frequency, freshnessOptions);

  if (freshness === "current" || freshness === "closed-weekend" || freshness === "closed-holiday") {
    return build("Verified", freshness, input);
  }
  return build("Delayed", freshness, input);
}

function build(state: DataQualityState, freshnessStatus: FreshnessStatus | null, input: DataQualityInput): DataQualityResult {
  return { state, freshnessStatus, description: DESCRIPTIONS[state](input, freshnessStatus) };
}

export const DATA_QUALITY_DOT: Record<DataQualityState, string> = {
  Verified: "text-emerald-400 light:text-emerald-700",
  Delayed: "text-amber-400 light:text-amber-600",
  Cached: "text-sky-400 light:text-sky-700",
  Fallback: "text-orange-400 light:text-orange-600",
  Unavailable: "text-slate-400 light:text-slate-500",
};

export const DATA_QUALITY_BADGE: Record<DataQualityState, string> = {
  Verified: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Delayed: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Cached: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  Fallback: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  Unavailable: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};
