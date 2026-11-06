// Phase F.2e-Prep: the ledger-backed analytical model must equal F.1's live-PBS model. Value for value.
//
// The ledger side is built the way production builds it: the REAL F.2b adapter + the REAL orchestrator write the real
// file into an in-memory ledger that obeys the real RPC semantics; the rows are then served through the documented
// get_canonical_observation_provenance contract (current rows only, newest first, limited) to the REAL reader and
// assembler. The file side is the unchanged F.1 parser. October 2026 reference figures are asserted HERE, never in
// production code.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseCpiGroupPanel } from "./pbsGroups";
import { buildInflationViewModel, type RawInflationInputs } from "./viewModel";
import { buildGroupModel } from "./viewModel";
import { contributionsOverLag } from "./analytics";
import { referenceFigures, reconcilePanels } from "./ledgerReconciliation";
import { FULL_XML, rawValues, reviseGroupIndex } from "./__fixtures__/pbsCpiVariants";
import { runPbsCpiDryRun } from "@/lib/providers/pbsCpiGroupsIngestion";
import { PBS_CPI_SERIES, monthEnd } from "@/lib/providers/pbsCpiGroupsAdapter";
import type { InMemoryLedger } from "@/lib/providers/inMemoryLedger";

// ("server-only", imported by the reader, is aliased to a stub by vitest.config.mts.)
import { readLedgerPanel, type ProvenanceRpc } from "@/lib/data/cpiGroupLedgerReader";

/** What get_canonical_observation_provenance returns, computed from the in-memory ledger: current rows, newest first, limited. */
function provenanceRpcFrom(ledger: InMemoryLedger): ProvenanceRpc {
  return async (key, limit) => ({
    data: ledger
      .current(key)
      .sort((a, b) => (a.observation_period < b.observation_period ? 1 : -1))
      .slice(0, limit)
      .map((r) => ({
        observation_period: r.observation_period,
        value: r.value,
        unit: r.unit,
        vintage: r.vintage,
        release_date: r.release_date,
        source_updated_at: r.source_updated_at,
        fetched_at: r.fetched_at,
        quality_status: r.quality_status,
        source_series_id: r.source_series_id,
        source_reference: r.source_reference,
      })),
    error: null,
  });
}

async function ledgerPanelFor(xml: string) {
  const dry = await runPbsCpiDryRun({ xml });
  expect(dry.ok, "the writer must accept the file").toBe(true);
  return readLedgerPanel(provenanceRpcFrom(dry.ledger as InMemoryLedger), { sleep: async () => undefined });
}

const filePanel = parseCpiGroupPanel(FULL_XML).panel!;

describe("ledger-backed vs live-PBS: the whole analytical model", async () => {
  const result = await ledgerPanelFor(FULL_XML);

  it("the ledger written by the real adapter and read by the real reader assembles a panel", () => {
    expect(result.issues).toEqual([]);
    expect(result.panel).not.toBeNull();
    expect(result.stats.rpcCalls).toBe(26);
  });

  const rec = reconcilePanels(filePanel, result.panel!);

  it("every compared quantity is identical — and a meaningful number of them were compared", () => {
    for (const c of rec.checks) expect(c, `${c.name}: ${c.detail ?? ""}`).toMatchObject({ ok: true, maxAbsDiff: 0 });
    expect(rec.ok).toBe(true);
    const byName = Object.fromEntries(rec.checks.map((c) => [c.name, c.compared]));
    expect(byName["months"]).toBe(52);
    expect(byName["headline index"]).toBe(52);
    expect(byName["basket weights (12)"]).toBe(12);
    expect(byName["group indices (12 × months)"]).toBe(12 * 52);
    expect(byName["group YoY (12 groups)"]).toBe(12 * 40);
    expect(byName["group MoM (12 groups)"]).toBe(12 * 51);
    expect(rec.totalCompared).toBeGreaterThan(3000);
  });

  it("all 1,352 stored values equal the published decimal text exactly (26 series × 52 months)", async () => {
    const raw = rawValues(FULL_XML);
    let n = 0;
    const dry = await runPbsCpiDryRun({ xml: FULL_XML });
    for (const def of PBS_CPI_SERIES) {
      const rows = (dry.ledger as InMemoryLedger).current(def.indicatorKey);
      expect(rows).toHaveLength(52);
      for (const row of rows) {
        const month = row.observation_period.slice(0, 7);
        expect(row.observation_period).toBe(monthEnd(month));
        const published = (raw.get(def.sdmxIndicator) as Map<string, { n: number; text: string }>).get(month) as { n: number; text: string };
        expect(row.value).toBe(published.n);
        n++;
      }
    }
    expect(n).toBe(1352);
  });

  it("the page's whole view model is deep-equal whichever source supplied the panel", () => {
    const index = [...filePanel.headlineIndex].map(([m, v]) => ({ observationDate: `${m}-28`, indexValue: v }));
    const raw = (panel: typeof filePanel): RawInflationInputs => ({
      headline: [{ date: "2026-08-31", value: 11.1 }, { date: "2026-09-30", value: 10.3 }, { date: "2026-10-31", value: 9.6 }],
      core: [{ date: "2026-10-31", value: 7.8 }],
      food: [{ date: "2026-10-31", value: 7.8 }],
      index,
      policy: [{ date: "2026-10-26", value: 12 }],
      panel,
      panelIssues: [],
      snapshot: { observationDate: "2026-10-31", groups: [{ groupNo: 1, weightPct: 34.58, yoyPctChange: 7.74 }, { groupNo: 7, weightPct: 5.91, yoyPctChange: 28.61 }] },
      intl: null,
    });
    expect(buildInflationViewModel(raw(result.panel!))).toEqual(buildInflationViewModel(raw(filePanel)));
  });

  it("the group model, field by field, is identical (toEqual on the full structure)", () => {
    expect(buildGroupModel(result.panel!)).toEqual(buildGroupModel(filePanel));
  });

  describe("October 2026 reference figures (asserted here only; they are not in any production file)", () => {
    const fromLedger = referenceFigures(buildGroupModel(result.panel!)!, "2026-10")!;
    const fromFile = referenceFigures(buildGroupModel(filePanel)!, "2026-10")!;

    it("food contributes 2.85 percentage points", () => expect(fromLedger.foodContribution).toBeCloseTo(2.85, 2));
    it("the total contribution is 9.61 percentage points", () => expect(fromLedger.totalContribution).toBeCloseTo(9.61, 2));
    it("transport inflation is 28.61% year on year", () => expect(fromLedger.transportYoY).toBeCloseTo(28.61, 2));
    it("and they are bit-identical to the live-PBS figures, not merely close", () => expect(fromLedger).toEqual(fromFile));
  });

  describe("the identities the page relies on hold on ledger data", () => {
    it("Laspeyres: Σ w·I / Σ w reproduces the headline index in all 52 months (worst gap < 0.01 index points)", () => {
      const p = result.panel!;
      const wSum = p.groups.reduce((s, g) => s + g.weight, 0);
      let worst = 0;
      for (const m of p.months) worst = Math.max(worst, Math.abs(p.groups.reduce((s, g) => s + g.weight * (g.index.get(m) as number), 0) / wSum - (p.headlineIndex.get(m) as number)));
      expect(worst).toBeLessThan(0.01);
    });
    it("contributions sum to the headline YoY change in every month (within 0.02 pp)", () => {
      const rows = contributionsOverLag(result.panel!, 12);
      expect(rows).toHaveLength(40);
      for (const r of rows) expect(Math.abs(r.total - r.headlinePct)).toBeLessThan(0.02);
    });
  });
});

/** The real file plus a coherent 2026-11: group indices +1 %, headline = the weighted mean (so the identity holds), weights unchanged. */
function withNovember(xml: string): string {
  const p = parseCpiGroupPanel(xml).panel!;
  const wSum = p.groups.reduce((s, g) => s + g.weight, 0);
  const next = new Map<string, number>();
  for (const g of p.groups) next.set(`PCPI_CP_${String(g.groupNo).padStart(2, "0")}_IX`, (g.index.get("2026-10") as number) * 1.01);
  const headline = p.groups.reduce((s, g) => s + g.weight * (next.get(`PCPI_CP_${String(g.groupNo).padStart(2, "0")}_IX`) as number), 0) / wSum;
  const raw = rawValues(xml);
  return xml.replace(/(<Series [^>]*INDICATOR="([^"]+)"[^>]*>)([\s\S]*?)(<\/Series>)/g, (_m, open: string, ind: string, body: string, close: string) => {
    let value: number | undefined;
    if (ind === "PCPI_IX") value = headline;
    else if (next.has(ind)) value = next.get(ind);
    else value = raw.get(ind)?.get("2026-10")?.n; // weights and the total-weight series are constant
    return `${open}${body}<Obs TIME_PERIOD="2026-11" OBS_VALUE="${value}"/>${close}`;
  });
}

describe("the monthly update path: a new PBS release, ingested, is picked up by the reader", () => {
  it("seed the ledger with the current file, ingest the next month with the REAL writer: +26 observations, and the reader serves 53 months identical to F.1's model of the new file", async () => {
    const first = await runPbsCpiDryRun({ xml: FULL_XML });
    const next = withNovember(FULL_XML);
    expect(parseCpiGroupPanel(next).panel, "the extended file must itself be a valid F.1 file").not.toBeNull();
    const second = await runPbsCpiDryRun({ xml: next, ledger: first.ledger as InMemoryLedger });
    expect(second.plan.totals).toMatchObject({ newPeriods: 26, revisedPeriods: 0, seriesUpdated: 26, seriesUnchanged: 0 });

    const read = await readLedgerPanel(provenanceRpcFrom(second.ledger as InMemoryLedger), { sleep: async () => undefined });
    expect(read.issues).toEqual([]);
    expect(read.panel?.months).toHaveLength(53);
    expect(read.provenance?.latestMonth).toBe("2026-11");
    const rec = reconcilePanels(parseCpiGroupPanel(next).panel!, read.panel!);
    expect(rec.ok, rec.checks.filter((c) => !c.ok).map((c) => `${c.name}: ${c.detail}`).join("; ")).toBe(true);
  });

  it("a revision (a coherent change to an old month) is served as the CURRENT value; the old vintage stays in the ledger but is not read", async () => {
    const first = await runPbsCpiDryRun({ xml: FULL_XML });
    const revisedXml = reviseGroupIndex(FULL_XML, 7, "2026-09", 0.25);
    const second = await runPbsCpiDryRun({ xml: revisedXml, ledger: first.ledger as InMemoryLedger });
    expect(second.plan.totals.revisedPeriods).toBe(2); // the group index and the headline it moves
    const ledger = second.ledger as InMemoryLedger;
    expect(ledger.vintages("pbs:cpiGroupIndex07", "2026-09-30")).toHaveLength(2); // both vintages are kept...
    const read = await readLedgerPanel(provenanceRpcFrom(ledger), { sleep: async () => undefined });
    expect(read.panel).not.toBeNull();
    expect(reconcilePanels(parseCpiGroupPanel(revisedXml).panel!, read.panel!).ok).toBe(true); // ...but the reader sees the new one
  });
});

describe("the harness is sensitive (negative controls)", () => {
  it("a coherent REVISION visible on only one side is reported as a difference, with the first mismatch located", async () => {
    const revised = await ledgerPanelFor(reviseGroupIndex(FULL_XML, 7, "2026-10", 0.5));
    expect(revised.panel, "the revision keeps the identity, so the ledger accepts it").not.toBeNull();
    const rec = reconcilePanels(filePanel, revised.panel!);
    expect(rec.ok).toBe(false);
    const failed = rec.checks.filter((c) => !c.ok).map((c) => c.name);
    expect(failed).toContain("group indices (12 × months)");
    expect(failed).toContain("group contributions to headline YoY");
    expect(rec.checks.find((c) => c.name === "group indices (12 × months)")?.detail).toMatch(/group 7 2026-10/);
  });

  it("a ledger missing its newest month reports month-list and value differences (no silent truncation to a common window)", async () => {
    const shorter = parseCpiGroupPanel(FULL_XML.replace(/<Obs TIME_PERIOD="2026-10" OBS_VALUE="[^"]*"\/>/g, "")).panel!;
    const rec = reconcilePanels(filePanel, shorter);
    expect(rec.ok).toBe(false);
    expect(rec.checks.find((c) => c.name === "months")?.ok).toBe(false);
  });

  it("the comparison is EXACT: a single-ulp difference in one stored index is reported (it is not a tolerance check)", () => {
    const tweaked: typeof filePanel = {
      ...filePanel,
      groups: filePanel.groups.map((g) => (g.groupNo === 3 ? { ...g, index: new Map(g.index).set("2026-10", (g.index.get("2026-10") as number) * (1 + 2 ** -52)) } : g)),
    };
    expect(tweaked.groups[2].index.get("2026-10")).not.toBe(filePanel.groups[2].index.get("2026-10"));
    const rec = reconcilePanels(filePanel, tweaked);
    expect(rec.ok).toBe(false);
    const c = rec.checks.find((x) => x.name === "group indices (12 × months)");
    expect(c?.ok).toBe(false);
    expect(c?.maxAbsDiff).toBeGreaterThan(0);
    expect(c?.maxAbsDiff).toBeLessThan(1e-10); // …and it is really that small
  });

  it("identical panels reconcile (the control for the controls)", () => {
    expect(reconcilePanels(filePanel, parseCpiGroupPanel(FULL_XML).panel!).ok).toBe(true);
  });
});

describe("no reference figures in production code", () => {
  it("none of the new modules contains an October 2026 literal", () => {
    const files = ["src/lib/inflation/ledgerPanel.ts", "src/lib/inflation/panelSource.ts", "src/lib/inflation/ledgerReconciliation.ts", "src/lib/data/cpiGroupLedgerReader.ts"];
    for (const f of files) {
      const src = readFileSync(join(__dirname, "..", "..", "..", f), "utf-8");
      for (const literal of ["2.85", "9.61", "28.61", "307.62", "34.58"]) expect(src, `${f} contains ${literal}`).not.toContain(literal);
    }
  });
});
