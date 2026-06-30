import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { logCronRun } from "@/lib/cronLogging";

// Triggered once daily by Vercel Cron (see vercel.json) to force a clean
// refresh of the FX rates L2 cache (src/lib/data/fxRates.ts).
//
// Less load-bearing since the second-stage source audit (2026-06-22)
// migrated fxRates.ts from a once-daily provider to Yahoo Finance, which
// updates intraday — the 15-min L2 revalidate window now does most of the
// freshness work on its own with normal traffic. Kept as a free, harmless
// floor for the lowest-traffic overnight hours rather than removed; Hobby
// Vercel plans cap cron jobs at once/day regardless, so this is run at the
// most frequency available on that tier.
//
// Auth: Vercel automatically sends `Authorization: Bearer ${CRON_SECRET}`
// to cron-invoked requests when a CRON_SECRET env var is set on the project
// (https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs).
// Without CRON_SECRET configured, this route refuses all requests rather
// than running unauthenticated.
export async function GET(request: Request) {
  const startedAt = new Date();
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  revalidateTag("fx-rates", "max");
  await logCronRun("revalidate-fx", startedAt, "success", "revalidateTag('fx-rates')");
  return NextResponse.json({ revalidated: "fx-rates", at: new Date().toISOString() });
}
