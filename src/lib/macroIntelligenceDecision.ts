// Macro Intelligence Decision Layer (Phase 12) — pure, deterministic
// interpretation built ON TOP of the existing engine's output and the
// existing persisted snapshot history. No I/O, no Date.now(), no AI, no
// score. Same purity discipline as macroIntelligenceHistory.ts, and
// deliberately NOT inside src/lib/intelligence/ — the dependency runs one
// way only:
//
//   intelligence engine -> snapshot persistence -> history -> DECISION LAYER
//
// This file reads IntelligenceSignal and DimensionHistory; nothing in
// src/lib/intelligence/ imports it, and no methodology, signal rule,
// evidence rule, or confidence calculation is modified, re-derived, or
// second-guessed here.
//
// ─────────────────────────────────────────────────────────────────────────
// WHY A POLARITY MAP, AND WHY ONLY FIVE OF SEVEN DIMENSIONS
// ─────────────────────────────────────────────────────────────────────────
// Answering "what is improving / deteriorating" requires knowing which
// direction is the adverse one for each dimension. The engine deliberately
// does NOT answer that in general — signalDefinitions.ts excluded USD/PKR
// from the External Sector vote precisely because a weaker or stronger PKR
// is "a genuinely two-sided textbook question", and MacroIntelligenceSection
// .tsx refuses to colour-code `direction` for the same reason. This file
// does not overturn that. It only assigns polarity where the polarity is
// already evidenced IN THIS REPOSITORY, and explicitly declines elsewhere:
//
//   Rated, because the engine's OWN state labels already carry the polarity
//   (signalDefinitions.ts chose these words deliberately, on documented
//   accounting-sign evidence):
//     • ExternalSector    improving / deteriorating / mixed
//     • FiscalConditions  improving / deteriorating / flat
//     • MarketStress      pressure-easing / pressure-building / mixed
//   Rated, because higher GDP growth being the stronger outcome is the same
//   textbook fact the engine already encodes as its Rising direction:
//     • Growth            accelerating / decelerating / flat
//   Rated, because economicHealth.ts — an existing, certified, deterministic
//   model in this codebase — already scores CPI inflation monotonically
//   worse as it rises (<=5 -> 90, <=7 -> 75, <=10 -> 55, <=15 -> 35,
//   <=20 -> 15, else 5). Reusing that established in-repo convention is not
//   inventing a threshold: this file needs only the monotonic polarity
//   ("more inflation is the adverse direction"), never a numeric cut-off,
//   and never claims any particular level is high or low:
//     • Inflation         falling / rising / flat
//
//   NOT rated, deliberately — no unambiguous polarity exists for the raw
//   state these dimensions persist, and inventing one is exactly what the
//   engine refused to do:
//     • MonetaryPolicy    tightening / easing / held
//         A rate rise is neither good nor bad without a reference the engine
//         explicitly declined to invent. economicHealth.ts scores the REAL
//         policy rate (rate minus CPI), not the raw move — and the real-rate
//         proxy is not persisted in a snapshot, so it cannot be recovered
//         here.
//     • LiquidityCredit   expanding / contracting / mixed
//         Credit expansion can be healthy or overheating. economicHealth.ts
//         scores EXCESS money growth (M2 minus GDP minus CPI), not raw
//         expansion, and that excess figure is likewise not persisted.
//
// These two still appear in full in the dimension breakdown, with state,
// change and persistence — they are simply never counted as improving or
// deteriorating, and never drive posture, breadth, or attention.

import type { IntelligenceDimension, IntelligenceSignal, SignalConfidence } from "@/lib/intelligence/types";
import type { DimensionHistory } from "@/lib/macroIntelligenceHistory";

// ── Vocabulary ────────────────────────────────────────────────────────────

/** One dimension's evidenced directional assessment. "not-rated" is a deliberate refusal, not a failure. */
export type DimensionAssessment = "improving" | "deteriorating" | "steady" | "not-rated" | "insufficient-data";

export type MacroPosture = "Improving" | "Stable" | "Deteriorating" | "Mixed" | "Insufficient Data";

/** How widespread one movement type is across the dimensions that actually have usable data. */
export type Breadth = "none" | "isolated" | "moderate" | "broad-based" | "insufficient-coverage";

/** Overall richness of the persisted history behind this analysis. */
export type HistoryDepth = "none" | "single" | "minimal" | "sufficient";

export type AttentionKind =
  | "broad-deterioration"
  | "persistent-deterioration"
  | "newly-deteriorating"
  | "broad-improvement"
  | "persistent-improvement"
  | "newly-improving"
  | "limited-coverage"
  | "insufficient-history";

export type ChangeKind = "transition" | "deteriorating" | "improving" | "persistent" | "unchanged-stress";

// ── Transparent constants — every threshold in this file lives here ───────

/**
 * A posture is never asserted from a single dimension: one rated dimension
 * moving is a dimension-level fact, not an economy-wide posture.
 */
export const MIN_RATED_DIMENSIONS_FOR_POSTURE = 2;

/**
 * Breadth is not asserted below this much coverage. With only one or two
 * rated dimensions reporting, "2 of 2 deteriorating" is not evidence that
 * deterioration is broad — it is evidence that coverage is thin.
 */
export const MIN_RATED_DIMENSIONS_FOR_BREADTH = 3;

/** Half or more of the rated-with-data dimensions moving the same way. */
export const BROAD_BASED_FRACTION = 0.5;
/** At least a third moving the same way. */
export const MODERATE_FRACTION = 1 / 3;

/**
 * How many consecutive persisted snapshots make a condition "persistent".
 * Three is the smallest run that is not simply "the current reading plus
 * one confirmation" — deliberately expressed in SNAPSHOTS, never in days,
 * because the snapshot cadence is a property of the cron schedule and a
 * missed run must never silently become a claimed calendar duration.
 */
export const PERSISTENCE_MIN_SNAPSHOTS = 3;

// ── Polarity map (see the header for the evidence behind every entry) ─────

type RatedOutcome = "improving" | "deteriorating" | "steady";

const POLARITY_BY_DIMENSION: Partial<Record<IntelligenceDimension, Readonly<Record<string, RatedOutcome>>>> = {
  Inflation: { falling: "improving", rising: "deteriorating", flat: "steady" },
  ExternalSector: { improving: "improving", deteriorating: "deteriorating", mixed: "steady" },
  FiscalConditions: { improving: "improving", deteriorating: "deteriorating", flat: "steady" },
  Growth: { accelerating: "improving", decelerating: "deteriorating", flat: "steady" },
  MarketStress: { "pressure-easing": "improving", "pressure-building": "deteriorating", mixed: "steady" },
  // MonetaryPolicy and LiquidityCredit are intentionally absent.
};

/** Whether this dimension carries an evidenced polarity at all. Exported for tests and for the UI's "not rated" explanation. */
export function isPolarityRated(dimension: IntelligenceDimension): boolean {
  return dimension in POLARITY_BY_DIMENSION;
}

/** The engine's universal "could not classify" sentinel — insufficientSignal() sets exactly this on every dimension, rated or not. */
export const INSUFFICIENT_DATA_STATE = "insufficient-data";

/**
 * Maps one dimension's state string to its assessment.
 *
 * The insufficient-data sentinel is checked FIRST, before the polarity
 * lookup: a dimension with no usable evidence has no data, and that is true
 * whether or not this file rates its polarity. Testing polarity first would
 * report an unrated dimension's genuine data gap as merely "not rated",
 * hiding a real coverage problem behind a deliberate design choice — and
 * would miscount it in DecisionCounts.
 *
 * Any other unrecognised state — including one a future engine change might
 * add — also resolves to insufficient-data rather than being guessed into a
 * polarity.
 */
export function assessState(dimension: IntelligenceDimension, state: string): DimensionAssessment {
  if (state === INSUFFICIENT_DATA_STATE) return "insufficient-data";
  const map = POLARITY_BY_DIMENSION[dimension];
  if (!map) return "not-rated";
  return map[state] ?? "insufficient-data";
}

// ── Per-dimension decision ────────────────────────────────────────────────

export interface DimensionDecision {
  dimension: IntelligenceDimension;
  label: string;
  currentState: string;
  direction: IntelligenceSignal["direction"];
  confidence: SignalConfidence;
  assessment: DimensionAssessment;
  /** The state this dimension held before its current one — null when no earlier differing state exists in the fetched window. Never invented. */
  previousState: string | null;
  /** True only when previousState exists and genuinely differs from currentState — i.e. a transition is visible somewhere in the fetched window. */
  changed: boolean;
  /**
   * True only when that transition happened at the MOST RECENT observation:
   * either the live state differs from the newest snapshot, or the current
   * run is exactly one snapshot long. A dimension that has held the same
   * state for several snapshots has `changed` true (its earlier transition
   * is still visible) but `changedRecently` false — reporting it under
   * "What Changed?" would present old news as new.
   */
  changedRecently: boolean;
  /**
   * How many consecutive persisted snapshots share the current state. Null
   * when the live state differs from the newest snapshot (the current state
   * has not been persisted yet, so it has no persisted run), or when there
   * is no history at all.
   */
  consecutiveSnapshots: number | null;
  /** True when the run reaches the oldest fetched snapshot, so the real run may be longer than consecutiveSnapshots shows. Mirrors DimensionHistory.truncated. */
  runTruncated: boolean;
  /** True when the live signal's state differs from the newest persisted snapshot — a change that today's snapshot has not recorded yet. */
  changeNotYetPersisted: boolean;
  /** True when consecutiveSnapshots >= PERSISTENCE_MIN_SNAPSHOTS (or the run is truncated at that length). */
  persistent: boolean;
}

function buildDimensionDecision(signal: IntelligenceSignal, history: DimensionHistory | null): DimensionDecision {
  const currentState = signal.state;
  const assessment = assessState(signal.dimension, currentState);

  let previousState: string | null = null;
  let consecutiveSnapshots: number | null = null;
  let runTruncated = false;
  let changeNotYetPersisted = false;

  if (history) {
    if (history.currentState === currentState) {
      // The live state matches the newest snapshot: the persisted run
      // describes the state we are actually showing, so its length and its
      // preceding state are both usable as-is.
      previousState = history.previousState;
      consecutiveSnapshots = history.consecutiveCount;
      runTruncated = history.truncated;
    } else {
      // The engine currently reports a different state than the newest
      // snapshot recorded. The prior state is therefore exactly that newest
      // snapshot's state — a real, observed value, not an inferred one — and
      // the current state has no persisted run yet, so persistence stays null
      // rather than borrowing the previous run's length.
      previousState = history.currentState;
      changeNotYetPersisted = true;
    }
  }

  const changed = previousState !== null && previousState !== currentState;
  const changedRecently = changed && (changeNotYetPersisted || consecutiveSnapshots === 1);
  const persistent = consecutiveSnapshots !== null && consecutiveSnapshots >= PERSISTENCE_MIN_SNAPSHOTS;

  return {
    dimension: signal.dimension,
    label: signal.label,
    currentState,
    direction: signal.direction,
    confidence: signal.confidence,
    assessment,
    previousState,
    changed,
    changedRecently,
    consecutiveSnapshots,
    runTruncated,
    changeNotYetPersisted,
    persistent,
  };
}

// ── Counts, posture, breadth ──────────────────────────────────────────────

export interface DecisionCounts {
  improving: number;
  deteriorating: number;
  steady: number;
  notRated: number;
  insufficientData: number;
  /** improving + deteriorating + steady — the dimensions a posture may legitimately be built from. */
  ratedWithData: number;
}

export function countAssessments(decisions: readonly DimensionDecision[]): DecisionCounts {
  const counts: DecisionCounts = { improving: 0, deteriorating: 0, steady: 0, notRated: 0, insufficientData: 0, ratedWithData: 0 };
  for (const d of decisions) {
    if (d.assessment === "improving") counts.improving++;
    else if (d.assessment === "deteriorating") counts.deteriorating++;
    else if (d.assessment === "steady") counts.steady++;
    else if (d.assessment === "not-rated") counts.notRated++;
    else counts.insufficientData++;
  }
  counts.ratedWithData = counts.improving + counts.deteriorating + counts.steady;
  return counts;
}

/**
 * Posture is a plain count comparison — no weights, no score, no ranking of
 * one dimension above another. It answers only "is anything moving, and do
 * the moving dimensions agree":
 *
 *   deteriorating only            -> Deteriorating
 *   improving only                -> Improving
 *   both present                  -> Mixed   (genuinely divergent; this file
 *                                             does not break the tie with a
 *                                             majority rule, because that
 *                                             would silently rank dimensions)
 *   neither (all steady)          -> Stable
 *   fewer than 2 rated dimensions -> Insufficient Data
 *
 * How WIDESPREAD a movement is is deliberately a separate question, answered
 * by breadth below — posture never smuggles magnitude in.
 */
export function determinePosture(counts: DecisionCounts): MacroPosture {
  if (counts.ratedWithData < MIN_RATED_DIMENSIONS_FOR_POSTURE) return "Insufficient Data";
  const { improving, deteriorating } = counts;
  if (deteriorating > 0 && improving > 0) return "Mixed";
  if (deteriorating > 0) return "Deteriorating";
  if (improving > 0) return "Improving";
  return "Stable";
}

export function computeBreadth(movingCount: number, ratedWithData: number): Breadth {
  if (movingCount === 0) return "none";
  if (ratedWithData < MIN_RATED_DIMENSIONS_FOR_BREADTH) return "insufficient-coverage";
  const fraction = movingCount / ratedWithData;
  if (fraction >= BROAD_BASED_FRACTION) return "broad-based";
  if (fraction >= MODERATE_FRACTION) return "moderate";
  return "isolated";
}

// ── History depth ─────────────────────────────────────────────────────────

export function classifyHistoryDepth(snapshotCount: number): HistoryDepth {
  if (snapshotCount <= 0) return "none";
  if (snapshotCount === 1) return "single";
  if (snapshotCount < PERSISTENCE_MIN_SNAPSHOTS) return "minimal";
  return "sufficient";
}

// ── Attention signals ─────────────────────────────────────────────────────

export interface AttentionSignal {
  kind: AttentionKind;
  /** Null for portfolio-wide flags (breadth, coverage, history depth). */
  dimension: IntelligenceDimension | null;
  text: string;
}

/**
 * Fixed severity order. Ordering is by this rank first, then by the
 * engine's own dimension order, so the same input always produces the same
 * sequence — no sorting on scores, no tie-break by chance.
 */
const ATTENTION_RANK: Record<AttentionKind, number> = {
  "broad-deterioration": 0,
  "persistent-deterioration": 1,
  "newly-deteriorating": 2,
  "broad-improvement": 3,
  "persistent-improvement": 4,
  "newly-improving": 5,
  "limited-coverage": 6,
  "insufficient-history": 7,
};

/** The engine's declared dimension order — used only as a deterministic tie-break, never as a priority ranking. */
const DIMENSION_ORDER: readonly IntelligenceDimension[] = [
  "Inflation",
  "MonetaryPolicy",
  "ExternalSector",
  "LiquidityCredit",
  "FiscalConditions",
  "Growth",
  "MarketStress",
];

function dimensionRank(dimension: IntelligenceDimension | null): number {
  if (dimension === null) return DIMENSION_ORDER.length;
  const index = DIMENSION_ORDER.indexOf(dimension);
  return index === -1 ? DIMENSION_ORDER.length : index;
}

function runLabel(d: DimensionDecision): string {
  const n = d.consecutiveSnapshots ?? 0;
  return `${d.runTruncated ? `${n}+` : n} consecutive snapshot${n === 1 ? "" : "s"}`;
}

export function buildAttentionSignals(
  decisions: readonly DimensionDecision[],
  counts: DecisionCounts,
  deteriorationBreadth: Breadth,
  improvementBreadth: Breadth,
  historyDepth: HistoryDepth,
): AttentionSignal[] {
  const signals: AttentionSignal[] = [];

  if (deteriorationBreadth === "broad-based") {
    signals.push({
      kind: "broad-deterioration",
      dimension: null,
      text: `Deterioration is broad-based — ${counts.deteriorating} of ${counts.ratedWithData} rated dimensions.`,
    });
  }
  if (improvementBreadth === "broad-based") {
    signals.push({
      kind: "broad-improvement",
      dimension: null,
      text: `Improvement is broad-based — ${counts.improving} of ${counts.ratedWithData} rated dimensions.`,
    });
  }

  for (const d of decisions) {
    if (d.assessment === "deteriorating") {
      if (d.persistent) {
        signals.push({ kind: "persistent-deterioration", dimension: d.dimension, text: `${d.label} has been ${d.currentState.replace(/-/g, " ")} for ${runLabel(d)}.` });
      }
      if (d.changedRecently) {
        signals.push({ kind: "newly-deteriorating", dimension: d.dimension, text: `${d.label} changed from ${d.previousState!.replace(/-/g, " ")} to ${d.currentState.replace(/-/g, " ")}.` });
      }
    } else if (d.assessment === "improving") {
      if (d.persistent) {
        signals.push({ kind: "persistent-improvement", dimension: d.dimension, text: `${d.label} has been ${d.currentState.replace(/-/g, " ")} for ${runLabel(d)}.` });
      }
      if (d.changedRecently) {
        signals.push({ kind: "newly-improving", dimension: d.dimension, text: `${d.label} changed from ${d.previousState!.replace(/-/g, " ")} to ${d.currentState.replace(/-/g, " ")}.` });
      }
    }
  }

  if (counts.ratedWithData > 0 && counts.ratedWithData < MIN_RATED_DIMENSIONS_FOR_BREADTH) {
    signals.push({
      kind: "limited-coverage",
      dimension: null,
      text: `Only ${counts.ratedWithData} rated dimension${counts.ratedWithData === 1 ? "" : "s"} currently ${counts.ratedWithData === 1 ? "has" : "have"} usable data — breadth is not assessed.`,
    });
  }
  if (historyDepth === "none" || historyDepth === "single" || historyDepth === "minimal") {
    signals.push({
      kind: "insufficient-history",
      dimension: null,
      text:
        historyDepth === "none"
          ? "No snapshots stored yet — change and persistence analysis is unavailable."
          : historyDepth === "single"
            ? "One snapshot stored — change analysis requires at least two."
            : `Fewer than ${PERSISTENCE_MIN_SNAPSHOTS} snapshots stored — persistence analysis remains limited.`,
    });
  }

  return signals.sort((a, b) => ATTENTION_RANK[a.kind] - ATTENTION_RANK[b.kind] || dimensionRank(a.dimension) - dimensionRank(b.dimension));
}

// ── "What changed?" ───────────────────────────────────────────────────────

export interface ChangeStatement {
  kind: ChangeKind;
  dimension: IntelligenceDimension;
  text: string;
}

const CHANGE_RANK: Record<ChangeKind, number> = {
  transition: 0,
  deteriorating: 1,
  improving: 2,
  persistent: 3,
  "unchanged-stress": 4,
};

/**
 * Deterministic, template-driven — no LLM, no prose generation. Every
 * statement is traceable to exactly one dimension's current state, its
 * observed previous state, and its persisted run length. A dimension with
 * no history contributes nothing here rather than a fabricated "unchanged".
 */
export function buildWhatChanged(decisions: readonly DimensionDecision[]): ChangeStatement[] {
  const statements: ChangeStatement[] = [];

  for (const d of decisions) {
    const current = d.currentState.replace(/-/g, " ");

    if (d.changedRecently) {
      const previous = d.previousState!.replace(/-/g, " ");
      const suffix = d.changeNotYetPersisted ? " (not yet recorded in a stored snapshot)" : "";
      statements.push({ kind: "transition", dimension: d.dimension, text: `${d.label}: ${previous} → ${current}${suffix}.` });
      continue;
    }

    if (d.assessment === "deteriorating") {
      statements.push({
        kind: "deteriorating",
        dimension: d.dimension,
        text: d.persistent ? `${d.label} remains ${current} — ${runLabel(d)}.` : `${d.label} is ${current}.`,
      });
      continue;
    }

    if (d.assessment === "improving") {
      statements.push({
        kind: "improving",
        dimension: d.dimension,
        text: d.persistent ? `${d.label} remains ${current} — ${runLabel(d)}.` : `${d.label} is ${current}.`,
      });
      continue;
    }

    // Unchanged but persistent, in a dimension with no polarity rating, a
    // steady one, or one the engine could not classify — reported last, and
    // only when there is a real run behind it. A persistent data GAP is
    // named as a data gap, never phrased as a lasting economic condition.
    if (d.persistent) {
      const text =
        d.assessment === "insufficient-data"
          ? `${d.label} has lacked sufficient evidence to classify for ${runLabel(d)}.`
          : `${d.label} unchanged at ${current} — ${runLabel(d)}.`;
      statements.push({ kind: "persistent", dimension: d.dimension, text });
    }
  }

  return statements.sort((a, b) => CHANGE_RANK[a.kind] - CHANGE_RANK[b.kind] || dimensionRank(a.dimension) - dimensionRank(b.dimension));
}

// ── OBSERVED / INTERPRETED / UNKNOWN ──────────────────────────────────────

export interface KnowledgeSplit {
  /** Facts read directly out of the engine's output and the stored snapshots. */
  observed: string[];
  /** What this file derived from those facts, by the documented rules above. */
  interpreted: string[];
  /** What the available data cannot support — stated, never quietly omitted. */
  unknown: string[];
}

function buildKnowledgeSplit(
  decisions: readonly DimensionDecision[],
  counts: DecisionCounts,
  posture: MacroPosture,
  deteriorationBreadth: Breadth,
  historyDepth: HistoryDepth,
  snapshotCount: number,
  historyWindow: number,
): KnowledgeSplit {
  const observed: string[] = [];
  const interpreted: string[] = [];
  const unknown: string[] = [];

  observed.push(`${decisions.length} dimension${decisions.length === 1 ? "" : "s"} classified by the engine this run.`);
  observed.push(
    snapshotCount === 0
      ? "No stored snapshots were available for this analysis."
      : `${snapshotCount} stored snapshot${snapshotCount === 1 ? "" : "s"} read (most recent ${historyWindow} requested).`,
  );
  const changedDims = decisions.filter((d) => d.changedRecently);
  observed.push(
    changedDims.length === 0
      ? "No dimension changed state at the most recent observation."
      : `${changedDims.length} dimension${changedDims.length === 1 ? "" : "s"} changed state at the most recent observation: ${changedDims.map((d) => d.label).join(", ")}.`,
  );

  if (posture === "Insufficient Data") {
    interpreted.push(`Posture not assessed — fewer than ${MIN_RATED_DIMENSIONS_FOR_POSTURE} dimensions with an evidenced polarity currently have usable data.`);
  } else {
    interpreted.push(`Posture "${posture}" derived from ${counts.improving} improving, ${counts.deteriorating} deteriorating and ${counts.steady} steady among ${counts.ratedWithData} rated dimensions.`);
  }
  if (deteriorationBreadth === "insufficient-coverage") {
    interpreted.push(`Breadth not assessed — fewer than ${MIN_RATED_DIMENSIONS_FOR_BREADTH} rated dimensions have usable data.`);
  } else if (deteriorationBreadth !== "none") {
    interpreted.push(`Deterioration classified as ${deteriorationBreadth} across ${counts.deteriorating} of ${counts.ratedWithData} rated dimensions.`);
  }

  if (counts.notRated > 0) {
    const notRated = decisions.filter((d) => d.assessment === "not-rated").map((d) => d.label);
    unknown.push(`Whether ${notRated.join(" and ")} ${notRated.length === 1 ? "is" : "are"} favourable or adverse — these dimensions have no evidenced polarity and are reported without one.`);
  }
  if (counts.insufficientData > 0) {
    unknown.push(`${counts.insufficientData} dimension${counts.insufficientData === 1 ? "" : "s"} could not be classified from available evidence this run.`);
  }
  if (historyDepth !== "sufficient") {
    unknown.push(historyDepth === "none" ? "How any dimension has changed over time — no history is stored yet." : "How durable current conditions are — too few snapshots are stored to judge persistence.");
  }
  if (decisions.some((d) => d.runTruncated)) {
    // Counts the snapshots ACTUALLY read, not the window that was requested.
    // Using the window here overstated available history — with 10 stored
    // and 30 requested it read "the oldest of the 30 snapshots read", which
    // is precisely the "implies more history than it has" failure this
    // layer exists to avoid.
    unknown.push(`The true start of at least one run — it reaches the oldest of the ${snapshotCount} snapshot${snapshotCount === 1 ? "" : "s"} read, so it may have begun earlier.`);
  }
  unknown.push("Why any dimension moved, and what happens next — this layer describes observed states and changes only, and makes no forecast or recommendation.");

  return { observed, interpreted, unknown };
}

// ── Top-level assembly ────────────────────────────────────────────────────

export interface MacroDecisionReport {
  posture: MacroPosture;
  counts: DecisionCounts;
  dimensions: DimensionDecision[];
  deteriorationBreadth: Breadth;
  improvementBreadth: Breadth;
  attention: AttentionSignal[];
  whatChanged: ChangeStatement[];
  knowledge: KnowledgeSplit;
  historyDepth: HistoryDepth;
  snapshotCount: number;
  historyWindow: number;
}

export interface DecisionLayerInput {
  /** The live report's signals, exactly as the engine produced them. */
  signals: readonly IntelligenceSignal[];
  /** Per-dimension history from buildHistoryByDimension() — the existing store, never a second one. */
  historyByDimension: Partial<Record<IntelligenceDimension, DimensionHistory>>;
  /** How many snapshots were actually read. */
  snapshotCount: number;
  /** The limit that read was made with, so truncation can be stated honestly. */
  historyWindow: number;
}

/**
 * Builds the whole decision layer. Total function: zero signals, zero
 * snapshots, partial dimensions and conflicting directions are all normal
 * inputs that produce an honest report rather than an exception.
 */
export function buildMacroDecisionReport(input: DecisionLayerInput): MacroDecisionReport {
  const dimensions = input.signals.map((signal) => buildDimensionDecision(signal, input.historyByDimension[signal.dimension] ?? null));
  const counts = countAssessments(dimensions);
  const posture = determinePosture(counts);
  const deteriorationBreadth = computeBreadth(counts.deteriorating, counts.ratedWithData);
  const improvementBreadth = computeBreadth(counts.improving, counts.ratedWithData);
  const historyDepth = classifyHistoryDepth(input.snapshotCount);

  return {
    posture,
    counts,
    dimensions,
    deteriorationBreadth,
    improvementBreadth,
    attention: buildAttentionSignals(dimensions, counts, deteriorationBreadth, improvementBreadth, historyDepth),
    whatChanged: buildWhatChanged(dimensions),
    knowledge: buildKnowledgeSplit(dimensions, counts, posture, deteriorationBreadth, historyDepth, input.snapshotCount, input.historyWindow),
    historyDepth,
    snapshotCount: input.snapshotCount,
    historyWindow: input.historyWindow,
  };
}
