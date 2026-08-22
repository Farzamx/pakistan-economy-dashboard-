// Shadow Freshness Adapter — Phase 5.
//
// Deliberately NOT tagged "server-only" (matching src/lib/data/sbpCanonicalStore.ts's
// own precedent, same reasoning): this module needs to be importable from a
// Vitest unit test, and nothing in this codebase imports it from a client
// component — it is an out-of-band diagnostic path, not part of any page's
// render chain. The anon key it reads through is safe to reference from any
// context; RLS/RPC-gating is the real security boundary, not import-time
// restriction.
//
// Evaluates every SBP-backed indicator through BOTH the existing system
// (dataFreshness.ts + dataQuality.ts, fed the exact fields a real page
// render already computes) and the new engine (freshnessEngine.ts), using
// only read paths (getSbpIndicator, the Phase 4/5 provenance RPC,
// source_health_log) — never a write, never a new fetch, never anything
// that changes what a page serves. Disagreements are logged through the
// same console-tag convention sbp.ts's own logSbp/logSbpError already use
// (see that file) — no new database table; cron_run_log/source_health_log
// remain the only persistent records, per the Phase 5 brief.
//
// Never throws out of runShadowFreshnessComparison(): one indicator's
// evaluation failing is caught and logged, never allowed to propagate to a
// caller that might be mid-page-render.

import { getSbpIndicator, getAllSbpIndicatorKeys, SBP_FREQ_MAP, type SbpIndicatorKey } from "@/lib/data/sbp";
import { canonicalIndicatorKey } from "@/lib/data/canonicalResolutionConfig";
import { getLatestCanonicalProvenance } from "@/lib/freshness/canonicalProvenanceStore";
import { getSourceHealthSummary } from "@/lib/economicCalendar/sourceHealthTracker";
import { getSbpSeriesDefinition } from "@/lib/freshness/seriesRegistry";
import { evaluateFreshness, type FreshnessResult, type ObservationInput, type FreshnessContext } from "@/lib/freshness/freshnessEngine";
import { getDataQuality, type DataQualityResult } from "@/lib/dataQuality";
import { getFreshnessStatus, type FreshnessStatus } from "@/lib/dataFreshness";

export interface ShadowComparisonEntry {
  indicatorKey: SbpIndicatorKey;
  seriesId: string;
  observationPeriod: string | null;
  oldSourceStatus: string;
  oldFreshnessStatus: FreshnessStatus | null;
  oldDataQualityState: string;
  newState: FreshnessResult["state"];
  newSeverity: FreshnessResult["severity"];
  agree: boolean;
  disagreementReason: string | null;
  newResult: FreshnessResult;
}

// Coarse mapping used ONLY to decide whether old vs new "agree" for the
// shadow log. The old system has no concept of e.g. ingestion-lagging or
// validation-failed, so "agree" here means "both systems describe this as
// the same broad kind of okay/not-okay" — never a literal string match, and
// never something that suppresses the underlying reason, which is always
// logged regardless of whether the two happen to agree.
function statusesAgree(oldQuality: DataQualityResult, newState: FreshnessResult["state"]): boolean {
  const oldHealthy = oldQuality.state === "Verified";
  const newHealthy = newState === "current" || newState === "market-closed" || newState === "awaiting-release";
  return oldHealthy === newHealthy;
}

function describeDisagreement(oldQuality: DataQualityResult, newResult: FreshnessResult): string {
  return `old system says "${oldQuality.state}" (sourceStatus-driven) but new engine says "${newResult.state}" (${newResult.reasonCode}): ${newResult.reason}`;
}

async function evaluateOneIndicator(key: SbpIndicatorKey, now: Date): Promise<ShadowComparisonEntry> {
  const seriesId = canonicalIndicatorKey(key);
  const seriesDefinition = getSbpSeriesDefinition(key);

  const [served, provenance, sourceHealth] = await Promise.all([
    getSbpIndicator(key),
    getLatestCanonicalProvenance(seriesId),
    getSourceHealthSummary(72).catch(() => []),
  ]);

  const health = sourceHealth.find((h) => h.sourceName === "sbp-easydata" && h.seriesSlug === key);
  const lastIngestionAttemptFailed = health ? health.consecutiveFailures > 0 : false;

  const observation: ObservationInput = {
    observationPeriod: provenance?.observationPeriod ?? served.meta.observationDate ?? null,
    value: provenance?.value ?? null,
    releaseDate: provenance?.releaseDate ?? null,
    sourceUpdatedAt: provenance?.sourceUpdatedAt ?? null,
    fetchedAt: provenance?.fetchedAt ?? null,
    vintage: provenance?.vintage ?? null,
  };

  const context: FreshnessContext = {
    now,
    evidence: {
      lastIngestionAttemptFailed,
      // No calendarNextReleaseDate / knownLatestSourcePeriod wiring exists
      // for any SBP indicator in the current codebase (confirmed by
      // inspection — grep for expectedReleaseDate/marketType in sbp.ts finds
      // no SBP call sites; that wiring exists only for the Global Markets
      // indicators). Omitted rather than guessed, per the engine's own
      // "degrade honestly to cadence-based evaluation" rule.
    },
  };

  const newResult = evaluateFreshness(observation, seriesDefinition, context);

  const dataFrequency = SBP_FREQ_MAP[served.meta.frequency];
  const oldFreshnessStatus = served.meta.observationDate
    ? getFreshnessStatus(served.meta.observationDate, dataFrequency, { marketType: seriesDefinition.marketType })
    : null;
  const oldQuality = getDataQuality({
    sourceStatus: served.meta.sourceStatus ?? "live",
    latestDate: served.meta.observationDate,
    frequency: dataFrequency,
    marketType: seriesDefinition.marketType,
  });

  const agree = statusesAgree(oldQuality, newResult.state);

  return {
    indicatorKey: key,
    seriesId,
    observationPeriod: observation.observationPeriod,
    oldSourceStatus: served.meta.sourceStatus ?? "unknown",
    oldFreshnessStatus,
    oldDataQualityState: oldQuality.state,
    newState: newResult.state,
    newSeverity: newResult.severity,
    agree,
    disagreementReason: agree ? null : describeDisagreement(oldQuality, newResult),
    newResult,
  };
}

/** Structured, secret-free diagnostic logging — same console-tag convention as src/lib/data/sbp.ts's logSbp/logSbpError. No new database table. */
function logShadowResults(entries: ShadowComparisonEntry[]): void {
  const disagreements = entries.filter((e) => !e.agree);
  for (const entry of disagreements) {
    console.log(
      `[FreshnessShadow] DISAGREEMENT indicator=${entry.indicatorKey} period=${entry.observationPeriod ?? "none"} old=${entry.oldDataQualityState} new=${entry.newState} reasonCode=${entry.newResult.reasonCode} — ${entry.disagreementReason}`,
    );
  }
  console.log(`[FreshnessShadow] ${entries.length} indicator(s) evaluated, ${disagreements.length} disagreement(s).`);
}

/**
 * Evaluates every SBP-backed indicator through both systems using the exact
 * same read path a real page render uses (getSbpIndicator — never a new
 * upstream fetch, never a write). Never throws: one indicator's failure is
 * captured as a console diagnostic, never propagated, and never changes
 * what any page serves.
 */
export async function runShadowFreshnessComparison(
  keys: SbpIndicatorKey[] = getAllSbpIndicatorKeys(),
  now: Date = new Date(),
): Promise<ShadowComparisonEntry[]> {
  const settled = await Promise.all(
    keys.map(async (key): Promise<ShadowComparisonEntry | null> => {
      try {
        return await evaluateOneIndicator(key, now);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[FreshnessShadow] ${key} evaluation threw (does not affect the served page): ${message}`);
        return null;
      }
    }),
  );
  const entries = settled.filter((r): r is ShadowComparisonEntry => r !== null);
  logShadowResults(entries);
  return entries;
}
