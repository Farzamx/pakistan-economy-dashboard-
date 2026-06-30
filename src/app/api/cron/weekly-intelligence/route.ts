import { NextResponse } from "next/server";
import { computeWeeklyIntelligence } from "@/lib/weeklyIntelligenceCompute";
import { storeWeeklyIntelligenceSnapshot, getLatestWeeklyIntelligenceSnapshot } from "@/lib/data/weeklyIntelligence";
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
export const maxDuration = 60;

const JOB_NAME = "weekly-intelligence";

/** Monday 00:00 UTC of the week containing `now` — ISO-8601 week start, matching the DB's date_trunc('week', ...) boundary (0019 migration) exactly. */
function mostRecentMondayUtc(now: Date): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const isoDayOfWeek = d.getUTCDay() === 0 ? 7 : d.getUTCDay(); // Sun=0 -> 7, so Mon=1..Sun=7
  d.setUTCDate(d.getUTCDate() - (isoDayOfWeek - 1));
  return d;
}

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
    // Cheap pre-check (Final Production Hardening Part 1): avoids paying
    // for a full live-data fetch + AI narration cycle on a duplicate
    // invocation (Vercel Cron's documented at-least-once delivery, a
    // manual re-trigger, etc.) when we already know this week is done.
    // This is an optimization, not the actual guarantee — the database's
    // unique constraint on week_start (0019 migration) is what makes a
    // duplicate genuinely impossible even if two requests race past this
    // check at the same instant.
    const existing = await getLatestWeeklyIntelligenceSnapshot();
    if (existing && new Date(existing.computedAt) >= mostRecentMondayUtc(new Date())) {
      await logCronRun(JOB_NAME, startedAt, "skipped", "Already computed this ISO week");
      return NextResponse.json({ ranAt: new Date().toISOString(), success: true, skipped: true, reason: "Already computed this ISO week", lastComputedAt: existing.computedAt });
    }

    const payload = await computeWeeklyIntelligence();
    const result = await storeWeeklyIntelligenceSnapshot(payload, internalSecret);
    if (!result.success) {
      await logCronRun(JOB_NAME, startedAt, "failure", result.error);
      return NextResponse.json({ ranAt: new Date().toISOString(), success: false, error: result.error }, { status: 500 });
    }
    await logCronRun(
      JOB_NAME,
      startedAt,
      result.skipped ? "skipped" : "success",
      result.skipped ? "Duplicate-week insert rejected by DB constraint" : `health=${payload.healthScore} recession=${payload.recessionProbability}% default=${payload.defaultProbability}%`,
    );
    return NextResponse.json({
      ranAt: new Date().toISOString(),
      success: true,
      skipped: result.skipped ?? false,
      healthScore: payload.healthScore,
      recessionProbability: payload.recessionProbability,
      defaultProbability: payload.defaultProbability,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[WeeklyIntelligence] cron run failed: ${message}`);
    await logCronRun(JOB_NAME, startedAt, "failure", message);
    return NextResponse.json({ ranAt: new Date().toISOString(), success: false, error: message }, { status: 500 });
  }
}
