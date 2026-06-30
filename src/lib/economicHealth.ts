// Deterministic Economic Health Score — Production Audit Part 1.
//
// Previously this score was generated directly by the AI (aiEconomicAnalysis.ts
// asked the model for an integer 0-100 in its JSON response) — the audit's
// single highest-priority finding, since it directly contradicted this
// project's own stated principle (also applied to Recession/Default below):
// AI explains a score, it never invents one. calculateHealthFactors() is the
// fix: a composite of 9 already-fetched indicators across growth, inflation,
// monetary, external, and fiscal dimensions, each banded into a 0-100
// "how healthy does this look" component score the same way riskModels.ts
// bands its own factors — just inverted, since higher is better here.
//
// Same inputs always produce the same score (no AI, no randomness) —
// satisfies "every score must be reproducible" directly.

export interface HealthFactor {
  label: string;
  formattedValue: string;
  /** 0-100: how healthy this indicator currently looks. Higher is better. */
  score: number;
  /** Relative importance. Weights across all factors sum to 1. */
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

export interface HealthModelInputs {
  quarterlyGdpGrowthPct: number;   // Real GVA growth YoY % (SBP/PBS)
  cpiInflationPct: number;         // CPI inflation YoY %
  policyRatePct: number;           // SBP policy rate %
  importCoverMonths: number;       // total reserves / monthly imports
  currentAccountMonthlyB: number;  // current account balance B USD (negative = deficit)
  fiscalBalanceTrn: number;        // consolidated fiscal balance T PKR (negative = deficit)
  reerIndex: number;               // Real Effective Exchange Rate, base 2010=100
  m2GrowthPct: number;             // Money supply (M2) growth YoY %
  lsmMomPoints: number;            // LSM index MoM change in index points
}

export interface HealthModelResult {
  score: number;
  status: HealthStatus;
  factors: HealthFactor[];
  topStrengthFactors: HealthFactor[]; // highest-scoring (descending)
  topWeaknessFactors: HealthFactor[]; // lowest-scoring (ascending)
}

// Combines weighted factor scores into a single 0-100 score.
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

// Methodology — 9 factors across 5 dimensions, weights sum to 1.00:
//   Growth (0.20): GDP Growth
//   Inflation (0.15): CPI Inflation
//   Monetary (0.10 + 0.07): Real Policy Rate, Excess Money Growth
//   External (0.15 + 0.10 + 0.08): Import Cover, Current Account, REER
//   Fiscal (0.10): Fiscal Balance
//   Industrial momentum (0.05): LSM
//
// Deliberately excludes several indicators already fetched elsewhere on
// this dashboard, each for a specific, documented reason (no unjustified
// omissions, per the audit's "every recommendation must have a reason"):
//   - Trade Balance, FDI, Remittances: each is already a *component flow*
//     of Current Account, which is the factor used here — including them
//     separately would double-count the same underlying external position
//     (the same reasoning riskModels.ts already applies to keep SBP
//     Reserves out of the Default model, since it's Import Cover's own
//     numerator).
//   - Global Financial Conditions (Fed Funds/US10Y), Commodity Exposure
//     (oil prices): their economic effect on Pakistan is transmitted
//     through, and therefore already reflected in, Current Account/Import
//     Cover — adding them as independent factors here would double-count
//     the same pressure a second time. Global Financial Conditions is a
//     stronger candidate as a *Default-risk* model enhancement instead
//     (external borrowing cost sensitivity), not a Health Score factor —
//     see the Production Audit's Part 9 recommendations.
//   - Government Debt: no live series for this is currently fetched
//     anywhere on this dashboard. Revisit if one is added.
function pct(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function calculateHealthFactors(inputs: HealthModelInputs): HealthFactor[] {
  // Excess money growth: M2 expanding faster than the real economy plus
  // inflation is a forward-looking instability signal not yet visible in
  // realized CPI — distinct from CPI Inflation (realized) below.
  const excessMoneyGrowth = inputs.m2GrowthPct - (inputs.quarterlyGdpGrowthPct + inputs.cpiInflationPct);
  const realPolicyRate = inputs.policyRatePct - inputs.cpiInflationPct;

  return [
    {
      label: "GDP Growth (Q, YoY)",
      formattedValue: pct(inputs.quarterlyGdpGrowthPct),
      weight: 0.20,
      score:
        inputs.quarterlyGdpGrowthPct >= 6 ? 95 :
        inputs.quarterlyGdpGrowthPct >= 4 ? 80 :
        inputs.quarterlyGdpGrowthPct >= 2.5 ? 65 :
        inputs.quarterlyGdpGrowthPct >= 1 ? 50 :
        inputs.quarterlyGdpGrowthPct >= 0 ? 35 :
        inputs.quarterlyGdpGrowthPct >= -2 ? 20 : 5,
    },
    {
      label: "CPI Inflation",
      formattedValue: pct(inputs.cpiInflationPct),
      weight: 0.15,
      score:
        inputs.cpiInflationPct <= 5 ? 90 :
        inputs.cpiInflationPct <= 7 ? 75 :
        inputs.cpiInflationPct <= 10 ? 55 :
        inputs.cpiInflationPct <= 15 ? 35 :
        inputs.cpiInflationPct <= 20 ? 15 : 5,
    },
    {
      label: "Import Cover",
      formattedValue: `${inputs.importCoverMonths.toFixed(1)} mo`,
      weight: 0.15,
      score:
        inputs.importCoverMonths >= 5 ? 90 :
        inputs.importCoverMonths >= 4 ? 75 :
        inputs.importCoverMonths >= 3 ? 55 :
        inputs.importCoverMonths >= 2.5 ? 35 :
        inputs.importCoverMonths >= 2 ? 20 :
        inputs.importCoverMonths >= 1.5 ? 10 : 5,
    },
    {
      label: "Real Policy Rate",
      formattedValue: pct(realPolicyRate),
      weight: 0.10,
      score:
        realPolicyRate >= 3 ? 85 :
        realPolicyRate >= 1 ? 75 :
        realPolicyRate >= -1 ? 55 :
        realPolicyRate >= -3 ? 35 :
        realPolicyRate >= -6 ? 15 : 5,
    },
    {
      label: "Current Account",
      formattedValue: `${inputs.currentAccountMonthlyB >= 0 ? "+" : ""}${inputs.currentAccountMonthlyB.toFixed(2)}B`,
      weight: 0.10,
      score:
        inputs.currentAccountMonthlyB >= 0 ? 90 :
        inputs.currentAccountMonthlyB >= -0.3 ? 70 :
        inputs.currentAccountMonthlyB >= -0.6 ? 50 :
        inputs.currentAccountMonthlyB >= -1.0 ? 30 : 10,
    },
    {
      label: "Fiscal Balance",
      formattedValue: `${inputs.fiscalBalanceTrn.toFixed(1)}T PKR`,
      weight: 0.10,
      score:
        inputs.fiscalBalanceTrn >= -3 ? 80 :
        inputs.fiscalBalanceTrn >= -5 ? 60 :
        inputs.fiscalBalanceTrn >= -7 ? 40 :
        inputs.fiscalBalanceTrn >= -9 ? 25 :
        inputs.fiscalBalanceTrn >= -12 ? 10 : 5,
    },
    {
      label: "REER",
      formattedValue: inputs.reerIndex.toFixed(1),
      weight: 0.08,
      // Base-2010=100 index — close to 100 signals the Rupee is trading
      // near its long-run equilibrium; a large deviation either direction
      // (overvalued -> disorderly-adjustment risk, undervalued -> imported
      // inflation pressure) scores worse.
      score:
        inputs.reerIndex >= 95 && inputs.reerIndex <= 105 ? 85 :
        (inputs.reerIndex >= 90 && inputs.reerIndex < 95) || (inputs.reerIndex > 105 && inputs.reerIndex <= 110) ? 65 :
        (inputs.reerIndex >= 85 && inputs.reerIndex < 90) || (inputs.reerIndex > 110 && inputs.reerIndex <= 115) ? 40 : 20,
    },
    {
      label: "Excess Money Growth",
      formattedValue: pct(excessMoneyGrowth),
      weight: 0.07,
      score:
        excessMoneyGrowth <= 0 ? 80 :
        excessMoneyGrowth <= 3 ? 60 :
        excessMoneyGrowth <= 6 ? 40 :
        excessMoneyGrowth <= 10 ? 20 : 5,
    },
    {
      label: "LSM Output (MoM)",
      formattedValue: `${inputs.lsmMomPoints >= 0 ? "+" : ""}${inputs.lsmMomPoints.toFixed(1)} pts`,
      weight: 0.05,
      score:
        inputs.lsmMomPoints >= 5 ? 90 :
        inputs.lsmMomPoints >= 2 ? 75 :
        inputs.lsmMomPoints >= 0 ? 55 :
        inputs.lsmMomPoints >= -3 ? 35 :
        inputs.lsmMomPoints >= -8 ? 15 : 5,
    },
  ];
}

// riskLevel (Low/Moderate/High) is derived from the health label, not
// AI-invented (Production Audit Part 1/Part 9) — used by both
// HealthScoreCard.tsx and the Floating Assistant's dashboard snapshot, so
// they can't drift into showing two different risk classifications for the
// same score.
export function healthLabelToRiskLevel(label: HealthLabel): "Low" | "Moderate" | "High" {
  return label === "Strong" ? "Low" : label === "Moderate" ? "Moderate" : "High";
}

export function calculateEconomicHealth(inputs: HealthModelInputs): HealthModelResult {
  const factors = calculateHealthFactors(inputs);
  const score = calculateHealthScore(factors);
  const sorted = [...factors].sort((a, b) => b.score - a.score);

  return {
    score,
    status: getHealthStatus(score),
    factors,
    topStrengthFactors: sorted.slice(0, 3),
    topWeaknessFactors: sorted.slice(-3).reverse(),
  };
}
