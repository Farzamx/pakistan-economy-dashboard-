import { NextResponse } from "next/server";
import { processNotificationJobs } from "@/lib/notifications/notificationJobWorker";

// Vercel Cron target (see vercel.json) — safety net for the notification
// job worker. The 9 automated economic-calendar series get near-immediate
// processing because sync-economic-calendar's cron calls
// processNotificationJobs() inline right after detecting a release; this
// route exists for everything that path doesn't cover:
//   - Manually-released events (Federal Budget, Economic Survey, etc.) —
//     their notification_jobs row is created by the same database trigger,
//     but nothing inline triggers sending for them.
//   - Resuming a job that didn't finish within one invocation's time
//     budget (see notificationJobWorker.ts's TIME_BUDGET_MS).
//   - Retrying a job that previously ended 'failed' or 'partial'.
// Same CRON_SECRET auth pattern as every other cron route in this project.
export const maxDuration = 300;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const summaries = await processNotificationJobs();
  return NextResponse.json({ ranAt: new Date().toISOString(), summaries });
}
