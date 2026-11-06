// F.2b: idempotency, vintage preservation and all-or-nothing behaviour, verified by
// running the REAL, unmodified ingestion orchestrator against a stateful in-memory
// ledger that obeys the real RPC semantics (supabase/migrations 0050 + 0051).
//
// Nothing here can reach a database: @supabase/supabase-js is replaced by a module
// whose createClient THROWS, so any code path that tried to open a real connection
// would fail the test, and a test asserts it was never called.

import { beforeEach, describe, expect, it, vi } from "vitest";

const createClient = vi.hoisted(() => vi.fn(() => { throw new Error("a real Supabase client must never be created in these tests"); }));
vi.mock("@supabase/supabase-js", () => ({ createClient }));

import { ingestManySeries } from "./ingestionOrchestrator";
import { InMemoryLedger } from "./inMemoryLedger";
import { PBS_CPI_FILE_URL, PBS_CPI_INDICATOR_KEYS, PBS_CPI_SERIES, createPbsCpiGroupsAdapter, loadPbsCpiDataset } from "./pbsCpiGroupsAdapter";
import { formatDryRunReport, runPbsCpiDryRun, seedLedgerFrom } from "./pbsCpiGroupsIngestion";
import { FULL_XML, editSeries, reviseGroupIndex, withoutMonth } from "@/lib/inflation/__fixtures__/pbsCpiVariants";

beforeEach(() => {
  createClient.mockClear(); // braces matter: a function RETURNED from beforeEach is run as a teardown
});

describe("1. the first run prepares the full historical backfill", () => {
  it("plans exactly 1,352 observations: 26 series × 52 months, all new", async () => {
    const r = await runPbsCpiDryRun({ xml: FULL_XML });
    expect(r.ok).toBe(true);
    expect(r.plan.totals).toMatchObject({ seriesInSource: 26, observationsInSource: 1352, newPeriods: 1352, revisedPeriods: 0, rawInserts: 1352, canonicalInserts: 1352, seriesUpdated: 26, seriesUnchanged: 0, seriesFailed: 0 });
  });

  it("covers every series with 52 periods from 2022-07-31 to 2026-10-31", async () => {
    const r = await runPbsCpiDryRun({ xml: FULL_XML });
    for (const s of r.plan.series) {
      expect(s.observationsInSource, s.indicatorKey).toBe(52);
      expect(s.newPeriods, s.indicatorKey).toBe(52);
      expect(s.firstPeriod, s.indicatorKey).toBe("2022-07-31");
      expect(s.lastPeriod, s.indicatorKey).toBe("2026-10-31");
    }
    expect(r.plan.series.map((s) => s.indicatorKey)).toEqual([...PBS_CPI_INDICATOR_KEYS]);
  });

  it("leaves the in-memory ledger holding one current row per (series, month)", async () => {
    const r = await runPbsCpiDryRun({ xml: FULL_XML });
    expect(r.ledger!.current()).toHaveLength(1352);
    expect(new Set(r.ledger!.current().map((c) => `${c.indicator_key}|${c.observation_period}`)).size).toBe(1352);
  });

  it("states that the real database was written 0 times", async () => {
    const r = await runPbsCpiDryRun({ xml: FULL_XML });
    expect(r.writesToRealDatabase).toBe(0);
    expect(formatDryRunReport(r).join("\n")).toContain("DATABASE WRITES: 0");
  });

  it("is deterministic: two fresh dry runs produce identical plans", async () => {
    const a = await runPbsCpiDryRun({ xml: FULL_XML });
    const b = await runPbsCpiDryRun({ xml: FULL_XML });
    expect(b.plan).toEqual(a.plan);
  });
});

describe("2. a second run identifies zero changed observations", () => {
  it("every series is unchanged and NO write is attempted at all", async () => {
    const ledger = new InMemoryLedger("dry-run");
    await runPbsCpiDryRun({ xml: FULL_XML, ledger });
    const writesAfterFirst = ledger.writeCalls;
    const rowsAfterFirst = { raw: ledger.raw.length, canonical: ledger.canonical.length };
    expect(writesAfterFirst).toBe(2704); // 1,352 raw + 1,352 canonical

    const second = await runPbsCpiDryRun({ xml: FULL_XML, ledger });
    expect(second.plan.totals).toMatchObject({ seriesUnchanged: 26, seriesUpdated: 0, seriesFailed: 0 });
    // The plan describes THIS run only: the first run's 1,352 inserts must not leak into the second run's plan.
    expect(second.plan.totals).toMatchObject({ newPeriods: 0, revisedPeriods: 0, rawInserts: 0, canonicalInserts: 0 });
    expect(ledger.writeCalls).toBe(writesAfterFirst); // not one extra write RPC
    expect(ledger.raw.length).toBe(rowsAfterFirst.raw);
    expect(ledger.canonical.length).toBe(rowsAfterFirst.canonical);
  });

  it("holds across many repeated runs", async () => {
    const ledger = new InMemoryLedger("dry-run");
    await runPbsCpiDryRun({ xml: FULL_XML, ledger });
    for (let i = 0; i < 4; i++) await runPbsCpiDryRun({ xml: FULL_XML, ledger });
    expect(ledger.canonical).toHaveLength(1352);
    expect(ledger.raw).toHaveLength(1352);
  });
});

describe("3. a revised value is a new vintage; the old one is preserved", () => {
  const REVISED = reviseGroupIndex(FULL_XML, 3, "2026-09", 1); // group 3 +1.0 in Sep 2026; headline moves with it

  it("identifies exactly the two revised observations (the group index and the headline) and nothing else", async () => {
    const ledger = new InMemoryLedger("dry-run");
    await runPbsCpiDryRun({ xml: FULL_XML, ledger });
    const second = await runPbsCpiDryRun({ xml: REVISED, ledger });
    expect(second.plan.totals).toMatchObject({ newPeriods: 0, revisedPeriods: 2, seriesUpdated: 2, seriesUnchanged: 24, seriesFailed: 0 });
    expect(second.plan.totals).toMatchObject({ rawInserts: 2, canonicalInserts: 2 }); // two new vintages, not 1,354
    expect(second.plan.series.filter((s) => s.revisedPeriods > 0).map((s) => s.indicatorKey).sort()).toEqual(["pbs:cpiGroupIndex03", "pbs:cpiIndexNational"]);
  });

  it("keeps the superseded row: both vintages exist, the old value untouched, the new one current", async () => {
    const ledger = new InMemoryLedger("dry-run");
    await runPbsCpiDryRun({ xml: FULL_XML, ledger });
    const before = ledger.vintages("pbs:cpiGroupIndex03", "2026-09-30")[0].value;
    await runPbsCpiDryRun({ xml: REVISED, ledger });

    const v = ledger.vintages("pbs:cpiGroupIndex03", "2026-09-30");
    expect(v).toHaveLength(2);
    expect(v[0].value).toBe(before); // never overwritten
    expect(v[0].superseded_at).not.toBeNull();
    expect(v[1].value).toBe(before + 1);
    expect(v[1].superseded_at).toBeNull();
    expect(v[1].vintage > v[0].vintage).toBe(true);
    expect(ledger.current("pbs:cpiGroupIndex03").filter((r) => r.observation_period === "2026-09-30")).toHaveLength(1);
  });

  it("appends to the raw ledger (never edits it) and links the new canonical row to its new raw row", async () => {
    const ledger = new InMemoryLedger("dry-run");
    await runPbsCpiDryRun({ xml: FULL_XML, ledger });
    await runPbsCpiDryRun({ xml: REVISED, ledger });
    expect(ledger.raw).toHaveLength(1354);
    expect(ledger.canonical).toHaveLength(1354);
    expect(ledger.current()).toHaveLength(1352);
    const cur = ledger.current("pbs:cpiGroupIndex03").find((r) => r.observation_period === "2026-09-30")!;
    expect(ledger.raw.find((r) => r.id === cur.source_raw_observation_id)!.value).toBe(cur.value);
  });

  it("a revision that is NOT internally consistent is refused outright (the identity breaks)", async () => {
    const ledger = new InMemoryLedger("dry-run");
    await runPbsCpiDryRun({ xml: FULL_XML, ledger });
    const calls = ledger.counters.rpcCalls["resolve_canonical_observation"];
    const bad = editSeries(FULL_XML, "PCPI_CP_03_IX", (m, v) => (m === "2026-09" ? String(Number(v) + 1) : v)); // group moved, headline not
    const r = await runPbsCpiDryRun({ xml: bad, ledger });
    expect(r.ok).toBe(false);
    expect(ledger.counters.rpcCalls["resolve_canonical_observation"]).toBe(calls);
    expect(ledger.canonical).toHaveLength(1352);
  });
});

describe("4. a new month adds exactly 26 observations", () => {
  it("ingesting the October edition after the September edition adds 26 new periods, 0 revisions", async () => {
    const september = withoutMonth(FULL_XML, "2026-10"); // a real, consistent earlier edition of the file
    const ledger = new InMemoryLedger("dry-run");
    const first = await runPbsCpiDryRun({ xml: september, ledger });
    expect(first.plan.totals.observationsInSource).toBe(26 * 51);

    const second = await runPbsCpiDryRun({ xml: FULL_XML, ledger });
    expect(second.plan.totals).toMatchObject({ newPeriods: 26, revisedPeriods: 0, seriesUpdated: 26, seriesUnchanged: 0 });
    expect(second.plan.totals).toMatchObject({ rawInserts: 26, canonicalInserts: 26 }); // this run's 26, not 1,352 + 26
    for (const s of second.plan.series) expect(s.newPeriods, s.indicatorKey).toBe(1);
    expect(ledger.canonical).toHaveLength(26 * 52);
    expect(ledger.canonical.filter((c) => c.observation_period === "2026-10-31")).toHaveLength(26);
  });
});

describe("5. invalid source data prepares zero writes and never reaches the ledger", () => {
  const tampered = editSeries(FULL_XML, "PCPI_CP_04_IX", (m, v) => (m === "2025-06" ? String(Number(v) + 5) : v));

  it("reports the rejection, no dataset, no plan, no ledger", async () => {
    const r = await runPbsCpiDryRun({ xml: tampered });
    expect(r.ok).toBe(false);
    expect(r.dataset).toBeNull();
    expect(r.ledger).toBeNull();
    expect(r.plan.totals).toMatchObject({ observationsInSource: 0, rawInserts: 0, canonicalInserts: 0, seriesUpdated: 0 });
    expect(formatDryRunReport(r).join("\n")).toMatch(/file REJECTED[\s\S]*zero observations prepared/);
  });

  it("does not touch a supplied ledger — not even to read from it — and never runs the seed", async () => {
    const ledger = new InMemoryLedger("dry-run");
    const seed = vi.fn(async () => {});
    await runPbsCpiDryRun({ xml: tampered, ledger, seed });
    expect(Object.keys(ledger.counters.rpcCalls)).toHaveLength(0);
    expect(ledger.canonical).toHaveLength(0);
    expect(seed).not.toHaveBeenCalled();
  });
});

describe("6. a partially missing series rejects the complete batch", () => {
  it("one weight series short of one month: 25 perfectly good series are still NOT prepared", async () => {
    const xml = editSeries(FULL_XML, "PCPI_CP_06_WT", (m, v) => (m === "2025-08" ? null : v));
    const ledger = new InMemoryLedger("dry-run");
    const r = await runPbsCpiDryRun({ xml, ledger });
    expect(r.ok).toBe(false);
    expect(r.plan.totals.observationsInSource).toBe(0);
    expect(ledger.writeCalls).toBe(0);
    expect(Object.keys(ledger.counters.rpcCalls)).toHaveLength(0);
  });

  it("the newest month absent from one index series: nothing is prepared for any series", async () => {
    const xml = editSeries(FULL_XML, "PCPI_CP_11_IX", (m, v) => (m === "2026-10" ? null : v));
    const r = await runPbsCpiDryRun({ xml });
    expect(r.ok).toBe(false);
    expect(r.ledger).toBeNull();
  });
});

describe("7. source provenance survives into the ledger", () => {
  it("every canonical row carries the file's Prepared timestamp, source series id, quality, null release date and a fetch time", async () => {
    const r = await runPbsCpiDryRun({ xml: FULL_XML });
    for (const c of r.ledger!.current()) {
      const def = PBS_CPI_SERIES.find((d) => d.indicatorKey === c.indicator_key)!;
      expect(c.source_provider).toBe("pbs-sdmx");
      expect(c.source_series_id).toBe(def.sdmxIndicator);
      expect(c.source_updated_at).toBe("2026-11-03T06:38:35.000Z");
      expect(c.quality_status).toBe("official");
      expect(c.release_date).toBeNull();
      expect(c.fetched_at).not.toBeNull();
      expect(c.source_reference).toMatchObject({ file: PBS_CPI_FILE_URL, basePeriod: "2015/2016", dataSetId: "2c92d746-2c93-4d9e-807e-38a79b797c10", sdmxIndicator: def.sdmxIndicator });
    }
  });

  it("links each canonical row to a raw row holding the same value", async () => {
    const r = await runPbsCpiDryRun({ xml: FULL_XML });
    const rawById = new Map(r.ledger!.raw.map((x) => [x.id, x]));
    for (const c of r.ledger!.current()) {
      const raw = rawById.get(c.source_raw_observation_id as string);
      expect(raw, `${c.indicator_key}@${c.observation_period}`).toBeDefined();
      expect(raw!.value).toBe(c.value);
      expect(raw!.provider).toBe("pbs-sdmx");
    }
  });
});

describe("8. no real Supabase client or database connection is used", () => {
  it("none is created across a full run, a re-run, a revision and a rejection", async () => {
    const ledger = new InMemoryLedger("dry-run");
    await runPbsCpiDryRun({ xml: FULL_XML, ledger });
    await runPbsCpiDryRun({ xml: FULL_XML, ledger });
    await runPbsCpiDryRun({ xml: reviseGroupIndex(FULL_XML, 5, "2026-10", 0.5), ledger });
    await runPbsCpiDryRun({ xml: "<garbage/>" });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("the ledger only answers the RPCs the orchestrator uses: anything else (a cron-log write, say) is an error", async () => {
    const ledger = new InMemoryLedger("dry-run");
    const res = await ledger.rpc("log_cron_run", {});
    expect(res.error?.message).toMatch(/does not model RPC "log_cron_run"/);
  });

  it("the ledger offers no way to delete or edit a row — only the append/supersede RPCs exist", () => {
    const methods = Object.getOwnPropertyNames(InMemoryLedger.prototype);
    expect(methods.some((m) => /delete|remove|update|truncate|clear/i.test(m))).toBe(false);
  });
});

describe("orchestrator safety is intact", () => {
  it("a write without the right secret is refused: every series fails and nothing is written", async () => {
    const { dataset } = loadPbsCpiDataset(FULL_XML);
    const ledger = new InMemoryLedger("the-real-secret");
    const adapter = createPbsCpiGroupsAdapter(dataset!);
    const jobs = PBS_CPI_SERIES.map((d) => ({ adapter, indicatorKey: d.indicatorKey }));
    const outcomes = await ingestManySeries(ledger.asClient(), "WRONG", "run", jobs, { maxRetries: 0, retryBaseDelayMs: 0 });
    expect(outcomes.every((o) => o.status === "failed")).toBe(true);
    expect(outcomes[0].error).toMatch(/unauthorized/);
    expect(ledger.canonical).toHaveLength(0);
    expect(ledger.raw).toHaveLength(0);
  });
});

describe("live-read seeding compares against what the real ledger already holds", () => {
  it("a ledger already holding the same data yields 0 changes", async () => {
    const first = await runPbsCpiDryRun({ xml: FULL_XML });
    const read = async (key: string) => first.ledger!.current(key).map((c) => ({ observation_period: c.observation_period, value: c.value, unit: c.unit }));
    const r = await runPbsCpiDryRun({ xml: FULL_XML, seed: (l) => seedLedgerFrom(l, read).then(() => {}) });
    expect(r.plan.totals).toMatchObject({ newPeriods: 0, revisedPeriods: 0, seriesUnchanged: 26 });
  });

  it("a ledger holding an older value reveals exactly that revision", async () => {
    const first = await runPbsCpiDryRun({ xml: FULL_XML });
    const read = async (key: string) =>
      first.ledger!.current(key).map((c) => ({ observation_period: c.observation_period, value: key === "pbs:cpiGroupWeight01" && c.observation_period === "2026-10-31" ? c.value + 0.001 : c.value, unit: c.unit }));
    const r = await runPbsCpiDryRun({ xml: FULL_XML, seed: (l) => seedLedgerFrom(l, read).then(() => {}) });
    expect(r.plan.totals).toMatchObject({ revisedPeriods: 1, seriesUpdated: 1, seriesUnchanged: 25 });
  });

  it("an empty real ledger means a full first-run backfill", async () => {
    const r = await runPbsCpiDryRun({ xml: FULL_XML, seed: (l) => seedLedgerFrom(l, async () => []).then(() => {}) });
    expect(r.plan.totals.newPeriods).toBe(1352);
  });
});
