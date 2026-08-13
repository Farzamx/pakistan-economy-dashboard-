// Read-side access to canonical_observations (migration 0050/0051) for the
// FRED provider — Phase 8.12 pilot.
//
// Deliberately calls get_canonical_observation_provenance directly by RPC
// name, the same generic, provider-agnostic read RPC already used by
// worldBankCanonicalStore.ts and netLiquidReservesCanonicalStore.ts — not
// an FRED-branded wrapper around src/lib/data/fred.ts, for the identical
// reasoning documented in both of those files and in
// ingestionOrchestrator.ts's header: the RPC itself is parameterized only
// by a plain indicator_key string.
//
// Uses the provenance RPC (not the plainer get_canonical_observation_history)
// so a future freshness/read-path integration has release_date/
// source_updated_at/fetched_at/quality_status/source_series_id/
// source_reference available without a second read — even though, per
// fredAdapter.ts's documented provenance decisions, release_date and
// source_updated_at are always null for this pilot's two series today.
//
// Not tagged "server-only": matches every other canonical store in this
// codebase (the anon key is safe to reference from any context —
// RPC-gating and RLS are the real security boundary, not import-time
// restriction).
//
// STANDALONE, Phase 8.12: nothing imports this except its own tests and
// live-verification tooling. src/lib/data/fred.ts / comparisonData.ts are
// NOT wired to read from this in this phase — see the Phase 8.12 report's
// Legacy Path / Comparisons sections for why the cutover is deliberately
// deferred to a later, explicitly-approved phase.

import { createPublicDataClient } from "@/lib/supabase/publicDataClient";

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
  console.error(`[fredCanonicalStore] ${label} failed after ${READ_RETRIES + 1} attempt(s): ${lastError}`);
  return null;
}

export interface CanonicalFredRow {
  observationPeriod: string; // "YYYY-MM-DD" — month-end, per fredAdapter.ts's period-end conversion
  value: number;
  unit: string;
  vintage: string; // ISO timestamp — when this became canonical
  releaseDate: string | null;
  sourceUpdatedAt: string | null;
  fetchedAt: string | null;
  qualityStatus: string | null;
  sourceSeriesId: string | null;
  sourceReference: Record<string, unknown> | null;
}

interface ProvenanceRpcRow {
  observation_period: string;
  value: number;
  unit: string;
  vintage: string;
  release_date: string | null;
  source_updated_at: string | null;
  fetched_at: string | null;
  quality_status: string | null;
  source_series_id: string | null;
  source_reference: Record<string, unknown> | null;
}

/**
 * Reads canonical_observations for one FRED indicator (fred:fedFunds or
 * fred:usCpiInflation for this pilot), oldest -> newest (the RPC itself
 * returns newest-first so LIMIT applies to the most recent N periods;
 * reversed here before returning, matching every other canonical store in
 * this codebase).
 *
 * Returns [] on any failure or when ingestion has never run yet — callers
 * treat that identically to a live-fetch failure.
 */
export async function getCanonicalFredHistory(
  indicatorKey: string,
  limit = 500,
): Promise<CanonicalFredRow[]> {
  try {
    const supabase = createPublicDataClient();
    const data = await withReadRetry<ProvenanceRpcRow[]>(`get_canonical_observation_provenance(${indicatorKey})`, () =>
      supabase.rpc("get_canonical_observation_provenance", { p_indicator_key: indicatorKey, p_limit: limit }),
    );
    if (!data) return [];
    return data
      .map((r) => ({
        observationPeriod: r.observation_period,
        value: Number(r.value),
        unit: r.unit,
        vintage: r.vintage,
        releaseDate: r.release_date,
        sourceUpdatedAt: r.source_updated_at,
        fetchedAt: r.fetched_at,
        qualityStatus: r.quality_status,
        sourceSeriesId: r.source_series_id,
        sourceReference: r.source_reference,
      }))
      .reverse();
  } catch (err) {
    console.error(`[fredCanonicalStore] get_canonical_observation_provenance failed for ${indicatorKey}: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}
