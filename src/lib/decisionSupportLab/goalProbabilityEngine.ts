// Financial Planning Intelligence — Goal Probability Engine (Phase 6, Wave 1).
//
// Runs a genuine random-trial Monte Carlo simulation (not a closed-form
// shortcut) while staying fully deterministic: the PRNG is seeded from a
// hash of the goal's own numeric inputs, so re-running the exact same goal
// and assumptions always reproduces the exact same trials and the exact
// same result — required for a saved Calculation Snapshot or downloaded
// report to mean anything on reload. No call in this file ever touches
// Math.random().
import { inflateTarget, monthsBetween, type GoalAssumptions } from "@/lib/decisionSupportLab/goalEngine";
import type { Goal } from "@/lib/decisionSupportLab/economicProfile";

/** Deterministic 32-bit hash (djb2 variant) of a string into a PRNG seed — same string always produces the same seed. */
function hashStringToSeed(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return hash >>> 0;
}

/** mulberry32 — a small, fast, seeded PRNG. Same seed always produces the same sequence of [0,1) values, on any machine. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard-normal sample via the Box-Muller transform, scaled to `mean`/`stdDev` — the two [0,1) draws come from the same seeded generator, so the result is deterministic per-seed. */
function sampleNormal(rand: () => number, mean: number, stdDev: number): number {
  const u1 = Math.max(rand(), 1e-9); // avoid log(0)
  const u2 = rand();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stdDev;
}

function percentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return 0;
  const index = Math.min(sortedValues.length - 1, Math.floor((p / 100) * sortedValues.length));
  return sortedValues[index];
}

export interface MonteCarloAssumptions extends GoalAssumptions {
  /** Annual standard deviation of returns, in percentage points — the volatility a goal's chosen asset mix implies. Callers should source this from a documented assumption (e.g. investmentEngine.ts's ASSET_VOLATILITY_FALLBACK_PCT for the relevant asset class), never a bare guess with no label. */
  volatilityPct: number;
}

export interface MonteCarloResult {
  trials: number;
  successProbabilityPct: number;
  targetAmount: number;
  p10FutureValue: number;
  p50FutureValue: number;
  p90FutureValue: number;
}

/**
 * Simulates `trials` independent yearly-return paths for a goal's
 * accumulation (current dedicated savings + monthly contributions,
 * compounded once per year at a return sampled from Normal(expectedReturnPct,
 * volatilityPct)), and reports the share of paths that reach the inflated
 * target by the target date, plus the P10/P50/P90 outcome.
 *
 * Deliberately annual-step, not monthly-step: 1000 trials × ~20-40 years is
 * already tens of thousands of draws, comfortably fast client-side; monthly
 * steps would add 12x the draws for no material accuracy gain at this
 * horizon. Contributions are added at each year's end (ordinary-annuity
 * convention, matching timeValueEngine.ts's own default).
 */
export function runGoalMonteCarlo(goal: Goal, assumptions: MonteCarloAssumptions, trials: number = 1000, asOfDateISO: string = new Date().toISOString().slice(0, 10)): MonteCarloResult {
  const monthsToTarget = monthsBetween(asOfDateISO, goal.targetDate);
  const years = Math.max(1, Math.ceil(monthsToTarget / 12));
  const annualContribution = goal.monthlyContribution * 12;
  const targetAmount = inflateTarget(goal.targetAmountToday, assumptions.inflationPct, monthsToTarget / 12);

  const seed = hashStringToSeed(
    `${goal.id}|${goal.targetAmountToday}|${goal.currentSavingsForGoal}|${goal.monthlyContribution}|${goal.expectedReturnPct}|${assumptions.inflationPct}|${assumptions.volatilityPct}|${goal.targetDate}|${asOfDateISO}`,
  );
  const rand = mulberry32(seed);

  const outcomes: number[] = [];
  let successes = 0;
  for (let trial = 0; trial < trials; trial++) {
    let balance = goal.currentSavingsForGoal;
    for (let year = 0; year < years; year++) {
      const yearReturnPct = sampleNormal(rand, goal.expectedReturnPct, assumptions.volatilityPct);
      balance = balance * (1 + yearReturnPct / 100) + annualContribution;
    }
    outcomes.push(balance);
    if (balance >= targetAmount) successes++;
  }
  outcomes.sort((a, b) => a - b);

  return {
    trials,
    successProbabilityPct: (successes / trials) * 100,
    targetAmount,
    p10FutureValue: percentile(outcomes, 10),
    p50FutureValue: percentile(outcomes, 50),
    p90FutureValue: percentile(outcomes, 90),
  };
}

export type SensitivityParameter = "expectedReturnPct" | "monthlyContribution" | "inflationPct" | "targetDate";

export interface SensitivityRow {
  parameter: SensitivityParameter;
  label: string;
  fundingGapPct: number;
  isOnTrack: boolean;
}

/**
 * Deterministic (non-Monte-Carlo) sensitivity table: reruns the plain
 * funding-gap projection with one input perturbed at a time, holding the
 * rest fixed — the standard "how sensitive is the outcome to each
 * assumption" view, distinct from (and complementary to) the probabilistic
 * Monte Carlo result above.
 */
export function runSensitivityAnalysis(goal: Goal, assumptions: GoalAssumptions, projectFn: (g: Goal, a: GoalAssumptions) => { fundingGapPct: number; isOnTrack: boolean }): SensitivityRow[] {
  const variants: { parameter: SensitivityParameter; label: string; goal: Goal; assumptions: GoalAssumptions }[] = [
    { parameter: "expectedReturnPct", label: "Return −2pp", goal: { ...goal, expectedReturnPct: goal.expectedReturnPct - 2 }, assumptions },
    { parameter: "expectedReturnPct", label: "Return +2pp", goal: { ...goal, expectedReturnPct: goal.expectedReturnPct + 2 }, assumptions },
    { parameter: "monthlyContribution", label: "Contribution −20%", goal: { ...goal, monthlyContribution: goal.monthlyContribution * 0.8 }, assumptions },
    { parameter: "monthlyContribution", label: "Contribution +20%", goal: { ...goal, monthlyContribution: goal.monthlyContribution * 1.2 }, assumptions },
    { parameter: "inflationPct", label: "Inflation −2pp", goal, assumptions: { ...assumptions, inflationPct: assumptions.inflationPct - 2 } },
    { parameter: "inflationPct", label: "Inflation +2pp", goal, assumptions: { ...assumptions, inflationPct: assumptions.inflationPct + 2 } },
  ];

  return variants.map((v) => {
    const result = projectFn(v.goal, v.assumptions);
    return { parameter: v.parameter, label: v.label, fundingGapPct: result.fundingGapPct, isOnTrack: result.isOnTrack };
  });
}
