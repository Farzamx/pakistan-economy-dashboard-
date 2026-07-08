// Pipeline Logger — Phase 11 (Production Observability)
//
// Formats the raw PipelineResult into human-readable log blocks for two
// consumers:
//   1. console.log() in syncPipeline.ts → captured by Vercel Function logs
//   2. The "summary" field in the cron JSON response → printed by GitHub
//      Actions' `jq -r '.summary'` step (see sync-economic-calendar.yml)
//
// Design constraints:
//   - No new DB calls — works purely from the data already collected
//   - Pure functions — no side effects, easy to test
//   - Readable in plain text — the summary field is a pre-formatted string

import type { SyncResult, SyncProvenance } from "./syncFromSbpEasyData";
import type { ReconcileSummary } from "./syncOfficialCalendars";
import type { GapDetectionResult } from "./detectCalendarGaps";
import type { JobProcessingSummary } from "@/lib/notifications/notificationJobWorker";
import type { FreshnessAuditEntry } from "@/lib/data/sbpFreshnessAudit";

const LINE = "═".repeat(50);
const THIN = "─".repeat(50);

// ── Status icon mapping ───────────────────────────────────────────────────────

function icon(status: SyncResult["status"]): string {
  switch (status) {
    case "synced":                  return "✓";
    case "error":                   return "✗";
    case "skipped-no-due-event":    return "·";
    case "skipped-period-mismatch": return "⏳";
    case "skipped-fallback-data":   return "⚠";
    case "skipped-not-configured":  return "○";
    default:                        return "?";
  }
}

function humanStatus(status: SyncResult["status"]): string {
  switch (status) {
    case "synced":                  return "RELEASED";
    case "error":                   return "ERROR";
    case "skipped-no-due-event":    return "skipped — no due event";
    case "skipped-period-mismatch": return "skipped — observation mismatch";
    case "skipped-fallback-data":   return "skipped — source unavailable";
    case "skipped-not-configured":  return "skipped — not configured";
    default:                        return status;
  }
}

// ── Per-indicator block ───────────────────────────────────────────────────────

function formatIndicatorBlock(r: SyncResult, stepLabel?: string): string {
  const lines: string[] = [];
  const heading = stepLabel ? `${r.seriesSlug} (${stepLabel})` : r.seriesSlug;
  lines.push(THIN);
  lines.push(heading.toUpperCase());
  lines.push(THIN);

  const source = r.provenance?.sourceName ?? "—";

  if (r.status === "synced") {
    lines.push(`Fetch:               SUCCESS`);
    lines.push(`Parser:              SUCCESS`);
    lines.push(`Source:              ${source}`);
    lines.push(`Latest Observation:  ${r.observationPeriod ?? r.provenance?.observationDate ?? "—"}`);
    lines.push(`Due Event:           ${r.dueEventDate ?? "—"}`);
    lines.push(`Match:               SUCCESS`);
    lines.push(`RPC:                 SUCCESS`);
    lines.push(`Database:            UPDATED  (scheduled → released)`);
    lines.push(`Actual Value:        ${r.detail.match(/actual_value=([^\s|]+)/)?.[1] ?? "[written]"}`);
    lines.push(`Observation Date:    ${r.provenance?.observationDate ?? "—"}`);
    lines.push(`Next Event:          ${r.nextEventDate ?? "—"}`);
    lines.push(`Cache:               INVALIDATED`);
    lines.push(`Homepage:            UPDATING  (L1+L2 invalidated; next render serves fresh data)`);
    lines.push(`Calendar:            UPDATED   (event status changed in DB)`);
    lines.push(`Chart:               UPDATING  (revalidated via canonical-obs tag)`);
    lines.push(`Email:               PENDING   (notification worker processes after sync loop)`);
  } else if (r.status === "error") {
    lines.push(`Fetch:               UNKNOWN`);
    lines.push(`Source:              ${source}`);
    lines.push(`Outcome:             FAILED`);
    lines.push(`Error:               ${r.detail}`);
  } else {
    // skipped-*
    const skip = humanStatus(r.status);
    lines.push(`Fetch:               ${r.status === "skipped-fallback-data" ? "FAILED" : "SUCCESS"}`);
    lines.push(`Source:              ${source}`);
    lines.push(`Parser:              ${r.status === "skipped-fallback-data" ? "FAILED" : "SUCCESS"}`);
    if (r.observationPeriod) {
      lines.push(`Latest Observation:  ${r.observationPeriod}`);
    }
    if (r.dueEventDate) {
      lines.push(`Due Event:           ${r.dueEventDate}`);
    }
    lines.push(`Match:               SKIPPED`);
    lines.push(`Outcome:             ${skip}`);
    lines.push(`Reason:              ${r.detail}`);
    lines.push(`Database:            NO CHANGE`);
    lines.push(`Email:               NOT SENT`);
  }

  if (r.durationMs !== undefined) {
    lines.push(`Duration:            ${r.durationMs.toLocaleString()}ms`);
  }
  lines.push(`Result:              ${r.status === "synced" ? "SUCCESS" : r.status === "error" ? "FAILED" : "SKIPPED"}`);

  return lines.join("\n");
}

// ── Full pipeline summary ─────────────────────────────────────────────────────

export interface PipelineSummaryInput {
  triggeredAt: string;
  schedulerName: string;
  totalDurationMs: number;
  cpiPbsResults: SyncResult[];
  tradeBalanceResults: SyncResult[];
  fxReservesResult: SyncResult | null;
  syncResults: SyncResult[];
  lsmResult: SyncResult | null;
  officialCalendars: ReconcileSummary[];
  gapDetection: GapDetectionResult[];
  notifications: JobProcessingSummary[];
  totalSynced: number;
  totalFailed: number;
  freshnessAudit: FreshnessAuditEntry[];
}

/**
 * Formats a complete human-readable pipeline summary.
 * Returned string contains newlines — embed in JSON as-is (JSON serialisation
 * handles the escaping). GitHub Actions prints it via `jq -r '.summary'`.
 */
export function formatPipelineSummary(input: PipelineSummaryInput): string {
  const {
    triggeredAt, schedulerName, totalDurationMs,
    cpiPbsResults, tradeBalanceResults, fxReservesResult, syncResults, lsmResult,
    officialCalendars, gapDetection, notifications, totalSynced, totalFailed,
    freshnessAudit,
  } = input;

  const allResults: SyncResult[] = [
    ...cpiPbsResults,
    ...tradeBalanceResults,
    ...(fxReservesResult ? [fxReservesResult] : []),
    ...syncResults,
    ...(lsmResult ? [lsmResult] : []),
  ];

  const released  = allResults.filter((r) => r.status === "synced");
  const errors    = allResults.filter((r) => r.status === "error");
  const skipped   = allResults.filter((r) => r.status !== "synced" && r.status !== "error");

  const ranAt = new Date(triggeredAt).toLocaleString("en-US", {
    timeZone: "Asia/Karachi",
    dateStyle: "medium",
    timeStyle: "short",
  });
  const durationSec = (totalDurationMs / 1000).toFixed(1);

  const totalEmails = notifications.reduce((s, n) => s + n.sentThisPass, 0);
  const totalEmailFails = notifications.reduce((s, n) => s + n.failedThisPass, 0);

  const gapFilled = gapDetection.filter((g) => g.status === "gaps-filled").flatMap((g) => g.created);
  const calendarSummary = officialCalendars.map((c) => `${c.seriesSlug}:${c.status}`).join(", ") || "none";

  const lines: string[] = [];

  lines.push(LINE);
  lines.push("SYNC PIPELINE SUMMARY");
  lines.push(LINE);
  lines.push(`Run at:   ${ranAt} PKT`);
  lines.push(`Trigger:  ${schedulerName}`);
  lines.push(`Duration: ${durationSec}s`);
  lines.push("");

  // ── Released ──
  lines.push(`Released (${released.length}):`);
  if (released.length === 0) {
    lines.push("  (none)");
  } else {
    for (const r of released) {
      const val = r.detail.match(/actual_value=([^\s|]+)/)?.[1] ?? "—";
      const next = r.nextEventDate ? `  → next ${r.nextEventDate}` : "";
      lines.push(`  ✓ ${r.seriesSlug.padEnd(40)} ${val}${next}`);
    }
  }
  lines.push("");

  // ── Skipped ──
  lines.push(`Skipped (${skipped.length}):`);
  if (skipped.length === 0) {
    lines.push("  (none)");
  } else {
    for (const r of skipped) {
      const reason = (() => {
        switch (r.status) {
          case "skipped-no-due-event":    return "no due event";
          case "skipped-period-mismatch": return `obs mismatch${r.observationPeriod ? ` (src: ${r.observationPeriod})` : ""}`;
          case "skipped-fallback-data":   return "source unavailable";
          case "skipped-not-configured":  return "not configured";
          default:                        return r.status;
        }
      })();
      lines.push(`  · ${r.seriesSlug.padEnd(40)} ${reason}`);
    }
  }
  lines.push("");

  // ── Errors ──
  lines.push(`Errors (${errors.length}):`);
  if (errors.length === 0) {
    lines.push("  (none)");
  } else {
    for (const r of errors) {
      lines.push(`  ✗ ${r.seriesSlug}`);
      lines.push(`    ${r.detail.slice(0, 200)}`);
    }
  }
  lines.push("");

  // ── Infrastructure ──
  lines.push(`Official Calendar:  ${calendarSummary}`);
  lines.push(`Gap Detection:      ${gapFilled.length > 0 ? `${gapFilled.length} event(s) created: ${gapFilled.join(", ")}` : "no gaps detected"}`);
  lines.push(`Notifications:      ${notifications.length} job(s) processed | ${totalEmails} sent | ${totalEmailFails} failed`);
  lines.push(`Totals:             ${totalSynced} synced, ${totalFailed} error(s), ${allResults.length} checked`);
  lines.push("");

  // ── SBP EasyData Freshness Audit (all 20 indicators, Step 9) ──
  const freshCount        = freshnessAudit.filter((e) => e.status === "fresh").length;
  const selfHealed        = freshnessAudit.filter((e) => e.status === "stale-self-healed");
  const needsReview       = freshnessAudit.filter((e) => e.status === "stale-needs-review");
  const metaUnavailable   = freshnessAudit.filter((e) => e.status === "meta-unavailable").length;
  const serveErrors       = freshnessAudit.filter((e) => e.status === "serve-error").length;
  lines.push(
    `SBP Freshness Audit: ${freshnessAudit.length} checked | ${freshCount} fresh | ` +
    `${selfHealed.length} self-healed | ${needsReview.length} needs review | ` +
    `${metaUnavailable} meta-unavailable | ${serveErrors} serve-error`,
  );
  if (selfHealed.length > 0) {
    for (const e of selfHealed) lines.push(`  ↻ ${e.indicator}: ${e.detail}`);
  }
  if (needsReview.length > 0) {
    for (const e of needsReview) lines.push(`  ⚠ ${e.indicator}: ${e.detail}`);
  }
  lines.push(LINE);

  return lines.join("\n");
}

/**
 * Formats per-indicator detail blocks for all synced indicators.
 * Useful for Vercel logs — too verbose for the GitHub Actions summary but
 * invaluable for diagnosing what each sync step actually did.
 */
export function formatDetailBlocks(input: PipelineSummaryInput): string {
  const blocks: string[] = [];

  blocks.push(LINE);
  blocks.push("SYNC DETAIL — INDICATORS");
  blocks.push(LINE);
  blocks.push("");

  const pairs: Array<[SyncResult, string]> = [
    ...input.cpiPbsResults.map((r): [SyncResult, string] => [r, "Step 3 PBS PDF"]),
    ...input.tradeBalanceResults.map((r): [SyncResult, string] => [r, "Step 4 PBS Excel"]),
    ...(input.fxReservesResult ? [[input.fxReservesResult, "Step 5 Forex_Arch"] as [SyncResult, string]] : []),
    ...input.syncResults.map((r): [SyncResult, string] => [r, "Step 6 EasyData/SPI"]),
    ...(input.lsmResult ? [[input.lsmResult, "Step 7 LSM"] as [SyncResult, string]] : []),
  ];

  for (const [r, label] of pairs) {
    blocks.push(formatIndicatorBlock(r, label));
    blocks.push("");
  }

  // ── Email summary ─────────────────────────────────────────────────────────
  const totalSent    = input.notifications.reduce((s, n) => s + n.sentThisPass, 0);
  const totalFailed  = input.notifications.reduce((s, n) => s + n.failedThisPass, 0);
  const totalJobs    = input.notifications.length;
  blocks.push(THIN);
  blocks.push("NOTIFICATIONS");
  blocks.push(THIN);
  blocks.push(`Jobs Processed:      ${totalJobs}`);
  blocks.push(`Emails Sent:         ${totalSent}`);
  blocks.push(`Email Failures:      ${totalFailed}`);
  blocks.push(`Result:              ${totalFailed === 0 ? "SUCCESS" : "PARTIAL FAILURE"}`);

  return blocks.join("\n");
}
