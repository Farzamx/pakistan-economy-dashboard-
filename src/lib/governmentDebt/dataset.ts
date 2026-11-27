// Read access to the generated government-debt dataset (src/data/governmentDebt.ts). Decodes the tuples into named records; SBP and Ministry of Finance
// figures stay separate. Nothing is filled or interpolated.

import { GOVERNMENT_DEBT_PROVENANCE, MOF_DEBT_REVIEW, SBP_DEBT_QUARTERLY, SBP_DEBT_RATIOS, SBP_SUMMARY_FLAGS } from "@/data/governmentDebt";

export interface DebtQuarter {
  date: string;
  domestic: number;
  external: number;
  imf: number;
  grossPublic: number;
  frdla: number;
  govDeposits: number;
  totalExternal: number;
  totalDebtLiabilities: number;
  /** SBP's flag for the quarter where its summary table prints one: P provisional, R revised. */
  flag: "P" | "R" | "";
}

export interface DebtRatio {
  date: string; // fiscal-year end (June 30)
  grossPublicPct: number;
  frdlaPct: number;
  domesticPct: number;
  totalExternalPct: number;
  totalDebtLiabilitiesPct: number;
  gdp: number; // billion PKR
}

export interface MofYear {
  date: string;
  totalPublic: number;
  domestic: number;
  external: number;
  totalPct: number;
  domesticPct: number;
  externalPct: number;
  frdla: number;
  frdlaPct: number;
}

const flags = new Map(SBP_SUMMARY_FLAGS.map(([d, f]) => [d, f]));

export const debtQuarters = (): DebtQuarter[] =>
  SBP_DEBT_QUARTERLY.map(([date, domestic, external, imf, grossPublic, frdla, govDeposits, totalExternal, totalDebtLiabilities]) => ({
    date, domestic, external, imf, grossPublic, frdla, govDeposits, totalExternal, totalDebtLiabilities, flag: flags.get(date) ?? "",
  }));

export const debtRatios = (): DebtRatio[] =>
  SBP_DEBT_RATIOS.map(([date, grossPublicPct, frdlaPct, domesticPct, totalExternalPct, totalDebtLiabilitiesPct, gdp]) => ({ date, grossPublicPct, frdlaPct, domesticPct, totalExternalPct, totalDebtLiabilitiesPct, gdp }));

export const mofReview = (): MofYear[] =>
  MOF_DEBT_REVIEW.map(([date, totalPublic, domestic, external, totalPct, domesticPct, externalPct, frdla, frdlaPct]) => ({ date, totalPublic, domestic, external, totalPct, domesticPct, externalPct, frdla, frdlaPct }));

export const debtProvenance = () => GOVERNMENT_DEBT_PROVENANCE;

/** "2026-09-30" -> "Sep 2026"; "2026-06-30" as a fiscal-year end -> "FY26 (June 2026)". */
const M = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const quarterLabel = (d: string) => `${M[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;
export const fiscalYearLabel = (d: string) => `FY${d.slice(2, 4)} (end-June ${d.slice(0, 4)})`;
