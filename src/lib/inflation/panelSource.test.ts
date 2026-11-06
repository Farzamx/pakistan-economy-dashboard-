// Phase F.2e-Prep: source selection — every outage, validation failure and freshness case the migration must survive.
// The ledger results below are the REAL assembler's verdicts on corrupted copies of the real data; the PBS results
// are the real file parser's. The F.2a failure policy is applied on top, exactly as the page loader would.

import { describe, expect, it, vi } from "vitest";
import { assembleLedgerPanel, type LedgerPanelResult } from "./ledgerPanel";
import { parseCpiGroupPanel, type CpiGroupPanel } from "./pbsGroups";
import { describeSource, formatSourceLog, ledgerIsBehind, previousCalendarMonth, selectPanel, type PbsPanelResult, type PanelSelection } from "./panelSource";
import { evaluateRequiredProviders } from "./providerHealth";
import { buildGroupModel } from "./viewModel";
import { enforceProviderPolicy, ProviderUnavailableError } from "@/lib/data/providerFailurePolicy";
import { FULL_XML } from "./__fixtures__/pbsCpiVariants";
import { asReads, dropKey, dropMonth, failKey, ledgerReadsFromXml, setAllRefField, setValue, mapRows } from "./__fixtures__/ledgerFixtures";

const CURRENT = new Date("2026-11-15T12:00:00Z"); // previous calendar month = 2026-10: a ledger ending Oct is current
const NEXT_MONTH = new Date("2026-12-05T08:00:00Z"); // previous calendar month = 2026-11: a ledger ending Oct is behind

const good = () => ledgerReadsFromXml(FULL_XML);
const L = (reads: ReturnType<typeof good>): LedgerPanelResult => assembleLedgerPanel(asReads(reads));
const ledgerOk = L(good());
const pbsPanel = parseCpiGroupPanel(FULL_XML).panel as CpiGroupPanel;
const pbsOk: PbsPanelResult = { panel: pbsPanel, issues: [] };
const pbsDown: PbsPanelResult = { panel: null, issues: ["PBS CPI file request returned HTTP 503."] };

/** PBS one month ahead: the same data plus a coherent 2026-11 (indices +1 %, headline = the weighted mean, so the identity holds). */
function pbsWithNovember(): PbsPanelResult {
  const wSum = pbsPanel.groups.reduce((s, g) => s + g.weight, 0);
  const groups = pbsPanel.groups.map((g) => ({ ...g, index: new Map(g.index).set("2026-11", (g.index.get("2026-10") as number) * 1.01) }));
  const headline = new Map(pbsPanel.headlineIndex).set("2026-11", groups.reduce((s, g) => s + g.weight * (g.index.get("2026-11") as number), 0) / wSum);
  return { panel: { months: [...pbsPanel.months, "2026-11"], headlineIndex: headline, groups }, issues: [] };
}

interface Run { sel: PanelSelection; ledgerCalls: number; pbsCalls: number }
async function run(ledger: LedgerPanelResult, pbs: PbsPanelResult, now = CURRENT): Promise<Run> {
  const readLedger = vi.fn(async () => ledger);
  const fetchPbs = vi.fn(async () => pbs);
  const sel = await selectPanel({ readLedger, fetchPbs, now });
  return { sel, ledgerCalls: readLedger.mock.calls.length, pbsCalls: fetchPbs.mock.calls.length };
}

describe("the calendar rule", () => {
  it("previous calendar month, in UTC, including the year boundary", () => {
    expect(previousCalendarMonth(new Date("2026-11-15T12:00:00Z"))).toBe("2026-10");
    expect(previousCalendarMonth(new Date("2027-01-01T00:00:00Z"))).toBe("2026-12");
    expect(previousCalendarMonth(new Date("2026-12-31T23:59:59Z"))).toBe("2026-11");
    expect(previousCalendarMonth(new Date("2026-03-01T00:00:00Z"))).toBe("2026-02");
  });
  it("a ledger is behind only if its latest month is older than the previous calendar month", () => {
    expect(ledgerIsBehind("2026-10", CURRENT)).toBe(false);
    expect(ledgerIsBehind("2026-10", NEXT_MONTH)).toBe(true);
    expect(ledgerIsBehind("2026-11", NEXT_MONTH)).toBe(false);
    expect(ledgerIsBehind("2026-09", CURRENT)).toBe(true);
  });
});

describe("normal operation: a valid, current ledger is the primary source", () => {
  it("uses the ledger and does NOT fetch PBS at all", async () => {
    const r = await run(ledgerOk, pbsOk);
    expect(r.sel.source).toBe("ledger");
    expect(r.sel.panel).toBe(ledgerOk.panel);
    expect(r.sel.note).toMatchObject({ reason: "ledger", fallback: false, pbsChecked: false, ledgerLatestMonth: "2026-10", expectedLatestMonth: "2026-10" });
    expect(r.pbsCalls).toBe(0);
  });

  it("a PBS OUTAGE is invisible while the ledger is current (PBS is never asked)", async () => {
    const r = await run(ledgerOk, pbsDown);
    expect(r.sel.source).toBe("ledger");
    expect(r.sel.note.fallback).toBe(false);
    expect(r.pbsCalls).toBe(0);
  });
});

describe("ledger failures fall back to PBS — whole panel, labelled, with the reasons kept", () => {
  const cases: { name: string; ledger: LedgerPanelResult; reason: "fallback-ledger-unavailable" | "fallback-ledger-invalid"; issue: RegExp }[] = [
    { name: "ledger outage (every read fails)", ledger: L(Object.keys(good()).reduce((acc, k) => failKey(acc, k, "503"), good())), reason: "fallback-ledger-unavailable", issue: /the ledger read failed \(503\)/ },
    { name: "one series cannot be read", ledger: L(failKey(good(), "pbs:cpiGroupIndex08")), reason: "fallback-ledger-unavailable", issue: /pbs:cpiGroupIndex08/ },
    { name: "a missing month in one group", ledger: L(dropMonth(good(), "pbs:cpiGroupIndex03", "2026-10")), reason: "fallback-ledger-invalid", issue: /missing 1 month/ },
    { name: "an incomplete group (weight absent)", ledger: L(dropKey(good(), "pbs:cpiGroupWeight07")), reason: "fallback-ledger-unavailable", issue: /pbs:cpiGroupWeight07/ },
    { name: "an incorrect base period (rebased, unsupported)", ledger: assembleLedgerPanel(asReads(ledgerReadsFromXml(FULL_XML, { base: "2025/2026" }))), reason: "fallback-ledger-invalid", issue: /Base period 2025\/2026 is not supported/ },
    { name: "mixed base periods", ledger: L(setAllRefField(good(), "basePeriod", "2030/2031")), reason: "fallback-ledger-invalid", issue: /./ },
    { name: "invalid basket weights", ledger: L(mapRows(good(), "pbs:cpiGroupWeight01", (x) => ({ ...x, value: x.value + 5, sourceReference: { ...(x.sourceReference ?? {}), sourceValue: String(x.value + 5) } }))), reason: "fallback-ledger-invalid", issue: /Weights total/ },
    { name: "a broken Laspeyres identity", ledger: L(setValue(good(), "pbs:cpiGroupIndex04", "2026-01", 999 / 3)), reason: "fallback-ledger-invalid", issue: /do not reproduce the headline/ },
  ];

  it.each(cases.map((c) => [c.name, c] as const))("%s", async (_n, c) => {
    expect(c.ledger.panel).toBeNull(); // the scenario really is a ledger failure
    const r = await run(c.ledger, pbsOk);
    expect(r.sel.source).toBe("pbs-live");
    expect(r.sel.panel).toBe(pbsOk.panel); // exactly PBS's panel object — nothing merged
    expect(r.sel.issues).toEqual([]);
    expect(r.sel.note).toMatchObject({ reason: c.reason, fallback: true, pbsChecked: true });
    expect(r.sel.note.ledgerIssues.join(" ")).toMatch(c.issue);
    expect(r.pbsCalls).toBe(1);
    expect(formatSourceLog(r.sel.note)).toMatch(new RegExp(`reason=${c.reason} .*fallback=true|fallback=true`));
  });
});

describe("a PARTLY ingested new month is never silently completed from PBS", () => {
  it("rejects the ledger whole and uses PBS whole — the result is one source's panel, not a patchwork", async () => {
    // Ledger: 25 series hold 2026-11, one does not. PBS: has a coherent 2026-11.
    const base = good();
    const withNov = Object.fromEntries(
      Object.entries(base).map(([k, v]) => {
        if (!v.ok || k === "pbs:cpiGroupIndex03") return [k, v];
        return [k, { ...v, rows: [{ ...v.rows[0], observationPeriod: "2026-11-30" }, ...v.rows] }];
      }),
    ) as typeof base;
    const ledger = L(withNov);
    expect(ledger.panel).toBeNull();
    expect(ledger.issues.join(" ")).toMatch(/partly updated|missing/);
    const pbs = pbsWithNovember();
    const r = await run(ledger, pbs, NEXT_MONTH);
    expect(r.sel.source).toBe("pbs-live");
    expect(r.sel.panel).toBe(pbs.panel);
    expect(r.sel.panel?.months.at(-1)).toBe("2026-11");
  });
});

describe("both sources failing", () => {
  it("returns no panel, reports BOTH reasons labelled by source, and does not invent anything", async () => {
    const outage = L(Object.keys(good()).reduce((acc, k) => failKey(acc, k, "503"), good()));
    const r = await run(outage, pbsDown);
    expect(r.sel.panel).toBeNull();
    expect(r.sel.source).toBeNull();
    expect(r.sel.note.reason).toBe("unavailable-both");
    expect(r.sel.issues.some((i) => i.startsWith("Ledger: "))).toBe(true);
    expect(r.sel.issues.some((i) => i.startsWith("PBS file: "))).toBe(true);
    expect(describeSource(r.sel.note)).toBe("unavailable");
  });

  it("an invalid ledger and an invalid PBS file are both unavailable too", async () => {
    const r = await run(L(dropMonth(good(), "pbs:cpiGroupIndex03", "2026-10")), { panel: null, issues: ["The group indices do not reproduce the headline index."] });
    expect(r.sel.panel).toBeNull();
    expect(r.sel.note.reason).toBe("unavailable-both");
  });
});

describe("a ledger that is behind the calendar (e.g. ingestion is not scheduled yet)", () => {
  it("PBS holds a newer valid month -> PBS wins for the whole panel; freshness never regresses vs the live-PBS page", async () => {
    const pbs = pbsWithNovember();
    const r = await run(ledgerOk, pbs, NEXT_MONTH);
    expect(r.sel.source).toBe("pbs-live");
    expect(r.sel.panel).toBe(pbs.panel);
    expect(r.sel.note).toMatchObject({ reason: "fallback-ledger-behind-source", fallback: true, ledgerLatestMonth: "2026-10", pbsLatestMonth: "2026-11", expectedLatestMonth: "2026-11", pbsChecked: true });
    expect(describeSource(r.sel.note)).toMatch(/newer month than the PEIC ledger/);
  });

  it("PBS has nothing newer yet (release not out) -> the ledger stays; it is asked once and nothing is flagged as a fallback", async () => {
    const r = await run(ledgerOk, pbsOk, NEXT_MONTH);
    expect(r.sel.source).toBe("ledger");
    expect(r.sel.note).toMatchObject({ reason: "ledger-awaiting-release", fallback: false, pbsChecked: true, pbsLatestMonth: "2026-10" });
    expect(r.pbsCalls).toBe(1);
  });

  it("PBS cannot be asked -> the ledger stays, and the PBS failure is recorded for monitoring", async () => {
    const r = await run(ledgerOk, pbsDown, NEXT_MONTH);
    expect(r.sel.source).toBe("ledger");
    expect(r.sel.note.reason).toBe("ledger-awaiting-release");
    expect(r.sel.note.pbsIssues.join(" ")).toMatch(/HTTP 503/);
  });

  it("PBS is itself OLDER than the ledger -> the ledger stays", async () => {
    const older: PbsPanelResult = { panel: { ...pbsPanel, months: pbsPanel.months.slice(0, -2) }, issues: [] };
    const r = await run(ledgerOk, older, NEXT_MONTH);
    expect(r.sel.source).toBe("ledger");
  });
});

describe("the selection never mixes sources", () => {
  it("for every scenario the returned panel is, by identity, exactly the ledger's or exactly PBS's", async () => {
    const ledgers = [ledgerOk, L(failKey(good(), "pbs:cpiGroupIndex01")), L(dropMonth(good(), "pbs:cpiGroupIndex03", "2026-10"))];
    const pbss = [pbsOk, pbsDown, pbsWithNovember()];
    for (const l of ledgers) for (const p of pbss) for (const now of [CURRENT, NEXT_MONTH]) {
      const { sel } = await run(l, p, now);
      if (sel.panel !== null) expect([l.panel, p.panel]).toContain(sel.panel);
      expect(sel.panel === null).toBe(sel.source === null);
    }
  });
});

describe("composition with the F.2a last-good-page protection", () => {
  const intl = { series: { PAK: [{ year: 2025, value: 3.5 }] } };
  const failuresFor = (sel: PanelSelection) =>
    evaluateRequiredProviders({
      panelLoaded: sel.panel !== null,
      panelIssues: sel.issues,
      groupsBuilt: sel.panel ? buildGroupModel(sel.panel) !== null : false,
      intl,
      expectedCountries: ["PAK"],
    });

  it("using the PBS fallback is NOT a failure: the page regenerates (and the fallback is logged/labelled)", async () => {
    const { sel } = await run(L(failKey(good(), "pbs:cpiGroupIndex01")), pbsOk);
    expect(failuresFor(sel)).toEqual([]);
    expect(() => enforceProviderPolicy(failuresFor(sel), "throw")).not.toThrow();
  });

  it("BOTH sources unavailable at runtime -> regeneration is refused, so ISR keeps the last good page", async () => {
    const { sel } = await run(L(failKey(good(), "pbs:cpiGroupIndex01")), pbsDown);
    const failures = failuresFor(sel);
    expect(failures.length).toBeGreaterThan(0);
    expect(() => enforceProviderPolicy(failures, "throw")).toThrow(ProviderUnavailableError);
    expect(failures[0].reason).toMatch(/Ledger: .*PBS file: /);
  });

  it("the same failure at BUILD time degrades to the labelled unavailable state instead of failing the deploy", async () => {
    const { sel } = await run(L(failKey(good(), "pbs:cpiGroupIndex01")), pbsDown);
    expect(() => enforceProviderPolicy(failuresFor(sel), "degrade")).not.toThrow();
  });
});

describe("what is exposed for monitoring", () => {
  it("one greppable log line with the decision and the reasons — and nothing sensitive", async () => {
    const { sel } = await run(L(dropMonth(good(), "pbs:cpiGroupIndex03", "2026-10")), pbsOk);
    const line = formatSourceLog(sel.note);
    expect(line).toMatch(/^\[InflationPage\] CPI group source: source=pbs-live reason=fallback-ledger-invalid fallback=true ledgerLatest=n\/a pbsLatest=2026-10 expected=2026-10 pbsChecked=true \| ledger: /);
    expect(line).not.toMatch(/secret|token|apikey|password|https?:\/\//i);
  });

  it("a labelled description exists for every reason", async () => {
    for (const reason of ["ledger", "ledger-awaiting-release", "fallback-ledger-unavailable", "fallback-ledger-invalid", "fallback-ledger-behind-source", "unavailable-both"] as const) {
      expect(describeSource({ ...(await run(ledgerOk, pbsOk)).sel.note, reason })).toMatch(/\S/);
    }
  });
});
