import { NextResponse } from "next/server";
import { runIngestionWatchdog, MONITORED_INGESTION_JOBS, type WatchdogResult } from "@/lib/ingestionWatchdog";
import { logCronRun } from "@/lib/cronLogging";

// Vercel Cron target (see vercel.json) — the watchdog's own trigger, entirely
// separate from any monitored ingestion job's own trigger (a Windows Task
// Scheduler task on the ingestion machine — see docs/local-ingestion-setup.md
// for both SBP's and World Bank's). That separation is the point: this route
// must keep running — and keep able to alert — even when the ingestion
// machine is off, asleep, or has been failing for days.
//
// Phase 8.6: this route now evaluates every job in MONITORED_INGESTION_JOBS
// (currently SBP + World Bank), not just SBP — the route path/name is
// unchanged (Phase 8.6 brief: do not rename it, do not add a second cron
// route), and the Vercel Cron schedule (0 9 * * *) is unchanged. Daily
// granularity is far finer than either monitored job's own threshold (36h
// for SBP, 216h for World Bank), so one existing daily check remains
// sufficient for both — see the Phase 8.5 audit / Phase 8.6 report for the
// detection-latency reasoning.
//
// Each job is evaluated independently and in isolation: one job's
// unexpected failure must never prevent the other from being evaluated,
// and must never be silently reported as if all jobs succeeded.
//
// Auth follows the exact same pattern as every other /api/cron/* route:
// Vercel sends `Authorization: Bearer ${CRON_SECRET}` automatically for
// scheduled invocations; anything else is rejected before any other code runs.
//
// Observability: runIngestionWatchdog() already writes its own cron_run_log
// row under that job's own watchdogJobName on every normal path (healthy,
// stale-and-alerted, stale-and-suppressed) — this route does NOT log a
// second row for that case; doing so would double-log every invocation. It
// logs its own failure row, under that SAME job's watchdogJobName, only in
// the one case the inner function cannot log for itself: an unexpected
// exception that prevents it from reaching its own logCronRun call. Without
// that, a crash here would be invisible in cron_run_log rather than a
// recorded failure — and it must never be attributed to the wrong job.
export const maxDuration = 60;

interface JobOutcome {
  ingestionJobName: string;
  label: string;
  ok: boolean;
  state?: string;
  lastSuccessAt?: string | null;
  ageMs?: number | null;
  alertSent?: boolean;
  alertAlreadySent?: boolean;
  reason?: string;
  error?: string;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const outcomes: JobOutcome[] = [];

  for (const job of MONITORED_INGESTION_JOBS) {
    const startedAt = new Date();
    try {
      const result: WatchdogResult = await runIngestionWatchdog(job);
      outcomes.push({
        ingestionJobName: job.ingestionJobName,
        label: job.label,
        ok: true,
        state: result.health.state,
        lastSuccessAt: result.health.lastSuccessAt,
        ageMs: result.health.ageMs,
        alertSent: result.alertSent,
        alertAlreadySent: result.health.alertAlreadySent,
        reason: result.reason,
      });
    } catch (err) {
      // Reached only if runIngestionWatchdog() itself throws for THIS job —
      // every call it makes internally (DB reads, sendEmail, its own
      // logCronRun) already catches its own errors, so this path is
      // defence-in-depth against a genuine bug, not an expected outcome.
      // One job's crash must not prevent the loop from evaluating the rest.
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[IngestionWatchdog] route-level failure for ${job.ingestionJobName}: ${message}`);
      // The raw exception message goes to the server console and to
      // cron_run_log's detail column (both admin-only, useful for
      // diagnosis) but deliberately NOT into the HTTP response: an
      // unanticipated exception is exactly the case where the message's
      // contents aren't under this route's control, so the safest default
      // is to never echo it externally.
      await logCronRun(job.watchdogJobName, startedAt, "failure", `route-level error: ${message}`);
      outcomes.push({ ingestionJobName: job.ingestionJobName, label: job.label, ok: false, error: "watchdog invocation failed" });
    }
  }

  const anyFailed = outcomes.some((o) => !o.ok);
  return NextResponse.json(
    { ranAt: new Date().toISOString(), jobs: outcomes },
    { status: anyFailed ? 500 : 200 },
  );
}
