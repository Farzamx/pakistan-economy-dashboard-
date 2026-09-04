// Macro Intelligence Signal History & Regime Persistence (Phase 10.1) —
// scheduled-computation orchestration. Mirrors weeklyIntelligenceCompute.ts's
// exact shape (a cycle function shared by a thin cron route) but is
// deliberately its own file/cadence rather than folded into that existing
// cycle:
//
//   buildMacroIntelligenceReport() is pure and cheap (every read goes
//   through the already-cached canonical/read-model layer — no provider
//   API call, no AI narration call). weeklyIntelligenceCompute.ts's own
//   cycle exists specifically to gate an AI narration call that IS
//   rate/cost-sensitive, which is why it runs weekly. Piggybacking Macro
//   Intelligence's cheap, dependency-free computation onto that weekly
//   cadence would make regime-duration tracking needlessly coarse for no
//   cost benefit — so this is a separate daily cycle instead, called from
//   its own cron route (src/app/api/cron/macro-intelligence-snapshot/route.ts).
//
// This file performs NO signal computation of its own — it calls the
// existing, unmodified buildMacroIntelligenceReport() exactly once, then
// hands the result to the persistence layer. Nothing here feeds back into
// signal computation; the dependency is strictly one-directional.

import { buildMacroIntelligenceReport } from "@/lib/intelligence/macroIntelligence";
import { writeMacroIntelligenceSnapshot } from "@/lib/data/macroIntelligenceSnapshots";

export interface MacroIntelligenceSnapshotCycleResult {
  success: boolean;
  skipped: boolean;
  error?: string;
  dimensionCount?: number;
}

/**
 * Runs the full build -> persist cycle. Idempotency is enforced entirely
 * DB-side (migration 0053's unique index on snapshot_date) — this function
 * does not pre-check, unlike weekly's cheap pre-check, because there is no
 * expensive AI call here worth avoiding by checking first; a rejected
 * duplicate write is already the cheapest possible outcome.
 */
export async function runMacroIntelligenceSnapshotCycle(internalSecret: string, now: Date = new Date()): Promise<MacroIntelligenceSnapshotCycleResult> {
  const report = await buildMacroIntelligenceReport(now);
  const result = await writeMacroIntelligenceSnapshot(report, internalSecret);
  if (!result.success) {
    return { success: false, skipped: false, error: result.error };
  }
  return { success: true, skipped: result.skipped ?? false, dimensionCount: report.signals.length };
}
