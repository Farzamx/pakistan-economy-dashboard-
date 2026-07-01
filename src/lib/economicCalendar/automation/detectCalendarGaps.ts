import { createPublicDataClient } from "@/lib/supabase/publicDataClient";
import { SERIES_PUBLICATION_META } from "@/lib/economicCalendar/seriesPublicationConfig";

// Phase 2 — Automatic Calendar Gap Detection & Self-Healing
//
// Problem it solves: monthly scheduled events can be missing from the DB when:
//   (a) the initial seed only covered a short forward window,
//   (b) a migration was not run,
//   (c) a rolling-calendar cron run failed before generate_next_occurrence() fired,
//   (d) a new automated series is added without backfilling past events.
//
// Without gap detection, the sync pipeline would skip those past months forever
// with "skipped-no-due-event" — correct in the moment, but leaving a permanent
// calendar hole. With gap detection running before the actual-value sync in every
// cron pass, missing events are auto-created as scheduled/estimated, and the
// same cron pass can immediately fill them if the data source has the right period.
//
// Scope: monthly_lag series with gapDetection configured in SERIES_PUBLICATION_META.
// Weekly and as-needed series are excluded (irregular dates, no predictable window).
//
// Security: the create_missing_scheduled_event() RPC is SECURITY DEFINER and
// requires NOTIFICATION_WORKER_SECRET — the same credential used by the
// notification worker and the cron logger. The anon key alone cannot write events.
//
// Idempotency: create_missing_scheduled_event() checks for existing events within
// ±windowDays before inserting. Running gap detection twice for the same period
// is safe — the second call is a no-op.

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

export interface GapDetectionResult {
  seriesSlug: string;
  status: "no-gaps" | "gaps-filled" | "skipped-no-config" | "skipped-no-secret" | "error";
  /** Expected release dates checked (ISO date strings). */
  expectedDates: string[];
  /** Dates where no existing event was found. */
  missingDates: string[];
  /** Slugs of events successfully created. */
  created: string[];
  errors: string[];
}

/**
 * Computes the ISO date string for the expected release of a monthly series.
 *
 * @param obsYear      Year of the observation month.
 * @param obsMonth     1-based month of the observation (1=Jan, 12=Dec).
 * @param lagMonths    Months between observation month-end and release.
 * @param dayOfMonth   Expected day-of-month for the release.
 */
function expectedReleaseDate(
  obsYear: number,
  obsMonth: number,
  lagMonths: number,
  dayOfMonth: number,
): Date {
  let releaseMonth = obsMonth + lagMonths;
  let releaseYear = obsYear;
  while (releaseMonth > 12) {
    releaseMonth -= 12;
    releaseYear++;
  }
  // Clamp day to the last valid day of the release month to avoid invalid
  // dates (e.g. day=31 in a 30-day month). The real release date varies
  // slightly month-to-month; windowDays in the RPC covers the variance.
  const lastDay = new Date(Date.UTC(releaseYear, releaseMonth, 0)).getUTCDate();
  const clampedDay = Math.min(dayOfMonth, lastDay);
  return new Date(Date.UTC(releaseYear, releaseMonth - 1, clampedDay));
}

/** Returns the first day of an observation month as a Date. */
function obsMonthStart(obsYear: number, obsMonth: number): Date {
  return new Date(Date.UTC(obsYear, obsMonth - 1, 1));
}

/**
 * Formats a month label for the event title template (e.g. "June 2026").
 * Matches the format used by generate_next_occurrence() in migration 0013.
 */
function monthLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

/**
 * Checks every automated monthly series for missing historical events and
 * creates them as scheduled/estimated if absent. Must run before the
 * SBP EasyData sync in the cron pass so that newly created events can be
 * filled in the same invocation.
 *
 * @param workerSecret  Value of NOTIFICATION_WORKER_SECRET env var.
 *                      Passed to the create_missing_scheduled_event() RPC.
 *                      If empty/missing, all series return "skipped-no-secret".
 */
export async function detectAndFillCalendarGaps(workerSecret: string): Promise<GapDetectionResult[]> {
  if (!workerSecret) {
    // Return a single sentinel entry rather than per-series entries — all
    // would have the same status and spamming the log adds no information.
    return [
      {
        seriesSlug: "*",
        status: "skipped-no-secret",
        expectedDates: [],
        missingDates: [],
        created: [],
        errors: ["NOTIFICATION_WORKER_SECRET is not set — gap detection RPC requires it"],
      },
    ];
  }

  const supabase = createPublicDataClient();
  const results: GapDetectionResult[] = [];
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  for (const [seriesSlug, meta] of Object.entries(SERIES_PUBLICATION_META)) {
    const { gapDetection, periodValidation } = meta;

    // Only monthly series with gap detection config are checked.
    // as-needed and weekly cadences have unpredictable release dates.
    if (!gapDetection || !periodValidation || periodValidation.cadence !== "monthly") {
      if (gapDetection) {
        // Config defined but cadence isn't monthly — unexpected, surface it.
        results.push({
          seriesSlug,
          status: "error",
          expectedDates: [],
          missingDates: [],
          created: [],
          errors: [`gapDetection configured but cadence is not 'monthly' (${periodValidation?.cadence})`],
        });
      }
      continue;
    }

    const {
      slugPrefix,
      lookbackMonths,
      windowDays,
      expectedDayOfMonth,
      eventTimeOfDay,
      importance,
      titleTemplate,
    } = gapDetection;
    const lagMonths = periodValidation.lagMonths ?? 1;

    const result: GapDetectionResult = {
      seriesSlug,
      status: "no-gaps",
      expectedDates: [],
      missingDates: [],
      created: [],
      errors: [],
    };

    try {
      // Generate expected release dates for the past `lookbackMonths` observation months.
      // We iterate observation months going backward from (today - lagMonths) so that we
      // only check periods whose release date has already passed.
      for (let i = lookbackMonths; i >= 1; i--) {
        // Observation month = today - i months (adjusted for year rollover)
        let obsMonth = today.getUTCMonth() + 1 - i; // 1-based
        let obsYear = today.getUTCFullYear();
        while (obsMonth <= 0) {
          obsMonth += 12;
          obsYear--;
        }

        const releaseDate = expectedReleaseDate(obsYear, obsMonth, lagMonths, expectedDayOfMonth);
        const releaseDateStr = releaseDate.toISOString().slice(0, 10);

        // Skip if the expected release date is in the future.
        if (releaseDateStr > todayStr) continue;

        result.expectedDates.push(releaseDateStr);

        // Check for an existing event within ±windowDays of the expected release date.
        // Uses the same !inner join pattern as syncFromSbpEasyData.ts to filter by
        // series slug through the foreign key relationship.
        const windowStart = new Date(releaseDate);
        windowStart.setUTCDate(windowStart.getUTCDate() - windowDays);
        const windowEnd = new Date(releaseDate);
        windowEnd.setUTCDate(windowEnd.getUTCDate() + windowDays);

        const { data: existingEvents, error: queryError } = await supabase
          .from("economic_events")
          .select("slug, event_date, economic_event_series!inner(slug)")
          .eq("economic_event_series.slug", seriesSlug)
          .gte("event_date", windowStart.toISOString().slice(0, 10))
          .lte("event_date", windowEnd.toISOString().slice(0, 10))
          .limit(1);

        if (queryError) {
          result.errors.push(`Query error for ${releaseDateStr}: ${queryError.message}`);
          continue;
        }

        if (existingEvents && existingEvents.length > 0) {
          // Event exists — no gap. Continue.
          continue;
        }

        // No event found in the window → this is a gap.
        result.missingDates.push(releaseDateStr);

        // Generate the event slug and title.
        const eventSlug = `${slugPrefix}-${releaseDateStr}`;
        const obsPeriodLabel = monthLabel(obsYear, obsMonth);
        const title = titleTemplate.replace("{month}", obsPeriodLabel);
        const referencePeriod = obsMonthStart(obsYear, obsMonth).toISOString().slice(0, 10);

        const description =
          `Auto-created by gap detector (cron ${todayStr}). ` +
          `Expected release for ${obsPeriodLabel} data. ` +
          `Observation period: ${obsPeriodLabel} (reference_period ${referencePeriod}). ` +
          `Set to released by sync pipeline once source confirms the observation period.`;

        // Call the secure RPC to create the missing event.
        const { data: rpcResult, error: rpcError } = await supabase.rpc(
          "create_missing_scheduled_event",
          {
            p_internal_secret: workerSecret,
            p_series_slug: seriesSlug,
            p_event_date: releaseDateStr,
            p_event_slug: eventSlug,
            p_event_time: eventTimeOfDay,
            p_title: title,
            p_importance: importance,
            p_previous_value: null,
            p_description: description,
            p_reference_period: referencePeriod,
            p_window_days: windowDays,
          },
        );

        if (rpcError) {
          result.errors.push(`RPC error creating ${eventSlug}: ${rpcError.message}`);
        } else if (rpcResult && typeof rpcResult === "object" && "created" in rpcResult) {
          if (rpcResult.created) {
            result.created.push(eventSlug);
          } else {
            // RPC returned created=false — event exists in window (race condition or
            // the query above missed it). Not an error; log the reason.
            const reason = (rpcResult as Record<string, unknown>).reason ?? "unknown";
            result.errors.push(
              `RPC declined to create ${eventSlug}: ${reason} ` +
              `(existing slug: ${(rpcResult as Record<string, unknown>).existing_slug ?? "?"})`,
            );
          }
        }
      }
    } catch (err) {
      result.errors.push(err instanceof Error ? err.message : String(err));
    }

    result.status =
      result.errors.length > 0
        ? "error"
        : result.created.length > 0
          ? "gaps-filled"
          : "no-gaps";

    results.push(result);
  }

  return results;
}
