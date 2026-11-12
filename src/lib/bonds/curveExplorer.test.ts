import { describe, expect, it } from "vitest";
import { compareCurves, slopeOf } from "./analytics";
import { MATURITY_TICKS, bandRuns, buildCurveLayout, maturityFraction, niceTicks, pathRuns, type PlotPoint } from "./curveGeometry";
import { COMPARE_LABEL, comparisonDate, describeComparison, describePairing, describeShape, resolveCurves, selectableDates } from "./curveExplorerModel";
import { getPibAuctions, getTBillAuctions } from "./dataset";
import type { AuctionOutcome, AuctionRecord, Instrument, Tenor, TenorResult } from "./types";

const ok = (cutoff: number, wa: number = cutoff - 0.1): TenorResult => ({ outcome: "accepted", cutoffYield: cutoff, waYield: wa, offered: 1000, acceptedCompetitive: 400, acceptedNonCompetitive: 100, target: 500 });
const failed = (outcome: AuctionOutcome): TenorResult => ({ outcome, cutoffYield: null, waYield: null, offered: 800, acceptedCompetitive: null, acceptedNonCompetitive: null, target: 500 });
const auction = (instrument: Instrument, date: string, tenors: Partial<Record<Tenor, TenorResult>>): AuctionRecord => ({ instrument, auctionNo: null, auctionDate: date, settlementDate: date, tenors });

describe("maturity axis", () => {
  it("is a square-root scale: 0 at zero years, 1 at 15 years, strictly increasing across the nine tenors", () => {
    expect(maturityFraction(0)).toBe(0);
    expect(maturityFraction(15)).toBeCloseTo(1, 12);
    expect(maturityFraction(3)).toBeCloseTo(Math.sqrt(3) / Math.sqrt(15), 12);
    expect(maturityFraction(-4)).toBe(0);
    const xs = MATURITY_TICKS.map((t) => t.tenor);
    expect(xs).toEqual(["1M", "3M", "6M", "12M", "2Y", "3Y", "5Y", "10Y", "15Y"]);
    const layout = buildCurveLayout(800, 380, [10, 12]);
    const positions = layout.xTicks.map((t) => t.x);
    for (let i = 1; i < positions.length; i++) expect(positions[i]).toBeGreaterThan(positions[i - 1]);
  });
  it("a tenor's true position is proportional to the square root of its years: 4Y sits halfway to 16Y-equivalents, so 15Y is the right edge", () => {
    const layout = buildCurveLayout(800, 380, [10, 12]);
    expect(layout.xOf(15)).toBeCloseTo(layout.margin.left + layout.innerWidth, 9);
    expect(layout.xOf(3.75) - layout.margin.left).toBeCloseTo(layout.innerWidth / 2, 9); // sqrt(3.75 / 15) = 0.5
  });
  it("the gap between 1Y and 2Y is where no auction exists", () => {
    const l = buildCurveLayout(800, 380, [10, 12]);
    expect(l.gap.x0).toBeCloseTo(l.xOf(1), 9);
    expect(l.gap.x1).toBeCloseTo(l.xOf(2), 9);
    expect(l.gap.x1).toBeGreaterThan(l.gap.x0);
  });
});

describe("yield axis", () => {
  it("niceTicks covers the range with 1/2/5 steps", () => {
    expect(niceTicks(11.2, 12.7, 5)).toEqual([11, 11.5, 12, 12.5, 13]);
    expect(niceTicks(0, 100, 5)).toEqual([0, 20, 40, 60, 80, 100]);
    const t = niceTicks(5.86, 25.07, 5);
    expect(t[0]).toBeLessThanOrEqual(5.86);
    expect(t[t.length - 1]).toBeGreaterThanOrEqual(25.07);
  });
  it("degenerate inputs still give usable ticks", () => {
    expect(niceTicks(5, 5).length).toBeGreaterThanOrEqual(2);
    expect(niceTicks(Number.NaN, 3)).toEqual([0, 1]);
  });
  it("the layout's y scale is inverted pixels: a higher yield is higher up, and the extremes map inside the plot", () => {
    const l = buildCurveLayout(800, 380, [11.8, 12.41]);
    expect(l.yOf(12.41)).toBeLessThan(l.yOf(11.8));
    expect(l.yOf(l.yMax)).toBeCloseTo(l.margin.top, 6);
    expect(l.yOf(l.yMin)).toBeCloseTo(l.margin.top + l.innerHeight, 6);
    expect(l.yMin).toBeLessThan(11.8);
    expect(l.yMax).toBeGreaterThan(12.41);
  });
  it("narrow screens get tighter margins and no data still lays out", () => {
    expect(buildCurveLayout(340, 300, [10]).margin.left).toBeLessThan(buildCurveLayout(900, 300, [10]).margin.left);
    const empty = buildCurveLayout(800, 380, []);
    expect(empty.yTicks.length).toBeGreaterThanOrEqual(2);
    expect(Number.isFinite(empty.yOf(0.5))).toBe(true);
  });
});

describe("paths break at a missing point", () => {
  const pt = (tenor: Tenor, x: number, y: number | null): PlotPoint => ({ tenor, x, y });
  it("joins consecutive points and stops at a null, restarting after it", () => {
    const runs = pathRuns([pt("1M", 10, 100), pt("3M", 20, 90), pt("6M", 30, null), pt("12M", 40, 80), pt("2Y", 50, 70)]);
    expect(runs).toEqual(["M10.0,100.0 L20.0,90.0", "M40.0,80.0 L50.0,70.0"]);
  });
  it("can fail: a point isolated by gaps is not joined to a neighbour across the gap (no interpolated yield)", () => {
    const runs = pathRuns([pt("1M", 10, 100), pt("3M", 20, null), pt("6M", 30, 90), pt("12M", 40, null)]);
    expect(runs).toEqual([]);
  });
  it("no points, or all missing, gives no path", () => {
    expect(pathRuns([])).toEqual([]);
    expect(pathRuns([pt("3M", 1, null), pt("6M", 2, null)])).toEqual([]);
  });
  it("the band between two curves spans only tenors where both have a yield, one polygon per unbroken stretch", () => {
    const a = [pt("1M", 10, 100), pt("3M", 20, 90), pt("6M", 30, 80), pt("12M", 40, 70)];
    const b = [pt("1M", 10, 110), pt("3M", 20, 105), pt("6M", 30, null), pt("12M", 40, 95)];
    expect(bandRuns(a, b)).toEqual(["M10.0,100.0 L20.0,90.0 L20.0,105.0 L10.0,110.0 Z"]);
    expect(bandRuns(a, [pt("1M", 10, null), pt("3M", 20, null), pt("6M", 30, null), pt("12M", 40, null)])).toEqual([]);
  });
});

describe("resolving curves", () => {
  const tb = [auction("tbill", "2026-10-28", {}), auction("tbill", "2026-11-11", {})];
  const pb = [auction("pib", "2026-10-07", {}), auction("pib", "2026-11-04", {})];
  it("selectableDates follows the view: PIB dates for PIBs, T-bill dates otherwise", () => {
    expect(selectableDates("pib", tb, pb)).toEqual(["2026-10-07", "2026-11-04"]);
    expect(selectableDates("tbill", tb, pb)).toEqual(["2026-10-28", "2026-11-11"]);
    expect(selectableDates("both", tb, pb)).toEqual(["2026-10-28", "2026-11-11"]);
  });
  it("tbill and pib views resolve exact auctions only; an unknown date resolves to nothing, never a neighbour", () => {
    expect(resolveCurves("tbill", "2026-11-11", tb, pb)).toEqual({ tbill: tb[1], pib: null });
    expect(resolveCurves("pib", "2026-11-04", tb, pb)).toEqual({ tbill: null, pib: { auction: pb[1], gapDays: 0 } });
    expect(resolveCurves("tbill", "2026-11-12", tb, pb)).toEqual({ tbill: null, pib: null });
    expect(resolveCurves("pib", "2026-11-11", tb, pb).pib).toBeNull();
  });
  it("'both' pairs the T-bill auction with the nearest PIB auction within 14 days and reports the gap; beyond 14 days there is no PIB curve", () => {
    const r = resolveCurves("both", "2026-11-11", tb, pb);
    expect(r.tbill).toBe(tb[1]);
    expect(r.pib).toEqual({ auction: pb[1], gapDays: -7 });
    // 28 Oct is 21 days after the 7 Oct PIB auction but only 7 days before the 4 Nov one: the nearer one is chosen and the gap is positive (the PIB auction came later)
    expect(resolveCurves("both", "2026-10-28", tb, pb).pib).toEqual({ auction: pb[1], gapDays: 7 });
    // a T-bill auction 35 days from the nearest PIB auction gets no PIB curve at all
    const far = [...tb, auction("tbill", "2026-09-02", {})];
    expect(resolveCurves("both", "2026-09-02", far, pb)).toEqual({ tbill: far[2], pib: null });
  });
});

describe("comparison dates", () => {
  const tbs = getTBillAuctions();
  const pbs = getPibAuctions();
  it("previous is the auction before the selected one; none gives null; an unknown date gives null", () => {
    expect(comparisonDate("tbill", "2026-11-11", "previous", tbs, pbs, "cutoff")).toBe("2026-10-28");
    expect(comparisonDate("tbill", "2014-07-09", "previous", tbs, pbs, "cutoff")).toBeNull();
    expect(comparisonDate("tbill", "2026-11-11", "none", tbs, pbs, "cutoff")).toBeNull();
    expect(comparisonDate("tbill", "2026-11-12", "previous", tbs, pbs, "cutoff")).toBeNull();
  });
  it("6 and 12 months earlier are the nearest earlier auctions to those dates", () => {
    expect(comparisonDate("tbill", "2026-11-11", "12m", tbs, pbs, "cutoff")).toBe("2025-11-12");
    expect(comparisonDate("tbill", "2026-11-11", "6m", tbs, pbs, "cutoff")).toBe("2026-05-13");
    expect(comparisonDate("pib", "2026-11-04", "12m", tbs, pbs, "cutoff")).toBe("2025-11-05");
  });
  it("peak and low are the highest- and lowest-yield auctions of the long tenor; the selected auction itself is never offered", () => {
    expect(comparisonDate("tbill", "2026-11-11", "peak", tbs, pbs, "cutoff")).toBe("2023-09-06");
    expect(comparisonDate("tbill", "2026-11-11", "low", tbs, pbs, "cutoff")).toBe("2016-07-20");
    expect(comparisonDate("tbill", "2023-09-06", "peak", tbs, pbs, "cutoff")).toBeNull();
    expect(comparisonDate("pib", "2026-11-04", "peak", tbs, pbs, "cutoff")).toBe("2024-09-19");
  });
  it("every choice has a label", () => {
    for (const c of ["previous", "6m", "12m", "peak", "low", "none"] as const) expect(COMPARE_LABEL[c].length).toBeGreaterThan(3);
  });
});

describe("sentences", () => {
  const A = auction("tbill", "2025-11-12", { "3M": ok(11.0426), "12M": ok(11.35) });
  const B = auction("tbill", "2026-11-11", { "3M": ok(11.9999), "12M": ok(12.41) });
  it("describeShape names the shape, the tenors and the size in bp", () => {
    expect(describeShape(slopeOf(B, "cutoff"))).toBe("Upward-sloping: 12-month yields are 41 bp above 3-month yields.");
    expect(describeShape(slopeOf(auction("tbill", "2024-02-14", { "3M": ok(21.5), "12M": ok(20.1) }), "cutoff"))).toBe("Inverted: 12-month yields are 140 bp below 3-month yields.");
    expect(describeShape(slopeOf(auction("tbill", "2025-01-01", { "3M": ok(12), "12M": ok(12.05) }), "cutoff"))).toBe("Flat: 12-month and 3-month yields are within 10 bp of each other (+5 bp).");
    expect(describeShape(null)).toBeNull();
  });
  it("describeComparison: hand-worked level and steepening, with both dates", () => {
    const c = compareCurves(A, B, "cutoff");
    // 3M: 11.9999 - 11.0426 = 95.7; 12M: 12.41 - 11.35 = 106.0 -> mean 100.9
    expect(describeComparison(c, A.auctionDate, B.auctionDate)).toBe("11 Nov 2026 against 12 Nov 2025. Yields are 100.9 bp higher on average across 2 tenors. The curve steepened by 10.3 bp (slope +30.7 to +41 bp).");
  });
  it("describeComparison: lower yields and flattening; parallel; no common tenor; an unusable slope", () => {
    const flat = compareCurves(B, A, "cutoff");
    expect(describeComparison(flat, B.auctionDate, A.auctionDate)).toContain("lower on average");
    expect(describeComparison(flat, B.auctionDate, A.auctionDate)).toContain("flattened by 10.3 bp");
    const p1 = auction("tbill", "2026-12-01", { "3M": ok(11), "12M": ok(11.25) });
    const p2 = auction("tbill", "2026-12-15", { "3M": ok(11.5), "12M": ok(11.8) });
    expect(describeComparison(compareCurves(p1, p2, "cutoff"), p1.auctionDate, p2.auctionDate)).toContain("broadly a parallel shift");
    const x = auction("tbill", "2026-01-01", { "3M": ok(1) });
    const y = auction("tbill", "2026-02-01", { "6M": ok(1) });
    expect(describeComparison(compareCurves(x, y, "cutoff"), x.auctionDate, y.auctionDate)).toBe("No tenor has a yield on both dates, so the two curves cannot be compared.");
    const noLeg = auction("tbill", "2026-03-01", { "3M": ok(11), "12M": failed("bids-rejected"), "6M": ok(11.2) });
    expect(describeComparison(compareCurves(A, noLeg, "cutoff"), A.auctionDate, noLeg.auctionDate)).toContain("slope cannot be compared");
  });
  it("describePairing states both auction dates and that they are different auctions, or that no PIB auction is near", () => {
    const pib = { auction: auction("pib", "2026-11-04", {}), gapDays: -7 };
    const s = describePairing("2026-11-11", pib);
    expect(s).toContain("T-bills: auction of 11 Nov 2026");
    expect(s).toContain("PIBs: auction of 4 Nov 2026 (7 days earlier)");
    expect(s).toContain("not one simultaneous curve");
    expect(describePairing("2026-11-11", { auction: pib.auction, gapDays: 0 })).toContain("on the same day");
    expect(describePairing("2026-11-11", { auction: pib.auction, gapDays: 1 })).toContain("1 day later");
    expect(describePairing("2024-01-10", null)).toBe("No PIB auction within 14 days of 10 Jan 2024, so no PIB curve is shown.");
  });
});
