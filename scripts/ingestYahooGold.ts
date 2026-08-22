// Production Ingestion Runner — Yahoo Gold Monthly canonicalization pilot (Phase 8.17).
//
// Deliberately thin: ALL fetch/validate/diff/retry/persistence logic is the
// already-certified Phase 8.1 generic orchestrator
// (src/lib/providers/ingestionOrchestrator.ts's ingestManySeries) driven by
// the Phase 8.17 yahooGoldAdapter. This script does not reimplement any of
// that — it only supplies the approved single-job list, loads credentials
// the exact same way scripts/ingestFred.ts already does (same
// NOTIFICATION_WORKER_SECRET, same NEXT_PUBLIC_SUPABASE_URL/ANON_KEY, same
// .env.local — Yahoo's endpoint is keyless, so no provider API key is
// needed at all), and logs the run to cron_run_log via the existing
// logCronRun() helper.
//
// Scope: EXACTLY the 1 approved series (see
// src/lib/providers/yahooGoldAdapter.ts's YAHOO_GOLD_INDICATOR_KEY) —
// yahoo:goldMonthly. No Silver, no DXY, no Market FX, nothing else.
//
// Phase 8.17: NOT scheduled. Task Scheduler registration is explicitly out
// of scope for this pilot phase. Runnable manually via `npm run ingest:yahoogold`.

import { config as loadEnv } from "dotenv";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ingestManySeries, type IngestJob } from "@/lib/providers/ingestionOrchestrator";
import { yahooGoldAdapter, YAHOO_GOLD_INDICATOR_KEY } from "@/lib/providers/yahooGoldAdapter";
import { logCronRun } from "@/lib/cronLogging";

const JOB_NAME = "yahoo-gold-monthly-ingestion";

loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY not set — check .env.local");
  }
  return createClient(url, anonKey);
}

async function main(): Promise<void> {
  const startedAt = new Date();
  const runId = randomUUID();

  const internalSecret = process.env.NOTIFICATION_WORKER_SECRET;
  if (!internalSecret) {
    console.error("[ingest:yahoogold] NOTIFICATION_WORKER_SECRET is not set — cannot write to Supabase. Check .env.local.");
    process.exit(1);
  }

  const supabase = getSupabase();
  const jobs: IngestJob[] = [{ adapter: yahooGoldAdapter, indicatorKey: YAHOO_GOLD_INDICATOR_KEY }];

  console.log(`[ingest:yahoogold] Started — run ${runId} — ${startedAt.toISOString()}`);
  console.log(`[ingest:yahoogold] Approved series (${jobs.length}, and ONLY this): ${jobs.map((j) => j.indicatorKey).join(", ")}`);
  console.log("");

  const outcomes = await ingestManySeries(supabase, internalSecret, runId, jobs, { concurrency: 1 });

  for (const outcome of outcomes) {
    if (outcome.status === "unchanged") {
      console.log(`  · ${outcome.indicatorKey}: no change (latest=${outcome.latestPeriod ?? "n/a"})`);
    } else if (outcome.status === "updated") {
      console.log(`  ✓ ${outcome.indicatorKey}: updated — ${outcome.periodsWritten} period(s) written, latest=${outcome.latestPeriod}`);
    } else {
      console.error(`  ✗ ${outcome.indicatorKey}: FAILED — ${outcome.error}`);
    }
  }

  const unchanged = outcomes.filter((o) => o.status === "unchanged").length;
  const updated = outcomes.filter((o) => o.status === "updated").length;
  const failed = outcomes.filter((o) => o.status === "failed").length;
  const durationSec = ((Date.now() - startedAt.getTime()) / 1000).toFixed(1);

  const summaryLines = [
    `Fetched ${outcomes.length} Yahoo series`,
    `${unchanged} unchanged`,
    `${updated} updated`,
    `${failed} failed`,
    `Finished in ${durationSec}s`,
  ];
  if (updated > 0) {
    summaryLines.push(`Updated: ${outcomes.filter((o) => o.status === "updated").map((o) => o.indicatorKey).join(", ")}`);
  }
  if (failed > 0) {
    summaryLines.push(`Failed: ${outcomes.filter((o) => o.status === "failed").map((o) => `${o.indicatorKey} (${o.error})`).join("; ")}`);
  }

  console.log("");
  console.log(`[ingest:yahoogold] ${summaryLines.join(" | ")}`);

  const overallStatus = outcomes.length > 0 && failed === outcomes.length ? "failure" : "success";
  await logCronRun(JOB_NAME, startedAt, overallStatus, summaryLines.join(" | "));

  process.exit(overallStatus === "failure" ? 1 : 0);
}

main().catch((err) => {
  console.error("[ingest:yahoogold] Fatal error:", err instanceof Error ? (err.stack ?? err.message) : String(err));
  process.exit(1);
});
