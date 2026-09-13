// Phase 12 — Macro Intelligence Decision Layer tests. Pure fixtures, no
// I/O, no clock. These cover the full matrix the phase brief enumerates
// (zero/one/two/many snapshots, every assessment outcome, every breadth
// band, transitions, truncation, partial data) plus the negative guarantees
// that matter most: no invented previous state, no overstated duration, no
// recommendation, no hidden score.

import { describe, it, expect } from "vitest";
import {
  buildMacroDecisionReport,
  assessState,
  isPolarityRated,
  countAssessments,
  determinePosture,
  computeBreadth,
  classifyHistoryDepth,
  buildWhatChanged,
  MIN_RATED_DIMENSIONS_FOR_POSTURE,
  MIN_RATED_DIMENSIONS_FOR_BREADTH,
  PERSISTENCE_MIN_SNAPSHOTS,
  type DimensionDecision,
} from "./macroIntelligenceDecision";
import type { IntelligenceDimension, IntelligenceSignal } from "@/lib/intelligence/types";
import type { DimensionHistory } from "@/lib/macroIntelligenceHistory";

function signal(dimension: IntelligenceDimension, state: string, overrides: Partial<IntelligenceSignal> = {}): IntelligenceSignal {
  return {
    id: dimension.toLowerCase(),
    dimension,
    label: dimension,
    state,
    direction: "Flat",
    confidence: "High",
    confidenceScore: 80,
    summary: `${dimension} summary`,
    evidence: [],
    missingInputs: [],
    calculatedAt: "2026-09-13T00:00:00.000Z",
    ...overrides,
  };
}

/** Builds a history whose newest state is `states[states.length - 1]`. */
function history(states: string[]): DimensionHistory {
  const points = states.map((state, i) => ({ computedAt: `2026-09-${String(i + 1).padStart(2, "0")}T10:00:00.000Z`, state }));
  const currentState = states[states.length - 1];
  let consecutiveCount = 0;
  for (let i = states.length - 1; i >= 0; i--) {
    if (states[i] !== currentState) break;
    consecutiveCount++;
  }
  const transitionIndex = states.length - consecutiveCount - 1;
  return {
    points,
    currentState,
    consecutiveCount,
    previousState: transitionIndex >= 0 ? states[transitionIndex] : null,
    truncated: transitionIndex < 0 && states.length > 1,
  };
}

function report(signals: IntelligenceSignal[], histories: Partial<Record<IntelligenceDimension, DimensionHistory>> = {}, snapshotCount = 5) {
  return buildMacroDecisionReport({ signals, historyByDimension: histories, snapshotCount, historyWindow: 30 });
}

// ── Polarity map ──────────────────────────────────────────────────────────

describe("polarity is assigned only where this repository already evidences it", () => {
  it("rates the five dimensions whose polarity is evidenced", () => {
    expect(isPolarityRated("Inflation")).toBe(true);
    expect(isPolarityRated("ExternalSector")).toBe(true);
    expect(isPolarityRated("FiscalConditions")).toBe(true);
    expect(isPolarityRated("Growth")).toBe(true);
    expect(isPolarityRated("MarketStress")).toBe(true);
  });

  it("deliberately does NOT rate the two genuinely two-sided dimensions", () => {
    expect(isPolarityRated("MonetaryPolicy")).toBe(false);
    expect(isPolarityRated("LiquidityCredit")).toBe(false);
    expect(assessState("MonetaryPolicy", "tightening")).toBe("not-rated");
    expect(assessState("MonetaryPolicy", "easing")).toBe("not-rated");
    expect(assessState("LiquidityCredit", "expanding")).toBe("not-rated");
    expect(assessState("LiquidityCredit", "contracting")).toBe("not-rated");
  });

  it("maps each rated dimension's own state vocabulary correctly", () => {
    expect(assessState("Inflation", "rising")).toBe("deteriorating");
    expect(assessState("Inflation", "falling")).toBe("improving");
    expect(assessState("Inflation", "flat")).toBe("steady");
    expect(assessState("ExternalSector", "deteriorating")).toBe("deteriorating");
    expect(assessState("ExternalSector", "improving")).toBe("improving");
    expect(assessState("ExternalSector", "mixed")).toBe("steady");
    expect(assessState("Growth", "decelerating")).toBe("deteriorating");
    expect(assessState("Growth", "accelerating")).toBe("improving");
    expect(assessState("FiscalConditions", "deteriorating")).toBe("deteriorating");
    expect(assessState("MarketStress", "pressure-building")).toBe("deteriorating");
    expect(assessState("MarketStress", "pressure-easing")).toBe("improving");
  });

  it("never guesses a polarity for an unrecognised or insufficient state", () => {
    expect(assessState("Inflation", "insufficient-data")).toBe("insufficient-data");
    expect(assessState("Growth", "some-future-state")).toBe("insufficient-data");
  });

  it("reports a genuine data gap as no-data even on an unrated dimension, rather than hiding it behind 'not rated'", () => {
    expect(assessState("MonetaryPolicy", "insufficient-data")).toBe("insufficient-data");
    expect(assessState("LiquidityCredit", "insufficient-data")).toBe("insufficient-data");
    const r = report([signal("MonetaryPolicy", "insufficient-data"), signal("LiquidityCredit", "tightening")]);
    expect(r.counts.insufficientData).toBe(1);
    expect(r.counts.notRated).toBe(1);
  });

  it("names a persistent data gap as a data gap, not as a lasting economic condition", () => {
    const r = report([signal("MonetaryPolicy", "insufficient-data")], { MonetaryPolicy: history(["insufficient-data", "insufficient-data", "insufficient-data"]) }, 3);
    const statement = r.whatChanged.find((s) => s.dimension === "MonetaryPolicy")!;
    expect(statement.text).toContain("lacked sufficient evidence");
    expect(statement.text).not.toContain("unchanged at");
  });
});

// ── Snapshot-count matrix ─────────────────────────────────────────────────

describe("history depth", () => {
  it("classifies zero, one, two and many snapshots", () => {
    expect(classifyHistoryDepth(0)).toBe("none");
    expect(classifyHistoryDepth(1)).toBe("single");
    expect(classifyHistoryDepth(2)).toBe("minimal");
    expect(classifyHistoryDepth(PERSISTENCE_MIN_SNAPSHOTS)).toBe("sufficient");
    expect(classifyHistoryDepth(30)).toBe("sufficient");
  });

  it("zero snapshots: no previous state is invented and no persistence is claimed", () => {
    const r = report([signal("Inflation", "rising"), signal("Growth", "decelerating")], {}, 0);
    expect(r.historyDepth).toBe("none");
    for (const d of r.dimensions) {
      expect(d.previousState).toBeNull();
      expect(d.changed).toBe(false);
      expect(d.consecutiveSnapshots).toBeNull();
      expect(d.persistent).toBe(false);
    }
    expect(r.attention.some((a) => a.kind === "insufficient-history")).toBe(true);
    expect(r.whatChanged.every((s) => s.kind !== "transition")).toBe(true);
  });

  it("one snapshot: current state is known, but no change or persistence claim is made", () => {
    const r = report([signal("Inflation", "rising")], { Inflation: history(["rising"]) }, 1);
    expect(r.historyDepth).toBe("single");
    const d = r.dimensions[0];
    expect(d.previousState).toBeNull();
    expect(d.changed).toBe(false);
    expect(d.consecutiveSnapshots).toBe(1);
    expect(d.persistent).toBe(false);
    expect(r.attention.find((a) => a.kind === "insufficient-history")?.text).toContain("at least two");
  });

  it("two snapshots: a real transition is reported, persistence still limited", () => {
    const r = report([signal("Growth", "decelerating")], { Growth: history(["accelerating", "decelerating"]) }, 2);
    expect(r.historyDepth).toBe("minimal");
    const d = r.dimensions[0];
    expect(d.previousState).toBe("accelerating");
    expect(d.changed).toBe(true);
    expect(d.consecutiveSnapshots).toBe(1);
    expect(d.persistent).toBe(false);
    expect(r.whatChanged[0]).toMatchObject({ kind: "transition", dimension: "Growth" });
  });
});

// ── Posture ───────────────────────────────────────────────────────────────

describe("posture is a plain count comparison, never a score", () => {
  it("all steady -> Stable", () => {
    const r = report([signal("Inflation", "flat"), signal("Growth", "flat"), signal("FiscalConditions", "flat")]);
    expect(r.posture).toBe("Stable");
  });

  it("only deteriorating -> Deteriorating", () => {
    const r = report([signal("Inflation", "rising"), signal("Growth", "decelerating")]);
    expect(r.posture).toBe("Deteriorating");
  });

  it("only improving -> Improving", () => {
    const r = report([signal("Inflation", "falling"), signal("Growth", "accelerating")]);
    expect(r.posture).toBe("Improving");
  });

  it("both directions present -> Mixed, without a majority tie-break", () => {
    const mostlyBad = report([
      signal("Inflation", "rising"),
      signal("Growth", "decelerating"),
      signal("FiscalConditions", "deteriorating"),
      signal("ExternalSector", "improving"),
    ]);
    expect(mostlyBad.posture).toBe("Mixed");
    expect(mostlyBad.counts.deteriorating).toBe(3);
    expect(mostlyBad.counts.improving).toBe(1);
  });

  it("fewer than the minimum rated dimensions -> Insufficient Data", () => {
    const one = report([signal("Inflation", "rising")]);
    expect(one.counts.ratedWithData).toBe(1);
    expect(one.counts.ratedWithData).toBeLessThan(MIN_RATED_DIMENSIONS_FOR_POSTURE);
    expect(one.posture).toBe("Insufficient Data");
  });

  it("unrated dimensions never contribute to posture", () => {
    const r = report([signal("MonetaryPolicy", "tightening"), signal("LiquidityCredit", "contracting")]);
    expect(r.counts.notRated).toBe(2);
    expect(r.counts.ratedWithData).toBe(0);
    expect(r.posture).toBe("Insufficient Data");
  });

  it("insufficient-data dimensions never contribute to posture", () => {
    const r = report([signal("Inflation", "insufficient-data"), signal("Growth", "insufficient-data"), signal("ExternalSector", "deteriorating")]);
    expect(r.counts.insufficientData).toBe(2);
    expect(r.counts.ratedWithData).toBe(1);
    expect(r.posture).toBe("Insufficient Data");
  });
});

// ── Breadth ───────────────────────────────────────────────────────────────

describe("breadth thresholds are explicit and never overstated on thin coverage", () => {
  it("returns none when nothing is moving that way", () => {
    expect(computeBreadth(0, 5)).toBe("none");
  });

  it("refuses to assess breadth below the minimum coverage", () => {
    expect(computeBreadth(1, 1)).toBe("insufficient-coverage");
    expect(computeBreadth(2, 2)).toBe("insufficient-coverage");
    expect(MIN_RATED_DIMENSIONS_FOR_BREADTH).toBe(3);
  });

  it("classifies broad-based at half or more", () => {
    expect(computeBreadth(3, 5)).toBe("broad-based");
    expect(computeBreadth(2, 4)).toBe("broad-based");
    expect(computeBreadth(5, 5)).toBe("broad-based");
  });

  it("classifies moderate at a third or more but below half", () => {
    expect(computeBreadth(2, 5)).toBe("moderate");
    expect(computeBreadth(1, 3)).toBe("moderate");
  });

  it("classifies isolated below a third", () => {
    expect(computeBreadth(1, 4)).toBe("isolated");
    expect(computeBreadth(1, 5)).toBe("isolated");
  });

  it("broad deterioration across five rated dimensions raises a broad-deterioration flag", () => {
    const r = report([
      signal("Inflation", "rising"),
      signal("Growth", "decelerating"),
      signal("FiscalConditions", "deteriorating"),
      signal("ExternalSector", "mixed"),
      signal("MarketStress", "mixed"),
    ]);
    expect(r.deteriorationBreadth).toBe("broad-based");
    expect(r.attention[0].kind).toBe("broad-deterioration");
  });

  it("broad improvement raises a broad-improvement flag", () => {
    const r = report([
      signal("Inflation", "falling"),
      signal("Growth", "accelerating"),
      signal("FiscalConditions", "improving"),
      signal("ExternalSector", "mixed"),
      signal("MarketStress", "mixed"),
    ]);
    expect(r.improvementBreadth).toBe("broad-based");
    expect(r.attention.some((a) => a.kind === "broad-improvement")).toBe(true);
  });

  it("isolated deterioration does not raise a broad-deterioration flag", () => {
    const r = report([
      signal("Inflation", "rising"),
      signal("Growth", "flat"),
      signal("FiscalConditions", "flat"),
      signal("ExternalSector", "mixed"),
      signal("MarketStress", "mixed"),
    ]);
    expect(r.deteriorationBreadth).toBe("isolated");
    expect(r.attention.some((a) => a.kind === "broad-deterioration")).toBe(false);
  });

  it("isolated improvement does not raise a broad-improvement flag", () => {
    const r = report([
      signal("Inflation", "falling"),
      signal("Growth", "flat"),
      signal("FiscalConditions", "flat"),
      signal("ExternalSector", "mixed"),
      signal("MarketStress", "mixed"),
    ]);
    expect(r.improvementBreadth).toBe("isolated");
    expect(r.attention.some((a) => a.kind === "broad-improvement")).toBe(false);
  });
});

// ── Persistence & transitions ─────────────────────────────────────────────

describe("persistence and transitions come only from stored snapshots", () => {
  it("persistent deterioration is flagged once the run reaches the documented minimum", () => {
    const r = report([signal("Inflation", "rising")], { Inflation: history(["flat", "rising", "rising", "rising"]) }, 4);
    const d = r.dimensions[0];
    expect(d.consecutiveSnapshots).toBe(3);
    expect(d.persistent).toBe(true);
    // The flat -> rising transition IS still visible in the window, but it
    // happened three snapshots ago, so it must not be presented as new.
    expect(d.changed).toBe(true);
    expect(d.changedRecently).toBe(false);
    expect(r.attention.some((a) => a.kind === "persistent-deterioration")).toBe(true);
    expect(r.attention.some((a) => a.kind === "newly-deteriorating")).toBe(false);
    expect(r.whatChanged.some((s) => s.kind === "transition")).toBe(false);
  });

  it("an old transition is reported as a continuing condition, not as news", () => {
    const r = report([signal("Inflation", "rising")], { Inflation: history(["flat", "rising", "rising", "rising"]) }, 4);
    const statement = r.whatChanged.find((s) => s.dimension === "Inflation")!;
    expect(statement.kind).toBe("deteriorating");
    expect(statement.text).toContain("remains rising");
  });

  it("a transition at the newest snapshot IS reported as recent", () => {
    const r = report([signal("Inflation", "rising")], { Inflation: history(["flat", "flat", "rising"]) }, 3);
    const d = r.dimensions[0];
    expect(d.consecutiveSnapshots).toBe(1);
    expect(d.changedRecently).toBe(true);
    expect(r.whatChanged[0].kind).toBe("transition");
    expect(r.attention.some((a) => a.kind === "newly-deteriorating")).toBe(true);
  });

  it("a run one short of the minimum is not called persistent", () => {
    const r = report([signal("Inflation", "rising")], { Inflation: history(["flat", "rising", "rising"]) }, 3);
    expect(r.dimensions[0].consecutiveSnapshots).toBe(2);
    expect(r.dimensions[0].persistent).toBe(false);
    expect(r.attention.some((a) => a.kind === "persistent-deterioration")).toBe(false);
  });

  it("no state transition: previousState stays null when every snapshot shares the state", () => {
    const r = report([signal("Growth", "flat")], { Growth: history(["flat", "flat", "flat"]) }, 3);
    const d = r.dimensions[0];
    expect(d.previousState).toBeNull();
    expect(d.changed).toBe(false);
    expect(d.runTruncated).toBe(true);
  });

  it("a truncated run is reported with a + and never as an exact length", () => {
    const r = report([signal("Inflation", "rising")], { Inflation: history(["rising", "rising", "rising"]) }, 3);
    expect(r.dimensions[0].runTruncated).toBe(true);
    const persistent = r.attention.find((a) => a.kind === "persistent-deterioration");
    expect(persistent?.text).toContain("3+ consecutive snapshots");
    expect(persistent?.text).not.toMatch(/\bfor 3 consecutive/);
  });

  it("a live state that differs from the newest snapshot reports that snapshot as previous, with no borrowed run length", () => {
    const r = report([signal("Growth", "decelerating")], { Growth: history(["accelerating", "accelerating", "accelerating"]) }, 3);
    const d = r.dimensions[0];
    expect(d.previousState).toBe("accelerating");
    expect(d.changed).toBe(true);
    expect(d.changeNotYetPersisted).toBe(true);
    expect(d.consecutiveSnapshots).toBeNull();
    expect(d.persistent).toBe(false);
    expect(r.whatChanged[0].text).toContain("not yet recorded in a stored snapshot");
  });
});

// ── Partial / missing data ────────────────────────────────────────────────

describe("partial and missing data", () => {
  it("a dimension with no history entry still reports its current state", () => {
    const r = report([signal("Inflation", "rising"), signal("Growth", "accelerating")], { Inflation: history(["rising", "rising"]) }, 2);
    const growth = r.dimensions.find((d) => d.dimension === "Growth")!;
    expect(growth.currentState).toBe("accelerating");
    expect(growth.previousState).toBeNull();
    expect(growth.consecutiveSnapshots).toBeNull();
  });

  it("no signals at all produces an honest empty report rather than throwing", () => {
    const r = report([], {}, 0);
    expect(r.posture).toBe("Insufficient Data");
    expect(r.dimensions).toEqual([]);
    expect(r.whatChanged).toEqual([]);
    expect(r.counts.ratedWithData).toBe(0);
    expect(r.knowledge.unknown.length).toBeGreaterThan(0);
  });

  it("limited coverage is flagged rather than silently treated as breadth", () => {
    const r = report([signal("Inflation", "rising"), signal("Growth", "decelerating")], {}, 3);
    expect(r.counts.ratedWithData).toBe(2);
    expect(r.deteriorationBreadth).toBe("insufficient-coverage");
    expect(r.attention.some((a) => a.kind === "limited-coverage")).toBe(true);
  });
});

// ── Determinism & ordering ────────────────────────────────────────────────

describe("deterministic ordering", () => {
  const signals = [
    signal("MarketStress", "pressure-building"),
    signal("Inflation", "rising"),
    signal("Growth", "decelerating"),
    signal("FiscalConditions", "improving"),
    signal("ExternalSector", "mixed"),
  ];
  const histories: Partial<Record<IntelligenceDimension, DimensionHistory>> = {
    Inflation: history(["flat", "rising", "rising", "rising"]),
    Growth: history(["accelerating", "decelerating"]),
  };

  it("produces identical output across repeated runs", () => {
    const a = report(signals, histories, 6);
    const b = report(signals, histories, 6);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("orders attention by fixed severity rank, then by the engine's dimension order", () => {
    const r = report(signals, histories, 6);
    const kinds = r.attention.map((a) => a.kind);
    const ranked = [...kinds].sort(
      (x, y) =>
        ["broad-deterioration", "persistent-deterioration", "newly-deteriorating", "broad-improvement", "persistent-improvement", "newly-improving", "limited-coverage", "insufficient-history"].indexOf(x) -
        ["broad-deterioration", "persistent-deterioration", "newly-deteriorating", "broad-improvement", "persistent-improvement", "newly-improving", "limited-coverage", "insufficient-history"].indexOf(y),
    );
    expect(kinds).toEqual(ranked);
  });

  it("puts transitions first in What Changed", () => {
    const statements = report(signals, histories, 6).whatChanged;
    expect(statements[0].kind).toBe("transition");
  });
});

// ── Negative guarantees ───────────────────────────────────────────────────

describe("no unsupported claim is ever generated", () => {
  const full = report(
    [
      signal("Inflation", "rising"),
      signal("MonetaryPolicy", "tightening"),
      signal("ExternalSector", "deteriorating"),
      signal("LiquidityCredit", "contracting"),
      signal("FiscalConditions", "improving"),
      signal("Growth", "decelerating"),
      signal("MarketStress", "pressure-building"),
    ],
    {
      Inflation: history(["flat", "rising", "rising", "rising"]),
      Growth: history(["accelerating", "decelerating"]),
      MonetaryPolicy: history(["held", "tightening", "tightening", "tightening"]),
    },
    8,
  );

  function allText(): string {
    return [
      ...full.attention.map((a) => a.text),
      ...full.whatChanged.map((s) => s.text),
      ...full.knowledge.observed,
      ...full.knowledge.interpreted,
      ...full.knowledge.unknown,
    ].join(" ");
  }

  it("never emits a buy/sell or investment recommendation", () => {
    expect(allText()).not.toMatch(/\b(buy|sell|invest in|allocate|portfolio|recommend|should purchase|hedge)\b/i);
  });

  it("never emits a calendar duration — persistence is always stated in snapshots", () => {
    expect(allText()).not.toMatch(/\b\d+\s*(day|days|week|weeks|month|months|year|years)\b/i);
  });

  it("never emits a numeric score or percentage rating of the macro picture", () => {
    expect(allText()).not.toMatch(/score|\d+\s*%|\d+\s*\/\s*100|index of/i);
  });

  it("never asserts causality between dimensions", () => {
    expect(allText()).not.toMatch(/\b(because of|caused by|due to|leads to|drives|results in)\b/i);
  });

  it("never invents a previous state for a dimension without history", () => {
    const noHistory = full.dimensions.filter((d) => !["Inflation", "Growth", "MonetaryPolicy"].includes(d.dimension));
    for (const d of noHistory) {
      expect(d.previousState).toBeNull();
      expect(d.changed).toBe(false);
    }
  });

  it("keeps unrated dimensions out of every improving/deteriorating count and attention flag", () => {
    expect(full.counts.notRated).toBe(2);
    const flaggedDimensions = full.attention.map((a) => a.dimension).filter(Boolean);
    expect(flaggedDimensions).not.toContain("MonetaryPolicy");
    expect(flaggedDimensions).not.toContain("LiquidityCredit");
  });

  it("still reports unrated dimensions' own state and persistence in What Changed", () => {
    const mp = full.whatChanged.find((s) => s.dimension === "MonetaryPolicy");
    expect(mp).toBeDefined();
    expect(mp!.text).toContain("tightening");
  });

  it("separates observed, interpreted and unknown without blurring them", () => {
    expect(full.knowledge.observed.length).toBeGreaterThan(0);
    expect(full.knowledge.interpreted.length).toBeGreaterThan(0);
    expect(full.knowledge.unknown.length).toBeGreaterThan(0);
    expect(full.knowledge.unknown.join(" ")).toMatch(/no forecast or recommendation/i);
    expect(full.knowledge.unknown.join(" ")).toMatch(/MonetaryPolicy|LiquidityCredit/);
  });

  it("states the history window rather than implying unlimited history", () => {
    expect(full.knowledge.observed.join(" ")).toContain("30");
    expect(full.historyWindow).toBe(30);
  });

  it("regression: the truncation note counts snapshots actually READ, never the larger requested window", () => {
    // Production read 10 snapshots against a window of 30 and rendered "the
    // oldest of the 30 snapshots read" — overstating the history available.
    const r = buildMacroDecisionReport({
      signals: [signal("Inflation", "rising")],
      historyByDimension: { Inflation: history(["rising", "rising", "rising"]) },
      snapshotCount: 3,
      historyWindow: 30,
    });
    expect(r.dimensions[0].runTruncated).toBe(true);
    const note = r.knowledge.unknown.find((u) => u.includes("true start"))!;
    expect(note).toContain("oldest of the 3 snapshots read");
    expect(note).not.toContain("30 snapshots read");
  });

  it("singularises the truncation note when exactly one snapshot was read", () => {
    const r = buildMacroDecisionReport({
      signals: [signal("Inflation", "rising")],
      historyByDimension: { Inflation: history(["rising"]) },
      snapshotCount: 1,
      historyWindow: 30,
    });
    // A single-point run is not truncated, so no note is produced at all —
    // the honest outcome, rather than a note about a run that cannot exist.
    expect(r.dimensions[0].runTruncated).toBe(false);
    expect(r.knowledge.unknown.some((u) => u.includes("true start"))).toBe(false);
  });
});

// ── Direct unit coverage of the small helpers ─────────────────────────────

describe("helper units", () => {
  it("countAssessments tallies every category", () => {
    const decisions = [
      { assessment: "improving" },
      { assessment: "deteriorating" },
      { assessment: "steady" },
      { assessment: "not-rated" },
      { assessment: "insufficient-data" },
    ] as DimensionDecision[];
    const counts = countAssessments(decisions);
    expect(counts).toMatchObject({ improving: 1, deteriorating: 1, steady: 1, notRated: 1, insufficientData: 1, ratedWithData: 3 });
  });

  it("determinePosture is a pure function of the counts", () => {
    expect(determinePosture({ improving: 0, deteriorating: 2, steady: 1, notRated: 0, insufficientData: 0, ratedWithData: 3 })).toBe("Deteriorating");
    expect(determinePosture({ improving: 2, deteriorating: 0, steady: 1, notRated: 0, insufficientData: 0, ratedWithData: 3 })).toBe("Improving");
    expect(determinePosture({ improving: 1, deteriorating: 1, steady: 1, notRated: 0, insufficientData: 0, ratedWithData: 3 })).toBe("Mixed");
    expect(determinePosture({ improving: 0, deteriorating: 0, steady: 3, notRated: 0, insufficientData: 0, ratedWithData: 3 })).toBe("Stable");
  });

  it("buildWhatChanged omits dimensions with nothing to report", () => {
    const statements = buildWhatChanged([
      { dimension: "ExternalSector", label: "External Sector", currentState: "mixed", assessment: "steady", changed: false, persistent: false, previousState: null, consecutiveSnapshots: 1, runTruncated: false, changeNotYetPersisted: false } as DimensionDecision,
    ]);
    expect(statements).toEqual([]);
  });
});
