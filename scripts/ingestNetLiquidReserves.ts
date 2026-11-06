// Production Ingestion Runner — Net Liquid FX Reserves (Phase 8.10B).
//
// Deliberately thin: ALL fetch/validate/diff/retry/persistence logic is the
// already-certified Phase 8.1 generic orchestrator
// (src/lib/providers/ingestionOrchestrator.ts's ingestOneSeries) driven by
// the Phase 8.10B netLiquidReservesAdapter.ts. This script does not
// reimplement any of that — it only supplies the single job, loads
// credentials the exact same way scripts/ingestSbp.ts and
// scripts/ingestWorldBank.ts already do (same NOTIFICATION_WORKER_SECRET,
// same NEXT_PUBLIC_SUPABASE_URL/ANON_KEY, same .env.local), and logs the
// run to cron_run_log via the existing logCronRun() helper.
//
// Scope: EXACTLY the one series, "sbp-forex-arch:netLiquidReserves" —
// nothing else.
//
// NOT SCHEDULED. Per the Phase 8.10B brief, whether this needs its own
// Task Scheduler job (distinct from both "PEIC SBP Ingestion" and
// "PEIC - World Bank GDP Ingestion") is an explicit open decision requiring
// separate approval — see the Phase 8.10B report's Scheduling section. This
// script is runnable manually via `npm run ingest:netliquidreserves` for
// verification and any future manual/scheduled use, exactly mirroring how
// scripts/ingestWorldBank.ts existed and was run manually for one full
// phase (8.3) before its own scheduling was approved in a later, separate
// phase (8.4).
//
// Usage: npm run ingest:netliquidreserves

import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ingestOneSeries } from "@/lib/providers/ingestionOrchestrator";
import { netLiquidReservesAdapter, NET_LIQUID_RESERVES_INDICATOR_KEY } from "@/lib/providers/netLiquidReservesAdapter";
import { logCronRun } from "@/lib/cronLogging";
import { enterScript, runIfEntryPoint } from "@/lib/providers/scriptEntry";

const JOB_NAME = "netliquidreserves-ingestion";

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
    console.error("[ingest:netliquidreserves] NOTIFICATION_WORKER_SECRET is not set — cannot write to Supabase. Check .env.local.");
    process.exit(1);
  }

  const supabase = getSupabase();

  console.log(`[ingest:netliquidreserves] Started — run ${runId} — ${startedAt.toISOString()}`);
  console.log(`[ingest:netliquidreserves] Series (1, and ONLY this): ${NET_LIQUID_RESERVES_INDICATOR_KEY}`);
  console.log("");

  let outcome;
  try {
    outcome = await ingestOneSeries(supabase, internalSecret, runId, netLiquidReservesAdapter, NET_LIQUID_RESERVES_INDICATOR_KEY);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`  ✗ ${NET_LIQUID_RESERVES_INDICATOR_KEY}: FAILED — ${message}`);
    await logCronRun(JOB_NAME, startedAt, "failure", `Net Liquid FX Reserves ingestion failed: ${message}`);
    process.exit(1);
  }

  if (outcome.status === "unchanged") {
    console.log(`  · ${NET_LIQUID_RESERVES_INDICATOR_KEY}: no change (latest=${outcome.latestPeriod ?? "n/a"})`);
  } else {
    console.log(`  ✓ ${NET_LIQUID_RESERVES_INDICATOR_KEY}: updated — ${outcome.periodsWritten} period(s) written, latest=${outcome.latestPeriod}`);
  }

  const durationSec = ((Date.now() - startedAt.getTime()) / 1000).toFixed(1);
  const summary = `Fetched Net Liquid FX Reserves | status=${outcome.status} | periodsWritten=${outcome.periodsWritten} | latest=${outcome.latestPeriod ?? "n/a"} | Finished in ${durationSec}s`;
  console.log("");
  console.log(`[ingest:netliquidreserves] ${summary}`);

  await logCronRun(JOB_NAME, startedAt, "success", summary);
  process.exit(0);
}

// Phase F.2b-S: importing this module is inert. The job starts (and .env.local is loaded) only when this file is
// the program being executed — Task Scheduler, `npm run ingest:netliquidreserves` and `npx tsx` all qualify. See
// src/lib/providers/scriptEntry.ts.
runIfEntryPoint({ filename: __filename, requireMain: typeof require !== "undefined" && require.main === module }, () => {
  enterScript("ingest:netliquidreserves");
  main().catch((err) => {
    console.error("[ingest:netliquidreserves] Fatal error:", err instanceof Error ? (err.stack ?? err.message) : String(err));
    process.exit(1);
  });
});
