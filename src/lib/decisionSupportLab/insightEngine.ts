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

export interface PersonalInsightsInput {
  contributions?: CategoryContribution[];
  personalCpiPct?: number;
  officialCpiPct?: number;
  incomeErosion?: { realValueLossPct: number; periodLabel: string };
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

  return insights;
}
