// Pure analytics over SBP auction results: curve points, curve shape, same-instrument curve comparison, nearest-auction pairing, history, shape regimes,
// policy-rate spreads and auction-flow metrics. No I/O. Every definition that could be argued about is a named constant here, so the page, the tests and
// the methodology text all say the same thing.
//
// WHAT A "CURVE" IS HERE. A T-bill curve is the four T-bill tenors of ONE T-bill auction. A PIB curve is the tenors of ONE PIB auction. Both are primary-market
// auction outcomes, not secondary-market quotes. T-bills and PIBs are auctioned on different days, so a T-bill curve and a PIB curve are never one simultaneous
// curve: the explorer pairs each T-bill auction with the nearest PIB auction, states the gap in days, and refuses to pair auctions further apart than
// MAX_PAIR_GAP_DAYS. Nothing here interpolates a missing tenor or connects different auctions into one line.

import { asOfObservation, type DatedPoint } from "@/lib/policyRate/dateSeries";
import { PIB_TENORS, TBILL_TENORS, TENOR_YEARS, type AuctionOutcome, type AuctionRecord, type Instrument, type Tenor, type TenorResult } from "./types";

export type YieldDefinition = "cutoff" | "wa";
export const YIELD_DEFINITION_LABEL: Record<YieldDefinition, string> = { cutoff: "Cut-off yield", wa: "Weighted-average yield" };
export const YIELD_DEFINITION_NOTE: Record<YieldDefinition, string> = {
  cutoff: "The highest yield SBP accepted at the auction (the figure SBP headlines).",
  wa: "The average yield across all accepted bids, weighted by amount.",
};

/** A curve is "inverted" if its long end yields at least this many basis points LESS than its short end, "upward" if at least this many MORE, otherwise "flat". */
export const SHAPE_THRESHOLD_BP = 10;
/** Between two curves, the slope must change by at least this many basis points to be called steepening or flattening. */
export const MOVE_THRESHOLD_BP = 10;
/** A T-bill auction is paired with a PIB auction only if they are no further apart than this. */
export const MAX_PAIR_GAP_DAYS = 14;

/** The slope pair per instrument: T-bills 12-month minus 3-month; PIBs 10-year minus 3-year. */
export const SLOPE_TENORS: Record<Instrument, { short: Tenor; long: Tenor }> = { tbill: { short: "3M", long: "12M" }, pib: { short: "3Y", long: "10Y" } };

export const tenorsFor = (instrument: Instrument): Tenor[] => (instrument === "tbill" ? [...TBILL_TENORS] : [...PIB_TENORS]);

export function yieldOf(t: TenorResult | undefined, def: YieldDefinition): number | null {
  if (!t || t.outcome !== "accepted") return null;
  return def === "cutoff" ? t.cutoffYield : t.waYield;
}

/** Everything accepted for a tenor: competitive + non-competitive (+ short sales for PIBs). Null if nothing was accepted (a failed tenor has no accepted amount, not zero). */
export function totalAccepted(t: TenorResult | undefined): number | null {
  if (!t || t.outcome !== "accepted") return null;
  const parts = [t.acceptedCompetitive, t.acceptedNonCompetitive, t.acceptedShortSale ?? null].filter((v): v is number => v !== null);
  return parts.length === 0 ? null : Math.round(parts.reduce((a, b) => a + b, 0) * 1000) / 1000;
}

// ───────────────────────────── dates ─────────────────────────────

const DAY = 86_400_000;
export const dayNumber = (iso: string): number => Math.round(Date.parse(`${iso}T00:00:00Z`) / DAY);
/** Whole days from `a` to `b` (positive when b is later). */
export const daysBetween = (a: string, b: string): number => dayNumber(b) - dayNumber(a);

/** `iso` minus a number of calendar months, clamped to the month's last day (31 Mar - 1 month = 28/29 Feb). */
export function monthsBefore(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const total = y * 12 + (m - 1) - months;
  const ny = Math.floor(total / 12);
  const nm = total - ny * 12;
  const last = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
  return `${ny}-${String(nm + 1).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
}

/** The auction dated nearest to `iso` (ties go to the earlier one). Null for an empty list. */
export function nearestAuction(auctions: readonly AuctionRecord[], iso: string): { auction: AuctionRecord; gapDays: number } | null {
  let best: { auction: AuctionRecord; gapDays: number } | null = null;
  for (const a of auctions) {
    const gap = daysBetween(iso, a.auctionDate);
    if (!best || Math.abs(gap) < Math.abs(best.gapDays)) best = { auction: a, gapDays: gap };
  }
  return best;
}

/** The PIB auction paired with a T-bill auction date: the nearest one, only if within MAX_PAIR_GAP_DAYS. `gapDays` is PIB date minus T-bill date (negative = the PIB auction came first). */
export function pairedAuction(auctions: readonly AuctionRecord[], iso: string): { auction: AuctionRecord; gapDays: number } | null {
  const n = nearestAuction(auctions, iso);
  return n && Math.abs(n.gapDays) <= MAX_PAIR_GAP_DAYS ? n : null;
}

export const auctionOn = (auctions: readonly AuctionRecord[], iso: string): AuctionRecord | null => auctions.find((a) => a.auctionDate === iso) ?? null;
export const latestAuction = (auctions: readonly AuctionRecord[]): AuctionRecord | null => (auctions.length ? auctions[auctions.length - 1] : null);

// ───────────────────────────── curves ─────────────────────────────

export type PointStatus = AuctionOutcome | "not-offered";

export interface CurvePoint {
  tenor: Tenor;
  years: number;
  /** The yield under the chosen definition; null when the tenor failed or was not offered. Never zero, never interpolated. */
  yield: number | null;
  status: PointStatus;
  offered: number | null;
  accepted: number | null;
}

/** One point per tenor of the auction's instrument, in maturity order. A tenor the auction did not offer is "not-offered" with a null yield. */
export function curvePoints(a: AuctionRecord, def: YieldDefinition): CurvePoint[] {
  return tenorsFor(a.instrument).map((tenor) => {
    const t = a.tenors[tenor];
    return { tenor, years: TENOR_YEARS[tenor], yield: yieldOf(t, def), status: t ? t.outcome : "not-offered", offered: t?.offered ?? null, accepted: totalAccepted(t) };
  });
}

export type CurveShape = "upward" | "flat" | "inverted";
export const SHAPE_LABEL: Record<CurveShape, string> = { upward: "Upward-sloping", flat: "Flat", inverted: "Inverted" };

export function classifyShape(slopeBp: number): CurveShape {
  if (slopeBp >= SHAPE_THRESHOLD_BP) return "upward";
  if (slopeBp <= -SHAPE_THRESHOLD_BP) return "inverted";
  return "flat";
}

export interface Slope {
  shortTenor: Tenor;
  longTenor: Tenor;
  /** Long yield minus short yield, basis points, one decimal. */
  bp: number;
  shape: CurveShape;
}

const bp = (diffPct: number): number => Math.round(diffPct * 1000) / 10;

/** The curve's slope (T-bills 12M-3M, PIBs 10Y-3Y). Null unless BOTH yields exist: a missing leg is never replaced by a neighbour. */
export function slopeOf(a: AuctionRecord, def: YieldDefinition): Slope | null {
  const { short, long } = SLOPE_TENORS[a.instrument];
  const s = yieldOf(a.tenors[short], def);
  const l = yieldOf(a.tenors[long], def);
  if (s === null || l === null) return null;
  const v = bp(l - s);
  return { shortTenor: short, longTenor: long, bp: v, shape: classifyShape(v) };
}

export interface CurveChange {
  tenor: Tenor;
  years: number;
  a: number | null;
  b: number | null;
  /** b minus a in basis points; null unless both curves have this tenor. */
  deltaBp: number | null;
}

export type CurveMovement = "steepening" | "flattening" | "parallel";

export interface CurveComparison {
  instrument: Instrument;
  changes: CurveChange[];
  /** How many tenors both curves have. */
  commonTenors: number;
  /** Mean of the per-tenor changes, bp, over the common tenors. Null with no common tenor. */
  averageShiftBp: number | null;
  slopeA: Slope | null;
  slopeB: Slope | null;
  /** slopeB - slopeA in bp, when both slopes exist. */
  slopeChangeBp: number | null;
  movement: CurveMovement | null;
}

/** B against A (B is the later or the "to" curve). Both must be auctions of the same instrument. */
export function compareCurves(a: AuctionRecord, b: AuctionRecord, def: YieldDefinition): CurveComparison {
  if (a.instrument !== b.instrument) throw new Error("compareCurves: the two auctions are of different instruments");
  const pa = curvePoints(a, def);
  const pb = curvePoints(b, def);
  const changes: CurveChange[] = pa.map((p, i) => ({ tenor: p.tenor, years: p.years, a: p.yield, b: pb[i].yield, deltaBp: p.yield !== null && pb[i].yield !== null ? bp((pb[i].yield as number) - p.yield) : null }));
  const both = changes.filter((c) => c.deltaBp !== null);
  const slopeA = slopeOf(a, def);
  const slopeB = slopeOf(b, def);
  const slopeChangeBp = slopeA && slopeB ? Math.round((slopeB.bp - slopeA.bp) * 10) / 10 : null;
  return {
    instrument: a.instrument,
    changes,
    commonTenors: both.length,
    averageShiftBp: both.length ? Math.round((both.reduce((s, c) => s + (c.deltaBp as number), 0) / both.length) * 10) / 10 : null,
    slopeA,
    slopeB,
    slopeChangeBp,
    movement: slopeChangeBp === null ? null : slopeChangeBp >= MOVE_THRESHOLD_BP ? "steepening" : slopeChangeBp <= -MOVE_THRESHOLD_BP ? "flattening" : "parallel",
  };
}

// ───────────────────────────── history, regimes, policy spread ─────────────────────────────

export interface SeriesPoint {
  date: string;
  value: number;
}

/** Yields of one tenor over the auctions where it was accepted. A failed or absent tenor is not a point (no zero, no carry-forward). */
export function tenorSeries(auctions: readonly AuctionRecord[], tenor: Tenor, def: YieldDefinition): SeriesPoint[] {
  const out: SeriesPoint[] = [];
  for (const a of auctions) {
    const y = yieldOf(a.tenors[tenor], def);
    if (y !== null) out.push({ date: a.auctionDate, value: y });
  }
  return out;
}

/** Auctions where the tenor was offered but produced no yield, with why. */
export function failedTenors(auctions: readonly AuctionRecord[], tenor: Tenor): { date: string; outcome: AuctionOutcome }[] {
  return auctions.flatMap((a) => {
    const t = a.tenors[tenor];
    return t && t.outcome !== "accepted" ? [{ date: a.auctionDate, outcome: t.outcome }] : [];
  });
}

export interface SlopePoint {
  date: string;
  bp: number;
  shape: CurveShape;
}

export function slopeSeries(auctions: readonly AuctionRecord[], def: YieldDefinition): SlopePoint[] {
  const out: SlopePoint[] = [];
  for (const a of auctions) {
    const s = slopeOf(a, def);
    if (s) out.push({ date: a.auctionDate, bp: s.bp, shape: s.shape });
  }
  return out;
}

export interface ShapeRegime {
  shape: CurveShape;
  from: string;
  to: string;
  /** Consecutive auctions (with a slope) in the run. */
  auctions: number;
  averageBp: number;
  /** The slope furthest from zero in the run (the most inverted, or the steepest). */
  extremeBp: number;
}

/** Runs of consecutive auctions with the same curve shape. Auctions with no slope (a failed leg) are skipped, not treated as a break or as flat. */
export function shapeRegimes(slopes: readonly SlopePoint[]): ShapeRegime[] {
  const out: ShapeRegime[] = [];
  let cur: { shape: CurveShape; from: string; to: string; vals: number[] } | null = null;
  for (const s of slopes) {
    if (cur && cur.shape === s.shape) {
      cur.to = s.date;
      cur.vals.push(s.bp);
    } else {
      if (cur) out.push(finishRegime(cur));
      cur = { shape: s.shape, from: s.date, to: s.date, vals: [s.bp] };
    }
  }
  if (cur) out.push(finishRegime(cur));
  return out;
}

function finishRegime(c: { shape: CurveShape; from: string; to: string; vals: number[] }): ShapeRegime {
  const extreme = c.vals.reduce((m, v) => (Math.abs(v) > Math.abs(m) ? v : m), c.vals[0]);
  return { shape: c.shape, from: c.from, to: c.to, auctions: c.vals.length, averageBp: Math.round((c.vals.reduce((a, b) => a + b, 0) / c.vals.length) * 10) / 10, extremeBp: extreme };
}

export interface PolicySpreadPoint {
  date: string;
  yield: number;
  policyRate: number;
  /** Auction yield minus the policy rate in force that day, percentage points, two decimals. */
  spreadPp: number;
}

/** A tenor's yield minus the policy rate in force on the auction date. Auctions before the first policy observation are skipped. */
export function policySpreadSeries(auctions: readonly AuctionRecord[], tenor: Tenor, def: YieldDefinition, policy: readonly DatedPoint[]): PolicySpreadPoint[] {
  const out: PolicySpreadPoint[] = [];
  for (const p of tenorSeries(auctions, tenor, def)) {
    const rate = asOfObservation(policy, p.date);
    if (rate) out.push({ date: p.date, yield: p.value, policyRate: rate.value, spreadPp: Math.round((p.value - rate.value) * 100) / 100 });
  }
  return out;
}

// ───────────────────────────── auction flow ─────────────────────────────

export interface FlowRow {
  date: string;
  auctionNo: number | null;
  /** PKR million, face value. */
  offered: number | null;
  accepted: number | null;
  target: number | null;
  /** Competitive bids offered as a multiple of the target. Null without both. */
  offeredOverTarget: number | null;
  /** Total accepted as a multiple of the target. Null without both. */
  acceptedOverTarget: number | null;
  outcome: AuctionOutcome | "mixed";
  /** The yield under the chosen definition for a single tenor; null for "all". */
  yield: number | null;
}

const ratio = (n: number | null, d: number | null): number | null => (n !== null && d !== null && d > 0 ? Math.round((n / d) * 100) / 100 : null);

/**
 * One row per auction for a tenor, or for every tenor together ("all"). For "all": offered and accepted are sums over the tenors that have a figure; a tenor
 * that failed adds nothing to accepted (nothing was accepted) and nothing to offered if no bid was received. The target is summed only when every tenor
 * present has one; otherwise it is null (before Sep-2019 SBP published only a combined target).
 */
export function flowRows(auctions: readonly AuctionRecord[], tenor: Tenor | "all", def: YieldDefinition): FlowRow[] {
  const rows: FlowRow[] = [];
  for (const a of auctions) {
    if (tenor !== "all") {
      const t = a.tenors[tenor];
      if (!t) continue;
      const accepted = totalAccepted(t);
      rows.push({ date: a.auctionDate, auctionNo: a.auctionNo, offered: t.offered, accepted, target: t.target, offeredOverTarget: ratio(t.offered, t.target), acceptedOverTarget: ratio(accepted, t.target), outcome: t.outcome, yield: yieldOf(t, def) });
      continue;
    }
    const ts = Object.values(a.tenors) as TenorResult[];
    if (ts.length === 0) continue;
    const sum = (vals: (number | null)[]) => (vals.some((v) => v !== null) ? vals.reduce<number>((s, v) => s + (v ?? 0), 0) : null);
    const offered = sum(ts.map((t) => t.offered));
    const acceptedParts = ts.map((t) => totalAccepted(t));
    const accepted = ts.some((t) => t.outcome === "accepted") ? sum(acceptedParts) : null;
    const target = ts.every((t) => t.target !== null) ? sum(ts.map((t) => t.target)) : null;
    const outcomes = new Set(ts.map((t) => t.outcome));
    rows.push({ date: a.auctionDate, auctionNo: a.auctionNo, offered, accepted, target, offeredOverTarget: ratio(offered, target), acceptedOverTarget: ratio(accepted, target), outcome: outcomes.size === 1 ? ([...outcomes][0] as AuctionOutcome) : "mixed", yield: null });
  }
  return rows;
}

// ───────────────────────────── auction selection helpers for the explorer ─────────────────────────────

export interface AuctionPreset {
  id: string;
  label: string;
  date: string;
}

/**
 * Sensible comparison dates, all computed from the data: the latest auction, the one before it, about 6 and 12 months earlier, and the auctions with the
 * highest and the lowest 12-month (T-bills) or 10-year (PIBs) yield. Only dates that exist are returned.
 */
export function auctionPresets(auctions: readonly AuctionRecord[], def: YieldDefinition): AuctionPreset[] {
  const last = latestAuction(auctions);
  if (!last) return [];
  const long = SLOPE_TENORS[last.instrument].long;
  const out: AuctionPreset[] = [{ id: "latest", label: "Latest", date: last.auctionDate }];
  if (auctions.length > 1) out.push({ id: "previous", label: "Previous auction", date: auctions[auctions.length - 2].auctionDate });
  for (const [id, label, m] of [["6m", "~6 months earlier", 6], ["12m", "~12 months earlier", 12]] as const) {
    const n = nearestAuction(auctions, monthsBefore(last.auctionDate, m));
    if (n && n.auction.auctionDate !== last.auctionDate) out.push({ id, label, date: n.auction.auctionDate });
  }
  const series = tenorSeries(auctions, long, def);
  if (series.length) {
    const hi = series.reduce((m, p) => (p.value > m.value ? p : m));
    const lo = series.reduce((m, p) => (p.value < m.value ? p : m));
    out.push({ id: "peak", label: `Highest ${long} yield`, date: hi.date }, { id: "low", label: `Lowest ${long} yield`, date: lo.date });
  }
  const seen = new Set<string>();
  return out.filter((p) => (seen.has(p.id + p.date) ? false : (seen.add(p.id + p.date), true)));
}
