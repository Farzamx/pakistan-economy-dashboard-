import { NextResponse } from "next/server";
import { auditGlobalMarketsFreshness } from "@/lib/data/globalMarketsFreshnessAudit";
import { logCronRun } from "@/lib/cronLogging";

// Global Markets Freshness Audit cron — Phase XX (Global Markets Data
// Freshness Audit & Permanent Fix).
//
// Root cause this closes: the 8 Yahoo Finance/FRED/Twelve Data-backed
// indicators (gold/silver/wti/brent/natural-gas/dxy/us10y/fed-funds) had no
// cache tags and nothing ever proactively re-checked them against upstream
// — only a passive time-based cache window with no automated drift
// detection, unlike SBP EasyData's existing freshness audit. Triggered by
// .github/workflows/global-markets-freshness.yml every hour (matching
// Yahoo Finance's own 1h revalidate window — the tightest cadence among the
// 12 indicators; FRED/Twelve Data change far less often, so this cadence is
// more than enough for them too), the same "GitHub Actions for frequent
// polling, thin HTTP adapter" pattern already established by
// sync-economic-calendar.yml -> /api/cron/sync-economic-calendar.
//
// Auth: same CRON_SECRET bearer token used by every other /api/admin/* and
// /api/cron/* route in this project.
export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const startedAt = new Date();
  const entries = await auditGlobalMarketsFreshness();

  const summary = {
    checked: entries.length,
    fresh: entries.filter((e) => e.status === "fresh").length,
    closedWeekend: entries.filter((e) => e.status === "closed-weekend").length,
    closedHoliday: entries.filter((e) => e.status === "closed-holiday").length,
    selfHealed: entries.filter((e) => e.status === "self-healed").length,
    needsReview: entries.filter((e) => e.status === "needs-review").length,
    pipelineFailure: entries.filter((e) => e.status === "pipeline-failure").length,
    serveError: entries.filter((e) => e.status === "serve-error").length,
  };

  const concerning = entries.filter((e) => e.status === "needs-review" || e.status === "pipeline-failure" || e.status === "serve-error");
  const status = concerning.length > 0 ? "failure" : "success";
  const detail = concerning.length > 0
    ? `${concerning.length}/${entries.length} indicator(s) need review: ${concerning.map((e) => e.indicator).join(", ")}`
    : `All ${entries.length} indicators fresh or self-healed (${summary.selfHealed} self-healed).`;

  await logCronRun("global-markets-freshness", startedAt, status, detail);

  return NextResponse.json({
    ranAt: startedAt.toISOString(),
    durationMs: Date.now() - startedAt.getTime(),
    summary,
    entries,
  });
}
