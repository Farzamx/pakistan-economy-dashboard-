import { NextResponse } from "next/server";
import { syncAllFromSbpEasyData } from "@/lib/economicCalendar/automation/syncFromSbpEasyData";
import { syncOfficialCalendars } from "@/lib/economicCalendar/automation/syncOfficialCalendars";
import { detectAndFillCalendarGaps } from "@/lib/economicCalendar/automation/detectCalendarGaps";
import { processNotificationJobs } from "@/lib/notifications/notificationJobWorker";
import { logCronRun } from "@/lib/cronLogging";

// Vercel Cron target (see vercel.json) — runs Priority 1 automation (SBP
// EasyData actual-value sync) daily. Authenticated via CRON_SECRET, the
// standard Vercel Cron pattern: Vercel sends `Authorization: Bearer
// ${CRON_SECRET}` automatically for scheduled invocations, so this route
// rejects any request that doesn't present it — without this check, the
// route would be a public, unauthenticated trigger for repeated SBP
// EasyData calls.
//
// Also drains pending notification jobs inline, right after the sync —
// not via a separate, more-frequent schedule, since this project's only
// available cron frequency is once/day (Vercel Hobby). sync_event_actual
// fires the trg_create_notification_job trigger synchronously, so by the
// time syncAllFromSbpEasyData() returns, any new job from this run already
// exists and is ready to be picked up in the same invocation — this is
// what gives the 9 automated series near-immediate notification delivery
// instead of waiting for process-notification-jobs' separate safety-net
// schedule.
//
// maxDuration set explicitly to the Hobby plan's ceiling — this route now
// does meaningfully more work than the SBP sync alone (see
// notificationJobWorker.ts's TIME_BUDGET_MS), so it shouldn't rely on
// whatever Vercel's project-level default happens to be.
export const maxDuration = 300;

// Cron History (Final Production Hardening Part 5): this single route/cron
// trigger does 3 logically distinct jobs back to back. Logged as 3
// separate job_name entries (not 1) so System Health can show each one's
// own success/failure history independently — they happen to share one
// HTTP invocation for scheduling reasons (Vercel Hobby's once/day cron
// ceiling), not because they're actually the same operation.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Step 1: Official calendar sync — if SBP postponed a date, the actual-value
  // sync below must see the updated row before it tries to release it.
  //
  // Step 2: Gap detection — creates missing scheduled events for automated monthly
  // series. Runs before the actual-value sync so that newly created events can be
  // filled in the same cron pass. Requires NOTIFICATION_WORKER_SECRET for the
  // create_missing_scheduled_event() SECURITY DEFINER RPC.
  //
  // Step 3: SBP EasyData actual-value sync — fills scheduled events (including
  // any just created by gap detection) with confirmed actual values.
  //
  // Step 4: Notification processing — drains the notification job queue produced
  // by sync_event_actual()'s trigger in step 3.
  //
  // Each step is independently try/caught so a hard throw in one does not prevent
  // the others from running, and every step gets its own cron_run_log entry.
  const workerSecret = process.env.NOTIFICATION_WORKER_SECRET ?? "";

  let startedAt = new Date();
  let officialCalendars: Awaited<ReturnType<typeof syncOfficialCalendars>> = [];
  try {
    officialCalendars = await syncOfficialCalendars();
    const officialErrors = officialCalendars.filter((r) => r.status === "error");
    // "skipped-fetch-or-parse-failed" is graceful degradation — not a job failure.
    await logCronRun("official-calendar-sync", startedAt, officialErrors.length > 0 ? "failure" : "success", officialCalendars.map((r) => `${r.seriesSlug}:${r.status}`).join(", "));
  } catch (err) {
    await logCronRun("official-calendar-sync", startedAt, "failure", err instanceof Error ? err.message : String(err));
  }

  startedAt = new Date();
  let gapDetection: Awaited<ReturnType<typeof detectAndFillCalendarGaps>> = [];
  try {
    gapDetection = await detectAndFillCalendarGaps(workerSecret);
    const gapErrors = gapDetection.filter((r) => r.status === "error");
    const gapsFilled = gapDetection.filter((r) => r.status === "gaps-filled");
    const summary = gapsFilled.length > 0
      ? `${gapsFilled.reduce((sum, r) => sum + r.created.length, 0)} event(s) created: ${gapsFilled.flatMap((r) => r.created).join(", ")}`
      : "no gaps detected";
    await logCronRun("calendar-gap-detection", startedAt, gapErrors.length > 0 ? "failure" : "success", summary);
  } catch (err) {
    await logCronRun("calendar-gap-detection", startedAt, "failure", err instanceof Error ? err.message : String(err));
  }

  startedAt = new Date();
  let results: Awaited<ReturnType<typeof syncAllFromSbpEasyData>> = [];
  try {
    results = await syncAllFromSbpEasyData();
    const syncErrors = results.filter((r) => r.status === "error");
    await logCronRun("sbp-actual-value-sync", startedAt, syncErrors.length > 0 ? "failure" : "success", results.map((r) => `${r.seriesSlug}:${r.status}`).join(", "));
  } catch (err) {
    await logCronRun("sbp-actual-value-sync", startedAt, "failure", err instanceof Error ? err.message : String(err));
  }

  startedAt = new Date();
  let notifications: Awaited<ReturnType<typeof processNotificationJobs>> = [];
  try {
    notifications = await processNotificationJobs();
    const totalFailed = notifications.reduce((sum, n) => sum + n.failedThisPass, 0);
    await logCronRun("notification-worker", startedAt, totalFailed > 0 ? "failure" : "success", `${notifications.length} job(s) processed, ${totalFailed} email send failure(s)`);
  } catch (err) {
    await logCronRun("notification-worker", startedAt, "failure", err instanceof Error ? err.message : String(err));
  }

  return NextResponse.json({ ranAt: new Date().toISOString(), officialCalendars, gapDetection, results, notifications });
}
