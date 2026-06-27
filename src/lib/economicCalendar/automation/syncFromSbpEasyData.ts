import { getSbpIndicator, type SbpIndicatorKey } from "@/lib/data/sbp";
import { createPublicDataClient } from "@/lib/supabase/publicDataClient";

// Phase 2B Priority 1 automation — syncs `actual_value` on already-scheduled
// economic_events rows from SBP EasyData, the same live, already-integrated
// data source this dashboard's homepage and indicator pages use (see
// src/lib/data/sbp.ts). Reuses that module's existing caching/fallback
// logic entirely rather than re-implementing a second SBP client.
//
// Write path: economic_events has no public INSERT/UPDATE policy (see
// 0002's RLS) and this project has no service-role key, so this calls the
// sync_event_actual(...) Postgres function added in
// 0004_economic_calendar_phase2b.sql — a SECURITY DEFINER function that can
// only do one narrow thing (mark a matching scheduled event released with
// an actual value), callable with the anon key via RPC.
//
// Each series here maps to a real SbpIndicatorKey already wired to a live
// SBP EasyData series — this is "automated" in the literal sense the
// Phase 2 source audit used that word for, not aspirational.
interface SyncTarget {
  indicatorKey: SbpIndicatorKey;
  /** Formats the indicator's raw numeric kpi.value into this calendar's existing actual_value string convention (e.g. "$11.2B", "6.8% YoY"). */
  format: (value: string) => string;
}

const SYNC_TARGETS: Record<string, SyncTarget> = {
  "sbp-foreign-exchange-reserves": { indicatorKey: "foreignReserves", format: (v) => `$${v}B` },
  "current-account-balance": { indicatorKey: "currentAccount", format: (v) => `$${v}B` },
  "trade-balance": { indicatorKey: "tradeBalance", format: (v) => `$${v}B` },
  "worker-remittances": { indicatorKey: "remittances", format: (v) => `$${v}B` },
  "cpi-inflation-release": { indicatorKey: "cpiInflation", format: (v) => `${v}% YoY` },
  "core-inflation-release": { indicatorKey: "coreInflation", format: (v) => `${v}% YoY` },
  "large-scale-manufacturing-lsm-growth": { indicatorKey: "lsm", format: (v) => `${v}% YoY` },
  "treasury-bill-auction": { indicatorKey: "tbillYield3m", format: (v) => `${v}%` },
  "pib-auction": { indicatorKey: "pibYield3y", format: (v) => `${v}%` },
};

export interface SyncResult {
  seriesSlug: string;
  status: "synced" | "skipped-no-due-event" | "skipped-fallback-data" | "error";
  detail: string;
}

/**
 * For each mapped series, fetches the live SBP EasyData value and — only if
 * it's genuinely live (not a static fallback snapshot) — tries to mark the
 * soonest scheduled event whose date has already passed as released with
 * that actual value. sync_event_actual() itself is the final safety check:
 * it only writes if a scheduled (not already-released) event exists for
 * that exact series+date, so a wrong guess here just no-ops rather than
 * corrupting data.
 */
export async function syncAllFromSbpEasyData(): Promise<SyncResult[]> {
  const supabase = createPublicDataClient();
  const results: SyncResult[] = [];

  for (const [seriesSlug, target] of Object.entries(SYNC_TARGETS)) {
    try {
      const indicator = await getSbpIndicator(target.indicatorKey);
      if (indicator.meta.source !== "SBP EasyData") {
        results.push({ seriesSlug, status: "skipped-fallback-data", detail: "Live SBP EasyData call failed; serving fallback — not safe to mark as confirmed actual." });
        continue;
      }

      // Find the most recent scheduled (not-yet-released) event in this
      // series whose date has already passed — the one this observation
      // most likely corresponds to. Limit 1, soonest-first within the past.
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
        results.push({ seriesSlug, status: "skipped-no-due-event", detail: `No scheduled event for ${seriesSlug} is due yet.` });
        continue;
      }

      const actualValue = target.format(indicator.kpi.value);
      const { data: didUpdate, error } = await supabase.rpc("sync_event_actual", {
        p_series_slug: seriesSlug,
        p_event_date: dueEvent.event_date,
        p_actual_value: actualValue,
      });

      if (error) {
        results.push({ seriesSlug, status: "error", detail: error.message });
      } else {
        results.push({ seriesSlug, status: didUpdate ? "synced" : "skipped-no-due-event", detail: didUpdate ? `Set actual_value=${actualValue} for ${dueEvent.event_date}` : "Event already released or not found at call time." });
      }
    } catch (err) {
      results.push({ seriesSlug, status: "error", detail: err instanceof Error ? err.message : String(err) });
    }
  }

  return results;
}
