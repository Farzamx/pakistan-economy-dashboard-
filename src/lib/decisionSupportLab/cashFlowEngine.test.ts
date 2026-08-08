import { describe, expect, it } from "vitest";
import { calculateMonthlySurplus, analyzeGoalCommitments } from "@/lib/decisionSupportLab/cashFlowEngine";
import { DEFAULT_ECONOMIC_PROFILE, type EconomicProfile, type Goal } from "@/lib/decisionSupportLab/economicProfile";

function makeProfile(overrides: Partial<EconomicProfile> = {}): EconomicProfile {
  return { ...DEFAULT_ECONOMIC_PROFILE, ...overrides };
}

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: "goal-cf-1",
    name: "Test Goal",
    goalType: "custom",
    targetAmountToday: 1_000_000,
    targetDate: "2036-01-01",
    currentSavingsForGoal: 0,
    monthlyContribution: 10_000,
    expectedReturnPct: 10,
    priority: "medium",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("calculateMonthlySurplus", () => {
  it("is income minus effective monthly spending", () => {
    const profile = makeProfile({ monthlyIncome: 200_000, monthlySpending: 120_000 });
    expect(calculateMonthlySurplus(profile)).toBeCloseTo(80_000, 5);
  });

  it("prefers the household_allocation budget over monthlySpending when set", () => {
    const profile = makeProfile({
      monthlyIncome: 200_000,
      monthlySpending: 120_000,
      householdAllocation: { mode: "spending", monthlyBudget: 150_000, allocation: {} },
    });
    expect(calculateMonthlySurplus(profile)).toBeCloseTo(50_000, 5);
  });
});

describe("analyzeGoalCommitments", () => {
  it("sums only active goals' monthly contributions", () => {
    const profile = makeProfile({ monthlyIncome: 200_000, monthlySpending: 120_000 });
    const goals: Goal[] = [makeGoal({ monthlyContribution: 20_000 }), makeGoal({ id: "goal-cf-2", monthlyContribution: 15_000, status: "paused" })];
    const result = analyzeGoalCommitments(profile, goals);
    expect(result.totalCommittedMonthly).toBe(20_000);
    expect(result.isOverCommitted).toBe(false);
  });

  it("flags over-commitment when goal contributions exceed surplus", () => {
    const profile = makeProfile({ monthlyIncome: 100_000, monthlySpending: 90_000 }); // surplus = 10,000
    const goals: Goal[] = [makeGoal({ monthlyContribution: 25_000 })];
    const result = analyzeGoalCommitments(profile, goals);
    expect(result.isOverCommitted).toBe(true);
    expect(result.overCommitmentAmount).toBeCloseTo(15_000, 5);
  });
});
