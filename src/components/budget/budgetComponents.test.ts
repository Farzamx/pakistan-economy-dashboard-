import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BUDGET_HISTORICAL } from "@/data/budgetHistorical";
import { generateBudgetInsights, getAllocationDetail } from "@/lib/budget/budgetData";
import BudgetAllocationBars from "./BudgetAllocationBars";
import BudgetInsightsPanel from "./BudgetInsightsPanel";
import BudgetMethodology, { BudgetSourceRegister } from "./BudgetMethodology";
import BudgetRibbon from "./BudgetRibbon";

const years = BUDGET_HISTORICAL.years;
const latest = years[years.length - 1];

describe("BudgetRibbon", () => {
  const html = renderToStaticMarkup(createElement(BudgetRibbon));
  it("names the workshop and its exact coverage from the dataset", () => {
    expect(html).toContain("Budget Tracker Workshop");
    expect(html).toContain("FY2010-11 to FY2026-27");
    expect(html).toContain("Budget Estimates");
  });
  it("is a slim single-row ribbon, not a hero (no heading element, small text)", () => {
    expect(html).not.toMatch(/<h[12]/);
    expect(html).toMatch(/py-2\.5/);
  });
});

describe("BudgetAllocationBars (server-rendered)", () => {
  const detail = getAllocationDetail(latest);
  const html = renderToStaticMarkup(createElement(BudgetAllocationBars, { data: detail.slices, fiscalYear: latest.fiscalYear }));
  it("prints every slice's amount and share as text in the first HTML", () => {
    expect(html).toContain("Rs 8,054bn");
    expect(html).toContain("29.2%");
    expect(html).toContain("Rs 8,848bn");
    expect(html).toContain("32.0%");
    expect(html).toContain("Rs 4,457bn");
    expect(html).toContain("16.1%");
  });
  it("sets the final width in the markup and animates by CSS only, disabled under reduced motion", () => {
    expect(html).toMatch(/width:100%/);
    expect(html).toContain("@media (prefers-reduced-motion: reduce)");
    expect(html).toMatch(/animation: none/);
  });
  it("labels the list for assistive technology and marks the remainder", () => {
    expect(html).toContain('aria-label="Allocation of the FY2026-27 budget envelope"');
    expect(html).toContain("remainder");
  });
  it("shows FY2010-11's bundled slice as bundled, with no zero-rupee debt or pension row", () => {
    const d = getAllocationDetail(years[0]);
    const h = renderToStaticMarkup(createElement(BudgetAllocationBars, { data: d.slices, fiscalYear: "2010-11" }));
    expect(h).toContain("bundled");
    expect(h).not.toContain("Debt Servicing");
    expect(h).not.toContain("Rs 0bn");
  });
});

describe("BudgetInsightsPanel", () => {
  it("renders each insight with its caveat and its evidence behind a native details element", () => {
    const insights = generateBudgetInsights();
    const html = renderToStaticMarkup(createElement(BudgetInsightsPanel, { insights, title: "" }));
    expect((html.match(/<details/g) ?? []).length).toBe(insights.length);
    expect(html).toContain("Show the figures behind this");
    expect(html).toContain("18th Amendment");
    expect(html).toContain("FY2026-27");
  });
  it("still renders text-only insights (the provincial pages' shape) without a details element", () => {
    const html = renderToStaticMarkup(createElement(BudgetInsightsPanel, { insights: [{ text: "Punjab is largest." }], title: "" }));
    expect(html).toContain("Punjab is largest.");
    expect(html).not.toContain("<details");
  });
  it("renders nothing for an empty list", () => {
    expect(renderToStaticMarkup(createElement(BudgetInsightsPanel, { insights: [] }))).toBe("");
  });
});

describe("source register and methodology", () => {
  it("lists one row per fiscal year, each linking to its official finance.gov.pk document", () => {
    const html = renderToStaticMarkup(createElement(BudgetSourceRegister, { years }));
    expect((html.match(/<tr class="border-t/g) ?? []).length).toBe(17);
    expect((html.match(/https:\/\/www\.finance\.gov\.pk\//g) ?? []).length).toBe(17);
    expect(html).toContain("FY2010-11");
    expect(html).toContain("FY2026-27");
  });
  it("methodology states Budget Estimates only, nominal not real, the consolidated-deficit exception and the 2010-11 gap", () => {
    const html = renderToStaticMarkup(createElement(BudgetMethodology, { years }));
    expect(html).toMatch(/never mixed in/);
    expect(html).toMatch(/not real growth/);
    expect(html).toMatch(/consolidated/);
    expect(html).toMatch(/FY2010-11 does not itemise/);
    expect(html).toContain("143,604");
    expect(html).toContain("18th Amendment");
  });
});
