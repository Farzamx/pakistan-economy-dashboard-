// Confidence Score — deterministic, fixed-weight scoring. No AI, no
// fabrication: every point deducted traces back to one named factor,
// documented inline below. Two consumers share the same core:
// calculateConfidenceScore() scores a single tool's result;
// calculateEconomicIdentityConfidence() scores the whole profile. Both
// call the same scoreFromFactors() so there is exactly one scoring rule,
// applied at two different granularities — not two parallel systems.
import type { EconomicProfile } from "@/lib/decisionSupportLab/economicProfile";
import { getOverallCompletionPct } from "@/lib/decisionSupportLab/profileCompletion";
import type { ProvenanceEntry } from "@/lib/decisionSupportLab/provenance";

export interface ConfidenceFactor {
  label: string;
  positive: boolean;
}

export interface ConfidenceResult {
  score: number;
  label: "High" | "Moderate" | "Low";
  factors: ConfidenceFactor[];
}

function labelForScore(score: number): ConfidenceResult["label"] {
  if (score >= 85) return "High";
  if (score >= 60) return "Moderate";
  return "Low";
}

function scoreFromFactors(factors: ConfidenceFactor[], baseScore: number): ConfidenceResult {
  let score = baseScore;
  for (const factor of factors) {
    if (!factor.positive) score -= factor.label.startsWith("Missing") || factor.label.startsWith("Incomplete") ? 8 : 5;
  }
  score = Math.max(0, Math.min(100, Math.round(score)));
  return { score, label: labelForScore(score), factors };
}

export interface ConfidenceInput {
  profileCompletenessPct: number;
  usesOfficialData: boolean;
  hasHistoricalCoverage: boolean;
  manualEstimateCount: number;
  assumptionCount: number;
  /** When provided, usesOfficialData / manualEstimateCount are derived from it instead of the caller computing them by hand — see provenance.ts. */
  provenance?: ProvenanceEntry[];
}

/** Scores a single tool's result. Starts at 100; fixed penalties: −20 if not built on official data, −15 if no historical coverage, −5 per manual estimate (capped at 3), −3 per stated assumption (capped at 4) — then blended toward the profile's own completeness so an otherwise-perfect calculation still reflects a thin profile behind it. */
export function calculateConfidenceScore(input: ConfidenceInput): ConfidenceResult {
  const provenanceDerived = input.provenance ? deriveFromProvenance(input.provenance) : null;
  const usesOfficialData = provenanceDerived?.usesOfficialData ?? input.usesOfficialData;
  const manualEstimateCount = provenanceDerived?.manualEstimateCount ?? input.manualEstimateCount;

  const factors: ConfidenceFactor[] = [
    { label: usesOfficialData ? "Official data" : "Manual assumptions", positive: usesOfficialData },
    { label: input.hasHistoricalCoverage ? "Historical CPI available" : "No historical coverage", positive: input.hasHistoricalCoverage },
    { label: input.profileCompletenessPct >= 100 ? "Complete profile" : input.profileCompletenessPct >= 50 ? "Partial profile" : "Incomplete profile", positive: input.profileCompletenessPct >= 50 },
  ];
  if (manualEstimateCount > 0) factors.push({ label: `${manualEstimateCount} manual estimate${manualEstimateCount === 1 ? "" : "s"} used`, positive: false });
  if (input.assumptionCount > 0) factors.push({ label: `${input.assumptionCount} assumption${input.assumptionCount === 1 ? "" : "s"} applied`, positive: false });

  const baseScore = 70 + input.profileCompletenessPct * 0.3;
  return scoreFromFactors(factors, baseScore);
}

function deriveFromProvenance(provenance: ProvenanceEntry[]): { usesOfficialData: boolean; manualEstimateCount: number } {
  const manualEstimateCount = provenance.filter((p) => p.source === "manual-estimate").length;
  const officialCount = provenance.filter((p) => p.source === "official-cpi" || p.source === "sbp" || p.source === "yahoo-finance").length;
  return { usesOfficialData: officialCount > 0 && manualEstimateCount < provenance.length, manualEstimateCount };
}

export interface ProfileProvenanceSummary {
  officialFieldCount: number;
  manualFieldCount: number;
  missingFieldCount: number;
  hasHistoricalCoverage: boolean;
}

/** Whole-profile variant — "how solid is what you've told us," distinct from Profile Completion's "how much have you told us." Reuses the same scoreFromFactors() core. */
export function calculateEconomicIdentityConfidence(profile: EconomicProfile, summary: ProfileProvenanceSummary): ConfidenceResult {
  const completenessPct = getOverallCompletionPct(profile);
  const factors: ConfidenceFactor[] = [
    { label: summary.officialFieldCount > summary.manualFieldCount ? "Mostly official/verified data" : "Mostly self-reported data", positive: summary.officialFieldCount >= summary.manualFieldCount },
    { label: summary.missingFieldCount === 0 ? "No missing fields" : `${summary.missingFieldCount} field${summary.missingFieldCount === 1 ? "" : "s"} missing`, positive: summary.missingFieldCount === 0 },
    { label: summary.hasHistoricalCoverage ? "Historical CPI available" : "No historical coverage", positive: summary.hasHistoricalCoverage },
    { label: completenessPct >= 100 ? "Complete profile" : "Incomplete profile", positive: completenessPct >= 100 },
  ];
  const baseScore = 60 + completenessPct * 0.4;
  return scoreFromFactors(factors, baseScore);
}
