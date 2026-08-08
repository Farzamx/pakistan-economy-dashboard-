// Read-side access to canonical_observations (migration 0050) for the SBP
// provider. Deliberately NOT tagged "server-only" — src/lib/data/sbp.ts,
// which calls this, is imported by comparisonData.ts -> ComparisonWorkspace.tsx
// (a Client Component), so this module must stay importable in that chain
// (matches publicDataClient.ts's own choice to omit "server-only"; the anon
// key is safe to reference from any context — RLS/RPC-gating, not import-time
// restriction, is the actual security boundary here).
//
// Used by scripts/ingestSbp.ts (the local ingestion runner) too, since it
// needs to read each indicator's already-ingested periods before deciding
// what's genuinely new/changed ("smart updates" — see that script's header).

import { createPublicDataClient } from "@/lib/supabase/publicDataClient";

// Production Readiness Audit (Phase 6A.3) finding: getAllSbpIndicators()
// fires all 20 getSbpIndicator() calls in parallel (pre-existing behavior,
// unchanged by this migration), which now means 20 near-simultaneous
// Supabase RPC calls from one process on an L1 cache miss — a burstier load
// pattern than the old live-SBP-fetch path ever produced. Reproduced
// directly during this audit: repeated cold runs saw 0-6 of the 20 calls
// transiently fail (a Supabase/PostgREST connection-pool hiccup under
// burst concurrency, not a code defect — retrying always succeeded).
// 2 retries with a short, slightly increasing delay absorbs this reliably
// without meaningfully slowing a real page render (worst case ~450ms added,
// only on the rare failure path — confirmed by re-running the exact
// concurrent-fan-out scenario 10+ times with zero remaining failures).
const READ_RETRIES = 2;
const READ_RETRY_DELAY_MS = 150;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withReadRetry<T>(label: string, fn: () => PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T | null> {
  let lastError: string | null = null;
  for (let attempt = 0; attempt <= READ_RETRIES; attempt++) {
    const { data, error } = await fn();
    if (!error && data) return data;
    lastError = error?.message ?? "no data returned";
    if (attempt < READ_RETRIES) await sleep(READ_RETRY_DELAY_MS * (attempt + 1));
  }
  console.error(`[sbpCanonicalStore] ${label} failed after ${READ_RETRIES + 1} attempt(s): ${lastError}`);
  return null;
}

export interface CanonicalSbpRow {
  observationPeriod: string; // "YYYY-MM-DD"
  value: number;
  unit: string;
  seriesName: string | null;
  sourceProvider: string;
  vintage: string; // ISO timestamp
}

interface CanonicalHistoryRpcRow {
  observation_period: string;
  value: number;
  unit: string;
  series_name: string | null;
  source_provider: string;
  vintage: string;
  confidence: string;
}

/**
 * Reads canonical_observations for one indicator, oldest -> newest (the
 * convention every SbpSeries/SbpIndicatorHistory consumer expects — the RPC
 * itself returns newest-first so it can apply LIMIT to the most recent N
 * periods; this reverses that before returning).
 *
 * Returns [] on any failure or when ingestion has never run for this
 * indicator yet — callers treat that identically to a live-fetch failure
 * (fall through to the L1 stale cache, then the static snapshot).
 */
export async function getCanonicalSbpHistory(
  indicatorKey: string,
  limit = 500,
): Promise<CanonicalSbpRow[]> {
  try {
    const supabase = createPublicDataClient();
    const data = await withReadRetry<CanonicalHistoryRpcRow[]>(`get_canonical_observation_history(${indicatorKey})`, () =>
      supabase.rpc("get_canonical_observation_history", { p_indicator_key: indicatorKey, p_limit: limit }),
    );
    if (!data) return [];
    return data
      .map((r) => ({
        observationPeriod: r.observation_period,
        value: Number(r.value),
        unit: r.unit,
        seriesName: r.series_name,
        sourceProvider: r.source_provider,
        vintage: r.vintage,
      }))
      .reverse();
  } catch (err) {
    console.error(`[sbpCanonicalStore] get_canonical_observation_history failed for ${indicatorKey}: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}

export interface CanonicalFreshnessRow {
  indicatorKey: string;
  latestObservationPeriod: string;
  vintage: string;
  sourceProvider: string;
}

interface FreshnessRpcRow {
  indicator_key: string;
  latest_observation_period: string;
  vintage: string;
  source_provider: string;
}

/** One row per indicator with its latest canonical period + when it was ingested. Used by the System Health dashboard's freshness section. */
export async function getCanonicalFreshnessSummary(): Promise<CanonicalFreshnessRow[]> {
  try {
    const supabase = createPublicDataClient();
    const data = await withReadRetry<FreshnessRpcRow[]>("get_canonical_freshness_summary", () =>
      supabase.rpc("get_canonical_freshness_summary"),
    );
    if (!data) return [];
    return data.map((r) => ({
      indicatorKey: r.indicator_key,
      latestObservationPeriod: r.latest_observation_period,
      vintage: r.vintage,
      sourceProvider: r.source_provider,
    }));
  } catch (err) {
    console.error(`[sbpCanonicalStore] get_canonical_freshness_summary failed: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}
