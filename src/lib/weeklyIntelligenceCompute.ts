// Weekly Intelligence Engine — computation (Production Reliability &
// Institutional Upgrade, Part 2). Runs only inside the weekly cron route
// now, never on a page request. Fetches the same indicators page.tsx used
// to fetch for this exact purpose, runs the three deterministic models,
// then asks AI to narrate them — identical functions to before, just
// called from one weekly job instead of every render.

import { getAllSbpIndicators } from "@/lib/data/sbpServer";
import { getGdpKpi } from "@/lib/data/worldBank";
import { getQuarterlyGdpKpi } from "@/lib/data/quarterlyGdp";
import { getNews } from "@/lib/data/news";
import { calculateEconomicHealth } from "@/lib/economicHealth";
import { calculateRecessionRisk, calculateDefaultRisk } from "@/lib/riskModels";
import { getAiEconomicAnalysis } from "@/lib/data/aiEconomicAnalysis";
import { getAiRiskIntelligence } from "@/lib/data/aiRiskIntelligence";
import type { StoreWeeklyIntelligencePayload } from "@/lib/data/weeklyIntelligence";

export async function computeWeeklyIntelligence(): Promise<StoreWeeklyIntelligencePayload> {
  const [gdpKpi, sbp, quarterlyGdp, newsItems] = await Promise.all([
    getGdpKpi(),
    getAllSbpIndicators(),
    getQuarterlyGdpKpi(),
    getNews(),
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

  const m2Trend = sbp.moneySupplyM2.trend;
  const currentM2 = parseFloat(sbp.moneySupplyM2.kpi.value);
  const yearAgoM2 = m2Trend[Math.max(0, m2Trend.length - 13)]?.value ?? currentM2;
  const m2YoyPct = yearAgoM2 > 0 ? ((currentM2 - yearAgoM2) / yearAgoM2) * 100 : 0;

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
