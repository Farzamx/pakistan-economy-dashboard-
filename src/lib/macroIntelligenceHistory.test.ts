// Phase 10.1 — pure historical-interpretation logic tests. No I/O, no
// mocking needed: computeDimensionHistory/buildHistoryByDimension are
// plain functions over already-fetched data.

import { describe, it, expect } from "vitest";
import { computeDimensionHistory, buildHistoryByDimension, type DimensionHistoryPoint } from "./macroIntelligenceHistory";
import type { MacroIntelligenceSnapshot } from "./data/macroIntelligenceSnapshots";

function point(computedAt: string, state: string): DimensionHistoryPoint {
  return { computedAt, state };
}

describe("computeDimensionHistory", () => {
  it("8. empty history -> null, never a fabricated summary", () => {
    expect(computeDimensionHistory([])).toBeNull();
  });

  it("7. a single snapshot -> consecutiveCount 1, previousState null, never claims persistence beyond one snapshot", () => {
    const history = computeDimensionHistory([point("2026-09-01T00:00:00Z", "rising")]);
    expect(history).not.toBeNull();
    expect(history!.points).toHaveLength(1);
    expect(history!.currentState).toBe("rising");
    expect(history!.consecutiveCount).toBe(1);
    expect(history!.previousState).toBeNull();
    expect(history!.truncated).toBe(false);
  });

  it("5. consecutive-state calculation — counts only the run ending at the most recent snapshot", () => {
    // Stable, Stable, Rising, Rising, Rising (oldest first)
    const history = computeDimensionHistory([
      point("2026-08-28T00:00:00Z", "stable"),
      point("2026-08-29T00:00:00Z", "stable"),
      point("2026-08-30T00:00:00Z", "rising"),
      point("2026-08-31T00:00:00Z", "rising"),
      point("2026-09-01T00:00:00Z", "rising"),
    ]);
    expect(history!.currentState).toBe("rising");
    expect(history!.consecutiveCount).toBe(3);
  });

  it("6. state transition detection — previousState is the state immediately before the current run began", () => {
    const history = computeDimensionHistory([
      point("2026-08-28T00:00:00Z", "stable"),
      point("2026-08-29T00:00:00Z", "stable"),
      point("2026-08-30T00:00:00Z", "rising"),
    ]);
    expect(history!.previousState).toBe("stable");
    expect(history!.consecutiveCount).toBe(1);
  });

  it("does not report a transition when every fetched snapshot already shares the current state", () => {
    const history = computeDimensionHistory([
      point("2026-08-30T00:00:00Z", "rising"),
      point("2026-08-31T00:00:00Z", "rising"),
      point("2026-09-01T00:00:00Z", "rising"),
    ]);
    expect(history!.previousState).toBeNull();
    // The run might extend earlier than the fetched window -- truncated, not a false "no prior state ever existed" claim.
    expect(history!.truncated).toBe(true);
  });

  it("truncated is false when a genuine earlier differing state is visible in the window", () => {
    const history = computeDimensionHistory([
      point("2026-08-30T00:00:00Z", "stable"),
      point("2026-08-31T00:00:00Z", "rising"),
      point("2026-09-01T00:00:00Z", "rising"),
    ]);
    expect(history!.truncated).toBe(false);
    expect(history!.previousState).toBe("stable");
  });

  it("truncated is false for a genuinely single-snapshot history (nothing to truncate)", () => {
    const history = computeDimensionHistory([point("2026-09-01T00:00:00Z", "rising")]);
    expect(history!.truncated).toBe(false);
  });

  it("9. irregular snapshot timing does not affect the mechanical count — only state sequence matters, never elapsed time", () => {
    // Gaps of 1 day, then 6 days, then 1 day -- consecutiveCount must still just count states, not infer a duration.
    const history = computeDimensionHistory([
      point("2026-08-01T00:00:00Z", "rising"),
      point("2026-08-02T00:00:00Z", "rising"),
      point("2026-08-08T00:00:00Z", "rising"),
      point("2026-08-09T00:00:00Z", "rising"),
    ]);
    expect(history!.consecutiveCount).toBe(4);
    // The function exposes no duration/day-count field at all -- there is nothing here that could be misread as elapsed time.
    expect(history).not.toHaveProperty("days");
    expect(history).not.toHaveProperty("durationMs");
  });

  it("insufficient-data is treated as an honest state like any other, never hidden from the sequence", () => {
    const history = computeDimensionHistory([
      point("2026-08-30T00:00:00Z", "rising"),
      point("2026-08-31T00:00:00Z", "insufficient-data"),
      point("2026-09-01T00:00:00Z", "insufficient-data"),
    ]);
    expect(history!.currentState).toBe("insufficient-data");
    expect(history!.consecutiveCount).toBe(2);
    expect(history!.previousState).toBe("rising");
  });
});

describe("buildHistoryByDimension", () => {
  function snapshot(computedAt: string, dims: Record<string, string>): MacroIntelligenceSnapshot {
    const dimensions: MacroIntelligenceSnapshot["dimensions"] = {};
    for (const [dim, state] of Object.entries(dims)) {
      dimensions[dim as keyof typeof dimensions] = { state, direction: "Rising", confidence: "High", confidenceScore: 100, summary: "x" };
    }
    return { computedAt, snapshotDate: computedAt.slice(0, 10), dimensions };
  }

  it("3/4. reverses the newest-first input to oldest-first before interpreting, and handles multiple snapshots correctly", () => {
    // readRecentMacroIntelligenceSnapshots() returns newest-first.
    const newestFirst: MacroIntelligenceSnapshot[] = [
      snapshot("2026-09-01T00:00:00Z", { Inflation: "rising" }),
      snapshot("2026-08-31T00:00:00Z", { Inflation: "rising" }),
      snapshot("2026-08-30T00:00:00Z", { Inflation: "stable" }),
    ];
    const result = buildHistoryByDimension(newestFirst);
    expect(result.Inflation).toBeDefined();
    expect(result.Inflation!.points.map((p) => p.computedAt)).toEqual(["2026-08-30T00:00:00Z", "2026-08-31T00:00:00Z", "2026-09-01T00:00:00Z"]);
    expect(result.Inflation!.currentState).toBe("rising");
    expect(result.Inflation!.consecutiveCount).toBe(2);
  });

  it("a dimension absent from every snapshot is simply absent from the result — never guessed", () => {
    const result = buildHistoryByDimension([snapshot("2026-09-01T00:00:00Z", { Inflation: "rising" })]);
    expect(result.Inflation).toBeDefined();
    expect(result.MonetaryPolicy).toBeUndefined();
  });

  it("13. a dimension present in only some snapshots still gets a history built from the ones that have it (partial history handled gracefully)", () => {
    const newestFirst: MacroIntelligenceSnapshot[] = [
      snapshot("2026-09-01T00:00:00Z", { Inflation: "rising", MonetaryPolicy: "tightening" }),
      snapshot("2026-08-31T00:00:00Z", { Inflation: "rising" }), // MonetaryPolicy wasn't computed that day
    ];
    const result = buildHistoryByDimension(newestFirst);
    expect(result.MonetaryPolicy!.points).toHaveLength(1);
    expect(result.Inflation!.points).toHaveLength(2);
  });

  it("empty snapshot list -> empty result object, not an error", () => {
    expect(buildHistoryByDimension([])).toEqual({});
  });
});
