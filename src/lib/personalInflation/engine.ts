// Personal Inflation Calculator — calculation engine.
//
// Deliberately split into a generic weighted-rate primitive
// (computeWeightedRate/normalizeWeights) and a personal-inflation-specific
// wrapper (computePersonalInflation) so future PEIC tools that need "weight
// a set of category rates by a spending/allocation distribution" — a
// Household Cost of Living Index, Salary Purchasing Power tracker, or
// Inflation Forecast tool — can reuse the primitive without depending on
// anything Personal-Inflation-specific.
import type { CpiCategoryRow } from "@/lib/data/cpiCategoryBreakdown";
import { canonicalGroupName } from "@/lib/personalInflation/cpiGroups";

/** Weighted sum of ratesPct by weightsPct, both keyed by an arbitrary numeric id (here, CPI groupNo). Weights are treated as already being percentages out of 100 — see normalizeWeights if they aren't guaranteed to sum to 100. */
export function computeWeightedRate(weightsPct: Record<number, number>, ratesPct: Record<number, number>): number {
  let total = 0;
  for (const key of Object.keys(weightsPct)) {
    const id = Number(key);
    const w = weightsPct[id] ?? 0;
    const r = ratesPct[id] ?? 0;
    total += (w / 100) * r;
  }
  return total;
}

/** Rescales an arbitrary set of positive weights to sum to exactly 100 — defensive against float drift (e.g. PKR-spending mode dividing by a total) or a user's percentage inputs summing to 99.6/100.4 rather than exactly 100. */
export function normalizeWeights(weightsPct: Record<number, number>): Record<number, number> {
  const sum = Object.values(weightsPct).reduce((s, v) => s + v, 0);
  if (sum <= 0) return weightsPct;
  const normalized: Record<number, number> = {};
  for (const [k, v] of Object.entries(weightsPct)) normalized[Number(k)] = (v / sum) * 100;
  return normalized;
}

export interface CategoryContribution {
  groupNo: number;
  groupName: string;
  yourWeightPct: number;
  officialWeightPct: number;
  categoryInflationPct: number;
  /** (yourWeightPct/100) * categoryInflationPct — this category's share of YOUR personal rate. */
  yourContributionPct: number;
  /** (officialWeightPct/100) * categoryInflationPct — this category's share of the OFFICIAL rate. */
  officialContributionPct: number;
}

export interface PersonalInflationResult {
  officialCpiPct: number;
  personalCpiPct: number;
  differencePct: number;
  contributions: CategoryContribution[];
  /** Up to 3 categories with the largest |your contribution − official contribution|, i.e. what mainly explains the gap. */
  topDrivers: CategoryContribution[];
}

/**
 * `userWeightsPct` need not sum to exactly 100 — normalized internally.
 * `groups` is the live cpi_category_breakdown data (weight + YoY rate per
 * official group) — never fabricated, always the latest verified PBS
 * release via getLatestCpiCategoryBreakdown().
 */
export function computePersonalInflation(userWeightsPct: Record<number, number>, groups: CpiCategoryRow[]): PersonalInflationResult {
  const normalizedUser = normalizeWeights(userWeightsPct);
  const officialWeights: Record<number, number> = {};
  const rates: Record<number, number> = {};
  for (const g of groups) {
    officialWeights[g.groupNo] = g.weightPct;
    rates[g.groupNo] = g.yoyPctChange;
  }

  const officialCpiPct = computeWeightedRate(officialWeights, rates);
  const personalCpiPct = computeWeightedRate(normalizedUser, rates);

  const contributions: CategoryContribution[] = groups
    .map((g) => {
      const yourWeightPct = normalizedUser[g.groupNo] ?? 0;
      return {
        groupNo: g.groupNo,
        groupName: canonicalGroupName(g.groupNo),
        yourWeightPct,
        officialWeightPct: g.weightPct,
        categoryInflationPct: g.yoyPctChange,
        yourContributionPct: (yourWeightPct / 100) * g.yoyPctChange,
        officialContributionPct: (g.weightPct / 100) * g.yoyPctChange,
      };
    })
    .sort((a, b) => a.groupNo - b.groupNo);

  const topDrivers = [...contributions]
    .sort((a, b) => Math.abs(b.yourContributionPct - b.officialContributionPct) - Math.abs(a.yourContributionPct - a.officialContributionPct))
    .slice(0, 3);

  return {
    officialCpiPct,
    personalCpiPct,
    differencePct: personalCpiPct - officialCpiPct,
    contributions,
    topDrivers,
  };
}

export type VerdictTone = "higher" | "lower" | "neutral";

/** Threshold below which the difference is treated as "in line with" the national average rather than meaningfully higher/lower — avoids a verdict that reads as significant for a 0.1pp rounding-level gap. */
const NEUTRAL_BAND_PCT = 0.3;

export function personalInflationVerdict(differencePct: number): { tone: VerdictTone; i18nKey: string } {
  if (differencePct > NEUTRAL_BAND_PCT) return { tone: "higher", i18nKey: "personalInflation.verdictHigher" };
  if (differencePct < -NEUTRAL_BAND_PCT) return { tone: "lower", i18nKey: "personalInflation.verdictLower" };
  return { tone: "neutral", i18nKey: "personalInflation.verdictNeutral" };
}

/**
 * Natural-language explanation paragraphs. This is generated analytical
 * prose (category names, live numbers) rather than static UI chrome, so —
 * consistent with the AI narrative sections elsewhere in PEIC (e.g.
 * weeklyIntelligence's aiSummary) — it is generated in English only rather
 * than run through the ur/rm i18n system, which covers fixed interface text.
 */
export function generatePersonalInflationExplanation(result: PersonalInflationResult): string[] {
  const { officialCpiPct, personalCpiPct, differencePct, topDrivers } = result;
  const sentences: string[] = [];
  const diffAbs = Math.abs(differencePct).toFixed(1);
  const verdict = personalInflationVerdict(differencePct);

  if (verdict.tone === "neutral") {
    sentences.push(
      `Your personal inflation rate is ${personalCpiPct.toFixed(1)}%, essentially in line with the official CPI of ${officialCpiPct.toFixed(1)}% — your spending mix doesn't diverge much from the average household.`,
    );
    return sentences;
  }

  const direction = verdict.tone === "higher" ? "higher" : "lower";
  sentences.push(
    `Your personal inflation rate is ${personalCpiPct.toFixed(1)}%, compared with the official CPI of ${officialCpiPct.toFixed(1)}% — ${diffAbs} percentage points ${direction} than the national average.`,
  );

  const primary = topDrivers[0];
  if (primary && Math.abs(primary.yourWeightPct - primary.officialWeightPct) > 0.5) {
    const spendsMore = primary.yourWeightPct > primary.officialWeightPct;
    sentences.push(
      `The biggest reason is ${primary.groupName}: you allocate ${primary.yourWeightPct.toFixed(1)}% of spending to it, versus ${primary.officialWeightPct.toFixed(1)}% for the average household, and prices in this category rose ${primary.categoryInflationPct.toFixed(1)}% year-on-year — ${
        spendsMore ? "your heavier exposure to it pulls your personal rate up." : "your lighter exposure to it pulls your personal rate down relative to this category alone."
      }`,
    );
  }

  const shield = [...result.contributions]
    .filter((d) => d.yourWeightPct < d.officialWeightPct - 0.5 && d.categoryInflationPct > officialCpiPct)
    .sort((a, b) => b.categoryInflationPct - a.categoryInflationPct)[0];
  if (shield) {
    sentences.push(
      `Your spending pattern shields you somewhat from inflation in ${shield.groupName}, where you allocate less than the average household (${shield.yourWeightPct.toFixed(1)}% vs. ${shield.officialWeightPct.toFixed(1)}%) even though prices there rose ${shield.categoryInflationPct.toFixed(1)}%.`,
    );
  }

  return sentences;
}
