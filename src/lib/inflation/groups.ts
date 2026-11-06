// Display names for PBS's 12 CPI expenditure groups.
//
// The canonical (long) names come from src/lib/personalInflation/cpiGroups.ts —
// the one place PBS's taxonomy is defined — so this file only adds the SHORT
// labels a chart axis can afford. Group numbers are PBS's own (1–12) and match
// the PCPI_CP_01…12 series codes in the SDMX file.

import { CPI_GROUPS, CPI_GROUP_BY_NO } from "@/lib/personalInflation/cpiGroups";

const SHORT_NAMES: Record<number, string> = {
  1: "Food & beverages",
  2: "Alcohol & tobacco",
  3: "Clothing & footwear",
  4: "Housing & utilities",
  5: "Furnishings",
  6: "Health",
  7: "Transport",
  8: "Communication",
  9: "Recreation",
  10: "Education",
  11: "Restaurants & hotels",
  12: "Miscellaneous",
};

export interface GroupLabel {
  groupNo: number;
  /** PBS's full name, e.g. "Housing, Water, Electricity, Gas & Fuels". */
  name: string;
  /** Axis-sized label, e.g. "Housing & utilities". */
  short: string;
}

export const GROUP_LABELS: readonly GroupLabel[] = CPI_GROUPS.map((g) => ({
  groupNo: g.groupNo,
  name: g.name,
  short: SHORT_NAMES[g.groupNo] ?? g.name,
}));

export function groupLabel(groupNo: number): GroupLabel {
  const meta = CPI_GROUP_BY_NO.get(groupNo);
  return { groupNo, name: meta?.name ?? `Group ${groupNo}`, short: SHORT_NAMES[groupNo] ?? meta?.name ?? `Group ${groupNo}` };
}

/** The group the page treats as "food": PBS group 1, Food & Non-Alcoholic Beverages. */
export const FOOD_GROUP_NO = 1;

/**
 * The groups the stacked contribution chart names individually. Everything
 * else is folded into one "All other groups" band. The set is FIXED (not
 * chosen by rank each time) so a group keeps the same colour wherever it
 * appears, and it covers the groups that carry most of the basket weight or
 * most of the recent movement.
 */
export const STACK_GROUP_NOS: readonly number[] = [1, 4, 7, 3, 11];
