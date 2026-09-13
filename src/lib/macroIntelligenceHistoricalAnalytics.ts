// Macro Intelligence Historical Regime Analytics (Phase 13) — pure,
// deterministic analysis of the snapshots the system actually recorded.
//
// Dependency direction, unchanged and enforced by macroIntelligenceIsolation
// .test.ts:
//
//   engine -> snapshot persistence -> history -> decision layer -> THIS FILE
//
// This module never reaches back into src/lib/intelligence/ to recompute what
// a signal "would have been" on some past date. A snapshot is an observation
// of what the engine actually recorded at that time; where a dimension is
// absent from a snapshot it stays absent, and where it was unclassifiable it
// stays unclassifiable. Nothing is backfilled, interpolated, or reconstructed
// from current values.
//
// It also introduces NO new classification rules. Per-snapshot posture and
// breadth are produced by calling the decision layer's own exported
// assessState / determinePosture / computeBreadth, so a historical snapshot
// is judged by exactly the same documented rules as today's — including the
// five-rated / two-unrated polarity split (Monetary Policy and Liquidity &
// Credit carry no evidenced polarity and never contribute to a posture, past
// or present). No weights, no score, no ranking of dimensions.
//
// One rule governs the whole file: a DATA GAP IS NOT AN ECONOMIC EVENT.
// "insufficient-data" is the engine's universal sentinel for "could not
// classify", so a move into or out of it is reported as a change in COVERAGE,
// never as an improvement, a deterioration, or a turning point.

import type { IntelligenceDimension } from "@/lib/intelligence/types";
import type { MacroIntelligenceSnapshot } from "@/lib/data/macroIntelligenceSnapshots";
import {
  assessState,
  computeBreadth,
  determinePosture,
  isPolarityRated,
  classifyHistoryDepth,
  INSUFFICIENT_DATA_STATE,
  type Breadth,
  type DecisionCounts,
  type DimensionAssessment,
  type HistoryDepth,
  type MacroPosture,
} from "@/lib/macroIntelligenceDecision";

// ── Vocabulary ────────────────────────────────────────────────────────────

/**
 * Every kind is derived from the assessments on BOTH sides of an observed
 * state change — never from a category invented for presentation. The two
 * coverage kinds exist specifically so a dimension becoming (or ceasing to
 * be) classifiable is never mistaken for an economic move.
 */
export type TransitionKind =
  | "improvement"
  | "deterioration"
  | "stabilisation"
  | "coverage-lost"
  | "coverage-gained"
  | "unrated-change";

/** How the newest snapshot's state for a dimension relates to what came before it. */
export type CurrentStateStanding =
  | "new"                 // the run is one snapshot long and a different state preceded it
  | "continuing"          // the run is longer than one snapshot
  | "recently-reversed"   // the run began with a polarity reversal
  | "only-observation"    // exactly one snapshot contains this dimension
  | "unobserved";         // the dimension is absent from the available history

export const DIMENSION_ORDER: readonly IntelligenceDimension[] = [
  "Inflation",
  "MonetaryPolicy",
  "ExternalSector",
  "LiquidityCredit",
  "FiscalConditions",
  "Growth",
  "MarketStress",
];

function dimensionRank(dimension: IntelligenceDimension): number {
  const i = DIMENSION_ORDER.indexOf(dimension);
  return i === -1 ? DIMENSION_ORDER.length : i;
}

/** Only these two assessments carry a polarity that can reverse. */
function isPolarised(assessment: DimensionAssessment): assessment is "improving" | "deteriorating" {
  return assessment === "improving" || assessment === "deteriorating";
}

// ── A. Timeline ───────────────────────────────────────────────────────────

export interface TimelinePoint {
  snapshotDate: string;
  computedAt: string;
  posture: MacroPosture;
  deteriorationBreadth: Breadth;
  improvementBreadth: Breadth;
  counts: DecisionCounts;
  /** Per-dimension state exactly as persisted — not re-derived. */
  states: Partial<Record<IntelligenceDimension, string>>;
  /** Per-dimension assessment under the decision layer's own rules. */
  assessments: Partial<Record<IntelligenceDimension, DimensionAssessment>>;
  /** Coverage at this snapshot: how many of its dimensions the engine could actually classify. */
  coverage: { classified: number; recorded: number };
}

function countsFor(assessments: Partial<Record<IntelligenceDimension, DimensionAssessment>>): DecisionCounts {
  const counts: DecisionCounts = { improving: 0, deteriorating: 0, steady: 0, notRated: 0, insufficientData: 0, ratedWithData: 0 };
  for (const assessment of Object.values(assessments)) {
    if (assessment === "improving") counts.improving++;
    else if (assessment === "deteriorating") counts.deteriorating++;
    else if (assessment === "steady") counts.steady++;
    else if (assessment === "not-rated") counts.notRated++;
    else counts.insufficientData++;
  }
  counts.ratedWithData = counts.improving + counts.deteriorating + counts.steady;
  return counts;
}

/**
 * One timeline point per snapshot, oldest-first (the convention every read
 * model in this repository uses). Posture and breadth come from the decision
 * layer's exported rules, so a past snapshot is never judged by a different
 * standard than the current one.
 */
export function buildTimeline(snapshotsOldestFirst: readonly MacroIntelligenceSnapshot[]): TimelinePoint[] {
  return snapshotsOldestFirst.map((snapshot) => {
    const states: Partial<Record<IntelligenceDimension, string>> = {};
    const assessments: Partial<Record<IntelligenceDimension, DimensionAssessment>> = {};
    let classified = 0;
    let recorded = 0;

    for (const key of Object.keys(snapshot.dimensions) as IntelligenceDimension[]) {
      const entry = snapshot.dimensions[key];
      if (!entry) continue;
      recorded++;
      states[key] = entry.state;
      assessments[key] = assessState(key, entry.state);
      if (entry.state !== INSUFFICIENT_DATA_STATE) classified++;
    }

    const counts = countsFor(assessments);
    return {
      snapshotDate: snapshot.snapshotDate,
      computedAt: snapshot.computedAt,
      posture: determinePosture(counts),
      deteriorationBreadth: computeBreadth(counts.deteriorating, counts.ratedWithData),
      improvementBreadth: computeBreadth(counts.improving, counts.ratedWithData),
      counts,
      states,
      assessments,
      coverage: { classified, recorded },
    };
  });
}

// ── B. Transitions ────────────────────────────────────────────────────────

export interface HistoricalTransition {
  /** The snapshot at which the NEW state first appears. */
  snapshotDate: string;
  computedAt: string;
  dimension: IntelligenceDimension;
  fromState: string;
  toState: string;
  fromAssessment: DimensionAssessment;
  toAssessment: DimensionAssessment;
  kind: TransitionKind;
  /** True when either side is the engine's unclassifiable sentinel — a coverage change, not an economic one. */
  involvesDataGap: boolean;
  /** How many consecutive snapshots the new state held, counted from this transition forward within the window. */
  persistedSnapshots: number;
  /** True when that run is still unbroken at the newest snapshot, so it may continue beyond what is stored. */
  ongoing: boolean;
  /** A polarity reversal between two classified states — improving <-> deteriorating. Never true when a data gap is involved. */
  isTurningPoint: boolean;
}

function classifyTransition(from: DimensionAssessment, to: DimensionAssessment, dimension: IntelligenceDimension): TransitionKind {
  if (to === "insufficient-data") return "coverage-lost";
  if (from === "insufficient-data") return "coverage-gained";
  if (!isPolarityRated(dimension)) return "unrated-change";
  if (to === "improving") return "improvement";
  if (to === "deteriorating") return "deterioration";
  return "stabilisation";
}

/**
 * Every observed state change between consecutive snapshots, for every
 * dimension. A dimension missing from either snapshot produces no transition
 * — absence is not a state, and pretending otherwise would manufacture an
 * event out of a gap in the record.
 */
export function buildTransitions(timeline: readonly TimelinePoint[]): HistoricalTransition[] {
  const transitions: HistoricalTransition[] = [];

  for (let i = 1; i < timeline.length; i++) {
    const previous = timeline[i - 1];
    const current = timeline[i];

    for (const dimension of DIMENSION_ORDER) {
      const fromState = previous.states[dimension];
      const toState = current.states[dimension];
      if (fromState === undefined || toState === undefined) continue;
      if (fromState === toState) continue;

      const fromAssessment = previous.assessments[dimension]!;
      const toAssessment = current.assessments[dimension]!;
      const involvesDataGap = fromState === INSUFFICIENT_DATA_STATE || toState === INSUFFICIENT_DATA_STATE;

      // How long the new state held, from this snapshot forward.
      let persistedSnapshots = 1;
      let j = i + 1;
      for (; j < timeline.length; j++) {
        if (timeline[j].states[dimension] !== toState) break;
        persistedSnapshots++;
      }

      transitions.push({
        snapshotDate: current.snapshotDate,
        computedAt: current.computedAt,
        dimension,
        fromState,
        toState,
        fromAssessment,
        toAssessment,
        kind: classifyTransition(fromAssessment, toAssessment, dimension),
        involvesDataGap,
        persistedSnapshots,
        ongoing: j >= timeline.length,
        // A turning point requires BOTH sides classified and of opposite
        // polarity. Losing or regaining coverage is never a turning point.
        isTurningPoint: !involvesDataGap && isPolarised(fromAssessment) && isPolarised(toAssessment) && fromAssessment !== toAssessment,
      });
    }
  }

  // Newest first, then the engine's dimension order — deterministic, never
  // sorted by any magnitude or score.
  return transitions.sort((a, b) => (a.computedAt < b.computedAt ? 1 : a.computedAt > b.computedAt ? -1 : dimensionRank(a.dimension) - dimensionRank(b.dimension)));
}

// ── C/E/F. Per-dimension persistence, standing and extremes ───────────────

export interface ObservedRun {
  state: string;
  assessment: DimensionAssessment;
  length: number;
  startDate: string;
  endDate: string;
  /** The run begins at the oldest available snapshot, so its true length may be greater. Render as "N+". */
  truncatedStart: boolean;
  /** The run is unbroken at the newest available snapshot, so it may still be continuing. */
  ongoing: boolean;
}

export interface DimensionHistoryProfile {
  dimension: IntelligenceDimension;
  polarityRated: boolean;
  /** Present only when the dimension appears in at least one snapshot. */
  currentState: string | null;
  currentAssessment: DimensionAssessment | null;
  currentRunLength: number;
  /** The current run reaches the oldest snapshot — render "N+", never a bare N. */
  currentRunTruncated: boolean;
  standing: CurrentStateStanding;
  /** Longest run observed for the dimension's CURRENT state, within the available window. */
  longestRunForCurrentState: ObservedRun | null;
  /** Longest run observed for any state of this dimension, within the available window. */
  longestObservedRun: ObservedRun | null;
  /** Every state this dimension was seen in, with first/most-recent occurrence. */
  observedStates: { state: string; assessment: DimensionAssessment; firstSeen: string; lastSeen: string; occurrences: number }[];
  transitionCount: number;
  /** How many snapshots actually recorded this dimension. */
  observedInSnapshots: number;
}

function runsFor(timeline: readonly TimelinePoint[], dimension: IntelligenceDimension): ObservedRun[] {
  const runs: ObservedRun[] = [];
  let start = -1;

  for (let i = 0; i < timeline.length; i++) {
    const state = timeline[i].states[dimension];
    if (state === undefined) {
      start = -1;
      continue;
    }
    const previousState = start === -1 ? undefined : timeline[start].states[dimension];
    if (start === -1 || previousState !== state) {
      start = i;
    }
    const next = i + 1 < timeline.length ? timeline[i + 1].states[dimension] : undefined;
    if (next !== state) {
      runs.push({
        state,
        assessment: timeline[i].assessments[dimension]!,
        length: i - start + 1,
        startDate: timeline[start].snapshotDate,
        endDate: timeline[i].snapshotDate,
        truncatedStart: start === 0,
        ongoing: i === timeline.length - 1,
      });
      start = -1;
    }
  }

  return runs;
}

function longest(runs: readonly ObservedRun[]): ObservedRun | null {
  let best: ObservedRun | null = null;
  for (const run of runs) {
    if (!best || run.length > best.length) best = run;
  }
  return best;
}

export function buildDimensionProfiles(timeline: readonly TimelinePoint[], transitions: readonly HistoricalTransition[]): DimensionHistoryProfile[] {
  const newest = timeline.length > 0 ? timeline[timeline.length - 1] : null;

  return DIMENSION_ORDER.map((dimension) => {
    const runs = runsFor(timeline, dimension);
    const observedInSnapshots = timeline.filter((p) => p.states[dimension] !== undefined).length;
    const dimensionTransitions = transitions.filter((t) => t.dimension === dimension);
    const currentState = newest?.states[dimension] ?? null;
    const currentAssessment = newest?.assessments[dimension] ?? null;

    const currentRun = runs.length > 0 && runs[runs.length - 1].ongoing ? runs[runs.length - 1] : null;
    const currentRunLength = currentRun?.length ?? 0;

    // The most recent transition INTO the current state, if any.
    const latestTransition = dimensionTransitions.length > 0 ? dimensionTransitions[0] : null;

    let standing: CurrentStateStanding;
    if (currentState === null) standing = "unobserved";
    else if (observedInSnapshots === 1) standing = "only-observation";
    else if (latestTransition && latestTransition.toState === currentState && latestTransition.isTurningPoint) standing = "recently-reversed";
    else if (currentRunLength === 1 && dimensionTransitions.length > 0) standing = "new";
    else standing = "continuing";

    const observedStatesMap = new Map<string, { state: string; assessment: DimensionAssessment; firstSeen: string; lastSeen: string; occurrences: number }>();
    for (const point of timeline) {
      const state = point.states[dimension];
      if (state === undefined) continue;
      const existing = observedStatesMap.get(state);
      if (existing) {
        existing.lastSeen = point.snapshotDate;
        existing.occurrences++;
      } else {
        observedStatesMap.set(state, { state, assessment: point.assessments[dimension]!, firstSeen: point.snapshotDate, lastSeen: point.snapshotDate, occurrences: 1 });
      }
    }

    return {
      dimension,
      polarityRated: isPolarityRated(dimension),
      currentState,
      currentAssessment,
      currentRunLength,
      currentRunTruncated: currentRun?.truncatedStart ?? false,
      standing,
      longestRunForCurrentState: currentState === null ? null : longest(runs.filter((r) => r.state === currentState)),
      longestObservedRun: longest(runs),
      observedStates: [...observedStatesMap.values()].sort((a, b) => (a.firstSeen < b.firstSeen ? -1 : a.firstSeen > b.firstSeen ? 1 : a.state.localeCompare(b.state))),
      transitionCount: dimensionTransitions.length,
      observedInSnapshots,
    };
  });
}

// ── Configuration comparison ──────────────────────────────────────────────

export interface ConfigurationMatch {
  snapshotDate: string;
  /** Rated dimensions whose state equals the current snapshot's. */
  matchingDimensions: IntelligenceDimension[];
  /** Rated dimensions compared — those present with a state in BOTH snapshots. */
  comparedDimensions: IntelligenceDimension[];
  exact: boolean;
}

export interface ConfigurationComparison {
  /** The newest snapshot's state for each RATED dimension — the pattern being searched for. */
  currentPattern: { dimension: IntelligenceDimension; state: string }[];
  /** Total snapshots available to search (includes the newest). */
  searched: number;
  /** Exact matches among ALL available snapshots, including the newest itself. */
  exactMatches: number;
  /** Exact matches EXCLUDING the newest — i.e. has this configuration genuinely occurred before? */
  priorExactMatches: number;
  /** Prior snapshots matching some, but not all, compared rated dimensions. */
  partialMatches: ConfigurationMatch[];
  /** True when there are too few snapshots, or too few rated dimensions, to make the comparison meaningful. */
  comparable: boolean;
  reason: string | null;
}

/**
 * Compares the newest snapshot's RATED-dimension pattern against every other
 * available snapshot. Matching is on exact persisted state strings only —
 * never on numeric closeness, and never on the unrated dimensions, whose
 * states carry no evidenced polarity to compare. Reports what was found;
 * infers nothing whatsoever about what follows from a match.
 */
export function compareCurrentConfiguration(timeline: readonly TimelinePoint[]): ConfigurationComparison {
  const empty: ConfigurationComparison = {
    currentPattern: [],
    searched: timeline.length,
    exactMatches: 0,
    priorExactMatches: 0,
    partialMatches: [],
    comparable: false,
    reason: null,
  };

  if (timeline.length === 0) return { ...empty, reason: "No snapshots are available." };

  const newest = timeline[timeline.length - 1];
  const currentPattern = DIMENSION_ORDER.filter((d) => isPolarityRated(d) && newest.states[d] !== undefined).map((d) => ({ dimension: d, state: newest.states[d]! }));

  if (currentPattern.length === 0) {
    return { ...empty, reason: "The most recent snapshot records no rated dimension, so there is no configuration to compare." };
  }
  if (timeline.length === 1) {
    return { ...empty, currentPattern, exactMatches: 1, reason: "Only one snapshot is available, so it can only match itself." };
  }

  let exactMatches = 0;
  let priorExactMatches = 0;
  const partialMatches: ConfigurationMatch[] = [];

  for (let i = 0; i < timeline.length; i++) {
    const point = timeline[i];
    const compared: IntelligenceDimension[] = [];
    const matching: IntelligenceDimension[] = [];

    for (const { dimension, state } of currentPattern) {
      const other = point.states[dimension];
      if (other === undefined) continue;
      compared.push(dimension);
      if (other === state) matching.push(dimension);
    }

    const exact = compared.length === currentPattern.length && matching.length === compared.length;
    const isNewest = i === timeline.length - 1;

    if (exact) {
      exactMatches++;
      if (!isNewest) priorExactMatches++;
      continue;
    }
    if (!isNewest && matching.length > 0) {
      partialMatches.push({ snapshotDate: point.snapshotDate, matchingDimensions: matching, comparedDimensions: compared, exact: false });
    }
  }

  return {
    currentPattern,
    searched: timeline.length,
    exactMatches,
    priorExactMatches,
    partialMatches,
    comparable: true,
    reason: null,
  };
}

// ── Top-level assembly ────────────────────────────────────────────────────

/** What the available history can and cannot support. Separate from HistoryDepth, which only counts snapshots. */
export interface AnalyticsSufficiency {
  snapshotCount: number;
  historyWindow: number;
  depth: HistoryDepth;
  /** Intervals between snapshots — transitions can only exist where there is at least one. */
  intervals: number;
  canDetectTransitions: boolean;
  canAssessPersistence: boolean;
  /** The read returned as many snapshots as it asked for, so older history may exist beyond the window. */
  windowPossiblyTruncated: boolean;
  note: string;
}

export function assessSufficiency(snapshotCount: number, historyWindow: number): AnalyticsSufficiency {
  const intervals = Math.max(0, snapshotCount - 1);
  const depth = classifyHistoryDepth(snapshotCount);
  const windowPossiblyTruncated = snapshotCount >= historyWindow && historyWindow > 0;

  let note: string;
  if (snapshotCount === 0) note = "Historical analytics will appear once daily snapshots accumulate.";
  else if (snapshotCount === 1) note = "One snapshot is stored — insufficient history to identify any transition.";
  else if (snapshotCount === 2) note = "One interval is available; persistence and turning-point analysis remain limited.";
  else note = `Based on the ${snapshotCount} snapshots currently available${windowPossiblyTruncated ? `, which is the full ${historyWindow} requested — older history may exist beyond this window` : ""}.`;

  return {
    snapshotCount,
    historyWindow,
    depth,
    intervals,
    canDetectTransitions: intervals >= 1,
    canAssessPersistence: snapshotCount >= 2,
    windowPossiblyTruncated,
    note,
  };
}

export interface HistoricalAnalyticsReport {
  timeline: TimelinePoint[];
  transitions: HistoricalTransition[];
  turningPoints: HistoricalTransition[];
  /** Transitions that are purely coverage changes — surfaced separately so a data gap is never read as an economic event. */
  coverageChanges: HistoricalTransition[];
  profiles: DimensionHistoryProfile[];
  configuration: ConfigurationComparison;
  sufficiency: AnalyticsSufficiency;
}

/**
 * Total function over the one bounded snapshot read the page already
 * performs. Zero, one, sparse, partial and flat histories are all normal
 * inputs that produce an honest report rather than an exception or an
 * invented event.
 */
export function buildHistoricalAnalytics(input: {
  /** Exactly what readRecentMacroIntelligenceSnapshots() returns. */
  snapshotsNewestFirst: readonly MacroIntelligenceSnapshot[];
  historyWindow: number;
}): HistoricalAnalyticsReport {
  const snapshotsOldestFirst = [...input.snapshotsNewestFirst].reverse();
  const timeline = buildTimeline(snapshotsOldestFirst);
  const transitions = buildTransitions(timeline);

  return {
    timeline,
    transitions,
    turningPoints: transitions.filter((t) => t.isTurningPoint),
    coverageChanges: transitions.filter((t) => t.involvesDataGap),
    profiles: buildDimensionProfiles(timeline, transitions),
    configuration: compareCurrentConfiguration(timeline),
    sufficiency: assessSufficiency(input.snapshotsNewestFirst.length, input.historyWindow),
  };
}
