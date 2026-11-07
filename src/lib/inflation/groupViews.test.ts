import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseCpiGroupPanel } from "./pbsGroups";
import { buildGroupModel } from "./viewModel";
import { componentTable, groupHeatRows, groupMonths, groupRatesAt, measureMonths, rankedByRate, stackedContributions, STACK_SERIES, valueAt } from "./groupViews";

const model = buildGroupModel(parseCpiGroupPanel(readFileSync(join(__dirname, "__fixtures__", "pbsCpiSample.xml"), "utf-8")).panel!)!;

describe("groupRatesAt / rankedByRate", () => {
  const rows = groupRatesAt(model, "2026-10");

  it("returns the 12 groups in PBS order with their weights and the month's YoY", () => {
    expect(rows.map((r) => r.groupNo)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(rows[6].short).toBe("Transport");
    expect(rows[6].value).toBeCloseTo(28.61, 2);
    expect(rows[0].weight).toBeCloseTo(34.58, 1);
  });

  it("gives null — not zero — for a month a group has no YoY for", () => {
    expect(groupRatesAt(model, "2025-12").every((r) => r.value === null)).toBe(true); // no 12-month base yet
  });

  it("ranks high to low, with no-reading groups last", () => {
    const ranked = rankedByRate(rows);
    expect(ranked[0].short).toBe("Transport");
    expect(ranked[ranked.length - 1].short).toBe("Recreation");
    const withGap = rankedByRate([{ ...rows[0], value: null }, ...rows.slice(1)]);
    expect(withGap[withGap.length - 1].groupNo).toBe(1);
  });

  it("MoM and YoY are different series", () => {
    expect(groupRatesAt(model, "2026-10", "mom")[6].value).not.toBeCloseTo(groupRatesAt(model, "2026-10", "yoy")[6].value as number, 1);
  });
});

describe("componentTable", () => {
  const t = componentTable(model, "2026-10");

  it("is sorted by contribution, largest first", () => {
    const c = t.rows.map((r) => r.contribution as number);
    expect([...c].sort((a, b) => b - a)).toEqual(c);
    expect(t.rows[0].name).toBe("Food & Non-Alcoholic Beverages");
  });

  it("carries weight, rate and contribution as separate numbers", () => {
    const food = t.rows.find((r) => r.groupNo === 1)!;
    expect(food.weight).toBeCloseTo(34.58, 1);
    expect(food.yoy).toBeCloseTo(7.74, 2);
    expect(food.contribution).toBeCloseTo(2.85, 2);
  });

  it("computes change vs the previous month's YoY (pp), null when either is missing", () => {
    const food = t.rows.find((r) => r.groupNo === 1)!;
    expect(food.change).toBeCloseTo((food.yoy as number) - (food.previousYoy as number), 10);
    const first = componentTable(model, groupMonths(model)[0]);
    expect(first.rows.every((r) => r.change === null)).toBe(true); // month before the first has no YoY
  });

  it("totals: weights ~100 and contributions sum to the headline change", () => {
    expect(t.total!.weight).toBeCloseTo(100, 1);
    expect(t.total!.contribution).toBeCloseTo(t.rows.reduce((s, r) => s + (r.contribution as number), 0), 10);
    expect(Math.abs(t.total!.contribution - t.total!.headlinePct)).toBeLessThan(0.01);
  });

  it("returns no total for a month without a decomposition", () => {
    expect(componentTable(model, "2020-01").total).toBeNull();
  });
});

describe("groupHeatRows", () => {
  it("builds one row per group and one cell per requested month, null where absent", () => {
    const rows = groupHeatRows(model, ["2025-12", "2026-10"], "yoy");
    expect(rows).toHaveLength(12);
    expect(rows[0].cells).toHaveLength(2);
    expect(rows[0].cells[0]).toBeNull(); // 2025-12: no YoY (needs 2024-12)
    expect(rows[6].cells[1]).toBeCloseTo(28.61, 2);
  });

  it("MoM covers more months than YoY", () => {
    expect(measureMonths(model, "mom").length).toBeGreaterThan(measureMonths(model, "yoy").length);
    expect(measureMonths(model, "yoy")).toEqual(groupMonths(model));
  });
});

describe("stackedContributions", () => {
  const rows = stackedContributions(model, groupMonths(model));

  it("bands add up to the total in every month (named groups + all other)", () => {
    for (const r of rows) {
      const sum = STACK_SERIES.reduce((s, ser) => s + (r[ser.key] as number), 0);
      expect(sum, r.month).toBeCloseTo(r.total, 9);
    }
  });

  it("names the fixed groups individually and folds the rest", () => {
    expect(STACK_SERIES.map((s) => s.key)).toEqual(["g1", "g4", "g7", "g3", "g11", "other"]);
    const oct = rows.at(-1)!;
    expect(oct.g1).toBeCloseTo(2.85, 2);
    expect(oct.total).toBeCloseTo(9.61, 2);
  });

  it("skips months with no decomposition rather than inventing a row", () => {
    expect(stackedContributions(model, ["2020-01", "2026-10"]).map((r) => r.month)).toEqual(["2026-10"]);
  });
});

describe("valueAt", () => {
  it("returns null for a missing month", () => {
    expect(valueAt(model.yoy[1], "2020-01")).toBeNull();
    expect(valueAt(undefined, "2026-10")).toBeNull();
  });
});
