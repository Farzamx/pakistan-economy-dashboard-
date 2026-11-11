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
