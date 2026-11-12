import { describe, expect, it } from "vitest";
import {
  MAX_PAIR_GAP_DAYS,
  SHAPE_THRESHOLD_BP,
  auctionPresets,
  classifyShape,
  compareCurves,
  curvePoints,
  daysBetween,
  failedTenors,
  flowRows,
  latestAuction,
  monthsBefore,
  nearestAuction,
  pairedAuction,
  policySpreadSeries,
  shapeRegimes,
  slopeOf,
  slopeSeries,
  tenorSeries,
  totalAccepted,
  yieldOf,
} from "./analytics";
import { getPibAuctions, getTBillAuctions } from "./dataset";
import type { AuctionOutcome, AuctionRecord, Instrument, Tenor, TenorResult } from "./types";

// ── builders ──
const ok = (cutoff: number, wa: number, over: Partial<TenorResult> = {}): TenorResult => ({ outcome: "accepted", cutoffYield: cutoff, waYield: wa, offered: 1000, acceptedCompetitive: 400, acceptedNonCompetitive: 100, target: 500, ...over });
const failed = (outcome: AuctionOutcome, offered: number | null = 800): TenorResult => ({ outcome, cutoffYield: null, waYield: null, offered, acceptedCompetitive: null, acceptedNonCompetitive: null, target: 500 });
const auction = (instrument: Instrument, date: string, tenors: Partial<Record<Tenor, TenorResult>>, no: number | null = null): AuctionRecord => ({ instrument, auctionNo: no, auctionDate: date, settlementDate: date, tenors });
const tbill = (date: string, y3: number, y12: number, extra: Partial<Record<Tenor, TenorResult>> = {}) => auction("tbill", date, { "3M": ok(y3, y3 - 0.1), "12M": ok(y12, y12 - 0.1), ...extra });

describe("yields and amounts", () => {
  it("yieldOf follows the chosen definition and is null for a failed or absent tenor", () => {
    const t = ok(12.5, 12.4);
    expect(yieldOf(t, "cutoff")).toBe(12.5);
    expect(yieldOf(t, "wa")).toBe(12.4);
    expect(yieldOf(failed("bids-rejected"), "cutoff")).toBeNull();
    expect(yieldOf(undefined, "wa")).toBeNull();
  });
  it("totalAccepted adds competitive, non-competitive and short sale; a failed tenor has none (not zero)", () => {
    expect(totalAccepted(ok(1, 1, { acceptedCompetitive: 300, acceptedNonCompetitive: 50.5, acceptedShortSale: 25 }))).toBe(375.5);
    expect(totalAccepted(ok(1, 1, { acceptedNonCompetitive: null }))).toBe(400);
    expect(totalAccepted(ok(1, 1, { acceptedCompetitive: null, acceptedNonCompetitive: null }))).toBeNull();
    expect(totalAccepted(failed("no-bids", null))).toBeNull();
    expect(totalAccepted(undefined)).toBeNull();
  });
});

describe("dates and pairing", () => {
  it("daysBetween is signed", () => {
    expect(daysBetween("2026-11-04", "2026-11-11")).toBe(7);
    expect(daysBetween("2026-11-11", "2026-11-04")).toBe(-7);
    expect(daysBetween("2024-02-28", "2024-03-01")).toBe(2); // 2024 is a leap year
  });
  it("monthsBefore clamps to the end of a shorter month and crosses years", () => {
    expect(monthsBefore("2026-03-31", 1)).toBe("2026-02-28");
    expect(monthsBefore("2024-03-31", 1)).toBe("2024-02-29");
    expect(monthsBefore("2026-01-15", 13)).toBe("2024-12-15");
    expect(monthsBefore("2026-11-11", 12)).toBe("2025-11-11");
  });
  it("nearestAuction picks the closest by absolute days and the earlier one on a tie", () => {
    const list = [auction("pib", "2026-10-07", {}), auction("pib", "2026-11-04", {})];
    expect(nearestAuction(list, "2026-11-11")?.auction.auctionDate).toBe("2026-11-04");
    expect(nearestAuction(list, "2026-11-11")?.gapDays).toBe(-7);
    expect(nearestAuction(list, "2026-10-21")?.auction.auctionDate).toBe("2026-10-07"); // 14 days from each: earlier wins
    expect(nearestAuction([], "2026-11-11")).toBeNull();
  });
  it("pairedAuction refuses a PIB auction more than 14 days away", () => {
    const list = [auction("pib", "2026-10-07", {})];
    expect(pairedAuction(list, "2026-10-21")?.gapDays).toBe(-14);
    expect(MAX_PAIR_GAP_DAYS).toBe(14);
    expect(pairedAuction(list, "2026-10-22")).toBeNull();
  });
});

describe("curves, slope and shape", () => {
  it("curvePoints lists every tenor of the instrument in maturity order; absent tenors are not-offered, failed ones keep their outcome; nothing is zero", () => {
    const a = auction("tbill", "2025-01-01", { "3M": ok(12, 11.9), "6M": failed("bids-rejected"), "12M": failed("no-bids", null) });
    const pts = curvePoints(a, "cutoff");
    expect(pts.map((p) => p.tenor)).toEqual(["1M", "3M", "6M", "12M"]);
    expect(pts.map((p) => p.status)).toEqual(["not-offered", "accepted", "bids-rejected", "no-bids"]);
    expect(pts.map((p) => p.yield)).toEqual([null, 12, null, null]);
    expect(pts.map((p) => p.years)).toEqual([1 / 12, 0.25, 0.5, 1]);
    expect(curvePoints(auction("pib", "2025-01-01", {}), "wa").map((p) => p.tenor)).toEqual(["2Y", "3Y", "5Y", "10Y", "15Y"]);
  });
  it("classifyShape at the 10 bp boundaries", () => {
    expect(SHAPE_THRESHOLD_BP).toBe(10);
    expect(classifyShape(10)).toBe("upward");
    expect(classifyShape(9.9)).toBe("flat");
    expect(classifyShape(0)).toBe("flat");
    expect(classifyShape(-9.9)).toBe("flat");
    expect(classifyShape(-10)).toBe("inverted");
    expect(classifyShape(-161)).toBe("inverted");
  });
  it("hand-worked slope: T-bills 12M minus 3M = 12.41 - 11.9999 = 41.0 bp; PIBs 10Y minus 3Y = 12.85 - 12.638 = 21.2 bp", () => {
    expect(slopeOf(tbill("2026-11-11", 11.9999, 12.41), "cutoff")).toEqual({ shortTenor: "3M", longTenor: "12M", bp: 41, shape: "upward" });
    const p = auction("pib", "2026-11-04", { "3Y": ok(12.638, 12.6208), "10Y": ok(12.85, 12.8446) });
    expect(slopeOf(p, "cutoff")).toEqual({ shortTenor: "3Y", longTenor: "10Y", bp: 21.2, shape: "upward" });
    expect(slopeOf(p, "wa")?.bp).toBe(22.4); // 12.8446 - 12.6208
  });
  it("an inverted T-bill curve: 12M below 3M", () => {
    expect(slopeOf(tbill("2024-02-14", 21.5, 20.1), "cutoff")).toMatchObject({ bp: -140, shape: "inverted" });
  });
  it("can fail: a missing leg gives no slope, never a slope from a neighbouring tenor", () => {
    expect(slopeOf(auction("tbill", "2025-01-01", { "3M": ok(12, 11.9), "6M": ok(12.2, 12.1), "12M": failed("bids-rejected") }), "cutoff")).toBeNull();
    expect(slopeOf(auction("tbill", "2025-01-01", { "6M": ok(12.2, 12.1), "12M": ok(12.4, 12.3) }), "cutoff")).toBeNull();
  });
});

describe("compareCurves", () => {
  const A = auction("tbill", "2025-11-12", { "1M": ok(10.0, 9.9), "3M": ok(10.0, 9.9), "6M": ok(10.2, 10.1), "12M": ok(10.5, 10.4) });
  const B = auction("tbill", "2026-11-11", { "1M": ok(11.5, 11.4), "3M": ok(11.0, 10.9), "6M": ok(11.1, 11.0), "12M": ok(11.2, 11.1) });
  it("hand-worked: per-tenor changes, mean shift and the flattening of the slope", () => {
    const c = compareCurves(A, B, "cutoff");
    expect(c.changes.map((x) => x.deltaBp)).toEqual([150, 100, 90, 70]);
    expect(c.commonTenors).toBe(4);
    expect(c.averageShiftBp).toBe(102.5);
    expect(c.slopeA?.bp).toBe(50); // 10.5 - 10.0
    expect(c.slopeB?.bp).toBe(20); // 11.2 - 11.0
    expect(c.slopeChangeBp).toBe(-30);
    expect(c.movement).toBe("flattening");
  });
  it("steepening and parallel are named by the 10 bp rule", () => {
    expect(compareCurves(B, A, "cutoff").movement).toBe("steepening");
    const C = auction("tbill", "2026-12-01", { "3M": ok(11.0, 10.9), "12M": ok(11.25, 11.1) });
    const D = auction("tbill", "2026-12-15", { "3M": ok(11.5, 11.4), "12M": ok(11.8, 11.7) });
    expect(compareCurves(C, D, "cutoff").slopeChangeBp).toBe(5);
    expect(compareCurves(C, D, "cutoff").movement).toBe("parallel");
  });
  it("a tenor present on one curve only has no change and does not enter the mean", () => {
    const noOneMonth = auction("tbill", "2026-11-11", { "3M": ok(11.0, 10.9), "6M": ok(11.1, 11.0), "12M": ok(11.2, 11.1) });
    const c = compareCurves(A, noOneMonth, "cutoff");
    expect(c.changes[0]).toMatchObject({ tenor: "1M", a: 10, b: null, deltaBp: null });
    expect(c.commonTenors).toBe(3);
    expect(c.averageShiftBp).toBe(86.7); // (100 + 90 + 70) / 3
  });
  it("can fail: two curves with no common tenor give no shift, no slope change and no movement; different instruments throw", () => {
    const x = auction("tbill", "2026-01-01", { "3M": ok(1, 1) });
    const y = auction("tbill", "2026-02-01", { "6M": ok(1, 1) });
    const c = compareCurves(x, y, "cutoff");
    expect(c).toMatchObject({ commonTenors: 0, averageShiftBp: null, slopeChangeBp: null, movement: null });
    expect(() => compareCurves(A, auction("pib", "2026-11-04", {}), "cutoff")).toThrow(/different instruments/);
  });
});

describe("history, regimes and policy spread", () => {
  const seq = [
    tbill("2024-01-03", 20, 20.5), // +50 upward
    tbill("2024-01-17", 20, 20.3), // +30 upward
    tbill("2024-01-31", 20, 20.05), // +5 flat
    tbill("2024-02-14", 21, 20), // -100 inverted
    auction("tbill", "2024-02-28", { "3M": ok(21, 20.9), "12M": failed("bids-rejected") }), // no slope: skipped, not a break
    tbill("2024-03-13", 21, 19.4), // -160 inverted
    tbill("2024-03-27", 19, 19.6), // +60 upward
  ];
  it("tenorSeries excludes failed tenors (no zero, no carry-forward); failedTenors lists them with why", () => {
    expect(tenorSeries(seq, "12M", "cutoff").map((p) => p.date)).toEqual(["2024-01-03", "2024-01-17", "2024-01-31", "2024-02-14", "2024-03-13", "2024-03-27"]);
    expect(failedTenors(seq, "12M")).toEqual([{ date: "2024-02-28", outcome: "bids-rejected" }]);
    expect(tenorSeries(seq, "1M", "cutoff")).toEqual([]);
  });
  it("slopeSeries skips auctions with no slope", () => {
    expect(slopeSeries(seq, "cutoff").map((s) => s.date)).not.toContain("2024-02-28");
    expect(slopeSeries(seq, "cutoff")).toHaveLength(6);
  });
  it("hand-worked regimes: runs of equal shape, with count, average and extreme slope; a skipped auction does not split a run", () => {
    const r = shapeRegimes(slopeSeries(seq, "cutoff"));
    expect(r.map((x) => [x.shape, x.from, x.to, x.auctions])).toEqual([
      ["upward", "2024-01-03", "2024-01-17", 2],
      ["flat", "2024-01-31", "2024-01-31", 1],
      ["inverted", "2024-02-14", "2024-03-13", 2], // 02-28 had no slope and is skipped
      ["upward", "2024-03-27", "2024-03-27", 1],
    ]);
    expect(r[0]).toMatchObject({ averageBp: 40, extremeBp: 50 });
    expect(r[2]).toMatchObject({ averageBp: -130, extremeBp: -160 });
    expect(shapeRegimes([])).toEqual([]);
  });
  it("policySpreadSeries uses the policy rate in force on the auction date and skips auctions before the first observation", () => {
    const policy = [{ date: "2024-01-10", value: 22 }, { date: "2024-02-20", value: 21 }];
    const s = policySpreadSeries(seq, "3M", "cutoff", policy);
    expect(s.map((p) => p.date)).toEqual(["2024-01-17", "2024-01-31", "2024-02-14", "2024-02-28", "2024-03-13", "2024-03-27"]); // 01-03 precedes the first policy point
    expect(s[0]).toEqual({ date: "2024-01-17", yield: 20, policyRate: 22, spreadPp: -2 });
    expect(s.find((p) => p.date === "2024-02-14")).toMatchObject({ policyRate: 22, spreadPp: -1 }); // 21 - 22
    expect(s.find((p) => p.date === "2024-02-28")).toMatchObject({ policyRate: 21, spreadPp: 0 }); // the cut took effect on 02-20
    expect(policySpreadSeries(seq, "3M", "cutoff", [])).toEqual([]);
  });
});

describe("flowRows", () => {
  it("a single tenor: offered, accepted (competitive + non-competitive), target and the ratios to two decimals", () => {
    const a = auction("tbill", "2026-11-11", { "3M": ok(12, 11.9, { offered: 666305.955, acceptedCompetitive: 19460, acceptedNonCompetitive: 281319.88, target: 100000 }) }, 737);
    const [row] = flowRows([a], "3M", "cutoff");
    expect(row).toMatchObject({ date: "2026-11-11", auctionNo: 737, offered: 666305.955, accepted: 300779.88, target: 100000, offeredOverTarget: 6.66, acceptedOverTarget: 3.01, outcome: "accepted", yield: 12 });
  });
  it("a tenor the auction did not offer has no row; a failed tenor keeps its offered amount and has no accepted amount or yield", () => {
    const a = auction("tbill", "2025-01-01", { "3M": failed("bids-rejected", 900) });
    expect(flowRows([a], "12M", "cutoff")).toEqual([]);
    expect(flowRows([a], "3M", "cutoff")[0]).toMatchObject({ offered: 900, accepted: null, acceptedOverTarget: null, outcome: "bids-rejected", yield: null });
  });
  it("'all' sums over tenors, adds nothing for a failed tenor's acceptance, and reports a mixed outcome", () => {
    const a = auction("tbill", "2025-01-01", { "3M": ok(12, 11.9, { offered: 1000, acceptedCompetitive: 300, acceptedNonCompetitive: 100, target: 400 }), "6M": ok(12, 11.9, { offered: 500, acceptedCompetitive: 200, acceptedNonCompetitive: 0, target: 200 }), "12M": failed("no-bids", null) });
    const [row] = flowRows([a], "all", "cutoff");
    expect(row).toMatchObject({ offered: 1500, accepted: 600, outcome: "mixed", yield: null });
    expect(row.target).toBe(1100); // 400 + 200 + the failed 12M tenor's own target of 500: a target applies whether or not the tenor succeeded
    expect(row.offeredOverTarget).toBe(1.36); // 1500 / 1100
  });
  it("'all' has no target when any tenor lacks one (SBP published only a combined target before Sep-2019)", () => {
    const a = auction("tbill", "2018-01-01", { "3M": ok(8, 7.9, { target: null }), "6M": ok(8, 7.9, { target: null }) });
    const [row] = flowRows([a], "all", "cutoff");
    expect(row.target).toBeNull();
    expect(row.offeredOverTarget).toBeNull();
  });
  it("'all' with nothing accepted has null accepted, not zero", () => {
    const a = auction("tbill", "2018-01-01", { "6M": failed("no-bids", null), "12M": failed("no-bids", null) });
    const [row] = flowRows([a], "all", "cutoff");
    expect(row.accepted).toBeNull();
    expect(row.offered).toBeNull();
    expect(row.outcome).toBe("no-bids");
  });
});

describe("presets", () => {
  it("are computed from the auctions: latest, previous, about 6 and 12 months earlier, highest and lowest long-tenor yield", () => {
    const list = [tbill("2025-05-14", 11, 11.2), tbill("2025-11-12", 11, 11.4), tbill("2026-04-29", 11, 12.9), tbill("2026-05-13", 11, 10.1), tbill("2026-10-28", 12, 12.4), tbill("2026-11-11", 12, 12.1)];
    const p = auctionPresets(list, "cutoff");
    expect(p.map((x) => [x.id, x.date])).toEqual([
      ["latest", "2026-11-11"],
      ["previous", "2026-10-28"],
      ["6m", "2026-05-13"], // nearest to 2026-05-11
      ["12m", "2025-11-12"], // 2025-11-11
      ["peak", "2026-04-29"],
      ["low", "2026-05-13"],
    ]);
    expect(p.find((x) => x.id === "peak")?.label).toBe("Highest 12M yield");
    expect(auctionPresets([], "cutoff")).toEqual([]);
  });
});

describe("on the real archive", () => {
  const tb = getTBillAuctions();
  const pib = getPibAuctions();
  it("latest T-bill curve (cut-off): 1M 11.8838, 3M 11.9999, 6M 12.19, 12M 12.41, an upward slope of 41 bp", () => {
    const last = latestAuction(tb)!;
    expect(curvePoints(last, "cutoff").map((p) => p.yield)).toEqual([11.8838, 11.9999, 12.19, 12.41]);
    expect(slopeOf(last, "cutoff")).toMatchObject({ bp: 41, shape: "upward" });
  });
  it("latest PIB curve: 2Y 12.79, 3Y 12.638, 5Y 12.8, 10Y 12.85, 15Y bids rejected; slope 21.2 bp", () => {
    const last = latestAuction(pib)!;
    expect(curvePoints(last, "cutoff").map((p) => [p.tenor, p.yield, p.status])).toEqual([["2Y", 12.79, "accepted"], ["3Y", 12.638, "accepted"], ["5Y", 12.8, "accepted"], ["10Y", 12.85, "accepted"], ["15Y", null, "bids-rejected"]]);
    expect(slopeOf(last, "cutoff")?.bp).toBe(21.2);
  });
  it("the nearest PIB auction to the latest T-bill auction is 7 days earlier, inside the 14-day pairing limit", () => {
    const pair = pairedAuction(pib, latestAuction(tb)!.auctionDate);
    expect(pair?.auction.auctionDate).toBe("2026-11-04");
    expect(pair?.gapDays).toBe(-7);
  });
  it("the 12-month cut-off yield peaked at 25.0687% on 2023-09-06 and was lowest at 5.8586% on 2016-07-20", () => {
    const s = tenorSeries(tb, "12M", "cutoff");
    expect(s.reduce((m, p) => (p.value > m.value ? p : m))).toEqual({ date: "2023-09-06", value: 25.0687 });
    expect(s.reduce((m, p) => (p.value < m.value ? p : m))).toEqual({ date: "2016-07-20", value: 5.8586 });
  });
  it("the T-bill curve was inverted for 22 consecutive auctions from 2024-01-10 to 2024-11-27 (average -89.4 bp, deepest -161 bp)", () => {
    const longest = shapeRegimes(slopeSeries(tb, "cutoff")).filter((r) => r.shape === "inverted").sort((a, b) => b.auctions - a.auctions)[0];
    expect(longest).toMatchObject({ from: "2024-01-10", to: "2024-11-27", auctions: 22, averageBp: -89.4, extremeBp: -161 });
  });
  it("243 of the 324 T-bill auctions have a slope; the rest had a failed 3M or 12M tenor", () => {
    expect(slopeSeries(tb, "cutoff")).toHaveLength(243);
  });
  it("one year earlier to latest: every T-bill tenor yields about a percentage point more and the curve steepened by 10.3 bp", () => {
    const c = compareCurves(nearestAuction(tb, "2025-11-12")!.auction, latestAuction(tb)!, "cutoff");
    expect(c.changes.map((x) => x.deltaBp)).toEqual([89.5, 95.7, 114, 106]);
    expect(c.averageShiftBp).toBe(101.3);
    expect(c.slopeChangeBp).toBe(10.3);
    expect(c.movement).toBe("steepening");
  });
  it("presets on the real archive name the 2023-09-06 peak and the 2016-07-20 low", () => {
    const p = auctionPresets(tb, "cutoff");
    expect(p.find((x) => x.id === "peak")?.date).toBe("2023-09-06");
    expect(p.find((x) => x.id === "low")?.date).toBe("2016-07-20");
    expect(p.find((x) => x.id === "12m")?.date).toBe("2025-11-12");
  });
});
