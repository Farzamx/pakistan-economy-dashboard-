import { describe, expect, it } from "vitest";
import { getPibAuctions, getTBillAuctions } from "./dataset";
import { buildBondInsights, buildMethodFacts, buildSnapshot, dataFreshness, latestYield } from "./snapshot";
import type { AuctionOutcome, AuctionRecord, Tenor, TenorResult } from "./types";

const tb = getTBillAuctions();
const pib = getPibAuctions();
const ok = (c: number): TenorResult => ({ outcome: "accepted", cutoffYield: c, waYield: c - 0.1, offered: 1000, acceptedCompetitive: 400, acceptedNonCompetitive: 100, target: 500 });
const failed = (o: AuctionOutcome): TenorResult => ({ outcome: o, cutoffYield: null, waYield: null, offered: 800, acceptedCompetitive: null, acceptedNonCompetitive: null, target: 500 });
const auction = (date: string, tenors: Partial<Record<Tenor, TenorResult>>): AuctionRecord => ({ instrument: "tbill", auctionNo: null, auctionDate: date, settlementDate: date, tenors });
// a policy-rate history in the shape the page passes (one point per change)
const policy = [{ date: "2025-05-05", value: 11 }, { date: "2026-10-26", value: 12 }];

describe("latestYield", () => {
  it("at the newest auction: the value, its date, the previous accepted yield, and no warning flag", () => {
    const l = latestYield(tb, "3M", "cutoff")!;
    expect(l.atLatestAuction).toBe(true);
    expect(l.auction.auctionDate).toBe("2026-11-11");
    expect(l.value).toBe(11.9999);
    const prev = tb[tb.length - 2].tenors["3M"]!.cutoffYield as number;
    expect(l.previous).toEqual({ date: "2026-10-28", value: prev });
    expect(l.newestOutcome).toBeNull();
  });
  it("hand-worked: when the newest auction produced no yield, it returns the last accepted one, dated, and says why", () => {
    const list = [auction("2026-01-14", { "12M": ok(12.5) }), auction("2026-01-28", { "12M": ok(12.4) }), auction("2026-02-11", { "12M": failed("bids-rejected") })];
    const l = latestYield(list, "12M", "cutoff")!;
    expect(l.atLatestAuction).toBe(false);
    expect(l.auction.auctionDate).toBe("2026-01-28");
    expect(l.value).toBe(12.4);
    expect(l.previous).toEqual({ date: "2026-01-14", value: 12.5 });
    expect(l.newestOutcome).toBe("bids-rejected");
  });
  it("a tenor not offered in the newest auction is reported as not-offered; one that never produced a yield is null", () => {
    expect(latestYield([auction("2026-01-14", { "3M": ok(12) }), auction("2026-01-28", { "6M": ok(12.1) })], "3M", "cutoff")?.newestOutcome).toBe("not-offered");
    expect(latestYield([auction("2026-01-14", { "3M": failed("no-bids") })], "3M", "cutoff")).toBeNull();
  });
  it("the definition is honoured", () => {
    expect(latestYield(tb, "3M", "wa")?.value).toBe(11.9887);
  });
});

describe("buildSnapshot on the real archive", () => {
  const tiles = buildSnapshot({ tbills: tb, pibs: pib, policy, def: "cutoff" });
  const byKey = Object.fromEntries(tiles.map((t) => [t.key, t]));
  it("has the six tiles in order", () => expect(tiles.map((t) => t.key)).toEqual(["t3m", "t12m", "p3y", "p10y", "slope", "policy"]));
  it("3-month T-bill: 11.9999% at the 11 Nov 2026 auction, with the change in bp against the previous accepted auction", () => {
    // tiles show two decimals (11.9999 rounds to 12.00); the exact four-decimal figure is in the tooltips and tables
    expect(byKey.t3m).toMatchObject({ label: "3-month T-bill", value: "12.00%", period: "Auction 11 Nov 2026", warning: null });
    const prev = tb[tb.length - 2].tenors["3M"]!.cutoffYield as number;
    const bp = Math.round((11.9999 - prev) * 1000) / 10;
    expect(byKey.t3m.change).toBe(`${bp > 0 ? "+" : "−"}${Math.abs(bp).toFixed(1)} bp vs previous accepted auction`);
    expect(byKey.t3m.previous).toBe(`${prev.toFixed(2)}% on 28 Oct 2026`);
  });
  it("12-month T-bill 12.41%; 3-year PIB 12.64% (auction 4 Nov 2026); 10-year PIB 12.85%", () => {
    expect(byKey.t12m.value).toBe("12.41%");
    expect(byKey.p3y).toMatchObject({ value: "12.64%", period: "Auction 4 Nov 2026" });
    expect(byKey.p10y.value).toBe("12.85%");
  });
  it("slope tile: +41 bp, upward; policy tile: 3M yield minus the policy rate in force (11.9999 - 12.00 = -0.00)", () => {
    expect(byKey.slope).toMatchObject({ value: "+41", kind: "12M minus 3M, bp" });
    expect(byKey.slope.note).toContain("Upward-sloping");
    expect(byKey.policy.value).toBe("0.00 pp"); // 11.9999 - 12 rounds to 0.00
    expect(byKey.policy.note).toContain("12.00%");
  });
  it("without a policy-rate history there is no policy tile, and nothing is invented", () => {
    expect(buildSnapshot({ tbills: tb, pibs: pib, policy: null, def: "cutoff" }).map((t) => t.key)).not.toContain("policy");
  });
  it("a tenor whose newest auction failed shows its last accepted yield with a warning (never blank, never zero)", () => {
    const list = [auction("2026-01-14", { "3M": ok(12), "12M": ok(12.5) }), auction("2026-01-28", { "3M": ok(12.1), "12M": failed("no-bids") })];
    const t = buildSnapshot({ tbills: list, pibs: [], policy: null, def: "cutoff" }).find((x) => x.key === "t12m")!;
    expect(t.value).toBe("12.50%");
    expect(t.period).toBe("Auction 14 Jan 2026");
    expect(t.warning).toContain("28 Jan 2026");
    expect(t.warning).toContain("no bids");
  });
});

describe("buildBondInsights on the real archive", () => {
  const insights = buildBondInsights({ tbills: tb, pibs: pib, policy, def: "cutoff" });
  const by = Object.fromEntries(insights.map((i) => [i.id, i]));
  it("produces the eight findings, each with an id, text and evidence", () => {
    expect(insights.map((i) => i.id)).toEqual(["tbill-curve", "pib-curve", "year-on-year", "peak", "inversion", "policy", "participation", "failures"]);
    for (const i of insights) {
      expect(i.text.length).toBeGreaterThan(30);
      expect(i.evidence.length).toBeGreaterThan(0);
      for (const e of i.evidence) expect(Number.isFinite(e.value)).toBe(true);
    }
    expect(new Set(insights.map((i) => i.id)).size).toBe(insights.length);
  });
  it("hand-worked wording for the latest curve, the peak and the inversion", () => {
    expect(by["tbill-curve"].text).toBe("At the 11 Nov 2026 T-bill auction, 1-month bills cleared at 11.88% and 12-month bills at 12.41%. Upward-sloping: 12-month yields are 41 bp above 3-month yields.");
    expect(by["peak"].text).toBe("The 12-month cut-off yield was highest at 25.07% on 6 Sep 2023. The latest figure, 12.41% (11 Nov 2026), is 12.66 percentage points lower.");
    expect(by["inversion"].text).toBe("The T-bill curve was inverted at 58 of 243 auctions that have a slope. The longest run was 22 auctions, from 10 Jan 2024 to 27 Nov 2024, averaging −89.4 bp and reaching −161 bp.");
    expect(by["pib-curve"].text).toContain("3-year bonds cleared at 12.64% and 10-year bonds at 12.85%");
    expect(by["pib-curve"].text).toContain("No yield was set for 15Y");
  });
  it("year-on-year: higher by 101.3 bp on average across 4 tenors, steepened by 10.3 bp", () => {
    expect(by["year-on-year"].text).toBe("Against the 12 Nov 2025 auction, T-bill yields are 101.3 bp higher on average across 4 tenors, and the curve steepened by 10.3 bp.");
  });
  it("policy: 3M cut-off 11.9999 against 12.00 in force is 0.00 points below, worded as a level", () => {
    expect(by["policy"].text).toContain("level with");
  });
  it("participation uses the combined target of the four tenors (Rs 400bn) and the real auction totals", () => {
    expect(by["participation"].text).toBe("The 11 Nov 2026 T-bill auction drew Rs 2,193bn of competitive bids and accepted Rs 587bn in total: bids were 5.48 times the combined target.");
  });
  it("every finding carries a caveat saying what it does not show", () => {
    for (const i of insights) expect(i.caveat?.length ?? 0).toBeGreaterThan(20);
  });
  it("is deterministic, and without a policy history simply omits the policy finding", () => {
    expect(buildBondInsights({ tbills: tb, pibs: pib, policy, def: "cutoff" })).toEqual(insights);
    expect(buildBondInsights({ tbills: tb, pibs: pib, policy: null, def: "cutoff" }).map((i) => i.id)).not.toContain("policy");
  });
  it("no finding states a cause or calls a nominal figure real", () => {
    for (const i of insights) expect(i.text).not.toMatch(/because|due to|caused|real yield|real terms/i);
  });
  it("handles an empty archive without throwing", () => {
    expect(buildBondInsights({ tbills: [], pibs: [], policy: null, def: "cutoff" })).toEqual([]);
    expect(buildSnapshot({ tbills: [], pibs: [], policy: null, def: "cutoff" })).toEqual([]);
  });
});

describe("dataFreshness", () => {
  it("is fresh on the retrieval day and for three weeks; stale after that", () => {
    expect(dataFreshness("2026-11-12", "2026-11-12", tb, pib)).toMatchObject({ ageDays: 0, stale: false, latestTBillAuction: "2026-11-11", latestPibAuction: "2026-11-04" });
    expect(dataFreshness("2026-11-12", "2026-12-03", tb, pib)).toMatchObject({ ageDays: 21, stale: false });
    expect(dataFreshness("2026-11-12", "2026-12-04", tb, pib)).toMatchObject({ ageDays: 22, stale: true });
  });
  it("an empty archive has no latest dates", () => {
    expect(dataFreshness("2026-11-12", "2026-11-12", [], [])).toMatchObject({ latestTBillAuction: null, latestPibAuction: null });
  });
});

describe("buildMethodFacts", () => {
  it("counts coverage, failures and slopes from the real archive", () => {
    const f = buildMethodFacts(tb, pib)!;
    expect(f).toMatchObject({ tbillAuctions: 324, tbillFirst: "2014-07-09", tbillLast: "2026-11-11", pibAuctions: 29, pibFirst: "2024-07-09", pibLast: "2026-11-04", slopeAuctions: 243, acceptedWithoutNonCompetitive: 9 });
    expect(f.failedTBill).toEqual({ "6M": 40, "12M": 80, "3M": 3, "1M": 1 });
    expect(f.failedPib["15Y"]).toBeGreaterThan(f.failedPib["3Y"] ?? 0);
  });
  it("is null for an empty archive", () => {
    expect(buildMethodFacts([], pib)).toBeNull();
    expect(buildMethodFacts(tb, [])).toBeNull();
  });
});
