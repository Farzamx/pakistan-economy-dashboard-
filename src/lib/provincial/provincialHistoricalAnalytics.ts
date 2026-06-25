// Historical analytics derived from PROVINCIAL_BUDGET_HISTORICAL — CAGR,
// YoY growth, and per-capita time series. Mirrors the null-safety discipline
// of provincialBudgetData.ts: every function here skips years where the
// needed field is null rather than treating null as zero or interpolating,
// since the underlying dataset documents real source gaps, not missing-but-
// inferable data.

import { getProvinceYears } from "./provincialBudgetData";
import { getEstimatedPopulation } from "@/data/provincialPopulation";
import type { ProvinceId, ProvincialBudgetYearRecord } from "@/data/provincialBudgetHistorical";
import type { ProvincialTrendField } from "./provincialBudgetData";

function fiscalYearStartYear(fiscalYear: string): number {
  return parseInt(fiscalYear.split("-")[0], 10);
}

export interface CagrResult {
  fromYear: string;
  toYear: string;
  fromValue: number;
  toValue: number;
  years: number;
  cagrPct: number;
}

/**
 * Compound annual growth rate between the EARLIEST and LATEST non-null data
 * points for a field — not simply the first and last array entries, since
 * either end may be null (e.g. Punjab's FY2015-16/FY2019-20 gaps). Returns
 * null if fewer than 2 non-null points exist, or if the earliest value is
 * zero/negative (CAGR undefined).
 */
export function getCagr(province: ProvinceId, field: ProvincialTrendField): CagrResult | null {
  const years = getProvinceYears(province).filter((y) => typeof y[field] === "number");
  if (years.length < 2) return null;

  const first = years[0];
  const last = years[years.length - 1];
  const fromValue = first[field] as number;
  const toValue = last[field] as number;
  if (fromValue <= 0) return null;

  const yearSpan = fiscalYearStartYear(last.fiscalYear) - fiscalYearStartYear(first.fiscalYear);
  if (yearSpan <= 0) return null;

  const cagrPct = (Math.pow(toValue / fromValue, 1 / yearSpan) - 1) * 100;
  return { fromYear: first.fiscalYear, toYear: last.fiscalYear, fromValue, toValue, years: yearSpan, cagrPct };
}

export interface YoyGrowthPoint {
  fiscalYear: string;
  value: number;
  pctChange: number | null;
}

/** Year-over-year % change for a field, computed only between CONSECUTIVE array entries that are both non-null — a gap year (e.g. null FY2019-20) breaks the chain rather than comparing across it silently. */
export function getYoyGrowthSeries(province: ProvinceId, field: ProvincialTrendField): YoyGrowthPoint[] {
  const years = getProvinceYears(province);
  const points: YoyGrowthPoint[] = [];

  for (let i = 0; i < years.length; i++) {
    const value = years[i][field];
    if (typeof value !== "number") continue;

    const prev = i > 0 ? years[i - 1] : undefined;
    const prevValue = prev?.[field];
    const isConsecutiveFy = prev ? fiscalYearStartYear(years[i].fiscalYear) - fiscalYearStartYear(prev.fiscalYear) === 1 : false;

    const pctChange =
      isConsecutiveFy && typeof prevValue === "number" && prevValue !== 0
        ? ((value - prevValue) / Math.abs(prevValue)) * 100
        : null;

    points.push({ fiscalYear: years[i].fiscalYear, value, pctChange });
  }

  return points;
}

export interface PerCapitaPoint {
  fiscalYear: string;
  rsPerCitizen: number | null;
}

/** Per-citizen time series for one field — same getEstimatedPopulation basis as the single-year getPerCitizenMetrics, just across every year instead of one. */
export function getPerCapitaHistory(province: ProvinceId, field: ProvincialTrendField): PerCapitaPoint[] {
  return getProvinceYears(province).map((year) => {
    const value = year[field];
    if (typeof value !== "number") return { fiscalYear: year.fiscalYear, rsPerCitizen: null };
    const population = getEstimatedPopulation(province, year.fiscalYear);
    return { fiscalYear: year.fiscalYear, rsPerCitizen: (value * 1_000_000_000) / population };
  });
}

/** Per-citizen value for a province's own latest verified year — used for cross-province per-capita ranking/insights (e.g. "X has the highest per-capita budget"), where each province is necessarily compared on its own latest year since years differ by province. Null if that field is null in the latest year. */
export function getLatestPerCapita(province: ProvinceId, field: ProvincialTrendField): number | null {
  const years = getProvinceYears(province);
  const latest = years[years.length - 1];
  const value = latest[field];
  if (typeof value !== "number") return null;
  const population = getEstimatedPopulation(province, latest.fiscalYear);
  return (value * 1_000_000_000) / population;
}

export interface CoverageStats {
  fiscalYearsTracked: number;
  fieldsPopulated: Record<string, number>;
  totalDataPoints: number;
  totalNullPoints: number;
}

const TRACKED_FIELDS: ProvincialTrendField[] = [
  "totalOutlay", "developmentBudget", "currentExpenditure", "education", "health",
  "agriculture", "localGovernment", "infrastructure", "debtServicing", "pension",
  "ownRevenue", "federalTransfers", "fiscalBalance",
];

/** Phase 10 verification helper — counts how many of each field's values are real vs. null across a province's full year range, so coverage can be reported honestly rather than asserted. */
export function getCoverageStats(province: ProvinceId): CoverageStats {
  const years = getProvinceYears(province);
  const fieldsPopulated: Record<string, number> = {};
  let totalDataPoints = 0;

  for (const field of TRACKED_FIELDS) {
    const count = years.filter((y: ProvincialBudgetYearRecord) => typeof y[field] === "number").length;
    fieldsPopulated[field] = count;
    totalDataPoints += count;
  }

  const totalPossible = years.length * TRACKED_FIELDS.length;
  return {
    fiscalYearsTracked: years.length,
    fieldsPopulated,
    totalDataPoints,
    totalNullPoints: totalPossible - totalDataPoints,
  };
}
