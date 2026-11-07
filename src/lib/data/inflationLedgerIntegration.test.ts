// Final Inflation milestone: the page's CPI groups come from the ledger first, PBS second — verified through the REAL page.
//
// Real: the page component, the loader, the resolver, selectPanel, the ledger assembler, the PBS fetcher and parser, the World
// Bank parser, the view model, the failure policy and the six-facts model. Controlled: the network (`fetch`), the ledger READER's
// RPC result (the real assembler judges it), the cron run history, and the SBP-facing modules (unchanged by this milestone).
// Nothing here can reach a database: the test workers hold no credentials and the reader is mocked.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PHASE_PRODUCTION_BUILD, PHASE_PRODUCTION_SERVER } from "next/constants";
import { PBS_CPI_SDMX_URL } from "./pbsCpiGroups";
import { ProviderUnavailableError } from "./providerFailurePolicy";
import { assembleLedgerPanel, type LedgerPanelResult } from "@/lib/inflation/ledgerPanel";
import { buildGroupModel } from "@/lib/inflation/viewModel";
import { parseCpiGroupPanel } from "@/lib/inflation/pbsGroups";
import { FULL_XML } from "@/lib/inflation/__fixtures__/pbsCpiVariants";
import { FETCHED_AT, asReads, dropKey, dropMonth, ledgerReadsFromXml } from "@/lib/inflation/__fixtures__/ledgerFixtures";
import { wbBody } from "@/lib/inflation/__fixtures__/pageFixtures";
import { formatCpiRunDetail } from "@/lib/providers/cpiIngestionRunLog";
import type { CronRunRecord } from "@/lib/cronLogging";

// ── SBP-facing modules: fixed, healthy (unchanged by this milestone; the policy under test concerns the CPI group panel). ──
vi.mock("@/lib/data/sbpServer", async () => {
  const f = await import("@/lib/inflation/__fixtures__/pageFixtures");
  const kpi = { title: "CPI Inflation", value: "9.6", unit: "%", change: "-0.7 pp vs Sep 2026", trend: "down", glow: "purple" };
  return {
    getSbpIndicator: async () => ({ kpi, trend: [], meta: {} }),
    getSbpIndicatorHistory: async (key: string) => ({ points: key === "cpiInflation" ? f.HEADLINE_YOY : key === "coreInflation" ? f.CORE_YOY : f.POLICY }),
    getFoodInflationUrbanHistory: async () => ({ points: f.FOOD_YOY }),
  };
});
vi.mock("@/lib/data/cpiMonthlyIndex", async () => {
  const f = await import("@/lib/inflation/__fixtures__/pageFixtures");
  const { parseCpiGroupPanel: parse } = await import("@/lib/inflation/pbsGroups");
  const panel = parse(f.PBS_XML).panel!;
  return { getCpiMonthlyIndexSeries: async () => [...panel.headlineIndex].map(([m, v]) => ({ observationDate: `${m}-28`, indexValue: v })) };
});
vi.mock("@/lib/data/cpiCategoryBreakdown", () => ({ getLatestCpiCategoryBreakdown: async () => null }));

// ── The ledger READER and the run history: scenario-driven. ──
const readLedgerPanel = vi.fn();
const getCronRunHistory = vi.fn();
vi.mock("@/lib/data/cpiGroupLedgerReader", () => ({ readLedgerPanel: (...a: unknown[]) => readLedgerPanel(...a) }));
vi.mock("@/lib/cronLogging", () => ({ getCronRunHistory: (...a: unknown[]) => getCronRunHistory(...a) }));

import InflationRatePage from "@/app/inflation-rate-pakistan/page";
import { loadInflationPageData } from "./inflationPageData";

const net: { pbs: "ok" | "503" | "network"; calls: string[] } = { pbs: "ok", calls: [] };
function fakeFetch(input: unknown): Promise<Response> {
  const url = String(input);
  net.calls.push(url);
  if (url === PBS_CPI_SDMX_URL) {
    if (net.pbs === "503") return Promise.resolve(new Response("unavailable", { status: 503 }));
    if (net.pbs === "network") return Promise.reject(new Error("socket hang up"));
    return Promise.resolve(new Response(FULL_XML, { status: 200 }));
  }
  if (url.includes("api.worldbank.org")) return Promise.resolve(new Response(JSON.stringify(wbBody([])), { status: 200 }));
  return Promise.reject(new Error(`unexpected request in test: ${url}`));
}
const pbsCalls = () => net.calls.filter((u) => u === PBS_CPI_SDMX_URL).length;

const ledgerOk = (): LedgerPanelResult & { stats: object } => ({ ...assembleLedgerPanel(asReads(ledgerReadsFromXml(FULL_XML))), stats: {} });
const ledgerInvalid = (): LedgerPanelResult & { stats: object } => ({ ...assembleLedgerPanel(asReads(dropMonth(ledgerReadsFromXml(FULL_XML), "pbs:cpiGroupIndex03", "2026-10"))), stats: {} });
const ledgerPartlyIngested = (): LedgerPanelResult & { stats: object } => {
  // A coherent NEW month in 25 of 26 series: one series still ends at 2026-10. The whole ledger must be rejected.
  const reads = ledgerReadsFromXml(FULL_XML);
  const withNov = Object.fromEntries(
    Object.entries(reads).map(([k, r]) => {
      if (!r.ok || k === "pbs:cpiGroupIndex12") return [k, r];
      const newest = r.rows[0];
      return [k, { ...r, rows: [{ ...newest, observationPeriod: "2026-11-30", value: newest.value, sourceReference: { ...newest.sourceReference, sourceValue: String(newest.value) } }, ...r.rows] }];
    }),
  );
  return { ...assembleLedgerPanel(asReads(withNov)), stats: {} };
};
const ledgerDown = (): LedgerPanelResult & { stats: object } => ({ panel: null, issues: ["The ledger could not be read (connection reset)."], failureKind: "unavailable", provenance: null, grid: new Map(), stats: {} });

const run = (finishedAt: string, f: Parameters<typeof formatCpiRunDetail>[0], status: CronRunRecord["status"] = "success"): CronRunRecord => ({
  jobName: "pbs-cpi-groups-ingestion", startedAt: finishedAt, finishedAt, durationMs: 1000, status, detail: formatCpiRunDetail(f),
});

const text = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ");
const render = async () => renderToStaticMarkup(await InflationRatePage());

const savedPhase = process.env.NEXT_PHASE;
const setPhase = (p: string | undefined) => (p === undefined ? delete process.env.NEXT_PHASE : (process.env.NEXT_PHASE = p));
let spies: ReturnType<typeof vi.spyOn>[] = [];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-15T12:00:00Z")); // previous calendar month = 2026-10: a ledger ending Oct is current
  net.pbs = "ok";
  net.calls = [];
  vi.stubGlobal("fetch", fakeFetch);
  readLedgerPanel.mockReset().mockImplementation(async () => ledgerOk());
  getCronRunHistory.mockReset().mockResolvedValue([]);
  spies = (["error", "warn", "info"] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
  setPhase(PHASE_PRODUCTION_SERVER);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  spies.forEach((s) => s.mockRestore());
  setPhase(savedPhase);
});

const expectedGroups = buildGroupModel(parseCpiGroupPanel(FULL_XML).panel!);

describe("the ledger is the page's CPI-group source", () => {
  it("normal operation: groups come from the ledger and PBS's file is NOT requested", async () => {
    const { model } = await loadInflationPageData();
    expect(model.groupSource).toMatchObject({ source: "ledger", reason: "ledger", fallback: false, latestPeriod: "2026-10" });
    expect(pbsCalls()).toBe(0);
    expect(readLedgerPanel).toHaveBeenCalledTimes(1);
  });

  it("the ledger-backed model is IDENTICAL to the PBS-parsed one (the analytics cannot tell where the data came from)", async () => {
    const fromLedger = (await loadInflationPageData()).model.groups;
    readLedgerPanel.mockImplementation(async () => ledgerDown());
    const fromPbs = (await loadInflationPageData()).model.groups;
    expect(fromLedger).toEqual(expectedGroups);
    expect(fromPbs).toEqual(expectedGroups);
    expect(fromLedger).toEqual(fromPbs);
  });

  it("the rendered page says so: the source strip, the six facts, and a primary (not fallback) source", async () => {
    getCronRunHistory.mockResolvedValue([run("2026-11-06T17:29:30Z", { outcome: "updated", series: 26, updated: 26, attempts: 1 })]);
    const t = text(await render());
    expect(t).toContain("Group data source. PEIC observation ledger (PBS CPI file, ingested)");
    expect(t).toContain("latest month Oct 2026");
    for (const fact of ["Latest observation period", "Last ingestion run", "Last data change", "Last source fetch", "Last page generation", "Current source"]) expect(t).toContain(fact);
    expect(t).toContain("6 Nov 2026, 17:29 UTC · success — wrote new observations");
    expect(t).toContain("This is the primary source.");
    expect(t).not.toContain("Fallback source in use");
  });

  it("shows a strip above each of the three group-derived sections, and the status panel once", async () => {
    const html = await render();
    expect((text(html).match(/Group data source\./g) ?? []).length).toBe(3);
    expect((html.match(/id="data-status"/g) ?? []).length).toBe(1);
  });

  it("the data-change time shown is the ledger rows' fetched_at, not the run time or the page time", async () => {
    getCronRunHistory.mockResolvedValue([run("2026-11-12T09:15:00Z", { outcome: "unchanged", series: 26, unchanged: 26, attempts: 1 })]);
    const g = (await loadInflationPageData()).model.groupSource!;
    expect(g.lastDataChangeAt).toBe(FETCHED_AT);
    expect(g.lastIngestionRun?.at).toBe("2026-11-12T09:15:00Z");
    expect(g.pageGeneratedAt).toBe("2026-11-15T12:00:00.000Z");
    expect(new Set([g.lastDataChangeAt, g.lastIngestionRun?.at, g.pageGeneratedAt]).size).toBe(3);
  });

  it("makes NO statement about whether scheduled ingestion exists or is active", async () => {
    getCronRunHistory.mockResolvedValue([]);
    const t = text(await render());
    expect(t).toContain("No ingestion run is on record (or the run history could not be read).");
    expect(t).not.toMatch(/scheduled (task|ingestion)[^.]{0,40}(is|are) (active|running|operational|enabled)/i);
    expect(t).not.toMatch(/ingestion (is )?(active|operational|enabled)/i);
  });
});

describe("PBS fallback", () => {
  it.each([
    ["an invalid ledger", ledgerInvalid, "fallback-ledger-invalid"],
    ["an unreadable ledger", ledgerDown, "fallback-ledger-unavailable"],
    ["a PARTLY ingested new month (25 of 26 series)", ledgerPartlyIngested, null],
  ] as const)("%s -> PBS's file, whole, labelled as a fallback", async (_n, ledger, reason) => {
    readLedgerPanel.mockImplementation(async () => ledger());
    const { model } = await loadInflationPageData();
    expect(model.groupSource).toMatchObject({ source: "pbs-live", fallback: true });
    if (reason) expect(model.groupSource?.reason).toBe(reason);
    expect(model.groups).toEqual(expectedGroups); // exactly PBS's panel; nothing from the ledger's extra month was mixed in
    expect(model.groups?.indexMonths.at(-1)).toBe("2026-10");
    expect(pbsCalls()).toBe(1);
  });

  it("the page labels the fallback and explains it, in the strip and in the status panel", async () => {
    readLedgerPanel.mockImplementation(async () => ledgerInvalid());
    const t = text(await render());
    expect(t).toContain("Fallback source in use.");
    expect(t).toContain("PBS CPI file, read directly (the PEIC ledger failed its data checks)");
    expect(t).toContain("This is a fallback.");
  });

  it("using the fallback is NOT a failure: the page regenerates at production runtime", async () => {
    readLedgerPanel.mockImplementation(async () => ledgerDown());
    setPhase(PHASE_PRODUCTION_SERVER);
    await expect(render()).resolves.toContain("Fallback source in use.");
  });

  it("ledger behind the calendar and PBS holds nothing newer: the ledger stays and PBS is asked exactly once", async () => {
    vi.setSystemTime(new Date("2026-12-05T08:00:00Z")); // previous calendar month = 2026-11; both sources end 2026-10
    const { model } = await loadInflationPageData();
    expect(model.groupSource).toMatchObject({ source: "ledger", reason: "ledger-awaiting-release", fallback: false });
    expect(pbsCalls()).toBe(1);
  });
});

describe("both sources unavailable keeps the last good page (F.2a)", () => {
  const bothDown = () => {
    readLedgerPanel.mockImplementation(async () => ledgerDown());
    net.pbs = "503";
  };

  it("at production runtime the loader REJECTS, so Next keeps the previously generated page", async () => {
    bothDown();
    await expect(loadInflationPageData()).rejects.toBeInstanceOf(ProviderUnavailableError);
    await expect(render()).rejects.toBeInstanceOf(ProviderUnavailableError);
  });

  it("the refusal names both reasons, labelled by source", async () => {
    bothDown();
    await expect(loadInflationPageData()).rejects.toThrow(/Ledger: The ledger could not be read[\s\S]*PBS file: PBS CPI file request returned HTTP 503/);
  });

  it("during the production BUILD it degrades to the labelled unavailable state instead of failing the deploy", async () => {
    bothDown();
    setPhase(PHASE_PRODUCTION_BUILD);
    const { model } = await loadInflationPageData();
    expect(model.groups).toBeNull();
    expect(model.groupSource).toMatchObject({ source: null, reason: "unavailable-both", latestPeriod: null });
    const t = text(await render());
    expect(t).not.toContain("Group data source.");
    expect(t).toContain("Neither PEIC's stored copy nor PBS's file could be used");
  });

  it("a PBS network error behaves like any other PBS outage", async () => {
    readLedgerPanel.mockImplementation(async () => ledgerDown());
    net.pbs = "network";
    await expect(loadInflationPageData()).rejects.toBeInstanceOf(ProviderUnavailableError);
  });

  it("a ledger that is missing a whole series never gets completed from PBS: the whole panel comes from PBS or nowhere", async () => {
    readLedgerPanel.mockImplementation(async () => ({ ...assembleLedgerPanel(asReads(dropKey(ledgerReadsFromXml(FULL_XML), "pbs:cpiGroupIndex07"))), stats: {} }));
    net.pbs = "503";
    await expect(loadInflationPageData()).rejects.toBeInstanceOf(ProviderUnavailableError);
  });
});

describe("recovery", () => {
  it("the next regeneration after a ledger outage returns to the ledger with no residue", async () => {
    readLedgerPanel.mockImplementation(async () => ledgerDown());
    expect((await loadInflationPageData()).model.groupSource?.source).toBe("pbs-live");
    readLedgerPanel.mockImplementation(async () => ledgerOk());
    const again = await loadInflationPageData();
    expect(again.model.groupSource).toMatchObject({ source: "ledger", fallback: false });
    expect(again.model.groups).toEqual(expectedGroups);
  });
});
