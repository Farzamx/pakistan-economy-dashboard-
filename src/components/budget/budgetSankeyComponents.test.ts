import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BUDGET_FLOWS } from "@/data/budgetFlows";
import { formatBn, formatNumber, formatShare, formatSigned } from "@/lib/budget/sankeyFormat";
import { buildBudgetFlowGraph, layoutSankey, prepareBudgetSankeyYear, prepareBudgetSankeyYears, getStageGroups, getExpandableParents } from "@/lib/budget/budgetSankey";
import BudgetSankeyDiagram from "./BudgetSankeyDiagram";
import BudgetSankeySvg from "./BudgetSankeySvg";
import BudgetSankeyStageList from "./BudgetSankeyStageList";

const root = process.cwd();
const src = (p: string) => readFileSync(join(root, p), "utf8");
const years = prepareBudgetSankeyYears();
const coverage = { first: "2010-11", last: "2026-27" };
type DiagramProps = Parameters<typeof BudgetSankeyDiagram>[0];
const render = (props: Omit<DiagramProps, "historicalCoverage"> & { historicalCoverage?: DiagramProps["historicalCoverage"] }) => renderToStaticMarkup(createElement(BudgetSankeyDiagram, { historicalCoverage: coverage, ...props }));
const html = render({ years });

describe("formatting", () => {
  it("formatBn keeps small flows from reading as zero", () => {
    expect(formatBn(8054)).toBe("Rs 8,054bn");
    expect(formatBn(152)).toBe("Rs 152.0bn");
    expect(formatBn(19)).toBe("Rs 19.0bn");
    expect(formatBn(1.2)).toBe("Rs 1.20bn");
    expect(formatBn(Number.NaN)).toBe("—");
  });
  it("formatShare uses two decimals below 1%", () => {
    expect(formatShare(29.16)).toBe("29.2%");
    expect(formatShare(0.38)).toBe("0.38%");
    expect(formatShare(Number.NaN)).toBe("—");
  });
  it("formatNumber and formatSigned", () => {
    expect(formatNumber(20599.598, 3)).toBe("20,599.598");
    expect(formatSigned(0.417)).toBe("+0.417");
    expect(formatSigned(-0.402)).toBe("−0.402");
    expect(formatSigned(0)).toBe("0.000");
  });
});

describe("BudgetSankeyDiagram (server-rendered)", () => {
  it("carries the section title, subtitle, fiscal year, basis, unit and source in the first HTML", () => {
    expect(html).toContain("Where Does Pakistan&#x27;s Budget Money Go?");
    expect(html).toContain("Follow government revenue, borrowing and federal expenditure through Pakistan&#x27;s budget.");
    expect(html).toContain("FY2026-27 · Budget Estimates");
    expect(html).toContain("PKR billion (Rs bn)");
    expect(html).toMatch(/href="https:\/\/www\.finance\.gov\.pk\//);
    expect(html).toContain("Budget in Brief 2026-27");
  });
  it("offers exactly the years that reconcile, and no revised-estimate or actuals toggle", () => {
    expect(html).toContain("FY2025-26");
    expect(html).toMatch(/aria-label="Fiscal year of the flow diagram"/);
    expect(html).toContain("Revised estimates and actuals are not offered");
    expect(html).not.toMatch(/>Revised</);
    expect(html).not.toMatch(/>Actual/);
  });
  it("draws every node as a focusable, labelled button with its amount and share", () => {
    const g = years[0].graph;
    const buttons = html.match(/role="button"/g) ?? [];
    expect(buttons.length).toBeGreaterThanOrEqual(g.nodes.length); // plus the stage-list rows
    expect(html).toContain('aria-label="Interest payments: Rs 8,054bn, 29.2% of total resources."');
    expect(html).toContain('aria-label="Total resources: Rs 27,620bn, 100.0% of total resources."');
    expect(html).toMatch(/tabindex="0"/);
    expect(html).toContain('aria-pressed="false"');
  });
  it("shows the legend, with borrowing marked as not revenue", () => {
    expect(html).toContain('data-testid="budget-sankey-legend"');
    expect(html).toContain("Borrowing and financing");
    expect(html).toContain("not revenue");
  });
  it("states the methodology disclosures on the page", () => {
    expect(html).toContain("Borrowing is financing, not revenue.");
    expect(html).toContain("Money is fungible");
    expect(html).toContain("proportional to the amount on one scale");
    expect(html).toContain("remainder");
  });
  it("includes the accessible table alternative and the reconciliation with its result column", () => {
    expect(html).toContain('data-testid="budget-sankey-tables"');
    expect(html).toContain("View the flows and the reconciliation as tables");
    expect(html).toContain('data-testid="budget-sankey-reconciliation"');
    expect(html).toMatch(/Reconciliation: 32 of 32 checks pass/);
    expect(html).toContain("Within tolerance");
    expect(html).not.toContain("Does not reconcile");
    expect(html).toContain("20,599.598");
    // one row per flow in the flows table, plus the 32 reconciliation rows
    const flowRows = years[0].graph.links.length;
    expect((html.match(/<tr class="border-t/g) ?? []).length).toBe(flowRows + 32);
  });
  it("has a phone layout built from the same data, not the desktop diagram shrunk", () => {
    expect(html).toContain('data-testid="budget-sankey-stages"');
    expect(html).toContain("Stage 1 · Sources");
    expect(html).toContain("Open the full diagram (scroll sideways)");
    expect(html).toMatch(/class="relative hidden md:block"/);
    expect(html).toMatch(/class="md:hidden"/);
  });
  it("switches the ribbon animation off under reduced motion", () => {
    expect(html).toContain("@media (prefers-reduced-motion: reduce)");
    expect(html).toMatch(/animation: none/);
  });
  it("starts with nothing selected and a hint, and the expand/collapse controls", () => {
    expect(html).toContain('data-testid="budget-sankey-detail-empty"');
    expect(html).toContain("Show all breakdowns");
    expect(html).toContain("Overview only");
  });
  it("shows an informative no-data state, not an empty chart, when there are no years", () => {
    const empty = render({ years: [] });
    expect(empty).toContain('data-testid="budget-sankey-nodata"');
    expect(empty).toContain("The budget flow diagram is not shown.");
    expect(empty).toContain("No fiscal year has verified revenue, financing and expenditure detail yet");
    expect(empty).not.toContain('data-testid="budget-sankey-svg"');
  });
  it("withholds a year that does not reconcile and says which check failed", () => {
    const bad = JSON.parse(JSON.stringify(BUDGET_FLOWS[1]));
    bad.revenue.salesTax += 80;
    const failedYear = prepareBudgetSankeyYear(bad);
    expect(failedYear.diagnostics.ok).toBe(false);
    const out = render({ years: [failedYear] });
    expect(out).toContain('data-testid="budget-sankey-nodata"');
    expect(out).toContain("did not pass the reconciliation checks");
    expect(out).toMatch(/Customs duties \+ sales tax \+ federal excise = Indirect Taxes/);
    expect(out).not.toContain('data-testid="budget-sankey-svg"');
  });
  it("draws only the years that reconcile when another year fails", () => {
    const bad = JSON.parse(JSON.stringify(BUDGET_FLOWS[0]));
    bad.revenue.salesTax += 80;
    const mixed = render({ years: [years[0], prepareBudgetSankeyYear(bad)] });
    expect(mixed).toContain("FY2026-27 · Budget Estimates");
    expect(mixed).not.toContain("FY2025-26 · Budget Estimates");
    expect(mixed).not.toMatch(/aria-label="Fiscal year of the flow diagram"/); // one drawable year: no selector
  });
});

describe("data transparency panel", () => {
  const fy26Only = prepareBudgetSankeyYears().filter((y) => y.fiscalYear === "2025-26");
  const fy26 = render({ years: fy26Only });
  it("states the basis, currency and both coverages immediately", () => {
    expect(html).toContain('data-testid="budget-sankey-transparency"');
    expect(html).toContain("FY2025-26 and FY2026-27");
    expect(html).toContain("two fiscal years with detailed flows");
    expect(html).toContain("historical charts below cover FY2010-11 to FY2026-27");
    expect(html).toContain("PKR billion (Rs bn)");
    expect(html).toContain("nominal");
  });
  it("makes estimates versus actual spending unmistakable: a badge beside the year and a dedicated statement", () => {
    expect(html).toContain("Plans, not actual spending");
    expect(html).toContain("Estimates, not actual spending");
    expect(html).toMatch(/not what was actually spent/);
    expect(html).toMatch(/actuals are not shown in this diagram or anywhere in this workshop/);
  });
  it("says revenue and borrowing are separate, and names the derived remainders and the grouped blocks with their parts", () => {
    expect(html).toContain("Revenue and borrowing are separate");
    expect(html).toContain("never counted as revenue");
    expect(html).toContain("Derived remainders (*)");
    expect(html).toContain("Other non-tax receipts; Other grants to others");
    expect(html).toContain("Grouped for legibility");
    for (const grouped of ["Other direct taxes", "Pension fund and increases", "AJK and Gilgit-Baltistan"]) expect(html).toContain(grouped);
    expect(html).toContain("The source prints these items separately");
    expect(html).toContain("Each part is listed in the block&#x27;s details");
  });
  it("names what the source does not provide", () => {
    expect(html).toContain("Not available from the source");
    expect(html).toContain("not split by province");
  });
  it("with a single drawable year the coverage line says so", () => {
    expect(fy26).toContain("FY2025-26");
    expect(fy26).toContain("one fiscal year with detailed flows");
  });
});

describe("reconciliation presentation", () => {
  const fy26 = render({ years: prepareBudgetSankeyYears().filter((y) => y.fiscalYear === "2025-26") });
  it("shows a visible summary: checks passing, how many differ, and the largest difference", () => {
    expect(html).toContain('data-testid="budget-sankey-recon-summary"');
    expect(html).toMatch(/Reconciliation, FY2026-27: 32 of 32 checks pass\./);
    expect(html).toMatch(/show a small difference inside the allowed tolerance; the largest is Rs/);
    expect(html).toContain("No figure was adjusted to make a total match");
  });
  it("FY2025-26: shows the Rs 0.457bn gap inside Table 10 transparently, outside the collapsed details", () => {
    expect(fy26).toContain('data-testid="budget-sankey-source-gap"');
    expect(fy26).toContain("A gap inside the source document.");
    expect(fy26).toContain("Rs 16,285.588bn against a printed total of Rs 16,286.045bn");
    expect(fy26).toContain("Rs 0.457bn");
    expect(fy26).toContain("inside the source itself");
    expect(fy26).toContain("draws every row exactly as printed and does not adjust any figure");
    expect(fy26).toContain("gap in the source");
  });
  it("FY2026-27 has no source gap, and says nothing alarming about one", () => {
    expect(html).not.toContain('data-testid="budget-sankey-source-gap"');
    expect(html).not.toContain("gap in the source");
  });
  it("every non-zero difference in the reconciliation table carries an explanation", () => {
    for (const y of years) {
      for (const c of y.diagnostics.reconciliation) {
        if (Math.abs(c.difference) >= 0.0005) expect(c.note, `${y.fiscalYear} ${c.id}`).toBeTruthy();
        else expect(c.note, `${y.fiscalYear} ${c.id}`).toBeUndefined();
      }
    }
    expect(fy26).toContain("Table 1 and Table 2 print whole Rs billion");
  });
  it("the source figures are unchanged: the Table 10 rows still add to 16,285.588 and the printed total is still 16,286.045", () => {
    const c = years.find((y) => y.fiscalYear === "2025-26")!.diagnostics.reconciliation.find((r) => r.id === "current-total")!;
    expect(c.printed).toBeCloseTo(16286.045, 9);
    expect(c.computed).toBeCloseTo(16285.588, 9);
    expect(c.ok).toBe(true);
    expect(c.sourceGap).toBe(true);
    expect(c.tolerance).toBe(0.5); // the tolerance policy is unchanged
  });
});

describe("BudgetSankeySvg", () => {
  const g = buildBudgetFlowGraph(BUDGET_FLOWS[1]);
  const layout = layoutSankey(g);
  const svgHtml = renderToStaticMarkup(createElement(BudgetSankeySvg, { layout, graph: g, selectedId: null, hover: null, totalResources: 27619.598, fiscalYear: "2026-27", onSelect: () => undefined, onHover: () => undefined }));
  it("paints every ribbon at exactly its laid-out width (value × one scale)", () => {
    const visible = [...svgHtml.matchAll(/<path class="sankey-link-[^"]*" d="[^"]*" stroke="[^"]*" stroke-width="([\d.]+)" stroke-opacity/g)].map((m) => Number(m[1]));
    expect(visible.length).toBe(layout.links.length);
    layout.links.forEach((l, i) => expect(visible[i]).toBeCloseTo(l.width, 6));
    const interest = visible[layout.links.findIndex((l) => l.id === "total-resources>interest")];
    const defence = visible[layout.links.findIndex((l) => l.id === "total-resources>defence")];
    expect(interest / defence).toBeCloseTo(8054 / 3000, 6);
  });
  it("gives hairline flows a wider invisible hover target without changing their drawn width", () => {
    const hits = [...svgHtml.matchAll(/stroke="transparent" stroke-width="([\d.]+)"/g)].map((m) => Number(m[1]));
    expect(hits.length).toBe(layout.links.length + layout.nodes.length * 0); // node targets are rects, not strokes
    expect(Math.min(...hits)).toBeGreaterThanOrEqual(9);
  });
  it("hatches borrowing so it is not distinguished by colour alone", () => {
    expect(svgHtml).toMatch(/<pattern id="hatch-/);
    expect(svgHtml).toMatch(/stroke="url\(#hatch-/);
    expect(svgHtml).toMatch(/fill="url\(#hatch-/);
  });
  it("labels the stages and marks remainders with an asterisk", () => {
    for (const t of ["Sources", "Revenue and financing", "Total resources", "Allocation", "Detail"]) expect(svgHtml).toContain(t);
    expect(svgHtml).toContain("Other non-tax receipts *");
  });
  it("selecting a node dims unrelated ribbons and keeps connected ones prominent", () => {
    const sel = renderToStaticMarkup(createElement(BudgetSankeySvg, { layout, graph: g, selectedId: "interest", hover: null, totalResources: 27619.598, fiscalYear: "2026-27", onSelect: () => undefined, onHover: () => undefined }));
    const opacities = [...sel.matchAll(/stroke-width="[\d.]+" stroke-opacity="([\d.]+)"/g)].map((m) => Number(m[1]));
    expect(opacities.filter((o) => o === 0.7).length).toBe(3); // total>interest and its two detail flows
    expect(opacities.filter((o) => o === 0.08).length).toBe(layout.links.length - 3);
    expect(sel).toContain('aria-pressed="true"');
  });
});

describe("BudgetSankeyStageList", () => {
  const g = years[0].graph;
  const groups = getStageGroups(g);
  it("lists every stage and node with amount and share, and marks linked rows", () => {
    const list = renderToStaticMarkup(
      createElement(BudgetSankeyStageList, { groups, selectedId: "interest", connectedIds: new Set(["interest", "total-resources", "int-domestic", "int-foreign"]), expandable: new Set(getExpandableParents(g)), expanded: new Set(getExpandableParents(g)), onSelect: () => undefined, onToggleExpand: () => undefined }),
    );
    expect(list).toContain("Stage 5 · Detail");
    expect(list).toContain("Rs 8,054bn");
    expect((list.match(/>linked</g) ?? []).length).toBe(3);
    expect(list).toContain("Hide breakdown");
    expect(list).toContain("borrowing");
  });
});

describe("section titles on /budget", () => {
  const workspace = src("src/components/budget/BudgetWorkspace.tsx");
  const en = src("src/lib/i18n/translations/en.ts");
  const rm = src("src/lib/i18n/translations/rm.ts");
  const ur = src("src/lib/i18n/translations/ur.ts");
  it("the Sankey keeps the requested title and it appears once in the budget components", () => {
    expect(html).toContain("Where Does Pakistan&#x27;s Budget Money Go?");
    const files = readdirSync(join(root, "src/components/budget")).filter((f) => f.endsWith(".tsx"));
    const uses = files.filter((f) => src(`src/components/budget/${f}`).includes("Where Does Pakistan&apos;s Budget Money Go?"));
    expect(uses).toEqual(["BudgetSankeyDiagram.tsx"]);
  });
  it("the allocation section has its own accurate title in all three languages and no longer shares the old wording", () => {
    expect(workspace).toContain('{t("budget.allocationTitle")}');
    expect(workspace).not.toContain("budget.whereDoesGo\"");
    expect(en).toContain('allocationTitle: "Budget Allocation by Category"');
    expect(rm).toMatch(/allocationTitle: "[^"]+"/);
    expect(ur).toMatch(/allocationTitle: "[^"]+"/);
  });
  it("the allocation section keeps its anchor, description and chart controls", () => {
    expect(workspace).toContain('id="alloc-h"');
    expect(workspace).toContain('t("budget.whereDoesGoDesc")');
    expect(workspace).toContain('aria-label="Allocation chart type"');
    for (const view of ["Bars", "Donut", "Treemap"]) expect(workspace).toContain(`label: "${view}"`);
  });
});

describe("separation of data preparation and rendering", () => {
  // the server-side section is where data legitimately enters; the components that draw and handle interaction must receive everything as props
  const files = ["BudgetSankeyDiagram.tsx", "BudgetSankeySvg.tsx", "BudgetSankeyStageList.tsx"].map((f) => [f, src(`src/components/budget/${f}`)] as const);
  it("no rendering component imports a data file or contains a budget figure", () => {
    for (const [name, text] of files) {
      expect(text, name).not.toMatch(/from "@\/data\//);
      expect(text, name).not.toMatch(/(?<![\d,.])\d{1,3},\d{3}(?![\d,])/); // no hard-coded rupee amounts (rgba(255,255,255,…) colour lists are not matched)
    }
  });
  it("the components do not do money arithmetic beyond shares from the pure helpers", () => {
    const svg = src("src/components/budget/BudgetSankeySvg.tsx");
    expect(svg).not.toMatch(/\.reduce\(/); // no summing of flows in the renderer
  });
  it("the section is wired into the existing /budget page, not a new route", () => {
    const page = src("src/app/budget/page.tsx");
    expect(page).toMatch(/BudgetSankeySection/);
    expect(page).toMatch(/flowSlot=\{<BudgetSankeySection \/>\}/);
    expect(src("src/components/budget/BudgetWorkspace.tsx")).toMatch(/\{flowSlot\}/);
    const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
    const routes = walk(join(root, "src/app")).filter((p) => /sankey/i.test(p));
    expect(routes).toEqual([]);
  });
  it("preparation happens on the server: the section is a server component", () => {
    expect(src("src/components/budget/BudgetSankeySection.tsx")).not.toMatch(/"use client"/);
    expect(src("src/components/budget/BudgetSankeyDiagram.tsx")).toMatch(/^"use client"/);
  });
});
