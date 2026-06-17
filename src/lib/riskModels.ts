// Deterministic quantitative risk scoring models for Pakistan economic indicators.
// Probabilities are calculated from live data using weighted factor pressure scores.
// AI layer only explains the output — it never generates probabilities.

export type RiskCategory = "Low" | "Elevated" | "High" | "Severe";

// ── Data Confidence Scoring ───────────────────────────────────────────────────
// Purely quantitative — AI is never involved in confidence calculation.

export type ConfidenceLevel = "High" | "Moderate" | "Low";

export interface IndicatorStatus {
  label: string;
  isFallback: boolean; // true = API failed, using hardcoded snapshot (-10 pts each)
  isStale: boolean;    // true = live data older than expected frequency (-5 pts each)
}

export interface DataConfidence {
  score: number;           // 0-100, starts at 100 and deducts per stale/fallback indicator
  level: ConfidenceLevel;
  currentCount: number;    // indicators with fresh live data
  staleCount: number;      // indicators that are fallback or stale
  totalCount: number;
  calculatedAt: string;    // formatted PKT timestamp of the last ISR render
}

// Starts at 100. Fallback indicators (hardcoded snapshot) deduct 10 pts each.
// Stale live indicators (older than frequency threshold) deduct 5 pts each.
export function computeDataConfidence(
  indicators: IndicatorStatus[],
  calculatedAt: string,
): DataConfidence {
  let deductions = 0;
  let staleCount = 0;

  for (const ind of indicators) {
    if (ind.isFallback) {
      deductions += 10;
      staleCount++;
    } else if (ind.isStale) {
      deductions += 5;
      staleCount++;
    }
  }

  const score = Math.max(0, 100 - deductions);
  const level: ConfidenceLevel = score >= 90 ? "High" : score >= 70 ? "Moderate" : "Low";

  return {
    score,
    level,
    currentCount: indicators.length - staleCount,
    staleCount,
    totalCount: indicators.length,
    calculatedAt,
  };
}
// ─────────────────────────────────────────────────────────────────────────────

export interface RiskFactor {
  label: string;
  formattedValue: string;
  pressureScore: number; // 0-100: how much this factor pushes toward risk
  weight: number;
}

export interface RiskModelResult {
  probability: number;       // 0-100 integer, displayed as %
  modelScore: number;        // 0-100 integer, weighted average pressure
  riskCategory: RiskCategory;
  topRiskFactors: RiskFactor[];     // highest-pressure factors (descending)
  topCushionFactors: RiskFactor[];  // lowest-pressure factors (ascending)
}

export interface RecessionModelInputs {
  gdpGrowthPct: number;             // Annual GDP growth YoY % (World Bank — kept for data confidence tracking)
  quarterlyGdpGrowthPct: number;    // Quarterly real GVA growth YoY % (SBP/PBS — used in model; more current)
  cpiInflationPct: number;          // CPI inflation YoY %
  policyRatePct: number;            // SBP policy rate %
  importCoverMonths: number;        // total reserves / monthly imports
  currentAccountMonthlyB: number;   // current account balance B USD (negative = deficit)
  usdPkrYoyChangePct: number;       // USD/PKR YoY change % (positive = PKR depreciation)
  privateCreditGrowthPct: number;   // private sector credit growth YoY % (replaces PAK ETF day %)
  lsmMomPoints: number;             // LSM index MoM change in index points
}

export interface DefaultModelInputs {
  // SBP Reserves removed — its value flows into the model via importCoverMonths,
  // which already captures reserve adequacy in context. Listing it separately
  // caused double-counting at a combined 0.45 effective weight.
  importCoverMonths: number;        // (SBP + bank FX reserves) / monthly imports
  fiscalBalanceTrn: number;         // consolidated fiscal balance T PKR (negative = deficit)
  currentAccountMonthlyB: number;   // current account balance B USD (negative = deficit)
  usdPkrYoyChangePct: number;       // USD/PKR YoY change % (positive = PKR depreciation)
  policyRatePct: number;            // SBP policy rate %
}

function getRiskCategory(prob: number): RiskCategory {
  if (prob < 20) return "Low";
  if (prob < 40) return "Elevated";
  if (prob < 60) return "High";
  return "Severe";
}

// Convert weighted-average pressure score (0-100) to a calibrated probability.
// Recession: floor 4%, ceiling 74% (Pakistan is unlikely to hit full depression
// or zero recession risk simultaneously given chronic structural constraints).
function toProbabilityRecession(score: number): number {
  return Math.round(Math.min(100, Math.max(0, 4 + score * 0.70)));
}

// Default: floor 2%, ceiling 62% (Pakistan has IMF backstop + bilateral support
// as a structural buffer against near-term formal default).
function toProbabilityDefault(score: number): number {
  return Math.round(Math.min(100, Math.max(0, 2 + score * 0.60)));
}

// v3 weight rationale:
// - GDP factor now uses quarterly YoY (SBP/PBS) instead of annual (World Bank).
//   Quarterly data is ~18 months more current; thresholds unchanged (same % scale).
//   Weight raised back to 0.18 (staleness concession removed since data is now quarterly).
// - All other weights unchanged from v2.
// - Annual gdpGrowthPct kept in inputs for data-confidence tracking only.
export function calculateRecessionRisk(inputs: RecessionModelInputs): RiskModelResult {
  const factors: RiskFactor[] = [
    {
      label: "GDP Growth (Q, YoY)",
      formattedValue: `${inputs.quarterlyGdpGrowthPct.toFixed(1)}%`,
      weight: 0.18,
      pressureScore:
        inputs.quarterlyGdpGrowthPct >= 4 ? 5 :
        inputs.quarterlyGdpGrowthPct >= 3 ? 15 :
        inputs.quarterlyGdpGrowthPct >= 2 ? 30 :
        inputs.quarterlyGdpGrowthPct >= 1 ? 50 :
        inputs.quarterlyGdpGrowthPct >= 0 ? 70 :
        inputs.quarterlyGdpGrowthPct >= -1 ? 85 : 95,
    },
    {
      label: "LSM Output (MoM)",
      formattedValue: `${inputs.lsmMomPoints >= 0 ? "+" : ""}${inputs.lsmMomPoints.toFixed(1)} pts`,
      weight: 0.18,
      pressureScore:
        inputs.lsmMomPoints >= 5 ? 5 :
        inputs.lsmMomPoints >= 2 ? 20 :
        inputs.lsmMomPoints >= 0 ? 35 :
        inputs.lsmMomPoints >= -3 ? 55 :
        inputs.lsmMomPoints >= -8 ? 75 : 90,
    },
    {
      label: "PKR Depreciation (YoY)",
      formattedValue: `${inputs.usdPkrYoyChangePct >= 0 ? "+" : ""}${inputs.usdPkrYoyChangePct.toFixed(1)}%`,
      weight: 0.12,
      pressureScore:
        inputs.usdPkrYoyChangePct <= -2 ? 5 :
        inputs.usdPkrYoyChangePct <= 3 ? 10 :
        inputs.usdPkrYoyChangePct <= 8 ? 30 :
        inputs.usdPkrYoyChangePct <= 15 ? 55 :
        inputs.usdPkrYoyChangePct <= 25 ? 75 : 90,
    },
    {
      label: "Private Credit (YoY)",
      formattedValue: `${inputs.privateCreditGrowthPct.toFixed(1)}%`,
      weight: 0.12,
      // High credit growth = supportive financial conditions = low recession pressure.
      // In Pakistan's chronic credit-crunch context, strong credit = investment can continue.
      pressureScore:
        inputs.privateCreditGrowthPct >= 20 ? 5 :
        inputs.privateCreditGrowthPct >= 12 ? 15 :
        inputs.privateCreditGrowthPct >= 6 ? 30 :
        inputs.privateCreditGrowthPct >= 0 ? 55 :
        inputs.privateCreditGrowthPct >= -5 ? 75 : 90,
    },
    {
      label: "CPI Inflation",
      formattedValue: `${inputs.cpiInflationPct.toFixed(1)}%`,
      weight: 0.10,
      pressureScore:
        inputs.cpiInflationPct <= 3 ? 5 :
        inputs.cpiInflationPct <= 6 ? 20 :
        inputs.cpiInflationPct <= 9 ? 40 :
        inputs.cpiInflationPct <= 13 ? 60 :
        inputs.cpiInflationPct <= 20 ? 75 : 90,
    },
    {
      label: "Real Policy Rate",
      formattedValue: `${(inputs.policyRatePct - inputs.cpiInflationPct).toFixed(1)}%`,
      weight: 0.10,
      pressureScore: (() => {
        const real = inputs.policyRatePct - inputs.cpiInflationPct;
        return real >= 3 ? 10 : real >= 1 ? 20 : real >= -1 ? 35 :
               real >= -3 ? 55 : real >= -6 ? 70 : 85;
      })(),
    },
    {
      label: "Import Cover",
      formattedValue: `${inputs.importCoverMonths.toFixed(1)} mo`,
      weight: 0.10,
      pressureScore:
        inputs.importCoverMonths >= 5 ? 5 :
        inputs.importCoverMonths >= 4 ? 15 :
        inputs.importCoverMonths >= 3 ? 30 :
        inputs.importCoverMonths >= 2.5 ? 50 :
        inputs.importCoverMonths >= 2 ? 65 :
        inputs.importCoverMonths >= 1.5 ? 80 : 95,
    },
    {
      label: "Current Account",
      formattedValue: `${inputs.currentAccountMonthlyB >= 0 ? "+" : ""}${inputs.currentAccountMonthlyB.toFixed(2)}B`,
      weight: 0.10,
      pressureScore:
        inputs.currentAccountMonthlyB >= 0 ? 5 :
        inputs.currentAccountMonthlyB >= -0.3 ? 20 :
        inputs.currentAccountMonthlyB >= -0.6 ? 40 :
        inputs.currentAccountMonthlyB >= -1.0 ? 60 : 80,
    },
  ];

  const modelScore = Math.round(
    factors.reduce((sum, f) => sum + f.pressureScore * f.weight, 0),
  );

  const sorted = [...factors].sort((a, b) => b.pressureScore - a.pressureScore);

  return {
    probability: toProbabilityRecession(modelScore),
    modelScore,
    riskCategory: getRiskCategory(toProbabilityRecession(modelScore)),
    topRiskFactors: sorted.slice(0, 3),
    topCushionFactors: sorted.slice(-3).reverse(),
  };
}

// v2 weight rationale (see audit):
// - SBP Reserves REMOVED: it was the numerator of Import Cover — double-counted at 0.25+0.20=0.45
// - Import Cover raised 0.20→0.32: sole reserve adequacy measure; IMF's preferred metric
// - Fiscal Balance raised 0.15→0.23: primary Pakistan default path per IMF Article IV
//   Thresholds recalibrated to Pakistan's actual deficit range (−3T to −12T PKR)
// - Current Account raised 0.15→0.20: direct FX flow determining reserve drawdown velocity
export function calculateDefaultRisk(inputs: DefaultModelInputs): RiskModelResult {
  const factors: RiskFactor[] = [
    {
      label: "Import Cover",
      formattedValue: `${inputs.importCoverMonths.toFixed(1)} mo`,
      weight: 0.32,
      pressureScore:
        inputs.importCoverMonths >= 5 ? 5 :
        inputs.importCoverMonths >= 4 ? 15 :
        inputs.importCoverMonths >= 3 ? 30 :
        inputs.importCoverMonths >= 2.5 ? 50 :
        inputs.importCoverMonths >= 2 ? 65 :
        inputs.importCoverMonths >= 1.5 ? 82 : 93,
    },
    {
      label: "Fiscal Balance",
      formattedValue: `${inputs.fiscalBalanceTrn.toFixed(1)}T PKR`,
      weight: 0.23,
      // Thresholds calibrated to Pakistan's historical range (FY20–FY25: −3T to −7T PKR).
      // −7T is at the IMF target zone; −9T+ is significantly expansionary.
      pressureScore:
        inputs.fiscalBalanceTrn >= -3 ? 10 :
        inputs.fiscalBalanceTrn >= -5 ? 25 :
        inputs.fiscalBalanceTrn >= -7 ? 45 :
        inputs.fiscalBalanceTrn >= -9 ? 65 :
        inputs.fiscalBalanceTrn >= -12 ? 80 : 92,
    },
    {
      label: "Current Account",
      formattedValue: `${inputs.currentAccountMonthlyB >= 0 ? "+" : ""}${inputs.currentAccountMonthlyB.toFixed(2)}B`,
      weight: 0.20,
      pressureScore:
        inputs.currentAccountMonthlyB >= 0 ? 5 :
        inputs.currentAccountMonthlyB >= -0.2 ? 15 :
        inputs.currentAccountMonthlyB >= -0.5 ? 35 :
        inputs.currentAccountMonthlyB >= -1.0 ? 60 : 82,
    },
    {
      label: "PKR Depreciation (YoY)",
      formattedValue: `${inputs.usdPkrYoyChangePct >= 0 ? "+" : ""}${inputs.usdPkrYoyChangePct.toFixed(1)}%`,
      weight: 0.15,
      pressureScore:
        inputs.usdPkrYoyChangePct <= -2 ? 5 :
        inputs.usdPkrYoyChangePct <= 3 ? 10 :
        inputs.usdPkrYoyChangePct <= 8 ? 25 :
        inputs.usdPkrYoyChangePct <= 20 ? 50 :
        inputs.usdPkrYoyChangePct <= 35 ? 75 : 90,
    },
    {
      label: "Policy Rate",
      formattedValue: `${inputs.policyRatePct.toFixed(1)}%`,
      weight: 0.10,
      pressureScore:
        inputs.policyRatePct <= 8 ? 10 :
        inputs.policyRatePct <= 12 ? 25 :
        inputs.policyRatePct <= 16 ? 45 :
        inputs.policyRatePct <= 20 ? 65 : 82,
    },
  ];

  const modelScore = Math.round(
    factors.reduce((sum, f) => sum + f.pressureScore * f.weight, 0),
  );

  const sorted = [...factors].sort((a, b) => b.pressureScore - a.pressureScore);

  return {
    probability: toProbabilityDefault(modelScore),
    modelScore,
    riskCategory: getRiskCategory(toProbabilityDefault(modelScore)),
    topRiskFactors: sorted.slice(0, 3),
    topCushionFactors: sorted.slice(-3).reverse(),
  };
}

export function getRiskGaugeColor(category: RiskCategory): string {
  const colors: Record<RiskCategory, string> = {
    Low:      "#34d399",
    Elevated: "#fbbf24",
    High:     "#f97316",
    Severe:   "#fb7185",
  };
  return colors[category];
}

export function getRiskCategoryClass(category: RiskCategory): string {
  const classes: Record<RiskCategory, string> = {
    Low:      "border-emerald-400/20 bg-emerald-400/10 text-emerald-400",
    Elevated: "border-amber-400/20 bg-amber-400/10 text-amber-400",
    High:     "border-orange-400/20 bg-orange-400/10 text-orange-400",
    Severe:   "border-rose-400/20 bg-rose-400/10 text-rose-400",
  };
  return classes[category];
}
