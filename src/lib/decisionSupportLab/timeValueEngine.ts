// Decision Support Lab — Time Value of Money engine (Phase 4).
//
// This is the platform's core financial-mathematics library, not a
// calculator: every TVM tool (Present Value, Future Value, Compound
// Interest, Loan/EMI, Annuity, Discount Factor Explorer) is a thin UI
// wrapper around the pure functions below, and every future investment
// tool (DCF, Bond Valuation, Retirement Planning, Goal Planning, Savings
// Planner) is expected to reuse them rather than re-derive the same
// formulas — a DCF is discountCashFlows() over a projected cash-flow
// array, a bond coupon schedule is annuityPresentValue() plus a single
// presentValue() for the face value, a retirement drawdown is
// buildAmortizationSchedule() run in reverse. Keeping the math here and
// nothing but presentation in the tool components is what makes that
// reuse possible.
//
// Every function is pure (no I/O, no React, no formatting) and takes
// rates as PERCENTAGES (e.g. 12 for 12%), matching the convention already
// established by purchasingPowerEngine.ts and salaryEngine.ts elsewhere
// in this Lab. Inflation-adjusted ("real") outputs are deliberately NOT
// duplicated here — tools that need them compose this engine's nominal
// results with purchasingPowerEngine.ts's deflateCompounding(), so there
// is exactly one place in the codebase that knows how to strip inflation
// out of a nominal figure.

/** Converts an annual rate and a compounding frequency into the effective per-period rate used internally by every formula below. */
function periodicRate(annualRatePct: number, compoundingsPerYear: number): number {
  return annualRatePct / 100 / compoundingsPerYear;
}

// ---------------------------------------------------------------------
// Core single-sum primitives
// ---------------------------------------------------------------------

/** Present value of a single future sum, discounted at `ratePct` per period over `periods` periods. The foundational TVM formula every other "present value of X" function in this engine (and future ones) reduces to. */
export function presentValue(futureValueAmount: number, ratePct: number, periods: number): number {
  return futureValueAmount / Math.pow(1 + ratePct / 100, periods);
}

/** Future value of a single present sum, compounded at `ratePct` per period over `periods` periods. Inverse of presentValue(). */
export function futureValue(presentValueAmount: number, ratePct: number, periods: number): number {
  return presentValueAmount * Math.pow(1 + ratePct / 100, periods);
}

/** The discount multiplier alone (no amount) — 1 ÷ (1+r)^n. Exposed standalone because the Discount Factor Explorer, sensitivity tables, and cash-flow discounting all need the bare multiplier, not just a discounted amount. */
export function discountFactor(ratePct: number, periods: number): number {
  return 1 / Math.pow(1 + ratePct / 100, periods);
}

export interface CompoundInterestResult {
  principal: number;
  endingValue: number;
  interestEarned: number;
  ratePct: number;
  years: number;
  compoundingsPerYear: number;
}

/** Ending value and interest earned on a principal compounded `compoundingsPerYear` times a year over `years` years — the general compound-interest formula A = P(1 + r/m)^(mt). */
export function compoundInterest(principal: number, ratePct: number, years: number, compoundingsPerYear: number): CompoundInterestResult {
  const endingValue = principal * Math.pow(1 + periodicRate(ratePct, compoundingsPerYear), compoundingsPerYear * years);
  return { principal, endingValue, interestEarned: endingValue - principal, ratePct, years, compoundingsPerYear };
}

export interface SimpleInterestResult {
  principal: number;
  endingValue: number;
  interestEarned: number;
}

/** Ending value under simple (non-compounding) interest — A = P(1 + rt). Provided mainly as the Compound Interest Calculator's point of comparison ("compounding earned you this much more than simple interest would have"). */
export function simpleInterest(principal: number, ratePct: number, years: number): SimpleInterestResult {
  const interestEarned = principal * (ratePct / 100) * years;
  return { principal, endingValue: principal + interestEarned, interestEarned };
}

/** Continuous compounding — A = Pe^(rt), the limit of compoundInterest() as compoundingsPerYear → ∞. */
export function continuousCompounding(principal: number, ratePct: number, years: number): number {
  return principal * Math.exp((ratePct / 100) * years);
}

export type CompoundingFrequency = "monthly" | "quarterly" | "semiannual" | "annual" | "daily" | "continuous";

/** Periods per year for every discrete compounding option the UI offers — the one place that mapping lives, so Present Value, Future Value and Compound Interest all agree on what "quarterly" means. */
export const COMPOUNDING_PERIODS_PER_YEAR: Record<Exclude<CompoundingFrequency, "continuous">, number> = {
  monthly: 12,
  quarterly: 4,
  semiannual: 2,
  annual: 1,
  daily: 365,
};

/** presentValue() generalized to accept a named compounding frequency (including continuous) instead of a raw per-period rate/periods pair — what the Present Value Calculator's form actually collects. */
export function presentValueWithFrequency(futureValueAmount: number, annualRatePct: number, years: number, frequency: CompoundingFrequency): number {
  if (frequency === "continuous") return continuousCompounding(futureValueAmount, -annualRatePct, years);
  const m = COMPOUNDING_PERIODS_PER_YEAR[frequency];
  return presentValue(futureValueAmount, annualRatePct / m, years * m);
}

/** futureValue() generalized to accept a named compounding frequency — the Future Value Calculator's counterpart to presentValueWithFrequency(). */
export function futureValueWithFrequency(presentValueAmount: number, annualRatePct: number, years: number, frequency: CompoundingFrequency): number {
  if (frequency === "continuous") return continuousCompounding(presentValueAmount, annualRatePct, years);
  const m = COMPOUNDING_PERIODS_PER_YEAR[frequency];
  return futureValue(presentValueAmount, annualRatePct / m, years * m);
}

// ---------------------------------------------------------------------
// Rate conversions
// ---------------------------------------------------------------------

/** Effective Annual Rate implied by a nominal rate compounded `compoundingsPerYear` times a year — EAR = (1 + i/m)^m − 1. */
export function effectiveAnnualRate(nominalRatePct: number, compoundingsPerYear: number): number {
  return (Math.pow(1 + periodicRate(nominalRatePct, compoundingsPerYear), compoundingsPerYear) - 1) * 100;
}

/** Alias of effectiveAnnualRate() under the name the Compound Interest / Loan tools' UI copy uses ("convert my nominal rate to what I'm really earning/paying"). */
export function nominalToEffective(nominalRatePct: number, compoundingsPerYear: number): number {
  return effectiveAnnualRate(nominalRatePct, compoundingsPerYear);
}

/** Inverse of effectiveAnnualRate() — the nominal (stated) annual rate that, compounded `compoundingsPerYear` times a year, produces the given effective rate. */
export function effectiveToNominal(effectiveRatePct: number, compoundingsPerYear: number): number {
  return (Math.pow(1 + effectiveRatePct / 100, 1 / compoundingsPerYear) - 1) * compoundingsPerYear * 100;
}

// ---------------------------------------------------------------------
// Cash flows & annuities
// ---------------------------------------------------------------------

export interface DiscountedCashFlow {
  period: number;
  cashFlow: number;
  discountFactorValue: number;
  presentValueAmount: number;
}

export interface DiscountCashFlowsResult {
  totalPresentValue: number;
  cashFlows: DiscountedCashFlow[];
}

/** Present value of an arbitrary sequence of future cash flows (cashFlows[0] is period 1, not period 0) — the primitive a future DCF/Bond Valuation tool sums a projected cash-flow series through, rather than reimplementing discounting itself. */
export function discountCashFlows(cashFlows: number[], ratePct: number): DiscountCashFlowsResult {
  const rows: DiscountedCashFlow[] = cashFlows.map((cashFlow, i) => {
    const period = i + 1;
    const discountFactorValue = discountFactor(ratePct, period);
    return { period, cashFlow, discountFactorValue, presentValueAmount: cashFlow * discountFactorValue };
  });
  return { totalPresentValue: rows.reduce((sum, r) => sum + r.presentValueAmount, 0), cashFlows: rows };
}

export type AnnuityType = "ordinary" | "due";

/** Present value of a level payment stream — ordinary annuity (payments at period end) or annuity due (payments at period start, each discounted one period less). The building block behind loan valuation, lease valuation, and any "stream of equal payments" future tool. */
export function annuityPresentValue(payment: number, ratePct: number, periods: number, type: AnnuityType = "ordinary"): number {
  const r = ratePct / 100;
  if (r === 0) return payment * periods * (type === "due" ? 1 : 1);
  const base = payment * ((1 - Math.pow(1 + r, -periods)) / r);
  return type === "due" ? base * (1 + r) : base;
}

/** Future value of a level payment stream — the savings-plan/retirement-contribution counterpart of annuityPresentValue(). */
export function annuityFutureValue(payment: number, ratePct: number, periods: number, type: AnnuityType = "ordinary"): number {
  const r = ratePct / 100;
  if (r === 0) return payment * periods;
  const base = payment * ((Math.pow(1 + r, periods) - 1) / r);
  return type === "due" ? base * (1 + r) : base;
}

/**
 * Level payment amount that fully amortizes `principal` over `periods`
 * periods at `ratePct` per period — the standard EMI/mortgage-payment
 * formula, derived by solving annuityPresentValue() for `payment`.
 */
export function loanPayment(principal: number, ratePct: number, periods: number): number {
  const r = ratePct / 100;
  if (r === 0) return principal / periods;
  return (principal * r) / (1 - Math.pow(1 + r, -periods));
}

export interface AmortizationRow {
  period: number;
  payment: number;
  principalPaid: number;
  interestPaid: number;
  remainingBalance: number;
}

export interface AmortizationSchedule {
  payment: number;
  totalPrincipal: number;
  totalInterest: number;
  rows: AmortizationRow[];
}

/**
 * Full period-by-period amortization schedule for a loan — each row splits
 * the level payment (from loanPayment()) into its principal and interest
 * components and tracks the declining balance. Reusable beyond the Loan
 * calculator: a reverse-signed version of this same row shape is exactly
 * what a Retirement Planning drawdown schedule needs.
 */
export function buildAmortizationSchedule(principal: number, ratePct: number, periods: number): AmortizationSchedule {
  const payment = loanPayment(principal, ratePct, periods);
  const r = ratePct / 100;
  let balance = principal;
  const rows: AmortizationRow[] = [];
  let totalInterest = 0;
  for (let period = 1; period <= periods; period++) {
    const interestPaid = balance * r;
    // Final period pays off whatever balance floating-point arithmetic left, rather than letting a residual cent linger past period `periods`.
    const principalPaid = period === periods ? balance : payment - interestPaid;
    balance = Math.max(0, balance - principalPaid);
    totalInterest += interestPaid;
    rows.push({ period, payment: interestPaid + principalPaid, principalPaid, interestPaid, remainingBalance: balance });
  }
  return { payment, totalPrincipal: principal, totalInterest, rows };
}

// ---------------------------------------------------------------------
// Series builders (for charts)
// ---------------------------------------------------------------------

export interface GrowthSeriesPoint {
  period: number;
  value: number;
}

/** Year-by-year (or period-by-period) compounding path of `baseValue` at `ratePct` — the shared data shape behind every "growth curve" chart in the TVM tools (Compound Interest's growth curve, Future Value's timeline). */
export function buildGrowthSeries(baseValue: number, ratePct: number, periods: number, compoundingsPerYear: number = 1): GrowthSeriesPoint[] {
  const points: GrowthSeriesPoint[] = [];
  for (let period = 0; period <= periods; period++) {
    points.push({ period, value: compoundInterest(baseValue, ratePct, period, compoundingsPerYear).endingValue });
  }
  return points;
}

export interface DiscountSeriesPoint {
  period: number;
  discountFactorValue: number;
}

/** Period-by-period discount factor path at `ratePct` — the Discount Factor Explorer's core visualization, and reusable by any future tool that wants to show "how much a rupee N years out is worth today" at a glance. */
export function buildDiscountSeries(ratePct: number, periods: number): DiscountSeriesPoint[] {
  const points: DiscountSeriesPoint[] = [];
  for (let period = 0; period <= periods; period++) {
    points.push({ period, discountFactorValue: discountFactor(ratePct, period) });
  }
  return points;
}

export interface AnnuitySeriesPoint {
  period: number;
  balance: number;
}

/** Period-by-period accumulated balance of a level contribution stream — the Annuity Calculator's growth chart, built by compounding each prior balance and adding one more payment rather than recomputing annuityFutureValue() from scratch every period. */
export function buildAnnuitySeries(payment: number, ratePct: number, periods: number, type: AnnuityType = "ordinary"): AnnuitySeriesPoint[] {
  const r = ratePct / 100;
  const points: AnnuitySeriesPoint[] = [{ period: 0, balance: 0 }];
  let balance = 0;
  for (let period = 1; period <= periods; period++) {
    balance = type === "due" ? (balance + payment) * (1 + r) : balance * (1 + r) + payment;
    points.push({ period, balance });
  }
  return points;
}
