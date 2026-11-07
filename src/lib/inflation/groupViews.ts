// Views of the CPI-group data for the Inflation page: the arithmetic behind each
// group chart and table, as tested functions rather than inline component code.
//
// Units, once more, because they are easy to confuse here:
//   weight        % of the basket (fixed 2015-16)        — a SIZE
//   yoy / mom     % change of the group's own index      — a RATE
//   contribution  percentage points of the HEADLINE move — a SHARE OF A CHANGE
// None of these is derivable from another without the index, and none is ever
// shown in a column or axis labelled as another.

import { rankDescending, type ContributionRow } from "@/lib/inflation/analytics";
import { GROUP_LABELS, STACK_GROUP_NOS, groupLabel } from "@/lib/inflation/groups";
import { monthLabel, shiftMonth, shortMonthLabel, type MonthKey, type MonthlyPoint } from "@/lib/inflation/periods";
import type { GroupModel } from "@/lib/inflation/viewModel";
import type { HeatRow } from "@/components/analytics/Heatmap";

export type GroupMeasure = "yoy" | "mom";

export function valueAt(points: readonly MonthlyPoint[] | undefined, month: MonthKey): number | null {
  const p = points?.find((x) => x.month === month);
  return p ? p.value : null;
}

/** Months for which every group has a full year-on-year decomposition, ascending. */
export function groupMonths(model: GroupModel): MonthKey[] {
  return model.contribYoY.map((r) => r.month);
}

export function groupNos(model: GroupModel): number[] {
  return Object.keys(model.weights).map(Number).sort((a, b) => a - b);
}

export interface GroupAt {
  groupNo: number;
  name: string;
  short: string;
  weight: number;
  value: number | null;
}

/** Each group's rate at a month, in PBS group order. */
export function groupRatesAt(model: GroupModel, month: MonthKey, measure: GroupMeasure = "yoy"): GroupAt[] {
  const src = measure === "yoy" ? model.yoy : model.mom;
  return groupNos(model).map((no) => ({ groupNo: no, name: groupLabel(no).name, short: groupLabel(no).short, weight: model.weights[no], value: valueAt(src[no], month) }));
}

/** Groups sorted by rate, highest first; groups with no reading go last, in PBS order. */
export function rankedByRate(rows: readonly GroupAt[]): GroupAt[] {
  const have = rows.filter((r) => r.value !== null);
  const none = rows.filter((r) => r.value === null);
  return [...rankDescending(have, (r) => r.value as number), ...none];
}

export function contributionRowAt(model: GroupModel, month: MonthKey): ContributionRow | undefined {
  return model.contribYoY.find((r) => r.month === month);
}

export interface TableRow {
  groupNo: number;
  name: string;
  weight: number;
  yoy: number | null;
  previousYoy: number | null;
  /** yoy − previousYoy, percentage points; null if either is missing. */
  change: number | null;
  /** Contribution to the headline YoY change, percentage points. */
  contribution: number | null;
}

/** The component comparison table: sorted by contribution, largest first. */
export function componentTable(model: GroupModel, month: MonthKey): { rows: TableRow[]; total: { weight: number; contribution: number; headlinePct: number } | null } {
  const prev = shiftMonth(month, -1);
  const c = contributionRowAt(model, month);
  const rows: TableRow[] = groupNos(model).map((no) => {
    const yoy = valueAt(model.yoy[no], month);
    const previousYoy = valueAt(model.yoy[no], prev);
    return {
      groupNo: no,
      name: groupLabel(no).name,
      weight: model.weights[no],
      yoy,
      previousYoy,
      change: yoy !== null && previousYoy !== null ? yoy - previousYoy : null,
      contribution: c ? c.byGroup[no] : null,
    };
  });
  const sorted = [...rows.filter((r) => r.contribution !== null)].sort((a, b) => (b.contribution as number) - (a.contribution as number));
  const unsorted = rows.filter((r) => r.contribution === null);
  return {
    rows: [...sorted, ...unsorted],
    total: c ? { weight: rows.reduce((s, r) => s + r.weight, 0), contribution: c.total, headlinePct: c.headlinePct } : null,
  };
}

/** Heatmap rows: one per group, one cell per column month; null where the group has no value that month. */
export function groupHeatRows(model: GroupModel, months: readonly MonthKey[], measure: GroupMeasure): HeatRow[] {
  const src = measure === "yoy" ? model.yoy : model.mom;
  const idx = Object.fromEntries(groupNos(model).map((no) => [no, new Map((src[no] ?? []).map((p) => [p.month, p.value]))]));
  return groupNos(model).map((no) => ({ key: String(no), label: groupLabel(no).short, cells: months.map((m) => (idx[no].get(m) ?? null) as number | null) }));
}

/** Months a measure has values for in at least one group, ascending. */
export function measureMonths(model: GroupModel, measure: GroupMeasure): MonthKey[] {
  const src = measure === "yoy" ? model.yoy : model.mom;
  return [...new Set(Object.values(src).flatMap((pts) => pts.map((p) => p.month)))].sort();
}

/** The fixed colours of the stacked contribution chart: named groups, then one folded band. */
export const STACK_COLORS: Record<number, "blue" | "orange" | "teal" | "purple" | "amber"> = { 1: "blue", 4: "orange", 7: "teal", 3: "purple", 11: "amber" };

export interface StackRow {
  period: string;
  month: MonthKey;
  total: number;
  [key: string]: number | string;
}

/**
 * Contributions per month for the stacked chart: each named group, plus "other"
 * (the sum of the unnamed groups). The bands add up to `total` by construction.
 */
export function stackedContributions(model: GroupModel, months: readonly MonthKey[]): StackRow[] {
  const named = new Set(STACK_GROUP_NOS);
  const byMonth = new Map(model.contribYoY.map((r) => [r.month, r]));
  const rows: StackRow[] = [];
  for (const m of months) {
    const r = byMonth.get(m);
    if (!r) continue;
    const row: StackRow = { period: shortMonthLabel(m), month: m, total: r.total, other: 0 };
    let other = 0;
    for (const [no, c] of Object.entries(r.byGroup)) {
      if (named.has(Number(no))) row[`g${no}`] = c;
      else other += c;
    }
    row.other = other;
    rows.push(row);
  }
  return rows;
}

export const STACK_SERIES = [
  ...STACK_GROUP_NOS.map((no) => ({ key: `g${no}`, label: groupLabel(no).short, color: STACK_COLORS[no] })),
  { key: "other", label: "All other groups", color: "slate" as const },
];

/** "Oct 2026" labels for a select. */
export function monthOptions(months: readonly MonthKey[]): { value: MonthKey; label: string }[] {
  return [...months].reverse().map((m) => ({ value: m, label: monthLabel(m) }));
}

export { GROUP_LABELS };
