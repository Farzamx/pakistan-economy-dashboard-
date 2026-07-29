// Starter household-spending profiles for the Personal Inflation Calculator.
// These are illustrative defaults a user edits from — not official PBS data
// (only the category weights/inflation rates in cpiGroups.ts + the live
// cpi_category_breakdown table are). Each profile's percentages sum to 100
// across the 12 canonical CPI_GROUPS (see cpiGroups.ts), keyed by groupNo.

export interface SpendingScenario {
  id: string;
  labelKey: string; // i18n key for display name
  descriptionKey: string; // i18n key for one-line description
  /** groupNo -> percent of monthly spending, sums to 100. */
  allocationPct: Record<number, number>;
}

export const SCENARIO_PRESETS: SpendingScenario[] = [
  {
    id: "student",
    labelKey: "personalInflation.scenario.student.label",
    descriptionKey: "personalInflation.scenario.student.description",
    allocationPct: {
      1: 30, 2: 1, 3: 5, 4: 20, 5: 2, 6: 3, 7: 10, 8: 8, 9: 5, 10: 10, 11: 5, 12: 1,
    },
  },
  {
    id: "family",
    labelKey: "personalInflation.scenario.family.label",
    descriptionKey: "personalInflation.scenario.family.description",
    allocationPct: {
      1: 32, 2: 0.5, 3: 6, 4: 25, 5: 3, 6: 5, 7: 8, 8: 3, 9: 2, 10: 12, 11: 2.5, 12: 1,
    },
  },
  {
    id: "retired",
    labelKey: "personalInflation.scenario.retired.label",
    descriptionKey: "personalInflation.scenario.retired.description",
    allocationPct: {
      1: 35, 2: 0.5, 3: 3, 4: 30, 5: 3, 6: 15, 7: 5, 8: 2, 9: 2, 10: 0, 11: 3, 12: 1.5,
    },
  },
  {
    id: "small-business",
    labelKey: "personalInflation.scenario.smallBusiness.label",
    descriptionKey: "personalInflation.scenario.smallBusiness.description",
    allocationPct: {
      1: 25, 2: 1, 3: 5, 4: 20, 5: 3, 6: 5, 7: 15, 8: 6, 9: 3, 10: 5, 11: 8, 12: 4,
    },
  },
];

export function getScenarioById(id: string): SpendingScenario | undefined {
  return SCENARIO_PRESETS.find((s) => s.id === id);
}
