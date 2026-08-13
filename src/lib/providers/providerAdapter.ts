// Provider adapter contract — Phase 8.1.
//
// NOT WIRED INTO PRODUCTION. This file defines the shape a future provider
// adapter must produce; scripts/ingestSbp.ts's existing SBP path is
// untouched and does not use this contract yet (see the Phase 8.0/8.1
// architecture review's explicit prohibition on switching or replacing
// working SBP ingestion in this phase). ingestionOrchestrator.ts is the
// generic consumer of this contract, exercised in this phase only against
// fixture/mock adapters, never against a real provider.
//
// Pure types + a pure validator, no I/O, no "server-only" tag — safe for
// either side of the client/server boundary, matching the precedent set by
// comparisonRegistry.ts's ComparisonSeriesConfig and freshnessEngine.ts's
// SeriesDefinition (Phase 7/8.0).

import type { SeriesCadence } from "@/lib/seriesDefinition";

/**
 * What one adapter fetch call produces for one series. Every field here maps
 * 1:1 onto either an existing canonical_observations column (migration
 * 0050/0051) or a Phase 8.0-approved addition (`cadence`, `methodology`) —
 * nothing added for theoretical completeness. Deliberately NOT included,
 * per the Phase 8.1 architecture decision:
 *   - sourceTimezone: a property of how the ADAPTER parsed a provider
 *     timestamp into `observationPeriod`, not a fact about the resulting
 *     observation. Resolving provider-specific time/timezone mechanics into
 *     a plain period-end date is the adapter's job, done before this shape
 *     exists (see the Time/Date rule below) — leaking timezone mechanics
 *     into the shared contract would be exposing adapter internals.
 *   - vintage/revision fields: canonical_observations already implements
 *     vintaging (vintage, superseded_at, supersede-then-insert) at the
 *     orchestrator/database layer. An adapter that carried its own revision
 *     opinion would create a second revision model.
 */
export interface NormalizedObservation {
  /** Provider-qualified indicator identity, matching canonical_observations.indicator_key's existing convention (e.g. "sbp:cpiInflation"). */
  indicatorKey: string;
  /** "YYYY-MM-DD" — the reference period's END date. Resolving whatever the provider natively exposes (a timestamp, a quarter label, a fiscal-year code) into this one shape is the adapter's responsibility -- see the Time/Date rule. */
  observationPeriod: string;
  value: number;
  unit: string;
  /** Shared vocabulary (src/lib/seriesDefinition.ts) — not a provider-specific frequency string. */
  cadence: SeriesCadence;
  /** e.g. "sbp-easydata", "worldbank", "fred". */
  provider: string;
  /** The provider's own native series identifier (migration 0051's source_series_id). */
  sourceSeriesId: string;
  /** Free-text, provider-defined (migration 0051's quality_status) — never fabricated to avoid a null; see sbpSourceReference-style honesty precedent in ingestSbp.ts. */
  qualityStatus: string;
  /** "YYYY-MM-DD" or null. Null means the provider genuinely does not expose one — never inferred from fetch time or a calendar. */
  releaseDate: string | null;
  /** ISO timestamp or null. Null means the provider genuinely does not expose one. */
  sourceUpdatedAt: string | null;
  /** Structured, non-secret provenance only — see validateNormalizedObservation's credential check. Never an authenticated URL. */
  sourceReference: Record<string, unknown> | null;
  /**
   * Phase 8.0-approved addition. Set only when a series' methodology is a
   * genuinely distinguishing fact about the observation (e.g. PBS
   * customs-basis vs SBP BPM6 trade figures) — most providers leave this
   * null/absent. Existing only so two methodologically different sources
   * for "the same" indicator are never silently merged into one series
   * without the difference being representable (see the Phase 8.0 PBS
   * trade-trio decision: this field is what would make that distinction
   * explicit if it were ever canonicalized, which it is not in this phase).
   */
  methodology?: string | null;
}

/** The minimum an adapter must implement. Retries, concurrency, and revision handling are explicitly NOT here — see ingestionOrchestrator.ts's header. */
export interface ProviderAdapter {
  providerId: string;
  /**
   * Fetches normalized observations for one series. Must not retry
   * internally — the orchestrator owns retry/backoff so behavior is
   * consistent and observable across every provider, not reimplemented
   * per-adapter. `sinceDate`, when provided, is an optional incremental-fetch
   * hint (mirrors ingestSbp.ts's existing incrementalStartDate pattern) —
   * an adapter unable to filter server-side may ignore it and return full
   * history; the orchestrator's diff against existing canonical rows is
   * still correct either way, just less bandwidth-efficient.
   */
  fetchObservations(seriesRef: { indicatorKey: string; sinceDate?: string }): Promise<NormalizedObservation[]>;
}

export interface ValidationResult {
  valid: boolean;
  /** Populated only when valid is false. */
  reason?: string;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Loose but real ISO-8601 timestamp check — matches what "new Date(x).toISOString()" produces, without requiring a specific millisecond format. */
function isIsoTimestamp(v: string): boolean {
  const d = new Date(v);
  return !Number.isNaN(d.getTime()) && v.includes("T");
}

/**
 * Structural validation only — this is NOT the compatibility gate
 * (comparisonCompatibility.ts) and does not decide whether an observation
 * is economically sensible, only whether it is a well-formed
 * NormalizedObservation the orchestrator can safely persist.
 *
 * Includes one explicit security invariant (not merely a style check):
 * `sourceReference` must never carry an authenticated URL or an API-key
 * -shaped value. This is enforced HERE, at the one boundary every adapter's
 * output must cross before reaching the orchestrator, rather than trusted
 * to each adapter's own discipline.
 */
export function validateNormalizedObservation(obs: NormalizedObservation): ValidationResult {
  if (!obs.indicatorKey || obs.indicatorKey.trim() === "") {
    return { valid: false, reason: "indicatorKey is required" };
  }
  if (!ISO_DATE_RE.test(obs.observationPeriod)) {
    return { valid: false, reason: `observationPeriod must be "YYYY-MM-DD", got "${obs.observationPeriod}"` };
  }
  if (!Number.isFinite(obs.value)) {
    return { valid: false, reason: `value must be a finite number, got ${JSON.stringify(obs.value)}` };
  }
  if (!obs.unit || obs.unit.trim() === "") {
    return { valid: false, reason: "unit is required" };
  }
  if (!obs.provider || obs.provider.trim() === "") {
    return { valid: false, reason: "provider is required" };
  }
  if (!obs.sourceSeriesId || obs.sourceSeriesId.trim() === "") {
    return { valid: false, reason: "sourceSeriesId is required" };
  }
  if (!obs.qualityStatus || obs.qualityStatus.trim() === "") {
    return { valid: false, reason: "qualityStatus is required" };
  }
  if (obs.releaseDate !== null && !ISO_DATE_RE.test(obs.releaseDate)) {
    return { valid: false, reason: `releaseDate must be "YYYY-MM-DD" or null, got "${obs.releaseDate}"` };
  }
  if (obs.sourceUpdatedAt !== null && !isIsoTimestamp(obs.sourceUpdatedAt)) {
    return { valid: false, reason: `sourceUpdatedAt must be an ISO timestamp or null, got "${obs.sourceUpdatedAt}"` };
  }
  const credentialCheck = findCredentialShapedValue(obs.sourceReference);
  if (credentialCheck) {
    return { valid: false, reason: `sourceReference appears to contain a credential-shaped value: ${credentialCheck}` };
  }
  return { valid: true };
}

const CREDENTIAL_PATTERNS = [/api[_-]?key\s*=/i, /apikey\s*=/i, /[?&]key=/i, /Bearer\s+\S+/i];

/** Recursively scans sourceReference's string values for an authenticated-URL or API-key shape. Defense in depth against an adapter bug, not a substitute for adapters simply never constructing such a value (see ingestSbp.ts's sbpSourceReference for the existing correct pattern). */
function findCredentialShapedValue(ref: Record<string, unknown> | null): string | null {
  if (!ref) return null;
  for (const value of Object.values(ref)) {
    if (typeof value === "string") {
      for (const pattern of CREDENTIAL_PATTERNS) {
        if (pattern.test(value)) return value;
      }
    } else if (typeof value === "object" && value !== null) {
      const nested = findCredentialShapedValue(value as Record<string, unknown>);
      if (nested) return nested;
    }
  }
  return null;
}
