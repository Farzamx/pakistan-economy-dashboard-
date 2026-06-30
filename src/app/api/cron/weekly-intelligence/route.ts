import { NextResponse } from "next/server";
import { computeWeeklyIntelligence } from "@/lib/weeklyIntelligenceCompute";
import { storeWeeklyIntelligenceSnapshot } from "@/lib/data/weeklyIntelligence";

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

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const internalSecret = process.env.NOTIFICATION_WORKER_SECRET;
  if (!internalSecret) {
    return NextResponse.json({ error: "NOTIFICATION_WORKER_SECRET is not configured" }, { status: 500 });
  }

  try {
    const payload = await computeWeeklyIntelligence();
    const result = await storeWeeklyIntelligenceSnapshot(payload, internalSecret);
    if (!result.success) {
      return NextResponse.json({ ranAt: new Date().toISOString(), success: false, error: result.error }, { status: 500 });
    }
    return NextResponse.json({
      ranAt: new Date().toISOString(),
      success: true,
      healthScore: payload.healthScore,
      recessionProbability: payload.recessionProbability,
      defaultProbability: payload.defaultProbability,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[WeeklyIntelligence] cron run failed: ${message}`);
    return NextResponse.json({ ranAt: new Date().toISOString(), success: false, error: message }, { status: 500 });
  }
}
