import { NextResponse } from "next/server";
import { auditSbpFreshness } from "@/lib/data/sbpFreshnessAudit";

// On-demand SBP EasyData freshness audit — Phase 18 (SBP Pipeline Reliability).
//
// Same check that runs automatically as Step 9 of the 15-minute sync
// pipeline (syncPipeline.ts / sbpFreshnessAudit.ts), exposed here for
// on-demand inspection without waiting for the next cron cycle. Read-only
// against SBP EasyData except for the self-healing cache invalidation the
// audit itself performs when it finds an indicator behind SBP's own
// published "Available Upto" date — see sbpFreshnessAudit.ts for the full
// self-healing behaviour.
//
// Auth: same CRON_SECRET bearer token used by every other /api/admin/* and
// /api/cron/* route in this project.
// Usage: GET /api/admin/sbp-freshness

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const startMs = Date.now();
  const entries = await auditSbpFreshness();

  const summary = {
    checked: entries.length,
    fresh: entries.filter((e) => e.status === "fresh").length,
    staleSelfHealed: entries.filter((e) => e.status === "stale-self-healed").length,
    staleNeedsReview: entries.filter((e) => e.status === "stale-needs-review").length,
    metaUnavailable: entries.filter((e) => e.status === "meta-unavailable").length,
    serveError: entries.filter((e) => e.status === "serve-error").length,
  };

  return NextResponse.json({
    ranAt: new Date().toISOString(),
    durationMs: Date.now() - startMs,
    summary,
    entries,
  });
}
