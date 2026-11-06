// Hand-checkable tests for the Inflation page's derived quantities.
// Values come either from tiny inputs worked out by hand, or from the real PBS
// fixture where the expected number was computed independently (scratch script
// against the live file, 2026-11-06) before the implementation existed.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { computeYoYPercent } from "@/lib/yoyMath";
import { parseCpiGroupPanel } from "./pbsGroups";
import {
  acceleration,
  alignedLatest,
  boxStats,
  buildWaterfall,
  changeSeries,
  contributionsOverLag,
  countryYearMatrix,
  histogram,
  indexChange,
  laggedPairs,
  latestCommonYear,
  monthYearMatrix,
  otherGroupsIndex,
  pctChangeOverLag,
  policyRateAt,
  policyStepSeries,
  quantile,
  rankDescending,
} from "./analytics";
import { toMonthMap, type MonthlyPoint } from "./periods";

const panel = parseCpiGroupPanel(readFileSync(join(__dirname, "__fixtures__", "pbsCpiSample.xml"), "utf-8")).panel!;
const pts = (pairs: [string, number][]): MonthlyPoint[] => pairs.map(([month, value]) => ({ month, value }));

describe("pctChangeOverLag — YoY and MoM from an index", () => {
  const idx = toMonthMap(pts([["2025-10", 200], ["2025-11", 210], ["2026-09", 220], ["2026-10", 230]]));

  it("YoY (lag 12) is current ÷ same month a year earlier − 1", () => {
    expect(pctChangeOverLag(idx, "2026-10", 12)).toBeCloseTo(15, 10); // 230/200
  });

  it("MoM (lag 1) is current ÷ previous month − 1, and is a different number from YoY", () => {
    expect(pctChangeOverLag(idx, "2026-10", 1)).toBeCloseTo((230 / 220 - 1) * 100, 10);
    expect(pctChangeOverLag(idx, "2026-10", 1)).not.toBeCloseTo(pctChangeOverLag(idx, "2026-10", 12)!, 3);
  });

  it("is null — not zero — when either month is missing", () => {
    expect(pctChangeOverLag(idx, "2026-10", 2)).toBeNull(); // 2026-08 absent
    expect(pctChangeOverLag(idx, "2025-10", 12)).toBeNull(); // 2024-10 absent
  });

  it("agrees with the codebase's existing YoY helper", () => {
    const history = [{ date: "2025-10-31", value: 200 }];
    expect(computeYoYPercent(history, "2026-10-31", 230)).toBeCloseTo(pctChangeOverLag(idx, "2026-10", 12)!, 10);
  });

  it("changeSeries skips months with a missing end and keeps order", () => {
    const out = changeSeries(idx, 12, ["2025-10", "2026-10", "2026-09"]);
    expect(out).toHaveLength(1);
    expect(out[0].month).toBe("2026-10");
    expect(out[0].value).toBeCloseTo(15, 10);
  });
});

describe("indexChange on the real headline index", () => {
  it("reproduces the October 2026 YoY the published series shows (9.6%)", () => {
    const headline = [...panel.headlineIndex].map(([month, value]) => ({ month, value }));
    const yoy = indexChange(headline, 12);
    expect(yoy.map((p) => p.month)).toEqual(["2026-06", "2026-07", "2026-08", "2026-09", "2026-10"]);
    expect(yoy.at(-1)!.value).toBeCloseTo(9.61, 2);
  });
});

describe("contributionsOverLag — exact decomposition", () => {
  const rows = contributionsOverLag(panel, 12);

  it("produces a decomposition only where the base month exists", () => {
    expect(rows.map((r) => r.month)).toEqual(["2026-06", "2026-07", "2026-08", "2026-09", "2026-10"]);
    expect(rows[0].baseMonth).toBe("2025-06");
  });

  it("contributions add up to the headline change (within published-index rounding)", () => {
    for (const r of rows) expect(Math.abs(r.total - r.headlinePct)).toBeLessThan(0.01);
  });

  it("matches hand-computed October 2026 contributions", () => {
    const oct = rows.at(-1)!;
    // Computed independently from the live file: food 2.85, housing 2.32, transport 1.93, … total 9.61.
    expect(oct.byGroup[1]).toBeCloseTo(2.85, 2);
    expect(oct.byGroup[4]).toBeCloseTo(2.32, 2);
    expect(oct.byGroup[7]).toBeCloseTo(1.93, 2);
    expect(oct.total).toBeCloseTo(9.61, 2);
  });

  it("a contribution is not a weight and not a group rate", () => {
    const oct = rows.at(-1)!;
    // Food's base weight is 34.58 and its YoY is 7.74%; its contribution is neither.
    expect(oct.byGroup[1]).not.toBeCloseTo(34.58, 0);
    expect(oct.byGroup[1]).not.toBeCloseTo(7.74, 0);
  });

  it("MoM contributions (lag 1) also add up to the MoM change", () => {
    for (const r of contributionsOverLag(panel, 1)) expect(Math.abs(r.total - r.headlinePct)).toBeLessThan(0.02);
  });
});

describe("buildWaterfall", () => {
  const rows = contributionsOverLag(panel, 12);

  it("is exactly additive: start + Σ steps = end", () => {
    const w = buildWaterfall(rows, "2026-06", "2026-10")!;
    const sum = w.steps.reduce((s, x) => s + x.delta, 0);
    expect(w.start + sum).toBeCloseTo(w.end, 10);
  });

  it("starts and ends at the headline YoY of those months", () => {
    const w = buildWaterfall(rows, "2026-06", "2026-10")!;
    expect(w.start).toBeCloseTo(11.07, 1);
    expect(w.end).toBeCloseTo(9.61, 1);
  });

  it("is null if either month has no full decomposition", () => {
    expect(buildWaterfall(rows, "2025-06", "2026-10")).toBeNull();
    expect(buildWaterfall(rows, "2026-06", "2027-01")).toBeNull();
  });
});

describe("otherGroupsIndex — groups 2–12 only", () => {
  it("recombines with group 1 into the headline index", () => {
    const other = otherGroupsIndex(panel);
    const w = panel.groups.map((g) => g.weight);
    const wOther = w.slice(1).reduce((s, x) => s + x, 0);
    for (const m of panel.months) {
      const recombined = (w[0] * (panel.groups[0].index.get(m) as number) + wOther * (other.get(m) as number)) / (w[0] + wOther);
      expect(Math.abs(recombined - (panel.headlineIndex.get(m) as number))).toBeLessThan(0.05);
    }
  });

  it("excludes group 1", () => {
    const only1 = otherGroupsIndex({ ...panel, groups: panel.groups.filter((g) => g.groupNo !== 1) });
    expect(only1.get("2026-10")).toBeCloseTo(otherGroupsIndex(panel).get("2026-10")!, 10);
  });
});

describe("acceleration — change in a RATE", () => {
  it("is the difference between consecutive months", () => {
    expect(acceleration(pts([["2026-07", 9.2], ["2026-08", 11.1], ["2026-09", 10.3]]))).toEqual([
      { month: "2026-08", value: expect.closeTo(1.9, 10) },
      { month: "2026-09", value: expect.closeTo(-0.8, 10) },
    ]);
  });

  it("produces nothing across a gap (no invented bridge)", () => {
    expect(acceleration(pts([["2026-05", 5], ["2026-07", 7]]))).toEqual([]);
  });
});

describe("alignedLatest", () => {
  it("compares series at the newest month they SHARE", () => {
    const r = alignedLatest({
      headline: pts([["2026-09", 10.3], ["2026-10", 9.6]]),
      core: pts([["2026-08", 8.8], ["2026-09", 8.6]]), // one month behind
    })!;
    expect(r.latestMonth).toBe("2026-09");
    expect(r.latest).toEqual({ headline: 10.3, core: 8.6 });
    expect(r.previousMonth).toBeNull(); // 2026-08 is missing from headline
    expect(r.previous).toBeNull();
  });

  it("returns the previous month only when every series has it", () => {
    const r = alignedLatest({ a: pts([["2026-09", 1], ["2026-10", 2]]), b: pts([["2026-09", 3], ["2026-10", 4]]) })!;
    expect(r.previousMonth).toBe("2026-09");
    expect(r.previous).toEqual({ a: 1, b: 3 });
  });

  it("is null when the series share no month", () => {
    expect(alignedLatest({ a: pts([["2026-01", 1]]), b: pts([["2026-02", 2]]) })).toBeNull();
  });
});

describe("histogram", () => {
  it("counts every value exactly once", () => {
    const values = [0.3, 1.9, 2.0, 2.1, 4.0, 4.99, 5.0, -1.2, 38];
    const bins = histogram(values, 2);
    expect(bins.reduce((s, b) => s + b.count, 0)).toBe(values.length);
  });

  it("uses half-open bins [from, to) with edges on multiples of the width", () => {
    const bins = histogram([1.99, 2, 2.01], 2);
    expect(bins.map((b) => [b.from, b.to, b.count])).toEqual([[0, 2, 1], [2, 4, 2]]);
  });

  it("handles negative values and keeps empty bins between occupied ones", () => {
    const bins = histogram([-3, 7], 5);
    expect(bins.map((b) => [b.from, b.count])).toEqual([[-5, 1], [0, 0], [5, 1]]);
  });

  it("is empty for no data", () => {
    expect(histogram([], 2)).toEqual([]);
  });
});

describe("quantile and boxStats", () => {
  it("quantile uses linear interpolation (type 7)", () => {
    expect(quantile([1, 2, 3, 4], 0.5)).toBe(2.5);
    expect(quantile([1, 2, 3, 4, 5], 0.25)).toBe(2);
    expect(quantile([1, 2, 3, 4, 5], 0.75)).toBe(4);
  });

  it("computes quartiles, whiskers and outliers (Tukey 1.5 × IQR)", () => {
    const b = boxStats([1, 2, 3, 4, 5, 6, 7, 8, 9, 40])!;
    expect(b.n).toBe(10);
    expect(b.median).toBe(5.5);
    expect(b.q1).toBe(3.25);
    expect(b.q3).toBe(7.75);
    expect(b.outliers).toEqual([40]);
    expect(b.whiskerHigh).toBe(9);
    expect(b.whiskerLow).toBe(1);
    expect(b.max).toBe(40);
  });

  it("refuses to draw a box from too few observations", () => {
    expect(boxStats([1, 2, 3, 4, 5, 6, 7])).toBeNull();
  });
});

describe("monthYearMatrix", () => {
  const m = monthYearMatrix(pts([["2016-07", 3.2], ["2016-08", 2.8], ["2017-01", 4.5], ["2017-07", 3.9]]));

  it("has twelve month rows and one column per year observed", () => {
    expect(m.years).toEqual([2016, 2017]);
    expect(m.rows).toHaveLength(12);
  });

  it("places each value in its own (month, year) cell", () => {
    expect(m.rows[6].cells).toEqual([3.2, 3.9]); // July
    expect(m.rows[0].cells).toEqual([null, 4.5]); // January 2016 absent
  });

  it("leaves unobserved cells null, never zero", () => {
    const flat = m.rows.flatMap((r) => r.cells);
    expect(flat.filter((c) => c === null)).toHaveLength(24 - 4);
    expect(flat.filter((c) => c === 0)).toHaveLength(0);
  });
});

describe("policy rate alignment", () => {
  const decisions = [
    { date: "2026-04-28", value: 11.5 },
    { date: "2025-12-16", value: 10.5 },
    { date: "2026-10-26", value: 12 },
  ]; // deliberately unsorted

  it("is the rate in effect at month-end: the latest decision dated in or before that month", () => {
    expect(policyRateAt(decisions, "2026-03")).toBe(10.5);
    expect(policyRateAt(decisions, "2026-04")).toBe(11.5); // decision on the 28th counts for April
    expect(policyRateAt(decisions, "2026-09")).toBe(11.5);
    expect(policyRateAt(decisions, "2026-10")).toBe(12);
  });

  it("is null before the first decision on record", () => {
    expect(policyRateAt(decisions, "2025-11")).toBeNull();
  });

  it("policyStepSeries stops at the horizon instead of extending the rate indefinitely", () => {
    const s = policyStepSeries(decisions, ["2025-11", "2025-12", "2026-10", "2026-11"], "2026-10");
    expect(s).toEqual([{ month: "2025-12", value: 10.5 }, { month: "2026-10", value: 12 }]);
  });

  it("laggedPairs pairs an inflation reading with the policy rate L months LATER and drops pairs beyond the horizon", () => {
    const infl = pts([["2026-03", 8], ["2026-04", 9], ["2026-09", 10]]);
    expect(laggedPairs(infl, decisions, 0, "2026-10").map((p) => p.policyRate)).toEqual([10.5, 11.5, 11.5]);
    // lag 1: 2026-03→2026-04 (11.5), 2026-04→2026-05 (11.5), 2026-09→2026-10 (12)
    expect(laggedPairs(infl, decisions, 1, "2026-10").map((p) => p.policyRate)).toEqual([11.5, 11.5, 12]);
    // lag 3: 2026-09→2026-12 is beyond the horizon and is dropped, not extended
    expect(laggedPairs(infl, decisions, 3, "2026-10").map((p) => p.month)).toEqual(["2026-03", "2026-04"]);
  });
});

describe("international matrices", () => {
  const series = {
    PAK: [{ year: 2024, value: 12.63 }, { year: 2025, value: 3.55 }],
    LKA: [{ year: 2024, value: -0.43 }, { year: 2025, value: -4.76 }],
    IND: [{ year: 2024, value: 4.95 }, { year: 2025, value: null }],
  };

  it("keeps a missing observation as null — and a real negative as negative", () => {
    const m = countryYearMatrix(series);
    expect(m.years).toEqual([2024, 2025]);
    expect(m.rows.find((r) => r.code === "IND")!.cells).toEqual([4.95, null]);
    expect(m.rows.find((r) => r.code === "LKA")!.cells).toEqual([-0.43, -4.76]);
  });

  it("latestCommonYear ignores years where any country lacks a value", () => {
    expect(latestCommonYear(series)).toBe(2024);
    expect(latestCommonYear({ PAK: series.PAK, LKA: series.LKA })).toBe(2025);
  });
});

describe("rankDescending", () => {
  it("sorts by value, high to low, and is stable for ties", () => {
    const items = [{ n: "a", v: 5 }, { n: "b", v: 9 }, { n: "c", v: 5 }, { n: "d", v: -1 }];
    expect(rankDescending(items, (i) => i.v).map((i) => i.n)).toEqual(["b", "a", "c", "d"]);
  });
});
