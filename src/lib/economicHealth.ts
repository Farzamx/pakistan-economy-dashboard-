export interface HealthFactor {
  label: string;
  /** 0-100: how healthy this indicator currently looks. */
  score: number;
  /** Relative importance. Weights across all factors should sum to 1. */
  weight: number;
}

export type HealthLabel = "Strong" | "Moderate" | "Weak";

export interface HealthStatus {
  label: HealthLabel;
  /** Hex color used for the gauge ring and its glow. */
  ringColor: string;
  /** Tailwind classes for the status badge. */
  badgeClass: string;
}

// Combines weighted factor scores into a single 0-100 score.
// Later phases can swap the mock factors in healthScoreData.ts for
// scores derived from live GDP, inflation, reserves, exchange-rate and
// remittances data without changing this function or the UI.
export function calculateHealthScore(factors: HealthFactor[]): number {
  const totalWeight = factors.reduce((sum, factor) => sum + factor.weight, 0);
  const weightedSum = factors.reduce(
    (sum, factor) => sum + factor.score * factor.weight,
    0,
  );
  return Math.round(weightedSum / totalWeight);
}

export function getHealthStatus(score: number): HealthStatus {
  if (score >= 70) {
    return {
      label: "Strong",
      ringColor: "#34d399",
      badgeClass: "border-emerald-400/20 bg-emerald-400/10 text-emerald-400",
    };
  }
  if (score >= 40) {
    return {
      label: "Moderate",
      ringColor: "#fbbf24",
      badgeClass: "border-amber-400/20 bg-amber-400/10 text-amber-400",
    };
  }
  return {
    label: "Weak",
    ringColor: "#fb7185",
    badgeClass: "border-rose-400/20 bg-rose-400/10 text-rose-400",
  };
}
