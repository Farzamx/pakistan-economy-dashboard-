// Macro Intelligence — presentation view-models (Phase C).
//
// Pure functions over outputs the protected engine and the existing
// analytics layer ALREADY produce. No I/O, no React, and nothing here
// computes, re-derives or reinterprets a classification, a confidence score,
// a threshold or a turning point: every such value is read straight off
// IntelligenceSignal / TimelinePoint / HistoricalTransition and passed
// through. src/lib/intelligence/ is untouched.
//
// THE RULE THAT SHAPES THIS FILE
// A dimension's `state` is CATEGORICAL ("tightening", "deteriorating",
// "insufficient-data"). There is no methodologically valid ordering of those
// labels, so this module never maps a state onto a number and never plots
// one on a value axis — that would invent a score the engine does not
// define. What IS numeric, and therefore chartable, is:
//   * coverage      — how many dimensions the engine could classify (a count)
//   * confidence    — the engine's own 0-100 confidenceScore
//   * persistence   — how many consecutive snapshots a state has held (a count)
// Those three are plotted; states themselves are shown as discrete cells,
// which is the approach MacroHistoricalAnalytics already established and
// this file deliberately keeps.

import type { IntelligenceDimension, IntelligenceSignal } from "@/lib/intelligence/types";
import type { HistoricalTransition, TimelinePoint } from "@/lib/macroIntelligenceHistoricalAnalytics";
import { INSUFFICIENT_DATA_STATE } from "@/lib/macroIntelligenceDecision";

/**
 * The engine's sentinel for "evidence was inadequate" — never an economic
 * finding. Re-exported from the decision layer rather than redeclared, so
 * there is exactly one definition of this string in the codebase.
 */
export const INSUFFICIENT_STATE = INSUFFICIENT_DATA_STATE;

export function isRated(state: string | undefined): boolean {
  return state !== undefined && state !== INSUFFICIENT_STATE;
}

/** "pressure-easing" -> "pressure easing". Display only; the stored state is unchanged. */
export function readableState(state: string): string {
  return state.replace(/-/g, " ");
}

// ── Insufficient-data summaries ───────────────────────────────────────────
//
// THE PROBLEM THIS SOLVES
// Several engine rules build their summary by interpolating `state` into a
// sentence, e.g. signalDefinitions.ts:116
//   `Headline CPI inflation is ${state} versus the prior reading.`
// `state` comes from directionWord(), which returns the literal string
// "insufficient-data" when the observed direction is "Unknown". The result
// is prose like "Headline CPI inflation is insufficient-data versus the
// prior reading." — the sentinel leaking into a sentence, which reads as
// though the engine made a finding when it did not.
//
// This is NOT a methodology defect: the engine's state, direction,
// confidence and evidence are all correct and are left exactly as they
// are. It is a presentation defect, so it is corrected in presentation.
// signalDefinitions.ts is protected and unmodified.
//
// WHAT THE REPLACEMENT MUST PRESERVE
// "Insufficient evidence" and "bad economic news" are different claims, and
// the replacement must never blur them. The sentence below states only that
// the direction could not be determined from available data. It asserts
// nothing about the level, the direction, or whether conditions are good or
// bad — because the engine asserted nothing either.

/**
 * True when a summary string contains the raw sentinel, i.e. the engine
 * interpolated "insufficient-data" into prose rather than producing its own
 * insufficient-data sentence (signalDefinitions.ts's insufficientSignal()
 * writes a proper one: "Not enough fresh evidence to classify …").
 */
export function summaryLeaksSentinel(summary: string): boolean {
  return summary.includes(INSUFFICIENT_STATE);
}

/**
 * A neutral, honest summary for a dimension the engine could not classify.
 *
 * Used ONLY when the engine's own summary would restate the sentinel. When
 * the engine produced a proper sentence — whether a classification or its
 * own "Not enough fresh evidence to classify …" — that sentence is passed
 * through untouched.
 */
export function displaySummary(signal: Pick<IntelligenceSignal, "state" | "summary" | "label">): string {
  if (!summaryLeaksSentinel(signal.summary)) return signal.summary;
  return `There is insufficient recent data to determine the current direction of ${signal.label.toLowerCase()}. This reflects a gap in the available evidence, not a judgement about economic conditions.`;
}

// ── History run compression (presentation only) ───────────────────────────
//
// A dimension's stored history is one point per snapshot, so a state that
// held for thirty snapshots renders as thirty repetitions of the same word.
// Compressing CONSECUTIVE identical states into "state (N snapshots)" is a
// readability change and nothing more: no point is dropped, reordered or
// merged across a gap, and the underlying points stay attached to each run
// so individual snapshots and their dates remain inspectable.
//
// TWO THINGS THIS DELIBERATELY DOES NOT DO
//  1. It never merges NON-consecutive occurrences. A → B → A stays three
//     runs, because collapsing the two A's would erase a real transition.
//  2. The count is a number of STORED SNAPSHOTS, never days and never
//     economic events. A missed scheduled run would otherwise silently
//     become a claimed duration. Callers render the unit explicitly.

export interface HistoryRun {
  state: string;
  /** Display form of `state`; the stored value is unchanged. */
  stateLabel: string;
  /** Consecutive snapshots in this run. Always >= 1. */
  count: number;
  /** The run's own points, oldest-first — kept so each snapshot stays inspectable. */
  points: readonly { computedAt: string; state: string }[];
  /** The run begins at the oldest fetched snapshot, so it may have started earlier — render "N+". */
  truncatedStart: boolean;
  /** The run is unbroken at the newest fetched snapshot. */
  ongoing: boolean;
  /** False when the engine could not classify the dimension during this run. */
  rated: boolean;
}

/**
 * Compresses consecutive identical states into runs, oldest-first.
 *
 * Total over its input: an empty history yields an empty array, and a
 * single point yields one run of length 1.
 */
export function compressHistoryRuns(
  pointsOldestFirst: readonly { computedAt: string; state: string }[],
): HistoryRun[] {
  const runs: HistoryRun[] = [];

  for (const point of pointsOldestFirst) {
    const last = runs[runs.length - 1];
    // Only an ADJACENT identical state extends a run; anything else starts
    // a new one, so non-consecutive repeats are never merged.
    if (last && last.state === point.state) {
      last.count += 1;
      (last.points as { computedAt: string; state: string }[]).push(point);
      continue;
    }
    runs.push({
      state: point.state,
      stateLabel: readableState(point.state),
      count: 1,
      points: [point],
      truncatedStart: runs.length === 0,
      ongoing: false,
      rated: isRated(point.state),
    });
  }

  if (runs.length > 0) runs[runs.length - 1].ongoing = true;
  // A single run spanning the whole window has an unknown start only if
  // more than one point exists; one lone point is exactly what it says.
  if (runs.length === 1 && pointsOldestFirst.length === 1) runs[0].truncatedStart = false;

  return runs;
}

// ── Coverage over time (genuinely numeric) ────────────────────────────────

export interface CoveragePoint {
  snapshotDate: string;
  /** Dimensions the engine could classify at this snapshot. */
  classified: number;
  /** Dimensions recorded at this snapshot (the denominator). */
  recorded: number;
  /** recorded - classified: dimensions present but unclassifiable. */
  unclassified: number;
}

/**
 * Coverage per snapshot, oldest -> newest.
 *
 * This counts dimensions, so it is a real quantity and a bar chart of it
 * carries no implied ordering of categorical states. It answers "how much of
 * the picture could the engine actually see on this day", which is the
 * question that separates a data problem from an economic one.
 */
export function buildCoverageSeries(timelineOldestFirst: readonly TimelinePoint[]): CoveragePoint[] {
  // buildTimeline() already emits oldest-first (the convention every read
  // model here uses), so the order is passed through, not re-sorted.
  return timelineOldestFirst.map((p) => ({
    snapshotDate: p.snapshotDate,
    classified: p.coverage.classified,
    recorded: p.coverage.recorded,
    unclassified: Math.max(0, p.coverage.recorded - p.coverage.classified),
  }));
}

// ── Confidence by dimension (the engine's own 0-100) ──────────────────────

export interface ConfidencePoint {
  dimension: IntelligenceDimension;
  label: string;
  /** The engine's own confidenceScore. Null when it reported none (Insufficient). */
  score: number | null;
  state: string;
  rated: boolean;
}

/**
 * Each dimension's confidence exactly as the engine reported it.
 *
 * A null score is kept null and rendered as "not scored" — never replaced
 * with 0, which would read as "no confidence" when the engine's meaning is
 * "confidence was not computed because evidence was inadequate".
 */
export function buildConfidenceSeries(signals: readonly IntelligenceSignal[]): ConfidencePoint[] {
  return signals.map((s) => ({
    dimension: s.dimension,
    label: s.label,
    score: s.confidenceScore,
    state: s.state,
    rated: isRated(s.state),
  }));
}

// ── Transition separation (economic vs coverage) ──────────────────────────

export interface SeparatedTransitions {
  /** Polarity reversals between two CLASSIFIED states — the engine's own isTurningPoint. */
  turningPoints: HistoricalTransition[];
  /** Other movements between two classified states. */
  economic: HistoricalTransition[];
  /** Transitions where either side was unclassifiable — a data-coverage event, not an economic one. */
  coverage: HistoricalTransition[];
}

/**
 * Splits the analytics layer's transitions into the three groups a reader
 * must not conflate. The classification comes from the engine's own
 * `involvesDataGap` and `isTurningPoint` flags; nothing is re-judged here.
 */
export function separateTransitions(transitions: readonly HistoricalTransition[]): SeparatedTransitions {
  const turningPoints: HistoricalTransition[] = [];
  const economic: HistoricalTransition[] = [];
  const coverage: HistoricalTransition[] = [];
  for (const t of transitions) {
    if (t.involvesDataGap) coverage.push(t);
    else if (t.isTurningPoint) turningPoints.push(t);
    else economic.push(t);
  }
  return { turningPoints, economic, coverage };
}

// ── Dimension cards ───────────────────────────────────────────────────────

export interface DimensionCardView {
  id: string;
  dimension: IntelligenceDimension;
  label: string;
  state: string;
  stateLabel: string;
  rated: boolean;
  direction: IntelligenceSignal["direction"];
  confidence: IntelligenceSignal["confidence"];
  confidenceScore: number | null;
  /** The engine's own summary, verbatim. */
  summary: string;
  /** What to render: the engine's summary, unless it would restate the sentinel. See displaySummary(). */
  displaySummary: string;
  /** Evidence rows exactly as the engine supplied them. */
  evidence: IntelligenceSignal["evidence"];
  missingInputs: string[];
  /** Indicators the engine could use, out of those it looked at. */
  usableCount: number;
  totalInputs: number;
  /** Consecutive snapshots the current state has held, counted back from the newest. Null when the dimension is unobserved. */
  persistedSnapshots: number | null;
  /** The run reaches the oldest stored snapshot, so it may have begun earlier — render "N+". */
  runReachesOldest: boolean;
}

/**
 * One card per dimension, combining the current signal with how long its
 * state has held according to the stored snapshots.
 *
 * Persistence is counted from the timeline (consecutive snapshots ending at
 * the newest one whose state equals the current state). It is a count of
 * stored observations, NOT a claim about when the economy changed — the
 * snapshot date is when PEIC captured the information.
 */
export function buildDimensionCards(
  signals: readonly IntelligenceSignal[],
  timelineOldestFirst: readonly TimelinePoint[],
): DimensionCardView[] {
  return signals.map((s) => {
    let persisted: number | null = null;
    if (timelineOldestFirst.length > 0) {
      // Walk backward from the newest stored snapshot. A dimension absent
      // from a snapshot breaks the run: absence is not a state, and counting
      // through it would claim a continuity the record does not contain.
      let run = 0;
      for (let i = timelineOldestFirst.length - 1; i >= 0; i--) {
        if (timelineOldestFirst[i].states[s.dimension] === s.state) run += 1;
        else break;
      }
      persisted = run > 0 ? run : null;
    }
    return {
      id: s.id,
      dimension: s.dimension,
      label: s.label,
      state: s.state,
      stateLabel: readableState(s.state),
      rated: isRated(s.state),
      direction: s.direction,
      confidence: s.confidence,
      confidenceScore: s.confidenceScore,
      summary: s.summary,
      displaySummary: displaySummary(s),
      evidence: s.evidence,
      missingInputs: s.missingInputs,
      usableCount: s.evidence.length - s.missingInputs.length,
      totalInputs: s.evidence.length,
      persistedSnapshots: persisted,
      // The run reaches the oldest stored snapshot, so its true start is
      // unknown and it must be rendered "N+", never a bare N.
      runReachesOldest: persisted !== null && persisted === timelineOldestFirst.length,
    };
  });
}

// ── Snapshot explorer ─────────────────────────────────────────────────────

export interface SnapshotOption {
  snapshotDate: string;
  computedAt: string;
  posture: string;
  classified: number;
  recorded: number;
  states: Partial<Record<IntelligenceDimension, string>>;
}

/** The stored snapshots as selectable options, newest first (the timeline arrives oldest-first). */
export function buildSnapshotOptions(timelineOldestFirst: readonly TimelinePoint[]): SnapshotOption[] {
  return [...timelineOldestFirst].reverse().map((p) => ({
    snapshotDate: p.snapshotDate,
    computedAt: p.computedAt,
    posture: p.posture,
    classified: p.coverage.classified,
    recorded: p.coverage.recorded,
    states: p.states,
  }));
}

/**
 * Observation-date caveat, shown wherever a snapshot date is presented.
 * A snapshot date is when PEIC computed and stored a classification — not
 * when an economic change occurred, and not when the underlying statistic
 * was published.
 */
export const SNAPSHOT_DATE_CAVEAT =
  "Snapshot dates are when PEIC computed and stored a classification, not when an economic change occurred. A state can appear to change on the day new data arrived rather than the day the economy moved.";

// ── Linking evidence back to its own indicator page and dataset ───────────
//
// Keyed on seriesId, not on the evidence `label`. The engine's labels are
// written for the signal narrative ("CPI Inflation (YoY)", "M2 Money
// Supply") and do not match the keys of the existing KPI_SEO_SLUG map
// ("CPI Inflation", "Money Supply (M2)"), so a label lookup would miss
// silently. The seriesId is the stable identifier.
//
// Only the series the engine actually cites appear here. Every value is
// asserted against SEO_PAGES and the dataset catalogue by
// macroIntelligenceViews.test.ts, so a renamed route or a dropped dataset
// fails a test instead of shipping a dead link.

/** seriesId -> indicator page slug (no leading slash). */
const SERIES_SEO_SLUG: Record<string, string> = {
  "sbp:cpiInflation": "inflation-rate-pakistan",
  "sbp:coreInflation": "pakistan-core-inflation",
  "sbp:policyRate": "pakistan-interest-rate",
  "sbp:usdPkr": "usd-pkr-exchange-rate",
  "sbp:currentAccount": "current-account-deficit-pakistan",
  "sbp:tradeBalance": "pakistan-trade-deficit",
  "sbp:exports": "pakistan-exports",
  "sbp:imports": "pakistan-imports",
  "sbp:remittances": "pakistan-remittances",
  "sbp:moneySupplyM2": "pakistan-money-supply",
  "sbp:privateCreditGrowth": "pakistan-private-credit-growth",
  "sbp:fiscalBalance": "pakistan-fiscal-deficit",
  "sbp-forex-arch:netLiquidReserves": "foreign-exchange-reserves-pakistan",
  "worldbank:gdpGrowthPak": "gdp-growth-pakistan",
  "fred:fedFunds": "fed-funds-rate",
  "yahoo:goldMonthly": "gold-price-pakistan",
};

/** The indicator page for a cited series, or null when none covers it. */
export function indicatorHrefForSeries(seriesId: string): string | null {
  const slug = SERIES_SEO_SLUG[seriesId];
  return slug ? `/${slug}` : null;
}

/**
 * seriesId -> downloadable dataset id.
 *
 * Written out rather than derived by transforming the seriesId: the
 * "sbp-" + kebab-case rule happens to match datasetRegistry's own id
 * construction today, but reproducing that rule here would couple two
 * modules through a string transform and would silently produce ids for
 * series that have no dataset at all (gold and net-liquid reserves are
 * latest-quote or architecture series, deliberately excluded from the
 * catalogue). A test asserts every id below exists in DATASETS.
 */
const SERIES_DATASET_ID: Record<string, string> = {
  "sbp:cpiInflation": "sbp-cpi-inflation",
  "sbp:coreInflation": "sbp-core-inflation",
  "sbp:policyRate": "sbp-policy-rate",
  "sbp:usdPkr": "sbp-usd-pkr",
  "sbp:currentAccount": "sbp-current-account",
  "sbp:tradeBalance": "sbp-trade-balance",
  "sbp:exports": "sbp-exports",
  "sbp:imports": "sbp-imports",
  "sbp:remittances": "sbp-remittances",
  "sbp:moneySupplyM2": "sbp-money-supply-m2",
  "sbp:privateCreditGrowth": "sbp-private-credit-growth",
  "sbp:fiscalBalance": "sbp-fiscal-balance",
  "worldbank:gdpGrowthPak": "worldbank-gdp-growth-pak",
};

/** The download route for a cited series, when the catalogue carries it. */
export function datasetIdForSeries(seriesId: string): string | null {
  return SERIES_DATASET_ID[seriesId] ?? null;
}

/** Every seriesId this module can link, for test assertions. */
export const LINKABLE_SERIES_IDS = Object.keys(SERIES_SEO_SLUG);
export const DATASET_LINKED_SERIES_IDS = Object.keys(SERIES_DATASET_ID);
