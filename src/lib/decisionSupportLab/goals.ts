// Financial Planning Intelligence — Goal CRUD helpers. Pure functions only:
// each returns a new Goal[] for the caller to persist via the *existing*
// setEconomicProfile({ goals: nextArray }) — no new Supabase table, no new
// write path. This is the one place every goal-based planner creates/edits/
// removes a goal, so the shape and id/timestamp conventions can never drift
// between planners.
import type { Goal, GoalType, GoalPriority, GoalStatus } from "@/lib/decisionSupportLab/economicProfile";

export interface NewGoalInput {
  name: string;
  goalType: GoalType;
  targetAmountToday: number;
  targetDate: string;
  currentSavingsForGoal: number;
  monthlyContribution: number;
  expectedReturnPct: number;
  priority?: GoalPriority;
}

export function createGoal(input: NewGoalInput): Goal {
  const now = new Date().toISOString();
  return {
    id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: input.name,
    goalType: input.goalType,
    targetAmountToday: input.targetAmountToday,
    targetDate: input.targetDate,
    currentSavingsForGoal: input.currentSavingsForGoal,
    monthlyContribution: input.monthlyContribution,
    expectedReturnPct: input.expectedReturnPct,
    priority: input.priority ?? "medium",
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
}

/** Adds a goal, returning a new array — never mutates `goals`. */
export function addGoal(goals: Goal[], input: NewGoalInput): Goal[] {
  return [...goals, createGoal(input)];
}

export function updateGoal(goals: Goal[], goalId: string, patch: Partial<Omit<Goal, "id" | "createdAt">>): Goal[] {
  return goals.map((g) => (g.id === goalId ? { ...g, ...patch, updatedAt: new Date().toISOString() } : g));
}

export function removeGoal(goals: Goal[], goalId: string): Goal[] {
  return goals.filter((g) => g.id !== goalId);
}

export function setGoalStatus(goals: Goal[], goalId: string, status: GoalStatus): Goal[] {
  return updateGoal(goals, goalId, { status });
}

export function getGoalsByType(goals: Goal[], goalType: GoalType): Goal[] {
  return goals.filter((g) => g.goalType === goalType);
}

/** The one active goal of a given type a single-goal planner (Emergency Fund, Wealth Accumulation) edits — planners of this kind only ever track one goal per type at a time; multiple same-type goals are a Multi-goal Optimization (Wave 4) concept, not this layer's job. */
export function getPrimaryGoalOfType(goals: Goal[], goalType: GoalType): Goal | null {
  const matches = getGoalsByType(goals, goalType).filter((g) => g.status === "active");
  return matches.length > 0 ? matches[matches.length - 1] : null;
}
