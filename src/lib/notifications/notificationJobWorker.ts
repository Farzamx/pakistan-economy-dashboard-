// Notification job worker — processes notification_jobs rows created by
// the trg_create_notification_job trigger (0007_notification_system.sql)
// whenever an economic_events row transitions to 'released', from ANY code
// path (the automated SBP EasyData sync or a manual release update).
//
// Self-contained and resumable by design, not relying on frequent
// invocations: this project's only available cron frequency is once/day
// (Vercel Hobby — see vercel.json), so a job can't be safely designed
// around "the next tick is a minute away." Instead, processNotificationJobs()
// loops internally, draining as much pending work as it can within
// TIME_BUDGET_MS, and is exactly as safe to call again (same invocation,
// next day's cron, or a manual retry) whether the previous call finished a
// job, ran out of time mid-job, or was never called for a particular job at
// all — every step (claim, batch, record) is idempotent against repeats.
//
// TIME_BUDGET_MS is set well under Vercel's Hobby function duration (300s
// with Fluid Compute, the current default — see both cron routes'
// maxDuration). At BATCH_PACE_MS's ~4 batches/sec * 100/batch, that's
// upward of 100,000 emails reachable within one invocation, comfortably
// past "tens of thousands" — but the resumable design is kept regardless,
// since it's free insurance against a slower-than-expected pass.
//
// Timeliness note: the 9 automated series get near-immediate notification
// processing because sync-economic-calendar's cron route calls this
// function inline, right after detecting a release, in the same
// invocation — not by waiting for a separate schedule. Manually-released
// events (Federal Budget, Economic Survey, etc.) are only picked up by this
// same once-daily cron's safety-net pass (process-notification-jobs) unless
// someone triggers it sooner. See the architecture review in this
// session's history for the full reasoning and the alternatives considered.

import type { SupabaseClient } from "@supabase/supabase-js";
import { createPublicDataClient } from "@/lib/supabase/publicDataClient";
import { sendEmailBatch, type BatchEmailItem } from "@/lib/email/resend";
import { buildAlertEmailContent, type AlertEmailEvent, type AlertEmailNextEvent } from "./alertEmailTemplate";

const BATCH_SIZE = 100; // Resend's per-call limit
const TIME_BUDGET_MS = 270_000; // 30s margin under Hobby's 300s function duration cap
const BATCH_PACE_MS = 250; // >= 1000/5 — deliberately stays at/under Resend's 5 req/sec ceiling rather than relying on network latency to throttle naturally

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// These five RPCs mutate job/email_log state and return subscriber PII —
// they're gated by this secret (checked inside the function body, on top
// of the anon-key grant Supabase RPCs always need) so they can't be called
// directly by anyone holding the public anon key. See
// 0011_secure_worker_rpcs.sql for why this was added.
function workerSecret(): string {
  const secret = process.env.NOTIFICATION_WORKER_SECRET;
  if (!secret) throw new Error("NOTIFICATION_WORKER_SECRET is not configured");
  return secret;
}

interface ClaimResult {
  success: boolean;
  error?: string;
  already_completed?: boolean;
  job_id?: string;
  economic_event_id?: string;
  emails_total?: number;
}

interface PendingSubscriberRow {
  email_log_id: string;
  subscriber_id: string;
  email: string;
  unsubscribe_token: string;
}

interface RecordResult {
  success: boolean;
  pending?: number;
  sent?: number;
  failed?: number;
}

interface SeriesEmbed {
  category?: string;
  slug?: string;
  source_name?: string;
}

function unwrapSeries(value: unknown): SeriesEmbed | null {
  const series = value as SeriesEmbed | SeriesEmbed[] | null;
  return Array.isArray(series) ? series[0] ?? null : series;
}

async function fetchEventDetails(supabase: SupabaseClient, economicEventId: string): Promise<AlertEmailEvent | null> {
  const { data, error } = await supabase
    .from("economic_events")
    .select("slug, title, event_date, event_time, previous_value, forecast_value, actual_value, importance, economic_event_series(category, slug, source_name)")
    .eq("id", economicEventId)
    .maybeSingle();

  if (error || !data) return null;

  const series = unwrapSeries(data.economic_event_series);

  return {
    slug: data.slug as string,
    title: data.title as string,
    eventDate: data.event_date as string,
    eventTime: (data.event_time as string | null) ?? null,
    previousValue: (data.previous_value as string | null) ?? null,
    forecastValue: (data.forecast_value as string | null) ?? null,
    actualValue: (data.actual_value as string | null) ?? null,
    importance: data.importance as AlertEmailEvent["importance"],
    category: series?.category ?? "Economic Calendar",
    seriesSlug: series?.slug ?? "",
    sourceName: series?.source_name ?? "Pakistan Economic Intelligence",
  };
}

/** The soonest still-scheduled event across every series — shown as "Next Scheduled Release" at the bottom of the alert email, kept simple (soonest, not impact-ranked) to match the worked example this was built from. Returns null rather than guessing if nothing is currently scheduled. */
async function fetchNextScheduledRelease(supabase: SupabaseClient): Promise<AlertEmailNextEvent | null> {
  const { data, error } = await supabase
    .from("economic_events")
    .select("title, event_date, event_time")
    .eq("status", "scheduled")
    .order("event_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return {
    title: data.title as string,
    eventDate: data.event_date as string,
    eventTime: (data.event_time as string | null) ?? null,
  };
}

export interface JobProcessingSummary {
  jobId: string;
  economicEventId: string;
  emailsTotal: number;
  sentThisPass: number;
  failedThisPass: number;
  completed: boolean;
}

/** Drains one job's pending email_log rows in batches until it's fully sent or the deadline is reached. Every call is safe to repeat — claiming, batching, and recording are each idempotent against being re-run on the same job. */
async function processJob(supabase: SupabaseClient, jobId: string, deadline: number): Promise<JobProcessingSummary | null> {
  const { data: claim, error: claimError } = await supabase.rpc("claim_notification_job_work", {
    p_internal_secret: workerSecret(),
    p_job_id: jobId,
  });
  if (claimError) {
    console.error(`[Notifications] Job ${jobId}: claim failed: ${claimError.message}`);
    return null;
  }
  const claimResult = claim as ClaimResult;
  if (!claimResult.success) {
    // job_locked_or_not_found: a concurrent transaction has the row lock.
    // already_processing: a live worker (this pipeline run overlapping the
    // next cron tick, or the daily safety-net cron running concurrently)
    // already claimed this job within the 6-minute lease window — see
    // 0040_notification_worker_claim_hardening.sql. Neither is an error:
    // returning null here means this pass simply doesn't touch the job,
    // which is exactly the fix for the confirmed double-send bug (the old
    // RPC used to return success:true here and let this function send a
    // second batch of real emails for a job another invocation already owned).
    console.warn(`[Notifications] Job ${jobId}: could not claim — ${claimResult.error}`);
    return null;
  }
  if (claimResult.already_completed) {
    return { jobId, economicEventId: claimResult.economic_event_id!, emailsTotal: 0, sentThisPass: 0, failedThisPass: 0, completed: true };
  }

  const economicEventId = claimResult.economic_event_id!;
  const event = await fetchEventDetails(supabase, economicEventId);
  if (!event) {
    console.error(`[Notifications] Job ${jobId}: economic_events row ${economicEventId} not found — cannot generate email content`);
    return null;
  }
  // Same for every recipient of this job — fetched once, not per-batch.
  const nextEvent = await fetchNextScheduledRelease(supabase);

  let sentThisPass = 0;
  let failedThisPass = 0;
  let batchIndex = 0;
  let completed = false;

  while (Date.now() < deadline) {
    const { data: batchRows, error: batchError } = await supabase.rpc("get_pending_email_log_batch", {
      p_internal_secret: workerSecret(),
      p_job_id: jobId,
      p_limit: BATCH_SIZE,
    });
    if (batchError) {
      console.error(`[Notifications] Job ${jobId}: failed to fetch pending batch: ${batchError.message}`);
      break;
    }

    const pending = (batchRows ?? []) as PendingSubscriberRow[];
    if (pending.length === 0) {
      completed = true;
      break;
    }

    const items: BatchEmailItem[] = pending.map((row) => {
      const content = buildAlertEmailContent(event, nextEvent, row.unsubscribe_token);
      return { key: row.email_log_id, to: row.email, subject: content.subject, html: content.html, text: content.text };
    });

    const results = await sendEmailBatch(items, `notif:${jobId}:${batchIndex}`);
    batchIndex++;

    const rpcResults = results.map((r) => ({
      email_log_id: r.key,
      status: r.success ? "sent" : "failed",
      resend_message_id: r.id ?? null,
      status_detail: r.error ?? null,
    }));

    const { data: recorded, error: recordError } = await supabase.rpc("record_email_batch_results", {
      p_internal_secret: workerSecret(),
      p_job_id: jobId,
      p_results: rpcResults,
    });
    if (recordError) {
      console.error(`[Notifications] Job ${jobId}: failed to record batch results: ${recordError.message}`);
      break;
    }

    const batchSent = results.filter((r) => r.success).length;
    const batchFailed = results.length - batchSent;
    sentThisPass += batchSent;
    failedThisPass += batchFailed;

    console.log(`[Notifications] Job ${jobId} batch ${batchIndex}: ${batchSent}/${results.length} sent`);

    const recordResult = recorded as RecordResult;
    if (recordResult.pending === 0) {
      completed = true;
      break;
    }

    if (Date.now() + BATCH_PACE_MS < deadline) {
      await sleep(BATCH_PACE_MS);
    }
  }

  return { jobId, economicEventId, emailsTotal: claimResult.emails_total ?? 0, sentThisPass, failedThisPass, completed };
}

/**
 * Entry point for both the inline call from sync-economic-calendar's cron
 * (fires right after detecting an automated release) and the dedicated
 * process-notification-jobs route (the safety net for manually-released
 * events and for resuming anything that didn't finish in one pass).
 */
export async function processNotificationJobs(): Promise<JobProcessingSummary[]> {
  const supabase = createPublicDataClient();
  const deadline = Date.now() + TIME_BUDGET_MS;
  const summaries: JobProcessingSummary[] = [];

  const { data: jobs, error } = await supabase.rpc("get_pending_notification_jobs", {
    p_internal_secret: workerSecret(),
    p_limit: 10,
  });
  if (error) {
    console.error(`[Notifications] Failed to list pending jobs: ${error.message}`);
    return summaries;
  }

  for (const job of (jobs ?? []) as { id: string }[]) {
    if (Date.now() >= deadline) {
      console.warn("[Notifications] Time budget exhausted before processing all pending jobs — remainder will resume on the next run");
      break;
    }
    const summary = await processJob(supabase, job.id, deadline);
    if (summary) summaries.push(summary);
  }

  return summaries;
}
