// Financial Planning Intelligence — Cash Flow Engine (Phase 6, Wave 1).
//
// Answers "can you actually afford your goal contributions" from the same
// Unified Economic Profile every other tool reads — no separate income/
// expense entry, matching the "nothing is collected twice" rule
// economicProfile.ts's own header comment establishes. Foundation for
// Wave 2's standalone Cash Flow Planning tool; used directly by Wave 1's
// two goal planners for their affordability check.
import { getEffectiveMonthlyBudget, type EconomicProfile, type Goal } from "@/lib/decisionSupportLab/economicProfile";

/** Household income minus effective monthly spending — profile.monthlyIncome is the household-capacity field (distinct from currentSalary, per economicProfile.ts's own convention), and getEffectiveMonthlyBudget() already prefers the household_allocation figure over the raw monthlySpending field when one has been set. */
export function calculateMonthlySurplus(profile: EconomicProfile): number {
  return profile.monthlyIncome - getEffectiveMonthlyBudget(profile);
}

export interface GoalCommitmentAnalysis {
  monthlySurplus: number;
  totalCommittedMonthly: number;
  remainingAfterCommitments: number;
  isOverCommitted: boolean;
  overCommitmentAmount: number;
}

/** Sums every active goal's monthlyContribution and checks it against the profile's monthly surplus — flags over-commitment across the whole set of goals, not just the one goal a single planner happens to be showing. */
export function analyzeGoalCommitments(profile: EconomicProfile, goals: Goal[]): GoalCommitmentAnalysis {
  const monthlySurplus = calculateMonthlySurplus(profile);
  const totalCommittedMonthly = goals.filter((g) => g.status === "active").reduce((sum, g) => sum + g.monthlyContribution, 0);
  const remainingAfterCommitments = monthlySurplus - totalCommittedMonthly;
  return {
    monthlySurplus,
    totalCommittedMonthly,
    remainingAfterCommitments,
    isOverCommitted: remainingAfterCommitments < 0,
    overCommitmentAmount: Math.max(0, -remainingAfterCommitments),
  };
}
