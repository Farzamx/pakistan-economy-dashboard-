import { describe, expect, it } from "vitest";
import {
  monthsBetween,
  inflateTarget,
  projectSavingsGrowth,
  requiredMonthlyContribution,
  projectGoalProgress,
  buildGoalTimelineSeries,
} from "@/lib/decisionSupportLab/goalEngine";
import type { Goal } from "@/lib/decisionSupportLab/economicProfile";

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: "goal-test-1",
    name: "Test Goal",
    goalType: "custom",
    targetAmountToday: 1_000_000,
    targetDate: "2036-01-01",
    currentSavingsForGoal: 100_000,
    monthlyContribution: 10_000,
    expectedReturnPct: 12,
    priority: "medium",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("monthsBetween", () => {
  it("computes whole calendar months between two dates", () => {
    expect(monthsBetween("2026-01-01", "2036-01-01")).toBe(120);
    expect(monthsBetween("2026-06-15", "2027-01-15")).toBe(7);
  });

  it("never returns negative", () => {
    expect(monthsBetween("2030-01-01", "2020-01-01")).toBe(0);
  });
});

describe("inflateTarget", () => {
  it("matches simple compounding for a known case", () => {
    // 100,000 at 10% for 2 years = 100,000 * 1.1^2 = 121,000
    expect(inflateTarget(100_000, 10, 2)).toBeCloseTo(121_000, 5);
  });

  it("returns the same amount at 0 years", () => {
    expect(inflateTarget(500_000, 8, 0)).toBeCloseTo(500_000, 5);
  });
});

describe("projectSavingsGrowth", () => {
  it("with zero contribution, matches plain compounding of the lump sum", () => {
    // 100,000 at 12%/yr (1%/mo) for 12 months = 100,000 * 1.01^12
    const expected = 100_000 * Math.pow(1.01, 12);
    expect(projectSavingsGrowth(100_000, 0, 12, 12)).toBeCloseTo(expected, 2);
  });

  it("with zero rate, is just the sum of savings and all contributions", () => {
    expect(projectSavingsGrowth(50_000, 1_000, 0, 24)).toBeCloseTo(50_000 + 1_000 * 24, 5);
  });
});

describe("requiredMonthlyContribution", () => {
  it("round-trips: contributing the computed amount exactly reaches the target", () => {
    const target = 2_000_000;
    const currentSavings = 200_000;
    const returnPct = 10;
    const months = 60;
    const required = requiredMonthlyContribution(target, currentSavings, returnPct, months);
    const achieved = projectSavingsGrowth(currentSavings, required, returnPct, months);
    expect(achieved).toBeCloseTo(target, 0);
  });

  it("returns 0 when current savings alone already clear the target", () => {
    expect(requiredMonthlyContribution(100_000, 500_000, 10, 24)).toBe(0);
  });

  it("returns 0 for a zero-month horizon", () => {
    expect(requiredMonthlyContribution(100_000, 0, 10, 0)).toBe(0);
  });
});

describe("projectGoalProgress", () => {
  it("funding gap is exactly inflatedTarget minus projectedFutureValue", () => {
    const goal = makeGoal();
    const result = projectGoalProgress(goal, { inflationPct: 8 }, "2026-01-01");
    expect(result.fundingGapAmount).toBeCloseTo(result.inflatedTargetAmount - result.projectedFutureValue, 5);
  });

  it("isOnTrack is true exactly when the funding gap is not positive", () => {
    const goal = makeGoal({ targetAmountToday: 1, currentSavingsForGoal: 10_000_000, monthlyContribution: 0, expectedReturnPct: 0 });
    const result = projectGoalProgress(goal, { inflationPct: 5 }, "2026-01-01");
    expect(result.isOnTrack).toBe(true);
    expect(result.fundingGapAmount).toBeLessThanOrEqual(0);
  });

  it("a goal with no contribution and no savings is never on track for a positive target", () => {
    const goal = makeGoal({ targetAmountToday: 1_000_000, currentSavingsForGoal: 0, monthlyContribution: 0 });
    const result = projectGoalProgress(goal, { inflationPct: 8 }, "2026-01-01");
    expect(result.isOnTrack).toBe(false);
    expect(result.fundingGapAmount).toBeGreaterThan(0);
  });
});

describe("buildGoalTimelineSeries", () => {
  it("produces one point per year including year 0, and the target line rises over time", () => {
    const goal = makeGoal({ targetDate: "2036-01-01" });
    const points = buildGoalTimelineSeries(goal, { inflationPct: 8 }, "2026-01-01");
    expect(points.length).toBe(11); // years 0..10
    expect(points[0].year).toBe(0);
    expect(points[points.length - 1].inflatedTarget).toBeGreaterThan(points[0].inflatedTarget);
  });
});
