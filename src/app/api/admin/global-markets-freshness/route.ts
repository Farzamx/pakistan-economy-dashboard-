import { NextResponse } from "next/server";
import { auditGlobalMarketsFreshness } from "@/lib/data/globalMarketsFreshnessAudit";

// On-demand Global Markets freshness audit — Phase XX (Global Markets Data
// Freshness Audit & Permanent Fix). Same check that runs automatically via
// the hourly GitHub Actions cron (.github/workflows/global-markets-freshness.yml
// -> /api/cron/global-markets-freshness), exposed here for on-demand
// inspection without waiting for the next cycle. Read-only against every
// upstream source except for the self-healing cache invalidation the audit
// itself performs when it finds an indicator behind a genuinely live
// re-check — see globalMarketsFreshnessAudit.ts.
//
// Auth: same CRON_SECRET bearer token used by every other /api/admin/* and
// /api/cron/* route in this project.
// Usage: GET /api/admin/global-markets-freshness

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const startMs = Date.now();
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

  return NextResponse.json({
    ranAt: new Date().toISOString(),
    durationMs: Date.now() - startMs,
    summary,
    entries,
  });
}
