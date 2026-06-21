// Derives every chart-ready shape the Budget Workshop needs from the static
// BUDGET_HISTORICAL dataset — allocation breakdowns, the Rs100 visualization,
// year-over-year deltas, and rule-based insights. Pure, synchronous, no IO:
// unlike Comparisons, there is no live fetch behind this feature (Budget in
// Brief is a PDF published once a year — see budgetHistorical.ts's header
// note), so every function here just transforms the one static dataset.

import { BUDGET_HISTORICAL, type BudgetYearRecord } from "@/data/budgetHistorical";

export function getAllFiscalYears(): string[] {
  return BUDGET_HISTORICAL.years.map((y) => y.fiscalYear);
}

export function getYearRecord(fiscalYear: string): BudgetYearRecord | undefined {
  return BUDGET_HISTORICAL.years.find((y) => y.fiscalYear === fiscalYear);
}

export function getPreviousYearRecord(fiscalYear: string): BudgetYearRecord | undefined {
  const idx = BUDGET_HISTORICAL.years.findIndex((y) => y.fiscalYear === fiscalYear);
  return idx > 0 ? BUDGET_HISTORICAL.years[idx - 1] : undefined;
}

export interface YoyChange {
  absolute: number;
  pct: number;
  direction: "up" | "down" | "flat";
}

/** Computes the year-over-year change for a field, or null if either year's value is missing (e.g. FY2010-11's null fields) — never silently treats a missing figure as zero. */
export function getYoyChange(
  field: keyof BudgetYearRecord,
  current: BudgetYearRecord,
  previous: BudgetYearRecord | undefined,
): YoyChange | null {
  if (!previous) return null;
  const curVal = current[field];
  const prevVal = previous[field];
  if (typeof curVal !== "number" || typeof prevVal !== "number") return null;
  const absolute = curVal - prevVal;
  const pct = prevVal !== 0 ? (absolute / Math.abs(prevVal)) * 100 : 0;
  return { absolute, pct, direction: pct > 0.05 ? "up" : pct < -0.05 ? "down" : "flat" };
}

export interface AllocationSlice {
  label: string;
  value: number;
  pct: number;
  color: string;
}

const ALLOCATION_COLORS: Record<string, string> = {
  "Debt Servicing": "#fb7185",
  Defence: "#38bdf8",
  PSDP: "#34d399",
  Subsidies: "#f59e0b",
  "Provincial Transfers": "#a855f7",
  Pension: "#818cf8",
  Other: "#64748b",
};

/**
 * Total Outlay (Table 1's "Total Expenditure") and Provincial Transfer are
 * NOT additive in Budget in Brief's own structure — the provincial NFC
 * share is deducted on the *revenue* side to arrive at Net Revenue
 * Receipts, before Total Expenditure is even computed; it is not one of
 * Total Expenditure's components. So a 7-slice breakdown that wants
 * Provincial Transfers to sit alongside Debt Servicing/Defence/PSDP/
 * Subsidies/Pension needs a wider base than Total Outlay alone: the full
 * resource envelope the federal government collects before splitting it
 * between what provinces receive and what the federal government spends.
 * Verified against FY2026-27's own Table 1: totalOutlay + provincialTransfer
 * (27,619bn) minus the 6 named slices (23,162bn) leaves 4,457bn — which
 * matches Table 1's own Grants & Transfers (2,680) + Running of Civil Govt.
 * (1,071) + Net Lending (276) + Provision for Emergency (430) = 4,457bn
 * exactly, confirming this is the correct base, not a fudge.
 */
export function getBudgetEnvelope(year: BudgetYearRecord): number {
  return year.totalOutlay + year.provincialTransfer;
}

/**
 * "Where does the budget go" — the 7-slice breakdown of the budget envelope
 * (see getBudgetEnvelope) using Budget in Brief's own economic
 * classification (Table 1). Education and Health are deliberately excluded
 * here: they come from a *different* classification table (functional, not
 * economic) that doesn't subtract cleanly out of this base alongside these
 * — see budgetHistorical.ts. "Other" is therefore the true residual
 * (Grants & Transfers, Running of Civil Govt., Net Lending, contingency
 * provisions, etc.), not a fudge factor.
 */
export function getAllocationBreakdown(year: BudgetYearRecord): AllocationSlice[] {
  const envelope = getBudgetEnvelope(year);
  const named: { label: string; value: number }[] = [
    { label: "Debt Servicing", value: year.debtServicing ?? 0 },
    { label: "Defence", value: year.defence },
    { label: "PSDP", value: year.federalPsdp },
    { label: "Subsidies", value: year.subsidies },
    { label: "Provincial Transfers", value: year.provincialTransfer },
    { label: "Pension", value: year.pension ?? 0 },
  ];
  const namedTotal = named.reduce((s, x) => s + x.value, 0);
  const other = Math.max(0, envelope - namedTotal);

  const slices = [...named, { label: "Other", value: other }];
  return slices.map((s) => ({
    ...s,
    pct: envelope > 0 ? (s.value / envelope) * 100 : 0,
    color: ALLOCATION_COLORS[s.label] ?? "#64748b",
  }));
}

export interface Rs100Slice {
  label: string;
  rsPerHundred: number;
  color: string;
}

/**
 * "For every Rs100 the government spends" — the same allocation breakdown
 * as getAllocationBreakdown, scaled to a 100-Rupee base and rounded to whole
 * Rupees for the visual. Rounding residue (every slice rounds independently,
 * so the eight numbers don't always sum to exactly 100) is absorbed into
 * "Other" rather than every slice individually, since arbitrarily nudging
 * named categories would misstate them more than absorbing a sub-Rupee
 * residue into the one bucket that's already a residual by definition.
 */
export function getRs100Breakdown(year: BudgetYearRecord): Rs100Slice[] {
  const breakdown = getAllocationBreakdown(year);
  const rounded = breakdown.map((s) => ({
    label: s.label === "PSDP" ? "Development" : s.label,
    rsPerHundred: Math.round(s.pct),
    color: s.color,
  }));
  const sum = rounded.reduce((s, x) => s + x.rsPerHundred, 0);
  const residue = 100 - sum;
  const otherIdx = rounded.findIndex((s) => s.label === "Other");
  if (otherIdx >= 0) rounded[otherIdx].rsPerHundred += residue;
  return rounded;
}

/**
 * Implied nominal GDP for the fiscal year, derived algebraically from two
 * already-cited figures in the same Budget in Brief table (fiscalDeficitRs
 * / fiscalDeficitPctGdp) — not an independently sourced GDP series. Budget
 * in Brief only states an explicit "Nominal GDP" row from the FY2020-21
 * template onward; for earlier years this is the only way to express a
 * category as "% of GDP" without pulling in a GDP series from a different
 * document on a different vintage/basis than the deficit figure itself.
 */
export function getImpliedNominalGdp(year: BudgetYearRecord): number {
  return year.fiscalDeficitRs / (year.fiscalDeficitPctGdp / 100);
}

export interface DebtServicingShare {
  valueRs: number;
  pctOfBudget: number;
}

export function getDebtServicingShare(year: BudgetYearRecord): DebtServicingShare | null {
  if (year.debtServicing === null) return null;
  return {
    valueRs: year.debtServicing,
    pctOfBudget: year.totalOutlay > 0 ? (year.debtServicing / year.totalOutlay) * 100 : 0,
  };
}

export type BudgetTrendField =
  | "totalOutlay"
  | "fbrTaxRevenue"
  | "nonTaxRevenue"
  | "provincialTransfer"
  | "grantsAndTransfersOther"
  | "federalPsdp"
  | "defence"
  | "debtServicing"
  | "pension"
  | "subsidies"
  | "federalEducation"
  | "federalHealth"
  | "fiscalDeficitRs";

export type TrendValueMode = "nominal" | "pctGdp";

export interface TrendPoint {
  fiscalYear: string;
  values: Record<string, number | null>;
}

/** Builds one chart-ready point per fiscal year for the selected fields, in nominal Rs or as % of (implied) GDP. Missing figures (e.g. FY2010-11's nulls) stay null — never forward-filled or estimated. */
export function getCategoryTrendSeries(
  fields: BudgetTrendField[],
  mode: TrendValueMode,
  years: BudgetYearRecord[] = BUDGET_HISTORICAL.years,
): TrendPoint[] {
  return years.map((year) => {
    const gdp = mode === "pctGdp" ? getImpliedNominalGdp(year) : null;
    const values: Record<string, number | null> = {};
    for (const field of fields) {
      const raw = year[field];
      if (typeof raw !== "number") {
        values[field] = null;
        continue;
      }
      values[field] = mode === "pctGdp" && gdp ? (raw / gdp) * 100 : raw;
    }
    return { fiscalYear: year.fiscalYear, values };
  });
}

export interface BudgetInsight {
  text: string;
}

/**
 * Deterministic, rule-based insights computed directly from the dataset —
 * no AI generation. Every claim below is a direct calculation over the
 * BUDGET_HISTORICAL figures; nothing here infers a cause the numbers alone
 * can't support.
 */
export function generateBudgetInsights(years: BudgetYearRecord[] = BUDGET_HISTORICAL.years): BudgetInsight[] {
  const insights: BudgetInsight[] = [];
  if (years.length === 0) return insights;
  const latest = years[years.length - 1];
  const earliest = years[0];

  // Largest allocation (current year, excluding the Other residual).
  const breakdown = getAllocationBreakdown(latest).filter((s) => s.label !== "Other");
  const largest = breakdown.reduce((a, b) => (b.value > a.value ? b : a));
  insights.push({
    text: `${largest.label} is the largest single allocation in the FY${latest.fiscalYear} budget at Rs ${largest.value.toFixed(0)}bn — ${largest.pct.toFixed(0)}% of total outlay.`,
  });

  // Fastest-growing named allocation over the full available range (CAGR).
  const years_span = years.length - 1;
  if (years_span >= 2) {
    const fields: { key: "debtServicing" | "defence" | "federalPsdp" | "subsidies" | "provincialTransfer" | "pension"; label: string }[] = [
      { key: "debtServicing", label: "Debt Servicing" },
      { key: "defence", label: "Defence" },
      { key: "federalPsdp", label: "PSDP" },
      { key: "subsidies", label: "Subsidies" },
      { key: "provincialTransfer", label: "Provincial Transfers" },
      { key: "pension", label: "Pension" },
    ];
    let fastest: { label: string; cagr: number } | null = null;
    for (const f of fields) {
      const startVal = earliest[f.key];
      const endVal = latest[f.key];
      if (typeof startVal !== "number" || typeof endVal !== "number" || startVal <= 0) continue;
      const cagr = (Math.pow(endVal / startVal, 1 / years_span) - 1) * 100;
      if (!fastest || cagr > fastest.cagr) fastest = { label: f.label, cagr };
    }
    if (fastest) {
      insights.push({
        text: `${fastest.label} grew the fastest of any major allocation between FY${earliest.fiscalYear} and FY${latest.fiscalYear}, at a ${fastest.cagr.toFixed(1)}% compound annual rate.`,
      });
    }
  }

  // Debt servicing vs defence crossover.
  const crossoverYear = years.find((y) => typeof y.debtServicing === "number" && y.debtServicing > y.defence);
  const stillCrossed = typeof latest.debtServicing === "number" && latest.debtServicing > latest.defence;
  if (crossoverYear && stillCrossed) {
    insights.push({
      text: `Debt servicing first exceeded defence spending in FY${crossoverYear.fiscalYear} (Rs ${crossoverYear.debtServicing!.toFixed(0)}bn vs Rs ${crossoverYear.defence.toFixed(0)}bn) and has remained larger every year since through FY${latest.fiscalYear}.`,
    });
  } else if (!stillCrossed) {
    insights.push({
      text: `In FY${latest.fiscalYear}, defence spending (Rs ${latest.defence.toFixed(0)}bn) still exceeds debt servicing (Rs ${(latest.debtServicing ?? 0).toFixed(0)}bn).`,
    });
  }

  // Fiscal deficit trend — average of the most recent 5 years vs the 5 before that.
  if (years.length >= 6) {
    const recentN = years.slice(-5);
    const priorN = years.slice(-10, -5).length === 5 ? years.slice(-10, -5) : years.slice(0, Math.max(0, years.length - 5));
    const avg = (arr: BudgetYearRecord[]) => arr.reduce((s, y) => s + y.fiscalDeficitPctGdp, 0) / arr.length;
    const recentAvg = avg(recentN);
    const priorAvg = priorN.length > 0 ? avg(priorN) : recentAvg;
    const direction = recentAvg < priorAvg ? "narrowed" : recentAvg > priorAvg ? "widened" : "held steady";
    insights.push({
      text: `Pakistan's budgeted fiscal deficit has ${direction} on average — ${priorAvg.toFixed(1)}% of GDP in the earlier period covered here versus ${recentAvg.toFixed(1)}% of GDP in the most recent 5 budgets.`,
    });
  }

  // Long-term structural change: debt servicing's share of the budget then vs now.
  const earliestShare = getDebtServicingShare(earliest);
  const latestShare = getDebtServicingShare(latest);
  if (earliestShare && latestShare) {
    insights.push({
      text: `Debt servicing's share of total federal outlay has moved from ${earliestShare.pctOfBudget.toFixed(0)}% in FY${earliest.fiscalYear} to ${latestShare.pctOfBudget.toFixed(0)}% in FY${latest.fiscalYear}.`,
    });
  }

  return insights;
}
