// Recommendation Engine — a cross-tool, prioritized action list. Distinct
// from insightEngine.ts (narrative sentences scoped to one tool's own
// result): this reasons across the whole profile plus whatever computed
// figures the caller has available, and ranks what to do next.
// Deterministic, fixed thresholds — no AI, no ML, no fabricated advice.
import type { EconomicProfile, Goal } from "@/lib/decisionSupportLab/economicProfile";
import { getOverallCompletionPct } from "@/lib/decisionSupportLab/profileCompletion";

/** One goal's already-computed funding-gap result (from goalEngine.ts's projectGoalProgress) — passed in rather than recomputed here, so this engine never duplicates goal math, only reasons about its output. */
export interface GoalRecommendationInput {
  goal: Goal;
  fundingGapAmount: number;
  fundingGapPct: number;
  requiredMonthlyContributionValue: number;
}

export interface Recommendation {
  priority: number;
  title: string;
  expectedImpact: "high" | "medium" | "low";
  reason: string;
  relatedToolHref?: string;
  /** Lets the Dashboard pull a featured "Biggest Financial Risk" / "Biggest Opportunity" card from this same ranked list instead of running a second detection pass. */
  frame?: "risk" | "opportunity" | "action";
}

export interface RecommendationComputedInputs {
  healthScorePct?: number;
  savingsErosionPct?: number;
  portfolioRealReturnPct?: number;
  officialInflationPct?: number;
  /** Financial Planning Intelligence (Phase 6) goals with a computed funding-gap result — omitted entirely by every non-goal tool, so this stays a no-op for them. */
  goals?: GoalRecommendationInput[];
}

/** Ranked by `priority` ascending (1 = most important). Extend by adding a rule to this list — nothing else needs to change since every consumer reads the returned array, not individual rule functions. */
export function generateRecommendations(profile: EconomicProfile, computed: RecommendationComputedInputs = {}): Recommendation[] {
  const recs: Recommendation[] = [];

  for (const { goal, fundingGapAmount, fundingGapPct, requiredMonthlyContributionValue } of computed.goals ?? []) {
    if (fundingGapAmount > 0 && requiredMonthlyContributionValue > goal.monthlyContribution) {
      const shortfallMonthly = requiredMonthlyContributionValue - goal.monthlyContribution;
      recs.push({
        priority: fundingGapPct > 25 ? 1 : 2,
        title: `Increase your "${goal.name}" contribution to stay on track`,
        expectedImpact: fundingGapPct > 25 ? "high" : "medium",
        reason: `At your current monthly contribution, this goal is projected to fall short by Rs ${Math.round(fundingGapAmount).toLocaleString("en-US")} (${fundingGapPct.toFixed(0)}%). Raising your monthly contribution by about Rs ${Math.round(shortfallMonthly).toLocaleString("en-US")} would close the gap.`,
        frame: "risk",
      });
    } else if (fundingGapAmount <= 0 && goal.monthlyContribution > 0) {
      recs.push({
        priority: 3,
        title: `"${goal.name}" is on track`,
        expectedImpact: "low",
        reason: `Your current savings and contribution rate are projected to meet this goal's inflation-adjusted target by ${goal.targetDate}.`,
        frame: "opportunity",
      });
    }
  }

  if (profile.monthlySpending > 0 && profile.currentSavings > 0 && profile.currentSavings < 3 * profile.monthlySpending) {
    recs.push({
      priority: 1,
      title: "Build your emergency savings",
      expectedImpact: "high",
      reason: "Your recorded savings cover less than 3 months of your monthly spending — a standard resilience benchmark.",
      relatedToolHref: "/decision-support-lab/savings-erosion",
      frame: "risk",
    });
  }

  if (profile.hasDebt && profile.debtAmount > 0 && computed.portfolioRealReturnPct !== undefined && profile.debtInterestRate > computed.portfolioRealReturnPct) {
    recs.push({
      priority: 1,
      title: "Pay down high-interest debt before investing further",
      expectedImpact: "high",
      reason: `Your debt's interest rate (${profile.debtInterestRate.toFixed(1)}%) is higher than your portfolio's real return — paying it down is a guaranteed return your investments aren't matching.`,
      relatedToolHref: "/decision-support-lab/loan-emi",
      frame: "risk",
    });
  }

  if (profile.currentInvestmentAmount > 0 && computed.portfolioRealReturnPct !== undefined && computed.portfolioRealReturnPct < 0) {
    recs.push({
      priority: 2,
      title: "Your investments are losing to inflation",
      expectedImpact: "medium",
      reason: "Your portfolio's real (inflation-adjusted) return is negative — its nominal growth isn't keeping pace with prices.",
      relatedToolHref: "/decision-support-lab/asset-allocation-explorer",
      frame: "opportunity",
    });
  }

  if (profile.expectedAnnualRaisePct > 0 && computed.officialInflationPct !== undefined && profile.expectedAnnualRaisePct < computed.officialInflationPct) {
    recs.push({
      priority: 2,
      title: "Your planned raise may not keep pace with inflation",
      expectedImpact: "medium",
      reason: `Your expected raise (${profile.expectedAnnualRaisePct.toFixed(1)}%) is below the latest official inflation rate (${computed.officialInflationPct.toFixed(1)}%).`,
      relatedToolHref: "/decision-support-lab/salary-required",
      frame: "action",
    });
  }

  if (profile.currentInvestmentAmount > 0 && Object.keys(profile.investmentAllocation).length === 0) {
    recs.push({
      priority: 2,
      title: "Set your investment allocation for sharper portfolio analysis",
      expectedImpact: "medium",
      reason: "You've recorded an investment amount but no allocation across asset types — Portfolio and Asset Allocation tools default to an even split until this is set.",
      relatedToolHref: "/decision-support-lab/asset-allocation-explorer",
      frame: "opportunity",
    });
  }

  const completionPct = getOverallCompletionPct(profile);
  if (completionPct < 100) {
    recs.push({
      priority: 3,
      title: "Complete your profile for sharper recommendations",
      expectedImpact: "low",
      reason: `Your Economic Profile is ${completionPct}% complete — every additional field improves the accuracy of every tool that reads it.`,
      relatedToolHref: "/decision-support-lab",
      frame: "action",
    });
  }

  return recs.sort((a, b) => a.priority - b.priority);
}
