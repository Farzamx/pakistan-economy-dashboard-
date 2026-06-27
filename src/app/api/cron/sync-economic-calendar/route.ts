import { NextResponse } from "next/server";
import { syncAllFromSbpEasyData } from "@/lib/economicCalendar/automation/syncFromSbpEasyData";

// Vercel Cron target (see vercel.json) — runs Priority 1 automation (SBP
// EasyData actual-value sync) daily. Authenticated via CRON_SECRET, the
// standard Vercel Cron pattern: Vercel sends `Authorization: Bearer
// ${CRON_SECRET}` automatically for scheduled invocations, so this route
// rejects any request that doesn't present it — without this check, the
// route would be a public, unauthenticated trigger for repeated SBP
// EasyData calls.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const results = await syncAllFromSbpEasyData();
  return NextResponse.json({ ranAt: new Date().toISOString(), results });
}
