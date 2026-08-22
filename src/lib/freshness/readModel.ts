// Authoritative freshness-aware read model — Phase 6.
//
// THE INVARIANT THIS FILE EXISTS TO ENFORCE:
//   OBSERVATION + FRESHNESS VERDICT = ONE OBJECT
//
// Phase 5 built the 8-state freshness engine but ran it in shadow mode: the
// UI still derived "is this current?" from sourceStatus, i.e. from whether a
// DATABASE READ SUCCEEDED. That is the exact defect class being eliminated:
//
//   canonical DB read succeeds -> sourceStatus="live" -> UI renders "Live"
//   ...even when the observation itself is months old.
//
// Phase 6 makes freshnessEngine.ts authoritative for the migrated paths.
// This module is the single seam where an observation is joined to its
// verdict. Nothing here re-implements freshness: it calls evaluateFreshness()
// and carries the result verbatim.
//
// DATA FRESHNESS != DELIVERY STATUS. Both are represented, deliberately
// separately, and never collapsed into one another:
//   - freshness  : is the DATA current, per its own cadence/release evidence?
//   - delivery   : how did this value reach us on THIS request (live read,
//                  warm cache, degraded cache, static fallback)?
// A cached observation can be perfectly current; a just-fetched observation
// can be stale. Only `freshness` may be used to answer "is this current".

import { evaluateFreshness, type FreshnessResult, type ObservationInput, type SeriesDefinition } from "@/lib/freshness/freshnessEngine";
import type { SourceStatus } from "@/lib/dataQuality";

/**
 * Delivery/provenance metadata for one request. Deliberately NOT part of the
 * freshness verdict — kept adjacent so a UI can explain "served from cache"
 * without ever letting that claim to mean "the data is current".
 */
export interface DeliveryMetadata {
  sourceStatus: SourceStatus;
  /** When this value became the canonical answer for its period (migration 0050's `vintage`). */
  vintage?: string | null;
  /** When ingestion retrieved it from the source (migration 0051's `fetched_at`). Null for rows written before Phase 4. */
  fetchedAt?: string | null;
}

/**
 * The authoritative rendering contract. A component that displays an
 * economic/market observation should accept this — not a bare value — so
 * that rendering a number without its verdict is a type error rather than an
 * oversight.
 *
 * `freshness` is intentionally REQUIRED and non-optional. Making it optional
 * would reintroduce exactly the hole Phase 6 closes.
 */
export interface FreshnessAwareObservation {
  seriesId: string;
  observationPeriod: string | null;
  freshness: FreshnessResult;
  delivery: DeliveryMetadata;
}

/**
 * Joins an observation to its authoritative verdict.
 *
 * Evidence discipline (unchanged from Phase 5): callers pass only what is
 * genuinely known. Absent release evidence stays absent — the engine then
 * degrades honestly to cadence-based evaluation rather than fabricating a
 * release date, and never manufactures `ingestion-lagging` without positive
 * proof the source published something we haven't ingested.
 *
 * Note there is no `sourceStatus` parameter to evaluateFreshness() and none
 * is passed here: delivery status is structurally incapable of influencing
 * the verdict.
 */
export function buildFreshnessAwareObservation(
  observation: ObservationInput,
  seriesDefinition: SeriesDefinition,
  delivery: DeliveryMetadata,
  now: Date = new Date(),
): FreshnessAwareObservation {
  const freshness = evaluateFreshness(observation, seriesDefinition, { now });
  return {
    seriesId: seriesDefinition.seriesId,
    observationPeriod: observation.observationPeriod,
    freshness,
    delivery,
  };
}

// ── Human-facing labels ────────────────────────────────────────────────────
// The UI may show a simplified label, but the underlying 8-state verdict is
// always preserved on the object itself — this map never collapses states,
// it only names them. Wording follows the Phase 6 brief.
export const FRESHNESS_STATE_LABEL: Record<FreshnessResult["state"], string> = {
  current: "Current",
  "market-closed": "Market closed",
  "awaiting-release": "Latest available",
  "delayed-release": "Delayed",
  "ingestion-lagging": "Update pending",
  stale: "Stale",
  "source-unavailable": "Source unavailable",
  "validation-failed": "Validation failed",
};

/**
 * Reuses the existing severity palette conventions already established in
 * dataQuality.ts/dataFreshness.ts rather than introducing a new colour
 * system. Severity itself comes from the Phase 5 engine (FRESHNESS_SEVERITY)
 * — not recomputed here.
 */
export const FRESHNESS_SEVERITY_DOT: Record<FreshnessResult["severity"], string> = {
  healthy: "text-emerald-400 light:text-emerald-700",
  caution: "text-amber-400 light:text-amber-600",
  problem: "text-rose-400 light:text-rose-700",
};

export const FRESHNESS_SEVERITY_BADGE: Record<FreshnessResult["severity"], string> = {
  healthy: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  caution: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  problem: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

/**
 * Deterministic aggregation for a single global/hero status representing many
 * indicators. Documented semantics (Phase 6 brief section 12):
 *   any `problem`  -> problem   (worst case always surfaces)
 *   else any `caution` -> caution
 *   else                -> healthy
 * Empty input is treated as `caution`, not `healthy`: "we know nothing" must
 * never render as a clean bill of health.
 *
 * The per-indicator 8-state verdicts remain individually available; this only
 * summarises them.
 */
export function aggregateSeverity(results: readonly FreshnessResult[]): FreshnessResult["severity"] {
  if (results.length === 0) return "caution";
  if (results.some((r) => r.severity === "problem")) return "problem";
  if (results.some((r) => r.severity === "caution")) return "caution";
  return "healthy";
}

/** Human label for an aggregated status. Never returns "Live" — see the file header. */
export const AGGREGATE_SEVERITY_LABEL: Record<FreshnessResult["severity"], string> = {
  healthy: "Current",
  caution: "Degraded",
  problem: "Stale",
};
