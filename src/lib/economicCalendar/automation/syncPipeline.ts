// Sync Pipeline Engine — Phase 4 (Parts 1-2: Scheduler-Agnostic Synchronization)
//
// The pure synchronization engine. It does not know who triggered it (Vercel,
// GitHub Actions, Railway, or anything else). It simply runs the 5 sync steps
// sequentially, logs each one, and returns a structured result.
//
// The HTTP route (route.ts) is a thin adapter: it authenticates the request,
// extracts scheduler metadata, calls runSyncPipeline(), then logs the trigger.
// Any other caller (internal job, test harness, second route) calls the same
// function with zero changes to sync behavior.
//
// Step order is fixed and cannot be reordered:
//   1. Official calendar sync  — ensures event_dates are current before writes
//   2. Gap detection           — creates missing scheduled rows for automated series
//   3. SBP EasyData sync       — fills those rows with confirmed actuals (+ source health)
//   4. LSM YoY sync            — derived metric from index history (+ source health)
//   5. Notification worker     — drains jobs created by steps 3-4's DB trigger
//
// Each step is independently try/caught — a hard throw in one does not prevent
// the others from running. All outcomes are logged to cron_run_log.

import { syncAllFromSbpEasyData, type SyncResult } from "@/lib/economicCalendar/automation/syncFromSbpEasyData";
import { syncOfficialCalendars, type ReconcileSummary } from "@/lib/economicCalendar/automation/syncOfficialCalendars";
import { detectAndFillCalendarGaps, type GapDetectionResult } from "@/lib/economicCalendar/automation/detectCalendarGaps";
import { syncLsmYoYFromEasyData } from "@/lib/economicCalendar/automation/lsmSync";
import { processNotificationJobs, type JobProcessingSummary } from "@/lib/notifications/notificationJobWorker";
import { logCronRun } from "@/lib/cronLogging";
import type { TriggerMeta } from "@/lib/economicCalendar/automation/schedulerMeta";

export interface JobSummaryEntry {
  jobName: string;
  status: "success" | "failure" | "skipped";
  durationMs: number;
  detail?: string;
}

export interface PipelineResult {
  triggeredAt: string;
  schedulerName: string;
  officialCalendars: ReconcileSummary[];
  gapDetection: GapDetectionResult[];
  syncResults: SyncResult[];
  lsmResult: SyncResult | null;
  notifications: JobProcessingSummary[];
  /** Count of SyncResult entries with status="synced" across all sync steps. */
  totalSynced: number;
  /** Count of SyncResult entries with status="error" across all sync steps. */
  totalFailed: number;
  totalDurationMs: number;
  jobsSummary: JobSummaryEntry[];
}

/**
 * Runs the full sync pipeline. Scheduler-agnostic: call this from any trigger
 * (HTTP route, test, internal cron) without any HTTP/scheduler dependencies.
 *
 * @param meta  Scheduler identity metadata from the HTTP adapter (or a test stub).
 *              Used only for logging — not used for any sync logic.
 */
export async function runSyncPipeline(meta: TriggerMeta): Promise<PipelineResult> {
  const pipelineStart = new Date();
  const workerSecret = process.env.NOTIFICATION_WORKER_SECRET ?? "";
  const jobsSummary: JobSummaryEntry[] = [];

  let officialCalendars: ReconcileSummary[] = [];
  let gapDetection: GapDetectionResult[] = [];
  let syncResults: SyncResult[] = [];
  let lsmResult: SyncResult | null = null;
  let notifications: JobProcessingSummary[] = [];

  // ── Step 1: Official calendar sync ──────────────────────────────────────────
  {
    const stepStart = new Date();
    try {
      officialCalendars = await syncOfficialCalendars();
      const hasErrors = officialCalendars.some((r) => r.status === "error");
      const detail = officialCalendars.map((r) => `${r.seriesSlug}:${r.status}`).join(", ");
      const status = hasErrors ? "failure" : "success";
      await logCronRun("official-calendar-sync", stepStart, status, detail);
      jobsSummary.push({ jobName: "official-calendar-sync", status, durationMs: Date.now() - stepStart.getTime(), detail });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      await logCronRun("official-calendar-sync", stepStart, "failure", detail);
      jobsSummary.push({ jobName: "official-calendar-sync", status: "failure", durationMs: Date.now() - stepStart.getTime(), detail });
    }
  }

  // ── Step 2: Gap detection ────────────────────────────────────────────────────
  {
    const stepStart = new Date();
    try {
      gapDetection = await detectAndFillCalendarGaps(workerSecret);
      const hasErrors = gapDetection.some((r) => r.status === "error");
      const filled = gapDetection.filter((r) => r.status === "gaps-filled");
      const detail = filled.length > 0
        ? `${filled.reduce((sum, r) => sum + r.created.length, 0)} event(s) created: ${filled.flatMap((r) => r.created).join(", ")}`
        : "no gaps detected";
      const status = hasErrors ? "failure" : "success";
      await logCronRun("calendar-gap-detection", stepStart, status, detail);
      jobsSummary.push({ jobName: "calendar-gap-detection", status, durationMs: Date.now() - stepStart.getTime(), detail });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      await logCronRun("calendar-gap-detection", stepStart, "failure", detail);
      jobsSummary.push({ jobName: "calendar-gap-detection", status: "failure", durationMs: Date.now() - stepStart.getTime(), detail });
    }
  }

  // ── Step 3: SBP EasyData + PBS SPI actual-value sync ───────────────────────
  {
    const stepStart = new Date();
    try {
      syncResults = await syncAllFromSbpEasyData();
      const hasErrors = syncResults.some((r) => r.status === "error");
      const detail = syncResults.map((r) => `${r.seriesSlug}:${r.status}`).join(", ");
      const status = hasErrors ? "failure" : "success";
      await logCronRun("sbp-actual-value-sync", stepStart, status, detail);
      jobsSummary.push({ jobName: "sbp-actual-value-sync", status, durationMs: Date.now() - stepStart.getTime(), detail });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      await logCronRun("sbp-actual-value-sync", stepStart, "failure", detail);
      jobsSummary.push({ jobName: "sbp-actual-value-sync", status: "failure", durationMs: Date.now() - stepStart.getTime(), detail });
    }
  }

  // ── Step 4: LSM YoY sync ────────────────────────────────────────────────────
  {
    const stepStart = new Date();
    try {
      lsmResult = await syncLsmYoYFromEasyData();
      const status = lsmResult.status === "error" ? "failure" : "success";
      const detail = `${lsmResult.status}: ${lsmResult.detail}`;
      await logCronRun("lsm-yoy-sync", stepStart, status, detail);
      jobsSummary.push({ jobName: "lsm-yoy-sync", status, durationMs: Date.now() - stepStart.getTime(), detail });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      await logCronRun("lsm-yoy-sync", stepStart, "failure", detail);
      jobsSummary.push({ jobName: "lsm-yoy-sync", status: "failure", durationMs: Date.now() - stepStart.getTime(), detail });
    }
  }

  // ── Step 5: Notification worker ─────────────────────────────────────────────
  {
    const stepStart = new Date();
    try {
      notifications = await processNotificationJobs();
      const totalFailed = notifications.reduce((sum, n) => sum + n.failedThisPass, 0);
      const detail = `${notifications.length} job(s) processed, ${totalFailed} email send failure(s)`;
      const status = totalFailed > 0 ? "failure" : "success";
      await logCronRun("notification-worker", stepStart, status, detail);
      jobsSummary.push({ jobName: "notification-worker", status, durationMs: Date.now() - stepStart.getTime(), detail });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      await logCronRun("notification-worker", stepStart, "failure", detail);
      jobsSummary.push({ jobName: "notification-worker", status: "failure", durationMs: Date.now() - stepStart.getTime(), detail });
    }
  }

  const allSyncResults = [...syncResults, ...(lsmResult ? [lsmResult] : [])];
  const totalSynced = allSyncResults.filter((r) => r.status === "synced").length;
  const totalFailed = allSyncResults.filter((r) => r.status === "error").length;

  return {
    triggeredAt: pipelineStart.toISOString(),
    schedulerName: meta.schedulerName,
    officialCalendars,
    gapDetection,
    syncResults,
    lsmResult,
    notifications,
    totalSynced,
    totalFailed,
    totalDurationMs: Date.now() - pipelineStart.getTime(),
    jobsSummary,
  };
}
