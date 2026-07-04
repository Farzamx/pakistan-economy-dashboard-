import { NextResponse } from "next/server";
import { createPublicDataClient } from "@/lib/supabase/publicDataClient";
import { getSourceHealthSummary } from "@/lib/economicCalendar/sourceHealthTracker";

// Production health check — Phase 13.2
//
// Scans the database for known failure patterns across all automated series
// and returns a health score + issue list. No DB writes.
//
// Auth: same CRON_SECRET bearer token used by the cron endpoint.
// Usage: GET /api/admin/health

export const dynamic = "force-dynamic";

const AUTOMATED_SLUGS = [
  "spi-weekly-inflation-release",
  "cpi-inflation-release",
  "core-inflation-release",
  "large-scale-manufacturing-lsm-growth",
  "trade-balance",
  "exports-release",
  "imports-release",
  "sbp-foreign-exchange-reserves",
  "worker-remittances",
  "current-account-balance",
  "treasury-bill-auction-3m",
  "pib-auction",
  "sbp-monetary-policy-committee-meeting",
];

// Maximum days a monthly series can go without a release before flagging overdue
const MONTHLY_OVERDUE_DAYS = 45;
// Maximum days a weekly series can go without a release
const WEEKLY_OVERDUE_DAYS  = 14;
// Maximum days an as-needed series can go without a release (auctions/MPC)
const AS_NEEDED_OVERDUE_DAYS = 90;

interface HealthIssue {
  severity: "critical" | "warning" | "info";
  series:   string;
  type:     string;
  detail:   string;
}

interface SeriesHealth {
  series:         string;
  status:         "healthy" | "warning" | "critical" | "unknown";
  lastReleasedDate:   string | null;
  lastActualValue:    string | null;
  nextScheduledDate:  string | null;
  daysOverdue:        number | null;
  issues:         string[];
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const startMs = Date.now();
  const today = new Date().toISOString().slice(0, 10);
  const db = createPublicDataClient();
  const issues: HealthIssue[] = [];
  const seriesHealthList: SeriesHealth[] = [];

  // ── Resolve series IDs ────────────────────────────────────────────────────────
  const { data: seriesRows } = await db
    .from("economic_event_series")
    .select("id, slug, title, cadence, automation_tier")
    .in("slug", AUTOMATED_SLUGS);

  const seriesMap = new Map((seriesRows ?? []).map((s) => [s.slug, s]));

  // ── Per-series checks ─────────────────────────────────────────────────────────
  for (const slug of AUTOMATED_SLUGS) {
    const series = seriesMap.get(slug);
    const seriesIssues: string[] = [];
    let seriesStatus: SeriesHealth["status"] = "healthy";

    // Last released event
    const { data: relRows } = await db
      .from("economic_events")
      .select("event_date, status, actual_value, observation_date, slug")
      .eq("series_id", series?.id ?? "")
      .eq("status", "released")
      .order("event_date", { ascending: false })
      .limit(1);
    const lastRel = relRows?.[0] ?? null;

    // Next scheduled event
    const { data: nextRows } = await db
      .from("economic_events")
      .select("event_date, slug")
      .eq("series_id", series?.id ?? "")
      .eq("status", "scheduled")
      .gt("event_date", today)
      .order("event_date", { ascending: true })
      .limit(1);
    const nextSched = nextRows?.[0] ?? null;

    // Due (past-due scheduled) event
    const { data: dueRows } = await db
      .from("economic_events")
      .select("event_date, slug, actual_value, observation_date")
      .eq("series_id", series?.id ?? "")
      .eq("status", "scheduled")
      .lte("event_date", today)
      .order("event_date", { ascending: false })
      .limit(1);
    const dueEvent = dueRows?.[0] ?? null;

    // ── Check: released events without actual_value ─────────────────────────
    const { data: noActual } = await db
      .from("economic_events")
      .select("slug, event_date")
      .eq("series_id", series?.id ?? "")
      .eq("status", "released")
      .is("actual_value", null)
      .limit(3);
    if (noActual && noActual.length > 0) {
      const affected = noActual.map((e) => e.event_date).join(", ");
      issues.push({ severity: "critical", series: slug, type: "released-missing-actual", detail: `Released event(s) have NULL actual_value: ${affected}` });
      seriesIssues.push(`Released with NULL actual_value: ${affected}`);
      seriesStatus = "critical";
    }

    // ── Check: released events without observation_date ─────────────────────
    const { data: noObsDate } = await db
      .from("economic_events")
      .select("slug, event_date")
      .eq("series_id", series?.id ?? "")
      .eq("status", "released")
      .is("observation_date", null)
      .not("actual_value", "is", null)
      .limit(3);
    if (noObsDate && noObsDate.length > 0) {
      const affected = noObsDate.map((e) => e.event_date).join(", ");
      issues.push({ severity: "warning", series: slug, type: "released-missing-obs-date", detail: `Released event(s) have NULL observation_date: ${affected}` });
      seriesIssues.push(`Released with NULL observation_date: ${affected}`);
      if (seriesStatus === "healthy") seriesStatus = "warning";
    }

    // ── Check: no future scheduled event (broken recurrence chain) ──────────
    if (!nextSched) {
      issues.push({ severity: "critical", series: slug, type: "broken-recurrence-chain", detail: `No future scheduled event exists — generate_next_occurrence() may not have run after the last release` });
      seriesIssues.push("No future scheduled event — recurrence chain broken");
      seriesStatus = "critical";
    }

    // ── Check: due event stuck too long (overdue) ────────────────────────────
    let daysOverdue: number | null = null;
    if (dueEvent) {
      const dueMs = new Date(today + "T00:00:00Z").getTime() - new Date(dueEvent.event_date + "T00:00:00Z").getTime();
      daysOverdue = Math.floor(dueMs / 86400000);
      const cadence = series?.cadence ?? "monthly";
      const threshold = cadence === "weekly" ? WEEKLY_OVERDUE_DAYS : cadence === "as-needed" ? AS_NEEDED_OVERDUE_DAYS : MONTHLY_OVERDUE_DAYS;

      if (daysOverdue > threshold) {
        issues.push({ severity: "critical", series: slug, type: "overdue-scheduled-event", detail: `Event ${dueEvent.event_date} has been scheduled and past-due for ${daysOverdue} days (threshold: ${threshold})` });
        seriesIssues.push(`Overdue by ${daysOverdue} days`);
        seriesStatus = "critical";
      } else if (daysOverdue > 2) {
        issues.push({ severity: "warning", series: slug, type: "past-due-event", detail: `Event ${dueEvent.event_date} is ${daysOverdue} day(s) past due — sync may be pending or period validation may be blocking release` });
        seriesIssues.push(`Past-due ${daysOverdue} day(s): ${dueEvent.event_date}`);
        if (seriesStatus === "healthy") seriesStatus = "warning";
      }
    }

    // ── Check: duplicate future scheduled events ─────────────────────────────
    const { data: futureSched } = await db
      .from("economic_events")
      .select("event_date, slug")
      .eq("series_id", series?.id ?? "")
      .eq("status", "scheduled")
      .gt("event_date", today)
      .order("event_date", { ascending: true })
      .limit(10);

    if (futureSched && futureSched.length > 1) {
      const dates = futureSched.map((e) => e.event_date);
      const dupes = dates.filter((d, i) => dates.indexOf(d) !== i);
      if (dupes.length > 0) {
        issues.push({ severity: "critical", series: slug, type: "duplicate-scheduled-events", detail: `Duplicate event_date(s) in scheduled state: ${dupes.join(", ")}` });
        seriesIssues.push(`Duplicate scheduled dates: ${dupes.join(", ")}`);
        seriesStatus = "critical";
      }
    }

    seriesHealthList.push({
      series: slug,
      status: seriesStatus,
      lastReleasedDate:  lastRel?.event_date ?? null,
      lastActualValue:   lastRel?.actual_value ?? null,
      nextScheduledDate: nextSched?.event_date ?? null,
      daysOverdue:       daysOverdue !== null && daysOverdue > 0 ? daysOverdue : null,
      issues: seriesIssues,
    });
  }

  // ── Source health checks ──────────────────────────────────────────────────────
  const sourceHealth = await getSourceHealthSummary(48);
  for (const h of sourceHealth) {
    if (h.consecutiveFailures >= 3) {
      issues.push({
        severity: "critical",
        series: h.seriesSlug,
        type: "source-consecutive-failures",
        detail: `${h.sourceName} has failed ${h.consecutiveFailures} consecutive times. Last error: ${h.lastError ?? "unknown"}`,
      });
    } else if (h.consecutiveFailures >= 1) {
      issues.push({
        severity: "warning",
        series: h.seriesSlug,
        type: "source-failure",
        detail: `${h.sourceName} failed on last attempt. Error: ${h.lastError ?? "unknown"}`,
      });
    }
  }

  // ── Health score ──────────────────────────────────────────────────────────────
  const criticalCount = issues.filter((i) => i.severity === "critical").length;
  const warningCount  = issues.filter((i) => i.severity === "warning").length;
  const maxScore = 100;
  const score = Math.max(0, maxScore - (criticalCount * 15) - (warningCount * 5));

  const overallStatus = criticalCount > 0 ? "CRITICAL" : warningCount > 0 ? "WARNING" : "HEALTHY";

  return NextResponse.json({
    checkedAt:   new Date().toISOString(),
    today,
    durationMs:  Date.now() - startMs,
    overallStatus,
    healthScore: score,
    totalSeries: AUTOMATED_SLUGS.length,
    criticalIssues: criticalCount,
    warningIssues:  warningCount,
    issues: issues.sort((a, b) => {
      const sev = { critical: 0, warning: 1, info: 2 };
      return sev[a.severity] - sev[b.severity];
    }),
    series: seriesHealthList,
    sourceHealth: sourceHealth.map((h) => ({
      seriesSlug:         h.seriesSlug,
      sourceName:         h.sourceName,
      lastAttemptedAt:    h.lastAttemptedAt,
      lastSucceededAt:    h.lastSucceededAt,
      latestObservation:  h.lastObservationDate,
      consecutiveFailures: h.consecutiveFailures,
      successRatePct:     h.successRatePct,
      lastError:          h.lastError,
    })),
  });
}
