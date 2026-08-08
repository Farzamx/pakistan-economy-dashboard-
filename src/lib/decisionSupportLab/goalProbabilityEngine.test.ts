import { describe, expect, it } from "vitest";
import { runGoalMonteCarlo, runSensitivityAnalysis } from "@/lib/decisionSupportLab/goalProbabilityEngine";
import { projectGoalProgress } from "@/lib/decisionSupportLab/goalEngine";
import type { Goal } from "@/lib/decisionSupportLab/economicProfile";

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: "goal-test-2",
    name: "Test Goal",
    goalType: "custom",
    targetAmountToday: 1_000_000,
    targetDate: "2036-01-01",
    currentSavingsForGoal: 100_000,
    monthlyContribution: 10_000,
    expectedReturnPct: 10,
    priority: "medium",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("runGoalMonteCarlo", () => {
  it("is fully deterministic — identical inputs always produce identical output", () => {
    const goal = makeGoal();
    const assumptions = { inflationPct: 8, volatilityPct: 12 };
    const a = runGoalMonteCarlo(goal, assumptions, 500, "2026-01-01");
    const b = runGoalMonteCarlo(goal, assumptions, 500, "2026-01-01");
    expect(a).toEqual(b);
  });

  it("produces a different result when an input changes", () => {
    const assumptions = { inflationPct: 8, volatilityPct: 12 };
    const a = runGoalMonteCarlo(makeGoal(), assumptions, 500, "2026-01-01");
    const b = runGoalMonteCarlo(makeGoal({ monthlyContribution: 50_000 }), assumptions, 500, "2026-01-01");
    expect(a.successProbabilityPct).not.toBe(b.successProbabilityPct);
  });

  it("success probability is always within [0, 100]", () => {
    const result = runGoalMonteCarlo(makeGoal(), { inflationPct: 8, volatilityPct: 12 }, 500, "2026-01-01");
    expect(result.successProbabilityPct).toBeGreaterThanOrEqual(0);
    expect(result.successProbabilityPct).toBeLessThanOrEqual(100);
  });

  it("percentiles are ordered P10 <= P50 <= P90", () => {
    const result = runGoalMonteCarlo(makeGoal(), { inflationPct: 8, volatilityPct: 12 }, 500, "2026-01-01");
    expect(result.p10FutureValue).toBeLessThanOrEqual(result.p50FutureValue);
    expect(result.p50FutureValue).toBeLessThanOrEqual(result.p90FutureValue);
  });

  it("a much higher contribution never lowers the success probability", () => {
    const assumptions = { inflationPct: 8, volatilityPct: 12 };
    const low = runGoalMonteCarlo(makeGoal({ monthlyContribution: 1_000 }), assumptions, 800, "2026-01-01");
    const high = runGoalMonteCarlo(makeGoal({ monthlyContribution: 100_000 }), assumptions, 800, "2026-01-01");
    expect(high.successProbabilityPct).toBeGreaterThanOrEqual(low.successProbabilityPct);
  });
});

describe("runSensitivityAnalysis", () => {
  it("returns 6 rows (2 each for return, contribution, inflation)", () => {
    const goal = makeGoal();
    const rows = runSensitivityAnalysis(goal, { inflationPct: 8 }, (g, a) => projectGoalProgress(g, a, "2026-01-01"));
    expect(rows.length).toBe(6);
  });

  it("a higher assumed return always produces a smaller (or equal) funding gap than a lower one", () => {
    const goal = makeGoal();
    const rows = runSensitivityAnalysis(goal, { inflationPct: 8 }, (g, a) => projectGoalProgress(g, a, "2026-01-01"));
    const lowerReturn = rows.find((r) => r.label === "Return −2pp")!;
    const higherReturn = rows.find((r) => r.label === "Return +2pp")!;
    expect(higherReturn.fundingGapPct).toBeLessThanOrEqual(lowerReturn.fundingGapPct);
  });
});
