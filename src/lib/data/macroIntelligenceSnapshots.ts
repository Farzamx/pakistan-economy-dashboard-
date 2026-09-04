// Macro Intelligence Signal History & Regime Persistence (Phase 10.1) —
// storage layer. Mirrors weeklyIntelligence.ts's exact shape: a store
// function (server-side only, takes the trusted internal secret) and a
// public read function, both thin wrappers over the two SECURITY DEFINER
// RPCs migration 0053 defines. This file performs NO computation — it
// only serializes an already-built MacroIntelligenceReport (from
// src/lib/intelligence/macroIntelligence.ts, imported for its TYPES only)
// to/from the database. The intelligence engine does not import this
// module; the dependency runs one way, downstream only:
//
//   buildMacroIntelligenceReport() -> writeMacroIntelligenceSnapshot()
//
// never the reverse.

import { createPublicDataClient } from "@/lib/supabase/publicDataClient";
import type { IntelligenceDimension, MacroIntelligenceReport, SignalConfidence, SignalDirection } from "@/lib/intelligence/types";

/** The compact, per-dimension fields persisted — deliberately NOT the full IndicatorObservationEvidence array, which already lives in canonical_observations and would duplicate it here for no benefit this feature needs. */
export interface PersistedDimensionSnapshot {
  state: string;
  direction: SignalDirection;
  confidence: SignalConfidence;
  confidenceScore: number | null;
  summary: string;
}

export interface MacroIntelligenceSnapshot {
  computedAt: string;
  snapshotDate: string;
  dimensions: Partial<Record<IntelligenceDimension, PersistedDimensionSnapshot>>;
}

interface SnapshotRow {
  computed_at: string;
  snapshot_date: string;
  dimensions: Partial<Record<IntelligenceDimension, PersistedDimensionSnapshot>>;
}

function rowToSnapshot(row: SnapshotRow): MacroIntelligenceSnapshot {
  return { computedAt: row.computed_at, snapshotDate: row.snapshot_date, dimensions: row.dimensions ?? {} };
}

/** Builds the compact persisted shape from a live report — every field here already exists on IntelligenceSignal; nothing is derived or reinterpreted. Every computed signal is persisted, including "insufficient-data" states — omitting them would misrepresent history, not simplify it. */
function reportToDimensions(report: MacroIntelligenceReport): Record<string, PersistedDimensionSnapshot> {
  const dimensions: Record<string, PersistedDimensionSnapshot> = {};
  for (const signal of report.signals) {
    dimensions[signal.dimension] = {
      state: signal.state,
      direction: signal.direction,
      confidence: signal.confidence,
      confidenceScore: signal.confidenceScore,
      summary: signal.summary,
    };
  }
  return dimensions;
}

export interface WriteSnapshotResult {
  success: boolean;
  skipped?: boolean;
  error?: string;
}

/**
 * Persists today's Macro Intelligence report. Called only from the
 * scheduled cron cycle (see macroIntelligenceSnapshotCompute.ts), with the
 * trusted server-side internal secret — same 'notification_worker' key
 * every other trusted cron in this project already uses (see
 * weeklyIntelligence.ts's identical convention).
 *
 * `skipped: true` is a normal, non-error outcome: the database enforces at
 * most one row per UTC calendar day (migration 0053's unique index on
 * snapshot_date). A second attempt on the same day (Vercel Cron's
 * at-least-once delivery, a manual re-trigger) hits that guard and comes
 * back here as `skipped`, not a thrown error — the exact idempotency
 * pattern migration 0042 established for weekly_intelligence_snapshots.
 */
export async function writeMacroIntelligenceSnapshot(report: MacroIntelligenceReport, internalSecret: string): Promise<WriteSnapshotResult> {
  try {
    const supabase = createPublicDataClient();
    const { data, error } = await supabase.rpc("store_macro_intelligence_snapshot", {
      p_internal_secret: internalSecret,
      p_dimensions: reportToDimensions(report),
    });
    if (error) {
      console.error(`[MacroIntelligenceSnapshots] store failed: ${error.message}`);
      return { success: false, error: error.message };
    }
    const result = data as { id: string | null; skipped: boolean; reason?: string } | null;
    if (result?.skipped) {
      console.log(`[MacroIntelligenceSnapshots] Skipped — ${result.reason ?? "already computed today"}`);
      return { success: true, skipped: true };
    }
    return { success: true, skipped: false };
  } catch (err) {
    // A write failure here must never propagate into a page render (the
    // cron route is the only caller) — caught and reported, never thrown.
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[MacroIntelligenceSnapshots] store threw: ${message}`);
    return { success: false, error: message };
  }
}

/**
 * Reads the most recent N snapshots, newest first (matching what "recent"
 * means for a bounded RPC read) — callers that need oldest-first for
 * display/interpretation (see macroIntelligenceHistory.ts) reverse this
 * themselves, the same "read model returns its own natural order, the
 * consumer adapts" convention used throughout this codebase.
 *
 * Never throws and never surfaces a read failure to the caller as an
 * error — returns an empty array instead, exactly like
 * getLatestWeeklyIntelligenceSnapshot()'s identical null-on-failure
 * convention. An empty array is indistinguishable from "zero snapshots
 * exist yet" by design: either way, the honest UI state is the same
 * ("history will appear after additional snapshots"), and the current
 * Macro Intelligence report must render regardless of whether history
 * could be read.
 */
export async function readRecentMacroIntelligenceSnapshots(limit: number): Promise<MacroIntelligenceSnapshot[]> {
  try {
    const supabase = createPublicDataClient();
    const { data, error } = await supabase.rpc("get_recent_macro_intelligence_snapshots", { p_limit: limit });
    if (error) {
      console.error(`[MacroIntelligenceSnapshots] read failed: ${error.message}`);
      return [];
    }
    return ((data ?? []) as SnapshotRow[]).map(rowToSnapshot);
  } catch (err) {
    console.error(`[MacroIntelligenceSnapshots] read threw: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}
