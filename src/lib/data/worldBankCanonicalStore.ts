// Read-side access to canonical_observations (migration 0050/0051) for the
// World Bank provider — Phase 8.3.
//
// Deliberately calls get_canonical_observation_provenance directly by RPC
// name, the same generic, provider-agnostic read RPC (migration 0052)
// already used for freshness evidence elsewhere — NOT
// src/lib/data/sbpCanonicalStore.ts's SBP-branded getCanonicalSbpHistory,
// even though that function is itself generic underneath its name. Calling
// the RPC directly here avoids importing an SBP-named function into
// World-Bank-reading code (exactly the naming confusion Phase 8.0 fixed
// for canonicalObservation.ts, and the same reasoning
// ingestionOrchestrator.ts's header already documents for the write side).
//
// Uses the provenance RPC (not the plainer get_canonical_observation_history)
// because World Bank genuinely has release_date/source_updated_at/
// fetched_at/quality_status/source_series_id/source_reference to read back —
// unlike SBP, which has none of those and so never needed this RPC for its
// own render path. One RPC call per series covers both the value/history
// data AND everything evaluateFreshness() needs — no second, separate
// canonical read.
//
// Not tagged "server-only": matches sbpCanonicalStore.ts's own choice (the
// anon key is safe to reference from any context — RPC-gating and RLS are
// the real security boundary here, not import-time restriction).

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
  console.error(`[worldBankCanonicalStore] ${label} failed after ${READ_RETRIES + 1} attempt(s): ${lastError}`);
  return null;
}

export interface CanonicalWorldBankRow {
  observationPeriod: string; // "YYYY-MM-DD" ("YYYY-12-31" for this pilot's annual series)
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
 * Reads canonical_observations for one World Bank indicator, oldest ->
 * newest (the same convention getCanonicalSbpHistory/every SbpSeries
 * consumer expects — the RPC itself returns newest-first so LIMIT applies
 * to the most recent N periods; reversed here before returning).
 *
 * Returns [] on any failure or when ingestion has never run for this
 * indicator yet — callers treat that identically to a live-fetch failure,
 * per worldBank.ts's documented fallback chain.
 */
export async function getCanonicalWorldBankHistory(
  indicatorKey: string,
  limit = 100,
): Promise<CanonicalWorldBankRow[]> {
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
    console.error(`[worldBankCanonicalStore] get_canonical_observation_provenance failed for ${indicatorKey}: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}
