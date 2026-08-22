// Read-side access to migration 0051's provenance columns via migration
// 0052's dedicated RPC (get_canonical_observation_provenance) — same
// shape/retry convention as src/lib/data/sbpCanonicalStore.ts, kept as a
// separate module rather than added to that file since this is purely a
// Phase 5 shadow-mode read, not part of the production SBP read path.

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
  console.error(`[canonicalProvenanceStore] ${label} failed after ${READ_RETRIES + 1} attempt(s): ${lastError}`);
  return null;
}

export interface CanonicalProvenanceRow {
  observationPeriod: string;
  value: number;
  unit: string;
  vintage: string;
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

/** Latest canonical row's provenance for one indicator, or null on any failure / never-ingested. Read-only; never used to decide what a page renders. */
export async function getLatestCanonicalProvenance(indicatorKey: string): Promise<CanonicalProvenanceRow | null> {
  try {
    const supabase = createPublicDataClient();
    const data = await withReadRetry<ProvenanceRpcRow[]>(`get_canonical_observation_provenance(${indicatorKey})`, () =>
      supabase.rpc("get_canonical_observation_provenance", { p_indicator_key: indicatorKey, p_limit: 1 }),
    );
    const row = data?.[0];
    if (!row) return null;
    return {
      observationPeriod: row.observation_period,
      value: Number(row.value),
      unit: row.unit,
      vintage: row.vintage,
      releaseDate: row.release_date,
      sourceUpdatedAt: row.source_updated_at,
      fetchedAt: row.fetched_at,
      qualityStatus: row.quality_status,
      sourceSeriesId: row.source_series_id,
      sourceReference: row.source_reference,
    };
  } catch (err) {
    console.error(`[canonicalProvenanceStore] get_canonical_observation_provenance failed for ${indicatorKey}: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}
