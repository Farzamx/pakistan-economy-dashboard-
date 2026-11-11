// The Interest Rate page's chart components, rendered to static markup with the REAL policy-rate history, plus the pure helpers behind them.
// (Recharts-based charts need a measured browser container, so their drawing is verified in the browser; what is checked here is everything
// the server emits and everything that can be decided without a screen: labels, order, the finished state of the animation, the numbers.)

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import RegimeTimeline, { regimeSentence } from "@/components/analytics/RegimeTimeline";
import { DateLines, DetailBars, RealRateChart } from "@/components/analytics/DateCharts";
import CyclesSection from "@/components/policyRate/CyclesSection";
import MarketRatesSection from "@/components/policyRate/MarketRatesSection";
import RealRateSection from "@/components/policyRate/RealRateSection";
import InternationalSection from "@/components/policyRate/InternationalSection";
import HistorySection from "@/components/policyRate/HistorySection";
import MethodologySection from "@/components/policyRate/MethodologySection";
import { figureAt, parseFigure } from "@/components/policyRate/AnimatedFigure";
import StatStrip from "@/components/policyRate/StatStrip";
import { daysText } from "@/lib/policyRate/format";
import { buildPolicyRateViewModel, type RawPolicyRateInputs } from "@/lib/policyRate/viewModel";
import { REAL_POLICY_RATE, monthEndRaw } from "@/lib/policyRate/__fixtures__/policyRateHistory";

const HEADLINE = monthEndRaw("2026-01", [5.9, 6.4, 7.0, 8.0, 9.1, 9.4, 9.0, 10.0, 10.3, 9.6]);
const CORE = monthEndRaw("2026-01", [6.5, 7.0, 7.4, 8.0, 8.4, 8.6, 8.7, 8.6, 8.6, 7.8]);
const raw = (over: Partial<RawPolicyRateInputs> = {}): RawPolicyRateInputs => ({
  policy: REAL_POLICY_RATE,
  headline: HEADLINE,
  core: CORE,
  tbill: [{ date: "2026-09-02", value: 11.5 }, { date: "2026-09-30", value: 11.7 }, { date: "2026-10-14", value: 11.89 }],
  pib: [{ date: "2026-10-07", value: 12.74 }],
  fedFunds: monthEndRaw("2026-08", [4.1, 4.0, 3.88]),
  kpiValue: 12,
  asOf: "2026-11-11",
  source: { status: "ledger", seriesKey: "S", seriesName: "N", latestObservation: "2026-10-26", lastStoredAt: "2026-10-29T03:22:25+00:00", observations: 38 },
  ...over,
});
const model = buildPolicyRateViewModel(raw());
// Recharts warns that an unmeasured server container has no size; that is expected here and is not what is being tested.
let spies: ReturnType<typeof vi.spyOn>[] = [];
beforeEach(() => {
  spies = (["warn", "error"] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
});
afterEach(() => spies.forEach((x) => x.mockRestore()));

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);
const text = (h: string) => h.replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ");

describe("the animated figure ends on exactly the text it was given", () => {
  const samples = ["12.00%", "−1.20%", "+0.39 pp", "−17.75 pp", "3", "0.00%", "24 of 30", "15 months", "+24.00 pp of increases"];
  it.each(samples)("%s: the final count reproduces the original string", (s) => {
    const p = parseFigure(s);
    expect(p).not.toBeNull();
    expect(figureAt(p!, p!.number)).toBe(s);
  });
  it("keeps the sign, decimals and unit at every intermediate step, changing only the digits", () => {
    const p = parseFigure("−1.20%")!;
    expect(figureAt(p, 0)).toBe("−0.00%");
    expect(figureAt(p, 0.6)).toBe("−0.60%");
  });
  it("leaves text that does not start with a number alone (it is shown as given)", () => {
    expect(parseFigure("—")).toBeNull();
    expect(parseFigure("n/a")).toBeNull();
  });
  it("renders the finished figure on the server (the count-up is decoration on top of it)", () => {
    const out = html(createElement(StatStrip, { label: "x", items: [{ label: "Rate", value: "12.00%", detail: "since 26 Oct 2026" }] }));
    expect(text(out)).toContain("Rate 12.00% since 26 Oct 2026");
  });
});

describe("durations in words", () => {
  it("days below two months, months below two years, then years", () => {
    expect(daysText(0)).toBe("the same day");
    expect(daysText(1)).toBe("1 day");
    expect(daysText(16)).toBe("16 days");
    expect(daysText(60)).toBe("60 days");
    expect(daysText(61)).toBe("2 months");
    expect(daysText(452)).toBe("15 months"); // 14.85 months
    expect(daysText(730)).toBe("24 months"); // 23.98 months: still shown in months
    expect(daysText(800)).toBe("2.2 years");
    expect(daysText(616)).toBe("20 months");
  });
});

describe("the sentence a regime reads as (tooltip and screen-reader label)", () => {
  const seg = (i: number) => model.regimes[i];
  it("names a tightening run with its dates, number of changes and move", () => {
    expect(regimeSentence(seg(1))).toBe("Tightening: 9 increases, 29 Jan 2018 to 17 Jul 2019; 5.75% to 13.25% (+7.50 pp).");
  });
  it("names an easing run, and a single change in the singular", () => {
    expect(regimeSentence(seg(3))).toBe("Easing: 5 cuts, 18 Mar 2020 to 26 Jun 2020; 13.25% to 7.00% (−6.25 pp).");
    expect(regimeSentence(seg(9))).toBe("Tightening: 2 increases, 28 Apr 2026 to 26 Oct 2026; 10.50% to 12.00% (+1.50 pp).");
    expect(regimeSentence({ ...seg(9), changes: 1 })).toContain("1 increase,");
  });
  it("says a hold is 'no change recorded', not a count of meetings, and an open hold is 'so far'", () => {
    expect(regimeSentence(seg(6))).toBe("Holding: no change recorded from 27 Jun 2023 to 11 Jun 2024; the rate stayed at 22.00% for 11 months.");
    expect(regimeSentence(seg(10))).toBe("Holding: no change recorded since 26 Oct 2026; the rate stayed at 12.00% for 16 days so far.");
  });
});

describe("the regime timeline as the server renders it", () => {
  const out = html(createElement(RegimeTimeline, { decisions: model.decisions, regimes: model.regimes, levels: model.levels, turningPoints: model.turningPoints, asOf: model.asOf, animate: true, ariaLabel: "timeline" }));
  it("draws one focusable, named block for each of the 11 regimes, each carrying its own sentence", () => {
    const labels = [...out.matchAll(/<rect[^>]*role="img"[^>]*aria-label="([^"]+)"/g)].map((m) => m[1]);
    expect(labels).toHaveLength(11);
    expect(labels.filter((l) => l.startsWith("Tightening"))).toHaveLength(3);
    expect(labels.filter((l) => l.startsWith("Easing"))).toHaveLength(2);
    expect(labels.filter((l) => l.startsWith("Holding"))).toHaveLength(6);
    expect(out.match(/tabindex="0"/g)).toHaveLength(11);
  });
  it("labels the turning points with their rates (22.00% peak, 7.00% and 10.50% troughs) and draws them hollow only when unconfirmed", () => {
    for (const r of ["13.25%", "7.00%", "22.00%", "10.50%", "12.00%"]) expect(text(out)).toContain(r);
    expect((out.match(/<circle/g) ?? []).length).toBe(5);
    expect((out.match(/fill="var\(--pe-surface\)"[^>]*stroke="var\(--pe-viz-purple\)"/g) ?? []).length).toBe(1); // the open, latest run
  });
  it("renders the FINISHED chart on the server: the reveal clip is full width, never zero (so no-JS readers see everything)", () => {
    const w = /<clipPath[^>]*><rect[^>]*style="width:([\d.]+)px/.exec(out);
    expect(w).not.toBeNull();
    const svgWidth = Number(/<svg[^>]*\swidth="(\d+)"/.exec(out)?.[1]);
    expect(svgWidth).toBeGreaterThan(300);
    expect(Number(w![1])).toBe(svgWidth); // the clip covers the whole drawing: a narrower clip once cut off the last regime and its label
  });
  it("contains no NaN, undefined or Infinity in any coordinate (a check that can fail)", () => {
    expect(out).not.toMatch(/NaN|undefined|Infinity/);
  });
  it("is plain accessible markup: a labelled group, a stepped path, decorative axes", () => {
    expect(out).toContain('role="group"');
    expect(out).toContain('aria-label="timeline"');
    expect((out.match(/<path /g) ?? []).length).toBe(1);
  });
  it("says so when there is nothing to draw", () => {
    const none = html(createElement(RegimeTimeline, { decisions: [], regimes: [], levels: [], turningPoints: [], asOf: "2026-01-01", ariaLabel: "x" }));
    expect(none).toContain("No policy-rate history to draw.");
  });
});

describe("the Recharts-based charts: what they say before they are measured in a browser", () => {
  it("DateLines is a labelled image, and says plainly when a range holds nothing", () => {
    const ok = html(createElement(DateLines, { series: [{ key: "a", label: "A", color: "blue", kind: "observed", points: [{ date: "2026-01-01", value: 1 }] }], from: null, to: "2026-02-01", ariaLabel: "lines" }));
    expect(ok).toContain('role="img"');
    expect(ok).toContain('aria-label="lines"');
    const none = html(createElement(DateLines, { series: [{ key: "a", label: "A", color: "blue", kind: "observed", points: [] }], from: null, to: "2026-02-01", ariaLabel: "lines" }));
    expect(none).toContain("No observations in this range.");
  });
  it("DetailBars and RealRateChart are labelled images and say plainly when empty", () => {
    expect(html(createElement(DetailBars, { data: [{ id: "a", label: "A", value: 1, color: "teal", title: "t", lines: [] }], ariaLabel: "bars" }))).toContain('aria-label="bars"');
    expect(html(createElement(DetailBars, { data: [], ariaLabel: "bars" }))).toContain("Nothing to show.");
    expect(html(createElement(RealRateChart, { data: [{ period: "Oct 26", policy: 12, inflation: 9.6, real: 2.19 }], inflationLabel: "Headline", ariaLabel: "real" }))).toContain('aria-label="real"');
    expect(html(createElement(RealRateChart, { data: [], inflationLabel: "Headline", ariaLabel: "real" }))).toContain("No observations in this range.");
  });
});

describe("the sections built from the real history", () => {
  it("Cycles: the six summary figures, the four charts and the table, with the numbers worked out independently", () => {
    const t = text(html(createElement(CyclesSection, { model })));
    expect(t).toContain("Tightening runs 3 +24.00 pp in all");
    expect(t).toContain("Easing runs 2 −17.75 pp in all");
    expect(t).toContain("Longest known hold 15 months 7.00%, 26 Jun 2020 to 21 Sep 2021");
    for (const title of ["Tightening, easing and holding", "Where each cycle started and ended", "Cumulative increases and cuts", "How long the rate stayed at each level"]) expect(t).toContain(title);
    expect(t).toContain("Holding (no change recorded)");
    expect(t).toContain("it is not a count of meetings");
  });
  it("Cycles: the table alternative lists every one of the 11 regimes and the 36 levels", () => {
    const h = html(createElement(CyclesSection, { model }));
    expect(h).toContain("Tightening, easing and holding periods");
    expect((h.match(/How long each policy-rate level lasted/g) ?? []).length).toBeGreaterThanOrEqual(1);
    expect(text(h)).toContain("11 Nov 2026 (open)");
  });
  it("History: the net change and the largest increase and cut", () => {
    const t = text(html(createElement(HistorySection, { model })));
    expect(t).toContain("Net change since the series begins +6.25 pp +24.00 pp of increases, −17.75 pp of cuts since 23 May 2016");
    expect(t).toContain("Largest increase +3.00 pp 3 Mar 2023, 17.00% to 20.00%");
    expect(t).toContain("Largest cut −2.50 pp 5 Nov 2024, 17.50% to 15.00%");
  });
  it("Market: yields are compared with the rate in effect ON the auction day, and the term spread names both auctions", () => {
    const t = text(html(createElement(MarketRatesSection, { model })));
    expect(t).toContain("3-month T-bill yield 11.89% auction of 14 Oct 2026; +0.39 pp against the 11.50% policy rate in effect that day");
    expect(t).toContain("3-year PIB yield 12.74% auction of 7 Oct 2026; +1.24 pp against the 11.50% policy rate in effect that day");
    expect(t).toContain("Term spread, 3-year minus 3-month +1.04 pp PIB of 7 Oct 2026 against the bill of 30 Sep 2026 (7 days earlier)");
    expect(t).not.toContain("−0.11 pp"); // the figure obtained by comparing a 14 Oct auction with the rate in effect from 26 Oct
  });
  it("Market: says it holds two maturities and draws no yield curve, and names the time-range control for all three charts", () => {
    const t = text(html(createElement(MarketRatesSection, { model })));
    expect(t).toContain("Two maturities, not a yield curve");
    expect(t).toContain("so no curve is drawn and no line between the two is implied");
    expect(t).toContain("Time range (all three charts)");
    expect(t).toContain("Yield minus the policy rate in effect on each auction day"); // the spread chart has its own table alternative
  });
  it("Methodology no longer describes yields as month-binned: auctions sit on their own dates and a gap is a break", () => {
    const t = text(html(createElement(MethodologySection, { model, generatedAt: "2026-11-11T08:00:00.000Z", relatedLinks: [] })));
    expect(t).toContain("drawn on their own dates, so a long stretch with no auction is a break in the line, never a value");
    expect(t).not.toContain("the last auction of a month is not an average");
    expect(t).toContain("not a yield curve");
  });
  it("Real rate: the summary for headline inflation, and the chart's colour key", () => {
    const t = text(html(createElement(RealRateSection, { model })));
    expect(t).toContain("Latest real policy rate 2.19%");
    expect(t).toContain("Months below zero 0 of 10");
    expect(t).toContain("Real rate above zero");
    expect(t).toContain("Real rate below zero");
  });
  it("US comparison: the latest gap, the widest and narrowest, and how often Pakistan was above", () => {
    const t = text(html(createElement(InternationalSection, { model })));
    expect(t).toContain("Gap, Pakistan minus US +8.12 pp");
    expect(t).toContain("Highest gap +8.12 pp");
    expect(t).toContain("Lowest gap +7.40 pp");
    expect(t).toContain("Months Pakistan above the US 3 of 3");
  });
});

describe("when data is missing the sections say so instead of drawing something", () => {
  it("no yields: the market section is a limitation notice", () => {
    const m = buildPolicyRateViewModel(raw({ tbill: null, pib: null }));
    expect(text(html(createElement(MarketRatesSection, { model: m })))).toContain("Market yields are unavailable right now");
  });
  it("a PIB with no bill within 21 days: no term spread is invented", () => {
    const m = buildPolicyRateViewModel(raw({ tbill: [{ date: "2026-06-01", value: 11 }], pib: [{ date: "2026-10-07", value: 12.74 }] }));
    expect(m.termSpreadAt).toEqual([]);
    const t = text(html(createElement(MarketRatesSection, { model: m })));
    expect(t).not.toContain("Term spread, 3-year minus 3-month");
  });
  it("no policy history: cycles say there is nothing to show", () => {
    const m = buildPolicyRateViewModel(raw({ policy: null }));
    expect(text(html(createElement(CyclesSection, { model: m })))).toContain("No cycles to show");
  });
  it("no US data: the comparison is a limitation notice", () => {
    const m = buildPolicyRateViewModel(raw({ fedFunds: null }));
    expect(text(html(createElement(InternationalSection, { model: m })))).toContain("The US comparison is unavailable right now");
  });
  it("no inflation: the real-rate section is a limitation notice", () => {
    const m = buildPolicyRateViewModel(raw({ headline: null, core: null }));
    expect(text(html(createElement(RealRateSection, { model: m })))).toContain("The real policy rate is unavailable right now");
  });
});
