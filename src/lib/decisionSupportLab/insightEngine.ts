// Decision Support Lab — deterministic Personal Insights engine.
//
// Explicitly NOT an LLM call: every insight below is a plain threshold
// rule over numbers the Lab already computed, so results are instant,
// free, reproducible, and never hallucinate a number that isn't in the
// underlying data. Any future tool that wants to surface "why does this
// number matter" adds a rule function here rather than reaching for AI
// narration (which this project already uses elsewhere — weeklyIntelligence
// — for genuinely qualitative synthesis; this engine is for the
// mechanical, always-the-same-answer-for-the-same-inputs cases).
import type { CategoryContribution } from "@/lib/personalInflation/engine";

export type InsightTone = "positive" | "warning" | "neutral";

export interface Insight {
  id: string;
  tone: InsightTone;
  message: string;
}

// A gap smaller than this between your spending share and the official
// weight isn't meaningfully different — avoids a "significantly above
// average" insight firing over a 1-2pp rounding-level difference.
const ALLOCATION_GAP_THRESHOLD_PP = 5;
// Same neutral band used by personalInflation/engine.ts's verdict, kept in
// sync deliberately: an insight shouldn't call out a difference the
// verdict banner itself treats as "in line with average."
const RATE_GAP_THRESHOLD_PP = 0.3;
const INCOME_EROSION_THRESHOLD_PCT = 2;

/** Names the single category where the visitor's spending diverges most from the official household's — the concrete evidence behind "your X spending is significantly above/below average." */
export function generateAllocationGapInsight(contributions: CategoryContribution[]): Insight | null {
  let widest: CategoryContribution | null = null;
  let widestGap = 0;
  for (const c of contributions) {
    const gap = Math.abs(c.yourWeightPct - c.officialWeightPct);
    if (gap > widestGap) {
      widest = c;
      widestGap = gap;
    }
  }
  if (!widest || widestGap <= ALLOCATION_GAP_THRESHOLD_PP) return null;

  const direction = widest.yourWeightPct > widest.officialWeightPct ? "above" : "below";
  return {
    id: "allocation-gap",
    tone: "neutral",
    message: `Your ${widest.groupName} spending is significantly ${direction} the national average (${widest.yourWeightPct.toFixed(1)}% of your budget vs. ${widest.officialWeightPct.toFixed(1)}% for the average household).`,
  };
}

/** Names the category contributing most to the visitor's personal inflation rate. */
export function generateTopDriverInsight(contributions: CategoryContribution[]): Insight | null {
  if (contributions.length === 0) return null;
  const top = [...contributions].sort((a, b) => b.yourContributionPct - a.yourContributionPct)[0];
  if (top.yourContributionPct <= 0) return null;
  return {
    id: "top-driver",
    tone: "neutral",
    message: `Your personal inflation is mainly driven by ${top.groupName}, which alone adds ${top.yourContributionPct.toFixed(2)} percentage points to your rate.`,
  };
}

/** Compares the visitor's personal rate against the official CPI — only fires when the gap is large enough to matter. */
export function generatePersonalVsOfficialInsight(personalCpiPct: number, officialCpiPct: number): Insight | null {
  const gap = personalCpiPct - officialCpiPct;
  if (Math.abs(gap) <= RATE_GAP_THRESHOLD_PP) return null;
  if (gap > 0) {
    return {
      id: "personal-vs-official",
      tone: "warning",
      message: `Your purchasing power is eroding faster than the official CPI suggests — your personal inflation rate is ${gap.toFixed(1)} percentage points higher than the national average.`,
    };
  }
  return {
    id: "personal-vs-official",
    tone: "positive",
    message: `Your spending pattern is shielding you from some inflation — your personal rate is ${Math.abs(gap).toFixed(1)} percentage points lower than the national average.`,
  };
}

/** Real-value erosion of a monthly income figure over a period (caller supplies the % loss, already computed via purchasingPowerEngine — this module only decides whether it's worth surfacing and how to phrase it). */
export function generateIncomeErosionInsight(realValueLossPct: number, periodLabel: string): Insight | null {
  if (realValueLossPct <= INCOME_EROSION_THRESHOLD_PCT) return null;
  return {
    id: "income-erosion",
    tone: "warning",
    message: `Inflation has reduced the real value of your monthly income by ${realValueLossPct.toFixed(1)}% over ${periodLabel} — the same rupee amount now buys noticeably less.`,
  };
}

// Phase 3 — Income & Wealth Intelligence rules. Same deterministic,
// threshold-only approach as the rules above: a raise/savings result is
// either notably good, notably bad, or not worth a callout.
const REAL_RAISE_NEUTRAL_BAND_PCT = 0.5;
const SAVINGS_EROSION_THRESHOLD_PCT = 10;

/** Whether a raise actually grew real income, shrank it, or was roughly a wash — the deterministic verdict behind Raise Reality Check's headline. */
export function generateRealRaiseInsight(realChangePct: number): Insight | null {
  if (Math.abs(realChangePct) <= REAL_RAISE_NEUTRAL_BAND_PCT) {
    return {
      id: "real-raise",
      tone: "neutral",
      message: `Your raise roughly kept pace with inflation — your real (inflation-adjusted) income changed by only ${realChangePct.toFixed(1)}%.`,
    };
  }
  if (realChangePct < 0) {
    return {
      id: "real-raise",
      tone: "warning",
      message: `Despite the nominal raise, inflation outpaced it — your real income actually fell ${Math.abs(realChangePct).toFixed(1)}%.`,
    };
  }
  return {
    id: "real-raise",
    tone: "positive",
    message: `Your raise outpaced inflation — your real income grew ${realChangePct.toFixed(1)}% after accounting for rising prices.`,
  };
}

/** Whether idle savings have lost enough real value over the horizon to be worth flagging. */
export function generateSavingsErosionInsight(erosionPct: number, years: number): Insight | null {
  if (erosionPct <= SAVINGS_EROSION_THRESHOLD_PCT) return null;
  return {
    id: "savings-erosion",
    tone: "warning",
    message: `Left idle for ${years} year${years === 1 ? "" : "s"} at this inflation rate, your savings would lose ${erosionPct.toFixed(1)}% of their real purchasing power.`,
  };
}

// Phase 4 — Time Value of Money rules. Same deterministic, threshold-only
// approach: each rule fires only when the effect is large enough over a
// long enough horizon to be worth a callout, never on every input change.
const DISCOUNT_RATE_IMPACT_THRESHOLD_PCT = 8;
const DISCOUNT_RATE_IMPACT_MIN_YEARS = 10;
// Later-half growth must be at least this many times the earlier-half
// growth before compounding's "back-loaded" shape is worth pointing out —
// avoids firing on short/near-linear horizons where it isn't yet visible.
const LATE_GROWTH_DOMINANCE_RATIO = 1.5;
// Minimum effective-annual-rate improvement (percentage points) a switch
// to monthly compounding would need to produce before it's worth
// surfacing — a few basis points isn't a meaningful "materially improves."
const FREQUENCY_UPGRADE_THRESHOLD_PP = 0.15;

/** Whether the chosen discount rate, over a long enough horizon, meaningfully shrinks how much a future rupee is worth today — the deterministic callout behind Present Value / Discount Factor Explorer's "your rate matters a lot over time" message. */
export function generateDiscountRateImpactInsight(discountRatePct: number, years: number): Insight | null {
  if (discountRatePct < DISCOUNT_RATE_IMPACT_THRESHOLD_PCT || years < DISCOUNT_RATE_IMPACT_MIN_YEARS) return null;
  return {
    id: "discount-rate-impact",
    tone: "warning",
    message: `Your ${discountRatePct.toFixed(1)}% discount rate significantly reduces long-term value — at this rate, money received in ${years} years is worth only a fraction of its face amount today.`,
  };
}

/** Whether growth in the second half of the horizon dwarfs growth in the first half — the concrete, numeric evidence behind "most of your investment growth happens in later years due to compounding." Callers supply the two halves' growth amounts (endingValue − startingValue for each half) rather than this module recomputing a series itself. */
export function generateCompoundingAccelerationInsight(firstHalfGrowth: number, secondHalfGrowth: number): Insight | null {
  if (firstHalfGrowth <= 0 || secondHalfGrowth / firstHalfGrowth < LATE_GROWTH_DOMINANCE_RATIO) return null;
  return {
    id: "compounding-acceleration",
    tone: "positive",
    message: "Most of your growth happens in the later years, not the earlier ones — compounding accelerates over time, so staying invested for the full horizon matters more than the early years suggest.",
  };
}

/** Whether compounding more frequently (monthly) would meaningfully raise the effective annual rate compared to the visitor's chosen frequency — the deterministic evidence behind "a higher contribution/compounding frequency materially improves long-term wealth." */
export function generateContributionFrequencyInsight(currentEffectiveAnnualRatePct: number, monthlyEffectiveAnnualRatePct: number): Insight | null {
  if (monthlyEffectiveAnnualRatePct - currentEffectiveAnnualRatePct < FREQUENCY_UPGRADE_THRESHOLD_PP) return null;
  return {
    id: "contribution-frequency",
    tone: "neutral",
    message: `A higher compounding frequency would materially improve your long-term wealth — switching to monthly compounding would raise your effective annual rate from ${currentEffectiveAnnualRatePct.toFixed(2)}% to ${monthlyEffectiveAnnualRatePct.toFixed(2)}%.`,
  };
}

// Phase 5 — Investment Intelligence rules. Same deterministic, threshold-
// only approach: each rule fires only when the effect is large enough to
// be worth a callout.
const INFLATION_GAIN_ELIMINATION_THRESHOLD_PCT = 15;
const ASSET_PROTECTION_GAP_THRESHOLD_PP = 1;
const CONSECUTIVE_NEGATIVE_REAL_RETURN_THRESHOLD_YEARS = 2;
const COMPOUNDING_DOMINANCE_THRESHOLD_PCT = 50;

/** What share of a nominal investment gain inflation actually ate — the deterministic evidence behind "inflation eliminated X% of your nominal investment gains." */
export function generateInflationGainEliminationInsight(nominalGainAmount: number, realGainAmount: number): Insight | null {
  if (nominalGainAmount <= 0) return null;
  const eliminatedPct = ((nominalGainAmount - realGainAmount) / nominalGainAmount) * 100;
  if (eliminatedPct <= INFLATION_GAIN_ELIMINATION_THRESHOLD_PCT) return null;
  return {
    id: "inflation-gain-elimination",
    tone: "warning",
    message: `Inflation eliminated ${eliminatedPct.toFixed(0)}% of your nominal investment gains — your real gain is substantially smaller than your statement's headline return.`,
  };
}

/** Compares two named assets' real returns — the deterministic evidence behind "X preserved purchasing power better than Y." */
export function generateAssetProtectionInsight(strongerAssetName: string, strongerRealReturnPct: number, weakerAssetName: string, weakerRealReturnPct: number): Insight | null {
  const gapPp = strongerRealReturnPct - weakerRealReturnPct;
  if (gapPp <= ASSET_PROTECTION_GAP_THRESHOLD_PP) return null;
  return {
    id: "asset-protection-comparison",
    tone: "neutral",
    message: `${strongerAssetName} preserved purchasing power better than ${weakerAssetName} — a real return of ${strongerRealReturnPct.toFixed(1)}% vs. ${weakerRealReturnPct.toFixed(1)}%.`,
  };
}

/** Whether real return has been negative for a meaningful consecutive streak — callers count the streak themselves from a real-return series; this module only decides whether it's worth surfacing. */
export function generateConsecutiveNegativeRealReturnInsight(consecutiveYears: number): Insight | null {
  if (consecutiveYears < CONSECUTIVE_NEGATIVE_REAL_RETURN_THRESHOLD_YEARS) return null;
  return {
    id: "consecutive-negative-real-return",
    tone: "warning",
    message: `Your portfolio's real return has been negative for ${consecutiveYears} consecutive years — nominal gains have not kept pace with inflation over this stretch.`,
  };
}

/** Whether most of a portfolio's total growth came from compounding rather than new contributions — the deterministic evidence behind "most of your wealth growth came from compounding rather than contributions." */
export function generateCompoundingDominanceInsight(compoundingGrowthAmount: number, contributionGrowthAmount: number): Insight | null {
  const totalGrowth = compoundingGrowthAmount + contributionGrowthAmount;
  if (totalGrowth <= 0) return null;
  const compoundingSharePct = (compoundingGrowthAmount / totalGrowth) * 100;
  if (compoundingSharePct <= COMPOUNDING_DOMINANCE_THRESHOLD_PCT) return null;
  return {
    id: "compounding-dominance",
    tone: "positive",
    message: `Most of your wealth growth came from compounding rather than contributions — compounding accounts for ${compoundingSharePct.toFixed(0)}% of your total growth.`,
  };
}

export interface PersonalInsightsInput {
  contributions?: CategoryContribution[];
  personalCpiPct?: number;
  officialCpiPct?: number;
  incomeErosion?: { realValueLossPct: number; periodLabel: string };
  realRaiseChangePct?: number;
  savingsErosion?: { erosionPct: number; years: number };
  discountRateImpact?: { discountRatePct: number; years: number };
  compoundingAcceleration?: { firstHalfGrowth: number; secondHalfGrowth: number };
  contributionFrequency?: { currentEffectiveAnnualRatePct: number; monthlyEffectiveAnnualRatePct: number };
  inflationGainElimination?: { nominalGainAmount: number; realGainAmount: number };
  assetProtection?: { strongerAssetName: string; strongerRealReturnPct: number; weakerAssetName: string; weakerRealReturnPct: number };
  consecutiveNegativeRealReturnYears?: number;
  compoundingDominance?: { compoundingGrowthAmount: number; contributionGrowthAmount: number };
}

/** Runs every applicable rule against whatever inputs are available and returns only the insights that actually fired — callers don't need to know which rules exist, just what data they can supply. */
export function generatePersonalInsights(input: PersonalInsightsInput): Insight[] {
  const insights: Insight[] = [];

  if (input.contributions) {
    const allocationGap = generateAllocationGapInsight(input.contributions);
    if (allocationGap) insights.push(allocationGap);

    const topDriver = generateTopDriverInsight(input.contributions);
    if (topDriver) insights.push(topDriver);
  }

  if (input.personalCpiPct !== undefined && input.officialCpiPct !== undefined) {
    const comparison = generatePersonalVsOfficialInsight(input.personalCpiPct, input.officialCpiPct);
    if (comparison) insights.push(comparison);
  }

  if (input.incomeErosion) {
    const erosion = generateIncomeErosionInsight(input.incomeErosion.realValueLossPct, input.incomeErosion.periodLabel);
    if (erosion) insights.push(erosion);
  }

  if (input.realRaiseChangePct !== undefined) {
    const raise = generateRealRaiseInsight(input.realRaiseChangePct);
    if (raise) insights.push(raise);
  }

  if (input.savingsErosion) {
    const savings = generateSavingsErosionInsight(input.savingsErosion.erosionPct, input.savingsErosion.years);
    if (savings) insights.push(savings);
  }

  if (input.discountRateImpact) {
    const discountImpact = generateDiscountRateImpactInsight(input.discountRateImpact.discountRatePct, input.discountRateImpact.years);
    if (discountImpact) insights.push(discountImpact);
  }

  if (input.compoundingAcceleration) {
    const acceleration = generateCompoundingAccelerationInsight(input.compoundingAcceleration.firstHalfGrowth, input.compoundingAcceleration.secondHalfGrowth);
    if (acceleration) insights.push(acceleration);
  }

  if (input.contributionFrequency) {
    const frequency = generateContributionFrequencyInsight(
      input.contributionFrequency.currentEffectiveAnnualRatePct,
      input.contributionFrequency.monthlyEffectiveAnnualRatePct,
    );
    if (frequency) insights.push(frequency);
  }

  if (input.inflationGainElimination) {
    const elimination = generateInflationGainEliminationInsight(input.inflationGainElimination.nominalGainAmount, input.inflationGainElimination.realGainAmount);
    if (elimination) insights.push(elimination);
  }

  if (input.assetProtection) {
    const protection = generateAssetProtectionInsight(
      input.assetProtection.strongerAssetName,
      input.assetProtection.strongerRealReturnPct,
      input.assetProtection.weakerAssetName,
      input.assetProtection.weakerRealReturnPct,
    );
    if (protection) insights.push(protection);
  }

  if (input.consecutiveNegativeRealReturnYears !== undefined) {
    const streak = generateConsecutiveNegativeRealReturnInsight(input.consecutiveNegativeRealReturnYears);
    if (streak) insights.push(streak);
  }

  if (input.compoundingDominance) {
    const dominance = generateCompoundingDominanceInsight(input.compoundingDominance.compoundingGrowthAmount, input.compoundingDominance.contributionGrowthAmount);
    if (dominance) insights.push(dominance);
  }

  return insights;
}
