import { createPublicDataClient } from "@/lib/supabase/publicDataClient";
import { validateObservationPeriod } from "@/lib/economicCalendar/observationPeriodValidator";
import { SERIES_PUBLICATION_META } from "@/lib/economicCalendar/seriesPublicationConfig";
import { recordSourceAttempt } from "@/lib/economicCalendar/sourceHealthTracker";
import type { SyncResult, SyncProvenance } from "@/lib/economicCalendar/automation/syncFromSbpEasyData";

// PBS LSM Sync — Phase 7 Step 2
//
// PBS publishes the Large Scale Manufacturing (LSM) Monthly Release via its
// WordPress site. The post body contains the YoY % directly in HTML text:
//   "The LSMI output increased by 6.06% for April, 2026 when compared with
//    April, 2025"
//
// This is the primary source for LSM YoY — PBS publishes the release 5–18
// days into M+2, and the WordPress post is available immediately. SBP EasyData
// (lsmSync.ts) remains the fallback for cron runs that fire before PBS posts
// or when the PBS post structure changes.
//
// Publication timing: ~5th–18th of M+2 (lagMonths=2). The period validator
// ensures the observation period matches the due event before any DB write.
//
// Security: writes via sync_event_actual() SECURITY DEFINER RPC, gated by
// NOTIFICATION_WORKER_SECRET (migration 0027 hardening).

const PBS_API_BASE = "https://www.pbs.gov.pk/wp-json/wp/v2/posts";
const FETCH_TIMEOUT_MS = 15_000;
const SERIES_SLUG = "large-scale-manufacturing-lsm-growth";

// Matches the English month name used by PBS in post body text, e.g. "April"
const MONTH_NAMES: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

interface LsmPbsResult {
  yoyPct: number;
  obsMonth: number; // 1-12
  obsYear: number;
  obsDate: string;  // "YYYY-MM-DD" (last day of obs month)
  postDate: string; // ISO date string of PBS post publication
}

async function fetchLsmFromPbsWordPress(): Promise<LsmPbsResult> {
  const params = new URLSearchParams({
    search: "Large Scale Manufacturing",
    per_page: "3",
    orderby: "date",
    order: "desc",
  });
  const res = await fetch(`${PBS_API_BASE}?${params.toString()}`, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    // No Next.js caching — this is called from a cron, not a user request path
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`PBS WordPress API returned ${res.status}`);

  const posts = (await res.json()) as Array<{
    title: { rendered: string };
    content: { rendered: string };
    date: string;
  }>;

  // Find the most recent post that matches a LSM / Quantum Index release
  const lsmPost = posts.find((p) =>
    /large.scale.manufactur|quantum.index|LSMI/i.test(p.title.rendered) ||
    /large.scale.manufactur|quantum.index|LSMI/i.test(p.content.rendered),
  );
  if (!lsmPost) throw new Error("No PBS LSM post found in latest WordPress results");

  // Strip HTML tags from content to get plain text for regex matching
  const plainText = lsmPost.content.rendered
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ");

  // Pattern: "increased by 6.06% for April, 2026" or "declined by 2.5% for March, 2026"
  // Also handles: "decreased by", "grew by", "fell by"
  const yoyMatch = plainText.match(
    /\b(increased?|grew?|declined?|decreased?|fell?|reduced?|contracted?)\s+by\s+([\d.]+)\s*%\s+for\s+([A-Za-z]+),?\s+(\d{4})/i,
  );
  if (!yoyMatch) {
    throw new Error(
      `PBS LSM post did not contain expected YoY pattern. ` +
      `First 400 chars: ${plainText.slice(0, 400)}`,
    );
  }

  const direction = yoyMatch[1].toLowerCase();
  const magnitude = parseFloat(yoyMatch[2]);
  const monthName = yoyMatch[3].toLowerCase();
  const year = parseInt(yoyMatch[4], 10);

  if (isNaN(magnitude) || isNaN(year)) {
    throw new Error(`Failed to parse PBS LSM YoY values: direction=${direction}, magnitude=${yoyMatch[2]}, year=${yoyMatch[4]}`);
  }

  const obsMonth = MONTH_NAMES[monthName];
  if (!obsMonth) throw new Error(`Unrecognised month name in PBS LSM post: "${yoyMatch[3]}"`);

  // Negative for declines
  const isNegative = /declin|decreas|fell|fall|contract|reduc/i.test(direction);
  const yoyPct = isNegative ? -magnitude : magnitude;

  // Observation date: last day of the obs month (for period validation).
  // Use the 0th day of the next month to get the last day of this month.
  const lastDay = new Date(year, obsMonth, 0).getDate();
  const obsDate = `${year}-${String(obsMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  return { yoyPct, obsMonth, obsYear: year, obsDate, postDate: lsmPost.date };
}

/**
 * Syncs LSM YoY from PBS's monthly release post (primary source).
 * Returns "skipped-not-configured" if seriesPublicationConfig lacks config.
 * Returns "skipped-period-mismatch" if the PBS post's observation month doesn't
 * match what the due event expects (e.g. PBS already posted M+2 but the event
 * is for M+1).
 */
export async function syncLsmYoYFromPbs(): Promise<SyncResult> {
  const fetchStart = new Date();
  const entryMs = fetchStart.getTime();
  try {
    const pubMeta = SERIES_PUBLICATION_META[SERIES_SLUG];
    if (!pubMeta?.periodValidation) {
      return {
        seriesSlug: SERIES_SLUG,
        status: "skipped-not-configured",
        detail: `No period-validation config for ${SERIES_SLUG}. Check seriesPublicationConfig.ts.`,
        durationMs: Date.now() - entryMs,
      };
    }

    let pbsResult: LsmPbsResult;
    try {
      pbsResult = await fetchLsmFromPbsWordPress();
    } catch (fetchErr) {
      void recordSourceAttempt(
        {
          success: false,
          sourceName: "PBS LSM WordPress Release",
          sourceType: "pbs-web",
          isFallback: false,
          error: fetchErr instanceof Error ? fetchErr.message : String(fetchErr),
        },
        SERIES_SLUG,
        fetchStart,
        "pbs-lsm-sync",
      );
      return {
        seriesSlug: SERIES_SLUG,
        status: "error",
        detail: `PBS fetch failed: ${fetchErr instanceof Error ? fetchErr.message : String(fetchErr)}`,
        durationMs: Date.now() - entryMs,
      };
    }

    void recordSourceAttempt(
      {
        success: true,
        observationDate: pbsResult.obsDate,
        sourceName: "PBS LSM WordPress Release",
        sourceType: "pbs-web",
        isFallback: false,
      },
      SERIES_SLUG,
      fetchStart,
      "pbs-lsm-sync",
    );

    // Find the due event
    const supabase = createPublicDataClient();
    const workerSecret = process.env.NOTIFICATION_WORKER_SECRET ?? "";
    const today = new Date().toISOString().slice(0, 10);
    const { data: dueEvents } = await supabase
      .from("economic_events")
      .select("event_date, economic_event_series!inner(slug)")
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
        detail: `No scheduled LSM event is due yet (today=${today}, PBS obs=${pbsResult.obsDate}).`,
        durationMs: Date.now() - entryMs,
        observationPeriod: pbsResult.obsDate,
      };
    }

    const periodCheck = validateObservationPeriod(
      pbsResult.obsDate,
      dueEvent.event_date,
      pubMeta.periodValidation,
    );
    if (!periodCheck.valid) {
      return {
        seriesSlug: SERIES_SLUG,
        status: "skipped-period-mismatch",
        detail:
          `${periodCheck.reason} ` +
          `(PBS obs=${pbsResult.obsDate}, event=${dueEvent.event_date})`,
        durationMs: Date.now() - entryMs,
        observationPeriod: pbsResult.obsDate,
        dueEventDate: dueEvent.event_date,
      };
    }

    const sign = pbsResult.yoyPct >= 0 ? "+" : "";
    const actualValue = `${sign}${pbsResult.yoyPct.toFixed(1)}% YoY`;

    const { data: didUpdate, error } = await supabase.rpc("sync_event_actual", {
      p_internal_secret: workerSecret,
      p_series_slug: SERIES_SLUG,
      p_event_date: dueEvent.event_date,
      p_actual_value: actualValue,
      p_observation_date: pbsResult.obsDate,
    });

    if (error) {
      return { seriesSlug: SERIES_SLUG, status: "error", detail: error.message, durationMs: Date.now() - entryMs };
    }

    const provenance: SyncProvenance = {
      sourceName: "PBS LSM Monthly Release (WordPress)",
      sourceType: "pbs-web",
      observationPeriod: periodCheck.expectedPeriod ?? pbsResult.obsDate,
      observationDate: pbsResult.obsDate,
      syncTimestamp: new Date().toISOString(),
      dataConfidence: "confirmed",
    };

    let nextEventDate: string | undefined;
    if (didUpdate) {
      const { data: nextEvt } = await supabase
        .from("economic_events")
        .select("event_date, economic_event_series!inner(slug)")
        .eq("economic_event_series.slug", SERIES_SLUG)
        .eq("status", "scheduled")
        .gt("event_date", dueEvent.event_date)
        .order("event_date", { ascending: true })
        .limit(1);
      nextEventDate = (nextEvt?.[0] as { event_date?: string } | undefined)?.event_date;
    }

    return didUpdate
      ? {
          seriesSlug: SERIES_SLUG,
          status: "synced",
          detail: `YoY=${actualValue} | obs=${pbsResult.obsDate} | postDate=${pbsResult.postDate} | event=${dueEvent.event_date}`,
          provenance,
          durationMs: Date.now() - entryMs,
          observationPeriod: periodCheck.expectedPeriod ?? pbsResult.obsDate,
          dueEventDate: dueEvent.event_date,
          nextEventDate,
        }
      : {
          seriesSlug: SERIES_SLUG,
          status: "skipped-no-due-event",
          detail: "LSM event already released or not found at call time.",
          durationMs: Date.now() - entryMs,
          dueEventDate: dueEvent.event_date,
        };
  } catch (err) {
    return {
      seriesSlug: SERIES_SLUG,
      status: "error",
      detail: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - entryMs,
    };
  }
}
