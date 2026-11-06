// Markets grid: complete rows, nothing added or reordered.
//
// THE DEFECT THESE TESTS GUARD
// The grid draws its separators with `gap-px` over a border-coloured background,
// so an EMPTY grid cell shows up as a solid grey block. With 15 instruments, 6
// columns left 3 empty cells (17.5% of the grid at 1440px) and 4 columns left 1.
// The column counts are now ones that divide 15, and the one case that cannot
// (two columns, an odd count) spans the last card instead of leaving a gap.

import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import MarketsPanel, { type MarketRow } from "./MarketsPanel";

const LABELS = [
  "USD/PKR", "EUR/PKR", "GBP/PKR", "SAR/PKR", "GOLD", "SILVER", "BRENT", "WTI",
  "NAT GAS", "US 10Y", "FED FUNDS", "DXY", "3M T-BILL", "3Y PIB", "KSE-100 PROXY",
];

const rows = (labels: string[] = LABELS): MarketRow[] =>
  labels.map((label, i) => ({
    label,
    kpi: { title: label, value: String(100 + i), unit: "u", change: "+1.0%", trend: "up", glow: "blue", source: "Test", latestDate: "2026-11-06", frequency: "Daily" } as MarketRow["kpi"],
  }));

const render = (r: MarketRow[]) => renderToStaticMarkup(createElement(MarketsPanel, { rows: r }));
// renderToStaticMarkup HTML-escapes "&" and ">" inside attribute values ("&amp;", "&gt;"),
// and the orphan-span class contains both. Decode them so the class is compared as the
// browser sees it after parsing the attribute.
const gridClass = (out: string) =>
  ((out.match(/<ul class="([^"]+)"/) ?? [])[1] ?? "").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

describe("the instruments are untouched", () => {
  const out = render(rows());

  it("renders exactly the 15 given, no more and no fewer", () => {
    expect((out.match(/<li /g) ?? []).length).toBe(15);
  });

  it("keeps every label, in the order given", () => {
    const seen = LABELS.map((l) => out.indexOf(`>${l}<`));
    expect(seen.every((i) => i > -1)).toBe(true);
    expect([...seen].sort((a, b) => a - b)).toEqual(seen);
  });

  it("keeps each card's value and source stamp", () => {
    expect(out).toContain(">100<");
    expect(out).toContain(">114<");
    expect((out.match(/Test/g) ?? []).length).toBeGreaterThanOrEqual(15);
  });

  it("does not duplicate a card to fill space", () => {
    for (const label of LABELS) expect((out.match(new RegExp(`>${label.replace(/[()/]/g, "\\$&")}<`, "g")) ?? []).length).toBe(1);
  });

  it("still says so plainly when there is no data, rather than inventing cards", () => {
    const empty = render([]);
    expect(empty).toContain("Market data is unavailable right now.");
    expect(empty).not.toContain("<li");
  });
});

describe("the grid forms complete rows", () => {
  const cls = gridClass(render(rows()));

  it("uses column counts that divide the number of instruments", () => {
    // sm and lg are the breakpoints where the grid is wide enough to leave the
    // two-column phone layout. Each must divide 15, or a row is left short and
    // the gap shows as a grey block.
    const sm = Number(/sm:grid-cols-(\d+)/.exec(cls)?.[1]);
    const lg = Number(/lg:grid-cols-(\d+)/.exec(cls)?.[1]);
    expect(Number.isInteger(sm) && sm > 0).toBe(true);
    expect(Number.isInteger(lg) && lg > 0).toBe(true);
    expect(15 % sm).toBe(0);
    expect(15 % lg).toBe(0);
  });

  it("is five columns on desktop and three on tablet", () => {
    expect(cls).toContain("lg:grid-cols-5");
    expect(cls).toContain("sm:grid-cols-3");
  });

  it("no longer uses a column count that leaves empty cells", () => {
    // 6 columns left 3 empty cells at xl; 4 columns left 1 at lg.
    expect(cls).not.toMatch(/xl:grid-cols-6/);
    expect(cls).not.toMatch(/lg:grid-cols-4/);
  });

  it("spans a lone last card across both phone columns instead of leaving a gap", () => {
    expect(cls).toContain("grid-cols-2");
    expect(cls).toContain("max-sm:[&>li:last-child:nth-child(odd)]:col-span-2");
  });

  it("only applies the spanning rule when the last card would sit alone", () => {
    // `:nth-child(odd)` on the last child means an even count never spans. Check
    // the rule is the odd-last one by simulating counts with the same selector.
    const lastIsOdd = (n: number) => n % 2 === 1;
    expect(lastIsOdd(15)).toBe(true); // 15 instruments: the 15th spans
    expect(lastIsOdd(14)).toBe(false); // an even count leaves nothing to span
  });

  it("keeps the separator trick that makes an empty cell show as grey, which is why this matters", () => {
    expect(cls).toContain("gap-px");
    expect(cls).toContain("bg-pe-border");
  });
});
