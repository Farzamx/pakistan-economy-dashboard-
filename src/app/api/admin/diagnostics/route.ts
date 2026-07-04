import { NextResponse } from "next/server";
import { createPublicDataClient } from "@/lib/supabase/publicDataClient";
import { getSourceHealthSummary } from "@/lib/economicCalendar/sourceHealthTracker";
import { getSpiHistoryFresh } from "@/lib/data/spi";
import { SERIES_PUBLICATION_META } from "@/lib/economicCalendar/seriesPublicationConfig";
import { validateObservationPeriod } from "@/lib/economicCalendar/observationPeriodValidator";

// Generic production diagnostics — Phase 13.2
//
// Inspects the complete sync pipeline state for any automated series without
// writing to the database. Returns structured JSON showing the status of every
// stage: source fetch → due event → period validation → predicted outcome →
// last released event → next scheduled event → cache status.
//
// Auth: same CRON_SECRET bearer token used by the cron endpoint.
// Usage: GET /api/admin/diagnostics?series=<slug>

export const dynamic = "force-dynamic";

const SERIES_LABELS: Record<string, { label: string; officialSource: string }> = {
  "spi-weekly-inflation-release":            { label: "SPI Weekly Inflation",          officialSource: "PBS WordPress REST API + XLSX" },
  "cpi-inflation-release":                   { label: "CPI Monthly Inflation",          officialSource: "PBS Monthly Inflation Report (PDF)" },
  "core-inflation-release":                  { label: "Core Inflation (Urban NFNE)",    officialSource: "PBS Monthly Inflation Report (PDF)" },
  "large-scale-manufacturing-lsm-growth":    { label: "LSM Growth YoY",                officialSource: "PBS WordPress (primary) / SBP EasyData (fallback)" },
  "trade-balance":                           { label: "Trade Balance",                  officialSource: "PBS Foreign Trade Statistics (Excel)" },
  "exports-release":                         { label: "Exports",                        officialSource: "PBS Foreign Trade Statistics (Excel)" },
  "imports-release":                         { label: "Imports",                        officialSource: "PBS Foreign Trade Statistics (Excel)" },
  "sbp-foreign-exchange-reserves":           { label: "FX Reserves",                   officialSource: "SBP Forex_Arch.xlsx (weekly)" },
  "worker-remittances":                      { label: "Worker Remittances",             officialSource: "SBP EasyData" },
  "current-account-balance":                 { label: "Current Account Balance",        officialSource: "SBP EasyData" },
  "treasury-bill-auction-3m":                { label: "T-Bill 3-Month Auction",         officialSource: "SBP EasyData" },
  "pib-auction":                             { label: "PIB Auction",                    officialSource: "SBP EasyData" },
  "sbp-monetary-policy-committee-meeting":   { label: "SBP Monetary Policy Rate",       officialSource: "SBP EasyData" },
};

const SUPPORTED_SLUGS = Object.keys(SERIES_LABELS);

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("series");

  if (!slug) {
    return NextResponse.json({
      error: "Missing ?series=<slug> query parameter.",
      supported: SUPPORTED_SLUGS,
    }, { status: 400 });
  }

  if (!SERIES_LABELS[slug]) {
    return NextResponse.json({
      error: `Unknown series: "${slug}". See the 'supported' list.`,
      supported: SUPPORTED_SLUGS,
    }, { status: 400 });
  }

  const startMs = Date.now();
  const today = new Date().toISOString().slice(0, 10);
  const meta = SERIES_LABELS[slug];
  const pubMeta = SERIES_PUBLICATION_META[slug];
  const db = createPublicDataClient();

  // ── Stage 1: Source health from source_health_log (last 48 hours) ──────────
  const allHealth = await getSourceHealthSummary(48);
  const seriesHealthEntries = allHealth
    .filter((h) => h.seriesSlug === slug)
    .sort((a, b) => b.lastAttemptedAt.localeCompare(a.lastAttemptedAt));
  const latestHealth = seriesHealthEntries[0] ?? null;

  const stage1: Record<string, unknown> = {
    status: latestHealth
      ? latestHealth.consecutiveFailures > 0 ? "DEGRADED" : "SUCCESS"
      : "UNKNOWN",
    sourceName:             latestHealth?.sourceName ?? null,
    lastAttemptedAt:        latestHealth?.lastAttemptedAt ?? null,
    lastSucceededAt:        latestHealth?.lastSucceededAt ?? null,
    latestObservationDate:  latestHealth?.lastObservationDate ?? null,
    consecutiveFailures:    latestHealth?.consecutiveFailures ?? null,
    successRatePct:         latestHealth?.successRatePct ?? null,
    lastError:              latestHealth?.lastError ?? null,
    note: latestHealth
      ? "From source_health_log (last 48 h)"
      : "No entries in last 48 h — cron has not run recently or this series has never been synced",
  };

  // ── Stage 2: Live PBS fetch (SPI only — bypasses all caches) ───────────────
  let spiLiveLatestDate: string | null = null;
  const stage2: Record<string, unknown> = { status: "SKIPPED", note: "Live source probe only available for SPI." };

  if (slug === "spi-weekly-inflation-release") {
    try {
      const t0 = Date.now();
      const spi = await getSpiHistoryFresh();
      if (spi && spi.points.length > 0) {
        spiLiveLatestDate = spi.points.at(-1)!.date;
        stage2.status = "SUCCESS";
        stage2.latestDate = spiLiveLatestDate;
        stage2.pointCount = spi.points.length;
        stage2.allDates = spi.points.map((p) => p.date);
        stage2.durationMs = Date.now() - t0;
        stage2.note = "Live PBS WordPress + XLSX fetch (cache:no-store — bypasses L1 and L2)";
      } else {
        stage2.status = "FAILED";
        stage2.note = "getSpiHistoryFresh() returned null or zero points";
      }
    } catch (err) {
      stage2.status = "FAILED";
      stage2.note = err instanceof Error ? err.message : String(err);
    }
  }

  // ── Stage 3: Due event lookup (status=scheduled, event_date ≤ today) ───────
  const { data: dueRows } = await db
    .from("economic_events")
    .select("event_date, status, actual_value, observation_date, economic_event_series!inner(slug)")
    .eq("economic_event_series.slug", slug)
    .eq("status", "scheduled")
    .lte("event_date", today)
    .order("event_date", { ascending: false })
    .limit(1);

  const dueEvent = dueRows?.[0] ?? null;

  const stage3 = {
    status: dueEvent ? "SUCCESS" : "SKIPPED",
    found: !!dueEvent,
    eventDate: dueEvent?.event_date ?? null,
    dbStatus: dueEvent?.status ?? null,
    actualValue: dueEvent?.actual_value ?? null,
    observationDate: dueEvent?.observation_date ?? null,
    note: dueEvent
      ? `Event ${dueEvent.event_date} is scheduled and past-due — eligible for release`
      : `No scheduled event with event_date ≤ ${today} — nothing to sync today`,
  };

  // ── Stage 4: Period validation simulation ────────────────────────────────────
  const obsDateForValidation = spiLiveLatestDate ?? latestHealth?.lastObservationDate ?? null;

  let stage4: Record<string, unknown>;
  if (!dueEvent) {
    stage4 = { status: "SKIPPED", matched: null, reason: null, note: "Skipped — no due event" };
  } else if (!obsDateForValidation) {
    stage4 = { status: "SKIPPED", matched: null, reason: null, note: "Skipped — no observation date available (stage1 + stage2 both lack it)" };
  } else if (!pubMeta?.periodValidation) {
    stage4 = { status: "SKIPPED", matched: null, reason: null, note: "Series has no periodValidation config in SERIES_PUBLICATION_META" };
  } else {
    const pv = validateObservationPeriod(obsDateForValidation, dueEvent.event_date, pubMeta.periodValidation);
    stage4 = {
      status: pv.valid ? "SUCCESS" : "FAILED",
      matched: pv.valid,
      observationDate: obsDateForValidation,
      eventDate: dueEvent.event_date,
      reason: pv.reason,
      expectedPeriod: pv.expectedPeriod ?? null,
      actualPeriod: pv.actualPeriod ?? null,
      note: pv.valid
        ? "Period matches — sync_event_actual() WOULD be called on next cron run"
        : "Period mismatch — sync WOULD return skipped-period-mismatch on next cron run",
    };
  }

  // ── Stage 5: Sync outcome prediction ────────────────────────────────────────
  let predictedOutcome: string;
  let predictedReason: string;

  if (slug === "spi-weekly-inflation-release") {
    if (stage2.status === "FAILED") {
      predictedOutcome = "skipped-fallback-data";
      predictedReason = "PBS live fetch is currently failing";
    } else if (!dueEvent) {
      predictedOutcome = "skipped-no-due-event";
      predictedReason = `No scheduled event with event_date ≤ ${today}`;
    } else {
      const pbsDates = (stage2.allDates as string[] | undefined) ?? [];
      const matchFound = pbsDates.includes(dueEvent.event_date);
      predictedOutcome = matchFound ? "synced" : "skipped-period-mismatch";
      predictedReason = matchFound
        ? `PBS has a point for ${dueEvent.event_date} — sync_event_actual() would be called`
        : `PBS latest is ${stage2.latestDate ?? "unknown"}, no point for ${dueEvent.event_date}`;
    }
  } else if (!dueEvent) {
    predictedOutcome = "skipped-no-due-event";
    predictedReason = `No scheduled event with event_date ≤ ${today}`;
  } else if (stage4.status === "SUCCESS") {
    predictedOutcome = "synced";
    predictedReason = "All checks pass — sync_event_actual() WOULD be called";
  } else if (stage4.status === "FAILED") {
    predictedOutcome = "skipped-period-mismatch";
    predictedReason = String(stage4.reason ?? "Period mismatch");
  } else {
    predictedOutcome = "unknown";
    predictedReason = "Cannot determine — insufficient data (run cron to populate source_health_log)";
  }

  const stage5 = {
    predictedOutcome,
    reason: predictedReason,
    wouldCallSyncEventActual: predictedOutcome === "synced",
  };

  // ── Stage 6: Last released event ────────────────────────────────────────────
  const { data: lastReleasedRows } = await db
    .from("economic_events")
    .select("event_date, actual_value, observation_date, updated_at, economic_event_series!inner(slug)")
    .eq("economic_event_series.slug", slug)
    .eq("status", "released")
    .order("event_date", { ascending: false })
    .limit(1);

  const lastRel = lastReleasedRows?.[0] ?? null;
  const stage6 = {
    status: lastRel ? "SUCCESS" : "SKIPPED",
    eventDate:       lastRel?.event_date ?? null,
    actualValue:     lastRel?.actual_value ?? null,
    observationDate: lastRel?.observation_date ?? null,
    releasedAt:      lastRel?.updated_at ?? null,
  };

  // ── Stage 7: Next scheduled event ───────────────────────────────────────────
  const { data: nextRows } = await db
    .from("economic_events")
    .select("event_date, economic_event_series!inner(slug)")
    .eq("economic_event_series.slug", slug)
    .eq("status", "scheduled")
    .gt("event_date", today)
    .order("event_date", { ascending: true })
    .limit(1);

  const nextEvt = nextRows?.[0] ?? null;
  const stage7 = {
    status: nextEvt ? "SUCCESS" : "FAILED",
    eventDate: nextEvt?.event_date ?? null,
    daysUntil: nextEvt?.event_date
      ? Math.ceil((new Date(nextEvt.event_date + "T00:00:00Z").getTime() - new Date(today + "T00:00:00Z").getTime()) / 86400000)
      : null,
    note: nextEvt
      ? `Next release expected ${nextEvt.event_date} (${Math.ceil((new Date(nextEvt.event_date + "T00:00:00Z").getTime() - new Date(today + "T00:00:00Z").getTime()) / 86400000)} day(s) away)`
      : "ALERT: No future scheduled event — recurrence chain may be broken",
  };

  // ── Stage 8: Cache status ────────────────────────────────────────────────────
  const cadence = pubMeta?.periodValidation?.cadence;
  const stage8 = {
    l1InMemory:  "10-min TTL per serverless instance — cleared on every cold start",
    l2NextJs:    cadence === "weekly"
      ? "12h tagged cache (spi-data) — bypassed in sync path via getSpiHistoryFresh() (cache:no-store)"
      : "24h tagged cache — bypassed in sync path via no-store fetches on all PBS/SBP direct fetchers",
    canonicalObsKey: `canonical-obs:${slug}`,
    invalidatedAfterSync: "YES — invalidate() called on canonical-obs key after every successful sync_event_actual()",
    frontendCaching: "L2 cache serves page renders; sync path always bypasses it",
  };

  // ── Stage 9: Recent events ───────────────────────────────────────────────────
  const { data: recentRows } = await db
    .from("economic_events")
    .select("slug, event_date, status, actual_value, observation_date, economic_event_series!inner(slug)")
    .eq("economic_event_series.slug", slug)
    .order("event_date", { ascending: false })
    .limit(8);

  return NextResponse.json({
    series:        slug,
    label:         meta.label,
    officialSource: meta.officialSource,
    today,
    durationMs:    Date.now() - startMs,

    stage1_sourceHealth:        stage1,
    stage2_liveFetch:           stage2,
    stage3_dueEvent:            stage3,
    stage4_periodValidation:    stage4,
    stage5_predictedOutcome:    stage5,
    stage6_lastReleased:        stage6,
    stage7_nextScheduled:       stage7,
    stage8_cacheStatus:         stage8,
    stage9_recentEvents:        (recentRows ?? []).map((e) => ({
      slug: e.slug,
      event_date: e.event_date,
      status: e.status,
      actual_value: e.actual_value,
      observation_date: e.observation_date,
    })),

    meta: {
      cadence:           pubMeta?.periodValidation?.cadence ?? null,
      lagMonths:         pubMeta?.periodValidation?.lagMonths ?? null,
      maxDaysVariance:   pubMeta?.periodValidation?.maxDaysVariance ?? null,
      notificationPriority: pubMeta?.notificationPriority ?? null,
      officialSource:    pubMeta?.officialSource ?? null,
    },
  });
}
