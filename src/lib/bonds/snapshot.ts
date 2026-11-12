// The "latest auctions" snapshot and the rule-based findings. Pure: every figure comes from the auction data (and, where stated, the policy-rate history), and
// every sentence is built from those figures by a fixed rule. Nothing is written by a model and nothing infers a cause.

import { asOfObservation, type DatedPoint } from "@/lib/policyRate/dateSeries";
import { formatDate } from "@/lib/policyRate/format";
import {
  YIELD_DEFINITION_LABEL,
  compareCurves,
  curvePoints,
  failedTenors,
  flowRows,
  latestAuction,
  monthsBefore,
  nearestAuction,
  shapeRegimes,
  slopeOf,
  slopeSeries,
  tenorSeries,
  yieldOf,
  type YieldDefinition,
} from "./analytics";
import { describeShape } from "./curveExplorerModel";
import { TENOR_LABEL, type AuctionRecord, type Tenor } from "./types";

const pp2 = (v: number) => v.toFixed(2);
const bpText = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(1).replace(/\.0$/, "")} bp`;

export interface LatestYield {
  tenor: Tenor;
  /** The most recent auction at which this tenor produced a yield. */
  auction: AuctionRecord;
  value: number;
  /** False when the newest auction of the instrument did not produce a yield for this tenor (so this is an older observation). */
  atLatestAuction: boolean;
  /** Why the newest auction has none, when it does not. */
  newestOutcome: string | null;
  /** The previous accepted yield of the tenor, for the change. */
  previous: { date: string; value: number } | null;
}

/** The last accepted yield of a tenor, and whether it is from the newest auction. Null if the tenor has never produced one. */
export function latestYield(auctions: readonly AuctionRecord[], tenor: Tenor, def: YieldDefinition): LatestYield | null {
  const newest = latestAuction(auctions);
  for (let i = auctions.length - 1; i >= 0; i--) {
    const y = yieldOf(auctions[i].tenors[tenor], def);
    if (y === null) continue;
    let previous: LatestYield["previous"] = null;
    for (let j = i - 1; j >= 0; j--) {
      const p = yieldOf(auctions[j].tenors[tenor], def);
      if (p !== null) {
        previous = { date: auctions[j].auctionDate, value: p };
        break;
      }
    }
    const atLatest = auctions[i] === newest;
    return { tenor, auction: auctions[i], value: y, atLatestAuction: atLatest, newestOutcome: atLatest ? null : (newest?.tenors[tenor]?.outcome ?? "not-offered"), previous };
  }
  return null;
}

export interface BondInsight {
  id: string;
  text: string;
  /** The exact figures the sentence is computed from, so it can be reproduced from the data. */
  evidence: { label: string; date: string; value: number; unit: "%" | "bp" | "pp" | "Rs bn" | "x" | "auctions" }[];
  caveat?: string;
}

/**
 * Findings computed from the archive. Each carries its evidence and, where the number could mislead, what it does not say. A finding that needs a
 * figure that does not exist is simply not produced.
 */
export function buildBondInsights(input: { tbills: readonly AuctionRecord[]; pibs: readonly AuctionRecord[]; policy: readonly DatedPoint[] | null; def: YieldDefinition }): BondInsight[] {
  const { tbills, pibs, policy, def } = input;
  const label = YIELD_DEFINITION_LABEL[def].toLowerCase();
  const out: BondInsight[] = [];
  const last = latestAuction(tbills);
  if (!last) return out;

  // 1. the latest T-bill curve
  const slope = slopeOf(last, def);
  const pts = curvePoints(last, def).filter((p) => p.yield !== null);
  if (slope && pts.length >= 2) {
    const first = pts[0];
    const longest = pts[pts.length - 1];
    out.push({
      id: "tbill-curve",
      text: `At the ${formatDate(last.auctionDate)} T-bill auction, ${TENOR_LABEL[first.tenor]} bills cleared at ${pp2(first.yield as number)}% and ${TENOR_LABEL[longest.tenor]} bills at ${pp2(longest.yield as number)}%. ${describeShape(slope)}`,
      evidence: pts.map((p) => ({ label: `${p.tenor} ${label}`, date: last.auctionDate, value: p.yield as number, unit: "%" as const })),
      caveat: "Primary-market auction yields, not secondary-market quotes. The slope compares the 12-month and 3-month tenors.",
    });
  }

  // 2. the latest PIB curve
  const lastPib = latestAuction(pibs);
  const pibSlope = lastPib ? slopeOf(lastPib, def) : null;
  if (lastPib && pibSlope) {
    const failed = Object.entries(lastPib.tenors).filter(([, t]) => t && t.outcome !== "accepted").map(([k]) => k);
    out.push({
      id: "pib-curve",
      text: `At the ${formatDate(lastPib.auctionDate)} PIB auction, 3-year bonds cleared at ${pp2(yieldOf(lastPib.tenors["3Y"], def) as number)}% and 10-year bonds at ${pp2(yieldOf(lastPib.tenors["10Y"], def) as number)}%. ${describeShape(pibSlope)}${failed.length ? ` No yield was set for ${failed.join(", ")} (bids rejected or none accepted).` : ""}`,
      evidence: curvePoints(lastPib, def).filter((p) => p.yield !== null).map((p) => ({ label: `${p.tenor} ${label}`, date: lastPib.auctionDate, value: p.yield as number, unit: "%" as const })),
      caveat: "PIB auctions are held on different days from T-bill auctions; the two curves are not simultaneous.",
    });
  }

  // 3. a year earlier
  const yearAgo = nearestAuction(tbills.slice(0, tbills.length - 1), monthsBefore(last.auctionDate, 12));
  if (yearAgo) {
    const c = compareCurves(yearAgo.auction, last, def);
    if (c.averageShiftBp !== null && c.movement !== null && c.slopeChangeBp !== null) {
      const word = c.movement === "steepening" ? "steepened" : c.movement === "flattening" ? "flattened" : "kept about the same slope";
      out.push({
        id: "year-on-year",
        text: `Against the ${formatDate(yearAgo.auction.auctionDate)} auction, T-bill yields are ${Math.abs(c.averageShiftBp).toFixed(1).replace(/\.0$/, "")} bp ${c.averageShiftBp >= 0 ? "higher" : "lower"} on average across ${c.commonTenors} tenors, and the curve ${word}${c.movement === "parallel" ? "" : ` by ${Math.abs(c.slopeChangeBp).toFixed(1).replace(/\.0$/, "")} bp`}.`,
        evidence: c.changes.filter((x) => x.deltaBp !== null).map((x) => ({ label: `${x.tenor} change`, date: last.auctionDate, value: x.deltaBp as number, unit: "bp" as const })),
        caveat: "Two auctions about a year apart; yields can move a long way in between.",
      });
    }
  }

  // 4. the peak of the 12-month yield
  const s12 = tenorSeries(tbills, "12M", def);
  const l12 = latestYield(tbills, "12M", def);
  if (s12.length && l12) {
    const hi = s12.reduce((m, p) => (p.value > m.value ? p : m));
    if (hi.date !== l12.auction.auctionDate) {
      out.push({
        id: "peak",
        text: `The 12-month ${label} was highest at ${pp2(hi.value)}% on ${formatDate(hi.date)}. The latest figure, ${pp2(l12.value)}% (${formatDate(l12.auction.auctionDate)}), is ${pp2(hi.value - l12.value)} percentage points lower.`,
        evidence: [{ label: `12M ${label}, peak`, date: hi.date, value: hi.value, unit: "%" }, { label: `12M ${label}, latest`, date: l12.auction.auctionDate, value: l12.value, unit: "%" }],
        caveat: `Across the auctions in SBP's detailed archive, from ${formatDate(tbills[0].auctionDate)}. The 12-month tenor drew no accepted bid at ${failedTenors(tbills, "12M").length} of ${tbills.length} auctions, so its history has gaps.`,
      });
    }
  }

  // 5. inversion
  const slopes = slopeSeries(tbills, def);
  const regimes = shapeRegimes(slopes);
  const inverted = slopes.filter((s) => s.shape === "inverted").length;
  const longest = regimes.filter((r) => r.shape === "inverted").sort((a, b) => b.auctions - a.auctions)[0];
  if (slopes.length && longest) {
    out.push({
      id: "inversion",
      text: `The T-bill curve was inverted at ${inverted} of ${slopes.length} auctions that have a slope. The longest run was ${longest.auctions} auctions, from ${formatDate(longest.from)} to ${formatDate(longest.to)}, averaging ${bpText(longest.averageBp)} and reaching ${bpText(longest.extremeBp)}.`,
      evidence: [{ label: "Inverted auctions", date: last.auctionDate, value: inverted, unit: "auctions" }, { label: "Longest inverted run", date: longest.from, value: longest.auctions, unit: "auctions" }, { label: "Deepest slope in that run", date: longest.from, value: longest.extremeBp, unit: "bp" }],
      caveat: `Inverted means the 12-month yield was at least 10 bp below the 3-month yield. ${tbills.length - slopes.length} auctions have no slope because the 3-month or 12-month tenor produced no yield.`,
    });
  }

  // 6. policy rate
  const l3 = latestYield(tbills, "3M", def);
  if (policy && l3) {
    const rate = asOfObservation(policy, l3.auction.auctionDate);
    if (rate) {
      const d = l3.value - rate.value;
      out.push({
        id: "policy",
        text: `The 3-month ${label} (${pp2(l3.value)}%, ${formatDate(l3.auction.auctionDate)}) is ${Math.abs(d) < 0.005 ? "level with" : `${pp2(Math.abs(d))} percentage points ${d > 0 ? "above" : "below"}`} the SBP policy rate in force that day (${pp2(rate.value)}%).`,
        evidence: [{ label: `3M ${label}`, date: l3.auction.auctionDate, value: l3.value, unit: "%" }, { label: "Policy rate in force", date: rate.date, value: rate.value, unit: "%" }],
        caveat: "A policy rate is set by committee; auction yields are set by bids. They are different instruments and are compared here only by level.",
      });
    }
  }

  // 7. participation at the latest auction
  const flow = flowRows(tbills, "all", def);
  const lf = flow[flow.length - 1];
  if (lf && lf.offered !== null && lf.accepted !== null) {
    out.push({
      id: "participation",
      text: `The ${formatDate(lf.date)} T-bill auction drew Rs ${Math.round(lf.offered / 1000).toLocaleString("en-US")}bn of competitive bids and accepted Rs ${Math.round(lf.accepted / 1000).toLocaleString("en-US")}bn in total${lf.offeredOverTarget !== null ? `: bids were ${lf.offeredOverTarget.toFixed(2).replace(/\.?0+$/, "")} times the combined target` : ""}.`,
      evidence: [{ label: "Competitive bids offered", date: lf.date, value: Math.round(lf.offered / 1000), unit: "Rs bn" }, { label: "Total accepted", date: lf.date, value: Math.round(lf.accepted / 1000), unit: "Rs bn" }, ...(lf.offeredOverTarget !== null ? [{ label: "Offered ÷ target", date: lf.date, value: lf.offeredOverTarget, unit: "x" as const }] : [])],
      caveat: "Face values. Accepted includes non-competitive bids, which can be a large part of the total.",
    });
  }

  // 8. failed tenors in the last twelve months
  const since = monthsBefore(last.auctionDate, 12);
  const recent = tbills.filter((a) => a.auctionDate > since);
  const results = recent.flatMap((a) => Object.values(a.tenors));
  const nf = results.filter((t) => t && t.outcome !== "accepted").length;
  if (results.length) {
    out.push({
      id: "failures",
      text: `In the 12 months to ${formatDate(last.auctionDate)}, ${nf} of ${results.length} T-bill tenor results had no accepted bid.`,
      evidence: [{ label: "Tenor results without an accepted bid", date: last.auctionDate, value: nf, unit: "auctions" }, { label: "Tenor results", date: last.auctionDate, value: results.length, unit: "auctions" }],
      caveat: "When SBP rejects all bids or none are received, no yield is set for that tenor and it is left out of the charts.",
    });
  }
  return out;
}

export interface SnapshotTile {
  key: string;
  label: string;
  kind: string;
  /** The figure as text, e.g. "11.9999%" or "+41 bp". */
  value: string;
  period: string;
  previous: string | null;
  change: string | null;
  note: string;
  warning: string | null;
}

/** The tiles for the top of the workshop. A tenor whose newest auction produced no yield shows its last accepted yield, dated, with a warning. */
export function buildSnapshot(input: { tbills: readonly AuctionRecord[]; pibs: readonly AuctionRecord[]; policy: readonly DatedPoint[] | null; def: YieldDefinition }): SnapshotTile[] {
  const { tbills, pibs, policy, def } = input;
  const kind = `${YIELD_DEFINITION_LABEL[def]}, % p.a.`;
  const tiles: SnapshotTile[] = [];
  const yieldTile = (key: string, name: string, list: readonly AuctionRecord[], tenor: Tenor, note: string) => {
    const l = latestYield(list, tenor, def);
    if (!l) return;
    const change = l.previous ? Math.round((l.value - l.previous.value) * 1000) / 10 : null;
    tiles.push({
      key,
      label: name,
      kind,
      value: `${l.value.toFixed(2)}%`,
      period: `Auction ${formatDate(l.auction.auctionDate)}`,
      previous: l.previous ? `${l.previous.value.toFixed(2)}% on ${formatDate(l.previous.date)}` : null,
      change: change === null ? null : `${bpText(change)} vs previous accepted auction`,
      note,
      warning: l.atLatestAuction ? null : `The newest auction (${formatDate((latestAuction(list) as AuctionRecord).auctionDate)}) set no ${TENOR_LABEL[tenor]} yield (${(l.newestOutcome ?? "").replace("-", " ")}), so this is the last accepted one.`,
    });
  };
  yieldTile("t3m", "3-month T-bill", tbills, "3M", "Short-term borrowing cost.");
  yieldTile("t12m", "12-month T-bill", tbills, "12M", "One-year borrowing cost.");
  yieldTile("p3y", "3-year PIB", pibs, "3Y", "Medium-term fixed-coupon bond.");
  yieldTile("p10y", "10-year PIB", pibs, "10Y", "Long-term fixed-coupon bond.");

  const last = latestAuction(tbills);
  const slope = last ? slopeOf(last, def) : null;
  if (last && slope) tiles.push({ key: "slope", label: "T-bill curve slope", kind: "12M minus 3M, bp", value: bpText(slope.bp).replace(" bp", ""), period: `Auction ${formatDate(last.auctionDate)}`, previous: null, change: null, note: describeShape(slope) ?? "", warning: null });

  const l3 = latestYield(tbills, "3M", def);
  if (policy && l3) {
    const rate = asOfObservation(policy, l3.auction.auctionDate);
    if (rate) {
      const d = Math.round((l3.value - rate.value) * 100) / 100;
      tiles.push({ key: "policy", label: "3M T-bill vs policy rate", kind: "Percentage points", value: `${d > 0 ? "+" : d < 0 ? "−" : ""}${Math.abs(d).toFixed(2)} pp`, period: `Auction ${formatDate(l3.auction.auctionDate)}`, previous: null, change: null, note: `Policy rate in force: ${rate.value.toFixed(2)}% (since ${formatDate(rate.date)}).`, warning: null });
    }
  }
  return tiles;
}

export interface DataFreshness {
  /** The date the archives were read (from the data file's provenance). */
  retrievedOn: string;
  /** Whole days between the retrieval date and `now`. */
  ageDays: number;
  /** True once the data is older than STALE_AFTER_DAYS: newer auctions probably exist that this page does not show. */
  stale: boolean;
  latestTBillAuction: string | null;
  latestPibAuction: string | null;
}

/** T-bills are auctioned every two weeks; three weeks without a refresh means at least one auction is missing. */
export const STALE_AFTER_DAYS = 21;

/** How current the page's auction data is. `now` is passed in so the rule is testable and a render is deterministic. */
export function dataFreshness(retrievedOn: string, now: string, tbills: readonly AuctionRecord[], pibs: readonly AuctionRecord[]): DataFreshness {
  const ageDays = Math.round((Date.parse(`${now}T00:00:00Z`) - Date.parse(`${retrievedOn}T00:00:00Z`)) / 86_400_000);
  return { retrievedOn, ageDays, stale: ageDays > STALE_AFTER_DAYS, latestTBillAuction: latestAuction(tbills)?.auctionDate ?? null, latestPibAuction: latestAuction(pibs)?.auctionDate ?? null };
}

export interface MethodFacts {
  tbillAuctions: number;
  tbillFirst: string;
  tbillLast: string;
  pibAuctions: number;
  pibFirst: string;
  pibLast: string;
  /** Auctions at which a T-bill tenor was offered but produced no yield, by tenor. */
  failedTBill: Record<string, number>;
  /** Auctions where a PIB tenor produced no yield, by tenor. */
  failedPib: Record<string, number>;
  /** T-bill auctions with a 12M-minus-3M slope. */
  slopeAuctions: number;
  /** Accepted tenor results for which SBP's file has no non-competitive figure. */
  acceptedWithoutNonCompetitive: number;
}

/** Counts the methodology text quotes, computed from the data so the prose cannot drift from it. Null for an empty archive. */
export function buildMethodFacts(tbills: readonly AuctionRecord[], pibs: readonly AuctionRecord[]): MethodFacts | null {
  if (tbills.length === 0 || pibs.length === 0) return null;
  const tally = (list: readonly AuctionRecord[]) => {
    const out: Record<string, number> = {};
    for (const a of list) for (const [t, r] of Object.entries(a.tenors)) if (r && r.outcome !== "accepted") out[t] = (out[t] ?? 0) + 1;
    return out;
  };
  const ncb = [...tbills, ...pibs].flatMap((a) => Object.values(a.tenors)).filter((r) => r && r.outcome === "accepted" && r.acceptedNonCompetitive === null).length;
  return {
    tbillAuctions: tbills.length,
    tbillFirst: tbills[0].auctionDate,
    tbillLast: tbills[tbills.length - 1].auctionDate,
    pibAuctions: pibs.length,
    pibFirst: pibs[0].auctionDate,
    pibLast: pibs[pibs.length - 1].auctionDate,
    failedTBill: tally(tbills),
    failedPib: tally(pibs),
    slopeAuctions: slopeSeries(tbills, "cutoff").length,
    acceptedWithoutNonCompetitive: ncb,
  };
}
