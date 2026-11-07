// Final Inflation milestone: what the page says about where its CPI-group data came from and how fresh each part is.
//
// The decisions below are REAL: panelSource.selectPanel over the real ledger assembler's verdicts and the real PBS parser's
// panel, and the run evidence is the real evaluateCpiRunEvidence over real-format cron_run_log rows. Only the clock and the
// rows are fixed. The point under test is that the six freshness facts stay SEPARATE and that no fact is invented.

import { describe, expect, it } from "vitest";
import { assembleLedgerPanel, type LedgerPanelResult } from "./ledgerPanel";
import { parseCpiGroupPanel, type CpiGroupPanel } from "./pbsGroups";
import { selectPanel, type PbsPanelResult } from "./panelSource";
import { buildGroupSourceInfo, fallbackNotice, type GroupSourceInfo } from "./groupSource";
import { FULL_XML } from "./__fixtures__/pbsCpiVariants";
import { FETCHED_AT, PREPARED, asReads, dropKey, dropMonth, ledgerReadsFromXml } from "./__fixtures__/ledgerFixtures";
import { evaluateCpiRunEvidence } from "@/lib/cpiIngestionMonitor";
import { formatCpiRunDetail } from "@/lib/providers/cpiIngestionRunLog";
import type { CronRunRecord } from "@/lib/cronLogging";

const CURRENT = new Date("2026-11-15T12:00:00Z"); // previous calendar month = 2026-10
const NEXT_MONTH = new Date("2026-12-05T08:00:00Z"); // previous calendar month = 2026-11
const GENERATED = "2026-11-15T12:00:00.000Z";

const ledgerOk: LedgerPanelResult = assembleLedgerPanel(asReads(ledgerReadsFromXml(FULL_XML)));
// A month missing from one group: the ledger was READ but fails a data check ("invalid"). A whole series missing reads as "unavailable".
const ledgerBroken: LedgerPanelResult = assembleLedgerPanel(asReads(dropMonth(ledgerReadsFromXml(FULL_XML), "pbs:cpiGroupIndex03", "2026-10")));
const ledgerMissingSeries: LedgerPanelResult = assembleLedgerPanel(asReads(dropKey(ledgerReadsFromXml(FULL_XML), "pbs:cpiGroupIndex07")));
const pbsPanel = parseCpiGroupPanel(FULL_XML).panel as CpiGroupPanel;
const pbsOk: PbsPanelResult = { panel: pbsPanel, issues: [] };
const pbsDown: PbsPanelResult = { panel: null, issues: ["PBS CPI file request returned HTTP 503."] };

function pbsWithNovember(): PbsPanelResult {
  const wSum = pbsPanel.groups.reduce((s, g) => s + g.weight, 0);
  const groups = pbsPanel.groups.map((g) => ({ ...g, index: new Map(g.index).set("2026-11", (g.index.get("2026-10") as number) * 1.01) }));
  const headline = new Map(pbsPanel.headlineIndex).set("2026-11", groups.reduce((s, g) => s + g.weight * (g.index.get("2026-11") as number), 0) / wSum);
  return { panel: { months: [...pbsPanel.months, "2026-11"], headlineIndex: headline, groups }, issues: [] };
}

const run = (finishedAt: string, f: Parameters<typeof formatCpiRunDetail>[0], status: CronRunRecord["status"] = "success"): CronRunRecord => ({
  jobName: "pbs-cpi-groups-ingestion",
  startedAt: finishedAt,
  finishedAt,
  durationMs: 1000,
  status,
  detail: formatCpiRunDetail(f),
});
const evidence = (rows: CronRunRecord[]) => evaluateCpiRunEvidence(rows, CURRENT, { staleAfterHours: 216 });

async function info(ledger: LedgerPanelResult, pbs: PbsPanelResult, rows: CronRunRecord[] | null, now = CURRENT): Promise<GroupSourceInfo> {
  const sel = await selectPanel({ readLedger: async () => ledger, fetchPbs: async () => pbs, now });
  return buildGroupSourceInfo(sel.note, rows === null ? null : evidence(rows), GENERATED);
}

describe("normal operation: the ledger is the source", () => {
  it("labels the ledger, flags no fallback, and says nothing needs a notice", async () => {
    const g = await info(ledgerOk, pbsOk, []);
    expect(g).toMatchObject({ source: "ledger", reason: "ledger", fallback: false, pbsChecked: false, latestPeriod: "2026-10", expectedPeriod: "2026-10" });
    expect(g.label).toBe("PEIC observation ledger (PBS CPI file, ingested)");
    expect(fallbackNotice(g)).toBeNull();
  });

  it("takes the data-change time and the file's own prepared time from the LEDGER rows, not from the clock or a run", async () => {
    const g = await info(ledgerOk, pbsOk, [run("2026-11-10T09:00:00Z", { outcome: "unchanged", series: 26, unchanged: 26 })]);
    expect(g.lastDataChangeAt).toBe(FETCHED_AT); // the fixture rows' fetched_at, carried through the real assembler's provenance
    expect(g.lastDataChangeAt).toBe(ledgerOk.provenance?.fetchedAt.max);
    expect(g.sourceFilePreparedAt).toBe(PREPARED);
    expect(g.lastDataChangeAt).not.toBe(g.pageGeneratedAt);
  });
});

describe("the six facts stay separate (a recent run is not a recent data change)", () => {
  it("a run that found nothing new is the last RUN, but does not move the last DATA CHANGE or the last page generation", async () => {
    const g = await info(ledgerOk, pbsOk, [
      run("2026-11-12T09:15:00Z", { outcome: "unchanged", series: 26, unchanged: 26, attempts: 1 }),
      run("2026-11-06T17:29:30Z", { outcome: "updated", series: 26, updated: 26, attempts: 1 }),
    ]);
    expect(g.lastIngestionRun).toEqual({ at: "2026-11-12T09:15:00Z", status: "success", outcome: "unchanged" });
    expect(g.lastDataChangeAt).toBe(ledgerOk.provenance?.fetchedAt.max); // unchanged: from the rows, not the 12 Nov run
    expect(g.lastSourceFetch).toEqual({ at: "2026-11-12T09:15:00Z", by: "ingestion-run" }); // an unchanged run still reached PBS
    expect(g.pageGeneratedAt).toBe(GENERATED);
  });

  it("a run that never reached PBS is a run, but NOT a source fetch", async () => {
    const g = await info(ledgerOk, pbsOk, [run("2026-11-12T09:15:00Z", { outcome: "pbs-unavailable", attempts: 3 }, "failure")]);
    expect(g.lastIngestionRun).toMatchObject({ status: "failure", outcome: "pbs-unavailable" });
    expect(g.lastSourceFetch).toBeNull();
  });

  it("no run on record (or an unreadable history) is null — never a guess, never 'operational'", async () => {
    for (const rows of [[], null] as const) {
      const g = await info(ledgerOk, pbsOk, rows as CronRunRecord[] | null);
      expect(g.lastIngestionRun).toBeNull();
      expect(g.lastSourceFetch).toBeNull();
    }
    expect(Object.keys(await info(ledgerOk, pbsOk, []))).not.toContain("ingestionActive"); // the model has no scheduling claim to make
  });

  it("a skipped row is not the last completed run", async () => {
    const g = await info(ledgerOk, pbsOk, [
      run("2026-11-13T09:15:00Z", { outcome: "busy" }, "skipped"),
      run("2026-11-12T09:15:00Z", { outcome: "unchanged", series: 26, unchanged: 26 }),
    ]);
    expect(g.lastIngestionRun?.at).toBe("2026-11-12T09:15:00Z");
  });
});

describe("fallback states are labelled and explained", () => {
  it("ledger behind the calendar and PBS newer: PBS, a fallback, this page's own read counts as the source fetch", async () => {
    const g = await info(ledgerOk, pbsWithNovember(), [], NEXT_MONTH);
    expect(g).toMatchObject({ source: "pbs-live", reason: "fallback-ledger-behind-source", fallback: true, latestPeriod: "2026-11", ledgerLatestPeriod: "2026-10", pbsLatestPeriod: "2026-11", pbsChecked: true });
    expect(g.lastSourceFetch).toEqual({ at: GENERATED, by: "page-generation" });
    expect(g.sourceFilePreparedAt).toBeNull(); // the live path does not carry the file's prepared time; it is not invented
    expect(fallbackNotice(g)).toMatch(/newer month than PEIC has stored/);
  });

  it("ledger behind but PBS has nothing newer: the ledger stays, NOT a fallback, and says no newer month is published", async () => {
    const g = await info(ledgerOk, pbsOk, [], NEXT_MONTH);
    expect(g).toMatchObject({ source: "ledger", reason: "ledger-awaiting-release", fallback: false, latestPeriod: "2026-10", expectedPeriod: "2026-11", pbsChecked: true });
    expect(g.lastSourceFetch).toEqual({ at: GENERATED, by: "page-generation" }); // PBS was asked and answered validly
    expect(fallbackNotice(g)).toMatch(/No newer month is published yet/);
  });

  it("ledger behind and PBS unreachable: still the ledger; the page did not hear from PBS, so no fetch is claimed", async () => {
    const g = await info(ledgerOk, pbsDown, [], NEXT_MONTH);
    expect(g.source).toBe("ledger");
    expect(g.lastSourceFetch).toBeNull();
  });

  it("ledger invalid: PBS whole, labelled as a fallback with the right reason; the ledger's change time is still not claimed from PBS", async () => {
    const g = await info(ledgerBroken, pbsOk, []);
    expect(g).toMatchObject({ source: "pbs-live", reason: "fallback-ledger-invalid", fallback: true, latestPeriod: "2026-10" });
    expect(g.label).toMatch(/the PEIC ledger failed its data checks/);
    expect(fallbackNotice(g)).toMatch(/failed its data checks/);
  });

  it("a whole series missing from the ledger is 'unavailable', not 'invalid' — and is still one source's whole panel (PBS), never completed from PBS", async () => {
    const g = await info(ledgerMissingSeries, pbsOk, []);
    expect(g).toMatchObject({ source: "pbs-live", reason: "fallback-ledger-unavailable", fallback: true });
  });

  it("ledger unavailable (every read failed): PBS, the 'unavailable' reason, and no data-change time", async () => {
    const down: LedgerPanelResult = { panel: null, issues: ["The ledger could not be read."], failureKind: "unavailable", provenance: null, grid: new Map() };
    const g = await info(down, pbsOk, []);
    expect(g).toMatchObject({ source: "pbs-live", reason: "fallback-ledger-unavailable", fallback: true, lastDataChangeAt: null, sourceFilePreparedAt: null });
  });

  it("both unavailable: no source, no period, no invented timestamps", async () => {
    const down: LedgerPanelResult = { panel: null, issues: ["The ledger could not be read."], failureKind: "unavailable", provenance: null, grid: new Map() };
    const g = await info(down, pbsDown, []);
    expect(g).toMatchObject({ source: null, reason: "unavailable-both", latestPeriod: null, lastDataChangeAt: null, lastSourceFetch: null, fallback: true });
    expect(fallbackNotice(g)).toMatch(/Neither/);
  });
});

describe("every selection reason has a reader-facing notice (or deliberately none)", () => {
  it("is null only for the healthy primary case", async () => {
    const reasons = new Set<string>();
    const cases: [LedgerPanelResult, PbsPanelResult, Date][] = [
      [ledgerOk, pbsOk, CURRENT],
      [ledgerOk, pbsOk, NEXT_MONTH],
      [ledgerOk, pbsWithNovember(), NEXT_MONTH],
      [ledgerBroken, pbsOk, CURRENT],
      [{ panel: null, issues: ["x"], failureKind: "unavailable", provenance: null, grid: new Map() }, pbsOk, CURRENT],
      [{ panel: null, issues: ["x"], failureKind: "unavailable", provenance: null, grid: new Map() }, pbsDown, CURRENT],
    ];
    for (const [l, p, now] of cases) {
      const g = await info(l, p, [], now);
      reasons.add(g.reason);
      if (g.reason === "ledger") expect(fallbackNotice(g)).toBeNull();
      else expect(fallbackNotice(g)).toEqual(expect.any(String));
    }
    expect([...reasons].sort()).toEqual(["fallback-ledger-behind-source", "fallback-ledger-invalid", "fallback-ledger-unavailable", "ledger", "ledger-awaiting-release", "unavailable-both"]);
  });
});

describe("the model is plain data", () => {
  it("survives a JSON round trip (it crosses the server/client boundary inside the view model)", async () => {
    const g = await info(ledgerOk, pbsOk, [run("2026-11-12T09:15:00Z", { outcome: "unchanged", series: 26, unchanged: 26 })]);
    expect(JSON.parse(JSON.stringify(g))).toEqual(g);
  });
});
