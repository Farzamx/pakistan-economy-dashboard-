import { describe, expect, it } from "vitest";
import { GOV_SEC_PROVENANCE } from "@/data/govSecAuctions";
import { decodeAuction, decodeTenor, getAuctions, getExcludedRows, getPibAuctions, getProvenance, getTBillAuctions } from "./dataset";
import { daysBetween } from "./analytics";
import type { AuctionRecord, TenorResult } from "./types";

const tb = getTBillAuctions();
const pib = getPibAuctions();
const all = [...tb, ...pib];
const results = (a: AuctionRecord) => Object.entries(a.tenors) as [string, TenorResult][];

describe("coverage and structure", () => {
  it("holds the archive's detailed era: 324 T-bill auctions (2014-07-09 to 2026-11-11) and 29 PIB auctions (2024-07-09 to 2026-11-04)", () => {
    expect(tb).toHaveLength(324);
    expect(tb[0].auctionDate).toBe("2014-07-09");
    expect(tb[tb.length - 1].auctionDate).toBe("2026-11-11");
    expect(pib).toHaveLength(29);
    expect(pib[0].auctionDate).toBe("2024-07-09");
    expect(pib[pib.length - 1].auctionDate).toBe("2026-11-04");
    expect(tb.reduce((n, a) => n + Object.keys(a.tenors).length, 0)).toBe(1016);
    expect(pib.reduce((n, a) => n + Object.keys(a.tenors).length, 0)).toBe(137);
  });
  it("is ordered, with no duplicate auction dates", () => {
    for (const list of [tb, pib]) {
      for (let i = 1; i < list.length; i++) expect(list[i].auctionDate > list[i - 1].auctionDate).toBe(true);
    }
  });
  it("T-bill auction numbers run 413 to 737 with no gap except 700, whose only row was the excluded one-off 22-day bill", () => {
    const nums = new Set(tb.map((a) => a.auctionNo));
    const missing: number[] = [];
    for (let n = 413; n <= 737; n++) if (!nums.has(n)) missing.push(n);
    expect(missing).toEqual([700]);
    expect(nums.size).toBe(324);
    const excluded = getExcludedRows();
    expect(excluded).toHaveLength(1);
    expect(excluded[0]).toMatchObject({ instrument: "tbill", auctionDate: "2025-06-18", tenorLabel: "22-Day" });
  });
  it("tenors are on the standard grids; the 1-month bill exists only from 2025-03-19", () => {
    for (const a of tb) for (const [t] of results(a)) expect(["1M", "3M", "6M", "12M"]).toContain(t);
    for (const a of pib) for (const [t] of results(a)) expect(["2Y", "3Y", "5Y", "10Y", "15Y"]).toContain(t);
    const firstOneMonth = tb.find((a) => a.tenors["1M"]);
    expect(firstOneMonth?.auctionDate).toBe("2025-03-19");
    expect(tb.filter((a) => a.tenors["1M"]).length).toBe(44);
  });
  it("the settlement date is never before the auction date, and the gaps are the ones SBP uses", () => {
    for (const a of tb) expect(daysBetween(a.auctionDate, a.settlementDate)).toBeGreaterThanOrEqual(0);
    for (const a of tb) expect(daysBetween(a.auctionDate, a.settlementDate)).toBeLessThanOrEqual(8);
    for (const a of pib) {
      expect(daysBetween(a.auctionDate, a.settlementDate)).toBeGreaterThanOrEqual(1);
      expect(daysBetween(a.auctionDate, a.settlementDate)).toBeLessThanOrEqual(4);
    }
  });
});

describe("data quality (reported by the generator, pinned here)", () => {
  it("every yield is a plausible percent per annum", () => {
    for (const a of all)
      for (const [t, r] of results(a))
        for (const y of [r.cutoffYield, r.waYield]) {
          if (y === null) continue;
          expect(y, `${a.instrument} ${a.auctionDate} ${t}`).toBeGreaterThan(0);
          expect(y, `${a.instrument} ${a.auctionDate} ${t}`).toBeLessThanOrEqual(40);
        }
  });
  it("the cut-off yield is never below the weighted-average yield", () => {
    for (const a of all) for (const [t, r] of results(a)) if (r.cutoffYield !== null && r.waYield !== null) expect(r.cutoffYield, `${a.instrument} ${a.auctionDate} ${t}`).toBeGreaterThanOrEqual(r.waYield - 0.0001);
  });
  it("competitive bids accepted never exceed competitive bids offered", () => {
    for (const a of all) for (const [t, r] of results(a)) if (r.acceptedCompetitive !== null && r.offered !== null) expect(r.acceptedCompetitive, `${a.instrument} ${a.auctionDate} ${t}`).toBeLessThanOrEqual(r.offered + 0.001);
  });
  it("outcome and figures agree: an accepted tenor has both yields; every other outcome has none and no accepted amount (never a zero)", () => {
    for (const a of all)
      for (const [t, r] of results(a)) {
        if (r.outcome === "accepted") {
          expect(r.cutoffYield, `${a.auctionDate} ${t}`).not.toBeNull();
          expect(r.waYield).not.toBeNull();
          expect(r.acceptedCompetitive).not.toBeNull();
        } else {
          expect(r.cutoffYield, `${a.auctionDate} ${t}`).toBeNull();
          expect(r.waYield).toBeNull();
          expect(r.acceptedCompetitive).toBeNull();
          expect(r.acceptedNonCompetitive).toBeNull();
        }
      }
  });
  it("counts of failed tenors are as profiled: T-bills 12M 80, 6M 40, 3M 3, 1M 1 (auction 733, 2026-09-16, bids rejected); PIB 15Y fails most often", () => {
    const failed = (list: AuctionRecord[], t: string) => list.filter((a) => a.tenors[t as "3M"] && a.tenors[t as "3M"]!.outcome !== "accepted").length;
    expect(failed(tb, "12M")).toBe(80);
    expect(failed(tb, "6M")).toBe(40);
    expect(failed(tb, "3M")).toBe(3);
    expect(failed(tb, "1M")).toBe(1);
    expect(tb.find((a) => a.auctionDate === "2026-09-16")?.tenors["1M"]).toMatchObject({ outcome: "bids-rejected", offered: 578449.37, cutoffYield: null });
    expect(failed(pib, "15Y")).toBeGreaterThan(failed(pib, "3Y"));
  });
  it("the per-tenor target is null before Sep-2019 and present from then on for accepted tenors", () => {
    for (const a of tb) for (const [t, r] of results(a)) if (a.auctionDate < "2019-09-01") expect(r.target, `${a.auctionDate} ${t}`).toBeNull();
    expect(tb.find((a) => a.auctionDate === "2019-09-11")?.tenors["3M"]?.target).not.toBeNull();
  });
});

describe("figures pinned to SBP's own published auction-result PDFs", () => {
  // auction-tbills.pdf (retrieved 2026-11-12): auction of 11 Nov 2026
  const tbPdf: Record<string, [cutoff: number, wa: number, offered: number, accComp: number, accNcb: number]> = {
    "1M": [11.8838, 11.8838, 494746.16, 500.005, 15653.84],
    "3M": [11.9999, 11.9887, 666305.955, 19460, 281319.88],
    "6M": [12.19, 12.19, 355499.6, 11000, 27284.33],
    "12M": [12.41, 12.3988, 675998.58, 201500, 29992.71],
  };
  it("the 11 Nov 2026 T-bill auction matches the PDF in every tenor: cut-off, weighted average, offered, accepted competitive and non-competitive", () => {
    const a = tb.find((x) => x.auctionDate === "2026-11-11")!;
    expect(a.auctionNo).toBe(737);
    expect(a.settlementDate).toBe("2026-11-12");
    for (const [tenor, [cutoff, wa, offered, accComp, accNcb]] of Object.entries(tbPdf)) {
      const r = a.tenors[tenor as "3M"]!;
      expect(r.outcome).toBe("accepted");
      expect(r.cutoffYield, tenor).toBeCloseTo(cutoff, 4);
      expect(r.waYield, tenor).toBeCloseTo(wa, 4);
      expect(r.offered, tenor).toBeCloseTo(offered, 3);
      expect(r.acceptedCompetitive, tenor).toBeCloseTo(accComp, 3);
      expect(r.acceptedNonCompetitive, tenor).toBeCloseTo(accNcb, 3);
    }
  });
  it("the 4 Nov 2026 PIB auction matches the PDF: 2Y, 3Y, 5Y and 10Y accepted, 15Y bids rejected", () => {
    const a = pib.find((x) => x.auctionDate === "2026-11-04")!;
    expect(a.settlementDate).toBe("2026-11-05");
    const pdf: Record<string, [number, number, number, number]> = { "2Y": [12.79, 12.79, 110000, 3750], "3Y": [12.638, 12.6208, 621230, 157005], "5Y": [12.8, 12.7605, 437850, 149650], "10Y": [12.85, 12.8446, 121462.7, 56062.7] };
    for (const [tenor, [cutoff, wa, offered, accComp]] of Object.entries(pdf)) {
      const r = a.tenors[tenor as "3Y"]!;
      expect(r.cutoffYield, tenor).toBeCloseTo(cutoff, 4);
      expect(r.waYield, tenor).toBeCloseTo(wa, 4);
      expect(r.offered, tenor).toBeCloseTo(offered, 3);
      expect(r.acceptedCompetitive, tenor).toBeCloseTo(accComp, 3);
    }
    expect(a.tenors["2Y"]?.acceptedNonCompetitive).toBeCloseTo(507.3, 3);
    expect(a.tenors["2Y"]?.acceptedShortSale).toBeCloseTo(7250, 3);
    expect(a.tenors["15Y"]).toMatchObject({ outcome: "bids-rejected", cutoffYield: null, offered: 5000 });
  });
  it("points checked against SBP EasyData's weighted-average 3-month series on the same date agree to its two printed decimals", () => {
    const wa = (d: string) => tb.find((a) => a.auctionDate === d)?.tenors["3M"]?.waYield;
    // EasyData values read on 2026-11-12: 2025-04-30 11.98, 2025-07-09 10.86, 2014-07-23 9.9564, 2026-10-14 11.89
    expect(wa("2025-04-30")).toBeCloseTo(11.98, 1);
    expect(Math.abs((wa("2025-04-30") as number) - 11.98)).toBeLessThanOrEqual(0.005);
    expect(Math.abs((wa("2025-07-09") as number) - 10.86)).toBeLessThanOrEqual(0.005);
    expect(wa("2014-07-23")).toBeCloseTo(9.9564, 4);
    expect(Math.abs((wa("2026-10-14") as number) - 11.89)).toBeLessThanOrEqual(0.005);
  });
});

describe("decoding", () => {
  it("decodeTenor reads the tuple, and PIB tuples carry the short sale", () => {
    expect(decodeTenor([11.9999, 11.9887, 666305.955, 19460, 281319.88, 100000, "A"])).toEqual({ outcome: "accepted", cutoffYield: 11.9999, waYield: 11.9887, offered: 666305.955, acceptedCompetitive: 19460, acceptedNonCompetitive: 281319.88, target: 100000 });
    expect(decodeTenor([12.79, 12.79, 110000, 3750, 507.3, 75000, "A", 7250]).acceptedShortSale).toBe(7250);
    expect(decodeTenor([null, null, 5000, null, null, 50000, "BR"])).toMatchObject({ outcome: "bids-rejected", cutoffYield: null });
  });
  it("can fail: an unknown outcome code or tenor throws instead of being read as accepted or ignored", () => {
    expect(() => decodeTenor([1, 1, 1, 1, 1, 1, "Z"])).toThrow(/unknown outcome code/);
    expect(() => decodeTenor([1, 1, 1, 1, 1, 1, null])).toThrow(/unknown outcome code/);
    expect(() => decodeAuction("tbill", [1, "2026-01-01", "2026-01-02", { "7M": [1, 1, 1, 1, 1, 1, "A"] }])).toThrow(/unknown tenor/);
  });
  it("getAuctions routes by instrument", () => {
    expect(getAuctions("tbill")).toBe(tb);
    expect(getAuctions("pib")).toBe(pib);
  });
});

describe("provenance", () => {
  it("names the two official files, their sheets, a sha256 for each and the retrieval date", () => {
    const p = getProvenance();
    expect(p).toBe(GOV_SEC_PROVENANCE);
    expect(p.retrievedOn).toBe("2026-11-12");
    expect(p.sources.map((s) => s.url)).toEqual(["https://www.sbp.org.pk/assets/document/tb.xlsx", "https://www.sbp.org.pk/assets/document/Pakinvestbonds.xlsx"]);
    for (const s of p.sources) expect(s.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(p.sources.map((s) => s.sheet)).toEqual(["New Detailed Format", "New Format"]);
  });
});
