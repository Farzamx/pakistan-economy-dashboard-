// Income & Wealth Intelligence — salary-specific wrappers around the
// generic compounding primitives in purchasingPowerEngine.ts. Kept thin
// deliberately: all the actual math (computeRealRateChange,
// projectCompounding, deflateCompounding) lives there and is reused here,
// not reimplemented — Raise Reality Check and Salary Required only add a
// verdict/labeling layer on top, per the brief's "Salary tools should
// reuse the Purchasing Power Engine whenever possible."
import { computeRealRateChange, deflateCompounding, projectCompounding } from "@/lib/decisionSupportLab/purchasingPowerEngine";

export type RaiseVerdictTone = "positive" | "negative" | "neutral";

export interface RaiseRealityCheckResult {
  currentSalary: number;
  nominalRaisePct: number;
  inflationPct: number;
  /** Precise compounding real change — see computeRealRateChange(). */
  realChangePct: number;
  newNominalSalary: number;
  /** newNominalSalary expressed in this-year's purchasing power — the honest "what your raise is really worth" figure. */
  realEquivalentSalary: number;
  tone: RaiseVerdictTone;
}

// Below this magnitude, a raise is treated as "roughly kept pace with
// inflation" rather than a meaningful real gain/loss — same neutral-band
// pattern personalInflation/engine.ts uses for its own verdict.
const RAISE_NEUTRAL_BAND_PCT = 0.5;

export function computeRaiseRealityCheck(currentSalary: number, nominalRaisePct: number, inflationPct: number): RaiseRealityCheckResult {
  const realChangePct = computeRealRateChange(nominalRaisePct, inflationPct);
  const newNominalSalary = projectCompounding(currentSalary, nominalRaisePct, 1);
  const realEquivalentSalary = deflateCompounding(newNominalSalary, inflationPct, 1);
  const tone: RaiseVerdictTone = realChangePct > RAISE_NEUTRAL_BAND_PCT ? "positive" : realChangePct < -RAISE_NEUTRAL_BAND_PCT ? "negative" : "neutral";
  return { currentSalary, nominalRaisePct, inflationPct, realChangePct, newNominalSalary, realEquivalentSalary, tone };
}

export type InflationSource = "personal" | "official";

export interface SalaryRequiredResult {
  currentSalary: number;
  inflationPct: number;
  inflationSource: InflationSource;
  years: number;
  /** Nominal salary needed at `years` from now to hold today's lifestyle constant. */
  requiredSalary: number;
  requiredMonthlyIncome: number;
  difference: number;
  /**
   * Real change if the visitor's own assumed/planned raise rate were
   * applied instead of the inflation rate required to stand still —
   * negative means their planned raise falls short of what's needed.
   * Reuses computeRealRateChange() rather than a bespoke gap formula.
   */
  realIncomeGapPct: number;
}

export function computeSalaryRequired(
  currentSalary: number,
  inflationPct: number,
  inflationSource: InflationSource,
  years: number,
  assumedRaisePct: number,
): SalaryRequiredResult {
  const requiredSalary = projectCompounding(currentSalary, inflationPct, years);
  const difference = requiredSalary - currentSalary;
  const realIncomeGapPct = computeRealRateChange(assumedRaisePct, inflationPct);
  return {
    currentSalary,
    inflationPct,
    inflationSource,
    years,
    requiredSalary,
    requiredMonthlyIncome: requiredSalary,
    difference,
    realIncomeGapPct,
  };
}
