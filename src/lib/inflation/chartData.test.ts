import { describe, expect, it } from "vitest";
import { commonMonths, coverageText, mergeSeries, sliceRange, tableRowsFor, toBars, unionMonths } from "./chartData";
import type { MonthlyPoint } from "./periods";

const pts = (pairs: [string, number][]): MonthlyPoint[] => pairs.map(([month, value]) => ({ month, value }));

describe("sliceRange", () => {
  const s = pts([["2024-01", 1], ["2024-06", 2], ["2025-10", 3], ["2026-09", 4], ["2026-10", 5]]);

  it("returns everything for 'all'", () => {
    expect(sliceRange(s, "all")).toHaveLength(5);
  });

  it("counts CALENDAR months back from the newest observation, not the last N entries", () => {
    // 12 months ending 2026-10 covers 2025-11..2026-10: two points, even though the series has five.
    expect(sliceRange(s, "12").map((p) => p.month)).toEqual(["2026-09", "2026-10"]);
    expect(sliceRange(s, "24").map((p) => p.month)).toEqual(["2025-10", "2026-09", "2026-10"]);
  });

  it("copes with an empty series", () => {
    expect(sliceRange([], "12")).toEqual([]);
  });
});

describe("mergeSeries", () => {
  const a = pts([["2026-08", 1], ["2026-09", 2], ["2026-10", 3]]);
  const b = pts([["2026-09", 20], ["2026-10", 30]]);

  it("aligns series on a shared month axis", () => {
    const rows = mergeSeries({ a, b }, unionMonths({ a, b }));
    expect(rows.map((r) => r.month)).toEqual(["2026-08", "2026-09", "2026-10"]);
    expect(rows[1]).toMatchObject({ a: 2, b: 20 });
  });

  it("leaves a month a series did not observe as null — never zero", () => {
    const rows = mergeSeries({ a, b }, unionMonths({ a, b }));
    expect(rows[0].b).toBeNull();
    expect(rows.flatMap((r) => [r.a, r.b]).filter((v) => v === 0)).toEqual([]);
  });

  it("labels the axis with compact month names", () => {
    expect(mergeSeries({ a }, ["2026-10"])[0].period).toBe("Oct 26");
  });
});

describe("commonMonths", () => {
  it("is the months present in every series", () => {
    expect(commonMonths({ a: pts([["2026-08", 1], ["2026-09", 1], ["2026-10", 1]]), b: pts([["2026-09", 1], ["2026-10", 1]]), c: pts([["2026-10", 1]]) })).toEqual(["2026-10"]);
  });
  it("is empty when nothing is shared, or when there are no series", () => {
    expect(commonMonths({ a: pts([["2026-01", 1]]), b: pts([["2026-02", 1]]) })).toEqual([]);
    expect(commonMonths({})).toEqual([]);
  });
});

describe("toBars / tableRowsFor / coverageText", () => {
  it("toBars keeps values exactly", () => {
    expect(toBars(pts([["2026-10", 9.6]]))).toEqual([{ period: "Oct 26", value: 9.6 }]);
  });

  it("table rows show 'no data' (null) for a missing month and signed-free values otherwise", () => {
    const rows = tableRowsFor({ a: pts([["2026-10", 9.6]]), b: [] }, ["2026-10"]);
    expect(rows).toEqual([["Oct 2026", "9.6%", null]]);
  });

  it("describes coverage honestly", () => {
    expect(coverageText(pts([["2016-07", 1], ["2016-08", 2]]))).toBe("Jul 2016 – Aug 2016 (2 months)");
    expect(coverageText([])).toBe("no observations");
  });
});
