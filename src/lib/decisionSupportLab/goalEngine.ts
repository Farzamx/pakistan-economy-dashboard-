// Financial Planning Intelligence — Goal Engine (Phase 6, Wave 1).
//
// Composes the existing platform engines rather than re-deriving compounding,
// inflation, or annuity math a second time:
//   - futureValue()/annuityFutureValue() (timeValueEngine.ts) — lump-sum and
//     contribution-stream growth.
//   - projectCompounding() (purchasingPowerEngine.ts) — inflating today's
//     target amount to a future-dated target.
// Every rate is an annual percentage (e.g. 12 for 12%); monthly rates used
// internally are annualRatePct / 12 (nominal monthly), the same convention
// timeValueEngine.ts's presentValueWithFrequency()/futureValueWithFrequency()
// already use for "m" compounding periods per year.
import { futureValue, annuityFutureValue, buildAnnuitySeries } from "@/lib/decisionSupportLab/timeValueEngine";
import { projectCompounding } from "@/lib/decisionSupportLab/purchasingPowerEngine";
import type { Goal } from "@/lib/decisionSupportLab/economicProfile";

export interface GoalAssumptions {
  /** Annual %, applied to the goal's own targetAmountToday. */
  inflationPct: number;
}

/** Whole calendar months between two ISO dates (fromDate treated as "now"), floored — never negative. */
export function monthsBetween(fromDateISO: string, toDateISO: string): number {
  const from = new Date(fromDateISO);
  const to = new Date(toDateISO);
  const months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  return Math.max(0, months);
}

/** Today's-money target amount, inflated forward by `years` at `inflationPct` — a thin, explicitly-named wrapper over projectCompounding() so every goal planner inflates a target the exact same way. */
export function inflateTarget(targetAmountToday: number, inflationPct: number, years: number): number {
  return projectCompounding(targetAmountToday, inflationPct, years);
}

/** Projected future value of a goal's current dedicated savings plus its ongoing monthly contribution stream, over `months` months at `expectedReturnPct` annual (nominal). */
export function projectSavingsGrowth(currentSavingsForGoal: number, monthlyContribution: number, expectedReturnPct: number, months: number): number {
  const monthlyRatePct = expectedReturnPct / 12;
  return futureValue(currentSavingsForGoal, monthlyRatePct, months) + annuityFutureValue(monthlyContribution, monthlyRatePct, months);
}

/**
 * The monthly contribution that would close the gap between the inflated
 * target and the current savings' own growth over `months` months — the
 * algebraic inverse of annuityFutureValue(), solved for `payment`. Clamped
 * to 0 when current savings alone already clear the target (no negative
 * "contribution").
 */
export function requiredMonthlyContribution(targetFutureValue: number, currentSavingsForGoal: number, expectedReturnPct: number, months: number): number {
  if (months <= 0) return 0;
  const monthlyRatePct = expectedReturnPct / 12;
  const r = monthlyRatePct / 100;
  const savingsGrowth = futureValue(currentSavingsForGoal, monthlyRatePct, months);
  const remainingGap = targetFutureValue - savingsGrowth;
  if (remainingGap <= 0) return 0;
  const annuityFactor = r === 0 ? months : (Math.pow(1 + r, months) - 1) / r;
  return remainingGap / annuityFactor;
}

export interface GoalProgressResult {
  monthsToTarget: number;
  yearsToTarget: number;
  inflatedTargetAmount: number;
  projectedFutureValue: number;
  /** Positive = shortfall, negative = surplus (projected value exceeds the inflated target). */
  fundingGapAmount: number;
  fundingGapPct: number;
  isOnTrack: boolean;
  /** What monthlyContribution would need to be, holding everything else fixed, to land exactly on the inflated target. */
  requiredMonthlyContributionValue: number;
}

/** The core "where does this goal stand" computation every planner UI reads from — funding gap, on-track flag, and the contribution that would close the gap. `asOfDateISO` defaults to today; passed explicitly so tests are deterministic. */
export function projectGoalProgress(goal: Goal, assumptions: GoalAssumptions, asOfDateISO: string = new Date().toISOString().slice(0, 10)): GoalProgressResult {
  const monthsToTarget = monthsBetween(asOfDateISO, goal.targetDate);
  const yearsToTarget = monthsToTarget / 12;
  const inflatedTargetAmount = inflateTarget(goal.targetAmountToday, assumptions.inflationPct, yearsToTarget);
  const projectedFutureValue = projectSavingsGrowth(goal.currentSavingsForGoal, goal.monthlyContribution, goal.expectedReturnPct, monthsToTarget);
  const fundingGapAmount = inflatedTargetAmount - projectedFutureValue;
  const fundingGapPct = inflatedTargetAmount > 0 ? (fundingGapAmount / inflatedTargetAmount) * 100 : 0;
  const requiredMonthlyContributionValue = requiredMonthlyContribution(inflatedTargetAmount, goal.currentSavingsForGoal, goal.expectedReturnPct, monthsToTarget);

  return {
    monthsToTarget,
    yearsToTarget,
    inflatedTargetAmount,
    projectedFutureValue,
    fundingGapAmount,
    fundingGapPct,
    isOnTrack: fundingGapAmount <= 0,
    requiredMonthlyContributionValue,
  };
}

export interface GoalTimelinePoint {
  year: number;
  projectedBalance: number;
  /** The target itself, inflated up to this point in the timeline — a rising line, not a flat one, since prices (and therefore the target) rise every year too. */
  inflatedTarget: number;
}

/** Year-by-year balance-vs-target path for the funding-gap chart — reuses buildAnnuitySeries() (contribution stream) rather than reimplementing period-by-period accumulation. */
export function buildGoalTimelineSeries(goal: Goal, assumptions: GoalAssumptions, asOfDateISO: string = new Date().toISOString().slice(0, 10)): GoalTimelinePoint[] {
  const monthsToTarget = monthsBetween(asOfDateISO, goal.targetDate);
  const totalYears = Math.max(1, Math.ceil(monthsToTarget / 12));
  const monthlyRatePct = goal.expectedReturnPct / 12;
  const contributionSeries = buildAnnuitySeries(goal.monthlyContribution, monthlyRatePct, totalYears * 12);

  const points: GoalTimelinePoint[] = [];
  for (let year = 0; year <= totalYears; year++) {
    const monthIndex = Math.min(year * 12, contributionSeries.length - 1);
    const contributionBalance = contributionSeries[monthIndex]?.balance ?? 0;
    const savingsBalance = futureValue(goal.currentSavingsForGoal, monthlyRatePct, Math.min(year * 12, monthsToTarget));
    points.push({
      year,
      projectedBalance: savingsBalance + contributionBalance,
      inflatedTarget: inflateTarget(goal.targetAmountToday, assumptions.inflationPct, year),
    });
  }
  return points;
}

export interface MultiGoalTimelineEntry {
  goalId: string;
  goalName: string;
  points: GoalTimelinePoint[];
}

/**
 * Cross-goal timeline aggregation — built now for the engine layer to be
 * complete, but deliberately NOT wired to any page/route in Wave 1 (per
 * plan §"meta" views: needs 4-5 real planners' worth of goals to be
 * meaningful). Wave 2+'s Goal Timeline Planner page will consume this.
 */
export function buildMultiGoalTimeline(goals: Goal[], assumptions: GoalAssumptions): MultiGoalTimelineEntry[] {
  return goals.map((goal) => ({ goalId: goal.id, goalName: goal.name, points: buildGoalTimelineSeries(goal, assumptions) }));
}
