// What the cron_run_log history of the PBS CPI ingestion job says about the job's RUNS.
//
// This is the run-health half of CPI monitoring, and it is built to sit inside the existing ingestion watchdog
// (ingestionWatchdog.ts), whose design rules it respects:
//   * it reads ONLY cron_run_log rows (the authoritative evidence that a run happened). It never uses an observation's
//     fetched_at as proof of a run — fetched_at changes only when data changes, so an ingestion that ran and found nothing
//     new would otherwise look dead;
//   * it makes no provider call and reads no credential; it is pure (rows + a clock in, a diagnosis out);
//   * it has no dependency on the freshness engine or registry. "Did the job run, and how did it end?" is a different
//     question from "is the data current?" (that is cpiLedgerCurrency.ts, which needs the ledger and a PBS probe).
//
// The watchdog itself stays what it was: healthy | stale | never-run from the time since the last SUCCESS, with one alert
// per failure episode plus reminders. What this module adds is the WHY, carried into the alert text and the watchdog's own
// log row through the optional `diagnose` hook on IngestionMonitorJob — so an operator reading "stale" can tell, without
// opening the database, whether the job is not running at all, failing because PBS is down, failing because the file was
// rejected, or leaving a partly ingested month.
//
//   no-runs             the job has never completed a run (skipped runs do not count: they did nothing)
//   healthy             the newest completed run succeeded, within the stale threshold
//   overdue             the newest completed run succeeded, but longer ago than the stale threshold — the job is NOT RUNNING
//   failing             the newest completed run failed (1–2 in a row)
//   repeatedly-failing  the newest 3+ completed runs all failed
//
// "A run that found nothing new" (outcome=unchanged) is a success and is HEALTHY by design.

import type { CronRunRecord } from "@/lib/cronLogging";
import { parseCpiRunDetail, sanitizeReason, type CpiRunOutcome, type ParsedCpiRun } from "@/lib/providers/cpiIngestionRunLog";

/** Three consecutive failed runs = "repeatedly failing" (each run already made 3 fetch attempts of its own). */
export const REPEATED_FAILURE_COUNT = 3;

export type RunHealthState = "no-runs" | "healthy" | "overdue" | "failing" | "repeatedly-failing";
export type FailureCause = "pbs-unavailable" | "validation-rejected" | "partial-ingestion" | "unexpected-error" | "unknown";

export interface RunSummary {
  /** finished_at of the cron_run_log row. */
  at: string;
  status: CronRunRecord["status"];
  parsed: ParsedCpiRun;
}

export interface CpiRunEvidence {
  state: RunHealthState;
  /** Newest row of ANY status (including a skipped one). */
  lastRow: RunSummary | null;
  /** Newest run that actually ran (not skipped). */
  lastCompleted: RunSummary | null;
  lastSuccess: RunSummary | null;
  /** Newest run that wrote observations (outcome=updated). null if none is on record — never guessed. */
  lastDataChange: RunSummary | null;
  /** Newest run that obtained a PBS file (every outcome except pbs-unavailable / busy / error). null if none on record. */
  lastSourceFetch: RunSummary | null;
  consecutiveFailures: number;
  /** Why the newest completed run failed; null when it did not. */
  cause: FailureCause | null;
  /** When the newest completed run succeeded after earlier failures: how many it followed. */
  recoveredAfterFailures: number | null;
  skippedRuns: number;
  successAgeHours: number | null;
  /** Plain statements for an alert / a log row. No URLs, no credentials, no values. */
  lines: string[];
}

const MS_PER_HOUR = 3_600_000;

function summarise(row: CronRunRecord): RunSummary {
  return { at: row.finishedAt, status: row.status, parsed: parseCpiRunDetail(row.detail) };
}

function causeOf(parsed: ParsedCpiRun): FailureCause {
  switch (parsed.outcome) {
    case "pbs-unavailable": return "pbs-unavailable";
    case "rejected": return "validation-rejected";
    case "partial": return "partial-ingestion";
    case "error": return "unexpected-error";
    default: return "unknown";
  }
}

const FETCHED: readonly CpiRunOutcome[] = ["unchanged", "updated", "partial", "rejected"];

function describeCause(r: RunSummary): string {
  const p = r.parsed;
  switch (causeOf(p)) {
    case "pbs-unavailable":
      return `PBS could not be reached${p.attempts ? ` after ${p.attempts} attempt(s)` : ""}; nothing was written.`;
    case "validation-rejected":
      return `PBS answered but the file was rejected by validation${p.reason ? ` (${sanitizeReason(p.reason)})` : ""}; nothing was written.`;
    case "partial-ingestion":
      return `${p.failed ?? "some"} of ${p.series ?? 26} series failed${p.failedKeys?.length ? ` (${p.failedKeys.slice(0, 3).join(", ")}${p.failedKeys.length > 3 ? ", …" : ""})` : ""}: the ledger may hold a PARTLY ingested month until a later run completes it.`;
    case "unexpected-error":
      return `the run hit an unexpected error${p.reason ? ` (${sanitizeReason(p.reason)})` : ""}; what was written is unknown.`;
    default:
      return "the run failed; its log row carries no structured reason (an older format).";
  }
}

export function evaluateCpiRunEvidence(runs: readonly CronRunRecord[], now: Date, opts: { staleAfterHours: number; repeatedFailureCount?: number }): CpiRunEvidence {
  const repeated = opts.repeatedFailureCount ?? REPEATED_FAILURE_COUNT;
  // Newest first by finished_at; rows with an unusable timestamp are not evidence of anything.
  const rows = runs
    .filter((r) => Number.isFinite(Date.parse(r.finishedAt)))
    .sort((a, b) => Date.parse(b.finishedAt) - Date.parse(a.finishedAt));
  const completed = rows.filter((r) => r.status !== "skipped");
  const skippedRuns = rows.length - completed.length;

  const lastRow = rows[0] ? summarise(rows[0]) : null;
  const lastCompleted = completed[0] ? summarise(completed[0]) : null;
  const successRow = completed.find((r) => r.status === "success");
  const lastSuccess = successRow ? summarise(successRow) : null;
  const changeRow = completed.find((r) => parseCpiRunDetail(r.detail).outcome === "updated" && r.status === "success");
  const lastDataChange = changeRow ? summarise(changeRow) : null;
  const fetchRow = completed.find((r) => FETCHED.includes(parseCpiRunDetail(r.detail).outcome as CpiRunOutcome));
  const lastSourceFetch = fetchRow ? summarise(fetchRow) : null;

  let consecutiveFailures = 0;
  for (const r of completed) {
    if (r.status === "failure") consecutiveFailures++;
    else break;
  }
  const successAgeHours = lastSuccess ? (now.getTime() - Date.parse(lastSuccess.at)) / MS_PER_HOUR : null;

  let state: RunHealthState;
  if (!lastCompleted) state = "no-runs";
  else if (consecutiveFailures >= repeated) state = "repeatedly-failing";
  else if (consecutiveFailures >= 1) state = "failing";
  else state = successAgeHours !== null && successAgeHours > opts.staleAfterHours ? "overdue" : "healthy";

  const cause = consecutiveFailures >= 1 && lastCompleted ? causeOf(lastCompleted.parsed) : null;
  let recoveredAfterFailures: number | null = null;
  if (lastCompleted?.status === "success") {
    let n = 0;
    for (const r of completed.slice(1)) {
      if (r.status === "failure") n++;
      else break;
    }
    recoveredAfterFailures = n > 0 ? n : null;
  }

  const lines: string[] = [];
  const when = (r: RunSummary | null) => (r ? r.at : "none on record");
  switch (state) {
    case "no-runs":
      lines.push("Diagnosis: the job has no completed run on record — it has never run, or is not registered with the scheduler.");
      break;
    case "overdue":
      lines.push(`Diagnosis: NOT RUNNING — the last completed run succeeded ${Math.floor(successAgeHours as number)}h ago and nothing has completed since.`);
      lines.push("The scheduled task may be unregistered, disabled, or the ingestion host may be off.");
      break;
    case "failing":
    case "repeatedly-failing":
      lines.push(`Diagnosis: ${state === "repeatedly-failing" ? `REPEATEDLY FAILING — the last ${consecutiveFailures} completed runs all failed` : `the latest run failed (${consecutiveFailures} in a row)`}; the job IS running.`);
      lines.push(`Cause of the latest failure: ${describeCause(lastCompleted as RunSummary)}`);
      break;
    case "healthy":
      lines.push(`Diagnosis: healthy — the latest run (${when(lastCompleted)}) ended ${lastCompleted?.parsed.outcome ?? "successfully"}${lastCompleted?.parsed.outcome === "unchanged" ? " (PBS had nothing new; nothing was written)" : ""}.`);
      if (recoveredAfterFailures) lines.push(`Recovered: it followed ${recoveredAfterFailures} failed run(s).`);
      break;
  }
  lines.push(`Last successful run: ${when(lastSuccess)}${lastSuccess?.parsed.outcome ? ` (${lastSuccess.parsed.outcome})` : ""}`);
  lines.push(`Last run that changed data: ${when(lastDataChange)}`);
  lines.push(`Last run that reached PBS: ${when(lastSourceFetch)}`);
  if (lastCompleted?.parsed.latest) lines.push(`Newest month PBS had at the latest run: ${lastCompleted.parsed.latest}`);
  if (skippedRuns > 0) lines.push(`Skipped (lock held) runs in the window: ${skippedRuns}`);

  return { state, lastRow, lastCompleted, lastSuccess, lastDataChange, lastSourceFetch, consecutiveFailures, cause, recoveredAfterFailures, skippedRuns, successAgeHours, lines };
}
