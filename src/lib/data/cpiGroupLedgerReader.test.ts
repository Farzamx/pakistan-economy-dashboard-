// Phase F.2e-Prep: the ledger reader's I/O behaviour, against a fake RPC. No network, no database.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { PBS_CPI_INDICATOR_KEYS } from "@/lib/providers/pbsCpiGroupsAdapter";
import { FULL_XML } from "@/lib/inflation/__fixtures__/pbsCpiVariants";
import { ledgerReadsFromXml } from "@/lib/inflation/__fixtures__/ledgerFixtures";
import type { LedgerRow } from "@/lib/inflation/ledgerPanel";

const client = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("@/lib/supabase/publicDataClient", () => ({ createPublicDataClient: client.create }));

import { LEDGER_PROVENANCE_RPC, LEDGER_READ_CONCURRENCY, LEDGER_READ_LIMIT, readLedgerPanel, readLedgerSeries, type ProvenanceRpc } from "./cpiGroupLedgerReader";

const reads = ledgerReadsFromXml(FULL_XML);
const snake = (r: LedgerRow) => ({
  observation_period: r.observationPeriod,
  value: r.value,
  unit: r.unit,
  vintage: r.vintage,
  release_date: r.releaseDate,
  source_updated_at: r.sourceUpdatedAt,
  fetched_at: r.fetchedAt,
  quality_status: r.qualityStatus,
  source_series_id: r.sourceSeriesId,
  source_reference: r.sourceReference,
});
const dataFor = (key: string) => {
  const r = reads[key];
  if (!r.ok) throw new Error("fixture");
  return r.rows.map(snake);
};
const noSleep = async () => undefined;

// Braces matter: a beforeEach that RETURNS the mock would be run by vitest as a teardown function.
beforeEach(() => {
  client.create.mockReset();
});

describe("what it asks the database", () => {
  it("makes exactly ONE read per series — 26 in total — each with the row limit, and nothing else", async () => {
    const seen: { key: string; limit: number }[] = [];
    const rpc: ProvenanceRpc = async (key, limit) => { seen.push({ key, limit }); return { data: dataFor(key), error: null }; };
    const { stats } = await readLedgerSeries(rpc, { sleep: noSleep });
    expect(seen).toHaveLength(26);
    expect(new Set(seen.map((s) => s.key))).toEqual(new Set(PBS_CPI_INDICATOR_KEYS));
    expect(seen.every((s) => s.limit === LEDGER_READ_LIMIT)).toBe(true);
    expect(stats).toMatchObject({ rpcCalls: 26, retries: 0, failedKeys: 0 });
  });

  it("through the real wiring it calls ONLY the existing public read RPC, with only its two documented arguments", async () => {
    const calls: { name: string; args: Record<string, unknown> }[] = [];
    client.create.mockReturnValue({
      rpc: (name: string, args: Record<string, unknown>) => {
        calls.push({ name, args });
        return { abortSignal: () => Promise.resolve({ data: dataFor(args.p_indicator_key as string), error: null }) };
      },
    });
    const result = await readLedgerPanel(undefined, { sleep: noSleep });
    expect(result.panel).not.toBeNull();
    expect(calls).toHaveLength(26);
    expect(new Set(calls.map((c) => c.name))).toEqual(new Set([LEDGER_PROVENANCE_RPC]));
    expect(LEDGER_PROVENANCE_RPC).toBe("get_canonical_observation_provenance");
    expect(calls.every((c) => Object.keys(c.args).sort().join() === "p_indicator_key,p_limit")).toBe(true);
    // No write RPC, no secret, can possibly be named here:
    expect(JSON.stringify(calls)).not.toMatch(/ingest_raw|resolve_canonical|log_cron|log_source|p_internal_secret/);
  });

  it("never has more than the concurrency cap in flight", async () => {
    let inFlight = 0;
    let peak = 0;
    const rpc: ProvenanceRpc = async (key) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 3));
      inFlight--;
      return { data: dataFor(key), error: null };
    };
    await readLedgerSeries(rpc, { sleep: noSleep });
    expect(peak).toBeLessThanOrEqual(LEDGER_READ_CONCURRENCY);
    expect(peak).toBeGreaterThan(1); // it IS concurrent, not 26 sequential round trips
  });

  it("gives every call an abort signal (the timeout) that has not fired", async () => {
    const signals: AbortSignal[] = [];
    const rpc: ProvenanceRpc = async (key, _l, signal) => { signals.push(signal); return { data: dataFor(key), error: null }; };
    await readLedgerSeries(rpc, { sleep: noSleep });
    expect(signals).toHaveLength(26);
    expect(signals.every((s) => s instanceof AbortSignal && !s.aborted)).toBe(true);
  });
});

describe("what it returns", () => {
  it("assembles the same panel the pure assembler does, with full-precision numbers and Number() applied to numeric strings", async () => {
    const rpc: ProvenanceRpc = async (key) => ({ data: dataFor(key).map((r) => ({ ...r, value: String(r.value) })), error: null });
    const result = await readLedgerPanel(rpc, { sleep: noSleep });
    expect(result.issues).toEqual([]);
    expect(result.panel?.months).toHaveLength(52);
    expect(result.provenance?.latestMonth).toBe("2026-10");
    expect(result.stats.rpcCalls).toBe(26);
  });

  it("flags a read that returns exactly the row limit as truncated, and the ledger is then refused", async () => {
    const rpc: ProvenanceRpc = async (key, limit) => ({ data: dataFor(key).slice(0, limit), error: null });
    const result = await readLedgerPanel(rpc, { limit: 52, sleep: noSleep });
    expect(result.panel).toBeNull();
    expect(result.issues.join(" ")).toMatch(/reached its row limit/);
    expect(result.failureKind).toBe("invalid");
  });
});

describe("failure handling — bounded, and it never throws", () => {
  it("retries a transient failure and succeeds", async () => {
    const attempts = new Map<string, number>();
    const rpc: ProvenanceRpc = async (key) => {
      const n = (attempts.get(key) ?? 0) + 1;
      attempts.set(key, n);
      if (key === "pbs:cpiGroupIndex05" && n <= 2) return { data: null, error: { message: "connection reset" } };
      return { data: dataFor(key), error: null };
    };
    const result = await readLedgerPanel(rpc, { sleep: noSleep });
    expect(result.panel).not.toBeNull();
    expect(result.stats).toMatchObject({ rpcCalls: 28, retries: 2, failedKeys: 0 });
  });

  it("a persistent failure on ONE series makes the ledger 'unavailable' after exactly 3 attempts on that series", async () => {
    const rpc: ProvenanceRpc = async (key) => (key === "pbs:cpiGroupWeight03" ? { data: null, error: { message: "boom" } } : { data: dataFor(key), error: null });
    const result = await readLedgerPanel(rpc, { sleep: noSleep });
    expect(result.panel).toBeNull();
    expect(result.failureKind).toBe("unavailable");
    expect(result.issues.join(" ")).toMatch(/pbs:cpiGroupWeight03: the ledger read failed \(boom\)/);
    expect(result.stats).toMatchObject({ rpcCalls: 25 + 3, retries: 2, failedKeys: 1 });
  });

  it("an RPC that throws, or hangs until aborted, is a failed read — not a crash", async () => {
    const rpc: ProvenanceRpc = async (key) => {
      if (key === "pbs:cpiIndexNational") throw new Error("socket hang up");
      return { data: dataFor(key), error: null };
    };
    const result = await readLedgerPanel(rpc, { sleep: noSleep });
    expect(result.failureKind).toBe("unavailable");
    expect(result.issues.join(" ")).toMatch(/socket hang up/);
  });

  it("a ledger OUTAGE (every call fails) costs a bounded number of attempts and yields 'unavailable'", async () => {
    let calls = 0;
    const rpc: ProvenanceRpc = async () => { calls++; return { data: null, error: { message: "503" } }; };
    const result = await readLedgerPanel(rpc, { sleep: noSleep });
    expect(calls).toBe(26 * 3);
    expect(result.panel).toBeNull();
    expect(result.failureKind).toBe("unavailable");
    expect(result.stats.failedKeys).toBe(26);
  });

  it("when the client itself cannot be built (missing environment), the ledger is simply unavailable", async () => {
    client.create.mockImplementation(() => { throw new Error("supabaseUrl is required."); });
    const result = await readLedgerPanel(undefined, { sleep: noSleep });
    expect(result.panel).toBeNull();
    expect(result.failureKind).toBe("unavailable");
    expect(result.issues.join(" ")).toMatch(/supabaseUrl is required/);
  });

  it("a HUNG ledger (calls that never answer) is cut off by the overall deadline: bounded time, in-flight calls aborted, no new attempts", async () => {
    let calls = 0;
    const rpc: ProvenanceRpc = (_key, _limit, signal) =>
      new Promise((_resolve, reject) => {
        calls++;
        signal.addEventListener("abort", () => reject(new Error("aborted")));
      });
    const t0 = Date.now();
    const result = await readLedgerPanel(rpc, { deadlineMs: 60, timeoutMs: 60_000, sleep: noSleep });
    expect(Date.now() - t0).toBeLessThan(2_000); // not 26 keys × 3 attempts × 60 s
    expect(calls).toBe(6); // only the first wave of workers ever made a call; the other 20 keys never started
    expect(result.panel).toBeNull();
    expect(result.failureKind).toBe("unavailable");
    expect(result.stats.failedKeys).toBe(26);
    expect(result.issues.join(" ")).toMatch(/aborted|deadline/);
  });

  it("the deadline does not interfere with a healthy read (and its timer is cleared)", async () => {
    const rpc: ProvenanceRpc = async (key) => ({ data: dataFor(key), error: null });
    const result = await readLedgerPanel(rpc, { deadlineMs: 5_000, sleep: noSleep });
    expect(result.panel).not.toBeNull();
    expect(result.stats.failedKeys).toBe(0);
  });

  it("uses an injected sleep for backoff (so tests and a future caller control the delay)", async () => {
    const delays: number[] = [];
    let n = 0;
    const rpc: ProvenanceRpc = async (key) => (key === "pbs:cpiGroupIndex01" && ++n <= 2 ? { data: null, error: { message: "x" } } : { data: dataFor(key), error: null });
    await readLedgerSeries(rpc, { sleep: async (ms) => { delays.push(ms); } });
    expect(delays).toEqual([150, 300]);
  });
});
