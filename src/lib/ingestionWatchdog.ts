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

/** Exactly the jobs currently operational (Phase 8.3/8.4/8.10B/8.10C). Do not add a future provider speculatively — extend this array only when a real ingestion job exists for it. */
export const MONITORED_INGESTION_JOBS: IngestionMonitorJob[] = [SBP_MONITOR_JOB, WORLD_BANK_MONITOR_JOB, NET_LIQUID_RESERVES_MONITOR_JOB];

const MS_PER_HOUR = 60 * 60 * 1000;

export type IngestionHealthState = "healthy" | "stale" | "never-run";

export interface IngestionHealth {
  state: IngestionHealthState;
  /** ISO timestamp of the most recent successful ingestion, or null if there has never been one. */
  lastSuccessAt: string | null;
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
  /** True when an alert has already been sent for this episode. */
  alertAlreadySent: boolean;
}

/** Marker written into a job's own watchdog cron_run_log detail when it alerts. Job-scoped implicitly: only ever searched within that same job's own watchdogJobName history (see evaluateIngestionHealth/runIngestionWatchdog) — never compared across jobs. */
function alertMarker(episodeKey: string): string {
  return `alerted-for=${episodeKey}`;
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
    .sort();

  const lastSuccessAt = successes.length > 0 ? successes[successes.length - 1] : null;
  const episodeKey = lastSuccessAt ?? "never";

  const alertAlreadySent = watchdogRuns.some((r) => (r.detail ?? "").includes(alertMarker(episodeKey)));

  const base = {
    lastSuccessAt,
    expectedCadenceHours: job.expectedIntervalHours,
    staleAfterHours: job.staleAfterHours,
    episodeKey,
    alertAlreadySent,
  };

  if (lastSuccessAt === null) {
    return { ...base, state: "never-run", ageMs: null };
  }

  const ageMs = now.getTime() - new Date(lastSuccessAt).getTime();
  return {
    ...base,
    state: ageMs > job.staleAfterHours * MS_PER_HOUR ? "stale" : "healthy",
    ageMs,
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
function buildAlert(job: IngestionMonitorJob, health: IngestionHealth): { subject: string; text: string; html: string } {
  const lastSuccess = health.lastSuccessAt ?? "no successful run on record";
  const subject =
    health.state === "never-run"
      ? `PEIC: ${job.label} has never completed successfully`
      : `PEIC: ${job.label} stale — no successful run in ${formatAge(health.ageMs)}`;

  // Deliberately contains no URLs, no credentials and no request details —
  // only job status facts already present in cron_run_log.
  const text = [
    `${job.label} has not completed successfully within its expected window.`,
    "",
    `Last successful run : ${lastSuccess}`,
    `Age                 : ${formatAge(health.ageMs)}`,
    `Expected cadence    : every ${health.expectedCadenceHours}h`,
    `Alert threshold     : ${health.staleAfterHours}h`,
    "",
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
}

/**
 * Evaluates one job's ingestion health, sends at most one alert per failure
 * episode, and records the decision under THAT job's own watchdogJobName so
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

  let alertSent = false;
  let reason: string;

  if (health.state === "healthy") {
    reason = "healthy — no alert";
  } else if (health.alertAlreadySent) {
    reason = "already alerted for this episode — suppressed";
  } else {
    const recipient = process.env.ADMIN_EMAIL;
    if (!recipient) {
      reason = "ADMIN_EMAIL not configured — alert skipped";
    } else {
      const { subject, text, html } = buildAlert(job, health);
      const result = await sendEmail(
        { to: recipient, subject, text, html },
        // Job-scoped idempotency key: incorporates watchdogJobName so two
        // DIFFERENT jobs' legitimately-simultaneous alerts can never
        // collide with each other's Resend idempotency key, and repeated
        // invocations for the SAME job+episode still dedupe at the
        // provider level as a second layer under the app-level marker check.
        `${job.watchdogJobName}-${health.episodeKey}`,
      );
      alertSent = result.success;
      reason = result.success ? "alert sent" : `alert failed: ${result.error ?? "unknown"}`;
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
  ].join(" | ");

  await logCronRun(job.watchdogJobName, startedAt, health.state === "healthy" ? "success" : "failure", detail);

  return { job, health, alertSent, reason };
}
