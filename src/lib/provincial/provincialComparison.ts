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
import { getLatestProvinceYear, type ProvincialTrendField } from "./provincialBudgetData";
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

export interface ProvincialComparisonMetric {
  field: ProvincialTrendField;
  label: string;
}

export const COMPARISON_METRICS: ProvincialComparisonMetric[] = [
  { field: "totalOutlay", label: "Total Budget" },
  { field: "education", label: "Education" },
  { field: "health", label: "Health" },
  { field: "developmentBudget", label: "Development" },
  { field: "debtServicing", label: "Debt Servicing" },
  { field: "agriculture", label: "Agriculture" },
  { field: "ownRevenue", label: "Own Revenue" },
  { field: "federalTransfers", label: "Federal Transfers" },
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
    if (typeof year.federalTransfers !== "number" || year.totalOutlay <= 0) return null;
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
