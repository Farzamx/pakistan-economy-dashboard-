// F.2b reconciliation: the data the adapter prepares for the ledger must reproduce
// F.1's analytics EXACTLY.
//
// Method: ingest the PBS file into the in-memory ledger through the real
// orchestrator, then rebuild an F.1 CpiGroupPanel purely from the LEDGER's rows (the
// way a ledger-backed page reader would), and compare it, and everything F.1
// computes from it, with F.1's own parse of the same file. A difference of even one
// ulp in any of the 1,352 values fails.
//
// The October 2026 figures asserted below are expectations in TESTS only. Production
// code computes them from data; a test asserts it contains no such literal.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PBS_CPI_SERIES } from "./pbsCpiGroupsAdapter";
import { InMemoryLedger } from "./inMemoryLedger";
import { runPbsCpiDryRun } from "./pbsCpiGroupsIngestion";
import { changeSeries, contributionsOverLag } from "@/lib/inflation/analytics";
import { parseCpiGroupPanel, type CpiGroupPanel } from "@/lib/inflation/pbsGroups";
import { buildGroupModel } from "@/lib/inflation/viewModel";
import { FULL_XML, TRIMMED_XML, rawValues } from "@/lib/inflation/__fixtures__/pbsCpiVariants";

/** Rebuild an F.1 panel from nothing but the ledger's current rows. */
async function panelFromLedger(ledger: InMemoryLedger): Promise<CpiGroupPanel> {
  async function read(key: string): Promise<Map<string, number>> {
    const res = await ledger.rpc("get_canonical_observation_history", { p_indicator_key: key, p_limit: 5000 });
    if (res.error) throw new Error(res.error.message);
    return new Map((res.data as { observation_period: string; value: number }[]).map((r) => [r.observation_period.slice(0, 7), r.value]));
  }
  const headlineIndex = await read("pbs:cpiIndexNational");
  const months = [...headlineIndex.keys()].sort();
  const groups: CpiGroupPanel["groups"] = [];
  for (let no = 1; no <= 12; no++) {
    const nn = String(no).padStart(2, "0");
    const index = await read(`pbs:cpiGroupIndex${nn}`);
    const weights = [...(await read(`pbs:cpiGroupWeight${nn}`)).values()];
    expect(new Set(weights).size, `group ${no} weight must be constant`).toBe(1);
    groups.push({ groupNo: no, weight: weights[0], index });
  }
  return { months, headlineIndex, groups };
}

for (const [name, xml, monthCount] of [["the full file (52 months)", FULL_XML, 52], ["the trimmed slice (17 months)", TRIMMED_XML, 17]] as const) {
  describe(`reconciliation with F.1: ${name}`, async () => {
    const run = await runPbsCpiDryRun({ xml });
    const f1 = parseCpiGroupPanel(xml).panel!;
    const fromLedger = await panelFromLedger(run.ledger!);

    it("the dry run prepared every observation", () => {
      expect(run.ok).toBe(true);
      expect(run.ledger!.current()).toHaveLength(26 * monthCount);
    });

    it("all 52 (or 17) months line up", () => {
      expect(fromLedger.months).toEqual(f1.months);
      expect(fromLedger.months).toHaveLength(monthCount);
    });

    it("the headline index is identical, bit for bit, in every month", () => {
      for (const m of f1.months) expect(fromLedger.headlineIndex.get(m), m).toBe(f1.headlineIndex.get(m));
    });

    it("every group index and every basket weight is identical, bit for bit — 12 groups × every month", () => {
      let compared = 0;
      for (const g of f1.groups) {
        const l = fromLedger.groups.find((x) => x.groupNo === g.groupNo)!;
        expect(l.weight, `weight ${g.groupNo}`).toBe(g.weight);
        for (const m of f1.months) {
          expect(l.index.get(m), `group ${g.groupNo} ${m}`).toBe(g.index.get(m));
          compared++;
        }
      }
      expect(compared).toBe(12 * monthCount);
    });

    it("all 26 series × all months equal the numbers in the source file read independently", () => {
      const source = rawValues(xml);
      let n = 0;
      for (const c of run.ledger!.current()) {
        const def = PBS_CPI_SERIES.find((d) => d.indicatorKey === c.indicator_key)!;
        expect(c.value, `${def.sdmxIndicator} ${c.observation_period}`).toBe(source.get(def.sdmxIndicator)!.get(c.observation_period.slice(0, 7))!.n);
        n++;
      }
      expect(n).toBe(26 * monthCount);
    });

    it("F.1's complete group model is reproduced exactly from ledger data (YoY, MoM, contributions, food vs rest)", () => {
      expect(buildGroupModel(fromLedger)).toEqual(buildGroupModel(f1));
    });

    it("group contributions are identical for the twelve-month and one-month changes", () => {
      expect(contributionsOverLag(fromLedger, 12)).toEqual(contributionsOverLag(f1, 12));
      expect(contributionsOverLag(fromLedger, 1)).toEqual(contributionsOverLag(f1, 1));
    });

    it("headline inflation reconciles: the contributions sum to the headline change, from ledger data", () => {
      for (const lag of [12, 1]) for (const row of contributionsOverLag(fromLedger, lag)) expect(Math.abs(row.total - row.headlinePct), `${row.month} lag ${lag}`).toBeLessThan(0.02);
      expect(changeSeries(fromLedger.headlineIndex, 12, fromLedger.months)).toEqual(changeSeries(f1.headlineIndex, 12, f1.months));
    });

    it("the monthly index reconstructs from the weights and group indices in every month", () => {
      const wSum = fromLedger.groups.reduce((s, g) => s + g.weight, 0);
      for (const m of fromLedger.months) {
        const reconstructed = fromLedger.groups.reduce((s, g) => s + g.weight * (g.index.get(m) as number), 0) / wSum;
        expect(Math.abs(reconstructed - (fromLedger.headlineIndex.get(m) as number)), m).toBeLessThan(0.05);
      }
    });

    it("the total-weight series agrees with the sum of the 12 weights in every month", async () => {
      const total = await run.ledger!.rpc("get_canonical_observation_history", { p_indicator_key: "pbs:cpiWeightTotal", p_limit: 5000 });
      const sum = fromLedger.groups.reduce((s, g) => s + g.weight, 0);
      for (const r of total.data as { value: number }[]) expect(Math.abs(r.value - sum)).toBeLessThan(0.1);
    });
  });
}

describe("the October 2026 baseline, computed from ledger-prepared data", async () => {
  const run = await runPbsCpiDryRun({ xml: FULL_XML });
  const model = buildGroupModel(await panelFromLedger(run.ledger!))!;
  const oct = model.contribYoY.find((r) => r.month === "2026-10")!;

  it("food contributes 2.85 percentage points", () => {
    expect(oct.byGroup[1]).toBeCloseTo(2.85, 2);
  });

  it("the total contribution is 9.61 percentage points", () => {
    expect(oct.total).toBeCloseTo(9.61, 2);
    expect(oct.headlinePct).toBeCloseTo(9.61, 2);
  });

  it("transport inflation is 28.61% year on year", () => {
    expect(model.yoy[7].find((p) => p.month === "2026-10")!.value).toBeCloseTo(28.61, 2);
  });

  it("the weights are the fixed 2015-16 basket weights PBS publishes (food 34.58%, transport 5.91%)", () => {
    expect(model.weights[1]).toBeCloseTo(34.58, 1);
    expect(model.weights[7]).toBeCloseTo(5.91, 1);
  });
});

describe("the reconciliation is sensitive (negative control)", () => {
  it("a single altered ledger value is detected: the rebuilt model no longer matches F.1", async () => {
    const run = await runPbsCpiDryRun({ xml: FULL_XML });
    const f1 = parseCpiGroupPanel(FULL_XML).panel!;
    const altered = await panelFromLedger(run.ledger!);
    const g7 = altered.groups.find((g) => g.groupNo === 7)!;
    g7.index.set("2026-10", (g7.index.get("2026-10") as number) + 0.5);
    expect(buildGroupModel(altered)).not.toEqual(buildGroupModel(f1));
  });
});

describe("production code contains no hard-coded results", () => {
  it("none of the baseline figures appear in the adapter, the ingestion library or the script", () => {
    const root = join(__dirname, "..", "..", "..");
    for (const f of ["src/lib/providers/pbsCpiGroupsAdapter.ts", "src/lib/providers/pbsCpiGroupsIngestion.ts", "src/lib/providers/inMemoryLedger.ts", "scripts/ingestPbsCpiGroups.ts"]) {
      const src = readFileSync(join(root, f), "utf-8");
      for (const literal of ["2.85", "9.61", "28.61", "307.62", "34.58"]) expect(src, `${f} contains ${literal}`).not.toContain(literal);
    }
  });
});
