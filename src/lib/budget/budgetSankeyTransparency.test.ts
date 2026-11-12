import { describe, expect, it } from "vitest";
import { BUDGET_FLOWS, type BudgetFlowRecord } from "@/data/budgetFlows";
import { buildBudgetFlowGraph, explainDifference, getTransparencySummary, reconcileFlowRecord, summarizeReconciliation } from "./budgetSankey";

const fy27 = BUDGET_FLOWS.find((r) => r.fiscalYear === "2026-27") as BudgetFlowRecord;
const fy26 = BUDGET_FLOWS.find((r) => r.fiscalYear === "2025-26") as BudgetFlowRecord;
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

describe("explainDifference", () => {
  it("has no note for a zero (or sub-Rs-1-million) difference", () => {
    expect(explainDifference("direct-taxes", 7613, 7613, 0, "Table 4")).toBeUndefined();
    expect(explainDifference("direct-taxes", 7613, 7613.0001, 0.0001, "Table 4")).toBeUndefined();
    expect(explainDifference("direct-taxes", 7613, Number.NaN, Number.NaN, "Table 4")).toBeUndefined();
  });
  it("names the figures and the gap for the Table 10 total", () => {
    const n = explainDifference("current-total", 16286.045, 16285.588, -0.457, "Table 10")!;
    expect(n).toContain("Rs 16,285.588bn");
    expect(n).toContain("Rs 16,286.045bn");
    expect(n).toContain("Rs 0.457bn");
    expect(n).toContain("inside the source itself");
    expect(n).toContain("does not adjust any figure");
  });
  it("explains whole-billion rounding for Table 1/2 identities and canonical comparisons differently", () => {
    expect(explainDifference("gross-revenue", 20600, 20599.598, -0.402, "Table 1")).toContain("whole Rs billion");
    expect(explainDifference("canonical-grants", 2680, 2680.417, 0.417, "budgetHistorical.ts")).toContain("canonical budget dataset");
    expect(explainDifference("defence-parts", 3000, 3000.001, 0.001, "Function-wise table (2)")).toContain("rounding in the source table");
    expect(explainDifference("pool-conservation", 25780.09, 25778.588, -1.502, "Diagram")).toContain("4bn allowance");
    // a Rs-million table must not be blamed on whole-billion rounding
    const t9 = explainDifference("external-gross-to-net", 105.523, 105.522, -0.001, "Table 9")!;
    expect(t9).toContain("Rs million");
    expect(t9).not.toContain("whole Rs billion");
  });
});

describe("summarizeReconciliation", () => {
  it("FY2026-27: 32 of 32 pass, several small differences, the largest named, no source gap", () => {
    const s = summarizeReconciliation(reconcileFlowRecord(fy27));
    expect(s.total).toBe(31); // before the diagram-level pool check, which the page adds
    expect(s.passing).toBe(31);
    expect(s.withDifference).toBeGreaterThan(3);
    expect(s.sourceGaps).toEqual([]);
    expect(Math.abs(s.largest!.difference)).toBeCloseTo(1, 6); // net revenue: 11,752 against a printed 11,751
  });
  it("FY2025-26: flags exactly one gap inside the source, the Table 10 total", () => {
    const s = summarizeReconciliation(reconcileFlowRecord(fy26));
    expect(s.sourceGaps.map((g) => g.id)).toEqual(["current-total"]);
    expect(s.sourceGaps[0].difference).toBeCloseTo(-0.457, 9);
    expect(s.sourceGaps[0].ok).toBe(true);
  });
  it("can fail: a corrupted record is counted as failing and the largest difference follows it", () => {
    const bad = clone(fy27);
    bad.revenue.salesTax += 80;
    const s = summarizeReconciliation(reconcileFlowRecord(bad));
    expect(s.passing).toBeLessThan(s.total);
    expect(Math.abs(s.largest!.difference)).toBeGreaterThanOrEqual(80);
  });
  it("an exactly-footing record has no source gap", () => {
    const exact = clone(fy26);
    exact.current.runningOfCivilGovernment += 0.457; // makes Table 10's rows add to the printed total
    const gap = reconcileFlowRecord(exact).find((r) => r.id === "current-total")!;
    expect(gap.sourceGap).toBe(false);
    expect(gap.note).toBeUndefined();
  });
  it("an empty list does not throw", () => {
    expect(summarizeReconciliation([])).toEqual({ total: 0, passing: 0, withDifference: 0, largest: null, sourceGaps: [] });
  });
});

describe("getTransparencySummary", () => {
  for (const rec of BUDGET_FLOWS) {
    it(`FY${rec.fiscalYear}: lists exactly the two remainders and the three grouped blocks, with their parts`, () => {
      const t = getTransparencySummary(buildBudgetFlowGraph(rec));
      expect(t.derived.map((d) => d.label).sort()).toEqual(["Other grants to others", "Other non-tax receipts"]);
      expect(t.grouped.map((g) => g.label).sort()).toEqual(["AJK and Gilgit-Baltistan", "Other direct taxes", "Pension fund and increases"]);
      expect(t.grouped.every((g) => g.parts.length >= 2)).toBe(true);
    });
  }
  it("a derived remainder is never also reported as a grouped block", () => {
    const t = getTransparencySummary(buildBudgetFlowGraph(fy27));
    const derived = new Set(t.derived.map((d) => d.label));
    expect(t.grouped.some((g) => derived.has(g.label))).toBe(false);
  });
});
