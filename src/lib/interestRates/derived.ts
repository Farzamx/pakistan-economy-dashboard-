// Derived interest-rate indicators. Each is computed from the observed datasets at read time and kept separate from them; each formula is stated in
// FORMULAS (shown on the page and in docs/interest-rates-methodology.md). Rules:
//   - a derived value exists only where every input exists for the same date or month (no filling, no interpolation);
//   - administered rates enter as the value IN FORCE on the observation date (a fact about a step series, not an estimate);
//   - frequencies are aligned explicitly: daily with daily, per-auction with the administered rate in force on the auction date, monthly with monthly.

import { cpiYoy, kiborDaily, kiborMonthly, ldSeries, overnightRepoRate, pibSeries, policyRateRecords, policyRateSteps, repoRate, reverseRepoRate, tbillSeries, type LdSelector, type PolicyInstrument, type TbillTenor } from "./dataset";
import { daysBetween, rateAtMonthEnd, rateInForce } from "./series";
import type { DateValue, KiborTenor } from "./types";

/**
 * The real rate uses the exact (Fisher) relation, as the rest of the Interest Rate page does: ((1 + i/100) ÷ (1 + π/100) − 1) × 100. The simple
 * difference i − π is only an approximation and is poor when inflation is high (in May 2023: 21% policy rate, 38% inflation → −12.3 exact vs −17 simple).
 */
export const realRate = (nominal: number, inflation: number) => ((1 + nominal / 100) / (1 + inflation / 100) - 1) * 100;

export const FORMULAS = {
  realPolicy: "Real policy rate (ex post) for month m = ((1 + policy rate in force on the last day of m) ÷ (1 + national CPI inflation, year on year, for m) − 1) × 100.",
  realKibor: "Real KIBOR for month m = ((1 + mean of the daily KIBOR fixings published in m) ÷ (1 + national CPI inflation, year on year, for m) − 1) × 100.",
  policyMinusKibor: "Policy minus KIBOR on day d = policy rate in force on d − KIBOR fixing on d. Negative = KIBOR above the policy rate.",
  policyMinusTbill: "Policy minus T-bill at auction a = policy rate in force on the auction date − that auction's cut-off yield for the tenor. Negative = yield above the policy rate.",
  lendingDepositSpread: "Lending-deposit spread for month m = weighted-average lending rate − weighted-average deposit rate, both on the same basis (new: gross disbursements vs fresh deposits; outstanding: loans vs deposits), entity, zero-mark-up and inter-bank treatment.",
  termSpread: "Term spread = 10-year PIB cut-off yield − 3-month T-bill cut-off yield, for a PIB auction and the nearest earlier-or-same-day T-bill auction no more than 7 days apart.",
  corridorWidth: "Corridor width on day d = reverse repo (ceiling) rate in force − repo (floor) rate in force (from 17 Aug 2009).",
  orrPosition: "Overnight repo position on day d = weighted-average overnight repo rate − policy rate in force on d.",
} as const;

export interface DatedValue {
  date: string;
  value: number;
}

export interface RealRow {
  month: string;
  nominal: number;
  inflation: number;
  real: number;
  /** For the real policy rate: which administered rate was the policy rate. For real KIBOR: the number of fixings averaged. */
  instrument?: PolicyInstrument;
  days?: number;
}

/** Real policy rate, monthly, from the first CPI month (Jul 2016). */
export function realPolicyRate(): RealRow[] {
  const steps = policyRateSteps();
  const records = policyRateRecords();
  return cpiYoy().flatMap(({ month, value: inflation }) => {
    const nominal = rateAtMonthEnd(steps, month);
    if (nominal === null) return [];
    const last = [...records].reverse().find((r) => r.date.slice(0, 7) <= month)!;
    return [{ month, nominal, inflation, real: realRate(nominal, inflation), instrument: last.instrument }];
  });
}

export function realKibor(tenor: KiborTenor): RealRow[] {
  const means = new Map(kiborMonthly(tenor).map((m) => [m.month, m]));
  return cpiYoy().flatMap(({ month, value: inflation }) => {
    const m = means.get(month);
    return m ? [{ month, nominal: m.mean, inflation, real: realRate(m.mean, inflation), days: m.days }] : [];
  });
}

/** Daily: policy rate in force minus the KIBOR fixing. */
export function policyMinusKibor(tenor: KiborTenor): DatedValue[] {
  const steps = policyRateSteps();
  return kiborDaily(tenor).flatMap(([date, k]) => {
    const p = rateInForce(steps, date);
    return p === null ? [] : [{ date, value: p - k }];
  });
}

/** Per auction: policy rate in force on the auction date minus the cut-off yield. */
export function policyMinusTbill(tenor: TbillTenor = "3M"): DatedValue[] {
  const steps = policyRateSteps();
  return tbillSeries(tenor, "cutoff").flatMap(({ date, value }) => {
    const p = rateInForce(steps, date);
    return p === null ? [] : [{ date, value: p - value }];
  });
}

export interface SpreadRow {
  period: string;
  lending: number;
  deposit: number;
  spread: number;
  regime: 2 | 3 | 4;
  flag: "" | "P" | "R";
}

export function lendingDepositSpread(basis: "new" | "outstanding", sel: Omit<LdSelector, "measure">): SpreadRow[] {
  const lend = ldSeries({ ...sel, measure: basis === "new" ? "grossDisbursements" : "outstandingLoans" });
  const dep = new Map(ldSeries({ ...sel, measure: basis === "new" ? "freshDeposits" : "outstandingDeposits" }).map((p) => [p.period, p]));
  return lend.flatMap((l) => {
    const d = dep.get(l.period);
    return d ? [{ period: l.period, lending: l.value, deposit: d.value, spread: l.value - d.value, regime: l.regime, flag: l.flag || d.flag }] : [];
  });
}

export interface TermSpreadRow {
  date: string; // PIB auction date
  tbillDate: string;
  long: number;
  short: number;
  spread: number;
}

export function termSpread(maxDays = 7): TermSpreadRow[] {
  const short = tbillSeries("3M", "cutoff");
  return pibSeries("10Y", "cutoff").flatMap(({ date, value }) => {
    let best: { date: string; value: number } | null = null;
    for (const s of short) if (s.date <= date && daysBetween(s.date, date) <= maxDays) best = s;
    return best ? [{ date, tbillDate: best.date, long: value, short: best.value, spread: value - best.value }] : [];
  });
}

/** The corridor on every date either bound changed, from 17 Aug 2009. */
export function corridor(): { date: string; ceiling: number; floor: number; target: number | null; width: number }[] {
  const dates = [...new Set([...reverseRepoRate(), ...repoRate()].map((e) => e[0]))].filter((d) => d >= "2009-08-17").sort();
  const target = policyRateRecords().filter((r) => r.instrument === "target").map((r) => [r.date, r.value] as DateValue);
  return dates.map((d) => {
    const ceiling = rateInForce(reverseRepoRate(), d)!;
    const floor = rateInForce(repoRate(), d)!;
    return { date: d, ceiling, floor, target: rateInForce(target, d), width: ceiling - floor };
  });
}

/** Overnight repo rate relative to the policy rate in force, daily. */
export function orrMinusPolicy(): DatedValue[] {
  const steps = policyRateSteps();
  return overnightRepoRate().flatMap(([date, v]) => {
    const p = rateInForce(steps, date);
    return p === null ? [] : [{ date, value: v - p }];
  });
}
