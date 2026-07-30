// Data behind the Financial Formula Explorer — one entry per engine
// primitive. Deliberately data-driven (an array consumed by one generic
// FormulaCard) rather than ten hand-built page sections, and every
// computeExample() calls the REAL timeValueEngine function rather than
// re-deriving the formula in a second place — the Explorer is a reference
// view onto the same engine every calculator tool uses, not a parallel
// implementation of the math.
//
// Formula text, variable descriptions, interpretations, assumptions and
// limitations are deliberately English-only, matching the convention
// every other tool's ExplainTheMath content already follows in this Lab
// (methodology/assumptions/limitations strings are never run through the
// ur/rm i18n system — only the surrounding UI chrome is).
import {
  presentValue,
  futureValue,
  compoundInterest,
  simpleInterest,
  continuousCompounding,
  discountFactor,
  annuityPresentValue,
  annuityFutureValue,
  loanPayment,
  effectiveAnnualRate,
} from "@/lib/decisionSupportLab/timeValueEngine";
import type { FormulaDefinition } from "@/components/formulaExplorer/FormulaCard";

const fmtPkr = (n: number) => `Rs ${Math.round(n).toLocaleString("en-US")}`;

export function buildFormulaDefinitions(t: (key: string) => string): FormulaDefinition[] {
  return [
    {
      id: "present-value",
      title: t("formulaExplorer.presentValueName"),
      formula: "PV = FV ÷ (1 + r)^n",
      variables: [
        { symbol: "FV", description: "A future amount of money" },
        { symbol: "r", description: "The discount rate per period" },
        { symbol: "n", description: "The number of periods" },
      ],
      interpretation:
        "Present value answers 'what is a future amount worth today?' It's the foundation every other time-value formula on this page builds on — discounting a single future sum back to today's terms.",
      assumptions: ["A constant discount rate for the entire horizon."],
      limitations: ["A single flat rate is a simplification of real-world rate curves."],
      exampleInputs: [
        { label: "Future Value", defaultValue: 100000, step: 1000, suffix: "Rs" },
        { label: "Rate per Period", defaultValue: 10, step: 0.5, suffix: "%" },
        { label: "Periods", defaultValue: 10, step: 1 },
      ],
      computeExample: ([fv, rate, n]) => `Present Value = ${fmtPkr(presentValue(fv, rate, n))}`,
    },
    {
      id: "future-value",
      title: t("formulaExplorer.futureValueName"),
      formula: "FV = PV × (1 + r)^n",
      variables: [
        { symbol: "PV", description: "An amount of money today" },
        { symbol: "r", description: "The growth rate per period" },
        { symbol: "n", description: "The number of periods" },
      ],
      interpretation: "Future value is the exact mathematical inverse of present value — it projects a sum forward instead of discounting one back.",
      assumptions: ["A constant growth rate for the entire horizon."],
      limitations: ["Real returns vary year to year — this models a constant-rate idealization."],
      exampleInputs: [
        { label: "Present Value", defaultValue: 100000, step: 1000, suffix: "Rs" },
        { label: "Rate per Period", defaultValue: 10, step: 0.5, suffix: "%" },
        { label: "Periods", defaultValue: 10, step: 1 },
      ],
      computeExample: ([pv, rate, n]) => `Future Value = ${fmtPkr(futureValue(pv, rate, n))}`,
    },
    {
      id: "compound-interest",
      title: t("formulaExplorer.compoundInterestName"),
      formula: "A = P × (1 + r ÷ m)^(m × t)",
      variables: [
        { symbol: "P", description: "Principal" },
        { symbol: "r", description: "Annual rate" },
        { symbol: "m", description: "Compounding periods per year" },
        { symbol: "t", description: "Years" },
      ],
      interpretation: "The general compound-interest formula — interest is calculated on the running balance, not just the original principal, so growth accelerates over time.",
      assumptions: ["A constant rate and compounding frequency for the entire period."],
      limitations: ["Ignores fees, taxes, or withdrawals during the period."],
      exampleInputs: [
        { label: "Principal", defaultValue: 100000, step: 1000, suffix: "Rs" },
        { label: "Annual Rate", defaultValue: 10, step: 0.5, suffix: "%" },
        { label: "Years", defaultValue: 5, step: 1 },
        { label: "Compoundings / Year", defaultValue: 12, step: 1 },
      ],
      computeExample: ([principal, rate, years, m]) => `Ending Value = ${fmtPkr(compoundInterest(principal, rate, years, m).endingValue)}`,
    },
    {
      id: "simple-interest",
      title: t("formulaExplorer.simpleInterestName"),
      formula: "A = P × (1 + r × t)",
      variables: [
        { symbol: "P", description: "Principal" },
        { symbol: "r", description: "Annual rate" },
        { symbol: "t", description: "Years" },
      ],
      interpretation: "Simple interest pays the same rupee amount every year, always calculated on the original principal — the point of comparison the Compound Interest Calculator uses to show what compounding actually earns you.",
      assumptions: ["A constant rate for the entire period, applied only to the original principal."],
      limitations: ["Rarely used for real long-term savings or loans — compound interest is the norm."],
      exampleInputs: [
        { label: "Principal", defaultValue: 100000, step: 1000, suffix: "Rs" },
        { label: "Annual Rate", defaultValue: 10, step: 0.5, suffix: "%" },
        { label: "Years", defaultValue: 5, step: 1 },
      ],
      computeExample: ([principal, rate, years]) => `Ending Value = ${fmtPkr(simpleInterest(principal, rate, years).endingValue)}`,
    },
    {
      id: "continuous-compounding",
      title: t("formulaExplorer.continuousCompoundingName"),
      formula: "A = P × e^(r × t)",
      variables: [
        { symbol: "P", description: "Principal" },
        { symbol: "r", description: "Annual rate" },
        { symbol: "t", description: "Years" },
      ],
      interpretation: "The theoretical limit of compound interest as the compounding frequency approaches infinity — used in academic finance and as the upper bound on what more frequent compounding can earn you.",
      assumptions: ["Interest compounds continuously, an idealization no real account actually offers."],
      limitations: ["Real accounts compound at most daily — this is a theoretical ceiling, not an achievable rate."],
      exampleInputs: [
        { label: "Principal", defaultValue: 100000, step: 1000, suffix: "Rs" },
        { label: "Annual Rate", defaultValue: 10, step: 0.5, suffix: "%" },
        { label: "Years", defaultValue: 5, step: 1 },
      ],
      computeExample: ([principal, rate, years]) => `Ending Value = ${fmtPkr(continuousCompounding(principal, rate, years))}`,
    },
    {
      id: "discount-factor",
      title: t("formulaExplorer.discountFactorName"),
      formula: "DF = 1 ÷ (1 + r)^n",
      variables: [
        { symbol: "r", description: "The discount rate per period" },
        { symbol: "n", description: "The number of periods" },
      ],
      interpretation: "The bare multiplier — no amount attached — that converts any future sum into today's equivalent. Multiply any future cash flow by this number to discount it.",
      assumptions: ["A constant discount rate."],
      limitations: ["None beyond the rate assumption — this is a pure mathematical multiplier."],
      exampleInputs: [
        { label: "Rate per Period", defaultValue: 10, step: 0.5, suffix: "%" },
        { label: "Periods", defaultValue: 10, step: 1 },
      ],
      computeExample: ([rate, n]) => `Discount Factor = ${discountFactor(rate, n).toFixed(4)}`,
    },
    {
      id: "annuity-present-value",
      title: t("formulaExplorer.annuityPresentValueName"),
      formula: "PV = Payment × (1 − (1 + r)^−n) ÷ r",
      variables: [
        { symbol: "Payment", description: "The equal amount per period" },
        { symbol: "r", description: "Rate per period" },
        { symbol: "n", description: "Number of periods" },
      ],
      interpretation: "Values a stream of equal future payments as a single lump sum today — the same math a lender uses to price a loan, or a pension fund uses to price a payout obligation.",
      assumptions: ["Ordinary annuity: payments occur at the end of each period."],
      limitations: ["Real payment streams may not be perfectly equal or regular."],
      exampleInputs: [
        { label: "Payment", defaultValue: 10000, step: 500, suffix: "Rs" },
        { label: "Rate per Period", defaultValue: 1, step: 0.25, suffix: "%" },
        { label: "Periods", defaultValue: 60, step: 1 },
      ],
      computeExample: ([payment, rate, n]) => `Present Value = ${fmtPkr(annuityPresentValue(payment, rate, n, "ordinary"))}`,
    },
    {
      id: "annuity-future-value",
      title: t("formulaExplorer.annuityFutureValueName"),
      formula: "FV = Payment × ((1 + r)^n − 1) ÷ r",
      variables: [
        { symbol: "Payment", description: "The equal amount per period" },
        { symbol: "r", description: "Rate per period" },
        { symbol: "n", description: "Number of periods" },
      ],
      interpretation: "Values a stream of equal contributions as a single accumulated balance at the end — the savings-plan counterpart to annuity present value.",
      assumptions: ["Ordinary annuity: contributions occur at the end of each period."],
      limitations: ["Assumes every contribution is exactly equal — real savings behavior varies."],
      exampleInputs: [
        { label: "Payment", defaultValue: 10000, step: 500, suffix: "Rs" },
        { label: "Rate per Period", defaultValue: 1, step: 0.25, suffix: "%" },
        { label: "Periods", defaultValue: 60, step: 1 },
      ],
      computeExample: ([payment, rate, n]) => `Future Value = ${fmtPkr(annuityFutureValue(payment, rate, n, "ordinary"))}`,
    },
    {
      id: "loan-payment",
      title: t("formulaExplorer.loanPaymentName"),
      formula: "Payment = (Principal × r) ÷ (1 − (1 + r)^−n)",
      variables: [
        { symbol: "Principal", description: "The loan amount" },
        { symbol: "r", description: "Rate per payment period" },
        { symbol: "n", description: "Total number of payments" },
      ],
      interpretation: "Solves the annuity present-value formula for the payment instead of the present value — a loan is mathematically identical to the lender holding an annuity equal to the loan amount.",
      assumptions: ["A fixed rate and a fixed, fully-amortizing payment schedule."],
      limitations: ["Real loans may include fees or rate resets not captured here."],
      exampleInputs: [
        { label: "Loan Amount", defaultValue: 1000000, step: 10000, suffix: "Rs" },
        { label: "Rate per Period", defaultValue: 1, step: 0.25, suffix: "%" },
        { label: "Periods", defaultValue: 240, step: 1 },
      ],
      computeExample: ([principal, rate, n]) => `Payment = ${fmtPkr(loanPayment(principal, rate, n))}`,
    },
    {
      id: "effective-annual-rate",
      title: t("formulaExplorer.effectiveAnnualRateName"),
      formula: "EAR = (1 + i ÷ m)^m − 1",
      variables: [
        { symbol: "i", description: "The nominal (stated) annual rate" },
        { symbol: "m", description: "Compounding periods per year" },
      ],
      interpretation: "The true annual rate you actually earn or pay once compounding is accounted for — the fair way to compare two rates quoted with different compounding frequencies.",
      assumptions: ["A constant nominal rate and compounding frequency."],
      limitations: ["A stated rate alone, without knowing the compounding frequency, cannot be compared fairly — this formula is exactly why."],
      exampleInputs: [
        { label: "Nominal Annual Rate", defaultValue: 12, step: 0.5, suffix: "%" },
        { label: "Compoundings / Year", defaultValue: 12, step: 1 },
      ],
      computeExample: ([nominalRate, m]) => `Effective Annual Rate = ${effectiveAnnualRate(nominalRate, m).toFixed(2)}%`,
    },
  ];
}
