import { NextResponse } from "next/server";
import { runSyncPipeline } from "@/lib/economicCalendar/automation/syncPipeline";
import { detectTriggerMeta } from "@/lib/economicCalendar/automation/schedulerMeta";
import { logSyncTrigger } from "@/lib/syncTriggerLog";

// Scheduler-agnostic sync endpoint — Phase 4 (Part 1).
//
// This route is a thin HTTP adapter. It has three responsibilities:
//   1. Authenticate the caller (CRON_SECRET bearer token).
//   2. Detect which scheduler triggered this invocation from request headers.
//   3. Call the scheduler-agnostic sync pipeline (syncPipeline.ts) and log
//      the trigger metadata.
//
// The sync pipeline itself (syncPipeline.ts) has no knowledge of HTTP,
// schedulers, or this route — it can be called from any context.
//
// Supported schedulers (all send Authorization: Bearer ${CRON_SECRET}):
//   • Vercel Cron             (sends x-vercel-deployment-id)
//   • GitHub Actions          (send x-github-run-id / x-github-workflow)
//   • Railway Cron            (User-Agent contains "railway")
//   • Render Cron             (sends x-render-origin-region)
//   • EasyCron / cron-job.org (User-Agent pattern)
//   • GitLab Scheduled        (sends x-gitlab-event)
//   • Any HTTP scheduler      (set x-scheduler-name: <name> to self-identify)
//
// maxDuration is Vercel-specific; other platforms ignore it.
export const maxDuration = 300;

export async function GET(request: Request) {
  // ── Authentication ─────────────────────────────────────────────────────────
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const triggeredAt = new Date();
  const meta = detectTriggerMeta(request.headers);

  // ── Run the sync pipeline ─────────────────────────────────────────────────
  const result = await runSyncPipeline(meta);

  // ── Log the trigger (best-effort — never fails the response) ─────────────
  void logSyncTrigger({
    triggeredAt,
    finishedAt: new Date(),
    schedulerName: meta.schedulerName,
    triggerType: meta.triggerType,
    schedulerVersion: meta.schedulerVersion,
    requestId: meta.requestId,
    authMethod: meta.authMethod,
    jobsSummary: result.jobsSummary,
    totalSynced: result.totalSynced,
    totalFailed: result.totalFailed,
  });

  return NextResponse.json({
    ranAt: result.triggeredAt,
    scheduler: meta.schedulerName,
    durationMs: result.totalDurationMs,
    totalSynced: result.totalSynced,
    totalFailed: result.totalFailed,
    officialCalendars: result.officialCalendars,
    gapDetection: result.gapDetection,
    results: result.syncResults,
    lsmResult: result.lsmResult,
    notifications: result.notifications,
  });
}
