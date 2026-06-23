// Provincial Debt Intelligence (Phase 8) — deterministic comparisons of a
// province's debt servicing against its education, health, and development
// spending, plus debt-per-citizen. No AI: every figure here is a direct
// ratio over PROVINCIAL_BUDGET_HISTORICAL and provincialPopulation.ts.

import { type ProvinceId } from "@/data/provincialBudgetHistorical";
import { getEstimatedPopulation } from "@/data/provincialPopulation";
import { getLatestProvinceYear, getPreviousProvinceYearRecord, getProvinceYoyChange } from "./provincialBudgetData";

export interface DebtComparisonRow {
  label: string;
  debtValue: number | null;
  otherValue: number | null;
  /** debtValue / otherValue, as a ratio — e.g. 1.4 means debt servicing is 1.4x this category. Null if either side is missing. */
  ratio: number | null;
}

export interface ProvincialDebtSnapshot {
  fiscalYear: string;
  debtServicing: number | null;
  debtServicingYoyPct: number | null;
  debtPerCitizen: number | null;
  comparisons: DebtComparisonRow[];
}

function ratio(a: number | null, b: number | null): number | null {
  if (a === null || b === null || b === 0) return null;
  return a / b;
}

export function getProvincialDebtSnapshot(province: ProvinceId): ProvincialDebtSnapshot {
  const year = getLatestProvinceYear(province);
  const previous = getPreviousProvinceYearRecord(province, year.fiscalYear);
  const yoy = getProvinceYoyChange("debtServicing", year, previous);
  const population = getEstimatedPopulation(province, year.fiscalYear);

  const debtPerCitizen =
    year.debtServicing === null ? null : (year.debtServicing * 1_000_000_000) / population;

  return {
    fiscalYear: year.fiscalYear,
    debtServicing: year.debtServicing,
    debtServicingYoyPct: yoy?.pct ?? null,
    debtPerCitizen,
    comparisons: [
      { label: "Debt Servicing vs. Education", debtValue: year.debtServicing, otherValue: year.education, ratio: ratio(year.debtServicing, year.education) },
      { label: "Debt Servicing vs. Health", debtValue: year.debtServicing, otherValue: year.health, ratio: ratio(year.debtServicing, year.health) },
      { label: "Debt Servicing vs. Development Budget", debtValue: year.debtServicing, otherValue: year.developmentBudget, ratio: ratio(year.debtServicing, year.developmentBudget) },
    ],
  };
}
