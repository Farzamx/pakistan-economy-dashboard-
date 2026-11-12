import { describe, expect, it } from "vitest";
import { BUDGET_HISTORICAL, type BudgetYearRecord } from "@/data/budgetHistorical";
import { BUDGET_NOMINAL_GDP, getStatedNominalGdp } from "@/data/budgetNominalGdp";
import {
  checkDatasetConsistency,
  generateBudgetInsights,
  getAllFiscalYears,
  getAllocationBreakdown,
  getAllocationDetail,
  getBudgetEnvelope,
  getCagr,
  getCategorySummary,
  getCategoryTrendSeries,
  getDebtServicingShare,
  getImpliedNominalGdp,
  getNominalGdp,
  getRs100Breakdown,
  getYearRecord,
  getYoyChange,
  isFieldAvailableInMode,
  sliceYears,
} from "./budgetData";

const years = BUDGET_HISTORICAL.years;
const y = (fy: string) => getYearRecord(fy) as BudgetYearRecord;

// A synthetic year with hand-worked numbers, so the arithmetic is checked independently of the real dataset.
const synth = (over: Partial<BudgetYearRecord> = {}): BudgetYearRecord => ({
  ...years[years.length - 1],
  fiscalYear: "2099-00",
  totalOutlay: 1000,
  provincialTransfer: 500,
  debtServicing: 300,
  defence: 150,
  federalPsdp: 100,
  subsidies: 50,
  pension: 100,
  fbrTaxRevenue: 900,
  fiscalDeficitRs: 360,
  fiscalDeficitPctGdp: 3.6,
  ...over,
});

describe("dataset invariants", () => {
  it("covers 17 consecutive fiscal years FY2010-11 to FY2026-27, all Budget Estimates", () => {
    expect(getAllFiscalYears()).toHaveLength(17);
    expect(getAllFiscalYears()[0]).toBe("2010-11");
    expect(getAllFiscalYears()[16]).toBe("2026-27");
    years.forEach((r, i) => {
      if (i === 0) return;
      const prevStart = Number(years[i - 1].fiscalYear.slice(0, 4));
      expect(Number(r.fiscalYear.slice(0, 4))).toBe(prevStart + 1);
    });
    for (const r of years) expect(r.estimateType).toBe("BE");
  });

  it("cites an official finance.gov.pk document and tables for every year", () => {
    for (const r of years) {
      expect(r.citations.budgetInBrief.url).toMatch(/^https:\/\/(www\.)?finance\.gov\.pk\//);
      expect(r.citations.budgetInBrief.document.length).toBeGreaterThan(5);
      expect(r.citations.budgetInBrief.tables.length).toBeGreaterThan(0);
    }
  });

  it("allows nulls only for interest, pension and grants, and only in FY2010-11", () => {
    const nullable: (keyof BudgetYearRecord)[] = ["debtServicing", "pension", "grantsAndTransfersOther"];
    for (const r of years) {
      for (const [k, v] of Object.entries(r)) {
        if (v === null) {
          expect(nullable).toContain(k);
          expect(r.fiscalYear).toBe("2010-11");
        }
      }
    }
    expect(y("2010-11").debtServicing).toBeNull();
    expect(y("2011-12").debtServicing).not.toBeNull();
  });

  it("every itemised component is no larger than total outlay and every residual is non-negative", () => {
    const bad = checkDatasetConsistency().filter((f) => (f.check === "components-within-outlay" || f.check === "residual-non-negative") && !f.ok);
    expect(bad).toEqual([]);
  });

  it("deficit ÷ stated GDP agrees with the printed deficit % of GDP within its rounding (0.1 pp) in every year with a stated GDP", () => {
    expect(BUDGET_NOMINAL_GDP.length).toBe(8);
    for (const g of BUDGET_NOMINAL_GDP) {
      const r = y(g.fiscalYear);
      expect(r).toBeDefined();
      expect(Math.abs((r.fiscalDeficitRs / g.valueRsBn) * 100 - r.fiscalDeficitPctGdp)).toBeLessThanOrEqual(0.1);
      expect(g.document).toMatch(/Budget in Brief/);
    }
    const bad = checkDatasetConsistency().filter((f) => f.check === "deficit-vs-stated-gdp" && !f.ok);
    expect(bad).toEqual([]);
  });

  it("implied GDP is within 1.5% of the stated GDP wherever both exist", () => {
    const bad = checkDatasetConsistency().filter((f) => f.check === "implied-vs-stated-gdp" && !f.ok);
    expect(bad).toEqual([]);
  });
});

describe("GDP basis", () => {
  it("uses the stated figure where Budget in Brief prints one, and labels the rest implied", () => {
    expect(getNominalGdp(y("2026-27"))).toEqual({ value: 143604, basis: "stated" });
    expect(getNominalGdp(y("2019-20"))).toEqual({ value: 44003, basis: "stated" });
    const old = getNominalGdp(y("2012-13"));
    expect(old.basis).toBe("implied");
    expect(old.value).toBeCloseTo(getImpliedNominalGdp(y("2012-13")), 6);
    expect(getStatedNominalGdp("2012-13")).toBeUndefined();
  });

  it("implied GDP is deficit ÷ (pct/100): 360 ÷ 0.036 = 10,000", () => {
    expect(getImpliedNominalGdp(synth())).toBeCloseTo(10000, 6);
  });
});

describe("envelope and allocation breakdown", () => {
  it("envelope = total outlay + provincial transfer (1,500 for the synthetic year)", () => {
    expect(getBudgetEnvelope(synth())).toBe(1500);
  });

  it("hand-worked breakdown: named slices, residual and percentages of the envelope", () => {
    const d = getAllocationDetail(synth());
    // named = 300 + 150 + 100 + 50 + 500 + 100 = 1,200 → residual 300 of 1,500
    expect(d.partial).toBe(false);
    expect(d.discrepancies).toEqual([]);
    const byLabel = Object.fromEntries(d.slices.map((s) => [s.label, s]));
    expect(byLabel["Debt Servicing"].pct).toBeCloseTo(20, 9);
    expect(byLabel["Provincial Transfers"].pct).toBeCloseTo((500 / 1500) * 100, 9);
    expect(byLabel.Other.value).toBe(300);
    expect(byLabel.Other.kind).toBe("residual");
    expect(d.slices.reduce((s, x) => s + x.value, 0)).toBeCloseTo(1500, 9);
    expect(d.slices.reduce((s, x) => s + x.pct, 0)).toBeCloseTo(100, 9);
  });

  it("every real complete year reconciles: slices sum to the envelope and percentages to 100", () => {
    for (const r of years.filter((x) => x.debtServicing !== null && x.pension !== null)) {
      const d = getAllocationDetail(r);
      expect(d.discrepancies).toEqual([]);
      expect(d.slices.reduce((s, x) => s + x.value, 0)).toBeCloseTo(getBudgetEnvelope(r), 6);
      expect(d.slices.reduce((s, x) => s + x.pct, 0)).toBeCloseTo(100, 6);
      expect(d.slices.every((s) => s.value >= 0)).toBe(true);
    }
  });

  it("FY2026-27 residual equals the four items Budget in Brief lists beside the named slices (2,680 + 1,071 + 276 + 430 = 4,457)", () => {
    const other = getAllocationDetail(y("2026-27")).slices.find((s) => s.label === "Other");
    expect(other?.value).toBeCloseTo(4457, 6);
  });

  it("FY2010-11 does not show interest or pension as zero: one bundled slice, flagged partial", () => {
    const d = getAllocationDetail(y("2010-11"));
    expect(d.partial).toBe(true);
    expect(d.slices.map((s) => s.label)).not.toContain("Debt Servicing");
    expect(d.slices.map((s) => s.label)).not.toContain("Pension");
    const bundled = d.slices.find((s) => s.kind === "bundled");
    expect(bundled?.label).toMatch(/not itemised/i);
    expect(d.notes.join(" ")).toMatch(/does not itemise/);
    expect(d.slices.reduce((s, x) => s + x.pct, 0)).toBeCloseTo(100, 6);
  });

  it("a negative residual is reported as a discrepancy, not clamped to zero", () => {
    const d = getAllocationDetail(synth({ debtServicing: 1400 }));
    expect(d.discrepancies).toHaveLength(1);
    expect(d.discrepancies[0]).toMatch(/exceed the budget envelope/);
    expect(d.slices.find((s) => s.kind === "residual")).toBeUndefined();
  });

  it("getAllocationBreakdown returns the same slices as getAllocationDetail", () => {
    expect(getAllocationBreakdown(y("2025-26"))).toEqual(getAllocationDetail(y("2025-26")).slices);
  });
});

describe("Rs100 breakdown", () => {
  it("sums to exactly 100 in every year, with rounding residue in the residual/bundled slice", () => {
    for (const r of years) {
      const s = getRs100Breakdown(r);
      expect(s.reduce((a, x) => a + x.rsPerHundred, 0)).toBe(100);
      expect(s.every((x) => Number.isInteger(x.rsPerHundred))).toBe(true);
    }
  });

  it("hand-worked: 20/10/6.67/3.33/33.33/6.67 + 20 → 20, 10, 7, 3, 33, 7, 20", () => {
    const rs = getRs100Breakdown(synth());
    expect(Object.fromEntries(rs.map((x) => [x.label, x.rsPerHundred]))).toEqual({
      "Debt Servicing": 20,
      Defence: 10,
      Development: 7,
      Subsidies: 3,
      "Provincial Transfers": 33,
      Pension: 7,
      Other: 20,
    });
  });
});

describe("year over year and CAGR", () => {
  it("hand-worked YoY: 1,000 → 1,100 is +100, +10%, up", () => {
    const a = synth({ totalOutlay: 1000 });
    const b = synth({ totalOutlay: 1100 });
    const c = getYoyChange("totalOutlay", b, a);
    expect(c).toEqual({ absolute: 100, pct: 10, direction: "up" });
  });

  it("returns null, not a number, when either year's figure is missing or the base is zero", () => {
    expect(getYoyChange("debtServicing", y("2011-12"), y("2010-11"))).toBeNull();
    expect(getYoyChange("totalOutlay", y("2011-12"), undefined)).toBeNull();
    expect(getYoyChange("totalOutlay", synth(), synth({ totalOutlay: 0 }))).toBeNull();
  });

  it("CAGR: 100 → 400 over 2 steps is exactly 100%", () => {
    const series = [synth({ fiscalYear: "2020-21", defence: 100 }), synth({ fiscalYear: "2021-22", defence: 200 }), synth({ fiscalYear: "2022-23", defence: 400 })];
    const c = getCagr("defence", series);
    expect(c?.pct).toBeCloseTo(100, 9);
    expect(c?.steps).toBe(2);
    expect(c?.fromFy).toBe("2020-21");
  });

  it("CAGR is null when the start year has no figure (FY2010-11 debt servicing), never computed from zero", () => {
    expect(getCagr("debtServicing", years)).toBeNull();
    expect(getCagr("debtServicing", years, "2011-12")).not.toBeNull();
  });
});

describe("sliceYears", () => {
  it("returns inclusive ranges, open ends, and empty for unknown or reversed years", () => {
    expect(sliceYears(years, "2015-16", "2017-18").map((r) => r.fiscalYear)).toEqual(["2015-16", "2016-17", "2017-18"]);
    expect(sliceYears(years, undefined, "2011-12")).toHaveLength(2);
    expect(sliceYears(years, "2025-26")).toHaveLength(2);
    expect(sliceYears(years, "1999-00", "2017-18")).toEqual([]);
    expect(sliceYears(years, "2020-21", "2015-16")).toEqual([]);
  });
});

describe("debt servicing share", () => {
  it("reports both bases: 300 of 1,000 outlay = 30%, 300 of 1,500 envelope = 20%", () => {
    const s = getDebtServicingShare(synth());
    expect(s?.pctOfBudget).toBeCloseTo(30, 9);
    expect(s?.pctOfEnvelope).toBeCloseTo(20, 9);
  });
  it("is null where the year does not itemise interest", () => {
    expect(getDebtServicingShare(y("2010-11"))).toBeNull();
  });
});

describe("trend series", () => {
  it("nominal mode returns the raw figure and keeps nulls as null", () => {
    const t = getCategoryTrendSeries(["debtServicing", "defence"], "nominal");
    expect(t).toHaveLength(17);
    expect(t[0].values.debtServicing).toBeNull();
    expect(t[0].values.defence).toBe(y("2010-11").defence);
    expect(t[16].values.debtServicing).toBe(y("2026-27").debtServicing);
  });

  it("% of GDP mode divides by the stated GDP where printed: debt servicing 2026-27", () => {
    const t = getCategoryTrendSeries(["debtServicing"], "pctGdp");
    const r = y("2026-27");
    expect(t[16].values.debtServicing).toBeCloseTo(((r.debtServicing as number) / 143604) * 100, 9);
  });

  it("share-of-outlay mode divides by total outlay; non-components are null, not a wrong-base number", () => {
    const t = getCategoryTrendSeries(["defence", "fbrTaxRevenue", "provincialTransfer", "fiscalDeficitRs"], "shareOutlay", [synth({ defence: 150 })]);
    expect(t[0].values.defence).toBeCloseTo(15, 9);
    expect(t[0].values.fbrTaxRevenue).toBeNull();
    expect(t[0].values.provincialTransfer).toBeNull();
    expect(t[0].values.fiscalDeficitRs).toBeNull();
  });

  it("isFieldAvailableInMode agrees: components yes, revenue/deficit/provincial no, every field available in nominal and % of GDP", () => {
    expect(isFieldAvailableInMode("defence", "shareOutlay")).toBe(true);
    expect(isFieldAvailableInMode("fbrTaxRevenue", "shareOutlay")).toBe(false);
    expect(isFieldAvailableInMode("fiscalDeficitRs", "shareOutlay")).toBe(false);
    expect(isFieldAvailableInMode("fbrTaxRevenue", "nominal")).toBe(true);
    expect(isFieldAvailableInMode("fiscalDeficitRs", "pctGdp")).toBe(true);
  });

  it("a year-range subset yields exactly those years", () => {
    const t = getCategoryTrendSeries(["defence"], "nominal", sliceYears(years, "2020-21", "2022-23"));
    expect(t.map((p) => p.fiscalYear)).toEqual(["2020-21", "2021-22", "2022-23"]);
  });
});

describe("category summary", () => {
  it("reports missing years instead of zero-filling them", () => {
    const s = getCategorySummary("debtServicing");
    expect(s?.missingYears).toEqual(["2010-11"]);
    expect(s?.cagr?.fromFy).toBe("2011-12");
    expect(s?.cagr?.toFy).toBe("2026-27");
  });
  it("ranks the latest year's itemised slices and gives share of outlay and % of GDP with its basis", () => {
    const s = getCategorySummary("debtServicing");
    // FY2026-27: provincial transfers 8,848 > debt servicing 8,054 > defence 3,000 > pension 1,169 > subsidies 1,091 > PSDP 1,000 → debt servicing is 2nd of 6
    expect(s?.rank).toEqual({ position: 2, of: 6 });
    expect(s?.shareOfOutlay).toBeCloseTo(((y("2026-27").debtServicing as number) / y("2026-27").totalOutlay) * 100, 9);
    expect(s?.pctOfGdp?.basis).toBe("stated");
  });
  it("share of outlay is null for a non-component (FBR tax revenue)", () => {
    expect(getCategorySummary("fbrTaxRevenue")?.shareOfOutlay).toBeNull();
  });
});

describe("insights", () => {
  const insights = generateBudgetInsights();
  it("are deterministic: two calls yield identical output", () => {
    expect(generateBudgetInsights()).toEqual(insights);
  });
  it("every insight has an id, text, and evidence figures that exist in the dataset", () => {
    expect(insights.length).toBeGreaterThanOrEqual(6);
    for (const i of insights) {
      expect(i.id).toBeTruthy();
      expect(i.text.length).toBeGreaterThan(20);
      expect(i.evidence.length).toBeGreaterThan(0);
      for (const e of i.evidence) {
        expect(getAllFiscalYears()).toContain(e.fiscalYear);
        expect(Number.isFinite(e.value)).toBe(true);
      }
    }
    expect(new Set(insights.map((i) => i.id)).size).toBe(insights.length);
  });
  it("the debt-vs-defence claim is true in every year it names", () => {
    const i = insights.find((x) => x.id === "debt-vs-defence");
    expect(i).toBeDefined();
    const m = i?.text.match(/from FY(\d{4}-\d{2}) through FY(\d{4}-\d{2})/);
    expect(m).not.toBeNull();
    const [, from, to] = m as RegExpMatchArray;
    for (const r of sliceYears(years, from, to)) expect(r.debtServicing as number).toBeGreaterThan(r.defence);
    expect(to).toBe("2026-27");
  });
  it("the fastest-growth comparison uses one common window that starts after FY2010-11", () => {
    const i = insights.find((x) => x.id === "fastest-growth");
    expect(i?.text).not.toMatch(/FY2010-11/);
    expect(i?.caveat).toMatch(/Nominal growth, not real/);
  });
  it("no insight describes nominal growth as real growth or asserts a cause", () => {
    for (const i of insights) {
      expect(i.text).not.toMatch(/real terms|because|due to|caused/i);
    }
  });
  it("the education/health insight carries the devolution caveat", () => {
    expect(insights.find((x) => x.id === "education-health")?.caveat).toMatch(/18th Amendment/);
  });
  it("is empty for an empty range and does not throw for a single year", () => {
    expect(generateBudgetInsights([])).toEqual([]);
    expect(() => generateBudgetInsights([y("2026-27")])).not.toThrow();
  });
});

describe("can fail", () => {
  it("the consistency check does flag a corrupted deficit", () => {
    const bad = { ...y("2026-27"), fiscalDeficitPctGdp: 5.0 };
    const f = checkDatasetConsistency([bad]).find((x) => x.check === "deficit-vs-stated-gdp");
    expect(f?.ok).toBe(false);
  });
  it("the consistency check does flag a component larger than outlay", () => {
    const bad = { ...y("2026-27"), defence: 99999 };
    expect(checkDatasetConsistency([bad]).find((x) => x.check === "components-within-outlay")?.ok).toBe(false);
  });
});
