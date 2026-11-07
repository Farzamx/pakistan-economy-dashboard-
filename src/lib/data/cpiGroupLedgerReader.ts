// Phase F.2e-Prep, wired into the Inflation page in the final Inflation milestone (via src/lib/data/cpiGroupPanelSource.ts).
//
// Reads the 26 PBS CPI series from the observation ledger through the EXISTING public read RPC
// get_canonical_observation_provenance (migration 0052) and hands them to the pure assembler. Nothing here writes;
// no other RPC is named; no new RPC or table is needed.
//
// WHY THIS RPC, NOT get_canonical_observation_history
// The provenance RPC returns, per current row, the value AND every provenance field the assembler checks (source
// series id, base period and exact source text in source_reference, source_updated_at, fetched_at, quality, unit).
// The history RPC returns only the value, unit, provider and vintage, so it would need a second call per key.
//
// COST: one RPC per series = 26 calls per page generation (ISR: at most once an hour, and only while the ledger is
// the source). A single batch RPC taking all 26 keys would make that 1 — proposed in
// docs/inflation-ledger-migration-assessment.md, NOT created (it needs a migration and separate approval).
//
// RESILIENCE (all bounded so a ledger outage costs seconds, not a hung regeneration):
//   - at most LEDGER_READ_CONCURRENCY calls in flight (an earlier audit found unbounded fan-out transiently
//     fails 0–6 of 20 calls; the existing stores retry for the same reason);
//   - each call has LEDGER_READ_TIMEOUT_MS;
//   - up to LEDGER_READ_RETRIES retries per call with a short growing delay (the existing stores' constants);
//   - ONE overall deadline, LEDGER_READ_DEADLINE_MS, for the whole 26-key read: when it passes, every call in flight
//     is aborted and no new attempt starts. Without it a hung (not erroring) ledger could hold a regeneration for
//     ~26 keys ÷ 6 workers × 3 attempts × 8 s ≈ 2 minutes before the PBS fallback even began. With it the worst case
//     is this deadline + the PBS fetch's own 15 s timeout;
//   - never throws: every failure is carried in the result and becomes an "unavailable" ledger verdict.
//
// A read that returns exactly the row limit is flagged `truncated` so completeness is never assumed.
//
// Deliberately NOT tagged "server-only", like sbpCanonicalStore.ts: it uses only the public anon client (RLS / RPC gating
// is the security boundary, not import restrictions) and the read-only verification script
// (scripts/reconcileInflationLedger.ts) must be able to import it under tsx, where "server-only" cannot resolve.

import { createPublicDataClient } from "@/lib/supabase/publicDataClient";
import { assembleLedgerPanel, type LedgerPanelResult, type LedgerRow, type LedgerSeriesRead } from "@/lib/inflation/ledgerPanel";
import { PBS_CPI_INDICATOR_KEYS } from "@/lib/providers/pbsCpiGroupsAdapter";

export const LEDGER_PROVENANCE_RPC = "get_canonical_observation_provenance";
/** Far above the 52 months held today (+12 a year); hitting it is treated as "cannot prove completeness". */
export const LEDGER_READ_LIMIT = 1000;
export const LEDGER_READ_CONCURRENCY = 6;
export const LEDGER_READ_TIMEOUT_MS = 8_000;
export const LEDGER_READ_RETRIES = 2;
/** Hard cap on the whole read. A healthy read takes ~0.7 s (measured), so this is ~15× headroom. */
export const LEDGER_READ_DEADLINE_MS = 12_000;
const RETRY_DELAY_MS = 150;

interface ProvenanceRpcRow {
  observation_period: string;
  value: number | string;
  unit: string;
  vintage: string;
  release_date: string | null;
  source_updated_at: string | null;
  fetched_at: string | null;
  quality_status: string | null;
  source_series_id: string | null;
  source_reference: Record<string, unknown> | null;
}

export interface RpcResult {
  data: unknown;
  error: { message: string } | null;
}
/** One read of one key. `signal` aborts it on timeout. */
export type ProvenanceRpc = (indicatorKey: string, limit: number, signal: AbortSignal) => PromiseLike<RpcResult>;

export interface LedgerReadStats {
  /** RPC invocations including retries. */
  rpcCalls: number;
  retries: number;
  /** Keys that never produced data. */
  failedKeys: number;
  /** Wall-clock for the whole read. */
  ms: number;
}

export interface LedgerReaderOptions {
  keys?: readonly string[];
  limit?: number;
  concurrency?: number;
  timeoutMs?: number;
  /** Overall deadline for the whole read (default LEDGER_READ_DEADLINE_MS). */
  deadlineMs?: number;
  retries?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

function defaultRpc(): ProvenanceRpc {
  const supabase = createPublicDataClient();
  return (key, limit, signal) => supabase.rpc(LEDGER_PROVENANCE_RPC, { p_indicator_key: key, p_limit: limit }).abortSignal(signal);
}

function toRow(r: ProvenanceRpcRow): LedgerRow {
  return {
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
  };
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Reads every key. Never throws. */
export async function readLedgerSeries(
  rpc: ProvenanceRpc = defaultRpc(),
  options: LedgerReaderOptions = {},
): Promise<{ reads: Record<string, LedgerSeriesRead>; stats: LedgerReadStats }> {
  const keys = options.keys ?? PBS_CPI_INDICATOR_KEYS;
  const limit = options.limit ?? LEDGER_READ_LIMIT;
  const concurrency = Math.max(1, options.concurrency ?? LEDGER_READ_CONCURRENCY);
  const timeoutMs = options.timeoutMs ?? LEDGER_READ_TIMEOUT_MS;
  const retries = options.retries ?? LEDGER_READ_RETRIES;
  const sleep = options.sleep ?? defaultSleep;
  const now = options.now ?? Date.now;
  const started = now();
  const stats: LedgerReadStats = { rpcCalls: 0, retries: 0, failedKeys: 0, ms: 0 };
  const reads: Record<string, LedgerSeriesRead> = {};

  // One deadline for the whole read: aborts everything in flight and stops new attempts.
  const deadline = new AbortController();
  const deadlineTimer = setTimeout(() => deadline.abort(), options.deadlineMs ?? LEDGER_READ_DEADLINE_MS);

  async function readOne(key: string): Promise<LedgerSeriesRead> {
    let lastError = "no data returned";
    for (let attempt = 0; attempt <= retries; attempt++) {
      if (deadline.signal.aborted) {
        stats.failedKeys++;
        return { ok: false, error: "the overall read deadline was exceeded" };
      }
      stats.rpcCalls++;
      if (attempt > 0) stats.retries++;
      try {
        const { data, error } = await rpc(key, limit, AbortSignal.any([AbortSignal.timeout(timeoutMs), deadline.signal]));
        if (!error && Array.isArray(data)) {
          const rows = (data as ProvenanceRpcRow[]).map(toRow);
          return { ok: true, rows, truncated: rows.length >= limit };
        }
        lastError = error?.message ?? "no data returned";
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }
      if (attempt < retries && !deadline.signal.aborted) await sleep(RETRY_DELAY_MS * (attempt + 1));
    }
    stats.failedKeys++;
    return { ok: false, error: lastError };
  }

  // A small worker pool: at most `concurrency` reads in flight.
  let next = 0;
  async function worker(): Promise<void> {
    while (next < keys.length) {
      const key = keys[next++];
      reads[key] = await readOne(key);
    }
  }
  try {
    await Promise.all(Array.from({ length: Math.min(concurrency, keys.length) }, worker));
  } finally {
    clearTimeout(deadlineTimer);
  }
  stats.ms = now() - started;
  return { reads, stats };
}

/** Read the ledger and assemble the panel. Never throws. */
export async function readLedgerPanel(rpc?: ProvenanceRpc, options?: LedgerReaderOptions): Promise<LedgerPanelResult & { stats: LedgerReadStats }> {
  try {
    const { reads, stats } = await readLedgerSeries(rpc, options);
    return { ...assembleLedgerPanel(reads), stats };
  } catch (err) {
    // Construction of the default client can throw (missing env). That is "the ledger is unavailable", not a crash.
    const message = err instanceof Error ? err.message : String(err);
    return {
      panel: null,
      issues: [`The ledger could not be read (${message}).`],
      failureKind: "unavailable",
      provenance: null,
      grid: new Map(),
      stats: { rpcCalls: 0, retries: 0, failedKeys: PBS_CPI_INDICATOR_KEYS.length, ms: 0 },
    };
  }
}
