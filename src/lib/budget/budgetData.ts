// Derives every chart-ready shape the Budget Workshop needs from the static BUDGET_HISTORICAL dataset: allocation breakdowns, the Rs100 view,
// year-over-year and compound growth, share-of-budget series, rule-based insights with their evidence, and consistency checks. Pure, synchronous,
// no I/O: there is no live fetch behind this feature (Budget in Brief is a PDF published once a year), so every function transforms the one static
// dataset (src/data/budgetHistorical.ts) and the small stated-GDP table (src/data/budgetNominalGdp.ts).
//
// RULES THIS MODULE KEEPS (each one is pinned by budgetData.test.ts)
//   1. A missing figure is never zero. A null (FY2010-11 does not itemise interest, pension or grants) stays null; a breakdown that cannot split
//      those items says so and shows them as one bundled slice instead of showing "0".
//   2. Every percentage names its base. "Share of total outlay" and "share of the budget envelope" are different numbers and are never mixed.
//   3. Budget Estimates only. Nothing here reads, mixes or implies Revised Estimates or actual expenditure.
//   4. Nominal is nominal. Growth rates here are nominal; nothing is described as real growth.
//   5. A residual that would be negative is reported as a discrepancy, never clamped to zero to make a total look right.
//   6. A comparison across years uses only years where every compared figure exists, and says which years.

import { BUDGET_HISTORICAL, type BudgetYearRecord } from "@/data/budgetHistorical";
import { getStatedNominalGdp } from "@/data/budgetNominalGdp";

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

/** The years from `from` to `to` inclusive (either end open). Unknown years yield an empty list rather than the whole range. */
export function sliceYears(years: BudgetYearRecord[], from?: string, to?: string): BudgetYearRecord[] {
  const a = from ? years.findIndex((y) => y.fiscalYear === from) : 0;
  const b = to ? years.findIndex((y) => y.fiscalYear === to) : years.length - 1;
  if (a < 0 || b < 0 || a > b) return [];
  return years.slice(a, b + 1);
}

// ───────────────────────────── year over year and compound growth ─────────────────────────────

export interface YoyChange {
  absolute: number;
  pct: number;
  direction: "up" | "down" | "flat";
}

/** Year-over-year change of a field, or null if either year's value is missing (e.g. FY2010-11's nulls) or the base is zero: never silently treats a missing figure as zero. */
export function getYoyChange(field: keyof BudgetYearRecord, current: BudgetYearRecord, previous: BudgetYearRecord | undefined): YoyChange | null {
  if (!previous) return null;
  const curVal = current[field];
  const prevVal = previous[field];
  if (typeof curVal !== "number" || typeof prevVal !== "number") return null;
  if (prevVal === 0) return null;
  const absolute = curVal - prevVal;
  const pct = (absolute / Math.abs(prevVal)) * 100;
  return { absolute, pct, direction: pct > 0.05 ? "up" : pct < -0.05 ? "down" : "flat" };
}

export interface Cagr {
  /** Compound annual growth rate, % (nominal). */
  pct: number;
  fromFy: string;
  toFy: string;
  /** Number of annual steps between the two years. */
  steps: number;
  startValue: number;
  endValue: number;
}

/** Nominal compound annual growth of a field between two years of the given series (first and last by default). null unless both end values exist and the start is positive. */
export function getCagr(field: BudgetTrendField, years: BudgetYearRecord[], fromFy?: string, toFy?: string): Cagr | null {
  const span = sliceYears(years, fromFy, toFy);
  if (span.length < 2) return null;
  const a = span[0];
  const b = span[span.length - 1];
  const start = a[field];
  const end = b[field];
  if (typeof start !== "number" || typeof end !== "number" || start <= 0 || end <= 0) return null;
  const steps = span.length - 1;
  return { pct: (Math.pow(end / start, 1 / steps) - 1) * 100, fromFy: a.fiscalYear, toFy: b.fiscalYear, steps, startValue: start, endValue: end };
}

// ───────────────────────────── the bases percentages are taken on ─────────────────────────────

/**
 * Total Outlay (Budget in Brief Table 1's "Total Expenditure") and Provincial Transfer are NOT additive in Budget in Brief's own structure: the
 * provinces' NFC share is deducted on the REVENUE side to arrive at Net Revenue, before Total Expenditure is computed; it is not a component of
 * Total Expenditure. A breakdown that wants Provincial Transfers beside Debt Servicing, Defence, PSDP, Subsidies and Pension therefore needs a
 * wider base than Total Outlay: the full resource envelope the federal government collects before splitting it between what provinces receive and
 * what the federal government spends. Verified against FY2026-27's own Table 1: total outlay + provincial transfer (27,619bn) minus the six named
 * slices (23,162bn) leaves 4,457bn, which equals Table 1's own Grants & Transfers (2,680) + Running of Civil Government (1,071) + Net Lending (276)
 * + Provision for Emergency (430) = 4,457bn exactly.
 */
export function getBudgetEnvelope(year: BudgetYearRecord): number {
  return year.totalOutlay + year.provincialTransfer;
}

export type ShareBasis = "outlay" | "envelope";

export const SHARE_BASIS_LABEL: Record<ShareBasis, string> = {
  outlay: "total outlay (the federal government's own planned spending)",
  envelope: "the budget envelope (total outlay plus the provinces' NFC share)",
};

export interface NominalGdp {
  /** Rs billion. */
  value: number;
  /** "stated": printed by Budget in Brief for that budget year. "implied": derived from the printed fiscal deficit in Rs and as % of GDP. */
  basis: "stated" | "implied";
}

/**
 * Implied nominal GDP: fiscal deficit (Rs) ÷ fiscal deficit (% of GDP). The percentage is printed to one decimal, so this can be off by up to about
 * ±1.4% (at a 3.6% deficit). Used only where no printed GDP exists (before FY2019-20), and always labelled "implied".
 */
export function getImpliedNominalGdp(year: BudgetYearRecord): number {
  return year.fiscalDeficitRs / (year.fiscalDeficitPctGdp / 100);
}

/** The nominal GDP to scale a year's figures by, with its basis: the figure Budget in Brief prints where it prints one, otherwise the implied figure. */
export function getNominalGdp(year: BudgetYearRecord): NominalGdp {
  const stated = getStatedNominalGdp(year.fiscalYear);
  return stated ? { value: stated.valueRsBn, basis: "stated" } : { value: getImpliedNominalGdp(year), basis: "implied" };
}

// ───────────────────────────── allocation breakdown ─────────────────────────────

export interface AllocationSlice {
  label: string;
  value: number;
  /** % of the budget envelope. */
  pct: number;
  color: string;
  /** "itemised": a figure the document prints. "residual": what is left of the envelope after the itemised slices. "bundled": interest, pension and grants that this year's document does not itemise. */
  kind: "itemised" | "residual" | "bundled";
}

const ALLOCATION_COLORS: Record<string, string> = {
  "Debt Servicing": "#fb7185",
  Defence: "#38bdf8",
  PSDP: "#34d399",
  Subsidies: "#f59e0b",
  "Provincial Transfers": "#a855f7",
  Pension: "#818cf8",
  Other: "#64748b",
  "Not itemised (interest, pension, grants, other)": "#94a3b8",
};

export interface AllocationBreakdown {
  fiscalYear: string;
  envelope: number;
  slices: AllocationSlice[];
  /** True when the year's document does not itemise interest, pension or grants (FY2010-11): they are one bundled slice, not zero. */
  partial: boolean;
  notes: string[];
  /** Anything that does not reconcile, reported rather than forced (for example an itemised total larger than the envelope). */
  discrepancies: string[];
}

/**
 * "Where does the budget go": the breakdown of the budget envelope using Budget in Brief's own economic classification. Education and health are
 * excluded because they come from a different classification (functional, current expenditure only). A null interest or pension figure is NOT
 * treated as zero: when either is missing the year is "partial" and interest, pension and grants appear as ONE bundled slice. The remainder in a
 * complete year is the true residual (grants and transfers, running of civil government, net lending and contingency provisions).
 */
export function getAllocationDetail(year: BudgetYearRecord): AllocationBreakdown {
  const envelope = getBudgetEnvelope(year);
  const notes: string[] = [];
  const discrepancies: string[] = [];
  const itemised: { label: string; value: number }[] = [];
  const push = (label: string, value: number | null) => {
    if (value !== null) itemised.push({ label, value });
  };
  const partial = year.debtServicing === null || year.pension === null;
  if (!partial) push("Debt Servicing", year.debtServicing);
  push("Defence", year.defence);
  push("PSDP", year.federalPsdp);
  push("Subsidies", year.subsidies);
  push("Provincial Transfers", year.provincialTransfer);
  if (!partial) push("Pension", year.pension);

  const itemisedTotal = itemised.reduce((s, x) => s + x.value, 0);
  const remainder = envelope - itemisedTotal;
  const slices: AllocationSlice[] = itemised.map((s) => ({ ...s, pct: envelope > 0 ? (s.value / envelope) * 100 : 0, color: ALLOCATION_COLORS[s.label] ?? "#64748b", kind: "itemised" as const }));

  const restLabel = partial ? "Not itemised (interest, pension, grants, other)" : "Other";
  if (partial) notes.push(`FY${year.fiscalYear}'s Budget in Brief does not itemise interest, pension or grants (they sit inside General Public Service), so they are shown as one bundled slice together with other items, not as zero.`);
  if (remainder < 0) {
    discrepancies.push(`The itemised slices (Rs ${itemisedTotal.toFixed(0)}bn) exceed the budget envelope (Rs ${envelope.toFixed(0)}bn) by Rs ${(-remainder).toFixed(0)}bn in FY${year.fiscalYear}; no residual is shown.`);
  } else {
    slices.push({ label: restLabel, value: remainder, pct: envelope > 0 ? (remainder / envelope) * 100 : 0, color: ALLOCATION_COLORS[restLabel] ?? "#64748b", kind: partial ? "bundled" : "residual" });
  }
  return { fiscalYear: year.fiscalYear, envelope, slices, partial, notes, discrepancies };
}

export function getAllocationBreakdown(year: BudgetYearRecord): AllocationSlice[] {
  return getAllocationDetail(year).slices;
}

export interface Rs100Slice {
  label: string;
  rsPerHundred: number;
  color: string;
}

/**
 * "For every Rs100 the government spends": the allocation breakdown scaled to a 100-Rupee base and rounded to whole Rupees. Rounding residue is
 * absorbed into the residual or bundled slice (already a remainder by definition) rather than nudging a named category. When there is no such slice
 * (a discrepancy year) the residue is left visible instead of being forced into a named slice.
 */
export function getRs100Breakdown(year: BudgetYearRecord): Rs100Slice[] {
  const rounded = getAllocationBreakdown(year).map((s) => ({
    label: s.label === "PSDP" ? "Development" : s.label,
    rsPerHundred: Math.round(s.pct),
    color: s.color,
    kind: s.kind,
  }));
  const sum = rounded.reduce((s, x) => s + x.rsPerHundred, 0);
  const rest = rounded.findIndex((s) => s.kind !== "itemised");
  if (rest >= 0) rounded[rest].rsPerHundred += 100 - sum;
  return rounded.map(({ label, rsPerHundred, color }) => ({ label, rsPerHundred, color }));
}

// ───────────────────────────── shares and debt servicing ─────────────────────────────

export interface DebtServicingShare {
  valueRs: number;
  /** % of total outlay (the base the KPI card and the insights use). */
  pctOfBudget: number;
  /** % of the budget envelope (the base the allocation donut uses). */
  pctOfEnvelope: number;
}

export function getDebtServicingShare(year: BudgetYearRecord): DebtServicingShare | null {
  if (year.debtServicing === null) return null;
  return {
    valueRs: year.debtServicing,
    pctOfBudget: year.totalOutlay > 0 ? (year.debtServicing / year.totalOutlay) * 100 : 0,
    pctOfEnvelope: getBudgetEnvelope(year) > 0 ? (year.debtServicing / getBudgetEnvelope(year)) * 100 : 0,
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

export type TrendValueMode = "nominal" | "pctGdp" | "shareOutlay";

/** Fields that are components of total outlay, so "share of total outlay" is meaningful. Revenue lines, the deficit and the provinces' NFC share are not components of outlay. */
const OUTLAY_COMPONENTS: ReadonlySet<BudgetTrendField> = new Set<BudgetTrendField>([
  "totalOutlay",
  "grantsAndTransfersOther",
  "federalPsdp",
  "defence",
  "debtServicing",
  "pension",
  "subsidies",
  "federalEducation",
  "federalHealth",
]);

/** Whether a field can be shown in a mode. Share of outlay only exists for components of outlay. */
export function isFieldAvailableInMode(field: BudgetTrendField, mode: TrendValueMode): boolean {
  return mode === "shareOutlay" ? OUTLAY_COMPONENTS.has(field) : true;
}

export interface TrendPoint {
  fiscalYear: string;
  values: Record<string, number | null>;
}

/**
 * One chart-ready point per fiscal year for the selected fields: nominal Rs billion, % of nominal GDP (stated where printed, else implied: see
 * getNominalGdp), or % of total outlay. A missing figure stays null: never forward-filled, estimated or turned into zero. A field that has no
 * share of outlay (revenue lines, deficit, provincial NFC share) is null in that mode rather than computed on a wrong base.
 */
export function getCategoryTrendSeries(fields: BudgetTrendField[], mode: TrendValueMode, years: BudgetYearRecord[] = BUDGET_HISTORICAL.years): TrendPoint[] {
  return years.map((year) => {
    const gdp = mode === "pctGdp" ? getNominalGdp(year).value : null;
    const values: Record<string, number | null> = {};
    for (const field of fields) {
      const raw = year[field];
      if (typeof raw !== "number") {
        values[field] = null;
        continue;
      }
      if (mode === "pctGdp") values[field] = gdp ? (raw / gdp) * 100 : null;
      else if (mode === "shareOutlay") values[field] = OUTLAY_COMPONENTS.has(field) && year.totalOutlay > 0 ? (raw / year.totalOutlay) * 100 : null;
      else values[field] = raw;
    }
    return { fiscalYear: year.fiscalYear, values };
  });
}

// ───────────────────────────── category summary (detail pages) ─────────────────────────────

export interface CategorySummary {
  field: BudgetTrendField;
  latestFy: string;
  latestValue: number | null;
  /** % of total outlay of the latest year, or null where the field is not a component of outlay. */
  shareOfOutlay: number | null;
  pctOfGdp: { value: number; basis: NominalGdp["basis"] } | null;
  yoy: YoyChange | null;
  /** Nominal CAGR from the first year with a figure to the latest. */
  cagr: Cagr | null;
  /** Years with no figure (kept null, never zero). */
  missingYears: string[];
  peak: { fiscalYear: string; value: number } | null;
  /** Rank by value among the itemised allocation slices of the latest year (1 = largest), or null when the field is not one of them. */
  rank: { position: number; of: number } | null;
}

export function getCategorySummary(field: BudgetTrendField, years: BudgetYearRecord[] = BUDGET_HISTORICAL.years): CategorySummary | null {
  if (years.length === 0) return null;
  const latest = years[years.length - 1];
  const prev = years.length > 1 ? years[years.length - 2] : undefined;
  const v = latest[field];
  const value = typeof v === "number" ? v : null;
  const present = years.filter((y) => typeof y[field] === "number");
  const gdp = getNominalGdp(latest);
  let peak: CategorySummary["peak"] = null;
  for (const y of present) if (peak === null || (y[field] as number) > peak.value) peak = { fiscalYear: y.fiscalYear, value: y[field] as number };
  const slices = getAllocationDetail(latest).slices.filter((s) => s.kind === "itemised");
  const labelByField: Partial<Record<BudgetTrendField, string>> = { debtServicing: "Debt Servicing", defence: "Defence", federalPsdp: "PSDP", subsidies: "Subsidies", provincialTransfer: "Provincial Transfers", pension: "Pension" };
  const label = labelByField[field];
  const ranked = [...slices].sort((a, b) => b.value - a.value);
  const pos = label ? ranked.findIndex((s) => s.label === label) : -1;
  return {
    field,
    latestFy: latest.fiscalYear,
    latestValue: value,
    shareOfOutlay: value !== null && OUTLAY_COMPONENTS.has(field) && latest.totalOutlay > 0 ? (value / latest.totalOutlay) * 100 : null,
    pctOfGdp: value !== null && gdp.value > 0 ? { value: (value / gdp.value) * 100, basis: gdp.basis } : null,
    yoy: getYoyChange(field, latest, prev),
    cagr: present.length >= 2 ? getCagr(field, years, present[0].fiscalYear, latest.fiscalYear) : null,
    missingYears: years.filter((y) => typeof y[field] !== "number").map((y) => y.fiscalYear),
    peak,
    rank: pos >= 0 ? { position: pos + 1, of: ranked.length } : null,
  };
}

// ───────────────────────────── rule-based insights, with their evidence ─────────────────────────────

export interface InsightEvidence {
  label: string;
  fiscalYear: string;
  value: number;
  unit: "Rs bn" | "%" | "pp";
}

export interface BudgetInsight {
  id: string;
  text: string;
  /** The exact figures the sentence is computed from, so a reader can reproduce it from the dataset. */
  evidence: InsightEvidence[];
  /** What the number does not say. */
  caveat?: string;
}

const NAMED: { key: "debtServicing" | "defence" | "federalPsdp" | "subsidies" | "provincialTransfer" | "pension"; label: string }[] = [
  { key: "debtServicing", label: "Debt Servicing" },
  { key: "defence", label: "Defence" },
  { key: "federalPsdp", label: "PSDP" },
  { key: "subsidies", label: "Subsidies" },
  { key: "provincialTransfer", label: "Provincial Transfers" },
  { key: "pension", label: "Pension" },
];

const fy = (y: BudgetYearRecord) => `FY${y.fiscalYear}`;
const bn = (n: number) => `Rs ${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}bn`;

/**
 * Deterministic insights computed directly from the dataset: no AI generation, and nothing here infers a cause. Every insight carries the figures it
 * was computed from. Where a comparison needs a figure that is missing in the first year (FY2010-11 has no interest or pension), it starts at the
 * first year where every compared figure exists and says so.
 */
export function generateBudgetInsights(years: BudgetYearRecord[] = BUDGET_HISTORICAL.years): BudgetInsight[] {
  const out: BudgetInsight[] = [];
  if (years.length === 0) return out;
  const latest = years[years.length - 1];

  // 1. Largest itemised allocation of the latest budget.
  const latestDetail = getAllocationDetail(latest);
  const itemised = latestDetail.slices.filter((s) => s.kind === "itemised");
  if (itemised.length > 0) {
    const largest = itemised.reduce((a, b) => (b.value > a.value ? b : a));
    out.push({
      id: "largest-allocation",
      text: `The largest itemised allocation in the ${fy(latest)} budget is ${largest.label}, at ${bn(largest.value)}: ${largest.pct.toFixed(0)}% of the budget envelope (total outlay plus provincial transfers).`,
      evidence: itemised.map((s) => ({ label: s.label, fiscalYear: latest.fiscalYear, value: s.value, unit: "Rs bn" as const })),
      caveat: "The envelope is total outlay plus the provinces' NFC share, because that share is deducted on the revenue side and is not part of total outlay.",
    });
  }

  // 2. Fastest-growing named allocation, compared over ONE common window (the first year where all six figures exist).
  const complete = years.filter((y) => NAMED.every((n) => typeof y[n.key] === "number" && (y[n.key] as number) > 0));
  if (complete.length >= 3) {
    const a = complete[0];
    const b = complete[complete.length - 1];
    const steps = years.indexOf(b) - years.indexOf(a);
    const rows = NAMED.map((n) => ({ ...n, cagr: (Math.pow((b[n.key] as number) / (a[n.key] as number), 1 / steps) - 1) * 100, start: a[n.key] as number, end: b[n.key] as number })).sort((x, y) => y.cagr - x.cagr);
    out.push({
      id: "fastest-growth",
      text: `Between ${fy(a)} and ${fy(b)} ${rows[0].label} grew fastest of the six major allocations, at a ${rows[0].cagr.toFixed(1)}% compound annual rate in nominal rupees; ${rows[rows.length - 1].label} grew slowest at ${rows[rows.length - 1].cagr.toFixed(1)}%.`,
      evidence: rows.flatMap((r) => [
        { label: `${r.label} (start)`, fiscalYear: a.fiscalYear, value: r.start, unit: "Rs bn" as const },
        { label: `${r.label} (end)`, fiscalYear: b.fiscalYear, value: r.end, unit: "Rs bn" as const },
      ]),
      caveat: `Nominal growth, not real: it includes inflation. All six are compared over the same years because ${years[0].fiscalYear} does not itemise interest or pension.`,
    });
  }

  // 3. Debt servicing against defence: checked year by year, not assumed.
  const both = years.filter((y) => typeof y.debtServicing === "number");
  if (both.length > 0) {
    const exceeds = both.map((y) => (y.debtServicing as number) > y.defence);
    const nExceed = exceeds.filter(Boolean).length;
    let firstSustained = -1;
    for (let i = 0; i < both.length; i++) if (exceeds.slice(i).every(Boolean)) { firstSustained = i; break; }
    const bLatest = both[both.length - 1];
    if (firstSustained >= 0) {
      const y = both[firstSustained];
      out.push({
        id: "debt-vs-defence",
        text: `Debt servicing has exceeded defence spending in every budget from ${fy(y)} through ${fy(bLatest)} (${bn(y.debtServicing as number)} against ${bn(y.defence)} in ${fy(y)}; ${bn(bLatest.debtServicing as number)} against ${bn(bLatest.defence)} in ${fy(bLatest)}).`,
        evidence: [
          { label: "Debt servicing", fiscalYear: y.fiscalYear, value: y.debtServicing as number, unit: "Rs bn" },
          { label: "Defence", fiscalYear: y.fiscalYear, value: y.defence, unit: "Rs bn" },
          { label: "Debt servicing", fiscalYear: bLatest.fiscalYear, value: bLatest.debtServicing as number, unit: "Rs bn" },
          { label: "Defence", fiscalYear: bLatest.fiscalYear, value: bLatest.defence, unit: "Rs bn" },
        ],
        caveat: `Checked for every one of the ${both.length - firstSustained} budgets in that run. Debt servicing exceeded defence in ${nExceed} of the ${both.length} budgets that itemise it.`,
      });
    } else {
      out.push({
        id: "debt-vs-defence",
        text: `In the ${fy(bLatest)} budget ${(bLatest.debtServicing as number) > bLatest.defence ? "debt servicing" : "defence"} is the larger of the two (${bn(bLatest.debtServicing as number)} for debt servicing, ${bn(bLatest.defence)} for defence); debt servicing exceeded defence in ${nExceed} of the ${both.length} budgets that itemise it, so the order has changed more than once.`,
        evidence: [
          { label: "Debt servicing", fiscalYear: bLatest.fiscalYear, value: bLatest.debtServicing as number, unit: "Rs bn" },
          { label: "Defence", fiscalYear: bLatest.fiscalYear, value: bLatest.defence, unit: "Rs bn" },
        ],
      });
    }
  }

  // 4. Biggest shifts in share of the budget envelope, over the common window.
  if (complete.length >= 2) {
    const a = complete[0];
    const b = complete[complete.length - 1];
    const ea = getBudgetEnvelope(a);
    const eb = getBudgetEnvelope(b);
    const shifts = NAMED.map((n) => ({ label: n.label, from: ((a[n.key] as number) / ea) * 100, to: ((b[n.key] as number) / eb) * 100 })).map((s) => ({ ...s, pp: s.to - s.from }));
    const gain = shifts.reduce((m, s) => (s.pp > m.pp ? s : m));
    const loss = shifts.reduce((m, s) => (s.pp < m.pp ? s : m));
    out.push({
      id: "share-shift",
      text: `As a share of the budget envelope, ${gain.label} rose the most between ${fy(a)} and ${fy(b)} (${gain.from.toFixed(1)}% to ${gain.to.toFixed(1)}%, ${gain.pp >= 0 ? "+" : ""}${gain.pp.toFixed(1)} percentage points) and ${loss.label} fell the most (${loss.from.toFixed(1)}% to ${loss.to.toFixed(1)}%, ${loss.pp >= 0 ? "+" : ""}${loss.pp.toFixed(1)} points).`,
      evidence: shifts.flatMap((s) => [
        { label: `${s.label} share`, fiscalYear: a.fiscalYear, value: s.from, unit: "%" as const },
        { label: `${s.label} share`, fiscalYear: b.fiscalYear, value: s.to, unit: "%" as const },
      ]),
      caveat: "Shares of one year's budget envelope; a falling share can still be a rising amount.",
    });
  }

  // 5. Development spending (federal PSDP) as a share of total outlay.
  if (years.length >= 2) {
    const first = years[0];
    const share = (y: BudgetYearRecord) => (y.totalOutlay > 0 ? (y.federalPsdp / y.totalOutlay) * 100 : 0);
    const hi = years.reduce((m, y) => (share(y) > share(m) ? y : m));
    const lo = years.reduce((m, y) => (share(y) < share(m) ? y : m));
    out.push({
      id: "psdp-share",
      text: `The federal development programme (PSDP) was ${share(first).toFixed(1)}% of total outlay in ${fy(first)} and ${share(latest).toFixed(1)}% in ${fy(latest)}; its highest share was ${share(hi).toFixed(1)}% in ${fy(hi)} and its lowest ${share(lo).toFixed(1)}% in ${fy(lo)}.`,
      evidence: [first, latest, hi, lo].map((y) => ({ label: "PSDP share of total outlay", fiscalYear: y.fiscalYear, value: share(y), unit: "%" as const })),
      caveat: "PSDP is the federal development programme. The dataset has no split of the rest of total outlay into current and development items, so no 'recurrent' comparison is made.",
    });
  }

  // 6. Interest payments against total outlay and against FBR tax revenue, from the first year that itemises them.
  const withDebt = years.filter((y) => typeof y.debtServicing === "number");
  if (withDebt.length >= 2) {
    const a = withDebt[0];
    const b = withDebt[withDebt.length - 1];
    const ofOutlay = (y: BudgetYearRecord) => ((y.debtServicing as number) / y.totalOutlay) * 100;
    const ofFbr = (y: BudgetYearRecord) => ((y.debtServicing as number) / y.fbrTaxRevenue) * 100;
    out.push({
      id: "debt-share",
      text: `Debt servicing was ${ofOutlay(a).toFixed(0)}% of total outlay in ${fy(a)} and ${ofOutlay(b).toFixed(0)}% in ${fy(b)}; against FBR tax revenue it moved from ${ofFbr(a).toFixed(0)}% to ${ofFbr(b).toFixed(0)}%.`,
      evidence: [
        { label: "Debt servicing share of total outlay", fiscalYear: a.fiscalYear, value: ofOutlay(a), unit: "%" },
        { label: "Debt servicing share of total outlay", fiscalYear: b.fiscalYear, value: ofOutlay(b), unit: "%" },
        { label: "Debt servicing as % of FBR tax revenue", fiscalYear: a.fiscalYear, value: ofFbr(a), unit: "%" },
        { label: "Debt servicing as % of FBR tax revenue", fiscalYear: b.fiscalYear, value: ofFbr(b), unit: "%" },
      ],
      caveat: `Starts at ${fy(a)}, the first budget that itemises interest. Total outlay excludes the provinces' NFC share, so these shares are larger than shares of the wider envelope.`,
    });
  }

  // 7. Budgeted fiscal deficit: the latest five budgets against the five before.
  if (years.length >= 10) {
    const recent = years.slice(-5);
    const prior = years.slice(-10, -5);
    const avg = (arr: BudgetYearRecord[]) => arr.reduce((s, y) => s + y.fiscalDeficitPctGdp, 0) / arr.length;
    const r = avg(recent);
    const p = avg(prior);
    const direction = r < p ? "narrowed" : r > p ? "widened" : "held steady";
    out.push({
      id: "deficit-trend",
      text: `The budgeted fiscal deficit ${direction} on average: ${p.toFixed(1)}% of GDP across ${fy(prior[0])} to ${fy(prior[prior.length - 1])}, against ${r.toFixed(1)}% across ${fy(recent[0])} to ${fy(recent[recent.length - 1])}.`,
      evidence: [...prior, ...recent].map((y) => ({ label: "Budgeted fiscal deficit", fiscalYear: y.fiscalYear, value: y.fiscalDeficitPctGdp, unit: "%" as const })),
      caveat: "Budget Estimate targets set at the start of each year, not outturns. The deficit is the overall (federal plus provincial) figure as printed in each Budget in Brief.",
    });
  }

  // 8. Federal education and health: share of total outlay, with the devolution caveat.
  const edu = years.filter((y) => typeof y.federalEducation === "number" && typeof y.federalHealth === "number");
  if (edu.length >= 2) {
    const a = edu[0];
    const b = edu[edu.length - 1];
    const s = (y: BudgetYearRecord, f: "federalEducation" | "federalHealth") => ((y[f] as number) / y.totalOutlay) * 100;
    out.push({
      id: "education-health",
      text: `Federal current expenditure on education was ${s(a, "federalEducation").toFixed(2)}% of total outlay in ${fy(a)} and ${s(b, "federalEducation").toFixed(2)}% in ${fy(b)}; on health ${s(a, "federalHealth").toFixed(2)}% and ${s(b, "federalHealth").toFixed(2)}%.`,
      evidence: [
        { label: "Federal education share of total outlay", fiscalYear: a.fiscalYear, value: s(a, "federalEducation"), unit: "%" },
        { label: "Federal education share of total outlay", fiscalYear: b.fiscalYear, value: s(b, "federalEducation"), unit: "%" },
        { label: "Federal health share of total outlay", fiscalYear: a.fiscalYear, value: s(a, "federalHealth"), unit: "%" },
        { label: "Federal health share of total outlay", fiscalYear: b.fiscalYear, value: s(b, "federalHealth"), unit: "%" },
      ],
      caveat: "These are federal figures only. Education and health are mostly provincial responsibilities since the 18th Amendment (2010), so they are not national spending on either sector, and they exclude development (PSDP) spending tagged to the sector.",
    });
  }

  return out;
}

// ───────────────────────────── consistency checks ─────────────────────────────

export interface ConsistencyFinding {
  fiscalYear: string;
  check: "components-within-outlay" | "residual-non-negative" | "deficit-vs-stated-gdp" | "implied-vs-stated-gdp";
  ok: boolean;
  detail: string;
}

/**
 * Checks the dataset against itself and reports what does not reconcile; it never adjusts a figure.
 *  - every outlay component is no larger than total outlay;
 *  - the residual of the budget envelope is not negative (complete years only);
 *  - where a nominal GDP is printed, deficit ÷ GDP agrees with the printed deficit % of GDP to within that percentage's rounding (0.1 pp);
 *  - (informational) how far the implied GDP is from the printed one.
 */
export function checkDatasetConsistency(years: BudgetYearRecord[] = BUDGET_HISTORICAL.years): ConsistencyFinding[] {
  const findings: ConsistencyFinding[] = [];
  for (const y of years) {
    const comps: [string, number | null][] = [["defence", y.defence], ["PSDP", y.federalPsdp], ["subsidies", y.subsidies], ["debt servicing", y.debtServicing], ["pension", y.pension], ["federal education", y.federalEducation], ["federal health", y.federalHealth]];
    const over = comps.filter(([, v]) => typeof v === "number" && v > y.totalOutlay).map(([k]) => k);
    findings.push({ fiscalYear: y.fiscalYear, check: "components-within-outlay", ok: over.length === 0, detail: over.length === 0 ? "every itemised component is no larger than total outlay" : `${over.join(", ")} exceed total outlay` });

    const detail = getAllocationDetail(y);
    if (!detail.partial) {
      const rest = detail.slices.find((s) => s.kind === "residual");
      findings.push({ fiscalYear: y.fiscalYear, check: "residual-non-negative", ok: detail.discrepancies.length === 0 && !!rest, detail: detail.discrepancies.length === 0 ? `residual Rs ${rest?.value.toFixed(0)}bn (${rest?.pct.toFixed(1)}% of the envelope)` : detail.discrepancies.join(" ") });
    }

    const stated = getStatedNominalGdp(y.fiscalYear);
    if (stated) {
      const exact = (y.fiscalDeficitRs / stated.valueRsBn) * 100;
      const diff = Math.abs(exact - y.fiscalDeficitPctGdp);
      findings.push({ fiscalYear: y.fiscalYear, check: "deficit-vs-stated-gdp", ok: diff <= 0.1, detail: `deficit ÷ printed GDP = ${exact.toFixed(2)}% against ${y.fiscalDeficitPctGdp}% printed (difference ${diff.toFixed(2)} pp)` });
      const implied = getImpliedNominalGdp(y);
      const gap = ((implied - stated.valueRsBn) / stated.valueRsBn) * 100;
      findings.push({ fiscalYear: y.fiscalYear, check: "implied-vs-stated-gdp", ok: Math.abs(gap) <= 1.5, detail: `implied GDP Rs ${implied.toFixed(0)}bn against printed Rs ${stated.valueRsBn}bn (${gap >= 0 ? "+" : ""}${gap.toFixed(2)}%)` });
    }
  }
  return findings;
}
