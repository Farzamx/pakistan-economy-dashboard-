// Macro Intelligence Signal History & Regime Persistence (Phase 10.1) —
// pure historical-interpretation logic. Mechanical only: given an ordered
// list of persisted states, this file counts consecutive occurrences and
// detects a genuine prior-state transition. No I/O, no Date.now(), no
// invented thresholds, no causal claims — exactly the same purity
// discipline src/lib/intelligence/trendAnalysis.ts already established for
// the live engine (this file is deliberately NOT inside
// src/lib/intelligence/ — history is a downstream, read-only consumer of
// that engine's persisted output, never a dependency of it).

import type { IntelligenceDimension } from "@/lib/intelligence/types";
import type { MacroIntelligenceSnapshot } from "@/lib/data/macroIntelligenceSnapshots";

export interface DimensionHistoryPoint {
  computedAt: string;
  state: string;
}

export interface DimensionHistory {
  /** Oldest-first, matching every existing read model's convention (trendAnalysis.ts, sbp.ts, worldBank.ts). */
  points: readonly DimensionHistoryPoint[];
  /** The most recent persisted state — always points[points.length - 1].state. */
  currentState: string;
  /** How many of the most recent consecutive snapshots share currentState. Always >= 1. */
  consecutiveCount: number;
  /** The state immediately before the current run began — null when there is no earlier differing state in the fetched window (either only one snapshot exists, or every fetched snapshot already shares currentState). */
  previousState: string | null;
  /**
   * True when the current run's start coincides with the oldest fetched
   * snapshot — i.e. the run may actually be longer than consecutiveCount
   * shows, we simply don't have enough history fetched to see its true
   * start. Never claim more precision than the data supports (Phase 10.1
   * brief step 9): the UI should render "N+ consecutive" rather than "N
   * consecutive" in this case.
   */
  truncated: boolean;
}

/**
 * Computes one dimension's history summary from its own ordered points.
 * Returns null for zero points — callers render "History will appear
 * after additional snapshots" in that case (Phase 10.1 brief step 8),
 * never a fabricated summary.
 */
export function computeDimensionHistory(pointsOldestFirst: readonly DimensionHistoryPoint[]): DimensionHistory | null {
  if (pointsOldestFirst.length === 0) return null;

  const currentState = pointsOldestFirst[pointsOldestFirst.length - 1].state;
  let consecutiveCount = 0;
  for (let i = pointsOldestFirst.length - 1; i >= 0; i--) {
    if (pointsOldestFirst[i].state !== currentState) break;
    consecutiveCount++;
  }

  const transitionIndex = pointsOldestFirst.length - consecutiveCount - 1;
  const previousState = transitionIndex >= 0 ? pointsOldestFirst[transitionIndex].state : null;
  const truncated = transitionIndex < 0 && pointsOldestFirst.length > 1;

  return { points: pointsOldestFirst, currentState, consecutiveCount, previousState, truncated };
}

/**
 * Builds per-dimension history for every dimension present across the
 * fetched snapshots, from ONE already-fetched batch (readRecentMacroIntelligenceSnapshots's
 * single RPC call) — never a second query per dimension (Phase 10.1 brief
 * step 14: no N+1, no waterfall). `snapshotsNewestFirst` is exactly what
 * readRecentMacroIntelligenceSnapshots() returns; this function reverses
 * it once, internally, to the oldest-first convention every interpretation
 * step below assumes.
 *
 * A dimension absent from every fetched snapshot is simply absent from the
 * returned record — never guessed or backfilled (mirrors
 * MacroRegimeSnapshot's own "omit, never guess" convention). A dimension
 * present in only SOME snapshots (e.g. it started being computed partway
 * through the fetched window) still gets a history entry built from
 * whichever points actually have it — "if only some dimensions have
 * historical data, handle that gracefully" (Phase 10.1 brief step 13).
 */
export function buildHistoryByDimension(snapshotsNewestFirst: readonly MacroIntelligenceSnapshot[]): Partial<Record<IntelligenceDimension, DimensionHistory>> {
  const snapshotsOldestFirst = [...snapshotsNewestFirst].reverse();

  const dimensionKeys = new Set<IntelligenceDimension>();
  for (const snapshot of snapshotsOldestFirst) {
    for (const key of Object.keys(snapshot.dimensions)) dimensionKeys.add(key as IntelligenceDimension);
  }

  const result: Partial<Record<IntelligenceDimension, DimensionHistory>> = {};
  for (const dimension of dimensionKeys) {
    const points: DimensionHistoryPoint[] = [];
    for (const snapshot of snapshotsOldestFirst) {
      const entry = snapshot.dimensions[dimension];
      if (entry) points.push({ computedAt: snapshot.computedAt, state: entry.state });
    }
    const history = computeDimensionHistory(points);
    if (history) result[dimension] = history;
  }
  return result;
}
