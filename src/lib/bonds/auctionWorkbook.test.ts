import { describe, expect, it } from "vitest";
import { classifyOutcome, excelSerialToIso, fractionToPercent, numberOrNull, parsePibSheet, parseTBillSheet } from "./auctionWorkbook";

// Excel serial for a YYYY-MM-DD, computed independently of the parser's own conversion.
const serial = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / 86400000 + 25569;

// A T-bill detailed-sheet row (19 columns).
function tbRow(o: { no: number; tenor: string; auction: string; issue: string; target?: number; offered?: unknown; accC?: unknown; accN?: unknown; cutoff?: unknown; wa?: unknown }) {
  const r: unknown[] = new Array(19).fill(null);
  r[0] = o.no; r[1] = o.tenor; r[2] = "PKXXXX"; r[3] = serial(o.auction); r[4] = serial(o.issue); r[6] = o.target ?? 100000;
  r[7] = o.offered ?? 1000; r[10] = o.accC ?? 500; r[11] = o.accN ?? 10; r[15] = o.cutoff ?? 0.12; r[16] = o.wa ?? 0.1195;
  return r;
}
// A PIB new-format row (22 columns).
function pibRow(o: { type?: string; tenor: string; auction: string; settle: string; target?: number; offered?: unknown; accC?: unknown; accN?: unknown; short?: unknown; cutoff?: unknown; wa?: unknown }) {
  const r: unknown[] = new Array(22).fill(null);
  r[0] = o.type ?? "Reopen"; r[2] = o.tenor; r[5] = serial(o.auction); r[6] = serial(o.settle); r[7] = o.target ?? 50000;
  r[8] = o.offered ?? 2000; r[10] = o.accC ?? 800; r[12] = o.accN ?? 20; r[14] = o.short ?? 0; r[19] = o.cutoff ?? 0.128; r[20] = o.wa ?? 0.1276;
  return r;
}

describe("primitives", () => {
  it("excelSerialToIso converts real serials and rejects nonsense", () => {
    expect(excelSerialToIso(serial("2026-11-11"))).toBe("2026-11-11");
    expect(excelSerialToIso(41829)).toBe("2014-07-09"); // SBP auction no. 413, read from the workbook
    expect(excelSerialToIso(0)).toBeNull();
    expect(excelSerialToIso(-5)).toBeNull();
    expect(excelSerialToIso("2026-11-11")).toBeNull();
    expect(excelSerialToIso(Number.NaN)).toBeNull();
    expect(excelSerialToIso(999999)).toBeNull();
  });
  it("numberOrNull reads numbers and numeric strings, never SBP's markers", () => {
    expect(numberOrNull(5)).toBe(5);
    expect(numberOrNull("0")).toBe(0);
    expect(numberOrNull(" 12.5 ")).toBe(12.5);
    for (const m of ["BR", "NBR", "-", "", null, undefined, {}, Number.NaN]) expect(numberOrNull(m)).toBeNull();
  });
  it("fractionToPercent keeps SBP's four printed decimals", () => {
    expect(fractionToPercent(0.119887)).toBe(11.9887);
    expect(fractionToPercent(0.0997905097212)).toBe(9.9791); // 9.97905097… rounds up at the fourth decimal
    expect(fractionToPercent(0.1)).toBe(10);
  });
  it("classifyOutcome: NBR beats BR beats numbers; a dash with offers means none accepted", () => {
    expect(classifyOutcome(100, 0.12, 0.119, 50)).toBe("accepted");
    expect(classifyOutcome("NBR", "NBR", "NBR", 0)).toBe("no-bids");
    expect(classifyOutcome(1000, "BR", "BR", 0)).toBe("bids-rejected");
    expect(classifyOutcome("NBR", "BR", "BR", "BR")).toBe("no-bids");
    expect(classifyOutcome(37250, "-", "-", 0)).toBe("none-accepted");
    expect(classifyOutcome(1000, 0.12, "-", 5)).toBe("none-accepted"); // one yield without the other is not an accepted result
  });
});

describe("parseTBillSheet", () => {
  it("hand-worked: yields to percent (4 dp), amounts to 3 dp, auction and issue dates kept apart", () => {
    const rows = [tbRow({ no: 737, tenor: "3-Month", auction: "2026-11-11", issue: "2026-11-12", target: 100000, offered: 666305.9554, accC: 19460, accN: 281319.88, cutoff: 0.119999, wa: 0.119887 })];
    const { auctions, excluded, warnings } = parseTBillSheet(rows);
    expect(excluded).toEqual([]);
    expect(warnings).toEqual([]);
    expect(auctions).toHaveLength(1);
    const a = auctions[0];
    expect(a).toMatchObject({ instrument: "tbill", auctionNo: 737, auctionDate: "2026-11-11", settlementDate: "2026-11-12" });
    expect(a.tenors["3M"]).toEqual({ outcome: "accepted", cutoffYield: 11.9999, waYield: 11.9887, offered: 666305.955, acceptedCompetitive: 19460, acceptedNonCompetitive: 281319.88, target: 100000 });
  });
  it("groups the tenors of one auction into one record and sorts auctions by date", () => {
    const rows = [
      tbRow({ no: 12, tenor: "6-Month", auction: "2024-02-14", issue: "2024-02-15" }),
      tbRow({ no: 11, tenor: "3-Month", auction: "2024-01-31", issue: "2024-02-01" }),
      tbRow({ no: 12, tenor: "3-Month", auction: "2024-02-14", issue: "2024-02-15" }),
      tbRow({ no: 12, tenor: "12-Month", auction: "2024-02-14", issue: "2024-02-15" }),
      tbRow({ no: 12, tenor: "1-Month", auction: "2024-02-14", issue: "2024-02-15" }),
    ];
    const { auctions } = parseTBillSheet(rows);
    expect(auctions.map((a) => a.auctionNo)).toEqual([11, 12]);
    expect(Object.keys(auctions[1].tenors).sort()).toEqual(["12M", "1M", "3M", "6M"]);
  });
  it("NBR is an outcome: null yields, null offered, null accepted, never zero", () => {
    const { auctions } = parseTBillSheet([tbRow({ no: 505, tenor: "6-Month", auction: "2018-01-17", issue: "2018-01-18", offered: "NBR", accC: 0, accN: "BR", cutoff: "NBR", wa: "NBR" })]);
    expect(auctions[0].tenors["6M"]).toEqual({ outcome: "no-bids", cutoffYield: null, waYield: null, offered: null, acceptedCompetitive: null, acceptedNonCompetitive: null, target: null });
  });
  it("BR keeps the bids that were offered and reports no yield and no acceptance", () => {
    const { auctions } = parseTBillSheet([tbRow({ no: 418, tenor: "6-Month", auction: "2014-09-17", issue: "2014-09-18", offered: 1000, accC: "BR", accN: "BR", cutoff: "BR", wa: "BR" })]);
    const t = auctions[0].tenors["6M"]!;
    expect(t.outcome).toBe("bids-rejected");
    expect(t.offered).toBe(1000);
    expect(t.cutoffYield).toBeNull();
    expect(t.waYield).toBeNull();
    expect(t.acceptedCompetitive).toBeNull();
  });
  it("a zero accepted amount on a failed tenor does not leak out as a zero", () => {
    const { auctions } = parseTBillSheet([tbRow({ no: 577, tenor: "12-Month", auction: "2020-10-21", issue: "2020-10-22", offered: 15, accC: 0, accN: 0, cutoff: "BR", wa: "BR" })]);
    expect(auctions[0].tenors["12M"]?.acceptedCompetitive).toBeNull();
    expect(auctions[0].tenors["12M"]?.acceptedNonCompetitive).toBeNull();
  });
  it("the one-off 22-day bill is excluded with a reason, not dropped silently, and its auction's other tenors are kept", () => {
    const rows = [tbRow({ no: 700, tenor: "22-Day", auction: "2025-06-18", issue: "2025-06-19" }), tbRow({ no: 700, tenor: "3-Month", auction: "2025-06-18", issue: "2025-06-19" })];
    const { auctions, excluded } = parseTBillSheet(rows);
    expect(excluded).toHaveLength(1);
    expect(excluded[0]).toMatchObject({ instrument: "tbill", auctionDate: "2025-06-18", tenorLabel: "22-Day" });
    expect(excluded[0].reason).toMatch(/one-off/);
    expect(Object.keys(auctions[0].tenors)).toEqual(["3M"]);
  });
  it("a tenor-only excluded auction produces no empty auction record", () => {
    const { auctions, excluded } = parseTBillSheet([tbRow({ no: 701, tenor: "22-Day", auction: "2025-07-01", issue: "2025-07-02" })]);
    expect(auctions).toEqual([]);
    expect(excluded).toHaveLength(1);
  });
  it("the target is kept only from Sep-2019, when SBP started publishing one per tenor", () => {
    const rows = [tbRow({ no: 1, tenor: "3-Month", auction: "2019-08-28", issue: "2019-08-29", target: 600000 }), tbRow({ no: 2, tenor: "3-Month", auction: "2019-09-11", issue: "2019-09-12", target: 300000 })];
    const { auctions } = parseTBillSheet(rows);
    expect(auctions[0].tenors["3M"]?.target).toBeNull();
    expect(auctions[1].tenors["3M"]?.target).toBe(300000);
  });
  it("ignores headers, footnotes and blank rows, and warns about a duplicate tenor row", () => {
    const junk: unknown[][] = [["Auction Number", "Tenure"], [null, null], ["1/- Government started announcing separate targets…"], ["BR ", "Bids Rejected"]];
    const dup = tbRow({ no: 5, tenor: "3-Month", auction: "2024-03-06", issue: "2024-03-07" });
    const { auctions, warnings } = parseTBillSheet([...junk, dup, dup]);
    expect(auctions).toHaveLength(1);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/duplicate/);
  });
  it("a row with no readable issue date is skipped with a warning, not guessed", () => {
    const r = tbRow({ no: 9, tenor: "3-Month", auction: "2024-03-06", issue: "2024-03-07" });
    r[4] = "n/a";
    const { auctions, warnings } = parseTBillSheet([r]);
    expect(auctions).toEqual([]);
    expect(warnings[0]).toMatch(/no readable issue date/);
  });
  it("an empty sheet gives an empty result", () => {
    expect(parseTBillSheet([])).toEqual({ auctions: [], excluded: [], warnings: [] });
  });
});

describe("parsePibSheet", () => {
  it("hand-worked: one record per auction date holding each tenor; settlement date kept; short sale on accepted tenors", () => {
    const rows = [
      pibRow({ type: "Fresh", tenor: "03-Year", auction: "2026-11-04", settle: "2026-11-05", target: 150000, offered: 621230, accC: 157005, accN: 7000, short: 500, cutoff: 0.12638, wa: 0.126208 }),
      pibRow({ tenor: "05-Year", auction: "2026-11-04", settle: "2026-11-05", offered: 437850, accC: 149650, accN: 10276.3, short: 0, cutoff: 0.128000060508658, wa: 0.12760518541775165 }),
    ];
    const { auctions } = parsePibSheet(rows);
    expect(auctions).toHaveLength(1);
    expect(auctions[0]).toMatchObject({ instrument: "pib", auctionNo: null, auctionDate: "2026-11-04", settlementDate: "2026-11-05" });
    expect(auctions[0].tenors["3Y"]).toEqual({ outcome: "accepted", cutoffYield: 12.638, waYield: 12.6208, offered: 621230, acceptedCompetitive: 157005, acceptedNonCompetitive: 7000, acceptedShortSale: 500, target: 150000 });
    expect(auctions[0].tenors["5Y"]).toMatchObject({ cutoffYield: 12.8, waYield: 12.7605, offered: 437850, acceptedCompetitive: 149650 });
  });
  it("a dash means none accepted (yields null); BR means bids rejected; neither is a zero", () => {
    const rows = [
      pibRow({ tenor: "10-Year", auction: "2024-07-09", settle: "2024-07-10", offered: 37250, accC: 0, accN: 0, cutoff: "-", wa: "-" }),
      pibRow({ tenor: "15-Year", auction: "2024-07-09", settle: "2024-07-10", offered: 5000, accC: "BR", accN: null, short: null, cutoff: "BR", wa: "BR" }),
    ];
    const t = parsePibSheet(rows).auctions[0].tenors;
    expect(t["10Y"]).toMatchObject({ outcome: "none-accepted", cutoffYield: null, waYield: null, offered: 37250, acceptedCompetitive: null });
    expect(t["15Y"]).toMatchObject({ outcome: "bids-rejected", cutoffYield: null, offered: 5000 });
    expect(t["10Y"]).not.toHaveProperty("acceptedShortSale");
  });
  it("a tenor outside the grid is excluded with a reason", () => {
    const { auctions, excluded } = parsePibSheet([pibRow({ tenor: "20-Year", auction: "2024-08-01", settle: "2024-08-02" })]);
    expect(auctions).toEqual([]);
    expect(excluded).toHaveLength(1);
    expect(excluded[0].reason).toMatch(/grid/);
  });
  it("sorts auctions by date, ignores non-data rows, warns on duplicates and unreadable settlement dates", () => {
    const a = pibRow({ tenor: "03-Year", auction: "2025-02-12", settle: "2025-02-13" });
    const b = pibRow({ tenor: "03-Year", auction: "2024-12-18", settle: "2024-12-19" });
    const noSettle = pibRow({ tenor: "05-Year", auction: "2025-03-12", settle: "2025-03-13" });
    noSettle[6] = null;
    const { auctions, warnings } = parsePibSheet([["PIB Fixed Auction Wise Data"], a, b, a, noSettle]);
    expect(auctions.map((x) => x.auctionDate)).toEqual(["2024-12-18", "2025-02-12"]);
    expect(warnings.some((w) => /duplicate/.test(w))).toBe(true);
    expect(warnings.some((w) => /no readable settlement date/.test(w))).toBe(true);
  });
});
