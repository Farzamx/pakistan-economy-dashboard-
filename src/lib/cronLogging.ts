// Cron History logging (Final Production Hardening, Part 5) — every cron
// route calls logCronRun() once, at the end of its run, with whatever
// outcome it actually had. This is the only place "last successful run" /
// "last failure" / duration data for any scheduled job comes from; before
// this, none of it was persisted anywhere.

import { createPublicDataClient } from "@/lib/supabase/publicDataClient";

export type CronRunStatus = "success" | "failure" | "skipped";

export interface CronRunRecord {
  jobName: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  status: CronRunStatus;
  detail: string | null;
}

/** Best-effort — a logging failure must never take down the cron job it's logging for. */
export async function logCronRun(jobName: string, startedAt: Date, status: CronRunStatus, detail?: string): Promise<void> {
  try {
    const finishedAt = new Date();
    const internalSecret = process.env.NOTIFICATION_WORKER_SECRET;
    if (!internalSecret) {
      console.error(`[CronLog] NOTIFICATION_WORKER_SECRET not configured — cannot log run for ${jobName}`);
      return;
    }
    const supabase = createPublicDataClient();
    const { error } = await supabase.rpc("log_cron_run", {
      p_internal_secret: internalSecret,
      p_job_name: jobName,
      p_started_at: startedAt.toISOString(),
      p_finished_at: finishedAt.toISOString(),
      p_status: status,
      p_detail: detail ?? null,
    });
    if (error) console.error(`[CronLog] log_cron_run failed for ${jobName}: ${error.message}`);
  } catch (err) {
    console.error(`[CronLog] log_cron_run threw for ${jobName}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

interface RunRow {
  job_name: string;
  started_at: string;
  finished_at: string;
  duration_ms: number;
  status: CronRunStatus;
  detail: string | null;
}

/** Recent run history for one job (or every job if jobName is omitted), most recent first. */
export async function getCronRunHistory(jobName?: string, limit = 20): Promise<CronRunRecord[]> {
  try {
    const supabase = createPublicDataClient();
    const { data, error } = await supabase.rpc("get_cron_run_history", { p_job_name: jobName ?? null, p_limit: limit });
    if (error) {
      console.error(`[CronLog] get_cron_run_history failed: ${error.message}`);
      return [];
    }
    return ((data ?? []) as RunRow[]).map((r) => ({
      jobName: r.job_name,
      startedAt: r.started_at,
      finishedAt: r.finished_at,
      durationMs: r.duration_ms,
      status: r.status,
      detail: r.detail,
    }));
  } catch (err) {
    console.error(`[CronLog] get_cron_run_history threw: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}
