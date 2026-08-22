// Unified Freshness Engine — Phase 5 (Shadow Mode).
//
// Why this exists: src/lib/data/sbp.ts's getSbpIndicator() labels a value
// sourceStatus="live" purely because the DATABASE READ succeeded — not
// because the observation itself is current. A canonical row from six
// months ago, read successfully today, is still logged and served as
// "live" (see sbp.ts's getSbpIndicator(), the `logSbp(key, "live", ...)`
// call right after `buildIndicatorResultFromCanonical`). That conflates two
// genuinely different questions:
//   1. Did the delivery mechanism succeed just now? (SourceStatus — already
//      modeled by src/lib/dataQuality.ts: live/cache-fresh/cache-stale/
//      fallback/unavailable. Untouched by this file.)
//   2. Is the DATA itself current, relative to what the source should have
//      published by now? (a question about the observation, not the fetch)
//
// This engine answers only question 2, and answers it from evidence: the
// observation's own dates (migration 0051's release_date/source_updated_at/
// fetched_at, when genuinely populated) plus a series' declared cadence —
// never from whether a read happened to succeed. A successful cache/DB read
// must never itself imply "current"; a value that was JUST fetched can
// still be stale if the period it describes is old.
//
// SHADOW MODE ONLY (Phase 5): nothing in this file is wired into anything
// that changes what a page renders. See shadowFreshnessAdapter.ts for the
// read-only comparison harness. Phase 6 (not started) is what would make
// this authoritative.

import { getMarketClosureReason, getLastTradingDay } from "@/lib/marketCalendar";
import type { SharedSeriesDefinition, SeriesCadence } from "@/lib/seriesDefinition";

// ── The eight states ────────────────────────────────────────────────────────
export type FreshnessState =
  | "current"
  | "market-closed"
  | "awaiting-release"
  | "delayed-release"
  | "ingestion-lagging"
  | "stale"
  | "source-unavailable"
  | "validation-failed";

export type FreshnessSeverity = "healthy" | "caution" | "problem";

// Presentation-layer simplification only — the 8-state machine above is
// never collapsed internally; every FreshnessResult still carries its exact
// `state`. This mapping exists so a future (Phase 6) UI can pick one of
// three visual treatments without needing its own copy of this table.
//
// Rationale: awaiting-release and market-closed are both "nothing is wrong,
// this is the correct current answer" — healthy. delayed-release,
// ingestion-lagging, and source-unavailable are all "something may be off,
// but there's a benign/self-resolving explanation on the table" — caution.
// stale and validation-failed are both "the data itself is confirmed wrong
// or confirmed too old, with no benign explanation left" — problem.
export const FRESHNESS_SEVERITY: Record<FreshnessState, FreshnessSeverity> = {
  current: "healthy",
  "market-closed": "healthy",
  "awaiting-release": "healthy",
  "delayed-release": "caution",
  "ingestion-lagging": "caution",
  "source-unavailable": "caution",
  stale: "problem",
  "validation-failed": "problem",
};

// Phase 8.0: was an independently-declared 8-value union; now a direct
// alias of the shared vocabulary (src/lib/seriesDefinition.ts) so this and
// comparisonRegistry.ts's ComparisonFrequency can never drift apart again.
// Every existing import of `ReleaseCadence` from this file keeps working
// unchanged -- only where the literal values are enumerated has moved.
export type ReleaseCadence = SeriesCadence;

/** Nominal days between periods. 0 for "as-needed" — there is no fixed next-period estimate; only calendar evidence or grace-period aging apply. */
export const CADENCE_INTERVAL_DAYS: Record<ReleaseCadence, number> = {
  "real-time": 0,
  hourly: 0,
  daily: 1,
  weekly: 7,
  monthly: 31,
  quarterly: 92,
  annual: 366,
  "as-needed": 0,
};

/**
 * A provider-agnostic declaration of what to expect from one series. See
 * seriesRegistry.ts for where these are actually populated (SBP entries
 * derived from src/lib/data/sbp.ts's existing frequency/grace metadata, not
 * re-invented here).
 *
 * Phase 8.0: seriesId/provider/cadence/marketType/unit now come from
 * SharedSeriesDefinition (src/lib/seriesDefinition.ts) instead of being
 * declared here directly -- this is a type-composition change only. Every
 * object literal that already satisfied this interface (seriesRegistry.ts's
 * entries, every test fixture) still satisfies it unchanged: the required
 * field set is identical, only which file declares each field moved.
 */
export interface SeriesDefinition extends SharedSeriesDefinition {
  /**
   * TOTAL allowed age from observationPeriod before this series counts as
   * stale (matching systemHealth.ts's SLA_GRACE_DAYS/SLA_GRACE_OVERRIDE_DAYS
   * exactly) -- NOT additional tolerance stacked on top of a
   * cadence-derived due date. For a cadence-derived due date, the engine
   * itself subtracts the cadence interval already consumed to reach that
   * due date, so the remaining delayed-release buffer is (graceDays -
   * cadenceInterval), keeping the end-to-end tolerance equal to graceDays.
   */
  graceDays: number;
  /** Whether this provider is known to expose a genuine release_date for its observations. False does not mean "broken" — it means the engine must never fabricate one (e.g. SBP EasyData today). */
  expectsReleaseDate: boolean;
  /** Whether this provider is known to expose its own source_updated_at. */
  expectsSourceUpdatedAt: boolean;
}

/** What the engine knows about one served/ingested observation. All date fields are "YYYY-MM-DD" or null; timestamps are ISO strings or null. */
export interface ObservationInput {
  observationPeriod: string | null;
  value: number | null;
  /** Migration 0051 columns — genuinely null when not recorded, never backfilled by this engine. */
  releaseDate: string | null;
  sourceUpdatedAt: string | null;
  fetchedAt: string | null;
  /** When this became the canonical answer for its period (existing `vintage` column, migration 0050) — cache/delivery timing, kept separate from data freshness per the file header. */
  vintage: string | null;
  /** Set when a fetched value was rejected by validation before ever reaching canonical storage — evaluateFreshness treats this as decisive regardless of age. */
  validationFailed?: boolean;
  validationFailureReason?: string;
}

/**
 * Evidence available to the engine beyond the observation itself. Every
 * field is optional and, when absent, the engine degrades honestly to
 * cadence-based evaluation rather than guessing — see file header and the
 * ingestion-lagging/delayed-release distinction in particular.
 */
export interface FreshnessEvidence {
  /** A known scheduled release date for the NEXT period (e.g. from the economic calendar), when genuinely known. */
  calendarNextReleaseDate?: string | null;
  /**
   * The calendar's scheduled release has passed, but this period's own
   * value already reflects that outcome (e.g. a policy "hold" produces no
   * new dated observation) — suppresses a false delayed/stale reading for
   * exactly the case dataFreshness.ts's existing releaseAlreadyReflected
   * option was built for.
   */
  releaseAlreadyReflected?: boolean;
  /**
   * The most recent period the source is POSITIVELY known to have
   * published (e.g. from release_date metadata or a reachable provider
   * metadata probe) — the ONLY evidence that can justify ingestion-lagging.
   * Absent/null means "no such evidence", which must never be treated as
   * "the source has not published."
   */
  knownLatestSourcePeriod?: string | null;
  /** Direct evidence the last attempt to reach the source failed (e.g. source_health_log's consecutiveFailures > 0), distinct from simply "no new data yet". */
  lastIngestionAttemptFailed?: boolean;
}

export interface FreshnessContext {
  now: Date;
  evidence?: FreshnessEvidence;
}

export interface FreshnessResult {
  state: FreshnessState;
  severity: FreshnessSeverity;
  seriesId: string;
  observationPeriod: string | null;
  /** The due date the engine actually evaluated against — calendar-derived when evidence.calendarNextReleaseDate was supplied, otherwise cadence-derived, otherwise null (as-needed with no calendar evidence). */
  expectedPeriodOrDate: string | null;
  /** Whether expectedPeriodOrDate came from genuine scheduling evidence (calendar) vs cadence arithmetic. Null when there was no due-date estimate at all. */
  expectedDateSource: "calendar" | "cadence" | null;
  ageDays: number | null;
  reasonCode: string;
  reason: string;
  evidence: string[];
  /**
   * Cache/delivery metadata, kept explicitly separate from `state` per the
   * file header's core distinction — this field never influences `state`.
   */
  delivery?: { vintage: string | null; fetchedAt: string | null };
}

function daysBetween(fromIso: string, toDate: Date): number {
  const from = new Date(fromIso.length === 4 ? `${fromIso}-12-31` : fromIso);
  return Math.floor((toDate.getTime() - from.getTime()) / 86_400_000);
}

function addDays(dateIso: string, days: number): string {
  const d = new Date(dateIso.length === 4 ? `${dateIso}-12-31` : dateIso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function todayIso(now: Date): string {
  return now.toISOString().slice(0, 10);
}

function result(
  partial: Omit<FreshnessResult, "severity" | "delivery"> & { delivery?: FreshnessResult["delivery"] },
): FreshnessResult {
  return { ...partial, severity: FRESHNESS_SEVERITY[partial.state] };
}

/**
 * Pure, deterministic freshness evaluator. Identical inputs (including
 * `context.now`) always produce an identical result — no hidden clock reads,
 * no network calls, no randomness. Callers supply all evidence explicitly.
 */
export function evaluateFreshness(
  observation: ObservationInput,
  seriesDefinition: SeriesDefinition,
  context: FreshnessContext,
): FreshnessResult {
  const { now, evidence = {} } = context;
  const delivery = { vintage: observation.vintage, fetchedAt: observation.fetchedAt };
  const trail: string[] = [];

  // 1. Validation failure is decisive regardless of age — a rejected fetch
  // is never "current" merely because a prior good value happens to be old
  // enough to look fine, and never "stale" as if it were simply old data.
  if (observation.validationFailed) {
    trail.push(observation.validationFailureReason ?? "fetched observation failed validation");
    return result({
      state: "validation-failed",
      seriesId: seriesDefinition.seriesId,
      observationPeriod: observation.observationPeriod,
      expectedPeriodOrDate: null,
      expectedDateSource: null,
      ageDays: null,
      reasonCode: "validation-failed",
      reason: "The most recently fetched observation was rejected by validation.",
      evidence: trail,
      delivery,
    });
  }

  // 2. Market closure — only ever the explanatory answer when the served
  // period already matches the last completed trading session. A closure
  // that does NOT explain the served period's age falls through to normal
  // evaluation below (a real delay that happens to coincide with a weekend
  // is still a real delay).
  if (seriesDefinition.marketType) {
    const closure = getMarketClosureReason(now);
    if (closure) {
      const lastTradingDay = getLastTradingDay(now);
      if (observation.observationPeriod && observation.observationPeriod >= lastTradingDay) {
        trail.push(`market ${closure === "closed-weekend" ? "closed for the weekend" : "closed for a holiday"}; served period ${observation.observationPeriod} matches the last trading day (${lastTradingDay})`);
        return result({
          state: "market-closed",
          seriesId: seriesDefinition.seriesId,
          observationPeriod: observation.observationPeriod,
          expectedPeriodOrDate: lastTradingDay,
          expectedDateSource: "cadence",
          ageDays: daysBetween(observation.observationPeriod, now),
          reasonCode: closure,
          reason: "The instrument is not currently trading; the latest completed session is the correct current answer.",
          evidence: trail,
          delivery,
        });
      }
      trail.push(`market currently ${closure === "closed-weekend" ? "closed for the weekend" : "closed for a holiday"}, but served period predates the last trading day — not treated as an explanation`);
    }
  }

  // 3. No observation at all yet.
  if (!observation.observationPeriod) {
    const dueBy = evidence.calendarNextReleaseDate ?? null;
    if (dueBy && todayIso(now) <= dueBy) {
      trail.push(`no observation ingested yet; next scheduled release (${dueBy}) has not occurred`);
      return result({
        state: "awaiting-release",
        seriesId: seriesDefinition.seriesId,
        observationPeriod: null,
        expectedPeriodOrDate: dueBy,
        expectedDateSource: "calendar",
        ageDays: null,
        reasonCode: "awaiting-first-release",
        reason: "The next expected observation has not yet been released.",
        evidence: trail,
        delivery,
      });
    }
    if (evidence.knownLatestSourcePeriod) {
      trail.push(`no canonical observation exists, but the source is known to have published through ${evidence.knownLatestSourcePeriod}`);
      return result({
        state: "ingestion-lagging",
        seriesId: seriesDefinition.seriesId,
        observationPeriod: null,
        expectedPeriodOrDate: evidence.knownLatestSourcePeriod,
        expectedDateSource: "calendar",
        ageDays: null,
        reasonCode: "never-ingested-source-published",
        reason: "The source has published the observation but PEIC has not successfully ingested it.",
        evidence: trail,
        delivery,
      });
    }
    if (evidence.lastIngestionAttemptFailed) {
      trail.push("no observation exists; the last attempt to reach the source failed");
      return result({
        state: "source-unavailable",
        seriesId: seriesDefinition.seriesId,
        observationPeriod: null,
        expectedPeriodOrDate: dueBy,
        expectedDateSource: dueBy ? "calendar" : null,
        ageDays: null,
        reasonCode: "never-ingested-source-unreachable",
        reason: "The provider could not be reached for the expected refresh.",
        evidence: trail,
        delivery,
      });
    }
    trail.push("no observation has ever been ingested for this series, and there is no evidence the source has published one");
    return result({
      state: "delayed-release",
      seriesId: seriesDefinition.seriesId,
      observationPeriod: null,
      expectedPeriodOrDate: dueBy,
      expectedDateSource: dueBy ? "calendar" : null,
      ageDays: null,
      reasonCode: "never-ingested-no-evidence",
      reason: "No observation has been ingested and there is no evidence explaining why.",
      evidence: trail,
      delivery,
    });
  }

  // 4. A real observation exists — evaluate its age against cadence/calendar.
  const ageDays = daysBetween(observation.observationPeriod, now);
  const cadenceIntervalDays = CADENCE_INTERVAL_DAYS[seriesDefinition.cadence];
  const cadenceDueDate = cadenceIntervalDays > 0 ? addDays(observation.observationPeriod, cadenceIntervalDays) : null;
  const dueDate = evidence.calendarNextReleaseDate ?? cadenceDueDate;
  const dueDateSource: FreshnessResult["expectedDateSource"] = evidence.calendarNextReleaseDate ? "calendar" : dueDate ? "cadence" : null;

  const today = todayIso(now);

  if (evidence.releaseAlreadyReflected) {
    trail.push("the scheduled release has passed, but this period's value already reflects that outcome (e.g. a policy hold) — not treated as a delay");
    return result({
      state: "current",
      seriesId: seriesDefinition.seriesId,
      observationPeriod: observation.observationPeriod,
      expectedPeriodOrDate: dueDate,
      expectedDateSource: dueDateSource,
      ageDays,
      reasonCode: "release-already-reflected",
      reason: "Latest expected observation is present and current.",
      evidence: trail,
      delivery,
    });
  }

  if (dueDate && today <= dueDate) {
    // <= , not < : the due date itself is still "on schedule", not yet
    // overdue -- overdue means strictly after the expected date.
    trail.push(`next expected release (${dueDate}, ${dueDateSource}) has not occurred yet`);
    return result({
      state: dueDateSource === "calendar" ? "awaiting-release" : "current",
      seriesId: seriesDefinition.seriesId,
      observationPeriod: observation.observationPeriod,
      expectedPeriodOrDate: dueDate,
      expectedDateSource: dueDateSource,
      ageDays,
      reasonCode: dueDateSource === "calendar" ? "next-release-not-due" : "within-cadence-window",
      reason: dueDateSource === "calendar" ? "The next expected observation has not yet been released." : "Latest expected observation is present and current.",
      evidence: trail,
      delivery,
    });
  }

  // Past the expected due date (or no due-date estimate at all, e.g. a
  // genuinely as-needed series with no calendar evidence — age vs grace is
  // then the only honest signal available).
  const sourceUpdatedSinceFetch =
    observation.sourceUpdatedAt && observation.fetchedAt && observation.sourceUpdatedAt > observation.fetchedAt;

  if (evidence.knownLatestSourcePeriod && evidence.knownLatestSourcePeriod > observation.observationPeriod) {
    trail.push(`the source is known to have published through ${evidence.knownLatestSourcePeriod}, newer than the served period ${observation.observationPeriod}`);
    return result({
      state: "ingestion-lagging",
      seriesId: seriesDefinition.seriesId,
      observationPeriod: observation.observationPeriod,
      expectedPeriodOrDate: evidence.knownLatestSourcePeriod,
      expectedDateSource: "calendar",
      ageDays,
      reasonCode: "source-published-not-ingested",
      reason: "The source has published the observation but PEIC has not successfully ingested it.",
      evidence: trail,
      delivery,
    });
  }

  // source_updated_at (migration 0051) is a second, independent kind of
  // evidence for the same state: if the SOURCE reports having updated this
  // record after we last fetched it, that is direct proof of a publication
  // we haven't caught up to yet — distinct from knownLatestSourcePeriod
  // (which is about a *different, newer period* existing). Both are
  // "evidence of publication we haven't ingested"; either alone is enough.
  // Never fabricated: this branch is simply unreachable whenever
  // source_updated_at is null, which is true for every SBP-sourced row
  // today (see seriesRegistry.ts's expectsSourceUpdatedAt=false for SBP).
  if (sourceUpdatedSinceFetch) {
    trail.push(`source_updated_at (${observation.sourceUpdatedAt}) is newer than fetched_at (${observation.fetchedAt}) — the source has updated this record since PEIC last fetched it`);
    return result({
      state: "ingestion-lagging",
      seriesId: seriesDefinition.seriesId,
      observationPeriod: observation.observationPeriod,
      expectedPeriodOrDate: dueDate,
      expectedDateSource: dueDateSource,
      ageDays,
      reasonCode: "source-updated-since-fetch",
      reason: "The source has published the observation but PEIC has not successfully ingested it.",
      evidence: trail,
      delivery,
    });
  }

  if (evidence.lastIngestionAttemptFailed) {
    trail.push("the expected refresh window has passed and the last attempt to reach the source failed");
    return result({
      state: "source-unavailable",
      seriesId: seriesDefinition.seriesId,
      observationPeriod: observation.observationPeriod,
      expectedPeriodOrDate: dueDate,
      expectedDateSource: dueDateSource,
      ageDays,
      reasonCode: "refresh-attempt-failed",
      reason: "The provider could not be reached for the expected refresh.",
      evidence: trail,
      delivery,
    });
  }

  // No due-date estimate at all (a genuinely "as-needed" series with no
  // calendar evidence, e.g. policyRate between MPC meetings): there is no
  // "expected release window" that could have "passed" — being within
  // grace here just means the observation is still a perfectly normal age
  // for a series with no fixed cadence, i.e. current, matching this
  // project's existing production precedent (systemHealth.ts's
  // SLA_GRACE_OVERRIDE_DAYS for exactly these indicators). Only exceeding
  // grace with no due-date evidence escalates, and it escalates straight to
  // stale — "delayed-release" specifically means a real due date passed,
  // which never existed in this branch.
  if (!dueDate) {
    if (ageDays <= seriesDefinition.graceDays) {
      trail.push(`no fixed due date for this cadence; ${ageDays} day(s) old, within the ${seriesDefinition.graceDays}-day grace period — a normal age for a series with no fixed cadence`);
      return result({
        state: "current",
        seriesId: seriesDefinition.seriesId,
        observationPeriod: observation.observationPeriod,
        expectedPeriodOrDate: null,
        expectedDateSource: null,
        ageDays,
        reasonCode: "as-needed-within-grace",
        reason: "Latest expected observation is present and current.",
        evidence: trail,
        delivery,
      });
    }
    trail.push(`no fixed due date for this cadence; ${ageDays} day(s) old, beyond the ${seriesDefinition.graceDays}-day grace period`);
    return result({
      state: "stale",
      seriesId: seriesDefinition.seriesId,
      observationPeriod: observation.observationPeriod,
      expectedPeriodOrDate: null,
      expectedDateSource: null,
      ageDays,
      reasonCode: "as-needed-beyond-grace",
      reason: "The observation is materially older than the expected cadence.",
      evidence: trail,
      delivery,
    });
  }

  // seriesDefinition.graceDays is the TOTAL allowed age from
  // observationPeriod before a series counts as stale — matching
  // systemHealth.ts's SLA_GRACE_DAYS/SLA_GRACE_OVERRIDE_DAYS exactly (its
  // own comments describe every value this way, e.g. Monthly's 40 = "one
  // release cycle [~30d] + ~10 day buffer", Annual's 450 = ">1 full cycle
  // [366d] + a generous buffer"; there is no precedent anywhere in this
  // codebase for treating grace as additional tolerance stacked on top of a
  // separately-computed due date). When the due date came from cadence
  // arithmetic (not calendar evidence), cadenceIntervalDays has already
  // consumed part of that total to reach the due date, so the remaining
  // buffer here is graceDays minus that interval, not graceDays again in
  // full -- otherwise a Monthly series would tolerate ~71 days (31 + 40)
  // before going stale, silently doubling the already-validated 40-day
  // standard. A calendar-derived due date isn't built by adding the
  // interval, so it consumes none of the total up front -- the full
  // graceDays applies past it.
  const remainingGraceDays = dueDateSource === "cadence" ? Math.max(0, seriesDefinition.graceDays - cadenceIntervalDays) : seriesDefinition.graceDays;
  const overdueDays = daysBetween(dueDate, now);
  if (overdueDays <= remainingGraceDays) {
    trail.push(`expected release window (${dueDate}) has passed by ${overdueDays} day(s), within the remaining ${remainingGraceDays}-day buffer (${seriesDefinition.graceDays}-day total tolerance from the observation period), with no evidence of publication`);
    return result({
      state: "delayed-release",
      seriesId: seriesDefinition.seriesId,
      observationPeriod: observation.observationPeriod,
      expectedPeriodOrDate: dueDate,
      expectedDateSource: dueDateSource,
      ageDays,
      reasonCode: "past-due-within-grace",
      reason: "The expected release window has passed but the source has not published the expected observation.",
      evidence: trail,
      delivery,
    });
  }

  trail.push(`expected release window (${dueDate}) has passed by ${overdueDays} day(s), beyond the remaining ${remainingGraceDays}-day buffer (${seriesDefinition.graceDays}-day total tolerance from the observation period)`);
  return result({
    state: "stale",
    seriesId: seriesDefinition.seriesId,
    observationPeriod: observation.observationPeriod,
    expectedPeriodOrDate: dueDate,
    expectedDateSource: dueDateSource,
    ageDays,
    reasonCode: "beyond-grace",
    reason: "The observation is materially older than the expected cadence.",
    evidence: trail,
    delivery,
  });
}
