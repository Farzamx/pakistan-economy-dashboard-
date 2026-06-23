// Derives every chart-ready shape the Provincial Budget Workshop needs from
// the static PROVINCIAL_BUDGET_HISTORICAL dataset — mirrors
// src/lib/budget/budgetData.ts's role for the Federal Budget Workshop.
// Pure, synchronous, no IO: provincial Budget in Brief equivalents are
// PDFs published once a year per province, so every function here just
// transforms the static dataset, same as federal.

import {
  PROVINCIAL_BUDGET_HISTORICAL,
  type ProvinceId,
  type ProvincialBudgetYearRecord,
} from "@/data/provincialBudgetHistorical";
import { getEstimatedPopulation } from "@/data/provincialPopulation";

export function getProvinceYears(province: ProvinceId): ProvincialBudgetYearRecord[] {
  return PROVINCIAL_BUDGET_HISTORICAL[province].years;
}

export function getProvinceYearRecord(province: ProvinceId, fiscalYear: string): ProvincialBudgetYearRecord | undefined {
  return getProvinceYears(province).find((y) => y.fiscalYear === fiscalYear);
}

export function getLatestProvinceYear(province: ProvinceId): ProvincialBudgetYearRecord {
  const years = getProvinceYears(province);
  return years[years.length - 1];
}

export function getPreviousProvinceYearRecord(province: ProvinceId, fiscalYear: string): ProvincialBudgetYearRecord | undefined {
  const years = getProvinceYears(province);
  const idx = years.findIndex((y) => y.fiscalYear === fiscalYear);
  return idx > 0 ? years[idx - 1] : undefined;
}

export interface YoyChange {
  absolute: number;
  pct: number;
  direction: "up" | "down" | "flat";
}

/** Same null-safety contract as the federal getYoyChange: never forward-fills or treats a missing figure as zero. */
export function getProvinceYoyChange(
  field: keyof ProvincialBudgetYearRecord,
  current: ProvincialBudgetYearRecord,
  previous: ProvincialBudgetYearRecord | undefined,
): YoyChange | null {
  if (!previous) return null;
  const curVal = current[field];
  const prevVal = previous[field];
  if (typeof curVal !== "number" || typeof prevVal !== "number") return null;
  const absolute = curVal - prevVal;
  const pct = prevVal !== 0 ? (absolute / Math.abs(prevVal)) * 100 : 0;
  return { absolute, pct, direction: pct > 0.05 ? "up" : pct < -0.05 ? "down" : "flat" };
}

export interface ProvincialAllocationSlice {
  label: string;
  value: number;
  pct: number;
  color: string;
}

const ALLOCATION_COLORS: Record<string, string> = {
  Education: "#34d399",
  Health: "#fb7185",
  Agriculture: "#f59e0b",
  "Local Government": "#a855f7",
  Infrastructure: "#38bdf8",
  "Debt Servicing": "#818cf8",
  Other: "#64748b",
};

/**
 * "Where does [Province]'s budget go" — a slice per named sector field that
 * actually has a value for this year (null fields are omitted, not shown as
 * zero), plus an "Other" residual against Total Outlay. Unlike the federal
 * version, there's no single shared "envelope" concept here since each
 * province's own document structure differs (see provincialBudgetHistorical.ts
 * notes per record) — this is a simpler, more conservative breakdown that
 * never invents a number a province's own documents don't state.
 */
export function getProvincialAllocationBreakdown(year: ProvincialBudgetYearRecord): ProvincialAllocationSlice[] {
  const named: { label: string; value: number | null }[] = [
    { label: "Education", value: year.education },
    { label: "Health", value: year.health },
    { label: "Agriculture", value: year.agriculture },
    { label: "Local Government", value: year.localGovernment },
    { label: "Infrastructure", value: year.infrastructure },
    { label: "Debt Servicing", value: year.debtServicing },
  ];
  const presentNamed = named.filter((s): s is { label: string; value: number } => typeof s.value === "number");
  const namedTotal = presentNamed.reduce((s, x) => s + x.value, 0);
  const other = Math.max(0, year.totalOutlay - namedTotal);

  const slices = [...presentNamed, { label: "Other", value: other }];
  return slices.map((s) => ({
    ...s,
    pct: year.totalOutlay > 0 ? (s.value / year.totalOutlay) * 100 : 0,
    color: ALLOCATION_COLORS[s.label] ?? "#64748b",
  }));
}

export interface ProvincialRs100Slice {
  label: string;
  rsPerHundred: number;
  color: string;
}

/** Same rounding-residue convention as the federal Rs100 breakdown: every slice rounds independently, and the residue is absorbed into "Other" rather than nudging named categories. */
export function getProvincialRs100Breakdown(year: ProvincialBudgetYearRecord): ProvincialRs100Slice[] {
  const breakdown = getProvincialAllocationBreakdown(year);
  const rounded = breakdown.map((s) => ({ label: s.label, rsPerHundred: Math.round(s.pct), color: s.color }));
  const sum = rounded.reduce((s, x) => s + x.rsPerHundred, 0);
  const residue = 100 - sum;
  const otherIdx = rounded.findIndex((s) => s.label === "Other");
  if (otherIdx >= 0) rounded[otherIdx].rsPerHundred += residue;
  return rounded;
}

export interface PerCitizenMetric {
  label: string;
  rsPerCitizen: number | null;
}

/** Phase 9 — per-citizen spending, divided by getEstimatedPopulation (documented estimate, not a second census). null where the underlying field is null, never silently treated as zero. */
export function getPerCitizenMetrics(province: ProvinceId, year: ProvincialBudgetYearRecord): PerCitizenMetric[] {
  const population = getEstimatedPopulation(province, year.fiscalYear);
  const toRsPerCitizen = (valueBn: number | null): number | null =>
    valueBn === null ? null : (valueBn * 1_000_000_000) / population;

  return [
    { label: "Education", rsPerCitizen: toRsPerCitizen(year.education) },
    { label: "Health", rsPerCitizen: toRsPerCitizen(year.health) },
    { label: "Development", rsPerCitizen: toRsPerCitizen(year.developmentBudget) },
    { label: "Debt Burden", rsPerCitizen: toRsPerCitizen(year.debtServicing) },
  ];
}

export type ProvincialTrendField =
  | "totalOutlay"
  | "developmentBudget"
  | "currentExpenditure"
  | "education"
  | "health"
  | "agriculture"
  | "localGovernment"
  | "infrastructure"
  | "debtServicing"
  | "ownRevenue"
  | "federalTransfers"
  | "fiscalBalance";

export interface ProvincialTrendPoint {
  fiscalYear: string;
  values: Record<string, number | null>;
}

export function getProvincialTrendSeries(province: ProvinceId, fields: ProvincialTrendField[]): ProvincialTrendPoint[] {
  return getProvinceYears(province).map((year) => {
    const values: Record<string, number | null> = {};
    for (const field of fields) values[field] = year[field];
    return { fiscalYear: year.fiscalYear, values };
  });
}
