// Recommendation Engine — a cross-tool, prioritized action list. Distinct
// from insightEngine.ts (narrative sentences scoped to one tool's own
// result): this reasons across the whole profile plus whatever computed
// figures the caller has available, and ranks what to do next.
// Deterministic, fixed thresholds — no AI, no ML, no fabricated advice.
import type { EconomicProfile } from "@/lib/decisionSupportLab/economicProfile";
import { getOverallCompletionPct } from "@/lib/decisionSupportLab/profileCompletion";

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
}

/** Ranked by `priority` ascending (1 = most important). Extend by adding a rule to this list — nothing else needs to change since every consumer reads the returned array, not individual rule functions. */
export function generateRecommendations(profile: EconomicProfile, computed: RecommendationComputedInputs = {}): Recommendation[] {
  const recs: Recommendation[] = [];

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
