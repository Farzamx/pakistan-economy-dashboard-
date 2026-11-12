import { describe, expect, it } from "vitest";
import { BUDGET_FLOWS, getBudgetFlowRecord, type BudgetFlowRecord } from "@/data/budgetFlows";
import {
  DEFAULT_LAYOUT,
  IDS,
  buildBudgetFlowGraph,
  diagnoseBudgetFlows,
  filterGraphByExpansion,
  getConnections,
  getExpandableParents,
  getFlowTableRows,
  getNodeDetail,
  getStageGroups,
  layoutSankey,
  prepareBudgetSankeyYear,
  prepareBudgetSankeyYears,
  reconcileFlowRecord,
  validateSankeyGraph,
  type SankeyGraph,
  type SankeyNode,
} from "./budgetSankey";

const fy27 = getBudgetFlowRecord("2026-27") as BudgetFlowRecord;
const fy26 = getBudgetFlowRecord("2025-26") as BudgetFlowRecord;
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const link = (g: SankeyGraph, id: string) => g.links.find((l) => l.id === id);
const val = (g: SankeyGraph, source: string, target: string) => link(g, `${source}>${target}`)?.value;

// A tiny hand-built graph so every rule can be exercised without the real data.
const n = (id: string, stage: SankeyNode["stage"], order = 0, kind: SankeyNode["kind"] = "revenue", extra: Partial<SankeyNode> = {}): SankeyNode => ({ id, label: id, stage, order, kind, colorKey: "total", description: "", source: "test", ...extra });
const tiny = (over: Partial<SankeyGraph> = {}): SankeyGraph => ({
  fiscalYear: "2099-00",
  estimateType: "BE",
  unit: "Rs billion",
  totalOutlay: 100,
  nodes: [n("a", 0, 0), n("b", 0, 1), n("c", 1, 0, "total")],
  links: [
    { id: "a>c", source: "a", target: "c", value: 30 },
    { id: "b>c", source: "b", target: "c", value: 70 },
  ],
  ...over,
});
const codes = (g: SankeyGraph) => validateSankeyGraph(g).issues.map((i) => i.code);

describe("flow dataset", () => {
  it("holds Budget Estimates for FY2025-26 and FY2026-27, each from its own Budget in Brief", () => {
    expect(BUDGET_FLOWS.map((r) => r.fiscalYear)).toEqual(["2025-26", "2026-27"]);
    for (const r of BUDGET_FLOWS) {
      expect(r.estimateType).toBe("BE");
      expect(r.document).toBe(`Budget in Brief ${r.fiscalYear}`);
      expect(r.tables.length).toBeGreaterThan(5);
    }
  });
  it("every figure is a finite number", () => {
    const bad: string[] = [];
    const walk = (v: unknown, path: string) => {
      if (typeof v === "number" && !Number.isFinite(v)) bad.push(path);
      else if (v && typeof v === "object" && !Array.isArray(v)) for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`);
    };
    BUDGET_FLOWS.forEach((r) => walk(r, r.fiscalYear));
    expect(bad).toEqual([]);
  });
});

describe("reconciliation to the printed totals", () => {
  for (const rec of BUDGET_FLOWS) {
    it(`FY${rec.fiscalYear}: every reconciliation check passes within its derived tolerance`, () => {
      const failed = reconcileFlowRecord(rec).filter((r) => !r.ok);
      expect(failed).toEqual([]);
      const d = prepareBudgetSankeyYear(rec).diagnostics;
      expect(d.ok).toBe(true);
      expect(d.issues.filter((i) => i.severity === "error")).toEqual([]);
    });
  }
  it("hand-worked FY2026-27: taxes, gross revenue, resources and expenditure", () => {
    const r = reconcileFlowRecord(fy27);
    const get = (id: string) => r.find((x) => x.id === id)!;
    // 7,480.521 + 26.581 + 22.318 + 83.580 = 7,613.000
    expect(get("direct-taxes").computed).toBeCloseTo(7613, 6);
    // 7,613 + 7,651 = 15,264; + non-tax 5,335.598 = 20,599.598 against a printed 20,600
    expect(get("fbr-taxes").computed).toBeCloseTo(15264, 6);
    expect(get("gross-revenue").computed).toBeCloseTo(20599.598, 6);
    expect(get("gross-revenue").difference).toBeCloseTo(-0.402, 6);
    // 11,751 + 7,020 = 18,771 = 17,495.417 + 1,000 + 276 - 0.417
    expect(get("resources").computed).toBeCloseTo(18771, 6);
    expect(get("expenditure").difference).toBeCloseTo(0.417, 6);
    expect(get("current-total").computed).toBeCloseTo(17495.417, 6);
  });
  it("FY2025-26: reports (does not hide) that its Table 10 rows add to Rs 0.457bn less than the printed total", () => {
    const c = reconcileFlowRecord(fy26).find((x) => x.id === "current-total")!;
    expect(c.printed).toBeCloseTo(16286.045, 6);
    expect(c.computed).toBeCloseTo(16285.588, 6);
    expect(c.difference).toBeCloseTo(-0.457, 6);
    expect(c.ok).toBe(true);
    expect(c.tolerance).toBe(0.5);
  });
  it("agrees with the canonical budget dataset on every overlapping figure", () => {
    for (const rec of BUDGET_FLOWS) {
      const canon = reconcileFlowRecord(rec).filter((r) => r.id.startsWith("canonical-"));
      expect(canon.length).toBe(10);
      expect(canon.every((c) => c.ok)).toBe(true);
    }
  });
  it("can fail: a corrupted tax figure breaks the Table 4 reconciliation and the year is not ok", () => {
    const bad = clone(fy27);
    bad.revenue.salesTax += 50;
    expect(reconcileFlowRecord(bad).find((r) => r.id === "indirect-taxes")?.ok).toBe(false);
    expect(prepareBudgetSankeyYear(bad).diagnostics.ok).toBe(false);
  });
  it("can fail: a figure that disagrees with the canonical dataset is caught", () => {
    const bad = clone(fy27);
    bad.revenue.printed.provincialShare = 8900;
    expect(reconcileFlowRecord(bad).find((r) => r.id === "canonical-provincial")?.ok).toBe(false);
  });
  it("can fail: parts that do not add to their printed parent (defence, subsidies, interest)", () => {
    const bad = clone(fy27);
    bad.current.defence.employees += 5;
    bad.current.subsidies.food += 5;
    bad.current.interest.foreign += 5;
    const failed = reconcileFlowRecord(bad).filter((r) => !r.ok).map((r) => r.id);
    expect(failed).toEqual(expect.arrayContaining(["defence-parts", "subsidies-parts", "interest-parts"]));
  });
  it("can fail: a missing figure is reported, not treated as zero", () => {
    const bad = clone(fy27) as unknown as { revenue: { salesTax: number } };
    bad.revenue.salesTax = Number.NaN;
    const rec = bad as unknown as BudgetFlowRecord;
    const d = diagnoseBudgetFlows(rec, buildBudgetFlowGraph(rec));
    expect(d.issues.some((i) => i.code === "MISSING_VALUE" && i.ref === "revenue.salesTax")).toBe(true);
    expect(d.ok).toBe(false);
  });
  it("can fail: a Revised Estimate record is refused", () => {
    const bad = { ...clone(fy27), estimateType: "RE" } as unknown as BudgetFlowRecord;
    const d = diagnoseBudgetFlows(bad, buildBudgetFlowGraph(bad));
    expect(d.issues.some((i) => i.code === "ESTIMATE_TYPE")).toBe(true);
    expect(d.ok).toBe(false);
  });
  it("a year the canonical dataset does not have cannot pass", () => {
    const orphan = { ...clone(fy27), fiscalYear: "1999-00" };
    expect(prepareBudgetSankeyYear(orphan).diagnostics.ok).toBe(false);
  });
});

describe("graph content (FY2026-27)", () => {
  const g = buildBudgetFlowGraph(fy27);
  it("is one fiscal year, Budget Estimates, in Rs billion", () => {
    expect(g.fiscalYear).toBe("2026-27");
    expect(g.estimateType).toBe("BE");
    expect(g.unit).toBe("Rs billion");
    expect(g.totalOutlay).toBe(18771);
  });
  it("carries the printed values on the flows", () => {
    expect(val(g, IDS.incomeTax, IDS.grossRevenue)).toBeCloseTo(7480.521, 6);
    expect(val(g, IDS.otherDirect, IDS.grossRevenue)).toBeCloseTo(132.479, 6); // 26.581 + 22.318 + 83.580
    expect(val(g, IDS.sbpProfit, IDS.grossRevenue)).toBe(1435.75);
    expect(val(g, IDS.petroleumLevy, IDS.grossRevenue)).toBeCloseTo(1676.509, 6);
    expect(val(g, IDS.total, IDS.provincial)).toBe(8848);
    expect(val(g, IDS.total, IDS.interest)).toBe(8054);
    expect(val(g, "int-domestic", "int-domestic")).toBeUndefined();
    expect(val(g, IDS.interest, "int-domestic")).toBeCloseTo(6982.607, 6);
    expect(val(g, IDS.bank, IDS.domesticBorrowing)).toBe(4012);
    expect(val(g, IDS.externalBorrowing, IDS.total)).toBe(813);
  });
  it("the derived remainders are exact: other non-tax = 5,335.598 - 1,435.750 - 1,676.509; other grants = 2,528.417 - 838 - 146 - 88 - 319.5", () => {
    expect(val(g, IDS.otherNonTax, IDS.grossRevenue)).toBeCloseTo(2223.339, 6);
    expect(val(g, IDS.grants, "gr-other")).toBeCloseTo(1136.917, 6);
    expect(g.nodes.find((x) => x.id === IDS.otherNonTax)?.derived).toBe(true);
    expect(g.nodes.find((x) => x.id === "gr-other")?.derived).toBe(true);
    // nothing else is derived
    expect(g.nodes.filter((x) => x.derived).map((x) => x.id).sort()).toEqual(["gr-other", IDS.otherNonTax].sort());
  });
  it("a zero budget line has no node and no flow (FY2026-27 has no petroleum subsidy; FY2025-26 does)", () => {
    expect(g.nodes.some((x) => x.id === "sub-petroleum")).toBe(false);
    expect(g.links.some((l) => l.target === "sub-petroleum")).toBe(false);
    const g26 = buildBudgetFlowGraph(fy26);
    expect(val(g26, IDS.subsidies, "sub-petroleum")).toBe(1.2);
  });
  it("has no zero, negative or non-finite flow, even for FY2025-26 whose commercial financing was negative", () => {
    for (const rec of BUDGET_FLOWS) {
      const graph = buildBudgetFlowGraph(rec);
      expect(graph.links.every((l) => Number.isFinite(l.value) && l.value > 0)).toBe(true);
    }
    expect(fy26.financing.external.commercialAndBonds).toBeLessThan(0);
    const node = buildBudgetFlowGraph(fy26).nodes.find((x) => x.id === IDS.externalBorrowing)!;
    expect(node.composition?.some((c) => c.value < 0)).toBe(true); // shown as information
    expect(val(buildBudgetFlowGraph(fy26), IDS.externalBorrowing, IDS.total)).toBe(106); // drawn as the printed net
  });
});

describe("revenue and borrowing stay separate", () => {
  for (const rec of BUDGET_FLOWS) {
    const g = buildBudgetFlowGraph(rec);
    const byId = new Map(g.nodes.map((x) => [x.id, x]));
    it(`FY${rec.fiscalYear}: gross revenue is fed only by revenue sources; borrowing never feeds a revenue node`, () => {
      const feeders = g.links.filter((l) => l.target === IDS.grossRevenue).map((l) => byId.get(l.source)!);
      expect(feeders.length).toBeGreaterThanOrEqual(7);
      expect(feeders.every((x) => x.kind === "revenue")).toBe(true);
      expect(g.links.some((l) => byId.get(l.source)!.kind === "financing" && byId.get(l.target)!.kind === "revenue")).toBe(false);
    });
    it(`FY${rec.fiscalYear}: the pool receives revenue and financing as distinct inflows`, () => {
      const into = g.links.filter((l) => l.target === IDS.total).map((l) => l.source).sort();
      expect(into).toEqual([IDS.domesticBorrowing, IDS.externalBorrowing, IDS.grossRevenue, IDS.privatisation].sort());
      const revenueIn = val(g, IDS.grossRevenue, IDS.total)!;
      const financingIn = (val(g, IDS.domesticBorrowing, IDS.total) ?? 0) + (val(g, IDS.externalBorrowing, IDS.total) ?? 0) + (val(g, IDS.privatisation, IDS.total) ?? 0);
      expect(revenueIn + financingIn).toBeCloseTo(g.links.filter((l) => l.target === IDS.total).reduce((a, l) => a + l.value, 0), 6);
    });
  }
  it("FY2026-27: financing is 7,020 of 27,619.6 resources; revenue 20,599.6", () => {
    const g = buildBudgetFlowGraph(fy27);
    expect(val(g, IDS.grossRevenue, IDS.total)).toBeCloseTo(20599.598, 6);
    const fin = (val(g, IDS.domesticBorrowing, IDS.total) ?? 0) + (val(g, IDS.externalBorrowing, IDS.total) ?? 0) + (val(g, IDS.privatisation, IDS.total) ?? 0);
    expect(fin).toBe(7020);
  });
});

describe("parent-child totals", () => {
  for (const rec of BUDGET_FLOWS) {
    const g = buildBudgetFlowGraph(rec);
    it(`FY${rec.fiscalYear}: every parent's detail flows add up to the parent's flow`, () => {
      for (const parent of getExpandableParents(g)) {
        const children = g.links.filter((l) => l.source === parent).reduce((a, l) => a + l.value, 0);
        const parentFlow = g.links.filter((l) => l.target === parent).reduce((a, l) => a + l.value, 0);
        expect(Math.abs(children - parentFlow)).toBeLessThanOrEqual(0.01);
      }
    });
    it(`FY${rec.fiscalYear}: the pool's outflows equal its inflows within the derived tolerance`, () => {
      const hub = validateSankeyGraph(g).balances.find((b) => b.id === IDS.total)!;
      expect(hub.ok).toBe(true);
      expect(Math.abs(hub.difference)).toBeLessThan(hub.tolerance);
    });
  }
  it("exactly the five lines the document itemises are expandable", () => {
    expect(getExpandableParents(buildBudgetFlowGraph(fy27)).sort()).toEqual([IDS.interest, IDS.defence, IDS.pension, IDS.grants, IDS.subsidies].sort());
  });
});

describe("validation can fail (each rule)", () => {
  it("accepts a clean graph and an empty one", () => {
    expect(validateSankeyGraph(tiny()).ok).toBe(true);
    expect(validateSankeyGraph(tiny({ nodes: [], links: [] }))).toEqual({ ok: true, issues: [], balances: [] });
  });
  it("duplicate node", () => expect(codes(tiny({ nodes: [...tiny().nodes, n("a", 0)] }))).toContain("DUPLICATE_NODE"));
  it("duplicate link", () => expect(codes(tiny({ links: [...tiny().links, { id: "a>c#2", source: "a", target: "c", value: 1 }] }))).toContain("DUPLICATE_LINK"));
  it("unknown node", () => expect(codes(tiny({ links: [{ id: "a>zz", source: "a", target: "zz", value: 5 }] }))).toContain("UNKNOWN_NODE"));
  it("self link", () => expect(codes(tiny({ links: [{ id: "a>a", source: "a", target: "a", value: 5 }] }))).toContain("SELF_LINK"));
  it("backward link", () => expect(codes(tiny({ links: [{ id: "c>a", source: "c", target: "a", value: 5 }] }))).toContain("BACKWARD_LINK"));
  it("negative value is an error", () => {
    const d = validateSankeyGraph(tiny({ links: [{ id: "a>c", source: "a", target: "c", value: -3 }] }));
    expect(d.issues.map((i) => i.code)).toContain("NEGATIVE_VALUE");
    expect(d.ok).toBe(false);
  });
  it("non-finite value is an error", () => expect(codes(tiny({ links: [{ id: "a>c", source: "a", target: "c", value: Number.NaN }] }))).toContain("NON_FINITE_VALUE"));
  it("zero value is only a warning", () => {
    const d = validateSankeyGraph(tiny({ links: [...tiny().links, { id: "x>c", source: "a", target: "c", value: 0 }] }));
    expect(d.issues.find((i) => i.code === "ZERO_VALUE")?.severity).toBe("warning");
  });
  it("wrong unit and wrong estimate type", () => {
    expect(codes({ ...tiny(), unit: "Rs million" as unknown as "Rs billion" })).toContain("UNIT_MISMATCH");
    expect(codes({ ...tiny(), estimateType: "RE" as unknown as "BE" })).toContain("ESTIMATE_TYPE");
  });
  it("orphan node is a warning", () => {
    const d = validateSankeyGraph(tiny({ nodes: [...tiny().nodes, n("lonely", 1, 5)] }));
    expect(d.issues.find((i) => i.code === "ORPHAN_NODE")?.severity).toBe("warning");
    expect(d.ok).toBe(true);
  });
  it("a node whose inflow and outflow disagree beyond tolerance is an error", () => {
    const g = tiny({ nodes: [n("a", 0), n("c", 1, 0, "spending"), n("d", 2, 0, "spending")], links: [{ id: "a>c", source: "a", target: "c", value: 50 }, { id: "c>d", source: "c", target: "d", value: 40 }] });
    expect(codes(g)).toContain("NODE_IMBALANCE");
  });
  it("borrowing feeding a revenue node is an error", () => {
    const g = tiny({ nodes: [n("loan", 0, 0, "financing"), n("rev", 1, 0, "revenue")], links: [{ id: "loan>rev", source: "loan", target: "rev", value: 9 }] });
    expect(codes(g)).toContain("BORROWING_AS_REVENUE");
  });
  it("a detail node must hang off its parent", () => {
    const g = tiny({ nodes: [n("p", 0, 0, "spending"), n("kid", 1, 0, "detail", { parentId: "p" })], links: [] });
    expect(codes(g)).toContain("DETAIL_PARENT");
  });
  it("conservation is checked on the real data and would catch a bad link", () => {
    const g = buildBudgetFlowGraph(fy27);
    const broken: SankeyGraph = { ...g, links: g.links.map((l) => (l.id === `${IDS.interest}>int-domestic` ? { ...l, value: l.value - 5 } : l)) };
    expect(validateSankeyGraph(broken).issues.some((i) => i.code === "NODE_IMBALANCE" && i.ref === IDS.interest)).toBe(true);
  });
  it("a remainder that would be negative produces no node and a failed check, not a negative flow", () => {
    const bad = clone(fy27);
    bad.revenue.sbpProfit = 5000; // more than the whole non-tax total
    const g = buildBudgetFlowGraph(bad);
    expect(g.nodes.some((x) => x.id === IDS.otherNonTax)).toBe(false);
    expect(reconcileFlowRecord(bad).find((r) => r.id === "non-tax-remainder")?.ok).toBe(false);
  });
});

describe("layout", () => {
  const opts = { width: 1000, height: 400, marginTop: 40, marginBottom: 20, marginLeft: 100, marginRight: 100, nodeWidth: 10, nodePadding: 10, minNodeHeight: 2 };
  it("hand-worked: two sources (30, 70) into one sink; the scale is set by the tightest column", () => {
    const L = layoutSankey(tiny(), opts);
    // inner height 340. column 0: (340 - 10) / 100 = 3.3 px per bn; column 1: 340 / 100 = 3.4. The minimum, 3.3, is used everywhere.
    expect(L.scale).toBeCloseTo(3.3, 9);
    expect(L.links.find((l) => l.id === "a>c")?.width).toBeCloseTo(99, 9);
    expect(L.links.find((l) => l.id === "b>c")?.width).toBeCloseTo(231, 9);
    expect(L.nodes.find((x) => x.id === "c")?.height).toBeCloseTo(330, 9);
    expect(L.columns.map((c) => c.x)).toEqual([100, 890]);
  });
  const g = buildBudgetFlowGraph(fy27);
  const L = layoutSankey(g);
  it("every flow's width is exactly its value times one shared scale", () => {
    expect(L.scale).toBeGreaterThan(0);
    for (const l of L.links) expect(l.width).toBeCloseTo(l.value * L.scale, 9);
    // proportionality across the whole diagram: ratio of widths equals ratio of values
    const a = L.links.find((l) => l.id === `${IDS.total}>${IDS.interest}`)!;
    const b = L.links.find((l) => l.id === `${IDS.total}>${IDS.defence}`)!;
    expect(a.width / b.width).toBeCloseTo(8054 / 3000, 9);
  });
  it("node height is its value times the scale, never smaller than the minimum", () => {
    for (const x of L.nodes) {
      expect(x.height).toBeGreaterThanOrEqual(DEFAULT_LAYOUT.minNodeHeight - 1e-9);
      expect(x.height).toBeGreaterThanOrEqual(x.value * L.scale - 1e-9);
      if (x.value * L.scale >= DEFAULT_LAYOUT.minNodeHeight) expect(x.height).toBeCloseTo(x.value * L.scale, 9);
    }
  });
  it("keeps every node inside the diagram, in order, with no overlaps in a column", () => {
    for (const x of L.nodes) {
      expect(x.y).toBeGreaterThanOrEqual(DEFAULT_LAYOUT.marginTop - 1e-6);
      expect(x.y + x.height).toBeLessThanOrEqual(L.height - DEFAULT_LAYOUT.marginBottom + 1e-6);
    }
    for (const col of L.columns) {
      const nodes = L.nodes.filter((x) => x.stage === col.stage).sort((p, q) => p.order - q.order);
      for (let i = 1; i < nodes.length; i++) expect(nodes[i].y).toBeGreaterThanOrEqual(nodes[i - 1].y + nodes[i - 1].height + DEFAULT_LAYOUT.nodePadding - 1e-6);
    }
  });
  it("stages run left to right and ribbons attach inside their nodes", () => {
    const xs = L.columns.map((c) => c.x);
    expect([...xs].sort((p, q) => p - q)).toEqual(xs);
    const by = new Map(L.nodes.map((x) => [x.id, x]));
    for (const l of L.links) {
      const s = by.get(l.source)!;
      const t = by.get(l.target)!;
      expect(l.y0).toBeGreaterThanOrEqual(s.y - 1e-6);
      expect(l.y0 + l.width / 2).toBeLessThanOrEqual(s.y + s.height + 1e-6);
      expect(l.y1).toBeGreaterThanOrEqual(t.y - 1e-6);
      expect(l.y1 + l.width / 2).toBeLessThanOrEqual(t.y + t.height + 1e-6);
      expect(l.x1).toBeGreaterThan(l.x0);
    }
  });
  it("is deterministic", () => expect(layoutSankey(g)).toEqual(layoutSankey(g)));
  it("collapsing the detail stage keeps the same scale logic and drops the last column", () => {
    const collapsed = layoutSankey(filterGraphByExpansion(g, new Set()));
    expect(collapsed.columns.map((c) => c.stage)).toEqual([0, 1, 2, 3]);
    expect(collapsed.nodes.length).toBe(g.nodes.filter((x) => x.kind !== "detail").length);
  });
  it("an empty graph lays out without throwing", () => {
    const e = layoutSankey({ ...g, nodes: [], links: [] });
    expect(e.nodes).toEqual([]);
    expect(e.links).toEqual([]);
    expect(e.scale).toBe(0);
  });
});

describe("expansion, selection, details and tables", () => {
  const g = buildBudgetFlowGraph(fy27);
  it("filterGraphByExpansion keeps detail only under expanded parents", () => {
    const one = filterGraphByExpansion(g, new Set([IDS.interest]));
    expect(one.nodes.filter((x) => x.kind === "detail").map((x) => x.id).sort()).toEqual(["int-domestic", "int-foreign"]);
    expect(one.links.every((l) => one.nodes.some((x) => x.id === l.source) && one.nodes.some((x) => x.id === l.target))).toBe(true);
    expect(validateSankeyGraph(one).ok).toBe(true);
    expect(filterGraphByExpansion(g, new Set(getExpandableParents(g))).nodes.length).toBe(g.nodes.length);
  });
  it("getConnections returns exactly the links touching a node and their far ends", () => {
    const c = getConnections(g, IDS.interest);
    expect([...c.linkIds].sort()).toEqual([`${IDS.interest}>int-domestic`, `${IDS.interest}>int-foreign`, `${IDS.total}>${IDS.interest}`].sort());
    expect([...c.nodeIds].sort()).toEqual([IDS.interest, "int-domestic", "int-foreign", IDS.total].sort());
    expect(getConnections(g, "nope").linkIds.size).toBe(0);
  });
  it("hand-worked details: interest payments", () => {
    const d = getNodeDetail(g, IDS.interest)!;
    expect(d.value).toBe(8054);
    // 8,054 / 27,619.598 resources = 29.16%; 8,054 / 18,771 outlay = 42.91%
    expect(d.pctOfTotalResources).toBeCloseTo((8054 / 27619.598) * 100, 6);
    expect(d.parent?.id).toBe(IDS.total);
    expect(d.pctOfOutlay).toBeCloseTo((8054 / 18771) * 100, 6);
    expect(d.incoming.map((x) => x.nodeId)).toEqual([IDS.total]);
    expect(d.outgoing.map((x) => x.label).sort()).toEqual(["Domestic debt", "Foreign debt"]);
    expect(d.outgoing.reduce((a, x) => a + x.pctOfNode, 0)).toBeCloseTo(100, 6);
  });
  it("hand-worked details: a detail node, a source and the provincial share", () => {
    const dom = getNodeDetail(g, "int-domestic")!;
    expect(dom.parent?.id).toBe(IDS.interest);
    expect(dom.parent?.pct).toBeCloseTo((6982.607 / 8054) * 100, 6);
    expect(dom.pctOfOutlay).toBeCloseTo((6982.607 / 18771) * 100, 6);
    const tax = getNodeDetail(g, IDS.incomeTax)!;
    expect(tax.parent?.id).toBe(IDS.grossRevenue);
    expect(tax.parent?.pct).toBeCloseTo((7480.521 / 20599.598) * 100, 6);
    expect(tax.pctOfOutlay).toBeNull(); // revenue is not part of expenditure
    const prov = getNodeDetail(g, IDS.provincial)!;
    expect(prov.pctOfOutlay).toBeNull(); // the provinces' share is not federal expenditure
    expect(prov.pctOfTotalResources).toBeCloseTo((8848 / 27619.598) * 100, 6);
    expect(getNodeDetail(g, IDS.total)?.parent).toBeNull();
    expect(getNodeDetail(g, "nope")).toBeNull();
  });
  it("the details keep the method notes: external borrowing is net, and its composition is shown", () => {
    const d = getNodeDetail(g, IDS.externalBorrowing)!;
    expect(d.node.composition?.length).toBe(5);
    expect(d.node.notes?.join(" ")).toMatch(/net/i);
  });
  it("getFlowTableRows has one row per flow and the pool's outgoing rows add to its outflow", () => {
    const rows = getFlowTableRows(g);
    expect(rows.length).toBe(g.links.length);
    const fromPool = rows.filter((r) => r.from === "Total resources");
    expect(fromPool.reduce((a, r) => a + r.value, 0)).toBeCloseTo(27619.417, 6);
    expect(fromPool.reduce((a, r) => a + r.pctOfSource, 0)).toBeCloseTo(100, 2);
    const first = rows[0];
    expect(first.stageFrom).toBe("Sources");
  });
  it("getStageGroups lists every stage with node shares of the pool", () => {
    const groups = getStageGroups(g);
    expect(groups.map((x) => x.stage)).toEqual([0, 1, 2, 3, 4]);
    expect(groups[2].nodes[0].pctOfTotalResources).toBeCloseTo(100, 6);
    // a node's value is the larger of its inflow and outflow, and defence's four printed sub-rows add to 3,000.001 against a printed 3,000, so allow Rs 0.005bn
    expect(groups[3].nodes.reduce((a, x) => a + x.value, 0)).toBeCloseTo(27619.417, 2);
  });
});

describe("year preparation", () => {
  it("returns newest first, each ok, with the official document taken from the canonical citation", () => {
    const years = prepareBudgetSankeyYears();
    expect(years.map((y) => y.fiscalYear)).toEqual(["2026-27", "2025-26"]);
    for (const y of years) {
      expect(y.diagnostics.ok).toBe(true);
      expect(y.graph.fiscalYear).toBe(y.fiscalYear);
      expect(y.sourceUrl).toMatch(/^https:\/\/www\.finance\.gov\.pk\//);
      expect(y.sourceDocument).toBe(`Budget in Brief ${y.fiscalYear}`);
    }
  });
  it("a graph never mixes years: every node, link and figure comes from one record", () => {
    const y = prepareBudgetSankeyYears()[0];
    expect(new Set([y.graph.fiscalYear]).size).toBe(1);
    expect(y.graph.estimateType).toBe("BE");
  });
  it("a failed year is still returned, so the page can explain why instead of drawing it", () => {
    const bad = clone(fy27);
    bad.revenue.customsDuties += 100;
    const prepared = prepareBudgetSankeyYear(bad);
    expect(prepared.diagnostics.ok).toBe(false);
    expect(prepared.diagnostics.reconciliation.filter((r) => !r.ok).length).toBeGreaterThan(0);
  });
});
