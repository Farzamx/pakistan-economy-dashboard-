// Source Health Tracker — Phase 3 (Part 5)
//
// Writes per-source attempt outcomes to source_health_log (migration 0025)
// via the log_source_health() SECURITY DEFINER RPC, and reads aggregate
// health summaries via get_source_health_summary().
//
// The tracker is intentionally best-effort: a logging failure must never
// cause the calling sync to fail. Pattern mirrors cronLogging.ts.
//
// Security: writes require NOTIFICATION_WORKER_SECRET (same as logCronRun).
// The read RPC is open to anon/authenticated for the admin dashboard.

import { createPublicDataClient } from "@/lib/supabase/publicDataClient";
import type { SourceAttemptResult } from "@/lib/economicCalendar/automation/sourceChain";

export interface SourceHealthRecord {
  sourceName: string;
  sourceType: string;
  seriesSlug: string;
  lastAttemptedAt: string;
  lastSucceededAt: string | null;
  lastObservationDate: string | null;
  lastError: string | null;
  consecutiveFailures: number;
  totalAttempts: number;
  successRatePct: number;
}

/**
 * Records the outcome of a single source attempt to source_health_log.
 * Best-effort — never throws. Call after each source attempt in the sync loop.
 *
 * @param attempt     The SourceAttemptResult from sourceChain.ts.
 * @param seriesSlug  The series slug this attempt was for (e.g. "cpi").
 * @param startedAt   The Date at which the adapter was invoked (for latency calc).
 * @param cronJobName The cron job name for cross-reference (e.g. "sbp-actual-value-sync").
 */
export async function recordSourceAttempt(
  attempt: SourceAttemptResult,
  seriesSlug: string,
  startedAt: Date,
  cronJobName?: string,
): Promise<void> {
  try {
    const internalSecret = process.env.NOTIFICATION_WORKER_SECRET;
    if (!internalSecret) {
      console.error("[SourceHealth] NOTIFICATION_WORKER_SECRET not configured — cannot log source attempt");
      return;
    }

    const latencyMs = Date.now() - startedAt.getTime();
    const supabase = createPublicDataClient();
    const { error } = await supabase.rpc("log_source_health", {
      p_internal_secret: internalSecret,
      p_source_name: attempt.sourceName,
      p_source_type: attempt.sourceType,
      p_series_slug: seriesSlug,
      p_succeeded: attempt.success,
      p_latency_ms: latencyMs,
      p_observation_date: attempt.observationDate ?? null,
      p_error_text: attempt.error ?? null,
      p_is_fallback: attempt.isFallback ?? false,
      p_cron_job_name: cronJobName ?? null,
    });

    if (error) {
      console.error(`[SourceHealth] log_source_health failed for ${attempt.sourceName}/${seriesSlug}: ${error.message}`);
    }
  } catch (err) {
    console.error(`[SourceHealth] log_source_health threw for ${attempt.sourceName}/${seriesSlug}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Records every attempt from a resolved source chain in one call.
 * Useful when the cron loop gets the full SourceChainResult and wants to
 * log all attempted sources (both failed fallbacks and the winning source).
 *
 * @param attempts    The attempts[] array from SourceChainResult.
 * @param seriesSlug  The series slug the chain was resolving for.
 * @param chainStart  The Date at which the chain started (latency is per-attempt estimated).
 * @param cronJobName The cron job name for cross-reference.
 */
export async function recordChainAttempts(
  attempts: SourceAttemptResult[],
  seriesSlug: string,
  chainStart: Date,
  cronJobName?: string,
): Promise<void> {
  for (const attempt of attempts) {
    await recordSourceAttempt(attempt, seriesSlug, chainStart, cronJobName);
  }
}

interface HealthRow {
  source_name: string;
  source_type: string;
  series_slug: string;
  last_attempted_at: string;
  last_succeeded_at: string | null;
  last_observation_date: string | null;
  last_error: string | null;
  consecutive_failures: number;
  total_attempts: number;
  success_rate_pct: number;
}

/**
 * Returns per-source health summaries for the admin System Health dashboard.
 * Covers the last `sinceHours` hours (default 168 = 7 days).
 * Returns [] on any error — the caller must handle missing data gracefully.
 */
export async function getSourceHealthSummary(sinceHours = 168): Promise<SourceHealthRecord[]> {
  try {
    const supabase = createPublicDataClient();
    const { data, error } = await supabase.rpc("get_source_health_summary", {
      p_since_hours: sinceHours,
    });

    if (error) {
      console.error(`[SourceHealth] get_source_health_summary failed: ${error.message}`);
      return [];
    }

    return ((data ?? []) as HealthRow[]).map((r) => ({
      sourceName: r.source_name,
      sourceType: r.source_type,
      seriesSlug: r.series_slug,
      lastAttemptedAt: r.last_attempted_at,
      lastSucceededAt: r.last_succeeded_at,
      lastObservationDate: r.last_observation_date,
      lastError: r.last_error,
      consecutiveFailures: r.consecutive_failures,
      totalAttempts: r.total_attempts,
      successRatePct: r.success_rate_pct,
    }));
  } catch (err) {
    console.error(`[SourceHealth] get_source_health_summary threw: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}
