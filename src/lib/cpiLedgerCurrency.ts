// Is the PBS CPI ledger CURRENT — and, if not, why not?
//
// This is the data-currency half of CPI monitoring. It is deliberately NOT part of the ingestion watchdog: that watchdog's
// contract is "did the job run?" and it must never call a provider (ingestionWatchdog.ts header). Deciding whether the ledger
// is behind PBS needs a look at PBS, so this module takes a PBS PROBE as an input and leaves the probing to its caller (the
// read-only status script today; the Inflation page's own source note already does an equivalent cross-check at render time).
//
// Inputs are real evidence only, and anything not known stays unknown:
//   * per-key latest observation period and vintage — from get_canonical_freshness_summary (one existing public read RPC);
//   * a PBS probe (the newest month in PBS's live file and its Prepared time), or "not probed", or "unreachable";
//   * the cron_run_log run evidence (cpiIngestionMonitor.ts);
//   * a clock.
// No timestamp is manufactured: the last DATA CHANGE is the newest canonical vintage among the 26 keys, and is null if the
// keys have none.
//
// SIX DIMENSIONS, kept apart (the brief's list). This module and cpiIngestionMonitor.ts fill in the first four from evidence;
// the last two belong to the Inflation page (Phase F.2e) and are reported here as "page-side, not evaluated" rather than
// invented:
//   1 latest observation period   ledger: max observation_period            (here)
//   2 last ingestion run          cron_run_log, newest completed row        (cpiIngestionMonitor)
//   3 last data change            newest canonical vintage                  (here)
//   4 last source fetch           newest run that reached PBS               (cpiIngestionMonitor)
//   5 last page generation        page-side                                 (not evaluated)
//   6 current page source/fallback page-side                                (not evaluated)
//
// STATES of the ledger:
//   no-data                   none of the 26 keys has a row
//   partial-release           the 26 keys do not all stop at the same month, or some are absent: a release is only
//                             PARTLY ingested (the Inflation page rejects such a ledger whole and falls back to PBS)
//   current                   all 26 agree and nothing newer can be due (latest >= the previous calendar month), or PBS
//                             confirms it holds nothing newer
//   awaiting-release          all 26 agree, the ledger is older than the previous calendar month, and PBS confirms it
//                             has nothing newer — a NORMAL state in the days before PBS publishes (no false alarm)
//   behind-pbs                all 26 agree and PBS holds a NEWER month: ingestion has not picked the release up yet
//   pbs-unreachable           the ledger is older than expected and PBS could not be asked: awaiting-release and
//                             behind-pbs cannot be told apart — reported as unknown, never as current
//   behind-calendar-unverified the same, but PBS was not probed at all

import type { LedgerKeyState } from "@/lib/cpiLedgerKeys";
import { previousCalendarMonth } from "@/lib/inflation/panelSource";
import { PBS_CPI_INDICATOR_KEYS } from "@/lib/providers/pbsCpiSeries";
import type { CpiRunEvidence } from "@/lib/cpiIngestionMonitor";

export type { LedgerKeyState };

export type PbsProbe = { ok: true; latestMonth: string; preparedAt?: string | null } | { ok: false; error: string } | null;

export type CurrencyState = "no-data" | "partial-release" | "current" | "awaiting-release" | "behind-pbs" | "pbs-unreachable" | "behind-calendar-unverified";

/** A newer PBS release that the ledger still lacks this long after PBS prepared it is an ingestion problem, not a delay. */
export const BEHIND_PBS_ESCALATE_HOURS = 48;

export interface LedgerCurrency {
  state: CurrencyState;
  ledgerLatestMonth: string | null;
  pbsLatestMonth: string | null;
  expectedMonth: string;
  keysExpected: number;
  keysWithData: number;
  keysAtLatest: number;
  /** Keys that are absent or stop before the newest month. */
  laggingKeys: string[];
  /** Newest canonical vintage among the keys (when PEIC last wrote any of them). null if there is none. */
  lastDataChangeAt: string | null;
  /** Hours since PBS prepared a release the ledger still lacks; null unless state is behind-pbs and PBS reported when. */
  behindForHours: number | null;
  lines: string[];
}

const month = (period: string | null) => (period ? period.slice(0, 7) : null);

export function evaluateLedgerCurrency(keys: readonly LedgerKeyState[], pbs: PbsProbe, now: Date): LedgerCurrency {
  const expectedMonth = previousCalendarMonth(now);
  const byKey = new Map(keys.map((k) => [k.key, k]));
  const states = PBS_CPI_INDICATOR_KEYS.map((key) => ({ key, latest: month(byKey.get(key)?.latestPeriod ?? null), vintage: byKey.get(key)?.vintage ?? null }));
  const withData = states.filter((s) => s.latest !== null);
  const latestMonths = withData.map((s) => s.latest as string).sort();
  const ledgerLatestMonth = latestMonths.length ? latestMonths[latestMonths.length - 1] : null;
  const atLatest = withData.filter((s) => s.latest === ledgerLatestMonth);
  const laggingKeys = states.filter((s) => s.latest === null || s.latest !== ledgerLatestMonth).map((s) => s.key);
  const vintages = states.map((s) => s.vintage).filter((v): v is string => !!v && Number.isFinite(Date.parse(v))).sort();
  const lastDataChangeAt = vintages.length ? vintages[vintages.length - 1] : null;
  const pbsLatestMonth = pbs && pbs.ok ? pbs.latestMonth : null;

  const base = {
    ledgerLatestMonth,
    pbsLatestMonth,
    expectedMonth,
    keysExpected: PBS_CPI_INDICATOR_KEYS.length,
    keysWithData: withData.length,
    keysAtLatest: atLatest.length,
    laggingKeys,
    lastDataChangeAt,
    behindForHours: null as number | null,
  };
  const lines: string[] = [];

  if (withData.length === 0) {
    lines.push("The ledger holds no PBS CPI observations at all.");
    return { ...base, state: "no-data", lines };
  }
  if (laggingKeys.length > 0) {
    lines.push(`PARTLY ingested: ${atLatest.length} of ${base.keysExpected} series reach ${ledgerLatestMonth}; ${laggingKeys.length} stop earlier or are absent (${laggingKeys.slice(0, 4).join(", ")}${laggingKeys.length > 4 ? ", …" : ""}).`);
    lines.push("The Inflation page rejects a partial ledger whole and falls back to PBS; a later complete run repairs it.");
    return { ...base, state: "partial-release", lines };
  }

  const L = ledgerLatestMonth as string;
  lines.push(`All ${base.keysExpected} series reach ${L}. Expected by now (previous calendar month): ${expectedMonth}.`);

  if (pbs && pbs.ok && pbs.latestMonth > L) {
    const prepared = pbs.preparedAt && Number.isFinite(Date.parse(pbs.preparedAt)) ? Date.parse(pbs.preparedAt) : null;
    const behindForHours = prepared === null ? null : Math.max(0, (now.getTime() - prepared) / 3_600_000);
    lines.push(`PBS holds ${pbs.latestMonth}, newer than the ledger's ${L}${behindForHours === null ? "" : ` (prepared ${Math.floor(behindForHours)}h ago)`}: ingestion has not picked it up yet.`);
    return { ...base, behindForHours, state: "behind-pbs", lines };
  }
  if (L >= expectedMonth) {
    lines.push("Nothing newer can be due yet: the ledger is current.");
    return { ...base, state: "current", lines };
  }
  // Older than expected, and PBS is not newer (or unknown).
  if (pbs && pbs.ok) {
    lines.push(`PBS also stops at ${pbs.latestMonth}: the next release is not out yet — awaiting release, which is normal.`);
    return { ...base, state: "awaiting-release", lines };
  }
  if (pbs && !pbs.ok) {
    lines.push(`The ledger is older than expected and PBS could not be asked (${pbs.error}): "awaiting release" and "behind PBS" cannot be told apart.`);
    return { ...base, state: "pbs-unreachable", lines };
  }
  lines.push("The ledger is older than expected and PBS was not probed: cannot tell whether a release is overdue for ingestion.");
  return { ...base, state: "behind-calendar-unverified", lines };
}

// ───────────────────────────── the combined verdict ─────────────────────────────

export type Severity = "ok" | "notice" | "warning" | "critical";

export interface CpiIngestionStatus {
  severity: Severity;
  headline: string;
  reasons: string[];
  run: CpiRunEvidence;
  currency: LedgerCurrency;
  /** The six dimensions, each either a real value or null/"not evaluated" — never defaulted. */
  dimensions: {
    latestObservationPeriod: string | null;
    lastIngestionRun: string | null;
    lastDataChange: string | null;
    lastSourceFetch: string | null;
    lastPageGeneration: "page-side: not evaluated here";
    currentPageSource: "page-side: not evaluated here";
  };
}

/** The status as plain lines for a terminal: verdict first, then the six dimensions, then the evidence behind them. */
export function formatCpiIngestionStatus(s: CpiIngestionStatus): string[] {
  const d = s.dimensions;
  const v = (x: string | null) => x ?? "— (no evidence)";
  return [
    `STATUS: ${s.headline}`,
    ...s.reasons.slice(1).map((r) => `        also: ${r}`),
    "",
    "THE SIX DIMENSIONS (kept apart)",
    `  1 latest observation period : ${v(d.latestObservationPeriod)}`,
    `  2 last ingestion run        : ${v(d.lastIngestionRun)}   [cron_run_log — proves a RUN happened, not that data changed]`,
    `  3 last data change          : ${v(d.lastDataChange)}   [newest canonical vintage in the ledger]`,
    `  4 last source fetch         : ${v(d.lastSourceFetch)}   [newest run that reached PBS]`,
    `  5 last page generation      : ${d.lastPageGeneration}`,
    `  6 current page source       : ${d.currentPageSource}`,
    "",
    "RUNS (cron_run_log)",
    ...s.run.lines.map((l) => `  ${l}`),
    "",
    "LEDGER vs PBS",
    ...s.currency.lines.map((l) => `  ${l}`),
  ];
}

const rank: Record<Severity, number> = { ok: 0, notice: 1, warning: 2, critical: 3 };

export function evaluateCpiIngestionStatus(run: CpiRunEvidence, currency: LedgerCurrency): CpiIngestionStatus {
  let severity: Severity = "ok";
  const reasons: string[] = [];
  const raise = (s: Severity, why: string) => {
    if (rank[s] > rank[severity]) severity = s;
    reasons.push(why);
  };

  switch (run.state) {
    case "healthy": break;
    case "failing": raise("warning", `the latest ingestion run failed (${run.cause ?? "unknown cause"})`); break;
    case "repeatedly-failing": raise("critical", `ingestion has failed ${run.consecutiveFailures} runs in a row (${run.cause ?? "unknown cause"})`); break;
    case "overdue": raise("critical", "ingestion is NOT RUNNING (no completed run within the stale window)"); break;
    case "no-runs": raise("critical", "ingestion has no completed run on record"); break;
  }
  switch (currency.state) {
    case "current": break;
    case "awaiting-release": raise("notice", `ledger is at ${currency.ledgerLatestMonth}; PBS has not published ${currency.expectedMonth} yet (normal)`); break;
    case "behind-pbs":
      if (currency.behindForHours !== null && currency.behindForHours > BEHIND_PBS_ESCALATE_HOURS) raise("critical", `PBS has held ${currency.pbsLatestMonth} for ${Math.floor(currency.behindForHours)}h and the ledger still lacks it`);
      else raise("warning", `PBS holds ${currency.pbsLatestMonth}; the ledger is at ${currency.ledgerLatestMonth} (the next scheduled run should ingest it)`);
      break;
    case "partial-release": raise(run.cause === "partial-ingestion" || run.state !== "healthy" ? "critical" : "warning", `release only partly ingested (${currency.keysAtLatest}/${currency.keysExpected} series at ${currency.ledgerLatestMonth})`); break;
    case "no-data": raise("critical", "the ledger holds no PBS CPI data"); break;
    case "pbs-unreachable": raise("warning", "ledger older than expected and PBS could not be checked"); break;
    case "behind-calendar-unverified": raise("notice", "ledger older than expected; PBS not probed, so currency is unverified"); break;
  }
  // The case the brief singles out: a run that SUCCEEDED but left the ledger behind.
  if (run.state === "healthy" && currency.state === "behind-pbs") reasons.push("the latest run succeeded, but PBS has published since — a successful run is not proof that the ledger is current");

  const headline =
    severity === "ok" ? "ok — ingestion healthy and the ledger is current"
    : severity === "notice" ? `notice — ${reasons[0]}`
    : `${severity} — ${reasons[0]}`;

  return {
    severity,
    headline,
    reasons,
    run,
    currency,
    dimensions: {
      latestObservationPeriod: currency.ledgerLatestMonth,
      lastIngestionRun: run.lastCompleted?.at ?? null,
      lastDataChange: currency.lastDataChangeAt,
      lastSourceFetch: run.lastSourceFetch?.at ?? null,
      lastPageGeneration: "page-side: not evaluated here",
      currentPageSource: "page-side: not evaluated here",
    },
  };
}
