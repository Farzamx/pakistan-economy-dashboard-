import { getSbpIndicatorHistory } from "@/lib/data/sbp";
import { createPublicDataClient } from "@/lib/supabase/publicDataClient";
import { validateObservationPeriod } from "@/lib/economicCalendar/observationPeriodValidator";
import { SERIES_PUBLICATION_META } from "@/lib/economicCalendar/seriesPublicationConfig";
import { recordSourceAttempt } from "@/lib/economicCalendar/sourceHealthTracker";
import type { SyncResult, SyncProvenance } from "@/lib/economicCalendar/automation/syncFromSbpEasyData";
import { invalidate } from "@/lib/memoryCache";

// LSM YoY Sync — Part 4 of Phase 3 (Institutional-Grade Source Intelligence)
//
// Blocker resolved (2026-07-01): SBP EasyData series LSM000160000 returns the
// LSM Quantum Index (base 2015-16=100), not the year-over-year growth rate.
// Naively writing the raw index value as "% YoY" produces "114.56% YoY" —
// factually wrong.
//
// This module resolves it deterministically:
//   1. Fetch the full LSM index history via getSbpIndicatorHistory('lsm'),
//      which pulls the complete EasyData series from HISTORY_START_DATE (2016-01-01).
//   2. Identify the latest observation (current month index).
//   3. Find the same-month observation from exactly one year prior.
//   4. Compute: YoY = (current / prior_year - 1) * 100.
//
// The calculation is deterministic, reversible, and exactly matches the
// methodology published by PBS/SBP in their official LSM releases. No AI,
// no estimation, no approximation. Both index points are official SBP EasyData
// values. The formula produces results consistent with SBP official YoY figures.
//
// Period validation (lagMonths=2): the July 18, 2026 event represents May 2026
// LSM data (published ~45 days after May 31). The period validator rejects
// any observation date that doesn't correspond to May 2026, so if EasyData
// only has April data on the cron run date, the sync skips and retries the
// next day — exactly the right behavior.
//
// Security: writes via sync_event_actual() SECURITY DEFINER RPC, gated by
// NOTIFICATION_WORKER_SECRET (migration 0027 hardening). No service-role key.

const SERIES_SLUG = "large-scale-manufacturing-lsm-growth";

/**
 * Computes LSM year-over-year growth deterministically from SBP EasyData's
 * full quantum index history, then syncs the result to the due calendar event.
 *
 * The formula matches the PBS/SBP official methodology:
 *   YoY% = (currentIndex / sameMonthPriorYearIndex - 1) × 100
 *
 * Skips with "skipped-fallback-data" if EasyData is serving stale/cached data.
 * Skips with "skipped-period-mismatch" if the latest observation doesn't match
 * the expected observation month for the due event.
 * Skips with "skipped-no-due-event" if no LSM event is currently due.
 */
export async function syncLsmYoYFromEasyData(): Promise<SyncResult> {
  try {
    const pubMeta = SERIES_PUBLICATION_META[SERIES_SLUG];
    if (!pubMeta?.periodValidation) {
      return {
        seriesSlug: SERIES_SLUG,
        status: "skipped-not-configured",
        detail:
          `No period-validation config for ${SERIES_SLUG} in SERIES_PUBLICATION_META. ` +
          "Check seriesPublicationConfig.ts.",
      };
    }

    // Fetch the full LSM index history. This reuses the same L1/L2 cache as
    // getSbpIndicator('lsm') so no extra SBP EasyData call is made when the
    // cron also runs other SBP syncs in the same invocation.
    const lsmFetchStart = new Date();
    const history = await getSbpIndicatorHistory("lsm");

    // Guard: if the underlying live fetch failed, we're serving a fallback
    // snapshot from sbpFallbackData.ts. Fallback dates are approximate
    // (last day of each displayed month) and the history might be too short
    // for a reliable prior-year lookup. Never write estimated data.
    const isFallback = history.meta.sourceStatus === "fallback";
    void recordSourceAttempt(
      {
        success: !isFallback,
        observationDate: isFallback ? undefined : history.meta.observationDate,
        sourceName: "SBP EasyData — LSM Quantum Index",
        sourceType: "sbp-easydata",
        isFallback,
        error: isFallback ? "EasyData LSM series serving fallback snapshot" : undefined,
      },
      SERIES_SLUG,
      lsmFetchStart,
      "lsm-yoy-sync",
    );
    if (isFallback) {
      return {
        seriesSlug: SERIES_SLUG,
        status: "skipped-fallback-data",
        detail:
          "SBP EasyData LSM series is serving fallback snapshot — " +
          "prior-year index lookup may be unreliable. Not safe to write.",
      };
    }

    const points = history.points; // oldest → newest, raw quantum index values
    if (points.length < 13) {
      return {
        seriesSlug: SERIES_SLUG,
        status: "error",
        detail: `LSM history too short for YoY computation (${points.length} points, need ≥13).`,
      };
    }

    const latest = points[points.length - 1];
    const obsDate = latest.date; // "YYYY-MM-DD" (typically month-end, e.g. "2026-04-30")
    const obsYear = parseInt(obsDate.slice(0, 4), 10);
    const obsMonth = obsDate.slice(5, 7); // "MM"

    // Find the same-month observation from exactly one calendar year ago.
    // SBP EasyData uses month-end dates ("YYYY-MM-DD") consistently, so
    // matching on year-1 and the same month prefix is deterministic.
    const priorYearPrefix = `${obsYear - 1}-${obsMonth}`;
    const priorYearPoint = points.find((p) => p.date.startsWith(priorYearPrefix));
    if (!priorYearPoint) {
      return {
        seriesSlug: SERIES_SLUG,
        status: "error",
        detail:
          `No prior-year LSM observation found for ${priorYearPrefix} — ` +
          `history starts at ${points[0]?.date ?? "unknown"}. Cannot compute YoY.`,
      };
    }

    if (priorYearPoint.value === 0) {
      return {
        seriesSlug: SERIES_SLUG,
        status: "error",
        detail: `Prior-year LSM index is zero for ${priorYearPoint.date} — division undefined.`,
      };
    }

    // YoY formula: PBS/SBP official methodology (Laspeyres chain-type index).
    // Both values are official SBP EasyData Quantum Index observations.
    const yoyPct = ((latest.value / priorYearPoint.value) - 1) * 100;
    const sign = yoyPct >= 0 ? "+" : "";
    const actualValue = `${sign}${yoyPct.toFixed(1)}% YoY`;

    // Find the due LSM event (scheduled, event_date <= today).
    const supabase = createPublicDataClient();
    const workerSecret = process.env.NOTIFICATION_WORKER_SECRET ?? "";
    const today = new Date().toISOString().slice(0, 10);
    const { data: dueEvents } = await supabase
      .from("economic_events")
      .select("event_date, previous_value, economic_event_series!inner(slug)")
      .eq("economic_event_series.slug", SERIES_SLUG)
      .eq("status", "scheduled")
      .lte("event_date", today)
      .order("event_date", { ascending: false })
      .limit(1);

    const dueEvent = dueEvents?.[0];
    if (!dueEvent) {
      return {
        seriesSlug: SERIES_SLUG,
        status: "skipped-no-due-event",
        detail: `No scheduled LSM event is due yet (today=${today}, latest EasyData obs=${obsDate}).`,
      };
    }

    // Period validation: the observation month must match what the event represents.
    // lagMonths=2 means: event in July represents May data. If EasyData only
    // has April (month prior), the validator rejects it and the sync waits.
    const periodCheck = validateObservationPeriod(obsDate, dueEvent.event_date, pubMeta.periodValidation);
    if (!periodCheck.valid) {
      return {
        seriesSlug: SERIES_SLUG,
        status: "skipped-period-mismatch",
        detail:
          `${periodCheck.reason} ` +
          `(current: ${obsDate} [${latest.value.toFixed(2)}] vs prior year: ${priorYearPoint.date} [${priorYearPoint.value.toFixed(2)}])`,
      };
    }

    // Write the computed YoY to the database via the SECURITY DEFINER RPC.
    const { data: didUpdate, error } = await supabase.rpc("sync_event_actual", {
      p_internal_secret: workerSecret,
      p_series_slug: SERIES_SLUG,
      p_event_date: dueEvent.event_date,
      p_actual_value: actualValue,
      p_observation_date: obsDate,
    });

    if (error) {
      return { seriesSlug: SERIES_SLUG, status: "error", detail: error.message };
    }

    const provenance: SyncProvenance = {
      sourceName: "SBP EasyData — LSM Quantum Index (YoY derived)",
      sourceType: "sbp-easydata",
      observationPeriod: periodCheck.expectedPeriod ?? obsDate,
      observationDate: obsDate,
      syncTimestamp: new Date().toISOString(),
      dataConfidence: "confirmed",
    };

    if (didUpdate) {
      invalidate(`canonical-obs:${SERIES_SLUG}`);
      return {
        seriesSlug: SERIES_SLUG,
        status: "synced",
        detail:
          `YoY=${actualValue} | current=${obsDate}:${latest.value.toFixed(2)} | ` +
          `prior=${priorYearPoint.date}:${priorYearPoint.value.toFixed(2)} | event=${dueEvent.event_date}`,
        provenance,
      };
    }
    return {
      seriesSlug: SERIES_SLUG,
      status: "skipped-no-due-event",
      detail: "LSM event already released or not found at call time.",
    };
  } catch (err) {
    return {
      seriesSlug: SERIES_SLUG,
      status: "error",
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}
