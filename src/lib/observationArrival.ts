// Observation arrival lag — publication-delay observability (Phase D.4).
//
// WHAT THIS MEASURES
// For each stored observation: the period it describes (`observationPeriod`)
// versus when PEIC first recorded it as canonical (`firstSeenAt`). The
// difference is an ARRIVAL LAG — an upper bound on how long after the period
// closed the value became visible to this platform.
//
// WHY NO SCHEMA CHANGE WAS NEEDED
// The existing ledger (migration 0050) is already ALFRED-style vintaged:
//   * ingest_raw_observation() and resolve_canonical_observation() are
//     idempotent no-ops when the value is unchanged — they return
//     inserted:false / changed:false and write nothing. A re-fetch of an
//     unchanged observation therefore CANNOT move its vintage.
//   * A revision never updates a row in place: the current row gets
//     superseded_at set and a NEW row is inserted, so the original row (and
//     its original vintage) survives for audit.
// `canonical_observations.vintage` is consequently already a first-seen
// timestamp for the value it carries, and Phase D.4 adds analysis over it
// rather than a new column. See the D.4 report for the migration-impact
// assessment that was produced before this conclusion was reached.
//
// THE LIMIT THIS MODULE IS CAREFUL ABOUT
// An arrival lag is only evidence of PUBLICATION timing when the observation
// arrived through ordinary scheduled ingestion. Rows written by a one-time
// BACKFILL all share a single vintage and say nothing about when the
// provider published them — they only say when PEIC was first pointed at
// the series. Those are reported as `unknown`, never as a measured lag, and
// never substituted with the current time. Nothing here fabricates a
// timestamp for an observation whose true arrival was not witnessed.
//
// This module is OBSERVATIONAL ONLY. It computes no freshness verdict,
// reads no threshold, and is not imported by the freshness engine. Grace
// periods, reason codes and the current/delayed-release/stale vocabulary
// are untouched by it.

/** One stored observation, as the existing provenance RPC returns it. */
export interface ArrivalInput {
  observationPeriod: string;
  value: number;
  /** canonical_observations.vintage — when this value first became canonical. */
  vintage: string | null;
  /** canonical_observations.fetched_at — when the producing fetch ran. */
  fetchedAt?: string | null;
  /** Provider-reported release date, where a provider supplies one (SBP does not). */
  releaseDate?: string | null;
}

/** Why an arrival lag could not be measured for a record. */
export type ArrivalUnknownReason =
  /** The row carries no vintage at all. */
  | "no-vintage"
  /** The row was written by a bulk backfill, so its vintage is not an arrival time. */
  | "backfilled"
  /** The vintage precedes the observation period — not a usable lag. */
  | "vintage-before-period"
  /**
   * The period is older than another period already ingested in an earlier
   * run, so this row filled a gap rather than witnessing a new release.
   */
  | "out-of-order-gap-fill";

export type ArrivalKind = "first-observation" | "backfilled" | "gap-fill" | "unknown";

export interface ArrivalRecord {
  observationPeriod: string;
  value: number;
  /** When PEIC first held this value for this period. Null when unknown. */
  firstSeenAt: string | null;
  /** When the producing fetch ran, where recorded. */
  fetchedAt: string | null;
  /** Whole days between the observation period and firstSeenAt. Null when not measurable. */
  arrivalLagDays: number | null;
  /** Whether this record evidences a real publication arrival. */
  kind: ArrivalKind;
  /** Set only when arrivalLagDays is null. */
  unknownReason: ArrivalUnknownReason | null;
  /** True when a provider-supplied release date exists (none do for SBP today). */
  hasProviderReleaseDate: boolean;
}

export interface ArrivalReport {
  indicatorKey: string;
  records: ArrivalRecord[];
  /** Records whose lag is genuine evidence of publication timing. */
  measuredCount: number;
  /** Records whose arrival time is unknown — backfilled or missing. */
  unknownCount: number;
  /** Lag statistics over measured records only. Null when there are none. */
  stats: { min: number; median: number; max: number; count: number } | null;
  /**
   * True when too few measured arrivals exist to characterise publication
   * timing. Consumers must not present a lag profile while this is true.
   */
  insufficientEvidence: boolean;
  /** Plain-language summary of what the evidence does and does not support. */
  note: string;
}

const DAY_MS = 86_400_000;

/**
 * How many rows sharing one vintage timestamp mark a bulk backfill.
 *
 * A scheduled run writes at most a couple of genuinely new periods for one
 * series (usually one). Several periods landing on the same timestamp means
 * the series was loaded in one pass, so none of those vintages witnesses a
 * provider publication.
 */
export const BACKFILL_CLUSTER_THRESHOLD = 3;

/** Below this many measured arrivals, no lag profile should be claimed. */
export const MIN_MEASURED_FOR_PROFILE = 8;

/** Vintages within this window are treated as one ingestion run. */
const SAME_RUN_TOLERANCE_MS = 10 * 60 * 1000;

function dayDiff(fromIso: string, toIso: string): number {
  return Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / DAY_MS);
}

/**
 * Groups vintages into ingestion runs, then flags every run that wrote
 * BACKFILL_CLUSTER_THRESHOLD or more distinct periods.
 *
 * Deliberately derived from the data rather than configured: the backfill
 * that produced this project's existing history was a one-off, and a future
 * one would be equally invisible to a hardcoded date.
 */
function backfillRunTimestamps(rows: readonly ArrivalInput[]): Set<string> {
  const withVintage = rows.filter((r) => r.vintage).sort((a, b) => a.vintage!.localeCompare(b.vintage!));
  const runs: { anchor: number; members: string[] }[] = [];

  for (const row of withVintage) {
    const t = new Date(row.vintage!).getTime();
    const open = runs[runs.length - 1];
    if (open && t - open.anchor <= SAME_RUN_TOLERANCE_MS) open.members.push(row.vintage!);
    else runs.push({ anchor: t, members: [row.vintage!] });
  }

  const flagged = new Set<string>();
  for (const run of runs) {
    if (run.members.length >= BACKFILL_CLUSTER_THRESHOLD) for (const v of run.members) flagged.add(v);
  }
  return flagged;
}

/**
 * For each vintage, the newest observation period that was already stored
 * by any STRICTLY EARLIER vintage.
 *
 * A row whose own period is older than that was not a new release arriving
 * — the run reached back to fill a hole, so its lag would overstate the
 * provider's publication delay.
 */
function newestPeriodIngestedBefore(rows: readonly ArrivalInput[]): Map<string, string> {
  const withVintage = rows.filter((r) => r.vintage).sort((a, b) => a.vintage!.localeCompare(b.vintage!));
  const result = new Map<string, string>();
  let newestSoFar: string | null = null;

  for (const row of withVintage) {
    // Recorded BEFORE folding this row in, so a row is never compared to itself.
    if (newestSoFar !== null && !result.has(row.vintage!)) result.set(row.vintage!, newestSoFar);
    if (newestSoFar === null || row.observationPeriod > newestSoFar) newestSoFar = row.observationPeriod;
  }
  return result;
}

/**
 * Builds the arrival report for one indicator.
 *
 * Pure: no I/O, no Date.now(), no thresholds read from the freshness engine.
 * An observation whose arrival was not witnessed stays `unknown` — its lag
 * is never estimated from the observation date and never filled with the
 * current time.
 */
export function buildArrivalReport(indicatorKey: string, rows: readonly ArrivalInput[]): ArrivalReport {
  const backfilled = backfillRunTimestamps(rows);
  const newestPeriodBefore = newestPeriodIngestedBefore(rows);

  const records: ArrivalRecord[] = rows.map((row) => {
    const base = {
      observationPeriod: row.observationPeriod,
      value: row.value,
      firstSeenAt: row.vintage ?? null,
      fetchedAt: row.fetchedAt ?? null,
      hasProviderReleaseDate: Boolean(row.releaseDate),
    };

    if (!row.vintage) {
      return { ...base, firstSeenAt: null, arrivalLagDays: null, kind: "unknown" as const, unknownReason: "no-vintage" as const };
    }
    if (backfilled.has(row.vintage)) {
      // Known when PEIC loaded it; unknown when the provider published it.
      return { ...base, arrivalLagDays: null, kind: "backfilled" as const, unknownReason: "backfilled" as const };
    }
    const lag = dayDiff(row.observationPeriod, row.vintage);
    if (lag < 0) {
      return { ...base, arrivalLagDays: null, kind: "unknown" as const, unknownReason: "vintage-before-period" as const };
    }
    // A period OLDER than one an earlier run already ingested was not
    // witnessed arriving — the run was filling a hole in the history, so
    // its lag measures PEIC's catch-up, not the provider's publication.
    // Observed in the real ledger: a lone 2026-07-31 row ingested on
    // 2026-09-10, weeks after later periods were already stored, which
    // would otherwise have contributed a spurious 41-day "arrival".
    if (newestPeriodBefore.has(row.vintage) && row.observationPeriod < newestPeriodBefore.get(row.vintage)!) {
      return { ...base, arrivalLagDays: null, kind: "gap-fill" as const, unknownReason: "out-of-order-gap-fill" as const };
    }
    return { ...base, arrivalLagDays: lag, kind: "first-observation" as const, unknownReason: null };
  });

  const measured = records.filter((r) => r.arrivalLagDays !== null).map((r) => r.arrivalLagDays!);
  const unknownCount = records.length - measured.length;

  let stats: ArrivalReport["stats"] = null;
  if (measured.length > 0) {
    const sorted = [...measured].sort((a, b) => a - b);
    stats = {
      min: sorted[0],
      median: sorted[Math.floor((sorted.length - 1) / 2)],
      max: sorted[sorted.length - 1],
      count: sorted.length,
    };
  }

  const insufficientEvidence = measured.length < MIN_MEASURED_FOR_PROFILE;
  const note = buildNote(measured.length, unknownCount, insufficientEvidence);

  return { indicatorKey, records, measuredCount: measured.length, unknownCount, stats, insufficientEvidence, note };
}

function buildNote(measured: number, unknown: number, insufficient: boolean): string {
  if (measured === 0) {
    return `No arrival times have been witnessed yet for this series. ${unknown} stored observation${unknown === 1 ? " was" : "s were"} loaded in bulk or carry no vintage, so the date PEIC first saw them is not evidence of when the provider published them.`;
  }
  const base = `${measured} arrival${measured === 1 ? "" : "s"} observed through scheduled ingestion${unknown > 0 ? `; ${unknown} further observation${unknown === 1 ? "" : "s"} were backfilled, so their publication timing is unknown` : ""}.`;
  return insufficient
    ? `${base} This is too few to characterise the provider's publication timing — the figures below describe only what has been witnessed so far, and must not be read as a cadence.`
    : `${base} These are measured arrivals, which bound how long after each period closed the value became visible to PEIC. They are not provider-declared release dates.`;
}
