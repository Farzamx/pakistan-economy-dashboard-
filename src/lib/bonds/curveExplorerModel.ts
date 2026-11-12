// The Yield Curve Explorer's logic, kept out of the component: which auctions a view resolves to, how comparison dates are chosen, and the sentences that
// describe a curve and a comparison. Pure. Every sentence is built from the numbers in the data; nothing is generated and nothing infers a cause.

import { formatDate } from "@/lib/policyRate/format";
import {
  MAX_PAIR_GAP_DAYS,
  MOVE_THRESHOLD_BP,
  SHAPE_THRESHOLD_BP,
  auctionOn,
  monthsBefore,
  nearestAuction,
  pairedAuction,
  tenorSeries,
  type CurveComparison,
  type Slope,
  type YieldDefinition,
} from "./analytics";
import { TENOR_LABEL, type AuctionRecord } from "./types";

export type ExplorerView = "tbill" | "pib" | "both";
export type CompareChoice = "previous" | "6m" | "12m" | "peak" | "low" | "none";

export const VIEW_LABEL: Record<ExplorerView, string> = { tbill: "T-bills", pib: "PIBs", both: "T-bills + PIBs" };
export const COMPARE_LABEL: Record<CompareChoice, string> = {
  previous: "Previous auction",
  "6m": "6 months earlier",
  "12m": "12 months earlier",
  peak: "Highest-yield auction",
  low: "Lowest-yield auction",
  none: "No comparison",
};

export interface ResolvedCurves {
  tbill: AuctionRecord | null;
  /** The PIB auction shown. `gapDays` is its date minus the selected date: 0 in the PIB view, otherwise how far the nearest PIB auction is (negative = earlier). */
  pib: { auction: AuctionRecord; gapDays: number } | null;
}

/** The auctions the selector steps through: PIB auctions in the PIB view, T-bill auctions otherwise (a T-bill date drives the "both" view). */
export function selectableDates(view: ExplorerView, tbills: readonly AuctionRecord[], pibs: readonly AuctionRecord[]): string[] {
  return (view === "pib" ? pibs : tbills).map((a) => a.auctionDate);
}

/**
 * The curves for a selected date. In "both", the PIB auction is the nearest one within MAX_PAIR_GAP_DAYS of the T-bill date: the two are different
 * auctions, and the result carries the gap so the page can say so. An unknown date resolves to nothing, never to a neighbour.
 */
export function resolveCurves(view: ExplorerView, date: string, tbills: readonly AuctionRecord[], pibs: readonly AuctionRecord[]): ResolvedCurves {
  if (view === "pib") {
    const a = auctionOn(pibs, date);
    return { tbill: null, pib: a ? { auction: a, gapDays: 0 } : null };
  }
  const tbill = auctionOn(tbills, date);
  if (view === "tbill") return { tbill, pib: null };
  return { tbill, pib: tbill ? pairedAuction(pibs, date) : null };
}

/**
 * The date of the auction to compare with, chosen relative to the selected one. "previous" is the auction before it; "6m"/"12m" are the auctions nearest to that
 * many months earlier (never the selected one, and only if earlier); "peak"/"low" are the auctions with the highest and lowest long-tenor yield on record
 * (12-month for T-bills, 10-year for PIBs), which can be after the selected date. Null when there is no such auction.
 */
export function comparisonDate(view: ExplorerView, selected: string, choice: CompareChoice, tbills: readonly AuctionRecord[], pibs: readonly AuctionRecord[], def: YieldDefinition): string | null {
  if (choice === "none") return null;
  const list = view === "pib" ? pibs : tbills;
  const idx = list.findIndex((a) => a.auctionDate === selected);
  if (idx < 0) return null;
  if (choice === "previous") return idx > 0 ? list[idx - 1].auctionDate : null;
  if (choice === "6m" || choice === "12m") {
    const target = monthsBefore(selected, choice === "6m" ? 6 : 12);
    const n = nearestAuction(list.slice(0, idx), target);
    return n ? n.auction.auctionDate : null;
  }
  const series = tenorSeries(list, view === "pib" ? "10Y" : "12M", def);
  if (!series.length) return null;
  const pick = series.reduce((m, p) => ((choice === "peak" ? p.value > m.value : p.value < m.value) ? p : m));
  return pick.date === selected ? null : pick.date;
}

const signed = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(1).replace(/\.0$/, "")}`;
const abs = (v: number) => Math.abs(v).toFixed(1).replace(/\.0$/, "");

/** One sentence on a curve's shape. Null without a slope (a leg of the slope has no yield). */
export function describeShape(slope: Slope | null): string | null {
  if (!slope) return null;
  const s = TENOR_LABEL[slope.shortTenor];
  const l = TENOR_LABEL[slope.longTenor];
  if (slope.shape === "inverted") return `Inverted: ${l} yields are ${abs(slope.bp)} bp below ${s} yields.`;
  if (slope.shape === "upward") return `Upward-sloping: ${l} yields are ${abs(slope.bp)} bp above ${s} yields.`;
  return `Flat: ${l} and ${s} yields are within ${SHAPE_THRESHOLD_BP} bp of each other (${signed(slope.bp)} bp).`;
}

/** The comparison in one or two sentences. */
export function describeComparison(c: CurveComparison, dateA: string, dateB: string): string {
  if (c.averageShiftBp === null) return "No tenor has a yield on both dates, so the two curves cannot be compared.";
  const level = c.averageShiftBp === 0 ? `Yields are unchanged on average across ${c.commonTenors} tenor${c.commonTenors === 1 ? "" : "s"}.` : `Yields are ${abs(c.averageShiftBp)} bp ${c.averageShiftBp > 0 ? "higher" : "lower"} on average across ${c.commonTenors} tenor${c.commonTenors === 1 ? "" : "s"}.`;
  let shape: string;
  if (c.movement === null || c.slopeChangeBp === null || !c.slopeA || !c.slopeB) shape = "The slope cannot be compared, because one curve has no yield at one end of it.";
  else if (c.movement === "parallel") shape = `The slope barely moved (${signed(c.slopeA.bp)} to ${signed(c.slopeB.bp)} bp): broadly a parallel shift.`;
  else shape = `The curve ${c.movement === "steepening" ? "steepened" : "flattened"} by ${abs(c.slopeChangeBp)} bp (slope ${signed(c.slopeA.bp)} to ${signed(c.slopeB.bp)} bp).`;
  return `${formatDate(dateB)} against ${formatDate(dateA)}. ${level} ${shape}`;
}

/** Text for the strip that says how the two instruments' dates relate in the "both" view. */
export function describePairing(tbillDate: string, pib: ResolvedCurves["pib"]): string {
  if (!pib) return `No PIB auction within ${MAX_PAIR_GAP_DAYS} days of ${formatDate(tbillDate)}, so no PIB curve is shown.`;
  const g = pib.gapDays;
  const when = g === 0 ? "on the same day" : `${Math.abs(g)} day${Math.abs(g) === 1 ? "" : "s"} ${g < 0 ? "earlier" : "later"}`;
  return `T-bills: auction of ${formatDate(tbillDate)}. PIBs: auction of ${formatDate(pib.auction.auctionDate)} (${when}). Different auctions, shown together; not one simultaneous curve.`;
}

export { MOVE_THRESHOLD_BP };
