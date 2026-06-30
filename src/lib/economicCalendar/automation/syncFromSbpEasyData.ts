import { getSbpIndicator, type SbpIndicatorKey } from "@/lib/data/sbp";
import { invalidateSbpIndicatorCache } from "@/lib/data/sbpCacheInvalidation";
import { getSpiHistory, invalidateSpiCache } from "@/lib/data/spi";
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
  /** Formats the indicator's raw numeric kpi.value (and, where needed, the due event's previous_value) into this calendar's existing actual_value string convention (e.g. "$11.2B", "6.8% YoY", "11.5% (held)"). */
  format: (value: string, previousValue: string | null) => string;
}

/** Parses a leading number out of strings like "11.5%" or "11.5% (hold expected)" — tolerant of the descriptive suffixes this calendar's previous_value/forecast fields carry. */
function parseLeadingNumber(value: string | null): number | null {
  if (!value) return null;
  const match = value.match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

const SYNC_TARGETS: Record<string, SyncTarget> = {
  "sbp-foreign-exchange-reserves": { indicatorKey: "foreignReserves", format: (v) => `$${v}B` },
  "current-account-balance": { indicatorKey: "currentAccount", format: (v) => `$${v}B` },
  "trade-balance": { indicatorKey: "tradeBalance", format: (v) => `$${v}B` },
  "worker-remittances": { indicatorKey: "remittances", format: (v) => `$${v}B` },
  "cpi-inflation-release": { indicatorKey: "cpiInflation", format: (v) => `${v}% YoY` },
  "core-inflation-release": { indicatorKey: "coreInflation", format: (v) => `${v}% YoY` },
  "large-scale-manufacturing-lsm-growth": { indicatorKey: "lsm", format: (v) => `${v}% YoY` },
  // Renamed from "treasury-bill-auction" — Rolling Calendar refactor split
  // T-Bill auctions into 3M/6M/12M series (SBP reports 3 separate cut-off
  // yields per auction). Only 3M has a confirmed live SBP EasyData yield
  // indicator; 6M/12M stay semi_automated (date-only automation, via
  // generate_next_occurrence()'s official_calendar rule) until an
  // equivalent indicator is confirmed.
  "treasury-bill-auction-3m": { indicatorKey: "tbillYield3m", format: (v) => `${v}%` },
  "pib-auction": { indicatorKey: "pibYield3y", format: (v) => `${v}%` },
  // SBP's live policy-rate series (src/lib/data/sbp.ts's `policyRate`,
  // already powering the homepage and /pakistan-interest-rate) was never
  // wired into this sync loop — meaning every MPC decision had to be typed
  // in by hand even though the same automated pipeline every other series
  // uses could reach it. Mirrors this calendar's existing "11.5% (hiked
  // +100bps)" / "11.5% (held)" convention by comparing the new rate to the
  // due event's previous_value, rather than just dropping a bare number in.
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
  },
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
        .select("event_date, previous_value, economic_event_series!inner(slug)")
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

      const actualValue = target.format(indicator.kpi.value, dueEvent.previous_value);
      const { data: didUpdate, error } = await supabase.rpc("sync_event_actual", {
        p_series_slug: seriesSlug,
        p_event_date: dueEvent.event_date,
        p_actual_value: actualValue,
      });

      if (error) {
        results.push({ seriesSlug, status: "error", detail: error.message });
      } else {
        if (didUpdate) {
          // Push-based invalidation (Production Audit Part 5): the value
          // just written here came from getSbpIndicator(target.indicatorKey)
          // a few lines up — bust that indicator's L1/L2 cache now so the
          // Overview KPI for the same series can't go on serving a value
          // older than what this cron run just confirmed to Supabase.
          invalidateSbpIndicatorCache(target.indicatorKey);
        }
        results.push({ seriesSlug, status: didUpdate ? "synced" : "skipped-no-due-event", detail: didUpdate ? `Set actual_value=${actualValue} for ${dueEvent.event_date}` : "Event already released or not found at call time." });
      }
    } catch (err) {
      results.push({ seriesSlug, status: "error", detail: err instanceof Error ? err.message : String(err) });
    }
  }

  results.push(await syncSpiFromPbs());

  return results;
}

/**
 * SPI's sync target, kept separate from SYNC_TARGETS/syncAllFromSbpEasyData
 * above because its source is PBS's own WordPress feed (src/lib/data/spi.ts
 * — already powering the homepage's SPI card), not SBP EasyData via
 * getSbpIndicator()'s shared interface. Same "find the soonest due
 * scheduled event, apply the latest live value via sync_event_actual()"
 * pattern as every other series, just against a different source.
 */
export async function syncSpiFromPbs(): Promise<SyncResult> {
  const seriesSlug = "spi-weekly-inflation-release";
  try {
    const spi = await getSpiHistory();
    const latest = spi?.points.at(-1);
    if (!spi || !latest) {
      return { seriesSlug, status: "skipped-fallback-data", detail: "Live PBS SPI fetch failed or returned no points — not safe to mark as confirmed actual." };
    }

    const supabase = createPublicDataClient();
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

    const sign = latest.wowPct >= 0 ? "+" : "";
    const actualValue = `${sign}${latest.wowPct.toFixed(2)}% WoW`;
    const { data: didUpdate, error } = await supabase.rpc("sync_event_actual", {
      p_series_slug: seriesSlug,
      p_event_date: dueEvent.event_date,
      p_actual_value: actualValue,
    });

    if (error) return { seriesSlug, status: "error", detail: error.message };
    if (didUpdate) invalidateSpiCache();
    return { seriesSlug, status: didUpdate ? "synced" : "skipped-no-due-event", detail: didUpdate ? `Set actual_value=${actualValue} for ${dueEvent.event_date}` : "Event already released or not found at call time." };
  } catch (err) {
    return { seriesSlug, status: "error", detail: err instanceof Error ? err.message : String(err) };
  }
}
