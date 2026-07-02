import { getSbpIndicatorFresh, type SbpIndicatorKey } from "@/lib/data/sbp";
import { invalidateSbpIndicatorCache } from "@/lib/data/sbpCacheInvalidation";
import { getSpiHistory, invalidateSpiCache } from "@/lib/data/spi";
import { createPublicDataClient } from "@/lib/supabase/publicDataClient";
import { validateObservationPeriod } from "@/lib/economicCalendar/observationPeriodValidator";
import { SERIES_PUBLICATION_META } from "@/lib/economicCalendar/seriesPublicationConfig";
import { recordSourceAttempt } from "@/lib/economicCalendar/sourceHealthTracker";

// Phase 2B Priority 1 automation — syncs `actual_value` on already-scheduled
// economic_events rows from SBP EasyData, the same live, already-integrated
// data source this dashboard's homepage and indicator pages use (see
// src/lib/data/sbp.ts). Reuses that module's existing caching/fallback
// logic entirely rather than re-implementing a second SBP client.
//
// Write path: economic_events has no public INSERT/UPDATE policy (see
// 0002's RLS) and this project has no service-role key, so this calls the
// sync_event_actual(...) Postgres function — a SECURITY DEFINER function that
// can only do one narrow thing (mark a matching scheduled event released with
// an actual value). Requires NOTIFICATION_WORKER_SECRET (migration 0027
// retrofitted the check_internal_secret guard that all other write RPCs have
// had since migration 0011).
//
// Observation-period validation (Phase 1 data-integrity fix, 2026-07-01):
// every write is gated by validateObservationPeriod(), whose config is read
// from seriesPublicationConfig.ts — the SINGLE SOURCE OF TRUTH for every
// series' publication lag and cadence. If a series has no config entry (or
// config.periodValidation is undefined), the sync skips it with status
// "skipped-not-configured" rather than writing stale data. This prevents
// the SPI mis-attribution (wrote 2026-06-18 data to the 2026-06-26 slot)
// from ever affecting any SBP EasyData series.
//
// Extension path: adding a new automated indicator requires:
//   1. Add periodValidation + publicationSchedule to SERIES_PUBLICATION_META
//      in seriesPublicationConfig.ts (one config entry, no code changes).
//   2. Add the series to SYNC_TARGETS below (indicatorKey + format only).
//   No changes to the core sync loop or the validator are needed.
//
// Pending series: series whose automation is temporarily blocked are NOT
// silently removed — they are documented in PENDING_AUTOMATION_REGISTRY in
// seriesPublicationConfig.ts with exact blockers and resolution paths.

interface SyncTarget {
  indicatorKey: SbpIndicatorKey;
  /**
   * Formats the indicator's raw numeric kpi.value (and, where needed, the
   * due event's previous_value) into this calendar's actual_value convention
   * (e.g. "$11.2B", "6.8% YoY", "11.5% (held)").
   *
   * The observation-period validation config is NO LONGER inline here.
   * It lives in SERIES_PUBLICATION_META[seriesSlug].periodValidation in
   * seriesPublicationConfig.ts. Separating config from source-specific
   * transform functions means the timing rules are readable without
   * understanding the SBP EasyData fetch pipeline.
   */
  format: (value: string, previousValue: string | null) => string;
}

/** Parses a leading number out of strings like "11.5%" or "11.5% (hold expected)". */
function parseLeadingNumber(value: string | null): number | null {
  if (!value) return null;
  const match = value.match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

// ─── Pending series (NOT silently deleted) ─────────────────────────────────
//
// trade-balance: SOURCE MISMATCH (2026-07-01).
//   Calendar series labeled PBS (customs-basis trade). SBP EasyData P00050
//   is the BPM6 goods balance from exchange records — a different measure.
//   March 2026: PBS=-$2.84B, BPM6=-$2.37B (~$470M gap, ~17%). Writing BPM6
//   values into a PBS-labeled series produces factually wrong data.
//   Resolution: either PBS scraper (Option A) or series relabel (Option B).
//   See PENDING_AUTOMATION_REGISTRY in seriesPublicationConfig.ts.
//
// sbp-foreign-exchange-reserves: MEASURE/FREQUENCY MISMATCH (2026-07-01).
//   EasyData Z00020 = monthly total reserves (~$17B). Calendar = weekly
//   net-liquid FX (~$11B). Different measure, different frequency.
//   See PENDING_AUTOMATION_REGISTRY.
//
// large-scale-manufacturing-lsm-growth: FORMAT BUG (2026-07-01).
//   EasyData LSM000160000 returns quantum index (~114.56), not YoY growth.
//   format(v) => `${v}% YoY` would produce "114.56% YoY". See PENDING registry.

const SYNC_TARGETS: Record<string, SyncTarget> = {
  "current-account-balance": {
    indicatorKey: "currentAccount",
    format: (v) => `$${v}B`,
    // lagMonths=2 (see SERIES_PUBLICATION_META): SBP publishes BoP current
    // account ~45 days after month-end. July 15 event expects May obs.
  },
  "worker-remittances": {
    indicatorKey: "remittances",
    format: (v) => `$${v}B`,
    // lagMonths=2: remittances published alongside BoP, ~45-60 days lag.
    // July 9 event expects May obs.
  },
  "cpi-inflation-release": {
    indicatorKey: "cpiInflation",
    format: (v) => `${v}% YoY`,
    // lagMonths=1: PBS releases CPI ~1st–10th of M+1. July 10 event expects
    // June obs. If SBP EasyData still returns May data on July 1, the period
    // validator rejects it (May ≠ June) and the event stays scheduled.
  },
  "core-inflation-release": {
    indicatorKey: "coreInflation",
    format: (v) => `${v}% YoY`,
    // lagMonths=1: released same day as headline CPI.
  },
  "treasury-bill-auction-3m": {
    indicatorKey: "tbillYield3m",
    format: (v) => `${v}%`,
    // as-needed, maxDaysVariance=3: auction date is the obsDate.
  },
  "pib-auction": {
    indicatorKey: "pibYield3y",
    format: (v) => `${v}%`,
    // as-needed, maxDaysVariance=3: auction date is the obsDate.
  },
  "sbp-monetary-policy-committee-meeting": {
    indicatorKey: "policyRate",
    format: (v, previousValue) => {
      const prev = parseLeadingNumber(previousValue);
      const next = parseLeadingNumber(v);
      if (prev === null || next === null) return `${v}%`;
      const bps = Math.round((next - prev) * 100);
      if (bps === 0) return `${v}% (held)`;
      return `${v}% (${bps > 0 ? "hiked" : "cut"} ${bps > 0 ? "+" : ""}${bps}bps)`;
    },
    // as-needed, maxDaysVariance=3: MPC meeting date is the obsDate.
  },
};

/**
 * Data provenance record — written on every successful sync so the cron log
 * and any future audit trail has a complete picture of what data was used.
 * Populated on status="synced" only; undefined for skipped/error results.
 */
export interface SyncProvenance {
  /** Human-readable source name (matches SourceHierarchyEntry.name in seriesPublicationConfig). */
  sourceName: string;
  /** Source type code (matches SourceHierarchyEntry.type). */
  sourceType: "sbp-easydata" | "pbs-web" | "sbp-web" | "official-pdf" | "official-csv" | "manual";
  /** Human-readable observation period that was confirmed valid (e.g. "May 2026"). */
  observationPeriod: string;
  /** ISO date string returned by the data source as its observation date. */
  observationDate: string;
  /** ISO timestamp when this sync was executed. */
  syncTimestamp: string;
  /** Confidence level applied to the written event. */
  dataConfidence: "confirmed" | "estimated";
}

export interface SyncResult {
  seriesSlug: string;
  status:
    | "synced"
    | "skipped-no-due-event"
    | "skipped-fallback-data"
    | "skipped-period-mismatch"
    | "skipped-not-configured"
    | "error";
  detail: string;
  /** Populated on status="synced"; undefined for all other statuses. */
  provenance?: SyncProvenance;
}

/**
 * For each mapped series, fetches the live SBP EasyData value and — only if
 * it's genuinely live AND the observation period matches what the calendar
 * event represents — marks the soonest scheduled event as released.
 *
 * Two guards before any write:
 *   1. `indicator.meta.source === "SBP EasyData"` — fallback data is never
 *      written as a confirmed actual value.
 *   2. `validateObservationPeriod()` — the source's latest observation must
 *      belong to the correct period for this calendar event. Config is read
 *      from SERIES_PUBLICATION_META in seriesPublicationConfig.ts. If the
 *      config entry is missing or has periodValidation=undefined (pending
 *      series), the sync skips with "skipped-not-configured".
 */
export async function syncAllFromSbpEasyData(): Promise<SyncResult[]> {
  const supabase = createPublicDataClient();
  const workerSecret = process.env.NOTIFICATION_WORKER_SECRET ?? "";
  const results: SyncResult[] = [];

  for (const [seriesSlug, target] of Object.entries(SYNC_TARGETS)) {
    try {
      // ── Central config lookup ────────────────────────────────────────────
      // All timing rules live in seriesPublicationConfig.ts. If a series has
      // no config or its periodValidation is undefined (pending series), skip
      // rather than guess at the lag and risk a mis-attributed write.
      const pubMeta = SERIES_PUBLICATION_META[seriesSlug];
      if (!pubMeta?.periodValidation) {
        results.push({
          seriesSlug,
          status: "skipped-not-configured",
          detail:
            `No period-validation config in SERIES_PUBLICATION_META for ${seriesSlug}. ` +
            `Check PENDING_AUTOMATION_REGISTRY in seriesPublicationConfig.ts for the resolution path.`,
        });
        continue;
      }

      const indicatorFetchStart = new Date();
      const indicator = await getSbpIndicatorFresh(target.indicatorKey);
      const isFallback = indicator.meta.source !== "SBP EasyData";
      // Record source health for every fetch — tracks whether the data source
      // itself is healthy independent of whether there was an event to write.
      void recordSourceAttempt(
        {
          success: !isFallback,
          observationDate: isFallback ? undefined : indicator.meta.observationDate,
          sourceName: "SBP EasyData",
          sourceType: "sbp-easydata",
          isFallback,
          error: isFallback ? "EasyData returned fallback snapshot" : undefined,
        },
        seriesSlug,
        indicatorFetchStart,
        "sbp-actual-value-sync",
      );
      if (isFallback) {
        results.push({
          seriesSlug,
          status: "skipped-fallback-data",
          detail: "Live SBP EasyData call failed; serving fallback — not safe to mark as confirmed actual.",
        });
        continue;
      }

      const today = new Date().toISOString().slice(0, 10);
      const { data: dueEvents } = await supabase
        .from("economic_events")
        .select("event_date, previous_value, economic_event_series!inner(slug)")
        .eq("economic_event_series.slug", seriesSlug)
        .eq("status", "scheduled")
        .lte("event_date", today)
        .order("event_date", { ascending: false })
        .limit(1);

      const dueEvent = dueEvents?.[0];
      if (!dueEvent) {
        results.push({
          seriesSlug,
          status: "skipped-no-due-event",
          detail: `No scheduled event for ${seriesSlug} is due yet.`,
        });
        continue;
      }

      // ── Observation-period validation ──────────────────────────────────
      // Config is from the central registry — no inline lag values here.
      // A mismatch is a hard skip: no write, no cache bust, event stays
      // scheduled. This is the primary production-safety guard that prevents
      // stale data from being written to the wrong calendar slot.
      const obsDate = indicator.meta.observationDate; // "YYYY-MM-DD"
      const periodCheck = validateObservationPeriod(obsDate, dueEvent.event_date, pubMeta.periodValidation);
      if (!periodCheck.valid) {
        results.push({
          seriesSlug,
          status: "skipped-period-mismatch",
          detail: periodCheck.reason,
        });
        continue;
      }

      const actualValue = target.format(indicator.kpi.value, dueEvent.previous_value);
      const { data: didUpdate, error } = await supabase.rpc("sync_event_actual", {
        p_internal_secret: workerSecret,
        p_series_slug: seriesSlug,
        p_event_date: dueEvent.event_date,
        p_actual_value: actualValue,
        p_observation_date: obsDate,
      });

      if (error) {
        results.push({ seriesSlug, status: "error", detail: error.message });
      } else {
        if (didUpdate) {
          invalidateSbpIndicatorCache(target.indicatorKey);
        }
        const syncedEntry: SyncResult = didUpdate
          ? {
              seriesSlug,
              status: "synced",
              detail: `Set actual_value=${actualValue} for ${dueEvent.event_date} (obsDate=${obsDate})`,
              provenance: {
                sourceName: "SBP EasyData",
                sourceType: "sbp-easydata",
                observationPeriod: periodCheck.expectedPeriod ?? obsDate,
                observationDate: obsDate,
                syncTimestamp: new Date().toISOString(),
                dataConfidence: "confirmed",
              },
            }
          : {
              seriesSlug,
              status: "skipped-no-due-event",
              detail: "Event already released or not found at call time.",
            };
        results.push(syncedEntry);
      }
    } catch (err) {
      results.push({ seriesSlug, status: "error", detail: err instanceof Error ? err.message : String(err) });
    }
  }

  results.push(await syncSpiFromPbs());

  return results;
}

/**
 * SPI's sync target — kept separate from SYNC_TARGETS/syncAllFromSbpEasyData
 * because its source is PBS's own WordPress feed (src/lib/data/spi.ts),
 * not SBP EasyData. Implements the same write-guard as the SBP loop: the
 * PBS data point's date must exactly match the calendar event's date (weekly
 * cadence, strict date equality — equivalent to validateObservationPeriod
 * with cadence="weekly"). This was the fix that corrected the June 2026
 * SPI mis-attribution; it is preserved and documented here for consistency.
 */
export async function syncSpiFromPbs(): Promise<SyncResult> {
  const seriesSlug = "spi-weekly-inflation-release";
  try {
    const spiFetchStart = new Date();
    const spi = await getSpiHistory();
    const spiHealthy = !!(spi && spi.points.length > 0);
    void recordSourceAttempt(
      {
        success: spiHealthy,
        observationDate: spiHealthy ? spi!.points.at(-1)?.date : undefined,
        sourceName: "PBS SPI Weekly Report",
        sourceType: "pbs-web",
        isFallback: false,
        error: spiHealthy ? undefined : "PBS SPI fetch returned no points",
      },
      seriesSlug,
      spiFetchStart,
      "sbp-actual-value-sync",
    );
    if (!spiHealthy) {
      return {
        seriesSlug,
        status: "skipped-fallback-data",
        detail: "Live PBS SPI fetch failed or returned no points — not safe to mark as confirmed actual.",
      };
    }

    const supabase = createPublicDataClient();
    const workerSecret = process.env.NOTIFICATION_WORKER_SECRET ?? "";
    const today = new Date().toISOString().slice(0, 10);
    const { data: dueEvents } = await supabase
      .from("economic_events")
      .select("event_date, economic_event_series!inner(slug)")
      .eq("economic_event_series.slug", seriesSlug)
      .eq("status", "scheduled")
      .lte("event_date", today)
      .order("event_date", { ascending: false })
      .limit(1);

    const dueEvent = dueEvents?.[0];
    if (!dueEvent) {
      return { seriesSlug, status: "skipped-no-due-event", detail: "No scheduled SPI event is due yet." };
    }

    // Weekly cadence: the PBS data point's week-ended date must exactly
    // match the calendar slot's date. If PBS hasn't published the current
    // week yet, the sync skips cleanly rather than stamping the prior
    // week's figure onto the next slot (the original SPI mis-attribution).
    // spi is non-null here — the !spiHealthy guard above returned early.
    const matchingPoint = spi!.points.find((p) => p.date === dueEvent.event_date);
    if (!matchingPoint) {
      return {
        seriesSlug,
        status: "skipped-period-mismatch",
        detail: `PBS has not yet published the report for week ending ${dueEvent.event_date} (latest available: ${spi!.points.at(-1)?.date ?? "none"}).`,
      };
    }

    const sign = matchingPoint.wowPct >= 0 ? "+" : "";
    const actualValue = `${sign}${matchingPoint.wowPct.toFixed(2)}% WoW`;
    const { data: didUpdate, error } = await supabase.rpc("sync_event_actual", {
      p_internal_secret: workerSecret,
      p_series_slug: seriesSlug,
      p_event_date: dueEvent.event_date,
      p_actual_value: actualValue,
      p_observation_date: dueEvent.event_date,  // SPI: exact weekly date match
    });

    if (error) return { seriesSlug, status: "error", detail: error.message };
    if (didUpdate) invalidateSpiCache();
    return didUpdate
      ? {
          seriesSlug,
          status: "synced",
          detail: `Set actual_value=${actualValue} for ${dueEvent.event_date}`,
          provenance: {
            sourceName: "PBS SPI Weekly Report",
            sourceType: "pbs-web",
            observationPeriod: dueEvent.event_date,
            observationDate: dueEvent.event_date,
            syncTimestamp: new Date().toISOString(),
            dataConfidence: "confirmed",
          },
        }
      : {
          seriesSlug,
          status: "skipped-no-due-event",
          detail: "Event already released or not found at call time.",
        };
  } catch (err) {
    return { seriesSlug, status: "error", detail: err instanceof Error ? err.message : String(err) };
  }
}
