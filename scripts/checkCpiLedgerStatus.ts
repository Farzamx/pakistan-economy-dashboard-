// READ-ONLY status check for the PBS CPI ledger and its ingestion job (Phase F.2f). It changes nothing and ingests nothing.
//
// Answers, from real evidence, the questions the watchdog deliberately does not (it never calls a provider):
//   * Did the ingestion job run, and how did its latest runs end?        (cron_run_log, via the public get_cron_run_history)
//   * What does the ledger hold, and when did it last change?            (get_canonical_freshness_summary)
//   * Is the ledger current — or behind PBS, or only PARTLY ingested?    (a one-request look at PBS's live file)
// and keeps the six dimensions (latest period / last run / last data change / last source fetch / page generation / page
// source) apart. This is how to verify the scheduler and the ledger WITHOUT performing any production write.
//
// SAFETY. Only the two PUBLIC read RPCs below can be called — a wrapper throws on anything else — with the anon key, and the
// script starts only when executed and refuses under a test harness. PBS is asked once (a GET of a public file).
//
// Usage: npx tsx scripts/checkCpiLedgerStatus.ts [--no-pbs]          (npm run check:cpistatus)
// Exit code: 0 = ok or notice; 1 = warning or critical; 2 = the check itself could not run.

import { createClient } from "@supabase/supabase-js";

import { evaluateCpiRunEvidence } from "@/lib/cpiIngestionMonitor";
import { evaluateCpiIngestionStatus, evaluateLedgerCurrency, formatCpiIngestionStatus } from "@/lib/cpiLedgerCurrency";
import { ledgerKeysFromSummary } from "@/lib/cpiLedgerKeys";
import { probePbs } from "@/lib/cpiPbsProbe";
import { PBS_CPI_GROUPS_MONITOR_JOB } from "@/lib/ingestionWatchdog";
import type { CronRunRecord } from "@/lib/cronLogging";
import { PBS_CPI_INDICATOR_KEYS } from "@/lib/providers/pbsCpiSeries";
import { enterScript, runIfEntryPoint } from "@/lib/providers/scriptEntry";

/** The ONLY database calls this script can make. Both are public, read-only (STABLE / SELECT) RPCs. */
export const ALLOWED_READ_RPCS: readonly string[] = ["get_canonical_freshness_summary", "get_cron_run_history"];

interface RunRow { job_name: string; started_at: string; finished_at: string; duration_ms: number; status: CronRunRecord["status"]; detail: string | null }

function readOnlyClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY not set — check .env.local");
  const client = createClient(url, key);
  return {
    rpc(name: string, args?: Record<string, unknown>) {
      if (!ALLOWED_READ_RPCS.includes(name)) throw new Error(`checkCpiLedgerStatus: RPC "${name}" is not on the read-only allow-list`);
      return client.rpc(name, args);
    },
  };
}

async function main(): Promise<void> {
  const skipPbs = process.argv.includes("--no-pbs");
  const db = readOnlyClient();
  const now = new Date();
  console.log(`=== PBS CPI ledger: ingestion and currency status (READ-ONLY) — ${now.toISOString()} ===\n`);

  const summary = await db.rpc("get_canonical_freshness_summary");
  if (summary.error) throw new Error(`get_canonical_freshness_summary: ${summary.error.message}`);
  const pbsKeys = (summary.data as { indicator_key: string; latest_observation_period: string | null; vintage: string | null }[]).filter((r) => (PBS_CPI_INDICATOR_KEYS as readonly string[]).includes(r.indicator_key));

  const history = await db.rpc("get_cron_run_history", { p_job_name: PBS_CPI_GROUPS_MONITOR_JOB.ingestionJobName, p_limit: 50 });
  if (history.error) throw new Error(`get_cron_run_history: ${history.error.message}`);
  const runs: CronRunRecord[] = (history.data as RunRow[]).map((r) => ({ jobName: r.job_name, startedAt: r.started_at, finishedAt: r.finished_at, durationMs: r.duration_ms, status: r.status, detail: r.detail }));

  const probe = skipPbs ? null : await probePbs();
  const status = evaluateCpiIngestionStatus(
    evaluateCpiRunEvidence(runs, now, { staleAfterHours: PBS_CPI_GROUPS_MONITOR_JOB.staleAfterHours }),
    evaluateLedgerCurrency(ledgerKeysFromSummary(pbsKeys), probe, now),
  );

  for (const line of formatCpiIngestionStatus(status)) console.log(line);
  console.log(`\nPBS probe: ${skipPbs ? "skipped (--no-pbs)" : probe && probe.ok ? `ok — newest month ${probe.latestMonth}${probe.preparedAt ? `, prepared ${probe.preparedAt}` : ""}` : `failed — ${probe && !probe.ok ? probe.error : "n/a"}`}`);
  console.log(`\nDATABASE WRITES: 0 · RPCs used: ${ALLOWED_READ_RPCS.join(", ")}`);
  process.exit(status.severity === "ok" || status.severity === "notice" ? 0 : 1);
}

runIfEntryPoint({ filename: __filename, requireMain: typeof require !== "undefined" && require.main === module }, () => {
  enterScript("check:cpi-status");
  main().catch((err) => {
    console.error("[check:cpi-status] Could not complete the check:", err instanceof Error ? err.message : String(err));
    console.error("DATABASE WRITES: 0");
    process.exit(2);
  });
});
