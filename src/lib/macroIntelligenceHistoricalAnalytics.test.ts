// Phase 13 — historical regime analytics tests. Pure fixtures, no I/O, no
// clock. Covers the full matrix the brief enumerates, plus the negative
// guarantees that matter most here: a data gap is never read as an economic
// event, no turning point is manufactured from a flat history, and no run
// length is claimed beyond what the stored window can support.

import { describe, it, expect } from "vitest";
import {
  buildHistoricalAnalytics,
  buildTimeline,
  buildTransitions,
  assessSufficiency,
  compareCurrentConfiguration,
  DIMENSION_ORDER,
} from "./macroIntelligenceHistoricalAnalytics";
import type { MacroIntelligenceSnapshot } from "@/lib/data/macroIntelligenceSnapshots";
import type { IntelligenceDimension } from "@/lib/intelligence/types";

function snap(day: number, states: Partial<Record<IntelligenceDimension, string>>): MacroIntelligenceSnapshot {
  const date = `2026-09-${String(day).padStart(2, "0")}`;
  const dimensions: MacroIntelligenceSnapshot["dimensions"] = {};
  for (const [k, state] of Object.entries(states)) {
    dimensions[k as IntelligenceDimension] = { state: state!, direction: "Flat", confidence: "High", confidenceScore: 80, summary: "" };
  }
  return { computedAt: `${date}T10:00:00.000Z`, snapshotDate: date, dimensions };
}

/** Takes snapshots OLDEST-first for readability and feeds them in the newest-first order the real reader returns. */
function analyse(oldestFirst: MacroIntelligenceSnapshot[], historyWindow = 30) {
  return buildHistoricalAnalytics({ snapshotsNewestFirst: [...oldestFirst].reverse(), historyWindow });
}

// ── Data sufficiency ──────────────────────────────────────────────────────

describe("data sufficiency is stated honestly at every depth", () => {
  it("0 snapshots: nothing is analysed and nothing is claimed", () => {
    const r = analyse([]);
    expect(r.timeline).toEqual([]);
    expect(r.transitions).toEqual([]);
    expect(r.turningPoints).toEqual([]);
    expect(r.sufficiency.canDetectTransitions).toBe(false);
    expect(r.sufficiency.note).toMatch(/will appear once daily snapshots accumulate/i);
    expect(r.configuration.comparable).toBe(false);
  });

  it("1 snapshot: no interval exists, so no transition can be identified", () => {
    const r = analyse([snap(1, { Inflation: "rising" })]);
    expect(r.timeline).toHaveLength(1);
    expect(r.sufficiency.intervals).toBe(0);
    expect(r.sufficiency.canDetectTransitions).toBe(false);
    expect(r.sufficiency.note).toMatch(/insufficient history to identify any transition/i);
    expect(r.transitions).toEqual([]);
    expect(r.configuration.comparable).toBe(false);
    expect(r.configuration.reason).toMatch(/only match itself/i);
  });

  it("2 snapshots: one interval, limited persistence analysis", () => {
    const r = analyse([snap(1, { Inflation: "flat" }), snap(2, { Inflation: "rising" })]);
    expect(r.sufficiency.intervals).toBe(1);
    expect(r.sufficiency.canDetectTransitions).toBe(true);
    expect(r.sufficiency.note).toMatch(/one interval is available/i);
    expect(r.transitions).toHaveLength(1);
  });

  it("3+ snapshots: states the count actually available, never implying more", () => {
    const r = analyse([snap(1, { Inflation: "flat" }), snap(2, { Inflation: "flat" }), snap(3, { Inflation: "rising" })]);
    expect(r.sufficiency.note).toContain("3 snapshots currently available");
    expect(r.sufficiency.windowPossiblyTruncated).toBe(false);
  });

  it("discloses when the read filled the whole requested window, so older history may exist", () => {
    const s = assessSufficiency(30, 30);
    expect(s.windowPossiblyTruncated).toBe(true);
    expect(s.note).toMatch(/older history may exist beyond this window/i);
    expect(assessSufficiency(10, 30).windowPossiblyTruncated).toBe(false);
  });
});

// ── Timeline ──────────────────────────────────────────────────────────────

describe("timeline", () => {
  it("is oldest-first and derives posture with the decision layer's own rules", () => {
    const r = analyse([
      snap(1, { Inflation: "rising", Growth: "decelerating", FiscalConditions: "deteriorating" }),
      snap(2, { Inflation: "falling", Growth: "accelerating", FiscalConditions: "improving" }),
    ]);
    expect(r.timeline[0].snapshotDate).toBe("2026-09-01");
    expect(r.timeline[1].snapshotDate).toBe("2026-09-02");
    expect(r.timeline[0].posture).toBe("Deteriorating");
    expect(r.timeline[1].posture).toBe("Improving");
    expect(r.timeline[0].deteriorationBreadth).toBe("broad-based");
  });

  it("reports coverage separately from economic state", () => {
    const r = analyse([snap(1, { Inflation: "rising", Growth: "insufficient-data", MonetaryPolicy: "held" })]);
    const point = r.timeline[0];
    expect(point.coverage).toEqual({ classified: 2, recorded: 3 });
    expect(point.counts.insufficientData).toBe(1);
    expect(point.counts.notRated).toBe(1);
    expect(point.counts.ratedWithData).toBe(1);
  });

  it("omits a dimension absent from a snapshot rather than inventing a state for it", () => {
    const r = analyse([snap(1, { Inflation: "rising" }), snap(2, { Inflation: "rising", Growth: "accelerating" })]);
    expect(r.timeline[0].states.Growth).toBeUndefined();
    expect(r.timeline[1].states.Growth).toBe("accelerating");
    // No transition — Growth simply was not recorded in the first snapshot.
    expect(r.transitions.filter((t) => t.dimension === "Growth")).toEqual([]);
  });
});

// ── Transitions ───────────────────────────────────────────────────────────

describe("transitions", () => {
  it("identical consecutive states produce no transitions", () => {
    const r = analyse([snap(1, { Inflation: "rising" }), snap(2, { Inflation: "rising" }), snap(3, { Inflation: "rising" })]);
    expect(r.transitions).toEqual([]);
    expect(r.turningPoints).toEqual([]);
  });

  it("classifies improving -> deteriorating", () => {
    const r = analyse([snap(1, { Growth: "accelerating" }), snap(2, { Growth: "decelerating" })]);
    expect(r.transitions[0]).toMatchObject({ kind: "deterioration", fromAssessment: "improving", toAssessment: "deteriorating", isTurningPoint: true });
  });

  it("classifies deteriorating -> improving", () => {
    const r = analyse([snap(1, { Growth: "decelerating" }), snap(2, { Growth: "accelerating" })]);
    expect(r.transitions[0]).toMatchObject({ kind: "improvement", fromAssessment: "deteriorating", toAssessment: "improving", isTurningPoint: true });
  });

  it("classifies stable -> improving and improving -> stable without calling either a turning point", () => {
    const up = analyse([snap(1, { Growth: "flat" }), snap(2, { Growth: "accelerating" })]);
    expect(up.transitions[0]).toMatchObject({ kind: "improvement", fromAssessment: "steady", isTurningPoint: false });

    const down = analyse([snap(1, { Growth: "accelerating" }), snap(2, { Growth: "flat" })]);
    expect(down.transitions[0]).toMatchObject({ kind: "stabilisation", toAssessment: "steady", isTurningPoint: false });
  });

  it("classifies stable -> deteriorating and deteriorating -> stable", () => {
    const down = analyse([snap(1, { Inflation: "flat" }), snap(2, { Inflation: "rising" })]);
    expect(down.transitions[0]).toMatchObject({ kind: "deterioration", isTurningPoint: false });
    const up = analyse([snap(1, { Inflation: "rising" }), snap(2, { Inflation: "flat" })]);
    expect(up.transitions[0]).toMatchObject({ kind: "stabilisation", isTurningPoint: false });
  });

  it("records how long the new state persisted, and whether it is still running", () => {
    const r = analyse([snap(1, { Inflation: "flat" }), snap(2, { Inflation: "rising" }), snap(3, { Inflation: "rising" }), snap(4, { Inflation: "rising" })]);
    expect(r.transitions[0]).toMatchObject({ toState: "rising", persistedSnapshots: 3, ongoing: true });
  });

  it("marks a completed run as not ongoing", () => {
    const r = analyse([snap(1, { Inflation: "flat" }), snap(2, { Inflation: "rising" }), snap(3, { Inflation: "flat" })]);
    const toRising = r.transitions.find((t) => t.toState === "rising")!;
    expect(toRising).toMatchObject({ persistedSnapshots: 1, ongoing: false });
  });

  it("orders transitions newest-first, then by the engine's dimension order", () => {
    const r = analyse([
      snap(1, { Inflation: "flat", Growth: "flat", MarketStress: "mixed" }),
      snap(2, { Inflation: "rising", Growth: "accelerating", MarketStress: "pressure-building" }),
    ]);
    expect(r.transitions.map((t) => t.dimension)).toEqual(["Inflation", "Growth", "MarketStress"]);
  });

  it("is deterministic across repeated runs", () => {
    const snaps = [
      snap(1, { Inflation: "flat", Growth: "decelerating", ExternalSector: "mixed" }),
      snap(2, { Inflation: "rising", Growth: "accelerating", ExternalSector: "improving" }),
      snap(3, { Inflation: "rising", Growth: "accelerating", ExternalSector: "deteriorating" }),
    ];
    expect(JSON.stringify(analyse(snaps))).toBe(JSON.stringify(analyse(snaps)));
  });
});

// ── Data gaps are never economic events ───────────────────────────────────

describe("a data gap is never interpreted as an economic state", () => {
  it("losing classification is coverage-lost, not a deterioration or a turning point", () => {
    const r = analyse([snap(1, { Growth: "accelerating" }), snap(2, { Growth: "insufficient-data" })]);
    const t = r.transitions[0];
    expect(t.kind).toBe("coverage-lost");
    expect(t.involvesDataGap).toBe(true);
    expect(t.isTurningPoint).toBe(false);
    expect(r.turningPoints).toEqual([]);
    expect(r.coverageChanges).toHaveLength(1);
  });

  it("regaining classification is coverage-gained, not an improvement", () => {
    const r = analyse([snap(1, { Growth: "insufficient-data" }), snap(2, { Growth: "accelerating" })]);
    expect(r.transitions[0]).toMatchObject({ kind: "coverage-gained", involvesDataGap: true, isTurningPoint: false });
  });

  it("a gap sitting between two opposite states does not become a turning point", () => {
    // deteriorating -> [no data] -> improving must yield two coverage changes,
    // never one synthesised reversal.
    const r = analyse([snap(1, { Growth: "decelerating" }), snap(2, { Growth: "insufficient-data" }), snap(3, { Growth: "accelerating" })]);
    expect(r.turningPoints).toEqual([]);
    expect(r.coverageChanges).toHaveLength(2);
    expect(r.transitions.every((t) => t.involvesDataGap)).toBe(true);
  });

  it("a persistently unclassifiable dimension is described as lacking evidence, not as a steady economy", () => {
    const r = analyse([
      snap(1, { MonetaryPolicy: "insufficient-data" }),
      snap(2, { MonetaryPolicy: "insufficient-data" }),
      snap(3, { MonetaryPolicy: "insufficient-data" }),
    ]);
    const profile = r.profiles.find((p) => p.dimension === "MonetaryPolicy")!;
    expect(profile.currentAssessment).toBe("insufficient-data");
    expect(profile.currentRunLength).toBe(3);
    expect(r.timeline.every((p) => p.counts.ratedWithData === 0)).toBe(true);
    expect(r.timeline.every((p) => p.posture === "Insufficient Data")).toBe(true);
  });
});

// ── Turning points ────────────────────────────────────────────────────────

describe("turning points", () => {
  it("a flat history yields none — nothing is manufactured", () => {
    const r = analyse([snap(1, { Inflation: "rising" }), snap(2, { Inflation: "rising" }), snap(3, { Inflation: "rising" })]);
    expect(r.turningPoints).toEqual([]);
  });

  it("finds multiple reversals across dimensions and orders them deterministically", () => {
    const r = analyse([
      snap(1, { Growth: "decelerating", Inflation: "falling" }),
      snap(2, { Growth: "accelerating", Inflation: "rising" }),
    ]);
    expect(r.turningPoints).toHaveLength(2);
    expect(r.turningPoints.map((t) => t.dimension)).toEqual(["Inflation", "Growth"]);
    expect(r.turningPoints.every((t) => t.isTurningPoint && !t.involvesDataGap)).toBe(true);
  });

  it("a steady state on either side is not a reversal", () => {
    const r = analyse([snap(1, { Inflation: "flat" }), snap(2, { Inflation: "rising" }), snap(3, { Inflation: "flat" })]);
    expect(r.turningPoints).toEqual([]);
  });

  it("an unrated dimension's change is never a turning point", () => {
    const r = analyse([snap(1, { MonetaryPolicy: "tightening" }), snap(2, { MonetaryPolicy: "easing" })]);
    expect(r.transitions[0].kind).toBe("unrated-change");
    expect(r.turningPoints).toEqual([]);
  });
});

// ── Persistence, standing, extremes ───────────────────────────────────────

describe("persistence and longest observed runs", () => {
  it("computes the current run and flags truncation when it reaches the oldest snapshot", () => {
    const r = analyse([snap(1, { Inflation: "rising" }), snap(2, { Inflation: "rising" }), snap(3, { Inflation: "rising" })]);
    const p = r.profiles.find((x) => x.dimension === "Inflation")!;
    expect(p.currentRunLength).toBe(3);
    expect(p.currentRunTruncated).toBe(true); // render as "3+", never a bare 3
    expect(p.standing).toBe("continuing");
  });

  it("does not flag truncation when the run genuinely starts inside the window", () => {
    const r = analyse([snap(1, { Inflation: "flat" }), snap(2, { Inflation: "rising" }), snap(3, { Inflation: "rising" })]);
    const p = r.profiles.find((x) => x.dimension === "Inflation")!;
    expect(p.currentRunLength).toBe(2);
    expect(p.currentRunTruncated).toBe(false);
  });

  it("identifies the longest observed run for a state, distinct from the current run", () => {
    const r = analyse([
      snap(1, { Inflation: "rising" }),
      snap(2, { Inflation: "rising" }),
      snap(3, { Inflation: "rising" }),
      snap(4, { Inflation: "flat" }),
      snap(5, { Inflation: "rising" }),
    ]);
    const p = r.profiles.find((x) => x.dimension === "Inflation")!;
    expect(p.currentRunLength).toBe(1);
    expect(p.longestRunForCurrentState?.length).toBe(3);
    expect(p.longestRunForCurrentState?.truncatedStart).toBe(true);
    expect(p.longestObservedRun?.length).toBe(3);
  });

  it("marks the current state as new after a single-snapshot change", () => {
    const r = analyse([snap(1, { Inflation: "flat" }), snap(2, { Inflation: "flat" }), snap(3, { Inflation: "rising" })]);
    expect(r.profiles.find((x) => x.dimension === "Inflation")!.standing).toBe("new");
  });

  it("marks the current state as recently reversed after a polarity flip", () => {
    const r = analyse([snap(1, { Growth: "decelerating" }), snap(2, { Growth: "accelerating" })]);
    expect(r.profiles.find((x) => x.dimension === "Growth")!.standing).toBe("recently-reversed");
  });

  it("marks a single observation as such, and an absent dimension as unobserved", () => {
    const r = analyse([snap(1, { Inflation: "rising" })]);
    expect(r.profiles.find((x) => x.dimension === "Inflation")!.standing).toBe("only-observation");
    const growth = r.profiles.find((x) => x.dimension === "Growth")!;
    expect(growth.standing).toBe("unobserved");
    expect(growth.currentState).toBeNull();
    expect(growth.currentRunLength).toBe(0);
  });

  it("records first and most recent occurrence of every observed state", () => {
    const r = analyse([snap(1, { Inflation: "rising" }), snap(2, { Inflation: "flat" }), snap(3, { Inflation: "rising" })]);
    const p = r.profiles.find((x) => x.dimension === "Inflation")!;
    const rising = p.observedStates.find((s) => s.state === "rising")!;
    expect(rising).toMatchObject({ firstSeen: "2026-09-01", lastSeen: "2026-09-03", occurrences: 2 });
    expect(p.transitionCount).toBe(2);
  });

  it("keeps unrated dimensions in the profile list with their polarity flag off", () => {
    const r = analyse([snap(1, { MonetaryPolicy: "tightening" }), snap(2, { MonetaryPolicy: "easing" })]);
    const mp = r.profiles.find((x) => x.dimension === "MonetaryPolicy")!;
    expect(mp.polarityRated).toBe(false);
    expect(mp.currentAssessment).toBe("not-rated");
    expect(mp.currentState).toBe("easing");
    expect(r.profiles).toHaveLength(DIMENSION_ORDER.length);
  });
});

// ── Configuration comparison ──────────────────────────────────────────────

describe("current configuration in historical context", () => {
  const pattern = { Inflation: "rising", Growth: "accelerating" };

  it("counts an exact prior match", () => {
    const r = analyse([snap(1, pattern), snap(2, { Inflation: "flat", Growth: "flat" }), snap(3, pattern)]);
    const c = r.configuration;
    expect(c.comparable).toBe(true);
    expect(c.searched).toBe(3);
    expect(c.exactMatches).toBe(2); // includes the newest itself
    expect(c.priorExactMatches).toBe(1); // genuinely occurred before
  });

  it("reports no prior match when the configuration is unprecedented", () => {
    const r = analyse([snap(1, { Inflation: "flat", Growth: "flat" }), snap(2, { Inflation: "falling", Growth: "decelerating" }), snap(3, pattern)]);
    expect(r.configuration.priorExactMatches).toBe(0);
    expect(r.configuration.exactMatches).toBe(1);
  });

  it("reports partial matches with the exact dimensions that matched", () => {
    const r = analyse([snap(1, { Inflation: "rising", Growth: "decelerating" }), snap(2, pattern)]);
    const c = r.configuration;
    expect(c.priorExactMatches).toBe(0);
    expect(c.partialMatches).toHaveLength(1);
    expect(c.partialMatches[0].matchingDimensions).toEqual(["Inflation"]);
    expect(c.partialMatches[0].comparedDimensions).toEqual(["Inflation", "Growth"]);
  });

  it("compares only rated dimensions — unrated states never affect the match", () => {
    const r = analyse([
      snap(1, { Inflation: "rising", MonetaryPolicy: "tightening" }),
      snap(2, { Inflation: "rising", MonetaryPolicy: "easing" }),
    ]);
    expect(r.configuration.currentPattern.map((p) => p.dimension)).toEqual(["Inflation"]);
    expect(r.configuration.priorExactMatches).toBe(1);
  });

  it("refuses to compare when the newest snapshot records no rated dimension", () => {
    const r = analyse([snap(1, { MonetaryPolicy: "held" }), snap(2, { MonetaryPolicy: "tightening" })]);
    expect(r.configuration.comparable).toBe(false);
    expect(r.configuration.reason).toMatch(/no rated dimension/i);
  });

  it("treats an unclassifiable dimension as part of the pattern rather than silently dropping it", () => {
    const r = analyse([snap(1, { Inflation: "insufficient-data" }), snap(2, { Inflation: "insufficient-data" })]);
    expect(r.configuration.currentPattern).toEqual([{ dimension: "Inflation", state: "insufficient-data" }]);
    expect(r.configuration.priorExactMatches).toBe(1);
  });
});

// ── Direct unit coverage of the exported helpers ──────────────────────────

describe("helper units", () => {
  it("buildTimeline and buildTransitions compose independently of the top-level report", () => {
    const timeline = buildTimeline([snap(1, { Inflation: "flat" }), snap(2, { Inflation: "rising" })]);
    expect(timeline).toHaveLength(2);
    const transitions = buildTransitions(timeline);
    expect(transitions).toHaveLength(1);
    expect(transitions[0]).toMatchObject({ fromState: "flat", toState: "rising", snapshotDate: "2026-09-02" });
  });

  it("compareCurrentConfiguration handles an empty timeline without throwing", () => {
    const c = compareCurrentConfiguration([]);
    expect(c.comparable).toBe(false);
    expect(c.searched).toBe(0);
    expect(c.reason).toMatch(/no snapshots/i);
  });

  it("never emits a recommendation, forecast, or calendar-duration claim", () => {
    const r = analyse([
      snap(1, { Inflation: "falling", Growth: "decelerating", MonetaryPolicy: "insufficient-data" }),
      snap(2, { Inflation: "rising", Growth: "accelerating", MonetaryPolicy: "held" }),
      snap(3, { Inflation: "rising", Growth: "accelerating", MonetaryPolicy: "held" }),
    ]);
    const text = [r.sufficiency.note, r.configuration.reason ?? ""].join(" ");
    expect(text).not.toMatch(/\b(buy|sell|forecast|predict|will likely|expect(ed)? to|target price|guaranteed)\b/i);
    expect(text).not.toMatch(/\b\d+\s*(day|days|week|weeks|month|months|year|years)\b/i);
  });
});

// ── Phase 14: stability as history grows well beyond today's production ────
// depth (currently 10 snapshots). These use real calendar-date arithmetic
// (snap() above breaks past day 31) so a 31+ fixture is a genuine date
// range, not a truncated month. Purely in-memory — nothing here touches or
// resembles a production write.

function snapAt(daysFromEpoch: number, states: Partial<Record<IntelligenceDimension, string>>): MacroIntelligenceSnapshot {
  const d = new Date(Date.UTC(2026, 0, 1) + daysFromEpoch * 86_400_000);
  const date = d.toISOString().slice(0, 10);
  const dimensions: MacroIntelligenceSnapshot["dimensions"] = {};
  for (const [k, state] of Object.entries(states)) {
    dimensions[k as IntelligenceDimension] = { state: state!, direction: "Flat", confidence: "High", confidenceScore: 80, summary: "" };
  }
  return { computedAt: `${date}T10:00:00.000Z`, snapshotDate: date, dimensions };
}

/** n snapshots, oldest-first, cycling every dimension through a short repeating pattern so runs, transitions and turning points all occur throughout — a stress case, not a flat history. */
function manySnapshots(n: number): MacroIntelligenceSnapshot[] {
  const pattern: Record<IntelligenceDimension, string[]> = {
    Inflation: ["rising", "rising", "rising", "flat", "falling"],
    MonetaryPolicy: ["held", "tightening"],
    ExternalSector: ["improving", "mixed", "deteriorating"],
    LiquidityCredit: ["expanding", "insufficient-data"],
    FiscalConditions: ["improving", "improving", "deteriorating"],
    Growth: ["accelerating", "decelerating"],
    MarketStress: ["mixed", "pressure-building", "pressure-easing"],
  };
  return Array.from({ length: n }, (_, i) => {
    const states: Partial<Record<IntelligenceDimension, string>> = {};
    for (const dim of DIMENSION_ORDER) states[dim] = pattern[dim][i % pattern[dim].length];
    return snapAt(i, states);
  });
}

describe("stability as history grows (10 / 30 / 31+ snapshots)", () => {
  it.each([10, 30, 31, 90])("does not crash and stays internally consistent at %d snapshots", (n) => {
    const r = analyse(manySnapshots(n), 30);
    expect(r.timeline).toHaveLength(n);
    // Dates strictly increasing, oldest-first — the ordering contract every
    // consumer (UI, transitions, runs) depends on.
    for (let i = 1; i < r.timeline.length; i++) {
      expect(r.timeline[i].snapshotDate > r.timeline[i - 1].snapshotDate).toBe(true);
    }
    // Every profile stays within the fixture's bounds — no run length or
    // transition count can exceed what n snapshots can support.
    for (const p of r.profiles) {
      expect(p.currentRunLength).toBeLessThanOrEqual(n);
      expect(p.observedInSnapshots).toBeLessThanOrEqual(n);
      expect(p.transitionCount).toBeLessThanOrEqual(n - 1);
    }
    expect(r.configuration.searched).toBe(n);
    expect(r.configuration.exactMatches).toBeLessThanOrEqual(n);
  });

  it("is deterministic at scale — two runs over the same 90-snapshot fixture produce byte-identical output", () => {
    const fixture = manySnapshots(90);
    expect(JSON.stringify(analyse(fixture, 30))).toBe(JSON.stringify(analyse(fixture, 30)));
  });

  it("completes in well under a second at 90 snapshots — no accidental quadratic blowup that would matter at real scale", () => {
    const fixture = manySnapshots(90);
    const start = performance.now();
    analyse(fixture, 30);
    expect(performance.now() - start).toBeLessThan(1000);
  });

  it("31st snapshot (one past a 30-day window some callers might use) does not corrupt truncation semantics", () => {
    // The real call site bounds its own request to historyWindow, so
    // snapshotCount can never exceed it in production — this fixture checks
    // the pure module's own robustness independent of that call-site
    // guarantee, in case a future caller widens the window.
    const r = analyse(manySnapshots(31), 30);
    expect(r.sufficiency.snapshotCount).toBe(31);
    // windowPossiblyTruncated is keyed on snapshotCount >= historyWindow —
    // still fires correctly even when the count exceeds the window, rather
    // than only handling the exact-equality case.
    expect(r.sufficiency.windowPossiblyTruncated).toBe(true);
    // No run can silently claim to reach further back than the data allows.
    for (const p of r.profiles) {
      if (p.longestObservedRun) expect(p.longestObservedRun.length).toBeLessThanOrEqual(31);
    }
  });

  it("many transitions and coverage changes across a long, volatile history remain correctly separated and ordered", () => {
    const r = analyse(manySnapshots(60), 30);
    expect(r.transitions.length).toBeGreaterThan(20); // the fixture is deliberately volatile
    // Newest-first ordering holds even with a large transition set.
    for (let i = 1; i < r.transitions.length; i++) {
      expect(r.transitions[i].computedAt <= r.transitions[i - 1].computedAt).toBe(true);
    }
    // Every coverage change is still excluded from turning points, at scale.
    expect(r.turningPoints.every((t) => !t.involvesDataGap)).toBe(true);
    expect(r.coverageChanges.every((t) => t.involvesDataGap)).toBe(true);
    // The two sets never overlap.
    const turningKeys = new Set(r.turningPoints.map((t) => `${t.snapshotDate}-${t.dimension}`));
    for (const c of r.coverageChanges) expect(turningKeys.has(`${c.snapshotDate}-${c.dimension}`)).toBe(false);
  });
});
