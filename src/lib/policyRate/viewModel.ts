// Turns the raw series the Interest Rate page loads into the plain, serialisable structure its client components render.
//
// Pure: no I/O and no clock (the as-of date arrives as an argument). Every derived number is computed HERE, on the server, from the series
// it was given; the client components only select, toggle and draw. This is also where the page's data checks run, so the methodology
// section reports what the data actually did on this render rather than what we assumed it would do.
//
// Architecture mirrors the Inflation page: a pure builder (this file) + calculations (analytics.ts) + one server loader
// (src/lib/data/policyRatePageData.ts) + client chart components (src/components/policyRate).

import {
  changeRows,
  cleanDecisions,
  cumulativeChanges,
  cycleOutcomes,
  differenceSeries,
  findCycles,
  lastObservationPerMonth,
  monthRange,
  policyMonthly,
  rateChanges,
  rateLevels,
  rateStats,
  realPolicyRateSeries,
  regimeSegments,
  spreadAtAuctions,
  summarizeSeries,
  termSpread,
  turningPoints,
  type AuctionSpread,
  type ChangeRow,
  type CumulativePoint,
  type Cycle,
  type CycleOutcome,
  type PolicyDecision,
  type RateChange,
  type RateLevel,
  type RateStats,
  type RealRatePoint,
  type RegimeSegment,
  type SeriesSummary,
  type TermSpreadPoint,
  type TurningPoint,
} from "@/lib/policyRate/analytics";
import { formatDate, pct } from "@/lib/policyRate/format";
import { monthKeyOf, toMonthlyPoints, type MonthKey, type MonthlyPoint } from "@/lib/inflation/periods";

/** Where the policy-rate history came from, in terms a reader can act on. */
export interface PolicySourceInfo {
  /**
   * "ledger": read from the PEIC canonical observation ledger (SBP EasyData series, ingested).
   * "fallback": the loader could not read the ledger and returned its static snapshot (not suitable for this analysis).
   * "unavailable": nothing usable.
   */
  status: "ledger" | "fallback" | "unavailable";
  seriesKey: string | null;
  seriesName: string | null;
  /** Date of the newest observation, "YYYY-MM-DD". */
  latestObservation: string | null;
  /** When PEIC stored that newest observation (ISO timestamp, the ledger vintage). */
  lastStoredAt: string | null;
  observations: number;
}

export interface RawPolicyRateInputs {
  /** SBP policy-rate observations, one per date the rate took a value. */
  policy: { date: string; value: number }[] | null;
  /** Monthly YoY headline and core (urban NFNE) CPI inflation, % */
  headline: { date: string; value: number }[] | null;
  core: { date: string; value: number }[] | null;
  /** 3-month T-bill and 3-year PIB auction yields, on auction dates, %. Market rates, not policy rates. */
  tbill: { date: string; value: number }[] | null;
  pib: { date: string; value: number }[] | null;
  /** US effective federal funds rate, monthly, %. */
  fedFunds: { date: string; value: number }[] | null;
  /** The value shown by the existing canonical headline KPI, for the cross-check. */
  kpiValue: number | null;
  /** The generation date, "YYYY-MM-DD" (UTC). Used only for the time-weighted average. */
  asOf: string;
  source: PolicySourceInfo | null;
}

export interface DataCheck {
  id: string;
  text: string;
  status: "ok" | "warn" | "info";
}

export interface PolicyRateViewModel {
  decisions: PolicyDecision[];
  repeats: PolicyDecision[];
  changes: RateChange[];
  cycles: Cycle[];
  stats: RateStats | null;
  /** Latest month of data the monthly alignments run to: the newer of the last rate observation and the latest headline inflation. */
  horizon: MonthKey | null;
  /** The rate in effect at each month-end, first observation to `horizon`. */
  policyMonthly: MonthlyPoint[];
  headline: MonthlyPoint[];
  core: MonthlyPoint[];
  realHeadline: RealRatePoint[];
  realCore: RealRatePoint[];
  changeRows: ChangeRow[];
  cycleOutcomes: CycleOutcome[];
  /** Last auction of each month. */
  tbill: MonthlyPoint[];
  pib: MonthlyPoint[];
  /** The newest auction exactly as observed, with its date. */
  tbillLatest: { date: string; value: number } | null;
  pibLatest: { date: string; value: number } | null;
  /** Market yield minus the policy rate in effect, percentage points, months present in both. */
  tbillSpread: MonthlyPoint[];
  pibSpread: MonthlyPoint[];
  fedFunds: MonthlyPoint[];
  /** Pakistan policy rate minus US federal funds rate, percentage points. */
  usDifferential: MonthlyPoint[];
  source: PolicySourceInfo | null;
  checks: DataCheck[];

  // ── G.9: additions for the charts (all derived here, on the server) ──
  /** The generation date the time-based figures run to, "YYYY-MM-DD". */
  asOf: string;
  /** Every auction exactly as observed (ascending, one per date). Plotted on their own dates, never resampled to months. */
  tbillAuctions: { date: string; value: number }[];
  pibAuctions: { date: string; value: number }[];
  /** Auction yield minus the policy rate in effect ON the auction date, percentage points. */
  tbillSpreadAt: AuctionSpread[];
  pibSpreadAt: AuctionSpread[];
  /** 3-year PIB yield minus the latest 3-month T-bill yield (at most 21 days older), at each PIB auction. Two maturities only. */
  termSpreadAt: TermSpreadPoint[];
  /** Each stretch at one rate, and how long it lasted. */
  levels: RateLevel[];
  /** Running totals of increases, cuts and the net. */
  cumulative: CumulativePoint[];
  /** The time from the first observation to as-of cut into tightening, easing and holding spans. */
  regimes: RegimeSegment[];
  turningPoints: TurningPoint[];
  /** Extremes and sign counts of the real policy rate (against headline and against core). */
  realSummary: { headline: SeriesSummary | null; core: SeriesSummary | null };
  /** The gap between Pakistan's and the US policy rate: latest, widest, narrowest, months above zero. */
  usGapSummary: SeriesSummary | null;
}

/** The oldest 3-month T-bill auction (in days) a 3-year PIB auction may be paired with in the term spread: bills are auctioned roughly fortnightly. */
export const TERM_SPREAD_MAX_LAG_DAYS = 21;

function safeMonthly(raw: { date: string; value: number }[] | null): MonthlyPoint[] {
  if (!raw) return [];
  try {
    const pts = toMonthlyPoints(raw);
    return [...new Map(pts.map((p) => [p.month, p])).values()].sort((a, b) => a.month.localeCompare(b.month));
  } catch {
    return [];
  }
}

function latestPoint(raw: { date: string; value: number }[] | null): { date: string; value: number } | null {
  const ok = (raw ?? []).filter((p) => /^\d{4}-\d{2}-\d{2}$/.test(p.date) && Number.isFinite(p.value));
  if (ok.length === 0) return null;
  return ok.reduce((a, b) => (b.date >= a.date ? b : a));
}

export function buildPolicyRateViewModel(raw: RawPolicyRateInputs): PolicyRateViewModel {
  const cleaned = cleanDecisions(raw.policy ?? []);
  const decisions = cleaned.decisions;
  const changes = rateChanges(decisions);
  const cycles = findCycles(changes);
  const stats = rateStats(decisions, raw.asOf);

  const headline = safeMonthly(raw.headline);
  const core = safeMonthly(raw.core);
  const lastDecisionMonth = decisions.length ? monthKeyOf(decisions[decisions.length - 1].date) : null;
  const latestHeadline = headline.length ? headline[headline.length - 1].month : null;
  const horizon = lastDecisionMonth === null ? null : latestHeadline !== null && latestHeadline > lastDecisionMonth ? latestHeadline : lastDecisionMonth;

  const policy = decisions.length && horizon ? policyMonthly(decisions, monthRange(monthKeyOf(decisions[0].date), horizon), horizon) : [];
  const realHeadline = horizon ? realPolicyRateSeries(decisions, headline, horizon) : [];
  const realCore = horizon ? realPolicyRateSeries(decisions, core, horizon) : [];

  const tbill = lastObservationPerMonth(raw.tbill ?? []);
  const pib = lastObservationPerMonth(raw.pib ?? []);
  const fedFunds = safeMonthly(raw.fedFunds);
  // The same cleaning as the policy history (ISO dates, finite values, one row per date, ascending), for observations kept on their own dates.
  const tbillAuctions = cleanDecisions(raw.tbill ?? []).decisions;
  const pibAuctions = cleanDecisions(raw.pib ?? []).decisions;
  const usDifferential = differenceSeries(policy, fedFunds);
  const first = decisions[0] ?? null;
  const last = decisions[decisions.length - 1] ?? null;

  const checks: DataCheck[] = [];
  if (decisions.length === 0) {
    checks.push({ id: "policy-unavailable", status: "warn", text: "No policy-rate observations could be loaded, so nothing on this page that depends on them is shown." });
  } else {
    const first = decisions[0];
    const last = decisions[decisions.length - 1];
    checks.push({
      id: "series-integrity",
      status: cleaned.rejected === 0 && cleaned.sameDateDuplicates === 0 ? "ok" : "warn",
      text: `${decisions.length} observations, ${formatDate(first.date)} to ${formatDate(last.date)}, one per date in ascending order${cleaned.rejected || cleaned.sameDateDuplicates ? ` (${cleaned.rejected} rejected as malformed, ${cleaned.sameDateDuplicates} duplicate date${cleaned.sameDateDuplicates === 1 ? "" : "s"} resolved by keeping the later row)` : ""}.`,
    });
    if (cleaned.repeats.length > 0) {
      checks.push({
        id: "repeated-rows",
        status: "info",
        text: `${cleaned.repeats.length} row${cleaned.repeats.length === 1 ? " repeats" : "s repeat"} the previous rate (${cleaned.repeats.map((r) => formatDate(r.date)).join(", ")}). SBP's series records the same rate on more than one date there; ${cleaned.repeats.length === 1 ? "it is" : "they are"} not counted as a change.`,
      });
    }
    // A check that can actually fail: the newest observation must not be dated after the day this page was generated.
    // (The sum of the rate changes equalling last − first is NOT checked: they are computed as consecutive differences, so it is true by construction.)
    const future = last.date > raw.asOf;
    checks.push({
      id: "not-future",
      status: future ? "warn" : "ok",
      text: future
        ? `The newest observation (${formatDate(last.date)}) is dated after the day this page was generated (${formatDate(raw.asOf)}), which should not happen.`
        : `The newest observation (${formatDate(last.date)}) is not later than the day this page was generated (${formatDate(raw.asOf)}).`,
    });
    const outOfRange = decisions.filter((d) => d.value <= 0 || d.value > 40);
    checks.push({
      id: "plausible-range",
      status: outOfRange.length === 0 ? "ok" : "warn",
      text: outOfRange.length === 0 ? "Every rate is between 0% and 40%." : `${outOfRange.length} observation${outOfRange.length === 1 ? " is" : "s are"} outside 0%–40% (${outOfRange.map((d) => `${formatDate(d.date)}: ${d.value}`).join(", ")}).`,
    });
    if (raw.kpiValue !== null) {
      checks.push({
        id: "kpi-matches",
        status: Math.abs(raw.kpiValue - last.value) < 1e-9 ? "ok" : "warn",
        text: Math.abs(raw.kpiValue - last.value) < 1e-9 ? `The headline figure (${pct(raw.kpiValue)}) equals the newest observation (${formatDate(last.date)}).` : `The headline figure (${pct(raw.kpiValue)}) differs from the newest observation in the history (${pct(last.value)}, ${formatDate(last.date)}).`,
      });
    }
    if (realHeadline.length > 0) {
      checks.push({
        id: "real-rate-coverage",
        status: "info",
        text: `The real policy rate can be computed for ${realHeadline.length} months against headline inflation and ${realCore.length} against core; months without an inflation reading are left blank, not filled.`,
      });
    }
  }

  return {
    decisions,
    repeats: cleaned.repeats,
    changes,
    cycles,
    stats,
    horizon,
    policyMonthly: policy,
    headline,
    core,
    realHeadline,
    realCore,
    changeRows: changeRows(changes, headline),
    cycleOutcomes: cycleOutcomes(cycles, headline),
    tbill,
    pib,
    tbillLatest: latestPoint(raw.tbill),
    pibLatest: latestPoint(raw.pib),
    tbillSpread: differenceSeries(tbill, policy),
    pibSpread: differenceSeries(pib, policy),
    fedFunds,
    usDifferential,
    source: raw.source,
    checks,
    asOf: raw.asOf,
    tbillAuctions,
    pibAuctions,
    tbillSpreadAt: spreadAtAuctions(tbillAuctions, decisions),
    pibSpreadAt: spreadAtAuctions(pibAuctions, decisions),
    termSpreadAt: termSpread(pibAuctions, tbillAuctions, TERM_SPREAD_MAX_LAG_DAYS),
    levels: rateLevels(decisions, raw.asOf),
    cumulative: first ? cumulativeChanges(changes, first.date) : [],
    regimes: first && last ? regimeSegments(cycles, first.date, first.value, raw.asOf, last.date) : [],
    turningPoints: turningPoints(cycles),
    realSummary: {
      headline: summarizeSeries(realHeadline.map((p) => ({ month: p.month, value: p.real }))),
      core: summarizeSeries(realCore.map((p) => ({ month: p.month, value: p.real }))),
    },
    usGapSummary: summarizeSeries(usDifferential),
  };
}
