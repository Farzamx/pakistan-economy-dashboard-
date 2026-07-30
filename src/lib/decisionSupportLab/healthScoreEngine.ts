// Personal Economic Health Score — deterministic composite engine.
//
// Explicitly NOT an AI/LLM calculation, per the brief: every category
// score below is a plain, documented threshold formula over numbers the
// Lab's OTHER tools already computed (Personal Inflation, Budget
// Allocation, Purchasing Power, Raise Reality Check, Savings Erosion) —
// same reproducible-by-design philosophy as insightEngine.ts, just
// composed into one overall number instead of one-off callouts.
//
// Six categories, matching the brief exactly:
//   1. Personal Inflation   — how high is your OWN inflation rate, in absolute terms
//   2. Inflation Exposure   — how your rate compares to the official/average household (the gap)
//   3. Budget Balance       — income vs. spending
//   4. Purchasing Power     — recent real-income erosion
//   5. Salary Growth        — whether your last raise beat inflation
//   6. Savings Protection   — emergency-fund coverage, discounted by erosion risk
//
// Each category is only "available" if its underlying tool's data exists
// (e.g. Salary Growth needs a recorded raise) — the overall score averages
// only the AVAILABLE categories, so a visitor who's only used one tool
// still gets an honest (if partial) score rather than a fabricated one
// padded with zeros.
import { computeRealRateChange } from "@/lib/decisionSupportLab/purchasingPowerEngine";

export type HealthCategoryId = "personalInflation" | "inflationExposure" | "budgetBalance" | "purchasingPower" | "salaryGrowth" | "savingsProtection";

export interface HealthCategoryResult {
  id: HealthCategoryId;
  score: number;
  available: boolean;
}

export interface HealthScoreInput {
  /** Your own weighted inflation rate (Personal Inflation Calculator), or the official CPI if you haven't set an allocation. */
  personalCpiPct?: number;
  /** Whether personalCpiPct is a TRUE personal rate (household allocation set) rather than a fallback to the official CPI — determines whether "Inflation Exposure" can be scored at all. */
  hasPersonalAllocation?: boolean;
  officialCpiPct?: number;
  monthlyIncome?: number;
  monthlySpending?: number;
  /** % of monthly income's real value lost over the trailing ~12 months (Purchasing Power Calculator's math, anchored to income). */
  incomeErosionPct?: number;
  /** The nominal raise % the visitor recorded (Raise Reality Check / shared state). */
  lastRaisePct?: number;
  savingsAmount?: number;
  /** % of savings' real value projected to erode over the visitor's chosen horizon (Savings Erosion). */
  savingsErosionPct?: number;
}

export interface HealthScoreResult {
  overallScore: number;
  categories: HealthCategoryResult[];
  /** Category ids scoring >= STRENGTH_THRESHOLD, best first. */
  strengths: HealthCategoryId[];
  /** Category ids scoring < WEAKNESS_THRESHOLD, worst first. */
  weaknesses: HealthCategoryId[];
  /** Fraction of the 6 categories that had enough data to score (0-1). */
  dataCompleteness: number;
}

const clamp = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, n));

const STRENGTH_THRESHOLD = 70;
const WEAKNESS_THRESHOLD = 50;

/** Absolute level of your own inflation rate — lower is better. 5% or below scores 100; every additional point costs 6. */
function scorePersonalInflation(personalCpiPct: number): number {
  return clamp(100 - Math.max(0, personalCpiPct - 5) * 6);
}

/** How your rate compares to the official/average-household rate — being below average scores highest. */
function scoreInflationExposure(personalCpiPct: number, officialCpiPct: number): number {
  const gapPp = personalCpiPct - officialCpiPct;
  return clamp(75 - gapPp * 8);
}

/** Savings rate (income minus spending, as % of income) — 0% (breakeven) scores 50; each further point of savings rate is worth 2. */
function scoreBudgetBalance(monthlyIncome: number, monthlySpending: number): number {
  if (monthlyIncome <= 0) return 50;
  const savingsRatePct = ((monthlyIncome - monthlySpending) / monthlyIncome) * 100;
  return clamp(50 + savingsRatePct * 2);
}

/** Recent real-income erosion — 0% loss scores 100; every point of erosion costs 8. */
function scorePurchasingPower(incomeErosionPct: number): number {
  return clamp(100 - incomeErosionPct * 8);
}

/** Real change from your last raise (reuses computeRealRateChange) — flat (0%) real change scores 50; each point of real gain/loss is worth 10. */
function scoreSalaryGrowth(lastRaisePct: number, officialCpiPct: number): number {
  const realChangePct = computeRealRateChange(lastRaisePct, officialCpiPct);
  return clamp(50 + realChangePct * 10);
}

/** Emergency-fund coverage in months of spending — 6 months scores 100 — discounted if a meaningful share of that cushion is itself projected to erode. */
function scoreSavingsProtection(savingsAmount: number, monthlySpending: number, savingsErosionPct: number | undefined): number {
  const monthsCovered = monthlySpending > 0 ? savingsAmount / monthlySpending : 0;
  const coverageScore = clamp((monthsCovered / 6) * 100);
  if (savingsErosionPct === undefined) return coverageScore;
  // Erosion above 10% starts shaving points off an otherwise-adequate cushion — a fund that looks sufficient today but will be eaten by inflation isn't fully "protected."
  const erosionPenalty = Math.max(0, savingsErosionPct - 10) * 0.5;
  return clamp(coverageScore - erosionPenalty);
}

export function computeHealthScore(input: HealthScoreInput): HealthScoreResult {
  const categories: HealthCategoryResult[] = [];

  const havePersonal = input.personalCpiPct !== undefined;
  categories.push({ id: "personalInflation", score: havePersonal ? scorePersonalInflation(input.personalCpiPct!) : 0, available: havePersonal });

  const haveExposure = input.hasPersonalAllocation === true && input.personalCpiPct !== undefined && input.officialCpiPct !== undefined;
  categories.push({ id: "inflationExposure", score: haveExposure ? scoreInflationExposure(input.personalCpiPct!, input.officialCpiPct!) : 0, available: haveExposure });

  const haveBudget = input.monthlyIncome !== undefined && input.monthlyIncome > 0 && input.monthlySpending !== undefined;
  categories.push({ id: "budgetBalance", score: haveBudget ? scoreBudgetBalance(input.monthlyIncome!, input.monthlySpending!) : 0, available: haveBudget });

  const havePurchasingPower = input.incomeErosionPct !== undefined;
  categories.push({ id: "purchasingPower", score: havePurchasingPower ? scorePurchasingPower(input.incomeErosionPct!) : 0, available: havePurchasingPower });

  const haveSalaryGrowth = input.lastRaisePct !== undefined && input.lastRaisePct > 0 && input.officialCpiPct !== undefined;
  categories.push({ id: "salaryGrowth", score: haveSalaryGrowth ? scoreSalaryGrowth(input.lastRaisePct!, input.officialCpiPct!) : 0, available: haveSalaryGrowth });

  const haveSavings = input.savingsAmount !== undefined && input.savingsAmount > 0 && input.monthlySpending !== undefined && input.monthlySpending > 0;
  categories.push({ id: "savingsProtection", score: haveSavings ? scoreSavingsProtection(input.savingsAmount!, input.monthlySpending!, input.savingsErosionPct) : 0, available: haveSavings });

  const available = categories.filter((c) => c.available);
  const overallScore = available.length > 0 ? Math.round(available.reduce((sum, c) => sum + c.score, 0) / available.length) : 0;

  const rankedAvailable = [...available].sort((a, b) => b.score - a.score);
  const strengths = rankedAvailable.filter((c) => c.score >= STRENGTH_THRESHOLD).map((c) => c.id);
  const weaknesses = [...rankedAvailable].sort((a, b) => a.score - b.score).filter((c) => c.score < WEAKNESS_THRESHOLD).map((c) => c.id);

  return {
    overallScore,
    categories,
    strengths,
    weaknesses,
    dataCompleteness: available.length / categories.length,
  };
}

/** Maps a weak/missing category to the Lab tool that would improve or unlock it — the concrete mechanism behind "Suggested Next Calculations." */
export const CATEGORY_TOOL_HREF: Record<HealthCategoryId, string> = {
  personalInflation: "/decision-support-lab/personal-inflation",
  inflationExposure: "/decision-support-lab/personal-inflation",
  budgetBalance: "/decision-support-lab/budget-allocation",
  purchasingPower: "/decision-support-lab/purchasing-power",
  salaryGrowth: "/decision-support-lab/raise-reality-check",
  savingsProtection: "/decision-support-lab/savings-erosion",
};
