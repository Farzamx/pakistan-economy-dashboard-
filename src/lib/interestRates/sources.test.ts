// Unit tests of the source parsers on small hand-made inputs: every rule in sources.ts has a test that would fail if the rule were broken.

import { describe, expect, it } from "vitest";
import {
  LD_VARIANTS,
  excelSerialToIso,
  fractionToPercent,
  lendingPdf,
  ldEntity,
  parseCsv,
  parseDayMonthYear,
  parseLendingWorkbook,
  parseMonthLabel,
  parseOmoSheet,
  readEasyDataCsv,
  sirBankRates,
  sirPage2,
  sirPibTable,
  sirPolicyTable,
  usableObservations,
  type SheetRows,
} from "./sources";

describe("labels and dates", () => {
  it.each([
    ["Jan-2004", "2004-01", ""],
    ["Jan - 11 ***", "2011-01", ""],
    ["Arpil - 19", "2019-04", ""],
    ["Oct-26 P", "2026-10", "P"],
    ["Aug-26 R", "2026-08", "R"],
    ["Jun-17", "2017-06", ""],
  ])("month label %s -> %s %s", (label, period, flag) => {
    expect(parseMonthLabel(label)).toEqual({ period, flag });
  });

  it("rejects text that is not a month label", () => {
    expect(parseMonthLabel("1. Scheduled Banks")).toBeNull();
    expect(parseMonthLabel("Contact Person")).toBeNull();
  });

  it("reads SBP's d-Mon-yy dates and Excel serial dates", () => {
    expect(parseDayMonthYear("27-Oct-26")).toBe("2026-10-27");
    expect(parseDayMonthYear("5-Apr-23")).toBe("2023-04-05");
    expect(excelSerialToIso(39592)).toBe("2008-05-24");
    expect(excelSerialToIso("39592")).toBeNull();
  });
});

describe("EasyData CSV", () => {
  const csv = [
    "series_key,series_name,unit,observation_date,observation_value,observation_status,status_comments",
    "A.X,\"Name, with comma\",Percent,2024-01-02,12.5,Normal,",
    "A.X,\"Name, with comma\",Percent,2024-01-09,,Missing value,",
    "A.X,\"Name, with comma\",Percent,2024-01-16,11.9,Missing value,20251105",
    "A.X,\"Name, with comma\",Percent,2024-01-23,.1215,Normal,",
  ].join("\n");

  it("parses quoted fields", () => {
    expect(parseCsv('a,"b,c","d""e"\n')).toEqual([["a", "b,c", 'd"e']]);
  });

  it("groups by series and keeps every raw value", () => {
    const s = readEasyDataCsv(csv).get("A.X")!;
    expect(s.name).toBe("Name, with comma");
    expect(s.observations.map((o) => o.raw)).toEqual(["12.5", "", "11.9", ".1215"]);
  });

  it("rejects a CSV whose header is not the documented one", () => {
    expect(() => readEasyDataCsv("a,b\n1,2\n")).toThrow(/header/);
  });

  it("uses only Normal numeric values; a value printed beside 'Missing value' is missing and reported; a listed implausible value is excluded with its reason", () => {
    const s = readEasyDataCsv(csv).get("A.X")!;
    const u = usableObservations(s, [{ date: "2024-01-23", reason: "scale error" }]);
    expect([...u.values.entries()]).toEqual([["2024-01-02", 12.5]]);
    expect(u.excluded.map((e) => [e.date, e.raw])).toEqual([["2024-01-16", "11.9"], ["2024-01-23", ".1215"]]);
    expect(u.excluded[1].reason).toBe("scale error");
  });

  it("never turns a missing value into zero", () => {
    const u = usableObservations(readEasyDataCsv(csv).get("A.X")!);
    expect(u.values.has("2024-01-09")).toBe(false);
    expect([...u.values.values()]).not.toContain(0);
  });

  it("throws on two values for one date", () => {
    const dup = csv.split("\n").slice(0, 2).join("\n") + "\nA.X,n,Percent,2024-01-02,12.6,Normal,\n";
    expect(() => usableObservations(readEasyDataCsv(dup).get("A.X")!)).toThrow(/two observations/);
  });
});

describe("lending/deposit workbook", () => {
  const early: SheetRows = [
    ["title"], [], ["PERIOD"], [], [], [],
    ["1997*", "Jun.", null, null, null, null, null, null, null, null, null, null, 16.91, "-"],
    [null, "Dec.", null, null, null, null, null, null, null, null, null, null, 16.62, "-"],
    [2001, "Dec.", null, null, null, null, null, null, null, null, null, null, 13.4, 4.96],
    [2001, "Nov", null, null, null, null, null, null, null, null, null, null, 14.1, 5],
    [null, "Dec", null, null, null, null, null, null, null, null, null, null, 13.4, 4.96],
  ];
  const r2: SheetRows = [["t"], [], [], [], [], ["Jan-2004", null, " "], [null, "Public", 1, 2, 3, 4, 5, 6, 7, 8], [null, "All Banks", 5.04, 5.13, 6.91, 7.71, 1.12, 1.4, 1.34, 1.7]];
  const r3: SheetRows = [["t"], [], [], [], [], [], ["Jan - 11 ***"], [null, "Specialised", ...Array(16).fill(1)], [null, "All Banks", ...Array.from({ length: 16 }, (_, i) => 10 + i)]];
  const r4: SheetRows = [
    ["t"],
    ["Oct-26 P", "1. Scheduled Banks", ...Array.from({ length: 16 }, (_, i) => 20 + i)],
    ["", "2. Public", ...Array(16).fill(1)],
    ["", "8. Overall(SBs,MFBs,DFIs)", ...Array.from({ length: 16 }, (_, i) => 40 + i)],
  ];
  const book = { "(Jan_97-Dec_2003": early, "Jan_2004-Dec_2010": r2, "(Jan_11-Jun_22": r3, "Jul-22-to Onwards": r4 };

  it("regime 1: half-yearly then monthly; '-' is missing; the repeated Dec 2001 is kept once", () => {
    const p = parseLendingWorkbook(book);
    expect(p.early).toEqual([
      { period: "1997-06", frequency: "half-yearly", lending: 16.91, deposit: null },
      { period: "1997-12", frequency: "half-yearly", lending: 16.62, deposit: null },
      { period: "2001-12", frequency: "half-yearly", lending: 13.4, deposit: 4.96 },
      { period: "2001-11", frequency: "monthly", lending: 14.1, deposit: 5 },
    ]);
  });

  it("regime 2 values go to the inclusive-inter-bank slots; exclusive slots are null (no split existed)", () => {
    const row = parseLendingWorkbook(book).monthly.find((r) => r.period === "2004-01")!;
    expect(row).toMatchObject({ entity: "SB", regime: 2, flag: "" });
    expect(row.values[LD_VARIANTS.indexOf("grossDisbursements.inclZero.inclInter")]).toBe(5.04);
    expect(row.values[LD_VARIANTS.indexOf("grossDisbursements.exclZero.inclInter")]).toBe(5.13);
    expect(row.values[LD_VARIANTS.indexOf("outstandingDeposits.exclZero.inclInter")]).toBe(1.7);
    expect(row.values.filter((_, i) => LD_VARIANTS[i].endsWith("exclInter")).every((v) => v === null)).toBe(true);
  });

  it("regimes 3 and 4 keep all 16 values in order; bank groups are not stored; the provisional flag is kept; the renamed all-FI row is recognised", () => {
    const p = parseLendingWorkbook(book);
    expect(p.monthly.find((r) => r.period === "2011-01")!.values).toEqual(Array.from({ length: 16 }, (_, i) => 10 + i));
    const oct = p.monthly.filter((r) => r.period === "2026-10");
    expect(oct.map((r) => [r.entity, r.regime, r.flag, r.values[0]])).toEqual([["FI", 4, "P", 40], ["SB", 4, "P", 20]]);
    expect(p.warnings).toEqual([]);
  });

  it("aggregate labels", () => {
    expect(ldEntity("All Banks")).toBe("SB");
    expect(ldEntity("1. Scheduled Banks")).toBe("SB");
    expect(ldEntity("All Financial Institutions")).toBe("FI");
    expect(ldEntity("8. Overall(SBs,MFBs,DFIs)")).toBe("FI");
    expect(ldEntity("1.1. Public")).toBeNull();
  });
});

describe("OMO sheets and the unit conversion", () => {
  const head = (low: string, high: string): SheetRows => [
    [null, "Date", "Type", "Tenor", "Amount ", "No of Bids", "Range of Quotes", null, "Amount ", "No of Bids", "Cut-Off"],
    [null, null, null, "(Days)", "Offered", "Offered", low, high, "Accepted", "Accepted"],
  ];
  const inj: SheetRows = [
    ...head("High", "Low"),
    [null, 39569],
    [null, 39592, "Reverse Repo ", 3, 36150, null, null, null, 23450, null, 0.1161],
    [null, 46346, "Reverse Repo ", 14, 12834000, 37, 12.09, 12, 12400000, 36, 0.1201],
    [null, 39600, "Reverse Repo ", 7, 6100, null, null, null, "Bids Rejected", null, null],
    [null, 39601, "Reverse Repo ", "13*", 500, null, null, null, 500, null, 0.12],
  ];

  it("converts the fraction to percent without binary noise", () => {
    expect(fractionToPercent(0.1161)).toBe(11.61);
    expect(fractionToPercent(0.1201)).toBe(12.01);
    expect(fractionToPercent(0.1295)).toBe(12.95);
  });

  it("reads injections: High/Low order is normalised to low/high; the converted cut-off sits inside the quotes", () => {
    const p = parseOmoSheet(inj, "injection");
    const o = p.operations.find((x) => x.tenorDays === 14)!;
    expect([o.quoteLow, o.quoteHigh, o.cutoffPct, o.cutoffRaw]).toEqual([12, 12.09, 12.01, 0.1201]);
    expect(o.cutoffPct!).toBeGreaterThanOrEqual(o.quoteLow!);
    expect(o.cutoffPct!).toBeLessThanOrEqual(o.quoteHigh!);
  });

  it("month separator rows are skipped; a rejected operation has no cut-off and outcome BR; a footnoted tenor keeps its note", () => {
    const p = parseOmoSheet(inj, "injection");
    expect(p.operations).toHaveLength(4);
    expect(p.operations.find((x) => x.date === "2008-06-01")).toMatchObject({ outcome: "BR", cutoffPct: null, accepted: null });
    expect(p.operations.find((x) => x.tenorNote === "13*")).toMatchObject({ tenorDays: 13, outcome: "A" });
  });

  it("reads mop-ups with Low/High order", () => {
    const mop: SheetRows = [...head("Low", "High"), [null, 45657, "Repo ", 3, 460000, 2, 12.9, 12.95, 460000, 2, 0.1295]];
    expect(parseOmoSheet(mop, "mopup").operations[0]).toMatchObject({ side: "mopup", quoteLow: 12.9, quoteHigh: 12.95, cutoffPct: 12.95 });
  });

  it("stops when the quote columns are not in the expected order (a layout change)", () => {
    expect(() => parseOmoSheet(inj, "mopup")).toThrow(/quote-range columns/);
  });

  it("stops when a cut-off is already in percent: the unit assumption would no longer hold", () => {
    const bad: SheetRows = [...head("High", "Low"), [null, 46346, "Reverse Repo ", 7, 1, 1, 12.1, 12, 1, 1, 12.01]];
    expect(() => parseOmoSheet(bad, "injection")).toThrow(/not a fraction/);
  });
});

describe("SBP PDF extracts", () => {
  it("policy table I", () => {
    const page = "w.e.f. Rate w.e.f. Rate\n27-Oct-26 13.00 11.00 12.00 10.50 27-Oct-26 9.00 Nov-26 2.90\n27-Oct-26\nUpto 3 years";
    expect(sirPolicyTable(page)).toEqual([{ date: "2026-10-27", reverseRepo: 13, repo: 11, target: 12 }]);
  });

  it("page II: T-bill auctions with NA, KIBOR monthly averages and daily rates", () => {
    const page = [
      "Date 1-m 3-m 6-m 12-m 1-m 3-m 6-m 12-m Date 1-m 3-m 6-m",
      "5-Mar-25 NA 11.82 11.67 11.64 NA 11.70 11.64 11.58 Oct-25 11.39 11.16 11.18",
      "11-Nov-26 11.88 12.00 12.19 12.41 11.88 11.99 12.19 12.40 13-Nov-26 12.42 12.28 12.44",
      "12-Oct-26 11.96 12.01 12.42",
    ].join("\n");
    const p = sirPage2(page);
    expect(p.tbills[0]).toEqual({ date: "2025-03-05", cutoff: { "1M": null, "3M": 11.82, "6M": 11.67, "12M": 11.64 }, wa: { "1M": null, "3M": 11.7, "6M": 11.64, "12M": 11.58 } });
    expect(p.kibor).toEqual([
      { period: "2025-10", kind: "monthly-average", k1M: 11.39, k3M: 11.16, k6M: 11.18 },
      { period: "2026-11-13", kind: "daily", k1M: 12.42, k3M: 12.28, k6M: 12.44 },
      { period: "2026-10-12", kind: "daily", k1M: 11.96, k3M: 12.01, k6M: 12.42 },
    ]);
  });

  it("page III PIB table: R and N are missing, not zero", () => {
    const rows = sirPibTable("18-Oct-24 13.24 12.50 12.79 12.98 NA NA NA 13.23 12.43 12.74 12.90 NA NA NA\n9-Jul-24 NA 16.60 15.45 R NA NA NA NA 16.47 15.41 R NA NA NA");
    expect(rows[0].cutoff).toEqual([13.24, 12.5, 12.79, 12.98, null, null, null]);
    expect(rows[1].cutoff[3]).toBeNull();
  });

  it("page VI bank rates", () => {
    expect(sirBankRates("Sep-26 11.89 11.57 4.29 5.53 Sep-26 4.33 4.07 1.48 1.91 Sep-24 4.90")).toEqual([{ period: "2026-09", lendingNew: 11.89, lendingOutstanding: 11.57, depositNew: 4.29, depositOutstanding: 5.53 }]);
  });

  it("the monthly lending/deposit release: three months, scheduled banks and all FIs, 16 values each", () => {
    const n = (s: number) => Array.from({ length: 16 }, (_, i) => (s + i).toFixed(2)).join(" ");
    const text = [`Oct-26 P 1. Scheduled Banks ${n(1)}`, `1.1. Public ${n(50)}`, `All Financial Institutions ${n(2)}`, `Sep-26 1. Scheduled Banks ${n(3)}`, `All Financial Institutions ${n(4)}`].join("\n");
    const m = lendingPdf(text);
    expect(m.map((x) => [x.period, x.flag, x.rows.SB[0], x.rows.FI[15]])).toEqual([["2026-10", "P", 1, 17], ["2026-09", "", 3, 19]]);
  });
});
