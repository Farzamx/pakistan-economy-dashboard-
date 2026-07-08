// Sync Pipeline Engine — Phase 4 + Phase 7
//
// The pure synchronization engine. It does not know who triggered it (Vercel,
// GitHub Actions, Railway, or anything else). It simply runs the sync steps
// sequentially, logs each one, and returns a structured result.
//
// Step order is fixed and cannot be reordered:
//   1. Official calendar sync  — ensures event_dates are current before writes
//   2. Gap detection           — creates missing scheduled rows for automated series
//   3. PBS CPI/Core PDF sync   — primary for CPI + Core (PDF, published 1st of M+1)
//   4. PBS Trade Balance sync  — primary for trade-balance (advance Excel, 16th–18th of M+1)
//   5. FX Reserves sync        — SBP Forex_Arch.xlsx (weekly net SBP reserves)
//   6. SBP EasyData + PBS SPI  — EasyData for all monthly series (CPI/Core skipped if already synced)
//   7. LSM sync                — PBS WordPress primary → EasyData fallback
//   8. Notification worker     — drains jobs created by steps 3-7's DB trigger
//
// Each step is independently try/caught — a hard throw in one does not prevent
// the others from running. All outcomes are logged to cron_run_log.

import { syncAllFromSbpEasyData, type SyncResult } from "@/lib/economicCalendar/automation/syncFromSbpEasyData";
import { syncOfficialCalendars, type ReconcileSummary } from "@/lib/economicCalendar/automation/syncOfficialCalendars";
import { detectAndFillCalendarGaps, type GapDetectionResult } from "@/lib/economicCalendar/automation/detectCalendarGaps";
import { syncLsmYoYFromEasyData } from "@/lib/economicCalendar/automation/lsmSync";
import { syncLsmYoYFromPbs } from "@/lib/economicCalendar/automation/syncLsmFromPbs";
import { syncFxReservesFromSbpExcel } from "@/lib/economicCalendar/automation/syncFxReservesFromSbpExcel";
import { syncTradeBalanceFromPbs } from "@/lib/economicCalendar/automation/syncTradeBalanceFromPbs";
import { syncCpiFromPbs } from "@/lib/economicCalendar/automation/syncCpiFromPbs";
import { processNotificationJobs, type JobProcessingSummary } from "@/lib/notifications/notificationJobWorker";
import { logCronRun } from "@/lib/cronLogging";
import { formatPipelineSummary, formatDetailBlocks } from "@/lib/economicCalendar/automation/pipelineLogger";
import type { TriggerMeta } from "@/lib/economicCalendar/automation/schedulerMeta";
import { auditSbpFreshness, type FreshnessAuditEntry } from "@/lib/data/sbpFreshnessAudit";

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
  /** CPI + Core results from PBS PDF (Step 3 — primary). EasyData is the fallback in syncResults. */
  cpiPbsResults: SyncResult[];
  /** Trade balance, exports, and imports from PBS advance Excel release (Step 4). */
  tradeBalanceResults: SyncResult[];
  /** FX reserves from SBP Forex_Arch.xlsx (Step 5). */
  fxReservesResult: SyncResult | null;
  /** EasyData + PBS SPI sync results (Step 6). CPI/Core are skipped if already synced by PBS. */
  syncResults: SyncResult[];
  /** LSM result — PBS primary used when available, EasyData fallback otherwise (Step 7). */
  lsmResult: SyncResult | null;
  notifications: JobProcessingSummary[];
  /** Freshness audit across all 20 SBP EasyData indicators against SBP's own /meta "Available Upto" (Step 9). */
  freshnessAudit: FreshnessAuditEntry[];
  /** Count of SyncResult entries with status="synced" across all sync steps. */
  totalSynced: number;
  /** Count of SyncResult entries with status="error" across all sync steps. */
  totalFailed: number;
  totalDurationMs: number;
  jobsSummary: JobSummaryEntry[];
  /** Pre-formatted pipeline summary for GitHub Actions / Vercel logs. */
  summary: string;
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
  let cpiPbsResults: SyncResult[] = [];
  let tradeBalanceResults: SyncResult[] = [];
  let fxReservesResult: SyncResult | null = null;
  let syncResults: SyncResult[] = [];
  let lsmResult: SyncResult | null = null;
  let notifications: JobProcessingSummary[] = [];
  let freshnessAudit: FreshnessAuditEntry[] = [];

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

  // ── Step 3: PBS CPI/Core PDF sync (primary for CPI + Core) ─────────────────
  // Runs before EasyData so PBS is the primary source for inflation data.
  // If PBS succeeds, EasyData's CPI/Core calls in Step 6 will see the events
  // already released and return false (idempotent — no double-write).
  {
    const stepStart = new Date();
    try {
      cpiPbsResults = await syncCpiFromPbs();
      const hasErrors = cpiPbsResults.some((r) => r.status === "error");
      const detail = cpiPbsResults.map((r) => `${r.seriesSlug}:${r.status}`).join(", ");
      const status = hasErrors ? "failure" : "success";
      await logCronRun("cpi-pbs-sync", stepStart, status, detail);
      jobsSummary.push({ jobName: "cpi-pbs-sync", status, durationMs: Date.now() - stepStart.getTime(), detail });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      await logCronRun("cpi-pbs-sync", stepStart, "failure", detail);
      jobsSummary.push({ jobName: "cpi-pbs-sync", status: "failure", durationMs: Date.now() - stepStart.getTime(), detail });
    }
  }

  // ── Step 4: PBS Trade Balance + Exports + Imports advance release ───────────
  {
    const stepStart = new Date();
    try {
      tradeBalanceResults = await syncTradeBalanceFromPbs();
      const hasErrors = tradeBalanceResults.some((r) => r.status === "error");
      const detail = tradeBalanceResults.map((r) => `${r.seriesSlug}:${r.status}`).join(", ");
      const status = hasErrors ? "failure" : "success";
      await logCronRun("trade-balance-sync", stepStart, status, detail);
      jobsSummary.push({ jobName: "trade-balance-sync", status, durationMs: Date.now() - stepStart.getTime(), detail });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      await logCronRun("trade-balance-sync", stepStart, "failure", detail);
      jobsSummary.push({ jobName: "trade-balance-sync", status: "failure", durationMs: Date.now() - stepStart.getTime(), detail });
    }
  }

  // ── Step 5: FX Reserves from SBP Forex_Arch.xlsx ───────────────────────────
  {
    const stepStart = new Date();
    try {
      fxReservesResult = await syncFxReservesFromSbpExcel();
      const status = fxReservesResult.status === "error" ? "failure" : "success";
      const detail = `${fxReservesResult.status}: ${fxReservesResult.detail}`;
      await logCronRun("fx-reserves-sync", stepStart, status, detail);
      jobsSummary.push({ jobName: "fx-reserves-sync", status, durationMs: Date.now() - stepStart.getTime(), detail });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      await logCronRun("fx-reserves-sync", stepStart, "failure", detail);
      jobsSummary.push({ jobName: "fx-reserves-sync", status: "failure", durationMs: Date.now() - stepStart.getTime(), detail });
    }
  }

  // ── Step 6: SBP EasyData + PBS SPI actual-value sync ───────────────────────
  // Handles remittances, current account, T-bills, PIB, and SPI.
  // CPI/Core entries will return false (already released) if Step 3 wrote them.
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

  // ── Step 7: LSM sync (PBS primary → EasyData fallback) ─────────────────────
  // Try PBS WordPress first (YoY from HTML text). Fall back to EasyData-derived
  // YoY only if PBS fails or the obs period doesn't match the due event.
  {
    const stepStart = new Date();
    try {
      const pbsLsm = await syncLsmYoYFromPbs();
      if (pbsLsm.status === "synced") {
        lsmResult = pbsLsm;
        await logCronRun("lsm-pbs-sync", stepStart, "success", `PBS: ${pbsLsm.status}: ${pbsLsm.detail}`);
        jobsSummary.push({ jobName: "lsm-pbs-sync", status: "success", durationMs: Date.now() - stepStart.getTime(), detail: pbsLsm.detail });
      } else {
        // PBS didn't sync (error, period mismatch, no due event) → try EasyData
        const easyDataLsm = await syncLsmYoYFromEasyData();
        lsmResult = easyDataLsm;
        const status = easyDataLsm.status === "error" ? "failure" : "success";
        const detail = `PBS:${pbsLsm.status} → EasyData:${easyDataLsm.status}: ${easyDataLsm.detail}`;
        await logCronRun("lsm-yoy-sync", stepStart, status, detail);
        jobsSummary.push({ jobName: "lsm-yoy-sync", status, durationMs: Date.now() - stepStart.getTime(), detail });
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      await logCronRun("lsm-yoy-sync", stepStart, "failure", detail);
      jobsSummary.push({ jobName: "lsm-yoy-sync", status: "failure", durationMs: Date.now() - stepStart.getTime(), detail });
    }
  }

  // ── Step 8: Notification worker ─────────────────────────────────────────────
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

  // ── Step 9: SBP EasyData freshness audit (all 20 indicators) ───────────────
  // Independent of steps 1-8: catches drift for every SBP-backed indicator,
  // including ones with no calendar event at all (e.g. moneySupplyM2 — the
  // series that motivated this step; see sbpFreshnessAudit.ts header).
  // Self-heals cache-timing drift; flags genuine "wrong series" drift for
  // manual review rather than guessing at a fix.
  {
    const stepStart = new Date();
    try {
      freshnessAudit = await auditSbpFreshness();
      const needsReview = freshnessAudit.filter((e) => e.status === "stale-needs-review");
      const selfHealed = freshnessAudit.filter((e) => e.status === "stale-self-healed");
      const detail =
        `${freshnessAudit.length} checked, ${selfHealed.length} self-healed, ` +
        `${needsReview.length} needing review` +
        (needsReview.length > 0 ? `: ${needsReview.map((e) => e.indicator).join(", ")}` : "");
      const status = needsReview.length > 0 ? "failure" : "success";
      await logCronRun("sbp-freshness-audit", stepStart, status, detail);
      jobsSummary.push({ jobName: "sbp-freshness-audit", status, durationMs: Date.now() - stepStart.getTime(), detail });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      await logCronRun("sbp-freshness-audit", stepStart, "failure", detail);
      jobsSummary.push({ jobName: "sbp-freshness-audit", status: "failure", durationMs: Date.now() - stepStart.getTime(), detail });
    }
  }

  const allSyncResults: SyncResult[] = [
    ...cpiPbsResults,
    ...tradeBalanceResults,
    ...(fxReservesResult ? [fxReservesResult] : []),
    ...syncResults,
    ...(lsmResult ? [lsmResult] : []),
  ];
  const totalSynced = allSyncResults.filter((r) => r.status === "synced").length;
  const totalFailed = allSyncResults.filter((r) => r.status === "error").length;
  const totalDurationMs = Date.now() - pipelineStart.getTime();

  const logInput = {
    triggeredAt: pipelineStart.toISOString(),
    schedulerName: meta.schedulerName,
    totalDurationMs,
    cpiPbsResults,
    tradeBalanceResults,
    fxReservesResult,
    syncResults,
    lsmResult,
    officialCalendars,
    gapDetection,
    notifications,
    totalSynced,
    totalFailed,
    freshnessAudit,
  };

  const summary = formatPipelineSummary(logInput);
  const detailBlocks = formatDetailBlocks(logInput);
  console.log(summary);
  console.log(detailBlocks);

  return {
    triggeredAt: pipelineStart.toISOString(),
    schedulerName: meta.schedulerName,
    officialCalendars,
    gapDetection,
    cpiPbsResults,
    tradeBalanceResults,
    fxReservesResult,
    syncResults,
    lsmResult,
    notifications,
    freshnessAudit,
    totalSynced,
    totalFailed,
    totalDurationMs,
    jobsSummary,
    summary,
  };
}
