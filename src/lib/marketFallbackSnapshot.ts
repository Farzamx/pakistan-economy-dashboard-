// Auto-regenerating fallback snapshot store (Production Audit Part 6) — a
// durable replacement for the static, never-updated snapshots in
// globalMarketsFallbackData.ts. Whenever a primary/secondary fetch
// succeeds, the caller persists the result here (cheap: this only runs as
// often as that fetch's own revalidate window allows, typically hours
// apart, not on every page request). When both primary and secondary
// fail, callers read the most recent persisted snapshot here first —
// always closer to current than the hardcoded file — falling back to the
// static file only if nothing has ever been persisted yet (e.g.
// immediately after this shipped, before any successful fetch occurred).
//
// Persistence failures are logged, never thrown — this is a best-effort
// freshness improvement on top of the static fallback, not a new
// dependency the KPI fetchers can fail on.

import { createPublicDataClient } from "@/lib/supabase/publicDataClient";
import type { Kpi } from "@/data/kpiData";

export async function savePersistedSnapshot(symbolKey: string, kpi: Kpi, source: string): Promise<void> {
  try {
    const supabase = createPublicDataClient();
    const { error } = await supabase.rpc("upsert_market_fallback_snapshot", {
      p_symbol_key: symbolKey,
      p_kpi_json: kpi,
      p_source: source,
    });
    if (error) console.error(`[MarketFallback] upsert failed for ${symbolKey}: ${error.message}`);
  } catch (err) {
    console.error(`[MarketFallback] upsert threw for ${symbolKey}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export interface PersistedSnapshot {
  kpi: Kpi;
  capturedAt: string;
  source: string;
}

/** Returns the most recently persisted live value for this symbol, or null if none has ever been saved. */
export async function getPersistedSnapshot(symbolKey: string): Promise<PersistedSnapshot | null> {
  try {
    const supabase = createPublicDataClient();
    const { data, error } = await supabase.rpc("get_market_fallback_snapshot", { p_symbol_key: symbolKey });
    if (error) {
      console.error(`[MarketFallback] read failed for ${symbolKey}: ${error.message}`);
      return null;
    }
    // Same Postgres behavior as weeklyIntelligence.ts: a function returning
    // a single row (not setof) for a no-match query returns a row of nulls,
    // not a true SQL NULL — `!data` alone won't catch that.
    if (!data || !data.captured_at) return null;
    return { kpi: data.kpi_json as Kpi, capturedAt: data.captured_at, source: data.source };
  } catch (err) {
    console.error(`[MarketFallback] read threw for ${symbolKey}: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

/**
 * Standard three-tier resolution for a Global Markets symbol: try the live
 * fetcher, persist on success; on failure, read the most recent persisted
 * snapshot (marked "cache-stale"); if nothing was ever persisted, use the
 * hardcoded static fallback (marked "fallback", with its own captured
 * date). Every branch stamps sourceStatus/snapshotDate so the unified Data
 * Quality badge never shows fallback/cached data as plain "live".
 */
export async function resolveWithPersistedFallback(
  symbolKey: string,
  fetchLive: () => Promise<Kpi>,
  staticFallback: Kpi,
): Promise<Kpi> {
  try {
    const kpi = await fetchLive();
    const live: Kpi = { ...kpi, sourceStatus: "live" };
    void savePersistedSnapshot(symbolKey, live, kpi.source ?? "unknown");
    return live;
  } catch {
    const persisted = await getPersistedSnapshot(symbolKey);
    if (persisted) {
      return { ...persisted.kpi, sourceStatus: "cache-stale", snapshotDate: persisted.capturedAt.slice(0, 10) };
    }
    return { ...staticFallback, sourceStatus: "fallback", snapshotDate: staticFallback.latestDate };
  }
}
