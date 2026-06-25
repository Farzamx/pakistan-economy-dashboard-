// Province Comparison Engine (Phase 7) — ranks Punjab, Sindh, KP, and
// Balochistan against each other on a single metric at a time. This has no
// federal equivalent: the existing /comparisons feature pairs two *time
// series* (e.g. USD/PKR vs Forex Reserves) for one entity, while this ranks
// four *entities* on one metric — a genuinely different comparison shape,
// built fresh rather than reusing comparisonRegistry.ts's pattern.
//
// Deterministic only — every ranking and insight here is a direct
// calculation over PROVINCIAL_BUDGET_HISTORICAL's latest-year figures, no
// AI generation (Phase 10's explicit requirement).

import { ALL_PROVINCE_IDS, type ProvinceId } from "@/data/provincialBudgetHistorical";
import { getLatestProvinceYear, getProvinceYearRecord, getProvinceYears, type ProvincialTrendField } from "./provincialBudgetData";
import { getProvinceMeta } from "./provincialBudgetRegistry";

export interface ProvinceRankEntry {
  province: ProvinceId;
  name: string;
  value: number | null;
  color: string;
  fiscalYear: string;
}

/** Ranks all 4 provinces on one field using each province's own latest verified year (years differ by province — see provincialBudgetHistorical.ts) — provinces with a null value for this field sort last, not zero. */
export function rankProvincesByField(field: ProvincialTrendField): ProvinceRankEntry[] {
  const entries = ALL_PROVINCE_IDS.map((province) => {
    const year = getLatestProvinceYear(province);
    const meta = getProvinceMeta(province);
    return {
      province,
      name: meta.name,
      value: year[field],
      color: meta.color,
      fiscalYear: year.fiscalYear,
    };
  });
  return entries.sort((a, b) => {
    if (a.value === null) return 1;
    if (b.value === null) return -1;
    return b.value - a.value;
  });
}

/**
 * Ranks all 4 provinces on one field for one SPECIFIC fiscal year — unlike
 * rankProvincesByField, a province with no record for that exact year (or a
 * null value within it) sorts last with value null, rather than silently
 * substituting its latest year. Powers the Province Ranking Dashboard's
 * year selector (Phase 6 of the Historical Explorer build).
 */
export function rankProvincesByFieldForYear(field: ProvincialTrendField, fiscalYear: string): ProvinceRankEntry[] {
  const entries = ALL_PROVINCE_IDS.map((province) => {
    const year = getProvinceYearRecord(province, fiscalYear);
    const meta = getProvinceMeta(province);
    return {
      province,
      name: meta.name,
      value: year ? year[field] : null,
      color: meta.color,
      fiscalYear,
    };
  });
  return entries.sort((a, b) => {
    if (a.value === null) return 1;
    if (b.value === null) return -1;
    return b.value - a.value;
  });
}

/** Every fiscal year that at least one province has a record for — used to populate the Ranking Dashboard's year selector so it never offers a year with zero data across all provinces. */
export function getAllRankableFiscalYears(): string[] {
  const years = new Set<string>();
  for (const province of ALL_PROVINCE_IDS) {
    for (const y of getProvinceYears(province)) years.add(y.fiscalYear);
  }
  return [...years].sort();
}

export interface ProvincialComparisonMetric {
  field: ProvincialTrendField;
  label: string;
}

/** Canonical metric list shared by the Province Ranking Dashboard and the Historical Explorer's Metric Selector, so both features always offer the same set. */
export const COMPARISON_METRICS: ProvincialComparisonMetric[] = [
  { field: "totalOutlay", label: "Total Budget" },
  { field: "developmentBudget", label: "Development" },
  { field: "currentExpenditure", label: "Current Expenditure" },
  { field: "debtServicing", label: "Debt Servicing" },
  { field: "pension", label: "Pension" },
  { field: "ownRevenue", label: "Own Revenue" },
  { field: "federalTransfers", label: "Federal Transfers" },
  { field: "education", label: "Education" },
  { field: "health", label: "Health" },
  { field: "agriculture", label: "Agriculture" },
  { field: "infrastructure", label: "Infrastructure" },
];

export interface ProvincialInsight {
  text: string;
}

/** Phase 10 — deterministic, rule-based insights only. Every claim is a direct calculation; nothing here infers a cause the numbers alone can't support. */
export function generateProvincialInsights(): ProvincialInsight[] {
  const insights: ProvincialInsight[] = [];

  for (const metric of COMPARISON_METRICS) {
    const ranked = rankProvincesByField(metric.field);
    const top = ranked[0];
    if (!top || top.value === null) continue;
    insights.push({
      text: `${top.name} has the highest ${metric.label.toLowerCase()} among the four provinces in its latest budget (FY${top.fiscalYear}), at Rs ${top.value.toFixed(1)}bn.`,
    });
  }

  // Federal-transfer dependency: federalTransfers as a share of totalOutlay, highest wins.
  const dependency = ALL_PROVINCE_IDS.map((province) => {
    const year = getLatestProvinceYear(province);
    const meta = getProvinceMeta(province);
    if (typeof year.federalTransfers !== "number" || typeof year.totalOutlay !== "number" || year.totalOutlay <= 0) return null;
    return { name: meta.name, share: (year.federalTransfers / year.totalOutlay) * 100, fiscalYear: year.fiscalYear };
  }).filter((d): d is { name: string; share: number; fiscalYear: string } => d !== null);
  if (dependency.length > 0) {
    const mostDependent = dependency.reduce((a, b) => (b.share > a.share ? b : a));
    insights.push({
      text: `${mostDependent.name} relies most heavily on federal transfers among the four provinces, at ${mostDependent.share.toFixed(0)}% of its total FY${mostDependent.fiscalYear} budget.`,
    });
  }

  return insights;
}
