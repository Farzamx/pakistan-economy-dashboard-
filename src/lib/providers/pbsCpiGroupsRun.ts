// One scheduled/real PBS CPI ingestion RUN, as a function with every collaborator injected.
//
// scripts/ingestPbsCpiGroups.ts wires the real fetch, the real orchestrator (ingestManySeries) and the real cron logger
// into this; the tests wire fakes. Keeping the sequencing here, out of the script, is what lets every outcome be tested
// without a process, a database or a network.
//
// THE CONTRACT: every run that gets as far as starting leaves EXACTLY ONE cron_run_log row, whatever happens. That row is
// the authoritative evidence the watchdog reads, so an outage must never be silent:
//
//   lock held by another run   -> status skipped , outcome=busy              (the other run logs for itself)
//   PBS unreachable (3 tries)  -> status failure , outcome=pbs-unavailable   (nothing written)
//   file fetched but rejected  -> status failure , outcome=rejected          (nothing written)
//   any series failed          -> status failure , outcome=partial           (ledger may hold a PARTLY ingested month)
//   all 26 reconciled, changes -> status success , outcome=updated
//   all 26 reconciled, none    -> status success , outcome=unchanged         (a run that found nothing new is HEALTHY)
//   anything unexpected        -> status failure , outcome=error
//
// The ingestion logic itself is NOT here and NOT changed: `ingest` is the existing orchestrator over the existing adapter,
// and the file is validated by the existing loadPbsCpiDataset() (all 26 series, one base period, the Laspeyres identity…).
// An invalid file therefore never reaches `ingest`, and the all-or-nothing 26-series integrity is untouched.
//
// This module performs no I/O of its own and contains no database client.

import type { CronRunStatus } from "@/lib/cronLogging";
import { formatCpiRunDetail, sanitizeReason, statusForOutcome, type CpiRunFields, type CpiRunOutcome } from "./cpiIngestionRunLog";
import type { SeriesIngestOutcome } from "./ingestionOrchestrator";
import { loadPbsCpiDataset, type PbsCpiDataset } from "./pbsCpiGroupsAdapter";
import type { RunLock } from "./runLock";

export interface FetchedFile {
  text: string;
  /** How many attempts it took (1 = first try). */
  attempts: number;
}

/** Thrown by a fetcher that gave up; carries how many attempts it made. */
export class FetchGaveUpError extends Error {
  constructor(message: string, readonly attempts: number) {
    super(message);
    this.name = "FetchGaveUpError";
  }
}

export interface WriteRunDeps {
  now: () => Date;
  /** null = another run holds the lock. */
  acquireLock: () => RunLock | null;
  fetchFile: () => Promise<FetchedFile>;
  /** The existing orchestrator over the existing adapter, for a fully validated dataset. */
  ingest: (dataset: PbsCpiDataset) => Promise<SeriesIngestOutcome[]>;
  /** Writes the run's single cron_run_log row. May fail silently (logCronRun is best-effort). */
  logRun: (startedAt: Date, status: CronRunStatus, detail: string) => Promise<void>;
  print: (line: string) => void;
}

export interface WriteRunResult {
  exitCode: 0 | 1;
  outcome: CpiRunOutcome;
  status: CronRunStatus;
  detail: string;
}

export async function executeWriteRun(deps: WriteRunDeps): Promise<WriteRunResult> {
  const startedAt = deps.now();
  let fields: CpiRunFields;

  const lock = deps.acquireLock();
  if (!lock) {
    fields = { outcome: "busy", reason: "another ingestion run holds the lock" };
    return finish(deps, startedAt, fields, 0);
  }

  try {
    let file: FetchedFile;
    try {
      file = await deps.fetchFile();
    } catch (err) {
      fields = { outcome: "pbs-unavailable", attempts: err instanceof FetchGaveUpError ? err.attempts : undefined, reason: err instanceof Error ? err.message : String(err) };
      return await finish(deps, startedAt, fields, 1);
    }

    const { dataset, report } = loadPbsCpiDataset(file.text);
    if (!dataset) {
      const failed = report.checks.filter((c) => c.status === "fail").map((c) => c.id);
      fields = { outcome: "rejected", attempts: file.attempts, reason: `validation failed: ${failed.slice(0, 4).join(", ")}${failed.length > 4 ? ` (+${failed.length - 4})` : ""}` };
      return await finish(deps, startedAt, fields, 1);
    }

    const outcomes = await deps.ingest(dataset);
    const failedOutcomes = outcomes.filter((o) => o.status === "failed");
    const updated = outcomes.filter((o) => o.status === "updated").length;
    const unchanged = outcomes.filter((o) => o.status === "unchanged").length;
    const latestPeriod = outcomes.map((o) => o.latestPeriod ?? "").sort().at(-1);
    const common: CpiRunFields = {
      outcome: failedOutcomes.length > 0 ? "partial" : updated > 0 ? "updated" : "unchanged",
      series: outcomes.length,
      updated,
      unchanged,
      failed: failedOutcomes.length,
      periodsWritten: outcomes.reduce((s, o) => s + o.periodsWritten, 0),
      latest: latestPeriod ? latestPeriod.slice(0, 7) : undefined,
      attempts: file.attempts,
      prepared: dataset.preparedAt ?? undefined,
      failedKeys: failedOutcomes.map((o) => o.indicatorKey),
      reason: failedOutcomes.length > 0 ? failedOutcomes[0].error : undefined,
    };
    return await finish(deps, startedAt, common, failedOutcomes.length > 0 ? 1 : 0);
  } catch (err) {
    fields = { outcome: "error", reason: err instanceof Error ? err.message : String(err) };
    return await finish(deps, startedAt, fields, 1);
  } finally {
    lock.release();
  }
}

async function finish(deps: WriteRunDeps, startedAt: Date, fields: CpiRunFields, exitCode: 0 | 1): Promise<WriteRunResult> {
  const detail = formatCpiRunDetail({ ...fields, reason: fields.reason ? sanitizeReason(fields.reason) : undefined });
  const status = statusForOutcome(fields.outcome);
  deps.print(`[ingest:pbscpigroups] ${detail}`);
  try {
    await deps.logRun(startedAt, status, detail);
  } catch (err) {
    // The run's outcome stands even if its log row could not be written; the watchdog then sees no row, which it reports.
    deps.print(`[ingest:pbscpigroups] could not write the cron_run_log row: ${err instanceof Error ? err.message : String(err)}`);
  }
  return { exitCode, outcome: fields.outcome, status, detail };
}
