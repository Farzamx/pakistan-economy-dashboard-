// Phase F.2e-Prep — PROTOTYPE, NOT WIRED INTO THE PAGE.
//
// Which source supplies the Inflation page's CPI group panel: the PEIC observation ledger (primary) or PBS's live
// file (fallback)? One decision, made here, in one place, with every outcome named so it can be logged and shown.
//
//   1. Read and validate the ledger (ledgerPanel.ts).
//   2. Valid and CURRENT           -> use it. PBS is not even fetched.
//   3. Valid but BEHIND the calendar (its latest month is older than the previous calendar month — i.e. a release
//      should exist that the ledger does not hold yet) -> cross-check PBS once:
//        PBS valid and strictly NEWER -> use PBS live, for the whole panel   (ledger-behind-source)
//        otherwise                    -> keep the ledger                     (awaiting-release)
//   4. Unavailable or invalid       -> PBS live                              (fallback-ledger-*)
//   5. Neither usable               -> no panel; both reasons reported       (unavailable-both)
//
// INVARIANTS (pinned by tests)
//   * The returned panel is EXACTLY one source's panel object. Ledger and PBS data are never merged, patched,
//     truncated to a common window, or interpolated. A partly-updated ledger is rejected whole (ledgerPanel.ts).
//   * The fallback is the existing PBS path, unchanged; its result is as trustworthy as it is today.
//   * Freshness never regresses relative to the live-PBS page: whenever PBS has a newer valid month than the ledger,
//     PBS wins — so the page is safe to run BEFORE scheduled ingestion exists.
//   * The decision is explained in `note` (source, reason, both sides' issues, latest months) for logs and display.
//
// "Behind the calendar" is a SELECTION rule local to this module. It is not the freshness engine and does not change
// any freshness definition or threshold; it only decides when it is worth asking PBS a second opinion.

import type { LedgerPanelResult, LedgerProvenance } from "@/lib/inflation/ledgerPanel";
import type { CpiGroupPanel } from "@/lib/inflation/pbsGroups";
import { shiftMonth, type MonthKey } from "@/lib/inflation/periods";

export type PanelSource = "ledger" | "pbs-live";

export type SelectionReason =
  | "ledger"                        // primary source, current
  | "ledger-awaiting-release"       // primary source, behind the calendar, PBS has nothing newer (or could not be asked)
  | "fallback-ledger-unavailable"   // PBS used: the ledger could not be read
  | "fallback-ledger-invalid"       // PBS used: the ledger was read but failed a data check
  | "fallback-ledger-behind-source" // PBS used: PBS holds a newer valid month than the ledger
  | "unavailable-both";             // no panel

export interface SourceNote {
  source: PanelSource | null;
  reason: SelectionReason;
  /** True whenever the page is NOT running on its primary source's own current data (every reason but the first two). */
  fallback: boolean;
  ledgerIssues: string[];
  pbsIssues: string[];
  /** Was PBS asked at all? (It is only asked when the ledger cannot serve, or is behind the calendar.) */
  pbsChecked: boolean;
  ledgerLatestMonth: MonthKey | null;
  pbsLatestMonth: MonthKey | null;
  /** The month a current ledger should hold now: the previous calendar month (UTC). */
  expectedLatestMonth: MonthKey;
  ledger: LedgerProvenance | null;
}

export interface PbsPanelResult {
  panel: CpiGroupPanel | null;
  issues: string[];
}

export interface PanelSelection {
  panel: CpiGroupPanel | null;
  /** Non-empty iff panel is null; each line says which source it concerns. */
  issues: string[];
  source: PanelSource | null;
  note: SourceNote;
}

export interface SelectionDeps {
  /** Must not throw; failures are carried inside the result. */
  readLedger: () => Promise<LedgerPanelResult>;
  /** Must not throw. Called only when needed. */
  fetchPbs: () => Promise<PbsPanelResult>;
  now: Date;
}

/** The previous calendar month in UTC — the month PBS will have published by the time this one is under way. */
export function previousCalendarMonth(now: Date): MonthKey {
  const current = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  return shiftMonth(current, -1);
}

/** True if a ledger whose newest month is `latest` should already hold something newer. */
export function ledgerIsBehind(latest: MonthKey, now: Date): boolean {
  return latest < previousCalendarMonth(now);
}

const latestOf = (panel: CpiGroupPanel | null): MonthKey | null => (panel ? panel.months[panel.months.length - 1] : null);
const label = (prefix: string, issues: readonly string[]) => issues.map((i) => `${prefix}: ${i}`);

export async function selectPanel(deps: SelectionDeps): Promise<PanelSelection> {
  const expectedLatestMonth = previousCalendarMonth(deps.now);
  const ledger = await deps.readLedger();
  const base = {
    ledgerIssues: ledger.issues,
    ledgerLatestMonth: latestOf(ledger.panel),
    expectedLatestMonth,
    ledger: ledger.provenance,
  };

  // ── 2/3. a valid ledger ─────────────────────────────────────────────────────
  if (ledger.panel) {
    const behind = ledgerIsBehind(base.ledgerLatestMonth as MonthKey, deps.now);
    if (!behind) {
      return { panel: ledger.panel, issues: [], source: "ledger", note: { ...base, source: "ledger", reason: "ledger", fallback: false, pbsIssues: [], pbsChecked: false, pbsLatestMonth: null } };
    }
    const pbs = await deps.fetchPbs();
    const pbsLatest = latestOf(pbs.panel);
    if (pbs.panel && (pbsLatest as MonthKey) > (base.ledgerLatestMonth as MonthKey)) {
      return { panel: pbs.panel, issues: [], source: "pbs-live", note: { ...base, source: "pbs-live", reason: "fallback-ledger-behind-source", fallback: true, pbsIssues: [], pbsChecked: true, pbsLatestMonth: pbsLatest } };
    }
    return {
      panel: ledger.panel,
      issues: [],
      source: "ledger",
      note: { ...base, source: "ledger", reason: "ledger-awaiting-release", fallback: false, pbsIssues: pbs.issues, pbsChecked: true, pbsLatestMonth: pbsLatest },
    };
  }

  // ── 4/5. the ledger cannot serve ────────────────────────────────────────────
  const pbs = await deps.fetchPbs();
  if (pbs.panel) {
    return {
      panel: pbs.panel,
      issues: [],
      source: "pbs-live",
      note: {
        ...base,
        source: "pbs-live",
        reason: ledger.failureKind === "unavailable" ? "fallback-ledger-unavailable" : "fallback-ledger-invalid",
        fallback: true,
        pbsIssues: [],
        pbsChecked: true,
        pbsLatestMonth: latestOf(pbs.panel),
      },
    };
  }
  return {
    panel: null,
    issues: [...label("Ledger", ledger.issues), ...label("PBS file", pbs.issues)],
    source: null,
    note: { ...base, source: null, reason: "unavailable-both", fallback: true, pbsIssues: pbs.issues, pbsChecked: true, pbsLatestMonth: null },
  };
}

/** One greppable line for the platform log. No URLs with credentials, no values — only the decision and its reasons. */
export function formatSourceLog(note: SourceNote): string {
  const parts = [
    `source=${note.source ?? "none"}`,
    `reason=${note.reason}`,
    `fallback=${note.fallback}`,
    `ledgerLatest=${note.ledgerLatestMonth ?? "n/a"}`,
    `pbsLatest=${note.pbsLatestMonth ?? "n/a"}`,
    `expected=${note.expectedLatestMonth}`,
    `pbsChecked=${note.pbsChecked}`,
  ];
  const why = [...note.ledgerIssues.map((i) => `ledger: ${i}`), ...note.pbsIssues.map((i) => `pbs: ${i}`)];
  return `[InflationPage] CPI group source: ${parts.join(" ")}${why.length ? ` | ${why.slice(0, 4).join(" | ")}${why.length > 4 ? ` | (+${why.length - 4} more)` : ""}` : ""}`;
}

/** The plain-language label for the methodology section / a source badge. */
export function describeSource(note: SourceNote): string {
  switch (note.reason) {
    case "ledger":
      return "PEIC observation ledger (PBS CPI file, ingested)";
    case "ledger-awaiting-release":
      return "PEIC observation ledger (PBS CPI file, ingested); no newer month is published yet";
    case "fallback-ledger-unavailable":
      return "PBS CPI file, read directly (the PEIC ledger was unavailable)";
    case "fallback-ledger-invalid":
      return "PBS CPI file, read directly (the PEIC ledger failed its data checks)";
    case "fallback-ledger-behind-source":
      return "PBS CPI file, read directly (it holds a newer month than the PEIC ledger)";
    case "unavailable-both":
      return "unavailable";
  }
}
