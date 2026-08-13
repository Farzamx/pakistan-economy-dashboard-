// Generic ingestion orchestrator — Phase 8.1, wired into production for the
// first time by Phase 8.3 (scripts/ingestWorldBank.ts).
//
// This module is a from-scratch, standalone generalization of the
// retry/concurrency/persistence/logging shape already proven in
// scripts/ingestSbp.ts — it does NOT replace, import from, or get imported
// by that script. ingestSbp.ts continues running exactly as it does today,
// completely unmodified.
//
// Phase 8.3 note: this file originally carried `import "server-only";`.
// Removed here — not a security-boundary change, since this module never
// reads a secret from the environment itself (internalSecret always
// arrives as a caller-supplied parameter; see the security tests in
// ingestionOrchestrator.test.ts) and nothing client-side has ever imported
// it. The tag turned out to be actively incompatible with this file's own
// designed purpose: a plain Node/tsx production script (scripts/ingestWorldBank.ts,
// run the same way scripts/ingestSbp.ts always has been) cannot import a
// module tagged "server-only" at all — the real npm package (only
// installed in this phase; previously only a Vitest-only alias existed)
// unconditionally throws outside Next.js's own bundler, which is the only
// context that ever swaps in a no-op version. RPC-gating
// (check_internal_secret) remains the actual security boundary for the
// writes this file performs, matching sbpCanonicalStore.ts's and
// worldBankCanonicalStore.ts's own stated philosophy.
//
// Ownership boundary (Phase 8.1 architecture decision):
//   - Adapters (providerAdapter.ts) own: transport, parsing, normalization.
//     They must NOT retry internally and must NOT write to any table.
//   - This orchestrator owns: retry/backoff, bounded concurrency, error
//     isolation (one series' failure never aborts the run), reading
//     existing canonical state to diff against, writing raw + canonical
//     observations, and revision handling (entirely via the existing
//     ingest_raw_observation / resolve_canonical_observation RPCs' own
//     unchanged-value short-circuit -- no second revision model is
//     introduced here).
//
// get_canonical_observation_history is called directly by name here (not
// via src/lib/data/sbpCanonicalStore.ts's SBP-branded wrapper) because the
// RPC itself is already provider-agnostic (parameterized only by
// indicator_key, a plain string -- confirmed against migration 0050's own
// SQL) -- importing the SBP-named wrapper into a generic module would be
// the wrong direction for exactly the kind of naming confusion Phase 8.0
// fixed.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProviderAdapter, NormalizedObservation } from "./providerAdapter";
import { validateNormalizedObservation } from "./providerAdapter";

export interface OrchestratorOptions {
  maxRetries?: number;
  retryBaseDelayMs?: number;
  concurrency?: number;
}

const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_RETRY_BASE_DELAY_MS = 3000;
const DEFAULT_CONCURRENCY = 5;
const VALUE_EPSILON = 1e-9;

export type IngestStatus = "unchanged" | "updated" | "failed";

export interface SeriesIngestOutcome {
  indicatorKey: string;
  status: IngestStatus;
  periodsWritten: number;
  latestPeriod?: string;
  error?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Retry/backoff lives here, not in any adapter -- see file header. */
async function fetchWithRetry(
  adapter: ProviderAdapter,
  indicatorKey: string,
  sinceDate: string | undefined,
  maxRetries: number,
  retryBaseDelayMs: number,
): Promise<NormalizedObservation[]> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await adapter.fetchObservations({ indicatorKey, sinceDate });
    } catch (err) {
      lastErr = err;
      if (attempt < maxRetries) {
        const delay = retryBaseDelayMs * (attempt + 1);
        console.warn(`    retry ${attempt + 1}/${maxRetries} for ${indicatorKey} (${adapter.providerId}) in ${delay}ms: ${err instanceof Error ? err.message : String(err)}`);
        await sleep(delay);
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

interface ExistingObservationRow {
  observation_period: string;
  value: number;
  unit: string;
}

/**
 * Ingests one series through one adapter: read existing canonical state,
 * fetch (with retry), diff, validate each changed point, write raw +
 * canonical rows for genuinely changed periods only. Mirrors
 * ingestSbp.ts's ingestSeries() shape exactly, generalized to accept any
 * ProviderAdapter instead of an SBP-specific fetch function.
 *
 * Never writes an observation that fails validateNormalizedObservation --
 * that period is recorded as part of a thrown error for this series
 * (isolated by the caller, see ingestManySeries), never silently dropped
 * and never written half-validated.
 */
export async function ingestOneSeries(
  supabase: SupabaseClient,
  internalSecret: string,
  runId: string,
  adapter: ProviderAdapter,
  indicatorKey: string,
  options: OrchestratorOptions = {},
): Promise<SeriesIngestOutcome> {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const retryBaseDelayMs = options.retryBaseDelayMs ?? DEFAULT_RETRY_BASE_DELAY_MS;

  const { data: existingRows, error: existingError } = await supabase.rpc("get_canonical_observation_history", {
    p_indicator_key: indicatorKey,
    p_limit: 5000,
  });
  if (existingError) throw new Error(`get_canonical_observation_history failed for ${indicatorKey}: ${existingError.message}`);

  const existing = ((existingRows ?? []) as ExistingObservationRow[])
    .map((r) => ({ observationPeriod: r.observation_period, value: r.value, unit: r.unit }))
    .sort((a, b) => (a.observationPeriod < b.observationPeriod ? -1 : 1));
  const existingByPeriod = new Map(existing.map((r) => [r.observationPeriod, r]));
  const sinceDate = incrementalStartDate(existing);

  const observations = await fetchWithRetry(adapter, indicatorKey, sinceDate, maxRetries, retryBaseDelayMs);

  for (const obs of observations) {
    const v = validateNormalizedObservation(obs);
    if (!v.valid) throw new Error(`invalid observation from ${adapter.providerId} for ${indicatorKey}@${obs.observationPeriod}: ${v.reason}`);
  }

  const changed = observations.filter((obs) => {
    const prior = existingByPeriod.get(obs.observationPeriod);
    return !prior || Math.abs(prior.value - obs.value) > VALUE_EPSILON || prior.unit !== obs.unit;
  });

  const latestPeriod = observations.length > 0 ? observations[observations.length - 1].observationPeriod : existing[existing.length - 1]?.observationPeriod;

  if (changed.length === 0) {
    return { indicatorKey, status: "unchanged", periodsWritten: 0, latestPeriod };
  }

  let written = 0;
  for (const obs of changed) {
    const { data: rawResult, error: rawError } = await supabase.rpc("ingest_raw_observation", {
      p_internal_secret: internalSecret,
      p_indicator_key: obs.indicatorKey,
      p_provider: obs.provider,
      p_observation_period: obs.observationPeriod,
      p_value: obs.value,
      p_unit: obs.unit,
      p_series_name: null,
      p_raw_payload: { sourceSeriesId: obs.sourceSeriesId, observationPeriod: obs.observationPeriod, value: obs.value, unit: obs.unit },
      p_ingestion_run_id: runId,
    });
    if (rawError) throw new Error(`ingest_raw_observation failed for ${indicatorKey}@${obs.observationPeriod}: ${rawError.message}`);

    const { error: canonError } = await supabase.rpc("resolve_canonical_observation", {
      p_internal_secret: internalSecret,
      p_indicator_key: obs.indicatorKey,
      p_observation_period: obs.observationPeriod,
      p_value: obs.value,
      p_unit: obs.unit,
      p_source_provider: obs.provider,
      p_source_raw_observation_id: (rawResult as { raw_observation_id?: string } | null)?.raw_observation_id ?? null,
      p_series_name: null,
      p_confidence: "official",
      p_release_date: obs.releaseDate,
      p_source_updated_at: obs.sourceUpdatedAt,
      p_fetched_at: new Date().toISOString(),
      p_quality_status: obs.qualityStatus,
      p_source_series_id: obs.sourceSeriesId,
      p_source_reference: obs.sourceReference,
    });
    if (canonError) throw new Error(`resolve_canonical_observation failed for ${indicatorKey}@${obs.observationPeriod}: ${canonError.message}`);
    written++;
  }

  return { indicatorKey, status: "updated", periodsWritten: written, latestPeriod };
}

/** Mirrors ingestSbp.ts's INCREMENTAL_LOOKBACK_DAYS pattern -- a buffer subtracted from the latest already-ingested period, so a normal run only asks the adapter for recent history, not a full backfill every time. */
const INCREMENTAL_LOOKBACK_DAYS = 60;

function incrementalStartDate(existing: { observationPeriod: string }[]): string | undefined {
  if (existing.length === 0) return undefined;
  const latest = existing[existing.length - 1].observationPeriod;
  const d = new Date(latest);
  d.setUTCDate(d.getUTCDate() - INCREMENTAL_LOOKBACK_DAYS);
  return d.toISOString().slice(0, 10);
}

/** Bounded-concurrency worker pool -- identical shape to ingestSbp.ts's processWithConcurrency, generalized (that function was already fully generic; this is the same algorithm, not a reimplementation). */
async function processWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker(): Promise<void> {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export interface IngestJob {
  adapter: ProviderAdapter;
  indicatorKey: string;
}

/**
 * Ingests many series (possibly across different adapters/providers)
 * concurrently with bounded parallelism. One series' failure is isolated
 * and recorded as `status: "failed"` -- it never aborts the run or affects
 * any other series, matching ingestSbp.ts's existing isolation guarantee
 * exactly.
 */
export async function ingestManySeries(
  supabase: SupabaseClient,
  internalSecret: string,
  runId: string,
  jobs: IngestJob[],
  options: OrchestratorOptions = {},
): Promise<SeriesIngestOutcome[]> {
  const concurrency = options.concurrency ?? DEFAULT_CONCURRENCY;
  return processWithConcurrency(jobs, concurrency, async (job): Promise<SeriesIngestOutcome> => {
    try {
      return await ingestOneSeries(supabase, internalSecret, runId, job.adapter, job.indicatorKey, options);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { indicatorKey: job.indicatorKey, status: "failed", periodsWritten: 0, error: message };
    }
  });
}
