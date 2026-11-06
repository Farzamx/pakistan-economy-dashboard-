// Multi-provider ingestion dead-man's switch — Phase 8.6.
//
// PROBLEM THIS SOLVES
// Ingestion for a monitored provider can run from a machine outside this
// application's control (a laptop's Task Scheduler). When it stops running,
// nothing currently notices: the canonical ledger simply keeps serving its
// last-known values, and the site looks healthy while the data silently
// ages. This happened for real for SBP — ingestion last succeeded on
// 2026-08-08 and the gap was only discovered four days later during
// unrelated transport work (Phase 2D).
//
// WHAT IT DOES NOT DO
// This is strictly about INGESTION-RUN health: did the job complete? It is
// not a freshness engine and deliberately makes no claim about whether a
// provider has published newer data. Two consequences follow, both
// intentional:
//
//   - A successful run that found nothing new is HEALTHY. "3 unchanged"
//     means the pipeline worked and the provider had no new observations —
//     that is a correct outcome, not a failure.
//   - Rows existing in canonical_observations proves nothing about health.
//     Old rows persist forever by design, so presence of data is not
//     evidence that ingestion still runs.
//
// This module has zero dependency on freshnessEngine.ts / seriesRegistry.ts
// and must stay that way — INGESTION SCHEDULE (how often the job is
// supposed to run) and DATA FRESHNESS CADENCE (how often the underlying
// observation is expected to change) are different concepts that live in
// different places. World Bank ingestion runs weekly; the GDP-growth
// observation it fetches is annual — conflating the two would silently
// misrepresent one or the other.
//
// NO SCHEMA CHANGE (Phase 8.5 audit, confirmed again here)
// cron_run_log already carries everything required: job_name, status and a
// free-text detail column. The watchdog reads a monitored job's history for
// its last success, and records its own decisions under a SEPARATE job
// name (that job's own watchdogJobName), which is what makes per-job alert
// de-duplication possible without a new table or column.
//
// GENERALIZATION (Phase 8.6)
// Previously SBP-only (runSbpIngestionWatchdog, module-level constants).
// evaluateIngestionHealth() was already pure and had zero SBP-specific
// logic in its body — only the THRESHOLD NUMBERS were hardcoded module
// constants. Generalized by making the job's identity/cadence/threshold an
// explicit parameter (IngestionMonitorJob) rather than a global — the
// evaluator still never reads the registry itself, it only receives one
// job object per call, keeping it exactly as pure and provider-agnostic as
// before.

import { getCronRunHistory, logCronRun, type CronRunRecord } from "@/lib/cronLogging";
import { sendEmail } from "@/lib/email/resend";
import { evaluateCpiRunEvidence } from "@/lib/cpiIngestionMonitor";

/**
 * One monitored ingestion job. `jobName` (ingestionJobName/watchdogJobName)
 * remains the sole identity — no separate providerId: every job already has
 * a globally-unique job_name in cron_run_log, and nothing in this codebase
 * groups multiple ingestion jobs under one provider concept today (Phase
 * 8.5 audit finding — adding one would be an unused abstraction).
 */
export interface IngestionMonitorJob {
  /** The job_name the ingestion script itself logs under (cron_run_log). */
  ingestionJobName: string;
  /** This job's own dead-man's-switch dedup ledger — a separate job_name so a watchdog run is never mistaken for an ingestion run, and so one job's alert history can never be read while evaluating another job. */
  watchdogJobName: string;
  /** Human-readable name used in alert copy. */
  label: string;
  /** Documented schedule interval for the INGESTION JOB itself (not the underlying data's publication cadence). */
  expectedIntervalHours: number;
  /** TOTAL allowed age since the last success before this job counts as stale. See each job's own inline justification below. */
  staleAfterHours: number;
  /** Shown in alert copy as "how to check/re-run it manually". Optional — omitted rather than guessed if a job has no simple manual command. */
  commandHint?: string;
  /**
   * Optional (Phase F.2f). Explains WHY a job is unhealthy from its own cron_run_log history — pure, no I/O, no provider call:
   * "not running" vs "failing because the provider is down" vs "a release only partly ingested". Its lines are appended to the
   * alert and a one-token summary to the watchdog's own log row. A job without it behaves EXACTLY as before (the evaluator,
   * the episode and reminder logic, and the alert text of every existing job are untouched). It cannot change the state or
   * whether an alert is sent; it only adds explanation, and a failure inside it is swallowed.
   */
  diagnose?: (ctx: { ingestionRuns: CronRunRecord[]; now: Date }) => IngestionDiagnosis;
}

export interface IngestionDiagnosis {
  /** A short token for the watchdog's log row, e.g. "repeatedly-failing:pbs-unavailable". */
  summary: string;
  /** Plain statements for the alert body. Must contain no URLs and no credentials. */
  lines: string[];
}

/**
 * docs/local-ingestion-setup.md: Task Scheduler trigger "Daily ... recur
 * every 1 day". 36h = one full daily cycle can be missed entirely before
 * this fires — a laptop asleep at the scheduled minute that runs a couple
 * hours late (StartWhenAvailable) is not a fault worth an email.
 */
export const SBP_MONITOR_JOB: IngestionMonitorJob = {
  ingestionJobName: "sbp-local-ingestion",
  watchdogJobName: "sbp-ingestion-watchdog",
  label: "SBP ingestion",
  expectedIntervalHours: 24,
  staleAfterHours: 36,
  commandHint: "npm run ingest:sbp",
};

/**
 * docs/local-ingestion-setup.md ("World Bank GDP-growth ingestion"): Task
 * Scheduler trigger weekly, Mondays 08:15 PKT, same StartWhenAvailable +
 * WakeToRun + MultipleInstances:IgnoreNew behavior as SBP's task.
 *
 * staleAfterHours = 216h (9 days) = 168h interval + 48h buffer. Chosen
 * (Phase 8.6, evidence-based, not copied from SBP's 1.5x ratio) to absorb
 * a laptop being off/asleep over an ordinary long weekend without alerting
 * on a single Monday run that catches up a day or two late, while still
 * firing well before a SECOND consecutive Monday would be missed (336h) —
 * giving a bounded, meaningful detection window without being
 * trigger-happy on ordinary StartWhenAvailable jitter. Confirmed with the
 * user before implementation (see Phase 8.6 report) rather than assumed.
 */
export const WORLD_BANK_MONITOR_JOB: IngestionMonitorJob = {
  ingestionJobName: "worldbank-gdp-growth-ingestion",
  watchdogJobName: "worldbank-ingestion-watchdog",
  label: "World Bank GDP-growth ingestion",
  expectedIntervalHours: 168,
  staleAfterHours: 216,
  commandHint: "npm run ingest:worldbank",
};

/**
 * Phase 8.10D. docs/local-ingestion-setup.md-equivalent facts (confirmed
 * directly against the live Task Scheduler registration, Phase 8.10C):
 * Task Scheduler trigger weekly, Mondays 08:30 PKT, the same
 * StartWhenAvailable + WakeToRun + MultipleInstances:IgnoreNew + Interactive
 * logon behavior as SBP's and World Bank's tasks — confirmed identical, not
 * assumed.
 *
 * expectedIntervalHours/staleAfterHours are reused verbatim from
 * WORLD_BANK_MONITOR_JOB rather than freshly derived: this is the SAME
 * weekly cadence, on the SAME laptop, under the SAME scheduler mechanics
 * (identical StartWhenAvailable/WakeToRun catch-up behavior), so every fact
 * the Phase 8.6 threshold decision was actually based on — "absorb an
 * ordinary long-weekend laptop-off period without alerting on a single
 * Monday run that catches up a day or two late, while still firing before a
 * second consecutive Monday is missed" — applies unchanged. This is reuse of
 * an already-made, evidence-based decision for an identical situation, not
 * a fresh policy call and not "blindly copying" SBP's unrelated 36h
 * daily-cadence number (which this job deliberately does NOT use).
 */
export const NET_LIQUID_RESERVES_MONITOR_JOB: IngestionMonitorJob = {
  ingestionJobName: "netliquidreserves-ingestion",
  watchdogJobName: "netliquidreserves-ingestion-watchdog",
  label: "Net Liquid FX Reserves ingestion",
  expectedIntervalHours: 168,
  staleAfterHours: 216,
  commandHint: "npm run ingest:netliquidreserves",
};

/**
 * Phase 8.14. Task Scheduler trigger weekly, Mondays 08:45 PKT — confirmed
 * directly against the live Task Scheduler registration (Phase 8.14), the
 * same StartWhenAvailable + WakeToRun + MultipleInstances:IgnoreNew +
 * Interactive logon behavior as SBP's, World Bank's, and Net Liquid FX
 * Reserves' tasks, on the same laptop.
 *
 * expectedIntervalHours/staleAfterHours are reused verbatim from
 * WORLD_BANK_MONITOR_JOB (and NET_LIQUID_RESERVES_MONITOR_JOB, which
 * already reused the same numbers in Phase 8.10D): this is the SAME weekly
 * cadence, on the SAME laptop, under the SAME scheduler mechanics
 * (identical StartWhenAvailable/WakeToRun catch-up behavior, confirmed
 * directly via Get-ScheduledTask in Phase 8.14, not assumed) — so every
 * fact the original Phase 8.6 threshold decision was based on ("absorb an
 * ordinary long-weekend laptop-off period without alerting on a single
 * Monday run that catches up a day or two late, while still firing before a
 * second consecutive Monday is missed") applies unchanged. This is the
 * third reuse of the same evidence-based decision for an identical
 * situation, not a fresh policy call — the two underlying FRED series
 * (fred:fedFunds, fred:usCpiInflation) are monthly-cadence data, but the
 * INGESTION JOB's own schedule (what this threshold actually measures) is
 * weekly, deliberately checking more often than the data itself changes —
 * the same pattern World Bank's own annual-cadence data already
 * established on this same weekly ingestion mechanics.
 */
export const FRED_MONITOR_JOB: IngestionMonitorJob = {
  ingestionJobName: "fred-monthly-ingestion",
  watchdogJobName: "fred-ingestion-watchdog",
  label: "FRED monthly ingestion",
  expectedIntervalHours: 168,
  staleAfterHours: 216,
  commandHint: "npm run ingest:fred",
};

/**
 * Phase 8.18. Task Scheduler trigger — genuinely MONTHLY (day 3 of every
 * month, 09:00 PKT), confirmed directly against the live Task Scheduler
 * registration (Phase 8.18), the same StartWhenAvailable + WakeToRun +
 * MultipleInstances:IgnoreNew + Interactive logon behavior as every other
 * PEIC ingestion task, on the same laptop. Unlike SBP/World Bank/Net
 * Liquid FX Reserves/FRED — every one of which uses a daily or weekly
 * TASK SCHEDULE even where the underlying DATA is a different cadence —
 * this is the first genuinely monthly-scheduled ingestion job in this
 * project. No prior monthly-scheduled job's staleAfterHours exists to
 * directly reuse (unlike Net Liquid FX Reserves/FRED, which both reused
 * World Bank's exact 216h because their schedules were identical in kind).
 *
 * expectedIntervalHours = 744h (31 days) — reuses
 * freshnessEngine.ts's own CADENCE_INTERVAL_DAYS.monthly=31 constant, this
 * project's existing standard arithmetic unit for "one month," not a fresh
 * number.
 *
 * staleAfterHours = 912h (744h interval + a 168h/7-day buffer) — freshly
 * derived because no directly-reusable monthly-SCHEDULE precedent exists,
 * but using the IDENTICAL method every other threshold in this file
 * already uses: enough buffer to absorb the laptop being off for an
 * ordinary period around the scheduled day (StartWhenAvailable catches it
 * up within days, not weeks) without alerting on a single run that
 * completes a bit late, while still firing well before a SECOND
 * consecutive monthly run would be missed entirely (1488h) — 576h/24 days
 * of margin before that point, proportionally more generous than World
 * Bank's own 120h/5-day margin (216h stale vs. 336h second-miss on a
 * weekly cadence), appropriate for a still-less-frequent schedule. The
 * 168h buffer itself reuses this project's own already-established "one
 * week" unit (the exact interval already used for every weekly job in this
 * file) rather than inventing an arbitrary number of days.
 */
export const YAHOO_GOLD_MONITOR_JOB: IngestionMonitorJob = {
  ingestionJobName: "yahoo-gold-monthly-ingestion",
  watchdogJobName: "yahoo-gold-monthly-ingestion-watchdog",
  label: "Yahoo Gold monthly ingestion",
  expectedIntervalHours: 744,
  staleAfterHours: 912,
  commandHint: "npm run ingest:yahoogold",
};

/**
 * Phase F.2f. PBS CPI group ingestion (26 series -> the observation ledger). The Task Scheduler definition is
 * ops/scheduled-tasks/peic-pbs-cpi-groups-ingestion.xml: PBS publishes the monthly CPI on the 1st–3rd (the project's own
 * calendar: Aug 3, Sep 1, Oct 1, Nov 2; and once on the 10th) and the SDMX file follows by about a day, so the task runs
 * daily on days 1–10 (09:15, plus 17:30 on days 1–5) and, as a floor, every MONDAY 12:30 for a release that slips past
 * day 10 and for revisions. A run that finds nothing new still logs a SUCCESS row (outcome=unchanged), so success rows
 * arrive at least weekly while the task is registered and running.
 *
 * expectedIntervalHours / staleAfterHours = 168 / 216, reused VERBATIM from WORLD_BANK_MONITOR_JOB (as Net Liquid FX Reserves
 * and FRED did): the guaranteed floor is the SAME weekly Monday trigger, on the same laptop, under the same StartWhenAvailable
 * / WakeToRun / IgnoreNew mechanics, so the Phase 8.6 reasoning applies unchanged — absorb a long-weekend laptop-off period
 * without alerting on a Monday that catches up a day or two late, yet fire before a second consecutive Monday is missed. The
 * extra daily runs in the release window only make a miss more visible; they do not move the threshold.
 *
 * This job's `diagnose` hook adds the reason to the alert (cpiIngestionMonitor.ts). Whether the LEDGER is current against PBS
 * is a different question that needs a PBS probe, so it is NOT answered here (this watchdog never calls a provider): see
 * cpiLedgerCurrency.ts and scripts/checkCpiLedgerStatus.ts.
 *
 * ACTIVATION NOTE. Registering this job means the daily watchdog will report it STALE 216h after its last successful run
 * (the unintended 2026-11-06 run is the only one on record, so: 2026-11-15) if the scheduled task is not yet registered and
 * running by then. That is the watchdog doing its job; the activation checklist (docs/pbs-cpi-ingestion-operations.md) puts
 * the task registration BEFORE the deployment that carries this entry.
 */
export const PBS_CPI_GROUPS_MONITOR_JOB: IngestionMonitorJob = {
  // = JOB_NAME in src/lib/providers/pbsCpiGroupsIngestion.ts (a test pins the equality; this module must not import that one).
  ingestionJobName: "pbs-cpi-groups-ingestion",
  watchdogJobName: "pbs-cpi-groups-ingestion-watchdog",
  label: "PBS CPI group ingestion",
  expectedIntervalHours: 168,
  staleAfterHours: 216,
  commandHint: "the 'PEIC - PBS CPI Groups Ingestion' scheduled task (see docs/pbs-cpi-ingestion-operations.md)",
  diagnose: ({ ingestionRuns, now }) => {
    const e = evaluateCpiRunEvidence(ingestionRuns, now, { staleAfterHours: PBS_CPI_GROUPS_MONITOR_JOB.staleAfterHours });
    return { summary: e.cause ? `${e.state}:${e.cause}` : e.state, lines: e.lines };
  },
};

/** Exactly the jobs currently operational (Phase 8.3/8.4/8.10B/8.10C/8.14/8.18) plus the PBS CPI job (Phase F.2f, defined but its scheduled task is not yet registered). Do not add a future provider speculatively — extend this array only when a real ingestion job exists for it. */
export const MONITORED_INGESTION_JOBS: IngestionMonitorJob[] = [SBP_MONITOR_JOB, WORLD_BANK_MONITOR_JOB, NET_LIQUID_RESERVES_MONITOR_JOB, FRED_MONITOR_JOB, YAHOO_GOLD_MONITOR_JOB, PBS_CPI_GROUPS_MONITOR_JOB];

const MS_PER_HOUR = 60 * 60 * 1000;

export type IngestionHealthState = "healthy" | "stale" | "never-run";

export interface IngestionHealth {
  state: IngestionHealthState;
  /** ISO timestamp of the most recent successful ingestion, or null if there has never been one. */
  lastSuccessAt: string | null;
  /**
   * Where `lastSuccessAt` came from: the ingestion run history, or — only when
   * that bounded (50-row) history no longer contains any success — the value
   * the watchdog itself recorded earlier (see newestCarriedSuccess). null when
   * there has never been a success.
   */
  lastSuccessSource: "ingestion-history" | "watchdog-record" | null;
  /** Milliseconds since that success, or null when there has never been one. */
  ageMs: number | null;
  expectedCadenceHours: number;
  staleAfterHours: number;
  /**
   * Identity of the current failure episode. Derived from the last success, so
   * it changes exactly when ingestion recovers — which is what allows a second
   * alert for a genuinely new failure while suppressing repeats of the same one.
   */
  episodeKey: string;
  /** True when at least one alert (initial or reminder) has already been sent for this episode. */
  alertAlreadySent: boolean;
  /** `finishedAt` of the most recent watchdog row that recorded an alert for this episode, or null if none has been sent. */
  lastAlertAt: string | null;
  /** True when the episode is still failing, an alert was already sent, and the reminder interval has elapsed since the last one. Always false when no alert has been sent yet (that is the initial alert's job) or when ingestion is healthy. */
  reminderDue: boolean;
}

/**
 * Phase 21 (C1). While one failure episode continues, repeat the alert every
 * 72h instead of staying silent until recovery. Before this, SBP went 37 days
 * (last success 12 Sep, still failing on 19 Oct) with a single alert on day 2.
 */
export const REMINDER_INTERVAL_HOURS = 72;

/**
 * The watchdog is a once-a-day Vercel cron (`0 9 * * *`) whose actual start
 * time drifts: over 49 production runs it started between 09:11:34 and
 * 09:36:07 UTC, a 25-minute spread. Each run also logs its row (the
 * reference for "last alert") a few seconds AFTER it started. Compared
 * strictly, the third daily run after an alert would see slightly under 72h
 * about half the time, miss, and push that reminder out to 96h. A one-hour
 * tolerance (about 2x the observed spread) makes "every 72h" mean "on every
 * third daily run". It does not make reminders more frequent than that: the
 * day-2 run is ~48h after the alert, far below 71h.
 */
const REMINDER_SCHEDULE_TOLERANCE_HOURS = 1;

/** Marker written into a job's own watchdog cron_run_log detail when it alerts. Job-scoped implicitly: only ever searched within that same job's own watchdogJobName history (see evaluateIngestionHealth/runIngestionWatchdog) — never compared across jobs. */
function alertMarker(episodeKey: string): string {
  return `alerted-for=${episodeKey}`;
}

/**
 * 50-ROW HISTORY WINDOW — CARRY-FORWARD WORKAROUND (Phase 23)
 *
 * cron_run_log keeps only the newest 50 rows per job (log_cron_run deletes
 * the rest), so once 50 newer runs have landed after a job's last success, that
 * success is gone from the ingestion history and, without this, the job would
 * flip to "never-run": a different alert, and a NEW episode key that restarts
 * the alert/reminder cycle. Retries and the logon trigger make that reachable
 * in days rather than months for SBP.
 *
 * Every watchdog row already records `last-success=<timestamp>` in its detail
 * (see runIngestionWatchdog), and the watchdog re-records the value it
 * currently believes on every daily run. Reading the newest valid such value
 * back from the job's own watchdog ledger therefore carries the last known
 * success forward for as long as the watchdog keeps running.
 *
 * THIS IS A WORKAROUND, NOT DURABLE STORAGE. It relies on the watchdog having
 * seen and recorded that success while it was still inside the window; it
 * cannot recover a success the watchdog never observed, and it parses a
 * free-text field this same module writes. Durable history would need a
 * schema change (a last-success column, or longer retention), which is
 * deliberately out of scope here.
 */
const CARRIED_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/;

/**
 * A carried value can only ever make a job look MORE healthy than the ingestion
 * history alone, so it is held to a stricter standard than the ingestion rows:
 * a strict ISO-8601 shape, a parseable instant, and not meaningfully in the
 * future. The 1h allowance covers clock skew between the ingestion host and
 * the server; anything later (a corrupted or hand-edited row) is ignored
 * rather than allowed to silence a real outage.
 */
const CARRIED_FUTURE_SKEW_MS = MS_PER_HOUR;

/**
 * Newest valid `last-success=` value in this job's own watchdog rows, or null.
 * Only the FIRST `last-success=` field of a row is read: the genuine one is
 * written before any free-text reason, so text later in the row (for example
 * an email provider's error message) can never be mistaken for it.
 */
function newestCarriedSuccess(watchdogRuns: CronRunRecord[], job: IngestionMonitorJob, now: Date): string | null {
  let best: string | null = null;
  let bestMs = -Infinity;
  for (const r of watchdogRuns) {
    if (r.jobName !== job.watchdogJobName) continue; // never read another job's ledger
    const field = (r.detail ?? "")
      .split("|")
      .map((part) => part.trim())
      .find((part) => part.startsWith("last-success="));
    if (!field) continue;
    const value = field.slice("last-success=".length);
    if (!CARRIED_TIMESTAMP_PATTERN.test(value)) continue; // also rejects the literal "never"
    const ms = Date.parse(value);
    if (!Number.isFinite(ms) || ms > now.getTime() + CARRIED_FUTURE_SKEW_MS) continue;
    if (ms > bestMs) {
      best = value;
      bestMs = ms;
    }
  }
  return best;
}

/**
 * Pure evaluation — no I/O, no clock access, no side effects. Inputs, `now`,
 * and the job's own configuration are all supplied by the caller so this is
 * exhaustively testable and provider-agnostic. Does NOT read
 * MONITORED_INGESTION_JOBS or any other registry itself — coupling pure
 * evaluation to a global registry lookup was deliberately avoided (Phase
 * 8.6 brief) in favor of an explicit `job` parameter.
 *
 * @param ingestionRuns  cron_run_log history for job.ingestionJobName.
 * @param watchdogRuns   cron_run_log history for job.watchdogJobName (that SAME job's own ledger — never another job's).
 */
export function evaluateIngestionHealth(
  ingestionRuns: CronRunRecord[],
  watchdogRuns: CronRunRecord[],
  now: Date,
  job: IngestionMonitorJob,
): IngestionHealth {
  // Only a 'success' counts. A run that was attempted and failed is not
  // evidence of health, and 'skipped' explicitly did no work.
  const successes = ingestionRuns
    .filter((r) => r.status === "success")
    .map((r) => r.finishedAt)
    .filter((ts) => Number.isFinite(Date.parse(ts))) // a row with no usable timestamp is not evidence of anything
    .sort();
  const ingestionLastSuccess = successes.length > 0 ? successes[successes.length - 1] : null;

  // Prefer the newest valid success across both sources. When the ingestion
  // window is complete its own newest success is always at least as new as
  // anything carried (carried values originate from it), so behaviour there is
  // unchanged; and ties keep the ingestion row's exact string so the episode
  // key a previous alert was recorded under still matches.
  const carriedLastSuccess = newestCarriedSuccess(watchdogRuns, job, now);
  const useCarried =
    carriedLastSuccess !== null &&
    (ingestionLastSuccess === null || Date.parse(carriedLastSuccess) > Date.parse(ingestionLastSuccess));
  const lastSuccessAt = useCarried ? carriedLastSuccess : ingestionLastSuccess;
  const lastSuccessSource: IngestionHealth["lastSuccessSource"] = lastSuccessAt === null ? null : useCarried ? "watchdog-record" : "ingestion-history";
  const episodeKey = lastSuccessAt ?? "never";

  // Latest alert for THIS episode. Alerts written before reminders existed use
  // the same marker, so existing production history is read unchanged.
  const alertTimes = watchdogRuns
    .filter((r) => (r.detail ?? "").includes(alertMarker(episodeKey)))
    .map((r) => r.finishedAt)
    .sort();
  const lastAlertAt = alertTimes.length > 0 ? alertTimes[alertTimes.length - 1] : null;
  const alertAlreadySent = lastAlertAt !== null;

  // Fails closed: if the alert row's timestamp were ever unparseable, NaN
  // fails the >= comparison, so no reminder is sent and the episode behaves
  // exactly as it did before reminders existed (one alert, then silence). That
  // can't happen in practice (finished_at is a NOT NULL timestamptz), and
  // sending on garbage input could spam instead.
  const sinceLastAlertMs = lastAlertAt === null ? null : now.getTime() - new Date(lastAlertAt).getTime();
  const reminderIntervalMs = (REMINDER_INTERVAL_HOURS - REMINDER_SCHEDULE_TOLERANCE_HOURS) * MS_PER_HOUR;
  const intervalElapsed = sinceLastAlertMs !== null && sinceLastAlertMs >= reminderIntervalMs;

  const base = {
    lastSuccessAt,
    lastSuccessSource,
    expectedCadenceHours: job.expectedIntervalHours,
    staleAfterHours: job.staleAfterHours,
    episodeKey,
    alertAlreadySent,
    lastAlertAt,
  };

  if (lastSuccessAt === null) {
    return { ...base, state: "never-run", ageMs: null, reminderDue: intervalElapsed };
  }

  const ageMs = now.getTime() - new Date(lastSuccessAt).getTime();
  const state = ageMs > job.staleAfterHours * MS_PER_HOUR ? "stale" : "healthy";
  return {
    ...base,
    state,
    ageMs,
    reminderDue: state === "stale" && intervalElapsed,
  };
}

/** Whole hours, for display and alert copy. */
export function formatAge(ageMs: number | null): string {
  if (ageMs === null) return "never";
  const hours = Math.floor(ageMs / MS_PER_HOUR);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Parameterized on `job` — no provider name/command is hardcoded here anymore (Phase 8.6). */
function buildAlert(job: IngestionMonitorJob, health: IngestionHealth, isReminder = false, diagnosis: IngestionDiagnosis | null = null): { subject: string; text: string; html: string } {
  const lastSuccess = health.lastSuccessAt ?? "no successful run on record";
  const baseSubject =
    health.state === "never-run"
      ? `PEIC: ${job.label} has never completed successfully`
      : `PEIC: ${job.label} stale — no successful run in ${formatAge(health.ageMs)}`;
  const subject = isReminder ? `Reminder — ${baseSubject}` : baseSubject;

  // Deliberately contains no URLs, no credentials and no request details —
  // only job status facts already present in cron_run_log.
  const text = [
    ...(isReminder
      ? [
          `Reminder: this failure is still unresolved. Last alert sent ${health.lastAlertAt}. Reminders repeat every ${REMINDER_INTERVAL_HOURS}h until a successful run is recorded.`,
          "",
        ]
      : []),
    `${job.label} has not completed successfully within its expected window.`,
    "",
    `Last successful run : ${lastSuccess}`,
    `Age                 : ${formatAge(health.ageMs)}`,
    `Expected cadence    : every ${health.expectedCadenceHours}h`,
    `Alert threshold     : ${health.staleAfterHours}h`,
    "",
    // Only for a job that supplies a diagnosis (Phase F.2f). For every other job this contributes nothing, so their alert
    // text is byte-for-byte what it was.
    ...(diagnosis && diagnosis.lines.length > 0 ? [...diagnosis.lines, ""] : []),
    "The canonical ledger keeps serving its last ingested values while this",
    "persists, so the site will look normal but the data is ageing.",
    "",
    job.commandHint
      ? `Check that the ingestion host is powered on and that \`${job.commandHint}\` is still completing. Full history is at /admin/system-health.`
      : "Check that the ingestion host is powered on and that this job is still completing. Full history is at /admin/system-health.",
  ].join("\n");

  // Same content as the plain-text body; sendEmail requires html.
  const html = `<pre style="font-family:ui-monospace,monospace;font-size:13px;line-height:1.5">${escapeHtml(text)}</pre>`;

  return { subject, text, html };
}

export interface WatchdogResult {
  job: IngestionMonitorJob;
  health: IngestionHealth;
  alertSent: boolean;
  /** Why an alert was or was not sent — recorded in cron_run_log for auditability. */
  reason: string;
  /** Present only for a job that supplies a `diagnose` hook (Phase F.2f). */
  diagnosis?: IngestionDiagnosis;
}

/**
 * Runs a job's optional diagnosis. It can only ADD explanation: any failure inside it is swallowed (the watchdog must not
 * break because an explanation could not be computed), and its output is stripped of URLs before it can reach an email or a log row.
 */
function diagnoseSafely(job: IngestionMonitorJob, ingestionRuns: CronRunRecord[], now: Date): IngestionDiagnosis | null {
  if (!job.diagnose) return null;
  try {
    const d = job.diagnose({ ingestionRuns, now });
    const clean = (s: string) => s.replace(/https?:\/\/\S+/gi, "[url]");
    return { summary: clean(d.summary).replace(/[|\s]+/g, "-").slice(0, 80), lines: d.lines.map(clean) };
  } catch (err) {
    console.error(`[IngestionWatchdog] diagnosis for ${job.ingestionJobName} failed (ignored): ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

/**
 * Evaluates one job's ingestion health, sends one alert per failure episode
 * plus one reminder per REMINDER_INTERVAL_HOURS while that episode continues
 * (and none once ingestion recovers), and records the decision under THAT
 * job's own watchdogJobName so
 * the next invocation (of this same job) can see it. Never reads or writes
 * any other job's history — this is what makes one job's failure episode
 * structurally incapable of suppressing or being suppressed by another's.
 *
 * Alerting is best-effort and never throws: a mail failure must not make the
 * watchdog itself look broken, and the outcome is still written to
 * cron_run_log either way.
 *
 * Never calls ingestion, never calls a provider API, never reads a provider
 * credential — this function's only I/O is cron_run_log reads/writes and
 * sendEmail(); see ingestionWatchdog.test.ts's security tests.
 */
export async function runIngestionWatchdog(job: IngestionMonitorJob, now: Date = new Date()): Promise<WatchdogResult> {
  const startedAt = new Date();

  const [ingestionRuns, watchdogRuns] = await Promise.all([
    getCronRunHistory(job.ingestionJobName, 50),
    getCronRunHistory(job.watchdogJobName, 50),
  ]);

  const health = evaluateIngestionHealth(ingestionRuns, watchdogRuns, now, job);
  const diagnosis = diagnoseSafely(job, ingestionRuns, now);

  let alertSent = false;
  let reason: string;

  // An alert is sent when none has gone out for this episode yet (initial),
  // or when one has and the reminder interval has since elapsed (reminder).
  const isReminder = health.alertAlreadySent && health.reminderDue;

  if (health.state === "healthy") {
    reason = "healthy — no alert";
  } else if (health.alertAlreadySent && !isReminder) {
    reason = "already alerted for this episode — suppressed";
  } else {
    const recipient = process.env.ADMIN_EMAIL;
    if (!recipient) {
      reason = "ADMIN_EMAIL not configured — alert skipped";
    } else {
      const { subject, text, html } = buildAlert(job, health, isReminder, diagnosis);
      const result = await sendEmail(
        { to: recipient, subject, text, html },
        // Job-scoped idempotency key: incorporates watchdogJobName so two
        // DIFFERENT jobs' legitimately-simultaneous alerts can never
        // collide with each other's Resend idempotency key, and repeated
        // invocations for the SAME job+episode still dedupe at the
        // provider level as a second layer under the app-level marker check.
        //
        // The initial alert keeps its pre-reminder key unchanged. Each
        // reminder is anchored to the previous alert's timestamp: that value
        // is identical for every concurrent/repeated invocation within one
        // reminder interval (so they dedupe at Resend) and strictly later for
        // each successive reminder (so consecutive reminders never collide).
        // It deliberately does not count prior alerts — retention keeps only
        // the last 50 watchdog rows, so a count would shrink as old rows age
        // out and could repeat an earlier key.
        isReminder
          ? `${job.watchdogJobName}-${health.episodeKey}-reminder-after-${health.lastAlertAt}`
          : `${job.watchdogJobName}-${health.episodeKey}`,
      );
      alertSent = result.success;
      reason = result.success
        ? isReminder
          ? "reminder sent"
          : "alert sent"
        : `${isReminder ? "reminder" : "alert"} failed: ${result.error ?? "unknown"}`;
    }
  }

  // The alert marker is what suppresses repeats — written only when an alert
  // genuinely went out, so a failed send is retried on the next invocation
  // rather than being silently swallowed.
  const detail = [
    `job=${job.ingestionJobName}`,
    `state=${health.state}`,
    `last-success=${health.lastSuccessAt ?? "never"}`,
    `age=${formatAge(health.ageMs)}`,
    alertSent ? alertMarker(health.episodeKey) : `no-alert (${reason})`,
    ...(alertSent && isReminder ? [`reminder-after=${health.lastAlertAt}`] : []),
    // After the alert marker and after last-success= (which must stay the FIRST such field: newestCarriedSuccess reads it).
    ...(diagnosis ? [`diag=${diagnosis.summary}`] : []),
  ].join(" | ");

  await logCronRun(job.watchdogJobName, startedAt, health.state === "healthy" ? "success" : "failure", detail);

  return diagnosis ? { job, health, alertSent, reason, diagnosis } : { job, health, alertSent, reason };
}
