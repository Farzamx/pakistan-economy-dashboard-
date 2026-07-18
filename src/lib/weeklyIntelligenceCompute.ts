// Weekly Intelligence Engine — computation (Production Reliability &
// Institutional Upgrade, Part 2). Runs only inside the weekly cron route
// now, never on a page request. Fetches the same indicators page.tsx used
// to fetch for this exact purpose, runs the three deterministic models,
// then asks AI to narrate them — identical functions to before, just
// called from one weekly job instead of every render.

import { getAllSbpIndicators, getMoneySupplyM2YoyGrowth } from "@/lib/data/sbpServer";
import { getGdpKpi } from "@/lib/data/worldBank";
import { getQuarterlyGdpKpi } from "@/lib/data/quarterlyGdp";
import { getNews } from "@/lib/data/news";
import { calculateEconomicHealth } from "@/lib/economicHealth";
import { calculateRecessionRisk, calculateDefaultRisk } from "@/lib/riskModels";
import { getAiEconomicAnalysis } from "@/lib/data/aiEconomicAnalysis";
import { getAiRiskIntelligence } from "@/lib/data/aiRiskIntelligence";
import {
  getLatestWeeklyIntelligenceSnapshot,
  storeWeeklyIntelligenceSnapshot,
  type StoreWeeklyIntelligencePayload,
  type IntelligenceTriggerReason,
} from "@/lib/data/weeklyIntelligence";

export async function computeWeeklyIntelligence(): Promise<StoreWeeklyIntelligencePayload> {
  const [gdpKpi, sbp, quarterlyGdp, newsItems, m2YoyOfficial] = await Promise.all([
    getGdpKpi(),
    getAllSbpIndicators(),
    getQuarterlyGdpKpi(),
    getNews(),
    getMoneySupplyM2YoyGrowth(),
  ]);

  // Same derived-input logic page.tsx used to run inline — see that file's
  // git history (pre-Part-2) for the original, unchanged math.
  const usdPkrTrend = sbp.usdPkr.trend;
  const currentUsdPkr = parseFloat(sbp.usdPkr.kpi.value);
  const yearAgoUsdPkr = usdPkrTrend[Math.max(0, usdPkrTrend.length - 13)]?.value ?? currentUsdPkr;
  const usdPkrYoyPct = yearAgoUsdPkr > 0 ? ((currentUsdPkr - yearAgoUsdPkr) / yearAgoUsdPkr) * 100 : 0;

  const sbpReservesB = parseFloat(sbp.foreignReserves.kpi.value);
  const bankReservesB = parseFloat(sbp.netBankReserves.kpi.value);
  const monthlyImportsB = parseFloat(sbp.imports.kpi.value);
  const importCoverMonths = monthlyImportsB > 0 ? (sbpReservesB + bankReservesB) / monthlyImportsB : 3.0;

  const privateCreditGrowthPct = parseFloat(sbp.privateCreditGrowth.kpi.value);

  const lsmMatch = sbp.lsm.kpi.change.match(/^([+-]?\d+\.?\d*)/);
  const lsmMomPoints = lsmMatch ? parseFloat(lsmMatch[1]) : 0;

  // Prefer SBP's own precomputed weekly M2 YoY growth series (M000500) —
  // moneySupplyM2 migrated to a weekly source (see sbp.ts SERIES_KEYS
  // comment), so its capped 24-point .trend array no longer spans a full
  // year and can't reliably supply a "same point last year" lookback by
  // fixed array index. Fall back to the old trend-index estimate only if
  // the dedicated YoY series fetch fails, so a transient SBP outage
  // degrades this one input rather than breaking the Health Score model.
  let m2YoyPct: number;
  if (m2YoyOfficial) {
    m2YoyPct = m2YoyOfficial.value;
  } else {
    const m2Trend = sbp.moneySupplyM2.trend;
    const currentM2 = parseFloat(sbp.moneySupplyM2.kpi.value);
    const yearAgoM2 = m2Trend[Math.max(0, m2Trend.length - 13)]?.value ?? currentM2;
    m2YoyPct = yearAgoM2 > 0 ? ((currentM2 - yearAgoM2) / yearAgoM2) * 100 : 0;
  }

  const healthResult = calculateEconomicHealth({
    quarterlyGdpGrowthPct: parseFloat(quarterlyGdp.kpi.value),
    cpiInflationPct: parseFloat(sbp.cpiInflation.kpi.value),
    policyRatePct: parseFloat(sbp.policyRate.kpi.value),
    importCoverMonths,
    currentAccountMonthlyB: parseFloat(sbp.currentAccount.kpi.value),
    fiscalBalanceTrn: parseFloat(sbp.fiscalBalance.kpi.value),
    reerIndex: parseFloat(sbp.reer.kpi.value),
    m2GrowthPct: m2YoyPct,
    lsmMomPoints,
  });

  const recessionResult = calculateRecessionRisk({
    gdpGrowthPct: parseFloat(gdpKpi.value),
    quarterlyGdpGrowthPct: parseFloat(quarterlyGdp.kpi.value),
    cpiInflationPct: parseFloat(sbp.cpiInflation.kpi.value),
    policyRatePct: parseFloat(sbp.policyRate.kpi.value),
    importCoverMonths,
    currentAccountMonthlyB: parseFloat(sbp.currentAccount.kpi.value),
    usdPkrYoyChangePct: usdPkrYoyPct,
    privateCreditGrowthPct,
    lsmMomPoints,
  });

  const defaultResult = calculateDefaultRisk({
    importCoverMonths,
    fiscalBalanceTrn: parseFloat(sbp.fiscalBalance.kpi.value),
    currentAccountMonthlyB: parseFloat(sbp.currentAccount.kpi.value),
    usdPkrYoyChangePct: usdPkrYoyPct,
    policyRatePct: parseFloat(sbp.policyRate.kpi.value),
  });

  const [aiHealth, aiRisk] = await Promise.all([
    getAiEconomicAnalysis(healthResult, newsItems),
    getAiRiskIntelligence(recessionResult, defaultResult),
  ]);

  return {
    healthScore: healthResult.score,
    healthLabel: healthResult.status.label,
    healthFactors: healthResult.factors,
    recessionProbability: recessionResult.probability,
    recessionCategory: recessionResult.riskCategory,
    recessionModelScore: recessionResult.modelScore,
    recessionFactors: { topRiskFactors: recessionResult.topRiskFactors, topCushionFactors: recessionResult.topCushionFactors },
    defaultProbability: defaultResult.probability,
    defaultCategory: defaultResult.riskCategory,
    defaultModelScore: defaultResult.modelScore,
    defaultFactors: { topRiskFactors: defaultResult.topRiskFactors, topCushionFactors: defaultResult.topCushionFactors },
    aiSentiment: aiHealth.sentiment,
    aiSummary: aiHealth.summary,
    aiTopDrivers: aiHealth.topDrivers,
    aiRecessionExplanation: aiRisk.recession,
    aiDefaultExplanation: aiRisk.default,
    aiModelUsed: aiRisk.modelUsed,
    aiModelDisplayName: aiRisk.modelDisplayName,
  };
}

/** Minimum time between ANY two snapshots (scheduled or event-triggered) — mirrors the hard guard inside store_weekly_intelligence_snapshot (migration 0042). Checked here too as a cheap pre-check so a rejected attempt doesn't pay for a live-data fetch + AI narration cycle first. */
const MIN_RECOMPUTE_INTERVAL_MS = 20 * 60 * 60 * 1000;

export interface WeeklyIntelligenceCycleResult {
  success: boolean;
  skipped: boolean;
  reason?: string;
  error?: string;
  healthScore?: number;
  recessionProbability?: number;
  defaultProbability?: number;
}

/**
 * Runs the full check → compute → store cycle, shared by the weekly cron
 * route (triggerReason "scheduled") and syncPipeline.ts's Step 11
 * (triggerReason "event" — see that file for what qualifies as a trigger).
 * Extracted (Weekly Intelligence Engine Audit, 2026-07-18) so both callers
 * share one implementation of the pre-check + compute + store + outcome
 * shape, rather than the route's logic being duplicated a second time for
 * the new event path.
 */
export async function runWeeklyIntelligenceCycle(
  internalSecret: string,
  triggerReason: IntelligenceTriggerReason,
  triggerSeriesSlug: string | null = null,
): Promise<WeeklyIntelligenceCycleResult> {
  // Cheap pre-check — the DB's own interval guard (migration 0042) is the
  // hard guarantee; this just avoids paying for a live-data fetch + AI
  // narration cycle when we already know it would be rejected.
  const existing = await getLatestWeeklyIntelligenceSnapshot();
  if (existing) {
    const ageMs = Date.now() - new Date(existing.computedAt).getTime();
    if (ageMs < MIN_RECOMPUTE_INTERVAL_MS) {
      return { success: true, skipped: true, reason: `Last snapshot is ${Math.round(ageMs / 60_000)} min old — within the minimum recompute interval.` };
    }
  }

  const payload = await computeWeeklyIntelligence();
  const result = await storeWeeklyIntelligenceSnapshot(payload, internalSecret, triggerReason, triggerSeriesSlug);
  if (!result.success) {
    return { success: false, skipped: false, error: result.error };
  }
  return {
    success: true,
    skipped: result.skipped ?? false,
    reason: result.skipped ? "Rejected by the database's own interval/uniqueness guard (a concurrent run won the race)." : undefined,
    healthScore: payload.healthScore,
    recessionProbability: payload.recessionProbability,
    defaultProbability: payload.defaultProbability,
  };
}
