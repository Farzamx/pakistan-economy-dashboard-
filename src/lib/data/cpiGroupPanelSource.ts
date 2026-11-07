// Supplies the Inflation page's CPI group panel: the PEIC observation ledger first, PBS's live file as the fallback.
//
// This file is only WIRING. Every rule lives, tested, in src/lib/inflation/panelSource.ts; the two sources are the existing
// ledger reader (src/lib/data/cpiGroupLedgerReader.ts) and the existing PBS fetcher (src/lib/data/pbsCpiGroups.ts), both unchanged.
//
//   ledger valid and current          -> the ledger. PBS is not fetched.
//   ledger behind the calendar        -> PBS is asked once; used only if valid and strictly newer.
//   ledger unavailable / invalid      -> PBS (labelled as a fallback).
//   neither usable                    -> no panel; the caller decides what that means (the page refuses to regenerate at runtime,
//                                        so ISR keeps the last good page — providerFailurePolicy.ts).
//
// Nothing here writes, merges or repairs data: the result is exactly one source's panel.

import "server-only";
import { readLedgerPanel } from "@/lib/data/cpiGroupLedgerReader";
import { getCpiGroupPanel } from "@/lib/data/pbsCpiGroups";
import { formatSourceLog, selectPanel, type PanelSelection, type SelectionDeps } from "@/lib/inflation/panelSource";

/**
 * The cron_run_log job name of the PBS CPI ingestion. Defined here, not imported, so this module does not pull the ingestion
 * script's or the watchdog's dependency trees into a page bundle. cpiGroupPanelSource.test.ts pins it to both of them.
 */
export const CPI_INGESTION_JOB_NAME = "pbs-cpi-groups-ingestion";
/** Passed to the run-evidence evaluator only because it requires one; this page does not display a run-health verdict. */
export const CPI_RUN_STALE_AFTER_HOURS = 216;

export async function resolveCpiGroupPanel(overrides: Partial<SelectionDeps> = {}): Promise<PanelSelection> {
  const selection = await selectPanel({
    readLedger: () => readLedgerPanel(),
    fetchPbs: () => getCpiGroupPanel(),
    now: new Date(),
    ...overrides,
  });
  // One greppable line per page generation. A log alert on `fallback=true` is the monitor for "the ledger is not being kept current".
  (selection.note.fallback ? console.warn : console.info)(formatSourceLog(selection.note));
  return selection;
}
