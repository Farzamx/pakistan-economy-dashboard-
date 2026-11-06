// Production Ingestion Runner — World Bank GDP-growth pilot (Phase 8.3).
//
// Deliberately thin: ALL fetch/validate/diff/retry/persistence logic is the
// already-certified Phase 8.1 generic orchestrator
// (src/lib/providers/ingestionOrchestrator.ts's ingestManySeries) driven by
// the already-certified Phase 8.2 worldBankAdapter. This script does not
// reimplement any of that — it only supplies the approved job list, loads
// credentials the exact same way scripts/ingestSbp.ts already does (same
// NOTIFICATION_WORKER_SECRET, same NEXT_PUBLIC_SUPABASE_URL/ANON_KEY, same
// .env.local), and logs the run to cron_run_log via the existing
// logCronRun() helper (the same generic table/RPC every other scheduled
// job in this project already uses).
//
// Scope: EXACTLY the 3 approved World Bank GDP-growth series (see
// src/lib/providers/worldBankAdapter.ts's WORLD_BANK_SERIES) — nothing
// else.
//
// Phase 8.4: scheduled weekly (Mondays 08:15 PKT) via the Windows Task
// Scheduler task "PEIC - World Bank GDP Ingestion" — a separate task from
// "PEIC SBP Ingestion", same laptop, same architecture, own trigger and
// own MultipleInstances scope. See docs/local-ingestion-setup.md's "World
// Bank GDP-growth ingestion" section for the full setup/rationale. Still
// runnable manually at any time via `npm run ingest:worldbank`; no
// ingestion logic lives in the scheduler itself, only the trigger.
//
// Usage: npm run ingest:worldbank

import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ingestManySeries, type IngestJob } from "@/lib/providers/ingestionOrchestrator";
import { worldBankAdapter, WORLD_BANK_SERIES } from "@/lib/providers/worldBankAdapter";
import { logCronRun } from "@/lib/cronLogging";
import { enterScript, runIfEntryPoint } from "@/lib/providers/scriptEntry";

const JOB_NAME = "worldbank-gdp-growth-ingestion";

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
    console.error("[ingest:worldbank] NOTIFICATION_WORKER_SECRET is not set — cannot write to Supabase. Check .env.local.");
    process.exit(1);
  }

  const supabase = getSupabase();
  const jobs: IngestJob[] = Object.keys(WORLD_BANK_SERIES).map((indicatorKey) => ({ adapter: worldBankAdapter, indicatorKey }));

  console.log(`[ingest:worldbank] Started — run ${runId} — ${startedAt.toISOString()}`);
  console.log(`[ingest:worldbank] Approved series (${jobs.length}, and ONLY these): ${jobs.map((j) => j.indicatorKey).join(", ")}`);
  console.log("");

  const outcomes = await ingestManySeries(supabase, internalSecret, runId, jobs, { concurrency: 3 });

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
    `Fetched ${outcomes.length} World Bank series`,
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
  console.log(`[ingest:worldbank] ${summaryLines.join(" | ")}`);

  const overallStatus = outcomes.length > 0 && failed === outcomes.length ? "failure" : "success";
  await logCronRun(JOB_NAME, startedAt, overallStatus, summaryLines.join(" | "));

  process.exit(overallStatus === "failure" ? 1 : 0);
}

// Phase F.2b-S: importing this module is inert. The job starts (and .env.local is loaded) only when this file is
// the program being executed — Task Scheduler, `npm run ingest:worldbank` and `npx tsx` all qualify. See
// src/lib/providers/scriptEntry.ts.
runIfEntryPoint({ filename: __filename, requireMain: typeof require !== "undefined" && require.main === module }, () => {
  enterScript("ingest:worldbank");
  main().catch((err) => {
    console.error("[ingest:worldbank] Fatal error:", err instanceof Error ? (err.stack ?? err.message) : String(err));
    process.exit(1);
  });
});
