import { NextResponse } from "next/server";
import { syncAllFromSbpEasyData } from "@/lib/economicCalendar/automation/syncFromSbpEasyData";
import { syncOfficialCalendars } from "@/lib/economicCalendar/automation/syncOfficialCalendars";
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

  // Official calendar sync runs first: if SBP just postponed a date, the
  // actual-value sync below must see that the row is no longer 'scheduled'
  // before it ever tries to release it. Each step is independently
  // try/caught (Part 5 robustness fix) so a hard throw in one — previously
  // unguarded, meaning it would have silently skipped the other two steps
  // entirely and left no log of any of it — can't prevent the other two
  // independent jobs from running, and every step gets a history entry
  // even on a genuine crash, not just a clean error-status result.
  let startedAt = new Date();
  let officialCalendars: Awaited<ReturnType<typeof syncOfficialCalendars>> = [];
  try {
    officialCalendars = await syncOfficialCalendars();
    const officialErrors = officialCalendars.filter((r) => r.status === "error");
    // "skipped-fetch-or-parse-failed" is a graceful degradation (official
    // source unreachable this run, existing data left untouched) — not a
    // job failure the way a genuine "error" status is.
    await logCronRun("official-calendar-sync", startedAt, officialErrors.length > 0 ? "failure" : "success", officialCalendars.map((r) => `${r.seriesSlug}:${r.status}`).join(", "));
  } catch (err) {
    await logCronRun("official-calendar-sync", startedAt, "failure", err instanceof Error ? err.message : String(err));
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

  return NextResponse.json({ ranAt: new Date().toISOString(), officialCalendars, results, notifications });
}
