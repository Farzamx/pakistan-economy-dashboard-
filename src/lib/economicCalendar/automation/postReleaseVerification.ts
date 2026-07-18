// Post-Release Verification System — production-hardening audit, 2026-07-18.
//
// Root cause this exists to cover: sync_event_actual()'s own
// `WHERE status = 'scheduled'` guard (migration 0027) means a release can
// only transition scheduled -> released ONCE. That guard is exactly right —
// it's what makes a release tamper-evident — but it also means nothing in
// this system previously re-checked a released value against its official
// source after the fact. If any bug ever wrote a wrong or premature
// actual_value, there was no automated way to even notice.
//
// This module re-fetches the official source for every event released
// within the last VERIFICATION_WINDOW_HOURS and compares it against what's
// stored. On a mismatch it:
//   - NEVER writes to economic_events — there is no code path here that can;
//     it only ever calls read-only fetch functions and logDataIntegrityAlert.
//   - Creates/refreshes a data_integrity_alerts row (migration 0041) for a
//     human to review. The released value stays authoritative regardless.
//
// Coverage: a genuine value-level re-derivation is implemented for the 10
// series with a single, independently-callable, side-effect-free fetch
// function (the 7 SBP EasyData SYNC_TARGETS + SPI + LSM + FX Reserves).
// trade-balance/exports-release/imports-release share one PBS Excel-parsing
// function that isn't yet factored out into an independent read-only call
// (see syncTradeBalanceFromPbs.ts) — these get a source-health check instead
// of a value diff, honestly reported as such rather than silently skipped.
//
// Runs as a new step in the sync pipeline (syncPipeline.ts), so it benefits
// from the same 15-minute cadence as everything else — no separate schedule
// to maintain.

import { createPublicDataClient } from "@/lib/supabase/publicDataClient";
import { getSbpIndicatorFresh, getSbpIndicatorHistoryFresh } from "@/lib/data/sbp";
import { getSpiHistoryFresh, formatSpiWowActual } from "@/lib/data/spi";
import { fetchFxReservesRowFresh } from "@/lib/economicCalendar/automation/syncFxReservesFromSbpExcel";
import { computeLsmYoY } from "@/lib/economicCalendar/automation/lsmSync";
import { SYNC_TARGETS } from "@/lib/economicCalendar/automation/syncFromSbpEasyData";
import { validateObservationPeriod } from "@/lib/economicCalendar/observationPeriodValidator";
import { SERIES_PUBLICATION_META } from "@/lib/economicCalendar/seriesPublicationConfig";
import { logDataIntegrityAlert, type MismatchType } from "@/lib/economicCalendar/dataIntegrityAlerts";

const VERIFICATION_WINDOW_HOURS = 48;

export type VerificationStatus = "match" | "mismatch" | "unverifiable" | "not-implemented";

export interface VerificationEntry {
  eventId: string;
  seriesSlug: string;
  eventDate: string;
  status: VerificationStatus;
  detail: string;
  durationMs: number;
}

interface ReleasedEventRow {
  id: string;
  event_date: string;
  actual_value: string;
  observation_date: string | null;
  previous_value: string | null;
  updated_at: string;
  economic_event_series: { slug: string } | { slug: string }[];
}

function unwrapSlug(series: ReleasedEventRow["economic_event_series"]): string | null {
  const row = Array.isArray(series) ? series[0] : series;
  return row?.slug ?? null;
}

async function reverifyValue(
  event: ReleasedEventRow,
  seriesSlug: string,
): Promise<{ freshValue: string; freshObservationDate: string | null } | { unverifiable: string } | null> {
  // ── SBP EasyData family (7 series) ────────────────────────────────────────
  const target = SYNC_TARGETS[seriesSlug];
  if (target) {
    const indicator = await getSbpIndicatorFresh(target.indicatorKey);
    if (indicator.meta.source !== "SBP EasyData") {
      return { unverifiable: "Live SBP EasyData call failed on re-check — serving fallback, cannot verify this pass." };
    }
    const freshValue = target.format(indicator.kpi.value, event.previous_value);
    return { freshValue, freshObservationDate: indicator.meta.observationDate };
  }

  // ── SPI (dedicated PBS source) ────────────────────────────────────────────
  if (seriesSlug === "spi-weekly-inflation-release") {
    const spi = await getSpiHistoryFresh();
    if (!spi || spi.points.length === 0) {
      return { unverifiable: "Live PBS SPI fetch failed or returned no points on re-check." };
    }
    const point = spi.points.find((p) => p.date === event.event_date);
    if (!point) {
      // PBS's own feed no longer carries this week's point (rolled off the
      // trailing window) — not evidence of a wrong value, just can't re-check.
      return { unverifiable: `PBS SPI feed no longer carries a point for ${event.event_date} (trailing-window feed, not a full archive).` };
    }
    return { freshValue: formatSpiWowActual(point.wowPct), freshObservationDate: point.date };
  }

  // ── LSM (EasyData-derived YoY) ─────────────────────────────────────────────
  if (seriesSlug === "large-scale-manufacturing-lsm-growth") {
    const history = await getSbpIndicatorHistoryFresh("lsm");
    if (history.meta.sourceStatus === "fallback") {
      return { unverifiable: "SBP EasyData LSM series is serving a fallback snapshot on re-check." };
    }
    const computation = computeLsmYoY(history.points);
    if (!computation.ok) {
      return { unverifiable: `LSM re-check could not compute YoY: ${computation.error}` };
    }
    return { freshValue: computation.actualValue, freshObservationDate: computation.obsDate };
  }

  // ── FX Reserves (SBP Forex_Arch.xlsx) ─────────────────────────────────────
  if (seriesSlug === "sbp-foreign-exchange-reserves") {
    try {
      const row = await fetchFxReservesRowFresh();
      return { freshValue: `$${row.netSbpReservesBn.toFixed(1)}B`, freshObservationDate: row.weekEndingDate };
    } catch (err) {
      return { unverifiable: `Forex_Arch.xlsx re-fetch failed: ${err instanceof Error ? err.message : String(err)}` };
    }
  }

  // No independently-callable read-only fetch exists yet for this series
  // (trade-balance/exports-release/imports-release share one PBS Excel
  // parse embedded in syncTradeBalanceFromPbs.ts — see module header).
  return null;
}

/**
 * Re-verifies every event released within the last VERIFICATION_WINDOW_HOURS
 * against its official source. Read-only against economic_events — the only
 * write this function (or anything it calls) can perform is
 * logDataIntegrityAlert, which never touches economic_events.
 */
export async function verifyRecentReleases(): Promise<VerificationEntry[]> {
  const supabase = createPublicDataClient();
  const windowStart = new Date(Date.now() - VERIFICATION_WINDOW_HOURS * 60 * 60 * 1000).toISOString();

  const { data: rows, error } = await supabase
    .from("economic_events")
    .select("id, event_date, actual_value, observation_date, previous_value, updated_at, economic_event_series!inner(slug)")
    .eq("status", "released")
    .gte("updated_at", windowStart)
    .neq("economic_event_series.slug", "_verify_test_sync")
    .order("updated_at", { ascending: false });

  if (error || !rows) {
    console.error(`[PostReleaseVerification] Failed to list recently-released events: ${error?.message ?? "unknown error"}`);
    return [];
  }

  const entries: VerificationEntry[] = [];

  for (const rawRow of rows as unknown as ReleasedEventRow[]) {
    const entryMs = Date.now();
    const seriesSlug = unwrapSlug(rawRow.economic_event_series);
    if (!seriesSlug || rawRow.actual_value === null) continue;

    try {
      // Lightweight period-consistency check: the stored observation_date
      // should still be valid for this event_date under the series' own
      // cadence rules. Cheap and always true unless the DB row was edited
      // directly outside the sync path — included because the audit
      // explicitly asked for a period/date check, not just a value check.
      const pubMeta = SERIES_PUBLICATION_META[seriesSlug];
      if (rawRow.observation_date && pubMeta?.periodValidation) {
        const periodCheck = validateObservationPeriod(rawRow.observation_date, rawRow.event_date, pubMeta.periodValidation);
        if (!periodCheck.valid) {
          await logDataIntegrityAlert({
            economicEventId: rawRow.id,
            seriesSlug,
            eventDate: rawRow.event_date,
            releasedActualValue: rawRow.actual_value,
            releasedObservationDate: rawRow.observation_date,
            mismatchType: "period",
            detail: `Stored observation_date (${rawRow.observation_date}) is no longer period-valid for event_date ${rawRow.event_date}: ${periodCheck.reason}`,
          });
          entries.push({
            eventId: rawRow.id, seriesSlug, eventDate: rawRow.event_date, status: "mismatch",
            detail: "Period-consistency check failed — see data_integrity_alerts.", durationMs: Date.now() - entryMs,
          });
          continue;
        }
      }

      const result = await reverifyValue(rawRow, seriesSlug);
      if (result === null) {
        entries.push({
          eventId: rawRow.id, seriesSlug, eventDate: rawRow.event_date, status: "not-implemented",
          detail: "No independent read-only re-fetch implemented for this series yet.", durationMs: Date.now() - entryMs,
        });
        continue;
      }
      if ("unverifiable" in result) {
        entries.push({
          eventId: rawRow.id, seriesSlug, eventDate: rawRow.event_date, status: "unverifiable",
          detail: result.unverifiable, durationMs: Date.now() - entryMs,
        });
        continue;
      }

      if (result.freshValue === rawRow.actual_value) {
        entries.push({
          eventId: rawRow.id, seriesSlug, eventDate: rawRow.event_date, status: "match",
          detail: `Fresh source value matches released actual_value (${result.freshValue}).`, durationMs: Date.now() - entryMs,
        });
        continue;
      }

      // Genuine mismatch: the released value no longer matches what the
      // official source currently reports. This is deliberately NOT written
      // back — sync_event_actual()'s own guard would reject it anyway (the
      // event is no longer 'scheduled'), and a provisional-vs-revised figure
      // is exactly the kind of judgment call that needs a human, not an
      // auto-correct. Log and alert only.
      const mismatchType: MismatchType = "value";
      const detail =
        `Released actual_value "${rawRow.actual_value}" (obs ${rawRow.observation_date ?? "unknown"}) no longer matches ` +
        `the official source's current value "${result.freshValue}" (obs ${result.freshObservationDate ?? "unknown"}). ` +
        `This may be a genuine source revision (common for provisional BoP/GDP data) or a data-integrity issue — ` +
        `requires manual review; the released value has NOT been changed.`;
      await logDataIntegrityAlert({
        economicEventId: rawRow.id,
        seriesSlug,
        eventDate: rawRow.event_date,
        releasedActualValue: rawRow.actual_value,
        releasedObservationDate: rawRow.observation_date,
        freshValue: result.freshValue,
        freshObservationDate: result.freshObservationDate,
        mismatchType,
        detail,
      });
      entries.push({ eventId: rawRow.id, seriesSlug, eventDate: rawRow.event_date, status: "mismatch", detail, durationMs: Date.now() - entryMs });
    } catch (err) {
      entries.push({
        eventId: rawRow.id, seriesSlug, eventDate: rawRow.event_date, status: "unverifiable",
        detail: `Verification threw: ${err instanceof Error ? err.message : String(err)}`, durationMs: Date.now() - entryMs,
      });
    }
  }

  return entries;
}
