import type { HealthFactor } from "@/lib/economicHealth";

// Mock per-factor scores for Phase 1.5 — replaced by scores derived from
// live GDP, inflation, reserves, exchange-rate and remittances data later.
export const healthFactors: HealthFactor[] = [
  { label: "GDP Growth", score: 55, weight: 0.25 },
  { label: "Inflation", score: 45, weight: 0.25 },
  { label: "Foreign Reserves", score: 60, weight: 0.2 },
  { label: "Exchange Rate Stability", score: 50, weight: 0.15 },
  { label: "Remittances", score: 75, weight: 0.15 },
];

export const healthScoreExplanation =
  "Pakistan's economy is showing moderate stability. Rising remittances and a recovering agriculture sector are encouraging, but persistent inflation and a fragile exchange rate keep reserves at a thin import-cover buffer.";
