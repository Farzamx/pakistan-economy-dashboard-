// Visualization correctness: render the real chart components to static markup
// and assert on what they actually emit — positions, order, cell contents and
// how a missing value is treated. (Recharts-based charts need a measured browser
// container, so their DATA preparation is tested in chartData.test.ts and
// groupViews.test.ts, and their rendering in the browser verification.)

import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Heatmap } from "./Heatmap";
import { BoxPlot, DotPlot, DumbbellPlot, LollipopChart, WaterfallChart } from "./RowCharts";
import { Treemap } from "./Treemap";
import { MOM_SCALE, YOY_SCALE } from "@/lib/analytics/vizPalette";

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);

describe("Heatmap", () => {
  const out = html(
    createElement(Heatmap, {
      rows: [
        { key: "a", label: "Transport", cells: [28.61, null, -1.5, 7.0, 0] },
        { key: "b", label: "Health", cells: [3, 8.1, null, null, 0.4] },
      ],
      columns: ["Jan", "Feb", "Mar", "Apr", "May"].map((m) => ({ key: m, label: m })),
      scale: YOY_SCALE,
      caption: "Test heatmap, % year on year",
      cellTitle: (r, c, v) => `${r.label}, ${c.label}: ${v === null ? "no data" : v}`,
    }),
  );
  const cells = [...out.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => ({ tag: m[0], inner: m[1] }));

  it("is a real table with a caption and header cells", () => {
    expect(out).toContain("<table");
    expect(out).toContain('<caption class="sr-only">Test heatmap, % year on year</caption>');
    expect((out.match(/<th scope="col"/g) ?? []).length).toBe(6); // corner + 5 months
    expect((out.match(/<th scope="row"/g) ?? []).length).toBe(2);
  });

  it("has one cell per (row, column) — 10 — in row-major order", () => {
    expect(cells).toHaveLength(10);
  });

  it("prints each observed value as text, formatted to one decimal", () => {
    expect(cells[0].inner).toBe("28.6");
    expect(cells[3].inner).toBe("7.0");
    expect(cells[2].inner).toBe("−1.5"); // a true minus sign
  });

  it("colours each cell by its class: 28.6 -> top ramp, 7.0 -> mid, -1.5 -> the below-zero class, 0 -> the lowest positive class", () => {
    expect(cells[0].tag).toContain("var(--pe-heat-yoy-6)"); // >= 25
    expect(cells[3].tag).toContain("var(--pe-heat-yoy-2)"); // 6 to <9
    expect(cells[2].tag).toContain("var(--pe-heat-yoy-neg)");
    expect(cells[4].tag).toContain("var(--pe-heat-yoy-0)"); // exactly 0 is an OBSERVATION in the lowest class
  });

  it("draws a missing observation hatched, with 'no data' for assistive tech, and NO colour class", () => {
    const missing = [cells[1], cells[7], cells[8]];
    for (const c of missing) {
      expect(c.tag).toContain("repeating-linear-gradient");
      expect(c.inner).toContain("no data");
      expect(c.tag).not.toContain("--pe-heat-");
    }
  });

  it("never turns a missing value into a zero", () => {
    const zeros = cells.filter((c) => c.inner.replace(/<[^>]+>/g, "") === "0.0");
    expect(zeros).toHaveLength(1); // only the genuine 0 observation
    expect(cells[4].inner).toBe("0.0");
  });

  it("gives every cell a full-sentence title for hover", () => {
    expect(cells[0].tag).toContain('title="Transport, Jan: 28.61"');
    expect(cells[1].tag).toContain('title="Transport, Feb: no data"');
  });

  it("explains the colour key and shows the missing-data swatch only when something is missing", () => {
    expect(out).toContain("no observation");
    expect(out).toContain("25 and above");
    const noGaps = html(createElement(Heatmap, { rows: [{ key: "a", label: "A", cells: [1, 2] }], columns: [{ key: "x", label: "X" }, { key: "y", label: "Y" }], scale: YOY_SCALE, caption: "c", cellTitle: () => "t" }));
    expect(noGaps).not.toContain("no observation");
  });

  it("uses the diverging scale's classes for month-on-month values", () => {
    const m = html(createElement(Heatmap, { rows: [{ key: "a", label: "A", cells: [-3, 0, 4] }], columns: ["1", "2", "3"].map((k) => ({ key: k, label: k })), scale: MOM_SCALE, caption: "c", cellTitle: () => "t" }));
    expect(m).toContain("var(--pe-heat-mom-n2)");
    expect(m).toContain("var(--pe-heat-mom-0)");
    expect(m).toContain("var(--pe-heat-mom-p3)");
  });
});

describe("DotPlot", () => {
  const rows = [
    { key: "t", label: "Transport", value: 28.61 },
    { key: "h", label: "Health", value: 8.09 },
    { key: "x", label: "Missing", value: null },
    { key: "r", label: "Recreation", value: 1.73 },
  ];
  const out = html(createElement(DotPlot, { rows, ariaLabel: "dots", reference: { value: 9.6, label: "Headline 9.6%" } }));
  const dots = [...out.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="6"/g)].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));

  it("draws one dot per observed row — and none for the missing one", () => {
    expect(dots).toHaveLength(3);
    expect(out).toContain("no data");
  });

  it("keeps the caller's row order (top to bottom) and does not re-sort", () => {
    expect(dots[0].y).toBeLessThan(dots[1].y);
    expect(dots[1].y).toBeLessThan(dots[2].y);
    const labels = [...out.matchAll(/<text[^>]*text-anchor="end"[^>]*>([^<]+)</g)].map((m) => m[1]);
    expect(labels).toEqual(["Transport", "Health", "Missing", "Recreation"]);
  });

  it("places dots linearly by value (x is an affine function of the value)", () => {
    // slope between (1.73, 8.09) and (8.09, 28.61) must agree
    const [t, h, r] = [dots[0], dots[1], dots[2]];
    const s1 = (t.x - h.x) / (28.61 - 8.09);
    const s2 = (h.x - r.x) / (8.09 - 1.73);
    expect(s1).toBeCloseTo(s2, 6);
    expect(t.x).toBeGreaterThan(h.x);
    expect(h.x).toBeGreaterThan(r.x);
  });

  it("puts the reference line where its value belongs, between the dots either side of it", () => {
    const refX = Number(/<line x1="([\d.]+)" x2="[\d.]+" y1="[\d.]+" y2="[\d.]+" stroke="var\(--pe-viz-slate\)"/.exec(out)![1]);
    expect(refX).toBeGreaterThan(dots[2].x); // right of 1.73
    expect(refX).toBeLessThan(dots[0].x); // left of 28.61
    expect(refX).toBeGreaterThan(dots[1].x); // 9.6 > 8.09
  });

  it("draws a zero baseline when the axis includes zero", () => {
    expect(out).toContain('stroke-width="1.25"');
  });
});

describe("DumbbellPlot", () => {
  const full = html(
    createElement(DumbbellPlot, {
      rows: [
        { key: "a", label: "A", from: 10.3, to: 9.6 },
        { key: "b", label: "B", from: null, to: 7.8 },
        { key: "c", label: "C", from: null, to: null },
      ],
      fromLabel: "Sep 2026",
      toLabel: "Oct 2026",
      ariaLabel: "d",
    }),
  );
  // Only the chart’s own SVG: the HTML legend above it draws sample dots of its own.
  const out = full.slice(full.indexOf('role="group"'));

  it("draws both dots and the connecting line only when both values exist", () => {
    expect((out.match(/stroke-width="3" stroke-linecap="round"/g) ?? []).length).toBe(1); // one connector (row A)
    expect((out.match(/r="5" fill="var\(--pe-surface\)"/g) ?? []).length).toBe(1); // one 'from' dot
    expect((out.match(/r="6" fill="var\(--pe-viz-blue\)"/g) ?? []).length).toBe(2); // two 'to' dots (A, B)
  });

  it("shows a signed change for a complete row and a dash otherwise", () => {
    expect(out).toContain("−0.7");
    expect(out.match(/>—</g) ?? []).toHaveLength(2);
  });

  it("marks a row with nothing as 'no data'", () => {
    expect(out).toContain("no data");
  });

  it("places the earlier value to the RIGHT of the later one when the value fell", () => {
    const from = Number(/<circle cx="([\d.]+)" cy="[\d.]+" r="5" fill="var\(--pe-surface\)"/.exec(out)![1]);
    const toA = Number(/<circle cx="([\d.]+)" cy="[\d.]+" r="6" fill="var\(--pe-viz-blue\)"/.exec(out)![1]);
    expect(from).toBeGreaterThan(toA); // 10.3 > 9.6
  });
});

describe("LollipopChart", () => {
  const out = html(createElement(LollipopChart, { rows: [{ key: "a", label: "A", value: 2.85 }, { key: "b", label: "B", value: -0.5 }, { key: "c", label: "C", value: null }], ariaLabel: "l" }));

  it("draws stems from the zero baseline: positive to the right, negative to the left", () => {
    const stems = [...out.matchAll(/<line x1="([\d.]+)" x2="([\d.]+)" y1="[\d.]+" y2="[\d.]+" stroke="var\(--pe-viz-(blue|orange)\)" stroke-width="2.5"/g)].map((m) => ({ x1: Number(m[1]), x2: Number(m[2]), c: m[3] }));
    expect(stems).toHaveLength(2);
    expect(stems[0].x2).toBeGreaterThan(stems[0].x1);
    expect(stems[1].x2).toBeLessThan(stems[1].x1);
    expect(stems[0].x1).toBeCloseTo(stems[1].x1, 6); // same baseline
    expect(stems[0].c).toBe("blue");
    expect(stems[1].c).toBe("orange");
  });

  it("gives the missing row no stem and the text 'no data'", () => {
    expect(out).toContain("no data");
  });
});

describe("WaterfallChart", () => {
  const rows = [
    { key: "s", label: "Start", kind: "total" as const, value: 6.24 },
    { key: "a", label: "Up", kind: "delta" as const, value: 1.5 },
    { key: "b", label: "Down", kind: "delta" as const, value: -0.65 },
    { key: "e", label: "End", kind: "total" as const, value: 7.09 },
  ];
  const out = html(createElement(WaterfallChart, { rows, ariaLabel: "w" }));
  const rects = [...out.matchAll(/<rect x="([\d.]+)" y="[\d.]+" width="([\d.]+)" height="16"/g)].map((m) => ({ x: Number(m[1]), w: Number(m[2]) }));

  it("draws one bar per step", () => {
    expect(rects).toHaveLength(4);
  });

  it("floats each delta from the previous running level, so the steps chain", () => {
    // Up starts where Start ends; Down ENDS where Up ends (it fell back from there).
    expect(rects[1].x).toBeCloseTo(rects[0].x + rects[0].w, 4);
    expect(rects[2].x + rects[2].w).toBeCloseTo(rects[1].x + rects[1].w, 4);
  });

  it("the End total's right edge equals Start + all deltas (arithmetic holds on the page)", () => {
    const pxPerPp = rects[0].w / 6.24; // totals are drawn from zero
    expect(rects[3].w / pxPerPp).toBeCloseTo(6.24 + 1.5 - 0.65, 1);
  });

  it("colours totals neutral, rises orange and falls teal", () => {
    expect(out.match(/fill="var\(--pe-viz-slate\)"/g)?.length).toBe(2);
    expect(out).toContain('fill="var(--pe-viz-orange)"');
    expect(out).toContain('fill="var(--pe-viz-teal)"');
  });
});

describe("BoxPlot", () => {
  it("draws a box for rows with statistics and 'no data' for rows without", () => {
    const stats = { n: 40, min: 0, q1: 2, median: 4, q3: 8, max: 20, whiskerLow: 0, whiskerHigh: 16, outliers: [20] };
    const out = html(createElement(BoxPlot, { rows: [{ key: "a", label: "A", stats }, { key: "b", label: "B", stats: null }], ariaLabel: "b" }));
    expect((out.match(/rx="2" fill="var\(--pe-viz-blue\)" fill-opacity="0.35"/g) ?? []).length).toBe(1);
    expect(out).toContain("no data");
    expect((out.match(/r="3" fill="none" stroke="var\(--pe-viz-orange\)"/g) ?? []).length).toBe(1); // the one outlier
  });
});

describe("Treemap", () => {
  const items = [
    { id: "1", label: "Food", weight: 34.58, yoy: 7.74 },
    { id: "4", label: "Housing", weight: 23.63, yoy: 11.03 },
    { id: "7", label: "Transport", weight: 5.91, yoy: 28.61 },
    { id: "9", label: "Recreation", weight: 1.59, yoy: null },
  ];
  const out = html(createElement(Treemap, { items, ariaLabel: "t" }));
  const boxes = [...out.matchAll(/<button[^>]*style="([^"]*)"/g)].map((m) => {
    const g = (k: string) => Number(new RegExp(`${k}:([\\d.]+)px`).exec(m[1])![1]);
    return { w: g("width"), h: g("height") };
  });

  it("draws one box per group", () => {
    expect(boxes).toHaveLength(4);
  });

  it("sizes each box's AREA in proportion to its basket weight", () => {
    const total = items.reduce((s, i) => s + i.weight, 0);
    const area = boxes.reduce((s, b) => s + b.w * b.h, 0);
    const byWeight = [...items].sort((a, b) => b.weight - a.weight);
    boxes.forEach((b, i) => expect((b.w * b.h) / area, byWeight[i].id).toBeCloseTo(byWeight[i].weight / total, 3));
  });

  it("colours by YoY class, and draws a group with no reading neutral rather than as a rate", () => {
    expect(out).toContain("var(--pe-heat-yoy-6)"); // transport 28.6
    expect(out).toContain("var(--pe-heat-yoy-3)"); // housing 11.0
    expect(out).toContain("background:var(--pe-surface-2)"); // recreation: no reading
    expect(out).toContain("no inflation reading");
  });
});
