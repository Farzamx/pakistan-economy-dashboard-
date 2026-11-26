// Dataset decoding, the source hierarchy, every derived indicator and the analytics, on the real committed data with hand-checked values.

import { describe, expect, it } from "vitest";
import { change, comparePeriods, lagCorrelations, pearson, strength, summarize } from "./analytics";
import {
  LD_HEADLINE,
  SBP_PIB_FROM,
  SBP_TBILL_FROM,
  TARGET_RATE_FROM,
  cpiYoy,
  kiborDaily,
  kiborMonthly,
  ldEarly,
  ldSeries,
  omoOperations,
  pibSeries,
  policyRateRecords,
  tbillSeries,
} from "./dataset";
import { corridor, lendingDepositSpread, orrMinusPolicy, policyMinusKibor, policyMinusTbill, realKibor, realPolicyRate, realRate, termSpread } from "./derived";
import { monthRange, monthlyMeans, rateAtMonthEnd, rateInForce, round } from "./series";
import { KIBOR_TENORS } from "./types";

describe("series primitives", () => {
  const ev = [["2020-01-10", 10], ["2020-03-05", 12]] as const;
  it("the value in force is the last one set on or before the date; nothing before the first", () => {
    expect(rateInForce(ev, "2020-01-09")).toBeNull();
    expect(rateInForce(ev, "2020-01-10")).toBe(10);
    expect(rateInForce(ev, "2020-03-04")).toBe(10);
    expect(rateInForce(ev, "2021-01-01")).toBe(12);
    expect(rateAtMonthEnd(ev, "2020-02")).toBe(10);
    expect(rateAtMonthEnd(ev, "2020-03")).toBe(12);
  });
  it("monthly means use only observed days and report their count; an empty month is absent, not zero", () => {
    expect(monthlyMeans([["2020-01-02", 10], ["2020-01-03", 11], ["2020-01-06", null], ["2020-03-02", 9]])).toEqual([{ month: "2020-01", mean: 10.5, days: 2 }, { month: "2020-03", mean: 9, days: 1 }]);
  });
  it("month ranges and rounding", () => {
    expect(monthRange("2019-11", "2020-02")).toEqual(["2019-11", "2019-12", "2020-01", "2020-02"]);
    expect(round(11.045, 2)).toBe(11.05);
    expect(round(11.0448, 2)).toBe(11.04);
  });
});

describe("policy rates: definitions by period", () => {
  const recs = policyRateRecords();
  it("is the reverse repo rate until 24 May 2015 and the target rate from 25 May 2015, each record naming its instrument", () => {
    expect(recs.filter((r) => r.date < TARGET_RATE_FROM).every((r) => r.instrument === "reverse-repo")).toBe(true);
    expect(recs.filter((r) => r.date >= TARGET_RATE_FROM).every((r) => r.instrument === "target")).toBe(true);
    expect(recs.find((r) => r.instrument === "target")).toEqual({ date: "2015-05-25", value: 6.5, instrument: "target" });
  });
  it("the latest record: 12% from 26 Oct 2026 (SBP's own table says w.e.f. 27 Oct; reported in the validation report)", () => {
    expect(recs.at(-1)).toEqual({ date: "2026-10-26", value: 12, instrument: "target" });
  });
  it("the corridor is ±100 bp around the target since 2015 decisions; width 2 pp now", () => {
    const c = corridor();
    expect(c[0].date).toBe("2009-08-17");
    expect(c.at(-1)).toMatchObject({ ceiling: 13, floor: 11, target: 12, width: 2 });
  });
});

describe("KIBOR", () => {
  it("has the seven current tenors to 25 Nov 2026; 2Y and 3Y stop at their discontinuation", () => {
    for (const t of KIBOR_TENORS.slice(0, 7)) expect(kiborDaily(t).at(-1)![0]).toBe("2026-11-25");
    expect(kiborDaily("2Y").at(-1)![0]).toBe("2020-02-04");
    expect(kiborDaily("3Y").at(-1)![0]).toBe("2020-02-04");
  });
  it("monthly averages carry their day count (Oct 2026 has 20 fixings in EasyData; SBP's PDF shows 2 more days)", () => {
    expect(kiborMonthly("3M").find((m) => m.month === "2026-10")!.days).toBe(20);
  });
});

describe("auction yields: the approved source hierarchy", () => {
  it("T-bills come from EasyData before SBP's detailed file starts and from the file after; the newest auction is 25 Nov 2026", () => {
    const s = tbillSeries("3M", "cutoff");
    expect(s.filter((p) => p.date < SBP_TBILL_FROM).every((p) => p.source === "SBP EasyData")).toBe(true);
    expect(s.filter((p) => p.date >= SBP_TBILL_FROM).every((p) => p.source === "SBP auction file")).toBe(true);
    expect(s.at(-1)!.date).toBe("2026-11-25");
    expect(s[0].source).toBe("SBP EasyData");
    expect(s[0].date < "2005-01-01").toBe(true);
  });
  it("cut-off and weighted-average series are separate and the cut-off is never below the weighted average in the SBP file", () => {
    const c = new Map(tbillSeries("6M", "cutoff").filter((p) => p.source === "SBP auction file").map((p) => [p.date, p.value]));
    for (const w of tbillSeries("6M", "wa").filter((p) => p.source === "SBP auction file")) if (c.has(w.date)) expect(c.get(w.date)!).toBeGreaterThanOrEqual(w.value - 1e-9);
  });
  it("the 1-month bill exists only in the SBP file; the 2-year PIB comes from the SBP file from its start", () => {
    expect(tbillSeries("1M", "cutoff").every((p) => p.source === "SBP auction file")).toBe(true);
    const two = pibSeries("2Y", "cutoff");
    expect(two.every((p) => p.date >= SBP_PIB_FROM && p.source === "SBP auction file")).toBe(true);
    expect(two.length).toBeGreaterThan(5);
  });
  it("7-, 20- and 30-year PIBs are EasyData only; the 30-year weighted average does not exist", () => {
    expect(pibSeries("20Y", "cutoff").every((p) => p.source === "SBP EasyData")).toBe(true);
    expect(pibSeries("30Y", "wa")).toEqual([]);
  });
  it("no yield is zero anywhere", () => {
    for (const t of ["1M", "3M", "6M", "12M"] as const) for (const k of ["cutoff", "wa"] as const) expect(tbillSeries(t, k).some((p) => p.value === 0)).toBe(false);
  });
});

describe("lending and deposit rates", () => {
  const lend = ldSeries({ ...LD_HEADLINE, measure: "grossDisbursements" });
  it("the headline series runs Jan 2004 - Oct 2026, Oct 2026 provisional, with regimes 2, 3 and 4 in order", () => {
    expect(lend[0].period).toBe("2004-01");
    expect(lend.at(-1)).toMatchObject({ period: "2026-10", flag: "P", regime: 4 });
    expect(lend.find((p) => p.period === "2010-12")!.regime).toBe(2);
    expect(lend.find((p) => p.period === "2011-01")!.regime).toBe(3);
    expect(lend.find((p) => p.period === "2022-07")!.regime).toBe(4);
  });
  it("Oct 2026 matches SBP's monthly release (scheduled banks, incl. zero mark-up, incl. inter-FI): new lending 12.33, fresh deposits 4.30", () => {
    expect(round(lend.at(-1)!.value, 2)).toBe(12.33);
    expect(round(ldSeries({ ...LD_HEADLINE, measure: "freshDeposits" }).at(-1)!.value, 2)).toBe(4.3);
  });
  it("excluding inter-bank exists only from Jan 2011; all-FI only from Jul 2022", () => {
    expect(ldSeries({ ...LD_HEADLINE, interbank: "excl", measure: "outstandingLoans" })[0].period).toBe("2011-01");
    expect(ldSeries({ ...LD_HEADLINE, entity: "FI", measure: "outstandingLoans" })[0].period).toBe("2022-07");
  });
  it("the spread is lending minus deposit on the same basis and month", () => {
    const s = lendingDepositSpread("new", LD_HEADLINE).at(-1)!;
    expect(s.period).toBe("2026-10");
    expect(s.spread).toBeCloseTo(s.lending - s.deposit, 12);
    expect(round(s.spread, 2)).toBe(8.03);
  });
  it("the 1997-2003 compilation stays separate", () => {
    expect(ldEarly()[0]).toEqual({ period: "1997-06", frequency: "half-yearly", lending: 16.91, deposit: null });
    expect(ldEarly().at(-1)).toEqual({ period: "2003-12", frequency: "monthly", lending: 5.68, deposit: 1.42 });
  });
});

describe("OMO", () => {
  it("cut-offs are in percent; the latest injection on 20 Nov 2026 cleared at 12.01%", () => {
    const ops = omoOperations();
    expect(ops.filter((o) => o.cutoffPct !== null).every((o) => o.cutoffPct! > 1 && o.cutoffPct! < 40)).toBe(true);
    const last = ops.filter((o) => o.side === "injection").at(-1)!;
    expect(last).toMatchObject({ date: "2026-11-20", cutoffPct: 12.01 });
  });
});

describe("derived indicators", () => {
  it("the real rate is the exact (Fisher) relation used across the page, not the simple difference", () => {
    expect(realRate(12, 9.6)).toBeCloseTo((1.12 / 1.096 - 1) * 100, 12);
    expect(round(realRate(12, 9.6), 2)).toBe(2.19);
    expect(round(realRate(21, 38), 2)).toBe(-12.32);
  });
  it("real policy rate for Oct 2026: policy 12%, CPI 9.6% -> 2.19; it starts with CPI in Jul 2016", () => {
    const r = realPolicyRate();
    expect(r[0].month).toBe("2016-07");
    const oct = r.find((x) => x.month === "2026-10")!;
    expect([oct.nominal, oct.inflation]).toEqual([12, 9.6]);
    expect(round(oct.real, 2)).toBe(2.19);
    expect(r.length).toBe(cpiYoy().length);
  });
  it("real KIBOR uses the month's mean fixing and reports the day count", () => {
    const k = realKibor("6M").find((x) => x.month === "2026-10")!;
    const m = kiborMonthly("6M").find((x) => x.month === "2026-10")!;
    expect(k.nominal).toBe(m.mean);
    expect(k.days).toBe(m.days);
    expect(k.real).toBeCloseTo(realRate(m.mean, 9.6), 10);
  });
  it("policy minus 6M KIBOR on 25 Nov 2026 = 12 - fixing", () => {
    const last = policyMinusKibor("6M").at(-1)!;
    expect(last.date).toBe("2026-11-25");
    expect(last.value).toBeCloseTo(12 - kiborDaily("6M").at(-1)![1], 10);
  });
  it("policy minus 3M T-bill uses the rate in force on each auction date", () => {
    const last = policyMinusTbill("3M").at(-1)!;
    expect(last.date).toBe("2026-11-25");
    expect(last.value).toBeCloseTo(12 - tbillSeries("3M", "cutoff").at(-1)!.value, 10);
  });
  it("term spreads pair auctions at most 7 days apart", () => {
    for (const t of termSpread()) expect(t.spread).toBeCloseTo(t.long - t.short, 10);
    expect(termSpread().length).toBeGreaterThan(50);
  });
  it("overnight repo relative to the policy rate exists for every ORR day", () => {
    expect(orrMinusPolicy().length).toBe(2797);
  });
});

describe("analytics", () => {
  it("summary statistics carry dates and n", () => {
    const s = summarize([{ date: "a", value: 2 }, { date: "b", value: 5 }, { date: "c", value: 1 }])!;
    expect(s).toMatchObject({ n: 3, mean: 8 / 3, min: { date: "c", value: 1 }, max: { date: "b", value: 5 }, latest: { date: "c", value: 1 } });
    expect(summarize([])).toBeNull();
  });
  it("periods include the whole bounding month", () => {
    const r = comparePeriods([{ date: "2020-01-31", value: 1 }, { date: "2020-02-01", value: 3 }], [{ id: "p", label: "Jan", from: "2020-01", to: "2020-01", definition: "" }]);
    expect(r[0].stats!.n).toBe(1);
  });
  it("changes in pp and bp", () => {
    expect(change(11.5, 12)).toEqual({ pp: 0.5, bp: 50 });
    expect(change(22, 12).bp).toBe(-1000);
  });
  it("pearson: perfect, none, and too few pairs", () => {
    expect(pearson([[1, 2], [2, 4], [3, 6]]).r).toBeCloseTo(1, 12);
    expect(pearson([[1, 1], [2, 1], [3, 1]]).r).toBeNull();
    expect(pearson([[1, 2], [2, 3]])).toEqual({ r: null, n: 2 });
  });
  it("lag correlations pair x(t) with y(t+lag) and refuse non-monthly keys", () => {
    const x = new Map([["2020-01", 1], ["2020-02", 2], ["2020-03", 3], ["2020-04", 4]]);
    const y = new Map([["2020-02", 10], ["2020-03", 20], ["2020-04", 30], ["2020-05", 40]]);
    const [l0, l1] = lagCorrelations(x, y, [0, 1]);
    expect(l0.n).toBe(3);
    expect(l1).toMatchObject({ lag: 1, n: 4 });
    expect(l1.r).toBeCloseTo(1, 12);
    expect(() => lagCorrelations(new Map([["2020-01-05", 1]]), y)).toThrow(/monthly/);
  });
  it("strength labels are descriptive", () => {
    expect(strength(0.85)).toBe("very strong positive");
    expect(strength(-0.45)).toBe("moderate negative");
    expect(strength(null)).toBe("not computable");
  });
});
