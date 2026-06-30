// Weekly Intelligence Engine — storage layer (Production Reliability &
// Institutional Upgrade, Part 2). The deterministic models
// (calculateEconomicHealth/calculateRecessionRisk/calculateDefaultRisk) and
// their AI narration (getAiEconomicAnalysis/getAiRiskIntelligence) are
// still the exact same functions used before this change — only WHEN they
// run changed. They now run once, inside the weekly cron route
// (src/app/api/cron/weekly-intelligence/route.ts), which calls
// storeWeeklyIntelligenceSnapshot() below. The homepage calls
// getLatestWeeklyIntelligenceSnapshot() to read the result instead of
// calling those functions itself.

import { createPublicDataClient } from "@/lib/supabase/publicDataClient";
import type { HealthFactor, HealthLabel } from "@/lib/economicHealth";
import type { RiskFactor, RiskCategory } from "@/lib/riskModels";
import type { AiRiskExplanation } from "@/lib/data/aiRiskIntelligence";

export interface RiskFactorBreakdown {
  topRiskFactors: RiskFactor[];
  topCushionFactors: RiskFactor[];
}

export interface WeeklyIntelligenceSnapshot {
  computedAt: string;
  health: { score: number; label: HealthLabel; factors: HealthFactor[] };
  recession: { probability: number; category: RiskCategory; modelScore: number; factors: RiskFactorBreakdown };
  default: { probability: number; category: RiskCategory; modelScore: number; factors: RiskFactorBreakdown };
  ai: {
    sentiment: "Bullish" | "Neutral" | "Bearish";
    summary: string;
    topDrivers: string[];
    recessionExplanation: AiRiskExplanation;
    defaultExplanation: AiRiskExplanation;
    modelUsed: string;
    modelDisplayName: string;
  };
}

interface SnapshotRow {
  computed_at: string;
  health_score: number;
  health_label: HealthLabel;
  health_factors: HealthFactor[];
  recession_probability: number;
  recession_category: RiskCategory;
  recession_model_score: number;
  recession_factors: RiskFactorBreakdown;
  default_probability: number;
  default_category: RiskCategory;
  default_model_score: number;
  default_factors: RiskFactorBreakdown;
  ai_sentiment: "Bullish" | "Neutral" | "Bearish";
  ai_summary: string;
  ai_top_drivers: string[];
  ai_recession_explanation: AiRiskExplanation;
  ai_default_explanation: AiRiskExplanation;
  ai_model_used: string;
  ai_model_display_name: string;
}

function rowToSnapshot(row: SnapshotRow): WeeklyIntelligenceSnapshot {
  return {
    computedAt: row.computed_at,
    health: { score: row.health_score, label: row.health_label, factors: row.health_factors },
    recession: { probability: row.recession_probability, category: row.recession_category, modelScore: row.recession_model_score, factors: row.recession_factors },
    default: { probability: row.default_probability, category: row.default_category, modelScore: row.default_model_score, factors: row.default_factors },
    ai: {
      sentiment: row.ai_sentiment,
      summary: row.ai_summary,
      topDrivers: row.ai_top_drivers,
      recessionExplanation: row.ai_recession_explanation,
      defaultExplanation: row.ai_default_explanation,
      modelUsed: row.ai_model_used,
      modelDisplayName: row.ai_model_display_name,
    },
  };
}

/** Reads the most recent weekly snapshot — null if the cron hasn't run yet (e.g. immediately after this feature was deployed, before the first Monday). Callers must render an honest "not yet available" state in that case, not a fabricated one. */
export async function getLatestWeeklyIntelligenceSnapshot(): Promise<WeeklyIntelligenceSnapshot | null> {
  const supabase = createPublicDataClient();
  const { data, error } = await supabase.rpc("get_latest_weekly_intelligence_snapshot");
  if (error) {
    console.error(`[WeeklyIntelligence] get_latest_weekly_intelligence_snapshot failed: ${error.message}`);
    return null;
  }
  // get_latest_weekly_intelligence_snapshot() is declared to return a single
  // row of weekly_intelligence_snapshots, not setof — when the underlying
  // query matches zero rows (no cron run yet), Postgres returns a row of the
  // composite type with every field null, not a true SQL NULL. `!data` alone
  // doesn't catch this (data is a truthy object with null fields), so check
  // a required field explicitly.
  const row = data as SnapshotRow | null;
  if (!row || !row.computed_at) return null;
  return rowToSnapshot(row);
}

export interface StoreWeeklyIntelligencePayload {
  healthScore: number;
  healthLabel: HealthLabel;
  healthFactors: HealthFactor[];
  recessionProbability: number;
  recessionCategory: RiskCategory;
  recessionModelScore: number;
  recessionFactors: RiskFactorBreakdown;
  defaultProbability: number;
  defaultCategory: RiskCategory;
  defaultModelScore: number;
  defaultFactors: RiskFactorBreakdown;
  aiSentiment: "Bullish" | "Neutral" | "Bearish";
  aiSummary: string;
  aiTopDrivers: string[];
  aiRecessionExplanation: AiRiskExplanation;
  aiDefaultExplanation: AiRiskExplanation;
  aiModelUsed: string;
  aiModelDisplayName: string;
}

/** Called only from the weekly cron route, with the trusted server-side internal secret (reuses the 'notification_worker' key — same threat model as the existing notification cron, see 0017's migration header). */
export async function storeWeeklyIntelligenceSnapshot(payload: StoreWeeklyIntelligencePayload, internalSecret: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createPublicDataClient();
  const { error } = await supabase.rpc("store_weekly_intelligence_snapshot", {
    p_internal_secret: internalSecret,
    p_payload: payload,
  });
  if (error) {
    console.error(`[WeeklyIntelligence] store_weekly_intelligence_snapshot failed: ${error.message}`);
    return { success: false, error: error.message };
  }
  return { success: true };
}
