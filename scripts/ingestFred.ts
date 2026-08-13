// Production Ingestion Runner — FRED monthly canonicalization pilot (Phase 8.12).
//
// Deliberately thin: ALL fetch/validate/diff/retry/persistence logic is the
// already-certified Phase 8.1 generic orchestrator
// (src/lib/providers/ingestionOrchestrator.ts's ingestManySeries) driven by
// the Phase 8.12 fredAdapter. This script does not reimplement any of
// that — it only supplies the approved job list, loads credentials the
// exact same way scripts/ingestWorldBank.ts already does (same
// NOTIFICATION_WORKER_SECRET, same NEXT_PUBLIC_SUPABASE_URL/ANON_KEY, same
// .env.local — plus FRED_API_KEY, read directly by fredAdapter.ts itself),
// and logs the run to cron_run_log via the existing logCronRun() helper.
//
// Scope: EXACTLY the 2 approved FRED series (see
// src/lib/providers/fredAdapter.ts's FRED_SERIES) — fred:fedFunds and
// fred:usCpiInflation. No native-daily FRED series, no other FRED series,
// nothing else.
//
// Phase 8.14: registered with Windows Task Scheduler as "PEIC - FRED Monthly
// Ingestion" (weekly, Mondays 08:45 PKT — see src/lib/ingestionWatchdog.ts's
// FRED_MONITOR_JOB for the full schedule/threshold rationale, reconfirmed
// live in Phase 8.21). Still runnable manually via `npm run ingest:fred`.

import { config as loadEnv } from "dotenv";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ingestManySeries, type IngestJob } from "@/lib/providers/ingestionOrchestrator";
import { fredAdapter, FRED_SERIES } from "@/lib/providers/fredAdapter";
import { logCronRun } from "@/lib/cronLogging";

const JOB_NAME = "fred-monthly-ingestion";

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
    console.error("[ingest:fred] NOTIFICATION_WORKER_SECRET is not set — cannot write to Supabase. Check .env.local.");
    process.exit(1);
  }
  if (!process.env.FRED_API_KEY) {
    console.error("[ingest:fred] FRED_API_KEY is not set — check .env.local.");
    process.exit(1);
  }

  const supabase = getSupabase();
  const jobs: IngestJob[] = Object.keys(FRED_SERIES).map((indicatorKey) => ({ adapter: fredAdapter, indicatorKey }));

  console.log(`[ingest:fred] Started — run ${runId} — ${startedAt.toISOString()}`);
  console.log(`[ingest:fred] Approved series (${jobs.length}, and ONLY these): ${jobs.map((j) => j.indicatorKey).join(", ")}`);
  console.log("");

  const outcomes = await ingestManySeries(supabase, internalSecret, runId, jobs, { concurrency: 2 });

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
    `Fetched ${outcomes.length} FRED series`,
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
  console.log(`[ingest:fred] ${summaryLines.join(" | ")}`);

  const overallStatus = outcomes.length > 0 && failed === outcomes.length ? "failure" : "success";
  await logCronRun(JOB_NAME, startedAt, overallStatus, summaryLines.join(" | "));

  process.exit(overallStatus === "failure" ? 1 : 0);
}

main().catch((err) => {
  console.error("[ingest:fred] Fatal error:", err instanceof Error ? (err.stack ?? err.message) : String(err));
  process.exit(1);
});
