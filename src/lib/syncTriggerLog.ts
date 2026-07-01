// Sync Trigger Log — Phase 4 (Part 3: Trigger Metadata)
//
// Writes one row to sync_trigger_log per HTTP invocation of the sync route,
// capturing which scheduler triggered it, how long the full pipeline took,
// and a job-level summary. Read by the System Health dashboard.
//
// Best-effort: a logging failure must never fail the HTTP response.
// Pattern mirrors cronLogging.ts.

import { createPublicDataClient } from "@/lib/supabase/publicDataClient";
import type { JobSummaryEntry } from "@/lib/economicCalendar/automation/syncPipeline";
import type { SchedulerName, TriggerType } from "@/lib/economicCalendar/automation/schedulerMeta";

export interface SyncTriggerRecord {
  id: string;
  triggeredAt: string;
  finishedAt: string;
  totalDurationMs: number;
  schedulerName: SchedulerName;
  triggerType: TriggerType;
  schedulerVersion: string | null;
  requestId: string | null;
  authMethod: string;
  jobsSummary: JobSummaryEntry[];
  totalSynced: number;
  totalFailed: number;
  createdAt: string;
}

export interface LogSyncTriggerParams {
  triggeredAt: Date;
  finishedAt: Date;
  schedulerName: SchedulerName;
  triggerType: TriggerType;
  schedulerVersion: string | null;
  requestId: string | null;
  authMethod: string;
  jobsSummary: JobSummaryEntry[];
  totalSynced: number;
  totalFailed: number;
}

interface TriggerRow {
  id: string;
  triggered_at: string;
  finished_at: string;
  total_duration_ms: number;
  scheduler_name: string;
  trigger_type: string;
  scheduler_version: string | null;
  request_id: string | null;
  auth_method: string;
  jobs_summary: JobSummaryEntry[];
  total_synced: number;
  total_failed: number;
  created_at: string;
}

/** Writes one trigger record. Best-effort — never throws. */
export async function logSyncTrigger(params: LogSyncTriggerParams): Promise<void> {
  try {
    const internalSecret = process.env.NOTIFICATION_WORKER_SECRET;
    if (!internalSecret) {
      console.error("[SyncTrigger] NOTIFICATION_WORKER_SECRET not configured — cannot log trigger");
      return;
    }
    const supabase = createPublicDataClient();
    const { error } = await supabase.rpc("log_sync_trigger", {
      p_internal_secret: internalSecret,
      p_triggered_at: params.triggeredAt.toISOString(),
      p_finished_at: params.finishedAt.toISOString(),
      p_scheduler_name: params.schedulerName,
      p_trigger_type: params.triggerType,
      p_scheduler_version: params.schedulerVersion ?? null,
      p_request_id: params.requestId ?? null,
      p_auth_method: params.authMethod,
      p_jobs_summary: params.jobsSummary as unknown,
      p_total_synced: params.totalSynced,
      p_total_failed: params.totalFailed,
    });
    if (error) console.error(`[SyncTrigger] log_sync_trigger failed: ${error.message}`);
  } catch (err) {
    console.error(`[SyncTrigger] log_sync_trigger threw: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/** Recent trigger history for the System Health dashboard. Returns [] on error. */
export async function getSyncTriggerHistory(limit = 20): Promise<SyncTriggerRecord[]> {
  try {
    const supabase = createPublicDataClient();
    const { data, error } = await supabase.rpc("get_sync_trigger_history", { p_limit: limit });
    if (error) {
      console.error(`[SyncTrigger] get_sync_trigger_history failed: ${error.message}`);
      return [];
    }
    return ((data ?? []) as TriggerRow[]).map((r) => ({
      id: r.id,
      triggeredAt: r.triggered_at,
      finishedAt: r.finished_at,
      totalDurationMs: r.total_duration_ms,
      schedulerName: r.scheduler_name as SchedulerName,
      triggerType: r.trigger_type as TriggerType,
      schedulerVersion: r.scheduler_version,
      requestId: r.request_id,
      authMethod: r.auth_method,
      jobsSummary: Array.isArray(r.jobs_summary) ? r.jobs_summary : [],
      totalSynced: r.total_synced,
      totalFailed: r.total_failed,
      createdAt: r.created_at,
    }));
  } catch (err) {
    console.error(`[SyncTrigger] get_sync_trigger_history threw: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}
