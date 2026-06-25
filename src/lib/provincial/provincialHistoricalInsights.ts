// Phase 8 of the Historical Explorer build — deterministic historical
// insights layered on top of the single-year generateProvincialInsights()
// (provincialComparison.ts) and the per-province analytics in
// provincialHistoricalAnalytics.ts. Every insight is a direct calculation
// against verified dataset values. The audit request's example insights
// ("Sindh has highest own revenue", "Balochistan has highest per-capita
// budget") are illustrations of SHAPE, not asserted facts — this module
// computes whichever province the real numbers actually name, even when
// that differs from the examples (it does: Punjab, not Sindh, has the
// highest own revenue in the verified latest-year data).

import { ALL_PROVINCE_IDS, type ProvinceId } from "@/data/provincialBudgetHistorical";
import { getProvinceMeta } from "./provincialBudgetRegistry";
import { getCagr, getCoverageStats, getLatestPerCapita } from "./provincialHistoricalAnalytics";
import type { ProvincialTrendField } from "./provincialBudgetData";

export interface ProvincialInsight {
  text: string;
}

/** "[Province]'s total budget grew X% since FY[earliest]" — total % growth (the intuitive headline figure) plus the CAGR for context; one per province with at least 2 verified totalOutlay points. */
function getBudgetGrowthInsights(): ProvincialInsight[] {
  const insights: ProvincialInsight[] = [];
  for (const province of ALL_PROVINCE_IDS) {
    const cagr = getCagr(province, "totalOutlay");
    if (!cagr) continue;
    const meta = getProvinceMeta(province);
    const totalGrowthPct = ((cagr.toValue - cagr.fromValue) / cagr.fromValue) * 100;
    insights.push({
      text: `${meta.name}'s total budget grew ${totalGrowthPct.toFixed(0)}% from FY${cagr.fromYear} to FY${cagr.toYear} — a ${cagr.cagrPct.toFixed(1)}%/year compound annual growth rate.`,
    });
  }
  return insights;
}

/** Highest verified data-coverage province — real data points / total possible cells across every tracked field and year, not a subjective quality judgment. */
function getCoverageInsight(): ProvincialInsight | null {
  const stats = ALL_PROVINCE_IDS.map((province) => {
    const s = getCoverageStats(province);
    const possible = s.totalDataPoints + s.totalNullPoints;
    return { province, pct: possible > 0 ? (s.totalDataPoints / possible) * 100 : 0 };
  });
  const best = stats.reduce((a, b) => (b.pct > a.pct ? b : a));
  if (best.pct <= 0) return null;
  const meta = getProvinceMeta(best.province);
  return { text: `${meta.name} has the highest verified data coverage among the four provinces' historical datasets, at ${best.pct.toFixed(0)}% of tracked fields populated across all recorded years.` };
}

/** Cross-province per-capita comparison for one field, using each province's own latest verified year (years differ by province, so this can't be pinned to one shared fiscal year). */
function getPerCapitaWinnerInsight(field: ProvincialTrendField, label: string): ProvincialInsight | null {
  const values = ALL_PROVINCE_IDS
    .map((province) => ({ province, perCapita: getLatestPerCapita(province, field) }))
    .filter((v): v is { province: ProvinceId; perCapita: number } => v.perCapita !== null);
  if (values.length === 0) return null;
  const best = values.reduce((a, b) => (b.perCapita > a.perCapita ? b : a));
  const meta = getProvinceMeta(best.province);
  return { text: `${meta.name} has the highest per-citizen ${label.toLowerCase()} among the four provinces, at Rs ${Math.round(best.perCapita)} per person.` };
}

/** Phase 8 — historical/cross-time insights, distinct from generateProvincialInsights()'s single-latest-year comparisons. No AI generation; every figure traces back to a dataset calculation. */
export function generateHistoricalInsights(): ProvincialInsight[] {
  const insights: ProvincialInsight[] = [...getBudgetGrowthInsights()];

  const coverage = getCoverageInsight();
  if (coverage) insights.push(coverage);

  const perCapitaBudget = getPerCapitaWinnerInsight("totalOutlay", "Total Budget");
  if (perCapitaBudget) insights.push(perCapitaBudget);

  const perCapitaDev = getPerCapitaWinnerInsight("developmentBudget", "Development Spending");
  if (perCapitaDev) insights.push(perCapitaDev);

  return insights;
}
