// Pure calculations for the Pakistan Interest Rate page. No I/O, no clock (the as-of date is passed in), no randomness: every number
// the page prints is computed here from the series the page was given, so each rule below is unit-tested against hand-worked values.
//
// WHAT THE DATA IS (and is not)
// The SBP policy rate series (SBP EasyData SBPOL0030, the "policy (target) rate") has one observation per DATE THE RATE TOOK A VALUE. It is
// not a list of Monetary Policy Committee meetings: a meeting that left the rate unchanged leaves no row, so holds are invisible here, and
// a row can occasionally repeat the previous value (SBP's series does this twice, in April and May 2020). Everything below therefore
// speaks of rate CHANGES, never of "decisions including holds", and never counts a repeated value as a change.
//
// WHAT IS REUSED
// The month-by-month "rate in effect" rule (a step function: the latest observation dated in or before the month) is the Inflation page's
// own `policyRateAt` / `policyStepSeries`. It is imported, not re-implemented, so both pages define "the policy rate in a month" identically.

import { policyRateAt, policyStepSeries, type PolicyDecision } from "@/lib/inflation/analytics";
import { monthIndex, monthKeyOf, monthsBetween, shiftMonth, type MonthKey, type MonthlyPoint } from "@/lib/inflation/periods";

export type { PolicyDecision };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const round4 = (n: number) => Math.round(n * 1e4) / 1e4;

// ── cleaning ────────────────────────────────────────────────────────────────────────────────────────────────────────────
export interface CleanedDecisions {
  /** Valid observations, ascending by date, one per date. Includes repeated-value rows (harmless for a step function). */
  decisions: PolicyDecision[];
  /** Rows that repeat the previous value: kept in `decisions`, never counted as a change. */
  repeats: PolicyDecision[];
  /** Rows rejected outright: not an ISO date, or not a finite number. */
  rejected: number;
  /** Extra rows sharing a date with another row (the last one wins). */
  sameDateDuplicates: number;
}

export function cleanDecisions(raw: readonly { date: string; value: number }[]): CleanedDecisions {
  let rejected = 0;
  const byDate = new Map<string, PolicyDecision>();
  let sameDateDuplicates = 0;
  for (const r of raw) {
    if (!ISO_DATE.test(r.date) || !Number.isFinite(r.value)) {
      rejected++;
      continue;
    }
    if (byDate.has(r.date)) sameDateDuplicates++;
    byDate.set(r.date, { date: r.date, value: r.value });
  }
  const decisions = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  const repeats = decisions.filter((d, i) => i > 0 && d.value === decisions[i - 1].value);
  return { decisions, repeats, rejected, sameDateDuplicates };
}

// ── rate changes ────────────────────────────────────────────────────────────────────────────────────────────────────────
export type Direction = "hike" | "cut";

export interface RateChange {
  /** The date SBP's series records the new rate. */
  date: string;
  from: number;
  to: number;
  /** Percentage points, signed. */
  change: number;
  direction: Direction;
}

/** Every move to a different value. The first observation is a starting level, not a change. */
export function rateChanges(decisions: readonly PolicyDecision[]): RateChange[] {
  const out: RateChange[] = [];
  let prev: PolicyDecision | null = null;
  for (const d of decisions) {
    if (prev && d.value !== prev.value) {
      const change = round4(d.value - prev.value);
      out.push({ date: d.date, from: prev.value, to: d.value, change, direction: change > 0 ? "hike" : "cut" });
    }
    prev = d;
  }
  return out;
}

// ── tightening and easing cycles ────────────────────────────────────────────────────────────────────────────────────────
export interface Cycle {
  direction: "tightening" | "easing";
  /** Date of the first change in the run. */
  startDate: string;
  /** Date of the last change in the run. */
  endDate: string;
  /** How many changes the run holds. */
  changes: number;
  /** The rate before the first change, and after the last. */
  startRate: number;
  endRate: number;
  /** Percentage points, signed. */
  totalChange: number;
  /** Whole months from the first change to the last (0 when the run is a single change). */
  spanMonths: number;
  /** True for the newest run: no change in the opposite direction has followed it yet. */
  latest: boolean;
}

/**
 * A cycle is a maximal run of consecutive rate changes in the same direction. Because holds are not in the data, the run's length in time
 * is the span from its first change to its last: it says nothing about meetings that held in between. A cycle ends only when the next
 * change goes the other way, so a long pause does not split a run.
 */
export function findCycles(changes: readonly RateChange[]): Cycle[] {
  const cycles: Cycle[] = [];
  let run: RateChange[] = [];
  const flush = () => {
    if (run.length === 0) return;
    const first = run[0];
    const last = run[run.length - 1];
    cycles.push({
      direction: first.direction === "hike" ? "tightening" : "easing",
      startDate: first.date,
      endDate: last.date,
      changes: run.length,
      startRate: first.from,
      endRate: last.to,
      totalChange: round4(last.to - first.from),
      spanMonths: monthsBetween(monthKeyOf(first.date), monthKeyOf(last.date)),
      latest: false,
    });
    run = [];
  };
  for (const c of changes) {
    if (run.length > 0 && run[run.length - 1].direction !== c.direction) flush();
    run.push(c);
  }
  flush();
  if (cycles.length > 0) cycles[cycles.length - 1].latest = true;
  return cycles;
}

// ── summary statistics ──────────────────────────────────────────────────────────────────────────────────────────────────
export interface Extreme {
  value: number;
  /** First date the series reached this value. */
  from: string;
  /** The date of the next change (when it stopped being the rate), or null if it is still the current rate. */
  until: string | null;
}

export interface RateStats {
  firstDate: string;
  current: { value: number; since: string };
  /** The level before the most recent change, or null if there has been no change. */
  previous: { value: number; until: string } | null;
  highest: Extreme;
  lowest: Extreme;
  /** highest − lowest, percentage points. */
  range: number;
  /** Average over calendar days from `firstDate` to `asOf`, each rate weighted by how long it was in effect. */
  timeWeightedMean: number;
  asOf: string;
  changeCount: number;
  hikes: number;
  cuts: number;
  largestHike: RateChange | null;
  largestCut: RateChange | null;
}

const dayNumber = (iso: string) => Math.floor(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 86_400_000);

function extreme(decisions: readonly PolicyDecision[], pick: (a: number, b: number) => boolean): Extreme {
  let best = decisions[0];
  for (const d of decisions) if (pick(d.value, best.value)) best = d;
  const first = decisions.find((d) => d.value === best.value) as PolicyDecision; // first time the series reached this level
  const i = decisions.findIndex((d) => d.date === first.date);
  const next = decisions.slice(i + 1).find((d) => d.value !== best.value);
  return { value: best.value, from: first.date, until: next ? next.date : null };
}

export function rateStats(decisions: readonly PolicyDecision[], asOf: string): RateStats | null {
  if (decisions.length === 0) return null;
  const changes = rateChanges(decisions);
  const last = decisions[decisions.length - 1];
  const lastChange = changes.length ? changes[changes.length - 1] : null;
  const end = Math.max(dayNumber(asOf), dayNumber(last.date)); // never before the newest observation
  const start = dayNumber(decisions[0].date);
  let weighted = 0;
  for (let i = 0; i < decisions.length; i++) {
    const from = dayNumber(decisions[i].date);
    const to = i + 1 < decisions.length ? dayNumber(decisions[i + 1].date) : end;
    weighted += decisions[i].value * (to - from);
  }
  const highest = extreme(decisions, (a, b) => a > b);
  const lowest = extreme(decisions, (a, b) => a < b);
  const hikes = changes.filter((c) => c.direction === "hike");
  const cuts = changes.filter((c) => c.direction === "cut");
  const by = (list: RateChange[], cmp: (a: RateChange, b: RateChange) => boolean) => list.reduce<RateChange | null>((m, c) => (m === null || cmp(c, m) ? c : m), null);
  const sinceDate = lastChange ? lastChange.date : decisions[0].date;
  return {
    firstDate: decisions[0].date,
    current: { value: last.value, since: sinceDate },
    previous: lastChange ? { value: lastChange.from, until: lastChange.date } : null,
    highest,
    lowest,
    range: round4(highest.value - lowest.value),
    timeWeightedMean: end > start ? weighted / (end - start) : last.value,
    asOf,
    changeCount: changes.length,
    hikes: hikes.length,
    cuts: cuts.length,
    largestHike: by(hikes, (a, b) => a.change > b.change),
    largestCut: by(cuts, (a, b) => a.change < b.change),
  };
}

// ── real policy rate ────────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * The real policy rate, exact Fisher form: ((1 + i/100) / (1 + π/100) − 1) × 100, i = nominal policy rate, π = year-on-year inflation.
 *
 * It is an EX-POST, BACKWARD-LOOKING indicator: the policy rate against inflation that has already happened. It is not a market real
 * interest rate and not an expected (ex-ante) one; no inflation forecast is used or available here. The simple difference i − π is only an
 * approximation, and a poor one when inflation is high (at i = 22, π = 38 the difference is −16 points but the Fisher real rate is −11.6).
 */
export function realRate(nominalPct: number, inflationPct: number): number {
  return ((1 + nominalPct / 100) / (1 + inflationPct / 100) - 1) * 100;
}

export interface RealRatePoint {
  month: MonthKey;
  /** The policy rate in effect at month-end (the existing step rule). */
  policy: number;
  /** Year-on-year inflation for the month. */
  inflation: number;
  real: number;
}

/** One point per inflation month at or before `horizon` for which a policy rate is in effect. A missing month is skipped, never filled. */
export function realPolicyRateSeries(decisions: readonly PolicyDecision[], inflation: readonly MonthlyPoint[], horizon: MonthKey): RealRatePoint[] {
  const out: RealRatePoint[] = [];
  for (const p of inflation) {
    if (p.month > horizon) continue;
    const policy = policyRateAt(decisions, p.month);
    if (policy === null) continue;
    out.push({ month: p.month, policy, inflation: p.value, real: realRate(policy, p.value) });
  }
  return out;
}

// ── inflation around a rate change ──────────────────────────────────────────────────────────────────────────────────────
/**
 * The inflation reading a rate change could have been taken with: the CPI of the month BEFORE the month of the change (PBS publishes the
 * monthly CPI at the start of the following month, so a decision in October is made with September's figure). Only that exact month is
 * used; if it is missing the answer is null, never the nearest month.
 */
export function inflationKnownAt(date: string, inflation: readonly MonthlyPoint[]): MonthlyPoint | null {
  const month = shiftMonth(monthKeyOf(date), -1);
  return inflation.find((p) => p.month === month) ?? null;
}

export interface ChangeRow extends RateChange {
  /** Inflation known at the time (see inflationKnownAt), or null. */
  inflationMonth: MonthKey | null;
  inflation: number | null;
  /** The real rate AFTER the change, against that inflation; null when the inflation is not known. */
  realAfter: number | null;
}

export function changeRows(changes: readonly RateChange[], inflation: readonly MonthlyPoint[]): ChangeRow[] {
  return changes.map((c) => {
    const known = inflationKnownAt(c.date, inflation);
    return { ...c, inflationMonth: known?.month ?? null, inflation: known?.value ?? null, realAfter: known ? realRate(c.to, known.value) : null };
  });
}

export interface CycleOutcome extends Cycle {
  /** Inflation known at the first and at the last change of the cycle. */
  inflationAtStart: number | null;
  inflationAtEnd: number | null;
  /** Inflation 12 months after the month of the last change, if that month is in the data. */
  inflationTwelveMonthsAfter: number | null;
  twelveMonthsAfterMonth: MonthKey;
}

/** What inflation did around each cycle. Observed co-movement only: nothing here attributes a later reading to the cycle. */
export function cycleOutcomes(cycles: readonly Cycle[], inflation: readonly MonthlyPoint[]): CycleOutcome[] {
  const at = (m: MonthKey) => inflation.find((p) => p.month === m)?.value ?? null;
  return cycles.map((c) => {
    const after = shiftMonth(monthKeyOf(c.endDate), 12);
    return {
      ...c,
      inflationAtStart: inflationKnownAt(c.startDate, inflation)?.value ?? null,
      inflationAtEnd: inflationKnownAt(c.endDate, inflation)?.value ?? null,
      inflationTwelveMonthsAfter: at(after),
      twelveMonthsAfterMonth: after,
    };
  });
}

// ── monthly alignment helpers for market and international comparisons ──────────────────────────────────────────────────
/** For series observed on irregular dates (auctions): the LAST observation in each calendar month. A month with none is absent. */
export function lastObservationPerMonth(points: readonly { date: string; value: number }[]): MonthlyPoint[] {
  const byMonth = new Map<MonthKey, { date: string; value: number }>();
  for (const p of points) {
    if (!ISO_DATE.test(p.date) || !Number.isFinite(p.value)) continue;
    const m = monthKeyOf(p.date);
    const cur = byMonth.get(m);
    if (!cur || p.date >= cur.date) byMonth.set(m, p);
  }
  return [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, p]) => ({ month, value: p.value }));
}

/** a − b for every month present in BOTH series (percentage points). No month is filled in. */
export function differenceSeries(a: readonly MonthlyPoint[], b: readonly MonthlyPoint[]): MonthlyPoint[] {
  const bm = new Map(b.map((p) => [p.month, p.value]));
  return a.filter((p) => bm.has(p.month)).map((p) => ({ month: p.month, value: round4(p.value - (bm.get(p.month) as number)) }));
}

/** The policy rate in effect at each of `months` up to `horizon` (the step rule, shared with the Inflation page). */
export function policyMonthly(decisions: readonly PolicyDecision[], months: readonly MonthKey[], horizon: MonthKey): MonthlyPoint[] {
  return policyStepSeries(decisions, months, horizon);
}

/** Every month from `from` to `to` inclusive. */
export function monthRange(from: MonthKey, to: MonthKey): MonthKey[] {
  const out: MonthKey[] = [];
  for (let i = monthIndex(from); i <= monthIndex(to); i++) out.push(shiftMonth(from, i - monthIndex(from)));
  return out;
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// G.9 additions: regimes, holding spans, cumulative changes, and date-exact comparisons for series observed on different dates.
//
// FREQUENCIES. The policy rate changes on decision dates; CPI is monthly; T-bill and PIB yields are set at auctions on irregular dates
// (the 3-month bill roughly fortnightly, the 3-year bond roughly monthly with long gaps). Nothing below resamples one onto another's
// calendar without saying so: a spread is taken ON a stated date, against the rate in effect on that date, and a term spread only pairs
// two auctions that are close enough in time to be comparable (otherwise the date is left out, not filled).
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

export const dayNumberOf = dayNumber;

/** Days between two ISO dates (b − a). */
export const daysBetween = (a: string, b: string) => dayNumber(b) - dayNumber(a);

/**
 * The policy rate in effect ON an ISO date: the latest observation dated on or before it (an observation takes effect on its own date).
 * null before the first observation. Unlike policyRateAt (month-end), this does not blur a change made later in the same month.
 */
export function policyRateOnDate(decisions: readonly PolicyDecision[], date: string): number | null {
  let value: number | null = null;
  for (const d of decisions) {
    if (d.date <= date) value = d.value;
    else break;
  }
  return value;
}

export interface AuctionSpread {
  date: string;
  /** The auction yield, %. */
  yield: number;
  /** The policy rate in effect on the auction date, %. */
  policy: number;
  /** yield − policy, percentage points. */
  spread: number;
}

/** For every auction on or after the first policy observation: the yield minus the policy rate in effect that same day. */
export function spreadAtAuctions(auctions: readonly { date: string; value: number }[], decisions: readonly PolicyDecision[]): AuctionSpread[] {
  const out: AuctionSpread[] = [];
  const sorted = [...auctions].filter((a) => ISO_DATE.test(a.date) && Number.isFinite(a.value)).sort((a, b) => a.date.localeCompare(b.date));
  for (const a of sorted) {
    const policy = policyRateOnDate(decisions, a.date);
    if (policy === null) continue;
    out.push({ date: a.date, yield: a.value, policy, spread: round4(a.value - policy) });
  }
  return out;
}

export interface TermSpreadPoint {
  /** Date of the longer-maturity auction. */
  date: string;
  long: number;
  /** The most recent shorter-maturity auction on or before `date`, and how many days earlier it was. */
  short: number;
  shortDate: string;
  lagDays: number;
  /** long − short, percentage points: positive when the longer maturity yields more. */
  spread: number;
}

/**
 * Long-maturity yield minus the short-maturity yield, at each LONG auction, against the latest SHORT auction on or before it (never a
 * later one) and no more than `maxLagDays` earlier. A long auction with no short auction that close is left out, not filled. This is the
 * slope between TWO maturities only; it is not a yield curve.
 */
export function termSpread(long: readonly { date: string; value: number }[], short: readonly { date: string; value: number }[], maxLagDays = 21): TermSpreadPoint[] {
  const clean = (xs: readonly { date: string; value: number }[]) => xs.filter((x) => ISO_DATE.test(x.date) && Number.isFinite(x.value)).sort((a, b) => a.date.localeCompare(b.date));
  const L = clean(long);
  const S = clean(short);
  const out: TermSpreadPoint[] = [];
  let j = -1;
  for (const l of L) {
    while (j + 1 < S.length && S[j + 1].date <= l.date) j++;
    if (j < 0) continue;
    const lag = daysBetween(S[j].date, l.date);
    if (lag > maxLagDays) continue;
    out.push({ date: l.date, long: l.value, short: S[j].value, shortDate: S[j].date, lagDays: lag, spread: round4(l.value - S[j].value) });
  }
  return out;
}

// ── how long each rate level lasted ─────────────────────────────────────────────────────────────────────────────────────
export interface RateLevel {
  rate: number;
  /** The date the series first records this level (a repeated value does not start a new level). */
  from: string;
  /** The date of the next change, or null for the level still in effect. */
  until: string | null;
  /** Calendar days from `from` to `until` (or to the as-of date for the current level). */
  days: number;
  /** How the level began: the first observation, an increase, or a cut. */
  enteredBy: "start" | Direction;
  /** True for the level still in effect: its length so far, not a completed hold. */
  current: boolean;
}

/** Each stretch during which the policy rate stayed at one value, first observation to as-of. */
export function rateLevels(decisions: readonly PolicyDecision[], asOf: string): RateLevel[] {
  if (decisions.length === 0) return [];
  const end = Math.max(dayNumber(asOf), dayNumber(decisions[decisions.length - 1].date));
  const levels: RateLevel[] = [];
  let cur: { rate: number; from: string; enteredBy: RateLevel["enteredBy"] } = { rate: decisions[0].value, from: decisions[0].date, enteredBy: "start" };
  const close = (until: string | null): void => {
    levels.push({ rate: cur.rate, from: cur.from, until, days: (until === null ? end : dayNumber(until)) - dayNumber(cur.from), enteredBy: cur.enteredBy, current: until === null });
  };
  for (const d of decisions) {
    if (d.value === cur.rate) continue;
    close(d.date);
    cur = { rate: d.value, from: d.date, enteredBy: d.value > cur.rate ? "hike" : "cut" };
  }
  close(null);
  return levels;
}

/**
 * The longest COMPLETED level whose start is actually known. The first level begins where the series begins (the rate may have been at
 * that level for years before PEIC's data starts), so its length is only a lower bound and it is never named "the longest". null if none.
 */
export function longestKnownHold(levels: readonly RateLevel[]): RateLevel | null {
  return levels.filter((l) => !l.current && l.enteredBy !== "start").reduce<RateLevel | null>((best, l) => (best === null || l.days > best.days ? l : best), null);
}

// ── cumulative changes ──────────────────────────────────────────────────────────────────────────────────────────────────
export interface CumulativePoint {
  date: string;
  /** Running total of increases, pp (never decreases). */
  increases: number;
  /** Running total of cuts, pp (zero or negative, never increases). */
  cuts: number;
  /** increases + cuts: how far the rate stands from its first recorded level. */
  net: number;
}

/** A step series starting at 0 on `firstDate`: the running total of increases, of cuts, and the net, after each change. */
export function cumulativeChanges(changes: readonly RateChange[], firstDate: string): CumulativePoint[] {
  const out: CumulativePoint[] = [{ date: firstDate, increases: 0, cuts: 0, net: 0 }];
  let up = 0;
  let down = 0;
  for (const c of changes) {
    if (c.change > 0) up = round4(up + c.change);
    else down = round4(down + c.change);
    out.push({ date: c.date, increases: up, cuts: down, net: round4(up + down) });
  }
  return out;
}

// ── regimes: tightening, easing and holding ─────────────────────────────────────────────────────────────────────────────
export type RegimeKind = "tightening" | "easing" | "hold";

export interface RegimeSegment {
  kind: RegimeKind;
  from: string;
  to: string;
  days: number;
  /** Rate at the start and end of the segment (equal for a hold). */
  startRate: number;
  endRate: number;
  /** Number of rate changes inside a tightening/easing run (0 for a hold). */
  changes: number;
  /** Index into the cycles array, or null for a hold. */
  cycleIndex: number | null;
  /** True for the segment that runs to the as-of date. */
  open: boolean;
}

/**
 * Cuts the time from the first observation to the as-of date into non-overlapping segments: each cycle (first change to last change)
 * as "tightening" or "easing", and the spans between them, before the first and after the last, as "hold" (the rate was not changed).
 * A pause INSIDE a cycle is part of that cycle's segment (see rateLevels for every individual pause). Contiguous by construction.
 */
export function regimeSegments(cycles: readonly Cycle[], firstDate: string, firstRate: number, asOf: string, lastObservationDate: string = firstDate): RegimeSegment[] {
  const end = dayNumber(asOf) >= dayNumber(lastObservationDate) ? asOf : lastObservationDate;
  const out: RegimeSegment[] = [];
  let cursor = firstDate;
  let rate = firstRate;
  const hold = (to: string, open: boolean) => {
    if (dayNumber(to) > dayNumber(cursor)) out.push({ kind: "hold", from: cursor, to, days: daysBetween(cursor, to), startRate: rate, endRate: rate, changes: 0, cycleIndex: null, open });
  };
  cycles.forEach((c, i) => {
    hold(c.startDate, false);
    out.push({ kind: c.direction, from: c.startDate, to: c.endDate, days: daysBetween(c.startDate, c.endDate), startRate: c.startRate, endRate: c.endRate, changes: c.changes, cycleIndex: i, open: false });
    cursor = c.endDate;
    rate = c.endRate;
  });
  hold(end, true);
  return out;
}

export interface TurningPoint {
  /** Date of the last change in the run, where the next change goes the other way. */
  date: string;
  rate: number;
  kind: "peak" | "trough";
  cycleIndex: number;
  /** False for the newest run: no change in the opposite direction has followed it yet, so it may not be a turning point. */
  confirmed: boolean;
}

export function turningPoints(cycles: readonly Cycle[]): TurningPoint[] {
  return cycles.map((c, i) => ({ date: c.endDate, rate: c.endRate, kind: c.direction === "tightening" ? "peak" : "trough", cycleIndex: i, confirmed: !c.latest }));
}

// ── summaries of a monthly series ───────────────────────────────────────────────────────────────────────────────────────
export interface SeriesSummary {
  latest: MonthlyPoint;
  highest: MonthlyPoint;
  lowest: MonthlyPoint;
  months: number;
  /** Months with a value above zero / below zero. */
  above: number;
  below: number;
}

/** Extremes and sign counts of a monthly series; ties resolve to the EARLIEST month. null for an empty series. */
export function summarizeSeries(points: readonly MonthlyPoint[]): SeriesSummary | null {
  if (points.length === 0) return null;
  let highest = points[0];
  let lowest = points[0];
  let above = 0;
  let below = 0;
  for (const p of points) {
    if (p.value > highest.value) highest = p;
    if (p.value < lowest.value) lowest = p;
    if (p.value > 0) above++;
    else if (p.value < 0) below++;
  }
  return { latest: points[points.length - 1], highest, lowest, months: points.length, above, below };
}

/** The first day of the earliest month a range shows, given the newest date: "12" -> the 12 calendar months ending with that date's month. null = all. */
export function rangeStartDate(newestDate: string, range: "12" | "24" | "60" | "all"): string | null {
  if (range === "all") return null;
  return `${shiftMonth(monthKeyOf(newestDate), -(Number(range) - 1))}-01`;
}
