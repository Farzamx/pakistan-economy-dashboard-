// What a PBS CPI ingestion run writes into cron_run_log's free-text `detail` column — and how the monitor reads it back.
//
// WHY A STRUCTURED LINE. cron_run_log is the authoritative evidence that an ingestion RUN happened (the schema has
// job_name, status and a free-text detail; nothing else, and no schema change is allowed here). The watchdog needs more
// than success/failure: it must tell "PBS was unreachable" from "PBS answered but the file was rejected" from "the
// release was only partly ingested" from "the run succeeded and nothing changed". One short machine-readable line carries
// that, in a column that already exists:
//
//   cpi-ingest/1 | outcome=updated | series=26 | updated=26 | unchanged=0 | failed=0 | periodsWritten=1352 | latest=2026-10 | attempts=1 | prepared=2026-11-03T06:38:35.000Z
//
// outcome  -> status written to cron_run_log
//   unchanged        success   every series already matched the file: nothing written
//   updated          success   at least one series gained/revised observations; all 26 reconciled
//   partial          failure   some series failed: the ledger may hold a PARTLY ingested month (all-or-nothing integrity
//                              is broken until a later run completes it). This is deliberately a failure even when most
//                              series succeeded — the generic scripts call that "success", but for a 26-series panel that
//                              the page rejects whole, a half-ingested month must never look healthy.
//   pbs-unavailable  failure   the file could not be fetched after bounded retries; nothing was written
//   rejected         failure   the file was fetched but failed validation; nothing was written
//   error            failure   an unexpected exception; nothing is claimed about what was written
//   busy             skipped   another run held the lock; this run did nothing
//
// Honest by construction: a field that is not known is OMITTED, never defaulted — a parsed run reports undefined, so a
// monitor cannot mistake "unknown" for zero. No URLs, no credentials, nothing the file or the host environment could use to
// smuggle a secret in: `reason` is sanitised and length-capped.
//
// LEGACY. The one production run to date (2026-11-06, the F.2b-R incident) predates this format:
//   "26 PBS CPI series | 0 unchanged | 26 updated | 0 failed"
// parseCpiRunDetail() reads that too, flagged `format: "legacy"`.

import type { CronRunStatus } from "@/lib/cronLogging";

export const CPI_RUN_LOG_VERSION = "cpi-ingest/1";

export type CpiRunOutcome = "unchanged" | "updated" | "partial" | "pbs-unavailable" | "rejected" | "error" | "busy";
export const CPI_RUN_OUTCOMES: readonly CpiRunOutcome[] = ["unchanged", "updated", "partial", "pbs-unavailable", "rejected", "error", "busy"];

export interface CpiRunFields {
  outcome: CpiRunOutcome;
  series?: number;
  updated?: number;
  unchanged?: number;
  failed?: number;
  periodsWritten?: number;
  /** Newest month in the PBS file this run saw, "YYYY-MM". */
  latest?: string;
  /** PBS fetch attempts used (1 = first try worked). */
  attempts?: number;
  /** The file's own Prepared timestamp, ISO. */
  prepared?: string;
  failedKeys?: string[];
  reason?: string;
}

export interface ParsedCpiRun extends Partial<CpiRunFields> {
  format: "v1" | "legacy" | "unknown";
}

const MAX_REASON = 160;

/** URLs out, separators out, whitespace collapsed, capped. A reason is a hint for a human, never data. */
export function sanitizeReason(text: string): string {
  return text
    .replace(/https?:\/\/\S+/gi, "[url]")
    .replace(/[|=\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_REASON);
}

/** The cron_run_log status a run with this outcome is recorded under. */
export function statusForOutcome(outcome: CpiRunOutcome): CronRunStatus {
  if (outcome === "unchanged" || outcome === "updated") return "success";
  if (outcome === "busy") return "skipped";
  return "failure";
}

export function formatCpiRunDetail(f: CpiRunFields): string {
  const parts = [CPI_RUN_LOG_VERSION, `outcome=${f.outcome}`];
  const num = (k: string, v: number | undefined) => { if (v !== undefined && Number.isFinite(v)) parts.push(`${k}=${v}`); };
  num("series", f.series);
  num("updated", f.updated);
  num("unchanged", f.unchanged);
  num("failed", f.failed);
  num("periodsWritten", f.periodsWritten);
  if (f.latest) parts.push(`latest=${f.latest}`);
  num("attempts", f.attempts);
  if (f.prepared) parts.push(`prepared=${f.prepared}`);
  if (f.failedKeys && f.failedKeys.length > 0) parts.push(`failedKeys=${f.failedKeys.slice(0, 8).join(",")}${f.failedKeys.length > 8 ? `,+${f.failedKeys.length - 8}` : ""}`);
  if (f.reason) parts.push(`reason=${sanitizeReason(f.reason)}`);
  return parts.join(" | ");
}

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const LEGACY = /^(\d+) PBS CPI series \| (\d+) unchanged \| (\d+) updated \| (\d+) failed/;

export function parseCpiRunDetail(detail: string | null | undefined): ParsedCpiRun {
  if (!detail) return { format: "unknown" };
  const legacy = LEGACY.exec(detail.trim());
  if (legacy) {
    const [series, unchanged, updated, failed] = legacy.slice(1).map(Number);
    return { format: "legacy", series, unchanged, updated, failed, outcome: failed > 0 ? "partial" : updated > 0 ? "updated" : "unchanged" };
  }
  const parts = detail.split("|").map((p) => p.trim());
  if (parts[0] !== CPI_RUN_LOG_VERSION) return { format: "unknown" };
  const kv = new Map<string, string>();
  for (const p of parts.slice(1)) {
    const eq = p.indexOf("=");
    if (eq > 0 && !kv.has(p.slice(0, eq))) kv.set(p.slice(0, eq), p.slice(eq + 1));
  }
  const outcomeRaw = kv.get("outcome");
  const outcome = CPI_RUN_OUTCOMES.find((o) => o === outcomeRaw);
  if (!outcome) return { format: "unknown" };
  const int = (k: string): number | undefined => {
    const v = kv.get(k);
    return v !== undefined && /^\d+$/.test(v) ? Number(v) : undefined;
  };
  const latest = kv.get("latest");
  const prepared = kv.get("prepared");
  const failedKeys = kv.get("failedKeys");
  return {
    format: "v1",
    outcome,
    series: int("series"),
    updated: int("updated"),
    unchanged: int("unchanged"),
    failed: int("failed"),
    periodsWritten: int("periodsWritten"),
    latest: latest && MONTH.test(latest) ? latest : undefined,
    attempts: int("attempts"),
    prepared: prepared && Number.isFinite(Date.parse(prepared)) ? prepared : undefined,
    failedKeys: failedKeys ? failedKeys.split(",").filter(Boolean) : undefined,
    reason: kv.get("reason"),
  };
}
