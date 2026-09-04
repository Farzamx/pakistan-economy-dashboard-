import { NextResponse } from "next/server";
import { runMacroIntelligenceSnapshotCycle } from "@/lib/macroIntelligenceSnapshotCompute";
import { logCronRun } from "@/lib/cronLogging";

// Macro Intelligence Signal History & Regime Persistence (Phase 10.1).
//
// Vercel Cron target (see vercel.json) — runs once daily. Builds the
// existing, unmodified Macro Intelligence report and persists a compact
// snapshot of it (migration 0053) so /macro-intelligence can show how long
// each dimension's state has persisted and whether it recently changed.
// This route performs no signal computation itself; see
// macroIntelligenceSnapshotCompute.ts for why this is a separate daily
// cycle rather than folded into the existing weekly-intelligence cron.
//
// Auth follows the exact same pattern as every other cron route in this
// project: Vercel sends `Authorization: Bearer ${CRON_SECRET}` automatically
// for scheduled invocations; the trusted internal RPC secret
// (NOTIFICATION_WORKER_SECRET) is separate and gates the actual database
// write, matching weekly-intelligence/route.ts's identical two-secret
// pattern.
export const maxDuration = 30;

const JOB_NAME = "macro-intelligence-snapshot";

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
    const cycle = await runMacroIntelligenceSnapshotCycle(internalSecret);
    if (!cycle.success) {
      await logCronRun(JOB_NAME, startedAt, "failure", cycle.error);
      return NextResponse.json({ ranAt: new Date().toISOString(), success: false, error: cycle.error }, { status: 500 });
    }
    await logCronRun(
      JOB_NAME,
      startedAt,
      cycle.skipped ? "skipped" : "success",
      cycle.skipped ? "A snapshot for today already exists." : `Persisted ${cycle.dimensionCount} dimension(s).`,
    );
    return NextResponse.json({
      ranAt: new Date().toISOString(),
      success: true,
      skipped: cycle.skipped,
      dimensionCount: cycle.dimensionCount,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[MacroIntelligenceSnapshot] cron run failed: ${message}`);
    await logCronRun(JOB_NAME, startedAt, "failure", message);
    return NextResponse.json({ ranAt: new Date().toISOString(), success: false, error: message }, { status: 500 });
  }
}
