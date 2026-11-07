// What the Inflation page tells a reader about WHERE its CPI-group data came from and HOW FRESH each part of that is.
//
// Pure (no I/O, no clock): everything is passed in, so every statement the page makes about its own data is unit-tested.
//
// SIX DIFFERENT QUESTIONS, kept apart on purpose (docs/inflation-ledger-migration-assessment.md §6). None of them is
// derived from another, and none is ever shown as a single "freshness" badge:
//
//   1. latest observation period  — what month the newest figure describes          (the panel actually used)
//   2. last ingestion run         — did PEIC's ingestion job last run, and how did it end (cron_run_log; the only place an
//                                   UNCHANGED run is visible)
//   3. last data change           — when PEIC last wrote a row to the ledger          (max fetched_at of the 26 series)
//   4. last source fetch          — when PEIC last heard from PBS                     (an ingestion run that reached PBS, or
//                                   this page's own read of PBS when it used or checked PBS)
//   5. last page generation       — how old the page the visitor sees is              (stamped at render)
//   6. current source / fallback  — which path served the data, and why               (the SourceNote from panelSource.ts)
//
// What this module deliberately does NOT do: it never states whether scheduled ingestion exists, is configured or is active.
// A scheduler template in the repository, a registered task and a first successful run are three different facts; this page
// reports only what the data itself shows (the last run on record, if any), so it cannot claim more than is true.

import type { CpiRunEvidence } from "@/lib/cpiIngestionMonitor";
import { describeSource, type PanelSource, type SelectionReason, type SourceNote } from "@/lib/inflation/panelSource";
import type { MonthKey } from "@/lib/inflation/periods";

export interface RunStamp {
  /** finished_at of the cron_run_log row. */
  at: string;
  status: "success" | "failure" | "skipped";
  /** The structured outcome (updated / unchanged / partial / rejected / pbs-unavailable / …), or null for an older log format. */
  outcome: string | null;
}

export interface GroupSourceInfo {
  // ── 6. current source and fallback status ──
  source: PanelSource | null;
  reason: SelectionReason;
  /** True whenever the page is not running on the ledger's own current data. */
  fallback: boolean;
  /** Plain-language description of the path (describeSource). */
  label: string;

  // ── 1. latest observation period ──
  /** Latest month of the panel actually used; null when there is no panel. */
  latestPeriod: MonthKey | null;
  /** The month a current ledger should hold now (the previous calendar month). */
  expectedPeriod: MonthKey;
  ledgerLatestPeriod: MonthKey | null;
  pbsLatestPeriod: MonthKey | null;
  /** Was PBS asked during this page generation? */
  pbsChecked: boolean;

  // ── 2. last ingestion run (cron_run_log) ──
  /**
   * Newest completed run on record. Null means "none is on record OR the history could not be read": the existing reader
   * (cronLogging.getCronRunHistory) reports a failed read as an empty list, so the two cannot be told apart and are never
   * presented as different.
   */
  lastIngestionRun: RunStamp | null;

  // ── 3. last data change (ledger) ──
  /** Max fetched_at over the ledger's 26 series; null when the ledger could not be read. */
  lastDataChangeAt: string | null;
  /** The PBS file's own Prepared timestamp as stored in the ledger (latest across rows); null off the ledger path. */
  sourceFilePreparedAt: string | null;

  // ── 4. last source fetch ──
  lastSourceFetch: { at: string; by: "ingestion-run" | "page-generation" } | null;

  // ── 5. last page generation ──
  pageGeneratedAt: string;
}

const latestOf = (note: SourceNote): MonthKey | null => (note.source === "ledger" ? note.ledgerLatestMonth : note.source === "pbs-live" ? note.pbsLatestMonth : null);

function stamp(row: { at: string; status: RunStamp["status"]; parsed: { outcome?: string } } | null): RunStamp | null {
  return row ? { at: row.at, status: row.status, outcome: row.parsed.outcome ?? null } : null;
}

/**
 * @param note       the decision panelSource.selectPanel made for this page generation
 * @param runs       evidence from the PBS CPI ingestion job's cron_run_log rows, or null if none was evaluated
 * @param generatedAt ISO timestamp of this render
 */
export function buildGroupSourceInfo(note: SourceNote, runs: CpiRunEvidence | null, generatedAt: string): GroupSourceInfo {
  // This page read PBS itself if it used PBS, or asked PBS and got a valid file (the "ledger is behind the calendar" check).
  const pagePbsRead = note.source === "pbs-live" || (note.pbsChecked && note.pbsLatestMonth !== null);
  const runFetch = runs?.lastSourceFetch ?? null;

  return {
    source: note.source,
    reason: note.reason,
    fallback: note.fallback,
    label: describeSource(note),
    latestPeriod: latestOf(note),
    expectedPeriod: note.expectedLatestMonth,
    ledgerLatestPeriod: note.ledgerLatestMonth,
    pbsLatestPeriod: note.pbsLatestMonth,
    pbsChecked: note.pbsChecked,
    lastIngestionRun: stamp(runs?.lastCompleted ?? null),
    lastDataChangeAt: note.ledger?.fetchedAt.max ?? null,
    sourceFilePreparedAt: note.source === "ledger" ? (note.ledger?.sourceUpdatedAt.max ?? null) : null,
    lastSourceFetch: pagePbsRead ? { at: generatedAt, by: "page-generation" } : runFetch ? { at: runFetch.at, by: "ingestion-run" } : null,
    pageGeneratedAt: generatedAt,
  };
}

/** One sentence a reader can act on, or null when nothing needs saying (the ledger is the current source). */
export function fallbackNotice(info: GroupSourceInfo): string | null {
  switch (info.reason) {
    case "ledger":
      return null;
    case "ledger-awaiting-release":
      return "No newer month is published yet, so this page shows the most recent month PEIC holds.";
    case "fallback-ledger-behind-source":
      return "PBS has published a newer month than PEIC has stored, so this page reads PBS's file directly until PEIC stores it.";
    case "fallback-ledger-unavailable":
      return "PEIC's stored copy could not be read, so this page reads PBS's file directly.";
    case "fallback-ledger-invalid":
      return "PEIC's stored copy failed its data checks, so this page reads PBS's file directly.";
    case "unavailable-both":
      return "Neither PEIC's stored copy nor PBS's file could be used, so the group analysis is not shown.";
  }
}
