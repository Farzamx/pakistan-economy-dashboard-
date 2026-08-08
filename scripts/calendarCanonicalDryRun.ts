// Calendar Canonical-DB Migration — Dry Run (Phase 6A.1, Step 5)
//
// Answers, with ZERO writes: "if the calendar sync read canonical_observations
// instead of calling SBP EasyData live, what would happen to every currently
// due-and-scheduled event?" Mirrors syncAllFromSbpEasyData()'s and
// syncLsmYoYFromEasyData()'s exact matching/validation logic (imports the
// same SYNC_TARGETS, SERIES_PUBLICATION_META, validateObservationPeriod,
// computeLsmYoY — no parallel implementation to drift out of sync), but never
// calls sync_event_actual. Read-only against economic_events.
//
// Usage: npx tsx scripts/calendarCanonicalDryRun.ts

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { getSbpIndicator, getSbpIndicatorHistory } from "@/lib/data/sbp";
import { SYNC_TARGETS } from "@/lib/economicCalendar/automation/syncFromSbpEasyData";
import { validateObservationPeriod } from "@/lib/economicCalendar/observationPeriodValidator";
import { SERIES_PUBLICATION_META } from "@/lib/economicCalendar/seriesPublicationConfig";
import { findSamePeriodPriorYear } from "@/lib/yoyMath";

// computeLsmYoY is normally imported from lsmSync.ts, but that module
// transitively imports canonicalObservation.ts, which imports the
// Next.js-internal "server-only" specifier — not a real installed
// package, so it cannot resolve outside Next's own build/dev server, only
// tsx running this script directly. This is a byte-for-byte copy of
// lsmSync.ts's computeLsmYoY() for THIS read-only dry-run script only —
// the real production code path (lsmSync.ts) is untouched and remains the
// single source of truth; if that formula ever changes, update both.
interface LsmYoyPoint { date: string; value: number }
type LsmYoyComputation =
  | { ok: true; actualValue: string; obsDate: string; currentValue: number; priorYearDate: string; priorYearValue: number }
  | { ok: false; error: string };
function computeLsmYoY(points: readonly LsmYoyPoint[]): LsmYoyComputation {
  if (points.length < 13) return { ok: false, error: `LSM history too short for YoY computation (${points.length} points, need >= 13).` };
  const latest = points[points.length - 1];
  const obsDate = latest.date;
  const priorYearPoint = findSamePeriodPriorYear(points, obsDate);
  if (!priorYearPoint) return { ok: false, error: `No prior-year LSM observation found for ${obsDate}.` };
  if (priorYearPoint.value === 0) return { ok: false, error: `Prior-year LSM index is zero for ${priorYearPoint.date}.` };
  const yoyPct = ((latest.value / priorYearPoint.value) - 1) * 100;
  const sign = yoyPct >= 0 ? "+" : "";
  return { ok: true, actualValue: `${sign}${yoyPct.toFixed(1)}% YoY`, obsDate, currentValue: latest.value, priorYearDate: priorYearPoint.date, priorYearValue: priorYearPoint.value };
}

interface DryRunEntry {
  seriesSlug: string;
  dueEventDate: string | null;
  existingActualValue: string | null;
  canonicalObsDate: string | null;
  canonicalValue: string | null;
  periodValid: boolean | null;
  wouldRelease: boolean;
  wouldNotify: boolean;
  detail: string;
}

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

async function findDueEvent(supabase: ReturnType<typeof getSupabase>, seriesSlug: string) {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("economic_events")
    .select("event_date, previous_value, actual_value, status, economic_event_series!inner(slug)")
    .eq("economic_event_series.slug", seriesSlug)
    .eq("status", "scheduled")
    .lte("event_date", today)
    .order("event_date", { ascending: false })
    .limit(1);
  return data?.[0] as { event_date: string; previous_value: string | null; actual_value: string | null } | undefined;
}

async function dryRunSyncTarget(supabase: ReturnType<typeof getSupabase>, seriesSlug: string): Promise<DryRunEntry> {
  const pubMeta = SERIES_PUBLICATION_META[seriesSlug];
  const target = SYNC_TARGETS[seriesSlug];
  const dueEvent = await findDueEvent(supabase, seriesSlug);

  if (!dueEvent) {
    return {
      seriesSlug, dueEventDate: null, existingActualValue: null, canonicalObsDate: null, canonicalValue: null,
      periodValid: null, wouldRelease: false, wouldNotify: false,
      detail: "No scheduled event is currently due — nothing to reconcile.",
    };
  }

  const indicator = await getSbpIndicator(target.indicatorKey);
  const isFallback = indicator.meta.source !== "SBP EasyData";
  if (isFallback) {
    return {
      seriesSlug, dueEventDate: dueEvent.event_date, existingActualValue: dueEvent.actual_value,
      canonicalObsDate: null, canonicalValue: null, periodValid: null, wouldRelease: false, wouldNotify: false,
      detail: "Canonical DB has no ingested observation for this indicator yet — would skip (skipped-fallback-data), same as today.",
    };
  }

  if (!pubMeta?.periodValidation) {
    return {
      seriesSlug, dueEventDate: dueEvent.event_date, existingActualValue: dueEvent.actual_value,
      canonicalObsDate: indicator.meta.observationDate, canonicalValue: String(indicator.kpi.value),
      periodValid: null, wouldRelease: false, wouldNotify: false,
      detail: "Not configured for automation (skipped-not-configured) — unaffected by this migration either way.",
    };
  }

  const periodCheck = validateObservationPeriod(indicator.meta.observationDate, dueEvent.event_date, pubMeta.periodValidation);
  return {
    seriesSlug,
    dueEventDate: dueEvent.event_date,
    existingActualValue: dueEvent.actual_value,
    canonicalObsDate: indicator.meta.observationDate,
    canonicalValue: String(indicator.kpi.value),
    periodValid: periodCheck.valid,
    wouldRelease: periodCheck.valid,
    wouldNotify: periodCheck.valid, // release always fires trg_create_notification_job
    detail: periodCheck.reason,
  };
}

async function dryRunLsm(supabase: ReturnType<typeof getSupabase>): Promise<DryRunEntry> {
  const seriesSlug = "large-scale-manufacturing-lsm-growth";
  const pubMeta = SERIES_PUBLICATION_META[seriesSlug];
  const dueEvent = await findDueEvent(supabase, seriesSlug);

  if (!dueEvent) {
    return {
      seriesSlug, dueEventDate: null, existingActualValue: null, canonicalObsDate: null, canonicalValue: null,
      periodValid: null, wouldRelease: false, wouldNotify: false,
      detail: "No scheduled LSM event is currently due — nothing to reconcile.",
    };
  }

  const history = await getSbpIndicatorHistory("lsm");
  if (history.meta.sourceStatus === "fallback") {
    return {
      seriesSlug, dueEventDate: dueEvent.event_date, existingActualValue: dueEvent.actual_value,
      canonicalObsDate: null, canonicalValue: null, periodValid: null, wouldRelease: false, wouldNotify: false,
      detail: "Canonical DB has no ingested LSM history yet — would skip, same as today.",
    };
  }

  const computation = computeLsmYoY(history.points);
  if (!computation.ok) {
    return {
      seriesSlug, dueEventDate: dueEvent.event_date, existingActualValue: dueEvent.actual_value,
      canonicalObsDate: null, canonicalValue: null, periodValid: null, wouldRelease: false, wouldNotify: false,
      detail: `YoY computation would fail: ${computation.error}`,
    };
  }

  const periodCheck = validateObservationPeriod(computation.obsDate, dueEvent.event_date, pubMeta!.periodValidation!);
  return {
    seriesSlug,
    dueEventDate: dueEvent.event_date,
    existingActualValue: dueEvent.actual_value,
    canonicalObsDate: computation.obsDate,
    canonicalValue: computation.actualValue,
    periodValid: periodCheck.valid,
    wouldRelease: periodCheck.valid,
    wouldNotify: periodCheck.valid,
    detail: periodCheck.reason,
  };
}

async function main() {
  const supabase = getSupabase();
  const entries: DryRunEntry[] = [];

  for (const seriesSlug of Object.keys(SYNC_TARGETS)) {
    entries.push(await dryRunSyncTarget(supabase, seriesSlug));
  }
  entries.push(await dryRunLsm(supabase));

  console.log("=== Calendar Canonical-DB Migration Dry Run ===\n");
  for (const e of entries) {
    console.log(`--- ${e.seriesSlug} ---`);
    console.log(`  due event:        ${e.dueEventDate ?? "(none currently due)"}`);
    console.log(`  existing actual:  ${e.existingActualValue ?? "(null — still scheduled)"}`);
    console.log(`  canonical obsDate:${e.canonicalObsDate ?? "n/a"}`);
    console.log(`  canonical value:  ${e.canonicalValue ?? "n/a"}`);
    console.log(`  period valid:     ${e.periodValid === null ? "n/a" : e.periodValid}`);
    console.log(`  WOULD RELEASE:    ${e.wouldRelease}`);
    console.log(`  WOULD NOTIFY:     ${e.wouldNotify}`);
    console.log(`  detail: ${e.detail}`);
    console.log("");
  }

  const wouldNotifyCount = entries.filter((e) => e.wouldNotify).length;
  console.log(`=== Summary: ${wouldNotifyCount} of ${entries.length} series would release + notify on the first canonical-DB sync run ===`);
  if (wouldNotifyCount > 0) {
    console.log("Series that would notify:", entries.filter((e) => e.wouldNotify).map((e) => e.seriesSlug).join(", "));
  }
}

main().catch((err) => {
  console.error("ERROR:", err);
  process.exitCode = 1;
});
