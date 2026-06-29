import { NextResponse } from "next/server";
import { syncAllFromSbpEasyData } from "@/lib/economicCalendar/automation/syncFromSbpEasyData";
import { syncOfficialCalendars } from "@/lib/economicCalendar/automation/syncOfficialCalendars";
import { processNotificationJobs } from "@/lib/notifications/notificationJobWorker";

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

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Official calendar sync runs first: if SBP just postponed a date, the
  // actual-value sync below must see that the row is no longer 'scheduled'
  // before it ever tries to release it.
  const officialCalendars = await syncOfficialCalendars();
  const results = await syncAllFromSbpEasyData();
  const notifications = await processNotificationJobs();
  return NextResponse.json({ ranAt: new Date().toISOString(), officialCalendars, results, notifications });
}
