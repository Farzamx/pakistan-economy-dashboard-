// The logic behind scripts/ingestPbsCpiGroups.ts, kept out of the script so it can
// be tested without running a process: argument parsing, the write gate, the
// validate-first dry run, and the report.
//
// PHASE F.2b / F.2f: DRY-RUN BY DEFAULT.
// The script prepares exactly what a real run would write and reports it, but writes
// nothing anywhere unless `--write` is given AND three independent barriers allow it (see
// the script's header). The write RUN itself (fetch with bounded retries, validate, ingest,
// one cron_run_log row for every outcome, single-run lock) is src/lib/providers/pbsCpiGroupsRun.ts.
// The dry-run guards below are unchanged:
//   1. WRITE_MODE_AUTHORIZED is false in this build, and `--write` is refused while it is.
//   2. The dry run drives the REAL, unmodified orchestrator against InMemoryLedger,
//      which is plain memory: there is no database client in this module at all.
//   3. Validation comes first. A file that fails any check produces zero prepared
//      writes and never reaches the ledger, not even for a read.
//
// The orchestrator is reused as-is on purpose: the planned counts here are the counts
// of the code that WILL run, not of a parallel re-implementation.

import { ingestManySeries, type IngestJob, type SeriesIngestOutcome } from "./ingestionOrchestrator";
import { InMemoryLedger } from "./inMemoryLedger";
import { FetchGaveUpError, type FetchedFile } from "./pbsCpiGroupsRun";
import { PBS_CPI_FILE_URL, PBS_CPI_SERIES, createPbsCpiGroupsAdapter, loadPbsCpiDataset, observationsFor, type PbsCpiDataset, type ValidationReport } from "./pbsCpiGroupsAdapter";

/**
 * The single switch between "prepare and report" and "write to the ledger". It is a
 * constant, not a flag or an environment variable, so enabling writes is a visible,
 * reviewable code change, never a command-line accident.
 *
 * PHASE F.2f: it is DELIBERATELY STILL FALSE. The scheduled-ingestion code, the task
 * definition, the monitoring and the tests all exist, but flipping this to true is the
 * first ACTIVATION step (docs/pbs-cpi-ingestion-operations.md, "Activation checklist"),
 * to be done in a reviewed commit by whoever registers the scheduled task — not as a side
 * effect of building it. It is also NOT sufficient on its own: a write additionally needs
 * the test-harness refusal to pass and the target to be confirmed for that run.
 */
export const WRITE_MODE_AUTHORIZED = false as boolean;

export const JOB_NAME = "pbs-cpi-groups-ingestion";

// ───────────────────────────── arguments ─────────────────────────────

export interface IngestArgs {
  mode: "dry-run" | "write";
  /** Where the PBS file comes from. */
  source: { kind: "live" } | { kind: "file"; path: string };
  /** What the dry run compares against: an empty ledger, or the real ledger's current rows (READ-ONLY). */
  ledger: "empty" | "live-read";
  showProvenance: boolean;
  help: boolean;
  /**
   * `--confirm-write-host <host>`: the operator's per-run confirmation of WHICH database is being written to. A scheduled
   * task cannot set environment variables, so its action carries this argument instead of PEIC_CONFIRM_WRITE_HOST; either
   * satisfies the same independent target-bound barrier (writeSafetyGuard.assertWriteConfirmed). It is a confirmation, not
   * a credential, and it grants nothing by itself: the write flag and the test-harness refusal still apply.
   */
  confirmWriteHost?: string;
}

export interface ParsedArgs {
  args: IngestArgs;
  errors: string[];
}

/** Defaults to a dry run against an empty ledger, from the live PBS file. */
export function parseIngestArgs(argv: readonly string[]): ParsedArgs {
  const args: IngestArgs = { mode: "dry-run", source: { kind: "live" }, ledger: "empty", showProvenance: false, help: false };
  const errors: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const eq = argv[i].indexOf("=");
    const flag = eq === -1 ? argv[i] : argv[i].slice(0, eq);
    const inline = eq === -1 ? undefined : argv[i].slice(eq + 1);
    const value = () => inline ?? argv[++i];
    switch (flag) {
      case "--dry-run": args.mode = "dry-run"; break;
      case "--write": args.mode = "write"; break;
      case "--show-provenance": args.showProvenance = true; break;
      case "--help": case "-h": args.help = true; break;
      case "--file": {
        const p = value();
        if (!p) errors.push("--file needs a path");
        else args.source = { kind: "file", path: p };
        break;
      }
      case "--confirm-write-host": {
        const h = value();
        if (!h || h.startsWith("--")) errors.push("--confirm-write-host needs the database host");
        else args.confirmWriteHost = h;
        break;
      }
      case "--ledger": {
        const v = value();
        if (v === "empty" || v === "live-read") args.ledger = v;
        else errors.push(`--ledger must be "empty" or "live-read" (got "${v ?? ""}")`);
        break;
      }
      default: errors.push(`Unknown argument: ${argv[i]}`);
    }
  }
  return { args, errors };
}

export const USAGE = `Usage: npm run ingest:pbscpigroups -- [options]

Prepares the 26 PBS CPI series for the observation ledger and reports what a real
run would write. The DEFAULT is a dry run: nothing is written anywhere.

  --dry-run             (default) validate, prepare and report
  --file <path>         read the PBS CPI.xml from a saved file instead of the live URL
  --ledger empty        (default) compare against an empty ledger: a first-run backfill
  --ledger live-read    compare against the real ledger's current rows (READ-ONLY, public read RPC)
  --show-provenance     print the full provenance of one observation of each kind
  --write               REAL RUN against the database named by NEXT_PUBLIC_SUPABASE_URL. Refused unless
                        (1) WRITE_MODE_AUTHORIZED is true in this build, (2) no test harness is active and
                        (3) the target is confirmed for this run with --confirm-write-host <host>
                        (or PEIC_CONFIRM_WRITE_HOST). Always reads the live PBS file. Logs one
                        cron_run_log row per run. See docs/pbs-cpi-ingestion-operations.md.
  --confirm-write-host <host>
                        the Supabase host being written to (only meaningful with --write)
`;

export function writeRefusal(): string {
  return "REFUSED: write mode is not authorized in this build (WRITE_MODE_AUTHORIZED is false); the ledger was not touched. Enabling it is a reviewed activation step: see docs/pbs-cpi-ingestion-operations.md.";
}

// ───────────────────────────── fetching the live file ─────────────────────────────

const FETCH_TIMEOUT_MS = 30_000;
/** The file is ~84 KB. Anything vastly larger is not the file this adapter was written for. */
const MAX_BYTES = 2_000_000;

/**
 * Downloads the PBS file, retrying on failure. Retry lives HERE (the caller of the
 * adapter), not inside the adapter, matching the orchestrator's convention that
 * adapters never retry. A non-200 or oversized response is a failure, never "empty data".
 */
export interface PbsFetchOptions {
  fetchImpl?: typeof fetch;
  url?: string;
  attempts?: number;
  retryDelayMs?: number;
  /** Test seam for the backoff wait. */
  sleep?: (ms: number) => Promise<void>;
}

/**
 * The same bounded-retry download, reporting how many attempts it took (success) or made (failure: FetchGaveUpError),
 * so a scheduled run's cron_run_log row can say "PBS was unreachable after 3 attempts" instead of nothing.
 * The wait between attempts grows linearly (delay × attempt). Total time is bounded: attempts × (30 s timeout) + the waits.
 */
export async function fetchPbsCpiFileCounted(opts: PbsFetchOptions = {}): Promise<FetchedFile> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const url = opts.url ?? PBS_CPI_FILE_URL;
  const attempts = opts.attempts ?? 3;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  let last: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetchImpl(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), cache: "no-store" });
      if (!res.ok) throw new Error(`PBS CPI file request returned HTTP ${res.status}.`);
      const text = await res.text();
      if (text.length > MAX_BYTES) throw new Error("PBS CPI file is larger than expected; not parsed.");
      return { text, attempts: attempt };
    } catch (err) {
      last = err;
      if (attempt < attempts) await sleep((opts.retryDelayMs ?? 3000) * attempt);
    }
  }
  throw new FetchGaveUpError(last instanceof Error ? last.message : String(last), attempts);
}

/** Text only, for the dry-run path (unchanged behaviour: throws the last error). */
export async function fetchPbsCpiFile(opts: PbsFetchOptions = {}): Promise<string> {
  try {
    return (await fetchPbsCpiFileCounted(opts)).text;
  } catch (err) {
    throw err instanceof FetchGaveUpError ? new Error(err.message) : err;
  }
}

// ───────────────────────────── the dry run ─────────────────────────────

/** Reads a real ledger's current rows for one key. Supplied by the script (live-read mode) or a test. */
export type HistoryReader = (indicatorKey: string) => Promise<{ observation_period: string; value: number; unit: string }[]>;

export interface PlannedSeries {
  indicatorKey: string;
  sdmxIndicator: string;
  unit: string;
  status: SeriesIngestOutcome["status"] | "not-run";
  observationsInSource: number;
  firstPeriod: string | null;
  lastPeriod: string | null;
  newPeriods: number;
  revisedPeriods: number;
  error?: string;
}

export interface DryRunPlan {
  series: PlannedSeries[];
  totals: {
    seriesInSource: number;
    observationsInSource: number;
    newPeriods: number;
    revisedPeriods: number;
    rawInserts: number;
    canonicalInserts: number;
    seriesUnchanged: number;
    seriesUpdated: number;
    seriesFailed: number;
  };
}

export interface DryRunResult {
  ok: boolean;
  report: ValidationReport;
  dataset: PbsCpiDataset | null;
  /** The in-memory ledger after the dry run; null if validation failed and nothing ran. */
  ledger: InMemoryLedger | null;
  plan: DryRunPlan;
  /** Always 0: this module has no database client. Stated in the type so a report can never claim otherwise. */
  writesToRealDatabase: 0;
}

const emptyPlan = (): DryRunPlan => ({
  series: [],
  totals: { seriesInSource: 0, observationsInSource: 0, newPeriods: 0, revisedPeriods: 0, rawInserts: 0, canonicalInserts: 0, seriesUnchanged: 0, seriesUpdated: 0, seriesFailed: 0 },
});

/** Pre-load an in-memory ledger from a real ledger's rows (via `read`), so the dry run compares with the real state. */
export async function seedLedgerFrom(ledger: InMemoryLedger, read: HistoryReader): Promise<{ keysWithRows: number; rows: number }> {
  let keysWithRows = 0;
  let rows = 0;
  for (const def of PBS_CPI_SERIES) {
    const existing = await read(def.indicatorKey);
    if (existing.length > 0) {
      keysWithRows++;
      rows += existing.length;
      ledger.seed(def.indicatorKey, existing);
    }
  }
  return { keysWithRows, rows };
}

/**
 * Validate the PBS file, and only if it is entirely valid, run the real orchestrator
 * against an in-memory ledger to see exactly what would be written.
 *
 * `ledger` may be a pre-seeded or previously-used InMemoryLedger (to test re-runs,
 * revisions and new months); by default a fresh empty one is used.
 */
export async function runPbsCpiDryRun(input: {
  xml: string;
  fileUrl?: string;
  ledger?: InMemoryLedger;
  /** Pre-loads the ledger from a real one. Called ONLY after the file has been fully validated, so a rejected file never reaches the ledger, not even for a read. */
  seed?: (ledger: InMemoryLedger) => Promise<void>;
}): Promise<DryRunResult> {
  const { dataset, report } = loadPbsCpiDataset(input.xml, input.fileUrl ?? PBS_CPI_FILE_URL);
  if (!dataset) {
    // Rejected: nothing is prepared, the ledger is not constructed, read or written.
    return { ok: false, report, dataset: null, ledger: null, plan: emptyPlan(), writesToRealDatabase: 0 };
  }

  const ledger = input.ledger ?? new InMemoryLedger("dry-run");
  if (input.seed) await input.seed(ledger);
  // A plan describes THIS run only. The ledger may have been used before (a re-run, a revision, a new month),
  // and its statistics accumulate, so everything below is measured as a change since this point.
  const before = {
    rawInserted: ledger.counters.rawInserted,
    canonicalInserted: ledger.counters.canonicalInserted,
    stats: new Map([...ledger.stats].map(([k, v]) => [k, { ...v }])),
  };
  const adapter = createPbsCpiGroupsAdapter(dataset);
  const jobs: IngestJob[] = PBS_CPI_SERIES.map((d) => ({ adapter, indicatorKey: d.indicatorKey }));
  // maxRetries 0: the adapter reads memory and the ledger is deterministic, so a retry could only repeat the answer.
  const outcomes = await ingestManySeries(ledger.asClient(), ledger.secret, "dry-run", jobs, { concurrency: 5, maxRetries: 0, retryBaseDelayMs: 0 });

  const byKey = new Map(outcomes.map((o) => [o.indicatorKey, o]));
  const series: PlannedSeries[] = PBS_CPI_SERIES.map((d) => {
    const obs = observationsFor(dataset, d.indicatorKey);
    const o = byKey.get(d.indicatorKey);
    const s = ledger.stats.get(d.indicatorKey);
    const b = before.stats.get(d.indicatorKey);
    return {
      indicatorKey: d.indicatorKey,
      sdmxIndicator: d.sdmxIndicator,
      unit: obs[0]?.unit ?? "",
      status: o?.status ?? "not-run",
      observationsInSource: obs.length,
      firstPeriod: obs[0]?.observationPeriod ?? null,
      lastPeriod: obs[obs.length - 1]?.observationPeriod ?? null,
      newPeriods: (s?.newPeriods ?? 0) - (b?.newPeriods ?? 0),
      revisedPeriods: (s?.revisedPeriods ?? 0) - (b?.revisedPeriods ?? 0),
      error: o?.error,
    };
  });

  const plan: DryRunPlan = {
    series,
    totals: {
      seriesInSource: series.length,
      observationsInSource: series.reduce((n, s) => n + s.observationsInSource, 0),
      newPeriods: series.reduce((n, s) => n + s.newPeriods, 0),
      revisedPeriods: series.reduce((n, s) => n + s.revisedPeriods, 0),
      rawInserts: ledger.counters.rawInserted - before.rawInserted,
      canonicalInserts: ledger.counters.canonicalInserted - before.canonicalInserted,
      seriesUnchanged: series.filter((s) => s.status === "unchanged").length,
      seriesUpdated: series.filter((s) => s.status === "updated").length,
      seriesFailed: series.filter((s) => s.status === "failed").length,
    },
  };
  return { ok: plan.totals.seriesFailed === 0, report, dataset, ledger, plan, writesToRealDatabase: 0 };
}

// ───────────────────────────── the report ─────────────────────────────

const ICON = { pass: "PASS", fail: "FAIL", warn: "WARN" } as const;

export function formatValidationReport(report: ValidationReport): string[] {
  const lines = ["SOURCE VALIDATION"];
  for (const c of report.checks) lines.push(`  [${ICON[c.status]}] ${c.label}${c.detail ? ` — ${c.detail}` : ""}`);
  lines.push(report.ok ? "  => file ACCEPTED: every check passed." : "  => file REJECTED: the whole batch is refused; zero observations prepared, nothing written.");
  return lines;
}

export function formatDryRunReport(result: DryRunResult, opts: { showProvenance?: boolean; ledgerMode?: string; source?: string } = {}): string[] {
  const lines: string[] = ["=== PBS CPI group ingestion — DRY RUN ===", `source: ${opts.source ?? PBS_CPI_FILE_URL}`, `ledger compared against: ${opts.ledgerMode ?? "empty (first-run backfill)"}`, ""];
  lines.push(...formatValidationReport(result.report), "");
  if (!result.dataset) {
    lines.push("PLANNED WRITES: 0 (nothing prepared)", "DATABASE WRITES: 0");
    return lines;
  }
  const d = result.dataset;
  lines.push(
    "DATASET",
    `  DataSetID      ${d.dataSetId ?? "(none in file)"}`,
    `  Prepared       ${d.preparedAt ?? "(none in file)"}   -> source_updated_at`,
    `  declared by    ${d.declaredSource ?? "(none in file)"}`,
    `  base period    ${d.basePeriod}`,
    `  coverage       ${d.months[0]} … ${d.months[d.months.length - 1]} (${d.months.length} months)`,
    "",
    "SERIES (key · SDMX code · observations · first … last period · unit)",
  );
  for (const s of result.plan.series) lines.push(`  ${s.indicatorKey.padEnd(24)} ${s.sdmxIndicator.padEnd(15)} ${String(s.observationsInSource).padStart(3)}  ${s.firstPeriod} … ${s.lastPeriod}  ${s.unit}`);
  const t = result.plan.totals;
  lines.push(
    "",
    "PLANNED OPERATIONS (what a real run would do)",
    `  series in source          ${t.seriesInSource}`,
    `  observations in source    ${t.observationsInSource}`,
    `  new periods               ${t.newPeriods}`,
    `  revised periods (new vintage; old row kept, superseded)  ${t.revisedPeriods}`,
    `  raw-ledger rows to insert ${t.rawInserts}`,
    `  canonical rows to insert  ${t.canonicalInserts}`,
    `  series unchanged / updated / failed   ${t.seriesUnchanged} / ${t.seriesUpdated} / ${t.seriesFailed}`,
  );
  for (const s of result.plan.series.filter((x) => x.status === "failed")) lines.push(`  FAILED ${s.indicatorKey}: ${s.error}`);
  if (opts.showProvenance) {
    lines.push("", "PROVENANCE (one observation of each kind, exactly as it would be written)");
    for (const key of ["pbs:cpiIndexNational", "pbs:cpiGroupIndex07", "pbs:cpiGroupWeight07", "pbs:cpiWeightTotal"]) {
      const o = observationsFor(d, key).at(-1);
      if (!o) continue;
      lines.push(`  ${key} @ ${o.observationPeriod}`, `    value ${o.value} ${o.unit} · source_series_id ${o.sourceSeriesId} · quality ${o.qualityStatus} · release_date ${o.releaseDate}`, `    source_updated_at ${o.sourceUpdatedAt}`, `    source_reference ${JSON.stringify(o.sourceReference)}`);
    }
  }
  lines.push("", "DATABASE WRITES: 0   (dry run: the planned writes above were applied to an in-memory ledger only)");
  return lines;
}

