// The wiring that makes the ledger the Inflation page's primary source for CPI groups.
// The selection RULES are tested in src/lib/inflation/panelSource.test.ts; this proves the real wiring: that the existing ledger
// reader and the existing PBS fetcher are what get called, PBS is untouched on the normal path, the result is one source's
// panel by identity, and one log line per generation says what happened.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { assembleLedgerPanel, type LedgerPanelResult } from "@/lib/inflation/ledgerPanel";
import { parseCpiGroupPanel, type CpiGroupPanel } from "@/lib/inflation/pbsGroups";
import { FULL_XML } from "@/lib/inflation/__fixtures__/pbsCpiVariants";
import { asReads, dropMonth, ledgerReadsFromXml } from "@/lib/inflation/__fixtures__/ledgerFixtures";
import { JOB_NAME } from "@/lib/providers/pbsCpiGroupsIngestion";
import { PBS_CPI_GROUPS_MONITOR_JOB } from "@/lib/ingestionWatchdog";

const ledgerOk: LedgerPanelResult & { stats: { rpcCalls: number; retries: number; failedKeys: number; ms: number } } = {
  ...assembleLedgerPanel(asReads(ledgerReadsFromXml(FULL_XML))),
  stats: { rpcCalls: 26, retries: 0, failedKeys: 0, ms: 700 },
};
const pbsPanel = parseCpiGroupPanel(FULL_XML).panel as CpiGroupPanel;

const readLedgerPanel = vi.fn();
const getCpiGroupPanel = vi.fn();
vi.mock("@/lib/data/cpiGroupLedgerReader", () => ({ readLedgerPanel: (...a: unknown[]) => readLedgerPanel(...a) }));
vi.mock("@/lib/data/pbsCpiGroups", () => ({ getCpiGroupPanel: (...a: unknown[]) => getCpiGroupPanel(...a) }));

import { CPI_INGESTION_JOB_NAME, CPI_RUN_STALE_AFTER_HOURS, resolveCpiGroupPanel } from "./cpiGroupPanelSource";

let info: ReturnType<typeof vi.spyOn>;
let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-15T12:00:00Z")); // previous calendar month = 2026-10
  readLedgerPanel.mockReset().mockResolvedValue(ledgerOk);
  getCpiGroupPanel.mockReset().mockResolvedValue({ panel: pbsPanel, issues: [] });
  info = vi.spyOn(console, "info").mockImplementation(() => {});
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  info.mockRestore();
  warn.mockRestore();
});

describe("constants duplicated to keep a page bundle light are pinned to their owners", () => {
  it("the cron job name equals the ingestion script's and the watchdog's", () => {
    expect(CPI_INGESTION_JOB_NAME).toBe(JOB_NAME);
    expect(CPI_INGESTION_JOB_NAME).toBe(PBS_CPI_GROUPS_MONITOR_JOB.ingestionJobName);
  });
  it("the stale threshold equals the watchdog's", () => {
    expect(CPI_RUN_STALE_AFTER_HOURS).toBe(PBS_CPI_GROUPS_MONITOR_JOB.staleAfterHours);
  });
});

describe("ledger first", () => {
  it("a valid, current ledger is used by identity and PBS is never fetched", async () => {
    const sel = await resolveCpiGroupPanel();
    expect(sel.source).toBe("ledger");
    expect(sel.panel).toBe(ledgerOk.panel);
    expect(readLedgerPanel).toHaveBeenCalledTimes(1);
    expect(getCpiGroupPanel).not.toHaveBeenCalled();
  });

  it("logs one greppable info line (not a warning) with the decision", async () => {
    await resolveCpiGroupPanel();
    expect(info).toHaveBeenCalledTimes(1);
    expect(warn).not.toHaveBeenCalled();
    expect(String(info.mock.calls[0][0])).toBe("[InflationPage] CPI group source: source=ledger reason=ledger fallback=false ledgerLatest=2026-10 pbsLatest=n/a expected=2026-10 pbsChecked=false");
  });
});

describe("fallback", () => {
  it("an invalid ledger falls back to PBS whole, and the fallback is logged at warning level so an alert can key on it", async () => {
    readLedgerPanel.mockResolvedValue({ ...assembleLedgerPanel(asReads(dropMonth(ledgerReadsFromXml(FULL_XML), "pbs:cpiGroupIndex03", "2026-10"))), stats: ledgerOk.stats });
    const sel = await resolveCpiGroupPanel();
    expect(sel.source).toBe("pbs-live");
    expect(sel.panel).toBe(pbsPanel);
    expect(sel.note).toMatchObject({ reason: "fallback-ledger-invalid", fallback: true });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toMatch(/source=pbs-live reason=fallback-ledger-invalid fallback=true/);
    expect(info).not.toHaveBeenCalled();
  });

  it("a ledger that cannot be read at all falls back to PBS", async () => {
    readLedgerPanel.mockResolvedValue({ panel: null, issues: ["The ledger could not be read (connection reset)."], failureKind: "unavailable", provenance: null, grid: new Map(), stats: ledgerOk.stats });
    const sel = await resolveCpiGroupPanel();
    expect(sel.note.reason).toBe("fallback-ledger-unavailable");
    expect(sel.panel).toBe(pbsPanel);
  });

  it("a ledger behind the calendar asks PBS exactly once, and uses it only when strictly newer", async () => {
    vi.setSystemTime(new Date("2026-12-05T08:00:00Z")); // previous calendar month = 2026-11; the ledger ends 2026-10
    const sel = await resolveCpiGroupPanel(); // PBS (the same file) is not newer
    expect(getCpiGroupPanel).toHaveBeenCalledTimes(1);
    expect(sel.note.reason).toBe("ledger-awaiting-release");
    expect(sel.panel).toBe(ledgerOk.panel);
  });
});

describe("no usable source", () => {
  it("returns no panel with BOTH reasons labelled, and does not throw (the page loader decides what that means)", async () => {
    readLedgerPanel.mockResolvedValue({ panel: null, issues: ["The ledger could not be read."], failureKind: "unavailable", provenance: null, grid: new Map(), stats: ledgerOk.stats });
    getCpiGroupPanel.mockResolvedValue({ panel: null, issues: ["PBS CPI file request returned HTTP 503."] });
    const sel = await resolveCpiGroupPanel();
    expect(sel.panel).toBeNull();
    expect(sel.source).toBeNull();
    expect(sel.issues).toEqual(["Ledger: The ledger could not be read.", "PBS file: PBS CPI file request returned HTTP 503."]);
  });
});

describe("injection", () => {
  it("accepts overrides for the clock and either source (used by tests and scripts, never by the page)", async () => {
    const readLedger = vi.fn(async () => ledgerOk);
    const sel = await resolveCpiGroupPanel({ readLedger, now: new Date("2026-11-01T00:00:00Z") });
    expect(readLedger).toHaveBeenCalledTimes(1);
    expect(readLedgerPanel).not.toHaveBeenCalled();
    expect(sel.note.expectedLatestMonth).toBe("2026-10");
  });
});
