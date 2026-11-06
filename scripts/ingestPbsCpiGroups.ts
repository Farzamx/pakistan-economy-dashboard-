// Ingestion Runner — PBS CPI by expenditure group (Phase F.2b: DRY-RUN ONLY).
//
// Deliberately thin, like scripts/ingestWorldBank.ts and ingestFred.ts: the
// fetch/validate/diff/persist logic is the existing, unmodified generic orchestrator
// (src/lib/providers/ingestionOrchestrator.ts) driven by the PBS adapter
// (src/lib/providers/pbsCpiGroupsAdapter.ts). What is new here is a dry-run mode, which
// none of the other runners has, because this one is introduced before any write is
// approved.
//
// WHAT IT DOES IN THIS PHASE
// Validates the PBS CPI file against every integrity check, prepares the 26 series,
// runs the real orchestrator against an IN-MEMORY ledger, and reports what a real run
// would write: observation counts per series, period coverage, planned new/revised
// rows, and provenance. It writes NOTHING to any database.
//
//   - Dry run is the default. `--write` is REFUSED (exit 2) while WRITE_MODE_AUTHORIZED
//     is false (src/lib/providers/pbsCpiGroupsIngestion.ts), before anything else runs.
//   - A file that fails any validation check prepares zero writes (exit 1) and never
//     reaches the ledger, not even for a read.
//   - `--ledger live-read` compares against the real ledger's current rows using the
//     public READ RPC only (the same one the website uses). It is the only database
//     access in this script and it cannot write.
//   - No cron_run_log entry is written in dry-run: that would itself be a database write.
//
// SAFETY BARRIERS (Phase F.2b-R) — the write path sits behind THREE independent barriers; the first is a
// flag, and a flag is not enough (see docs/incident-f2b-r-production-write.md):
//   1. WRITE_MODE_AUTHORIZED (application flag, can be mutated by tests);
//   2. assertNotUnderTest: refused outright when any test-harness signal is in the environment, checked
//      before the env file is read or the network is touched (src/lib/providers/writeSafetyGuard.ts);
//   3. assertWriteConfirmed: the operator must set PEIC_CONFIRM_WRITE_HOST to the host being written to.
// `.env.local` is read only through loadLocalEnv(), which is a no-op under any test-harness signal.
//
// SCHEDULING (Phase F.2f): ops/scheduled-tasks/peic-pbs-cpi-groups-ingestion.xml is the Task Scheduler definition, and
// docs/pbs-cpi-ingestion-operations.md the runbook. The definition is in the repository; it is NOT registered, and
// WRITE_MODE_AUTHORIZED is still false, so nothing runs on a schedule. A `--write` run (once activated) is one
// executeWriteRun() (src/lib/providers/pbsCpiGroupsRun.ts): single-run lock -> fetch with bounded retries -> validate ->
// the existing orchestrator -> exactly ONE cron_run_log row for whatever happened, which is what the watchdog reads.
//
// Usage: npm run ingest:pbscpigroups -- [--file <path>] [--ledger live-read] [--show-provenance]
//        npm run ingest:pbscpigroups -- --write --confirm-write-host <host>      (activation only; see the runbook)

import path from "node:path";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

import { ingestManySeries, type IngestJob } from "@/lib/providers/ingestionOrchestrator";
import { PBS_CPI_FILE_URL, PBS_CPI_SERIES, createPbsCpiGroupsAdapter } from "@/lib/providers/pbsCpiGroupsAdapter";
import {
  JOB_NAME,
  USAGE,
  WRITE_MODE_AUTHORIZED,
  fetchPbsCpiFile,
  fetchPbsCpiFileCounted,
  formatDryRunReport,
  parseIngestArgs,
  runPbsCpiDryRun,
  seedLedgerFrom,
  writeRefusal,
  type HistoryReader,
  type IngestArgs,
} from "@/lib/providers/pbsCpiGroupsIngestion";
import { executeWriteRun } from "@/lib/providers/pbsCpiGroupsRun";
import { acquireRunLock } from "@/lib/providers/runLock";
import { logCronRun } from "@/lib/cronLogging";
import { WRITE_CONFIRM_ENV, WriteRefusedError, assertNotUnderTest, assertWriteConfirmed, loadLocalEnv } from "@/lib/providers/writeSafetyGuard";
import { runIfEntryPoint } from "@/lib/providers/scriptEntry";

function print(lines: readonly string[]): void {
  for (const l of lines) console.log(l);
}

async function main(): Promise<void> {
  const { args, errors } = parseIngestArgs(process.argv.slice(2));

  if (args.help) {
    console.log(USAGE);
    process.exit(0);
  }
  if (errors.length > 0) {
    for (const e of errors) console.error(e);
    console.error(USAGE);
    process.exit(2);
  }

  // The write gate comes first: before the environment is read, before any network call.
  if (args.mode === "write" && !WRITE_MODE_AUTHORIZED) {
    console.error(writeRefusal());
    process.exit(2);
  }
  // Independent barrier #2 (does not depend on the flag above): a write is refused outright under any
  // test-harness signal, before a file is read, an env file is loaded or the network is touched.
  if (args.mode === "write") {
    try {
      assertNotUnderTest(process.env);
    } catch (err) {
      console.error(err instanceof WriteRefusedError ? err.message : String(err));
      console.error("DATABASE WRITES: 0");
      process.exit(2);
    }
  }

  if (args.mode === "write") {
    // A write run must use the live PBS file: a hand-edited local copy must never become ledger data.
    // (Checked before anything is read, fetched or logged.)
    if (args.source.kind !== "live") {
      console.error("A write run must read the live PBS file; --file is only for dry runs.");
      process.exit(2);
    }
    // The write run fetches the file ITSELF (inside executeWriteRun) so that a PBS outage is logged as a run,
    // not lost: a failure before the database is configured would otherwise leave the watchdog with no row at all.
    await runWrite(args);
    return;
  }

  // Where the bytes came from, for the report only. The PROVENANCE recorded with each observation always names
  // PBS's own URL (that is the data's source), never a local path, so a dry run previews exactly what a real run records.
  const sourceLabel = args.source.kind === "file" ? `file:${args.source.path}` : PBS_CPI_FILE_URL;
  let xml: string;
  try {
    xml = args.source.kind === "file" ? readFileSync(args.source.path, "utf-8") : await fetchPbsCpiFile();
  } catch (err) {
    console.error(`[ingest:pbscpigroups] Could not obtain the PBS file: ${err instanceof Error ? err.message : String(err)}`);
    console.error("DATABASE WRITES: 0");
    process.exit(1);
  }

  // ── Dry run ──
  const seed =
    args.ledger === "live-read"
      ? async (ledger: Parameters<typeof seedLedgerFrom>[0]) => {
          loadLocalEnv(process.env, path.resolve(process.cwd(), ".env.local"));
          const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
          const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
          if (!url || !anonKey) throw new Error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY not set — check .env.local");
          const reader = createClient(url, anonKey); // READ-ONLY use: only the public read RPC below is ever called on it
          const read: HistoryReader = async (key) => {
            const { data, error } = await reader.rpc("get_canonical_observation_history", { p_indicator_key: key, p_limit: 5000 });
            if (error) throw new Error(`get_canonical_observation_history failed for ${key}: ${error.message}`);
            return (data ?? []) as { observation_period: string; value: number; unit: string }[];
          };
          const seeded = await seedLedgerFrom(ledger, read);
          console.log(`[ingest:pbscpigroups] live-read: the real ledger already holds ${seeded.rows} current rows across ${seeded.keysWithRows} of ${PBS_CPI_SERIES.length} of these series (read-only).`);
        }
      : undefined;

  const result = await runPbsCpiDryRun({ xml, fileUrl: PBS_CPI_FILE_URL, seed });
  print(formatDryRunReport(result, { showProvenance: args.showProvenance, ledgerMode: args.ledger === "live-read" ? "the real ledger's current rows (read-only)" : "empty (first-run backfill)", source: sourceLabel }));
  process.exit(result.ok ? 0 : 1);
}


/**
 * The write path. UNREACHABLE while WRITE_MODE_AUTHORIZED is false (main() refuses before calling this), and reachable
 * only after the test-harness barrier and the target confirmation below. Phase F.2f made it a real, logged, locked,
 * bounded-retry run (executeWriteRun); it has still NEVER been executed by this code.
 */
async function runWrite(args: IngestArgs): Promise<void> {
  loadLocalEnv(process.env, path.resolve(process.cwd(), ".env.local"));

  // Independent barrier #3: the operator must name the database host being written to, for THIS run — by
  // --confirm-write-host (a scheduled task cannot set environment variables) or PEIC_CONFIRM_WRITE_HOST.
  // Checked before any client, RPC, lock or cron-log write is created.
  try {
    assertWriteConfirmed({ ...process.env, [WRITE_CONFIRM_ENV]: args.confirmWriteHost ?? process.env[WRITE_CONFIRM_ENV] });
  } catch (err) {
    console.error(err instanceof WriteRefusedError ? err.message : String(err));
    console.error("DATABASE WRITES: 0");
    process.exit(2);
  }

  const internalSecret = process.env.NOTIFICATION_WORKER_SECRET;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!internalSecret || !url || !anonKey) {
    console.error("[ingest:pbscpigroups] NOTIFICATION_WORKER_SECRET / Supabase env not set — check .env.local.");
    process.exit(1);
  }

  const supabase = createClient(url, anonKey);
  const result = await executeWriteRun({
    now: () => new Date(),
    acquireLock: () => acquireRunLock(),
    // Bounded: 3 attempts, 20 s then 40 s apart, 30 s timeout each — at most about 3 minutes, well inside the task's 1 h limit.
    fetchFile: () => fetchPbsCpiFileCounted({ attempts: 3, retryDelayMs: 20_000 }),
    ingest: (dataset) => {
      const adapter = createPbsCpiGroupsAdapter(dataset);
      const jobs: IngestJob[] = PBS_CPI_SERIES.map((d) => ({ adapter, indicatorKey: d.indicatorKey }));
      return ingestManySeries(supabase, internalSecret, randomUUID(), jobs, { concurrency: 3 });
    },
    logRun: (startedAt, status, detail) => logCronRun(JOB_NAME, startedAt, status, detail),
    print: (line) => console.log(line),
  });
  process.exit(result.exitCode);
}

// Phase F.2b-S: importing this module is inert; main() (with its own flag / test-harness / confirmation barriers,
// which stay in main() and runWrite()) runs only when this file is the program being executed.
runIfEntryPoint({ filename: __filename, requireMain: typeof require !== "undefined" && require.main === module }, () => {
  main().catch((err) => {
    console.error("[ingest:pbscpigroups] Fatal error:", err instanceof Error ? (err.stack ?? err.message) : String(err));
    console.error("DATABASE WRITES: 0");
    process.exit(1);
  });
});
