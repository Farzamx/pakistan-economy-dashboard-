// A stateful, in-memory stand-in for the observation ledger's RPC surface.
//
// WHY THIS EXISTS
// Dry-run needs to answer "what WOULD a real run do?" — how many rows are new, how
// many are revisions, whether a second run would change anything — and that depends
// on state (what is already there). The existing tests use stateless `vi.fn()` mocks,
// which cannot tell a first run from a second. This models the real ledger's RPC
// semantics (supabase/migrations/0050 and 0051) closely enough to drive the REAL,
// unmodified ingestionOrchestrator against it:
//
//   ingest_raw_observation      append-only; skipped when the latest raw row for
//                               (key, provider, period) already has the same value+unit
//   resolve_canonical_observation
//                               unchanged value+unit -> no-op; otherwise the current row
//                               is SUPERSEDED (superseded_at set) and a new row inserted;
//                               a value is never updated in place
//   get_canonical_observation_history
//                               current (non-superseded) rows, newest period first
//
// Like the real schema it offers NO way to delete a row or update a value, and the
// write RPCs are gated by the same shared-secret check. Any RPC it does not model
// (including cron-log writes) throws, so a dry run can never quietly depend on one.
//
// It is plain TypeScript: it opens no connection and imports no database client.

import type { SupabaseClient } from "@supabase/supabase-js";

export interface RawRow {
  id: string;
  indicator_key: string;
  provider: string;
  observation_period: string;
  value: number;
  unit: string;
  series_name: string | null;
  raw_payload: unknown;
  ingested_at: string;
  ingestion_run_id: string | null;
}

export interface CanonicalRow {
  id: string;
  indicator_key: string;
  observation_period: string;
  value: number;
  unit: string;
  series_name: string | null;
  source_provider: string;
  source_raw_observation_id: string | null;
  vintage: string;
  superseded_at: string | null;
  confidence: string;
  release_date: string | null;
  source_updated_at: string | null;
  fetched_at: string | null;
  quality_status: string | null;
  source_series_id: string | null;
  source_reference: Record<string, unknown> | null;
}

export interface KeyStats {
  /** Periods that had no current row and got one. */
  newPeriods: number;
  /** Periods whose current row was superseded by a different value. */
  revisedPeriods: number;
  rawInserted: number;
}

export interface LedgerCounters {
  rawInserted: number;
  rawSkipped: number;
  canonicalInserted: number;
  canonicalSuperseded: number;
  canonicalUnchanged: number;
  /** Every RPC call received, by name. */
  rpcCalls: Record<string, number>;
}

type RpcResult = { data: unknown; error: { message: string } | null };

export class InMemoryLedger {
  readonly raw: RawRow[] = [];
  readonly canonical: CanonicalRow[] = [];
  readonly stats = new Map<string, KeyStats>();
  readonly counters: LedgerCounters = { rawInserted: 0, rawSkipped: 0, canonicalInserted: 0, canonicalSuperseded: 0, canonicalUnchanged: 0, rpcCalls: {} };

  private seq = 0;
  private tick = 0;

  /** `secret` is what the write RPCs require, standing in for NOTIFICATION_WORKER_SECRET. */
  constructor(readonly secret: string = "test-secret") {}

  /** Monotonic timestamps: deterministic ordering with no wall-clock dependence. */
  private now(): string {
    return new Date(Date.UTC(2026, 10, 6, 0, 0, 0) + this.tick++ * 1000).toISOString();
  }
  private id(prefix: string): string {
    return `${prefix}-${++this.seq}`;
  }
  private statsFor(key: string): KeyStats {
    let s = this.stats.get(key);
    if (!s) this.stats.set(key, (s = { newPeriods: 0, revisedPeriods: 0, rawInserted: 0 }));
    return s;
  }

  /** The RPC surface the orchestrator uses. */
  async rpc(name: string, args: Record<string, unknown> = {}): Promise<RpcResult> {
    this.counters.rpcCalls[name] = (this.counters.rpcCalls[name] ?? 0) + 1;
    try {
      switch (name) {
        case "get_canonical_observation_history":
          return { data: this.history(String(args.p_indicator_key), Number(args.p_limit ?? 500)), error: null };
        case "ingest_raw_observation":
          return { data: this.ingestRaw(args), error: null };
        case "resolve_canonical_observation":
          return { data: this.resolveCanonical(args), error: null };
        default:
          throw new Error(`InMemoryLedger does not model RPC "${name}"`);
      }
    } catch (e) {
      // Mirror PostgREST: an RPC that raises comes back as { error }. The orchestrator turns it into a throw.
      return { data: null, error: { message: e instanceof Error ? e.message : String(e) } };
    }
  }

  private authorize(args: Record<string, unknown>): void {
    if (args.p_internal_secret !== this.secret) throw new Error("unauthorized");
  }

  private history(key: string, limit: number) {
    return this.canonical
      .filter((r) => r.indicator_key === key && r.superseded_at === null)
      .sort((a, b) => (a.observation_period < b.observation_period ? 1 : a.observation_period > b.observation_period ? -1 : 0))
      .slice(0, limit)
      .map((r) => ({ observation_period: r.observation_period, value: r.value, unit: r.unit, series_name: r.series_name, source_provider: r.source_provider, vintage: r.vintage, confidence: r.confidence }));
  }

  private ingestRaw(a: Record<string, unknown>) {
    this.authorize(a);
    const key = String(a.p_indicator_key);
    const provider = String(a.p_provider);
    const period = String(a.p_observation_period);
    const latest = [...this.raw].reverse().find((r) => r.indicator_key === key && r.provider === provider && r.observation_period === period);
    if (latest && latest.value === Number(a.p_value) && latest.unit === a.p_unit) {
      this.counters.rawSkipped++;
      return { success: true, inserted: false, raw_observation_id: latest.id };
    }
    const row: RawRow = {
      id: this.id("raw"),
      indicator_key: key,
      provider,
      observation_period: period,
      value: Number(a.p_value),
      unit: String(a.p_unit),
      series_name: (a.p_series_name as string | null) ?? null,
      raw_payload: a.p_raw_payload ?? null,
      ingested_at: this.now(),
      ingestion_run_id: (a.p_ingestion_run_id as string | null) ?? null,
    };
    this.raw.push(row);
    this.counters.rawInserted++;
    this.statsFor(key).rawInserted++;
    return { success: true, inserted: true, raw_observation_id: row.id };
  }

  private resolveCanonical(a: Record<string, unknown>) {
    this.authorize(a);
    const key = String(a.p_indicator_key);
    const period = String(a.p_observation_period);
    const value = Number(a.p_value);
    const current = this.canonical.find((r) => r.indicator_key === key && r.observation_period === period && r.superseded_at === null);
    if (current && current.value === value && current.unit === a.p_unit) {
      this.counters.canonicalUnchanged++;
      return { success: true, changed: false, canonical_id: current.id };
    }
    const at = this.now();
    if (current) {
      current.superseded_at = at; // supersede; the value of the old row is never touched
      this.counters.canonicalSuperseded++;
      this.statsFor(key).revisedPeriods++;
    } else {
      this.statsFor(key).newPeriods++;
    }
    const row: CanonicalRow = {
      id: this.id("canon"),
      indicator_key: key,
      observation_period: period,
      value,
      unit: String(a.p_unit),
      series_name: (a.p_series_name as string | null) ?? null,
      source_provider: String(a.p_source_provider),
      source_raw_observation_id: (a.p_source_raw_observation_id as string | null) ?? null,
      vintage: at,
      superseded_at: null,
      confidence: String(a.p_confidence ?? "official"),
      release_date: (a.p_release_date as string | null) ?? null,
      source_updated_at: (a.p_source_updated_at as string | null) ?? null,
      fetched_at: (a.p_fetched_at as string | null) ?? null,
      quality_status: (a.p_quality_status as string | null) ?? null,
      source_series_id: (a.p_source_series_id as string | null) ?? null,
      source_reference: (a.p_source_reference as Record<string, unknown> | null) ?? null,
    };
    this.canonical.push(row);
    this.counters.canonicalInserted++;
    return { success: true, changed: true, canonical_id: row.id, previous_id: current?.id ?? null };
  }

  /** Rows that are the current best value for their period. */
  current(key?: string): CanonicalRow[] {
    return this.canonical.filter((r) => r.superseded_at === null && (key === undefined || r.indicator_key === key));
  }

  /** All vintages of one period, oldest first — current and superseded. */
  vintages(key: string, period: string): CanonicalRow[] {
    return this.canonical.filter((r) => r.indicator_key === key && r.observation_period === period);
  }

  /** Total number of write RPCs received so far. */
  get writeCalls(): number {
    return (this.counters.rpcCalls["ingest_raw_observation"] ?? 0) + (this.counters.rpcCalls["resolve_canonical_observation"] ?? 0);
  }

  /**
   * Pre-load rows that already exist in a REAL ledger (read through its public read
   * RPC), so a dry run can compare against the real current state. They enter as
   * ordinary current rows; no raw history is invented for them.
   */
  seed(indicatorKey: string, rows: readonly { observation_period: string; value: number; unit: string; series_name?: string | null; source_provider?: string }[]): void {
    for (const r of rows) {
      this.canonical.push({
        id: this.id("seed"),
        indicator_key: indicatorKey,
        observation_period: r.observation_period,
        value: Number(r.value),
        unit: r.unit,
        series_name: r.series_name ?? null,
        source_provider: r.source_provider ?? "seeded-from-live-read",
        source_raw_observation_id: null,
        vintage: this.now(),
        superseded_at: null,
        confidence: "official",
        release_date: null,
        source_updated_at: null,
        fetched_at: null,
        quality_status: null,
        source_series_id: null,
        source_reference: null,
      });
    }
  }

  /** The orchestrator's client type. The cast is the single point where this fake is passed off as a client. */
  asClient(): SupabaseClient {
    return { rpc: (name: string, args?: Record<string, unknown>) => this.rpc(name, args) } as unknown as SupabaseClient;
  }
}
