import { NextResponse } from "next/server";
import { runWeeklyIntelligenceCycle } from "@/lib/weeklyIntelligenceCompute";
import { logCronRun } from "@/lib/cronLogging";

// Vercel Cron target (see vercel.json) — runs every Monday. Computes the
// Economic Health Score and the Recession/Sovereign Default probability
// models once, narrates them with AI once, and stores the result —
// replacing the previous "recompute on every page load / every 6h" model
// (Production Reliability & Institutional Upgrade, Part 2).
//
// Auth follows the exact same pattern as the other cron routes in this
// project: Vercel sends `Authorization: Bearer ${CRON_SECRET}` automatically
// for scheduled invocations.
//
// Weekly Intelligence Engine Audit (2026-07-18): the check -> compute ->
// store cycle previously lived inline here. It's now shared with
// syncPipeline.ts's Step 11 (event-triggered recompute after a
// critical-priority release) via runWeeklyIntelligenceCycle() — this route
// is now a thin HTTP wrapper that always passes triggerReason "scheduled",
// exactly like every other cron route in this project is a thin adapter
// over its own pure engine function. See migration 0042 and
// weeklyIntelligenceCompute.ts for the full design.
export const maxDuration = 60;

const JOB_NAME = "weekly-intelligence";

export async function GET(request: Request) {
  const startedAt = new Date();
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const internalSecret = process.env.NOTIFICATION_WORKER_SECRET;
  if (!internalSecret) {
    return NextResponse.json({ error: "NOTIFICATION_WORKER_SECRET is not configured" }, { status: 500 });
  }

  try {
    const cycle = await runWeeklyIntelligenceCycle(internalSecret, "scheduled");
    if (!cycle.success) {
      await logCronRun(JOB_NAME, startedAt, "failure", cycle.error);
      return NextResponse.json({ ranAt: new Date().toISOString(), success: false, error: cycle.error }, { status: 500 });
    }
    await logCronRun(
      JOB_NAME,
      startedAt,
      cycle.skipped ? "skipped" : "success",
      cycle.skipped ? (cycle.reason ?? "Skipped") : `health=${cycle.healthScore} recession=${cycle.recessionProbability}% default=${cycle.defaultProbability}%`,
    );
    return NextResponse.json({
      ranAt: new Date().toISOString(),
      success: true,
      skipped: cycle.skipped,
      reason: cycle.reason,
      healthScore: cycle.healthScore,
      recessionProbability: cycle.recessionProbability,
      defaultProbability: cycle.defaultProbability,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[WeeklyIntelligence] cron run failed: ${message}`);
    await logCronRun(JOB_NAME, startedAt, "failure", message);
    return NextResponse.json({ ranAt: new Date().toISOString(), success: false, error: message }, { status: 500 });
  }
}
