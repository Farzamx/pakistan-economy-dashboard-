// F.2f: one ingestion run, every outcome. In-process; no database, no network, no environment. The "integrated" cases run the
// REAL orchestrator and adapter against the in-memory ledger (plain memory with the real RPC semantics).

import { describe, expect, it, vi } from "vitest";
import type { CronRunStatus } from "@/lib/cronLogging";
import { ingestManySeries, type IngestJob, type SeriesIngestOutcome } from "./ingestionOrchestrator";
import { InMemoryLedger } from "./inMemoryLedger";
import { PBS_CPI_SERIES, createPbsCpiGroupsAdapter, type PbsCpiDataset } from "./pbsCpiGroupsAdapter";
import { parseCpiRunDetail } from "./cpiIngestionRunLog";
import { FetchGaveUpError, executeWriteRun, type WriteRunDeps } from "./pbsCpiGroupsRun";
import type { RunLock } from "./runLock";
import { FULL_XML, editSeries, reviseGroupIndex } from "@/lib/inflation/__fixtures__/pbsCpiVariants";

const NOW = new Date("2026-12-02T04:15:00Z");

interface Harness { deps: WriteRunDeps; rows: { status: CronRunStatus; detail: string }[]; released: () => number; printed: string[]; ingest: ReturnType<typeof vi.fn>; fetchFile: ReturnType<typeof vi.fn> }

function harness(over: Partial<WriteRunDeps> = {}, outcomes?: SeriesIngestOutcome[]): Harness {
  const rows: Harness["rows"] = [];
  const printed: string[] = [];
  let releases = 0;
  const lock: RunLock = { path: "x", release: () => { releases++; } };
  const allUpdated: SeriesIngestOutcome[] = PBS_CPI_SERIES.map((d) => ({ indicatorKey: d.indicatorKey, status: "updated", periodsWritten: 52, latestPeriod: "2026-10-31" }));
  const ingest = vi.fn(async () => outcomes ?? allUpdated);
  const fetchFile = vi.fn(async () => ({ text: FULL_XML, attempts: 1 }));
  const deps: WriteRunDeps = {
    now: () => NOW,
    acquireLock: () => lock,
    fetchFile,
    ingest,
    logRun: async (_s, status, detail) => { rows.push({ status, detail }); },
    print: (l) => printed.push(l),
    ...over,
  };
  return { deps, rows, released: () => releases, printed, ingest, fetchFile };
}

describe("a run that works", () => {
  it("all 26 reconciled with changes -> ONE success row, outcome=updated, with the numbers and the file's Prepared time", async () => {
    const h = harness();
    const r = await executeWriteRun(h.deps);
    expect(r).toMatchObject({ exitCode: 0, outcome: "updated", status: "success" });
    expect(h.rows).toHaveLength(1);
    expect(h.rows[0].status).toBe("success");
    expect(parseCpiRunDetail(h.rows[0].detail)).toMatchObject({ format: "v1", outcome: "updated", series: 26, updated: 26, unchanged: 0, failed: 0, periodsWritten: 1352, latest: "2026-10", attempts: 1, prepared: "2026-11-03T06:38:35.000Z" });
    expect(h.released()).toBe(1);
  });

  it("nothing new -> ONE success row, outcome=unchanged: a run that found nothing new is healthy, and says so", async () => {
    const unchanged: SeriesIngestOutcome[] = PBS_CPI_SERIES.map((d) => ({ indicatorKey: d.indicatorKey, status: "unchanged", periodsWritten: 0, latestPeriod: "2026-10-31" }));
    const h = harness({}, unchanged);
    const r = await executeWriteRun(h.deps);
    expect(r).toMatchObject({ exitCode: 0, outcome: "unchanged", status: "success" });
    expect(parseCpiRunDetail(h.rows[0].detail)).toMatchObject({ outcome: "unchanged", updated: 0, unchanged: 26, periodsWritten: 0, latest: "2026-10" });
  });
});

describe("a run that fails leaves a row — the watchdog must never be told nothing", () => {
  it("PBS unreachable after the retries -> failure row, outcome=pbs-unavailable, attempts recorded, ingest NEVER called", async () => {
    const h = harness({ fetchFile: async () => { throw new FetchGaveUpError("PBS CPI file request returned HTTP 503.", 3); } });
    const r = await executeWriteRun(h.deps);
    expect(r).toMatchObject({ exitCode: 1, outcome: "pbs-unavailable", status: "failure" });
    expect(h.rows).toHaveLength(1);
    expect(parseCpiRunDetail(h.rows[0].detail)).toMatchObject({ outcome: "pbs-unavailable", attempts: 3 });
    expect(h.rows[0].detail).toMatch(/HTTP 503/);
    expect(h.ingest).not.toHaveBeenCalled();
    expect(h.released()).toBe(1);
  });

  it("file fetched but REJECTED by validation -> failure row naming the failed checks; nothing is ingested", async () => {
    const tampered = editSeries(FULL_XML, "PCPI_CP_04_IX", (m, v) => (m === "2025-06" ? String(Number(v) + 5) : v));
    const h = harness({ fetchFile: async () => ({ text: tampered, attempts: 2 }) });
    const r = await executeWriteRun(h.deps);
    expect(r).toMatchObject({ exitCode: 1, outcome: "rejected", status: "failure" });
    expect(parseCpiRunDetail(h.rows[0].detail)).toMatchObject({ outcome: "rejected", attempts: 2 });
    expect(h.rows[0].detail).toMatch(/validation failed: laspeyres/); // the check's id, not its prose label
    expect(h.ingest).not.toHaveBeenCalled();
  });

  it("garbage instead of XML is rejected, not ingested", async () => {
    const h = harness({ fetchFile: async () => ({ text: "<html>Service Unavailable</html>", attempts: 1 }) });
    const r = await executeWriteRun(h.deps);
    expect(r.outcome).toBe("rejected");
    expect(h.ingest).not.toHaveBeenCalled();
  });

  it("25 of 26 series succeed -> a FAILURE row, outcome=partial, naming the series that failed (a half-ingested month is never 'success')", async () => {
    const outcomes: SeriesIngestOutcome[] = PBS_CPI_SERIES.map((d, i) =>
      i === 3 ? { indicatorKey: d.indicatorKey, status: "failed", periodsWritten: 0, error: "resolve_canonical_observation failed: timeout" } : { indicatorKey: d.indicatorKey, status: "updated", periodsWritten: 1, latestPeriod: "2026-11-30" },
    );
    const h = harness({}, outcomes);
    const r = await executeWriteRun(h.deps);
    expect(r).toMatchObject({ exitCode: 1, outcome: "partial", status: "failure" });
    expect(parseCpiRunDetail(h.rows[0].detail)).toMatchObject({ outcome: "partial", series: 26, updated: 25, failed: 1, failedKeys: ["pbs:cpiGroupIndex03"], latest: "2026-11" });
  });

  it("an unexpected exception -> failure row, outcome=error, the message sanitised (no URL can reach the log)", async () => {
    const h = harness({}, undefined);
    h.deps.ingest = async () => { throw new Error("connect ECONNREFUSED https://abc.supabase.co/rest/v1/rpc?apikey=SECRET"); };
    const r = await executeWriteRun(h.deps);
    expect(r).toMatchObject({ exitCode: 1, outcome: "error", status: "failure" });
    expect(h.rows[0].detail).not.toMatch(/https?:|SECRET=/);
    expect(h.released()).toBe(1);
  });
});

describe("overlapping runs", () => {
  it("when another run holds the lock this one does nothing: no fetch, no ingest, one SKIPPED row, exit 0", async () => {
    const h = harness({ acquireLock: () => null });
    const r = await executeWriteRun(h.deps);
    expect(r).toMatchObject({ exitCode: 0, outcome: "busy", status: "skipped" });
    expect(h.fetchFile).not.toHaveBeenCalled();
    expect(h.ingest).not.toHaveBeenCalled();
    expect(h.rows).toEqual([{ status: "skipped", detail: expect.stringMatching(/outcome=busy/) }]);
  });

  it("the lock is released on EVERY path, and only after the row is written", async () => {
    const order: string[] = [];
    const lock: RunLock = { path: "x", release: () => { order.push("release"); } };
    const h = harness({ acquireLock: () => lock, logRun: async () => { await Promise.resolve(); order.push("logged"); } });
    h.deps.ingest = async () => { throw new Error("boom"); };
    await executeWriteRun(h.deps);
    expect(order).toEqual(["logged", "release"]);
  });
});

describe("robustness", () => {
  it("a failure to WRITE the log row does not change the run's outcome or throw (the watchdog then sees no row, and says so)", async () => {
    const h = harness({ logRun: async () => { throw new Error("rpc down"); } });
    const r = await executeWriteRun(h.deps);
    expect(r).toMatchObject({ exitCode: 0, outcome: "updated" });
    expect(h.printed.join("\n")).toMatch(/could not write the cron_run_log row: rpc down/);
  });

  it("prints the same detail it logs (so the operator's console and the log agree)", async () => {
    const h = harness();
    const r = await executeWriteRun(h.deps);
    expect(h.printed).toContain(`[ingest:pbscpigroups] ${r.detail}`);
  });
});

describe("integrated: the REAL orchestrator and adapter on the in-memory ledger", () => {
  function realDeps(ledger: InMemoryLedger, xml: string): WriteRunDeps {
    const h = harness({
      fetchFile: async () => ({ text: xml, attempts: 1 }),
      ingest: async (dataset: PbsCpiDataset) => {
        const adapter = createPbsCpiGroupsAdapter(dataset);
        const jobs: IngestJob[] = PBS_CPI_SERIES.map((d) => ({ adapter, indicatorKey: d.indicatorKey }));
        return ingestManySeries(ledger.asClient(), ledger.secret, "run-1", jobs, { concurrency: 3 });
      },
    });
    return { ...h.deps, logRun: async () => undefined };
  }

  it("first run -> updated (1,352 observations); the very next run -> unchanged with ZERO periods written", async () => {
    const ledger = new InMemoryLedger("test");
    const first = await executeWriteRun(realDeps(ledger, FULL_XML));
    expect(parseCpiRunDetail(first.detail)).toMatchObject({ outcome: "updated", updated: 26, failed: 0, periodsWritten: 1352, latest: "2026-10" });
    const second = await executeWriteRun(realDeps(ledger, FULL_XML));
    expect(parseCpiRunDetail(second.detail)).toMatchObject({ outcome: "unchanged", updated: 0, unchanged: 26, periodsWritten: 0 });
    expect(second.status).toBe("success");
    expect(ledger.counters.rawInserted).toBe(1352); // the second run wrote nothing
  });

  it("a coherent revision -> updated, with exactly the revised periods written", async () => {
    const ledger = new InMemoryLedger("test");
    await executeWriteRun(realDeps(ledger, FULL_XML));
    const third = await executeWriteRun(realDeps(ledger, reviseGroupIndex(FULL_XML, 7, "2026-09", 0.25)));
    expect(parseCpiRunDetail(third.detail)).toMatchObject({ outcome: "updated", updated: 2, periodsWritten: 2 });
  });

  it("RECOVERY: a failed run, then a good one, then nothing new — the log tells the story and the ledger ends consistent", async () => {
    const ledger = new InMemoryLedger("test");
    const down = harness({ fetchFile: async () => { throw new FetchGaveUpError("HTTP 503", 3); } });
    const r1 = await executeWriteRun(down.deps);
    const r2 = await executeWriteRun(realDeps(ledger, FULL_XML));
    const r3 = await executeWriteRun(realDeps(ledger, FULL_XML));
    expect([r1.outcome, r2.outcome, r3.outcome]).toEqual(["pbs-unavailable", "updated", "unchanged"]);
    expect([r1.status, r2.status, r3.status]).toEqual(["failure", "success", "success"]);
    expect(ledger.current()).toHaveLength(1352);
  });
});
