-- Production-hardening audit, 2026-07-18: fixes a confirmed double-send
-- race in the notification worker, found by re-auditing
-- claim_notification_job_work() and get_pending_email_log_batch()
-- (0011_secure_worker_rpcs.sql) against real overlapping-invocation
-- scenarios.
--
-- BUG 1 — claim_notification_job_work's fallback branch:
--   When a job's status is already 'processing', the old function fell
--   through to a bare `else` that still returned `success: true` with the
--   job's economic_event_id/emails_total, with NO way to distinguish "a
--   live concurrent worker already has this" from "a prior run crashed and
--   left it stuck." The caller (notificationJobWorker.ts) treats any
--   success:true as a valid claim and proceeds to send real emails.
--   Concrete trigger: sync-economic-calendar.yml polls every 15 minutes and
--   calls processNotificationJobs() inline after 7 other network-bound
--   sync steps; a single run slower than 15 minutes overlaps the next
--   GitHub Actions tick (and/or the daily Vercel process-notification-jobs
--   cron), both invoking the same job — subscribers receive duplicate
--   alert emails for the same release.
--
-- BUG 2 — get_pending_email_log_batch had no claim step at all:
--   A plain SELECT of queued/failed rows with no locking or status update.
--   Two workers that both believe they own the same job (via bug 1, or via
--   any future bug with the same shape) fetch the SAME batch of
--   subscriber rows and BOTH call the real Resend API for each one.
--
-- FIX:
--   1. claim_notification_job_work: a 'processing' job is only reclaimable
--      if its last_attempted_at is older than a lease timeout (6 minutes —
--      comfortably above the worker's own 270s TIME_BUDGET_MS, so a
--      genuinely still-running worker is never preempted, while a crashed
--      one recovers automatically on the next poll). Within the lease
--      window, returns success:false with error:'already_processing' and
--      touches NO rows — no duplicate email_log inserts, no state mutation.
--   2. get_pending_email_log_batch: claims its batch atomically in one
--      statement (UPDATE ... FOR UPDATE SKIP LOCKED ... RETURNING) instead
--      of a separate SELECT, so two concurrent callers can never receive
--      overlapping rows even within the (now much narrower) claim window.
--      Claimed rows move to a new transient 'sending' status; a second
--      lease check (same 6-minute window, keyed on last_attempted_at) lets
--      a genuinely-abandoned 'sending' row (mid-batch crash) be retried
--      without ever being visible to two workers at once.
--
-- Neither change alters record_email_batch_results or
-- update_email_delivery_status — both already operate per-row by primary
-- key and remain correct unmodified.
--
-- Idempotent: safe to re-run (create or replace + guarded constraint swap).

-- ── email_log.status: add 'sending' as a valid transient state ─────────────
do $$
declare
  v_constraint_name text;
begin
  select con.conname into v_constraint_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_attribute att on att.attrelid = rel.oid and att.attnum = any(con.conkey)
  where rel.relname = 'email_log'
    and con.contype = 'c'
    and att.attname = 'status';

  if v_constraint_name is not null then
    execute format('alter table public.email_log drop constraint %I', v_constraint_name);
  end if;

  alter table public.email_log
    add constraint email_log_status_check
    check (status in ('queued', 'sending', 'sent', 'delivered', 'bounced', 'delivery_delayed', 'complained', 'failed', 'skipped'));
end $$;

-- ── Fix 1: lease-aware job claiming ─────────────────────────────────────────
create or replace function public.claim_notification_job_work(p_internal_secret text, p_job_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job record;
  v_verified_count int;
  v_lease interval := interval '6 minutes';
begin
  if not public.check_internal_secret('notification_worker', p_internal_secret) then
    raise exception 'unauthorized';
  end if;

  select * into v_job from public.notification_jobs where id = p_job_id for update skip locked;

  if v_job.id is null then
    return jsonb_build_object('success', false, 'error', 'job_locked_or_not_found');
  end if;

  if v_job.status = 'completed' then
    return jsonb_build_object('success', true, 'already_completed', true, 'job_id', v_job.id);
  end if;

  if v_job.status = 'processing' and v_job.last_attempted_at is not null and v_job.last_attempted_at > now() - v_lease then
    -- A live worker (this one or another concurrent invocation) claimed
    -- this within the lease window — do NOT touch any state, do NOT
    -- report success. This is the fix for the confirmed double-claim bug.
    return jsonb_build_object('success', false, 'error', 'already_processing', 'job_id', v_job.id);
  end if;

  if v_job.status in ('failed', 'partial') then
    update public.notification_jobs
      set status = 'processing', retry_count = retry_count + 1, last_attempted_at = now(), updated_at = now()
      where id = p_job_id;
  elsif v_job.status = 'queued' then
    update public.notification_jobs
      set status = 'processing', started_at = now(), last_attempted_at = now(), updated_at = now()
      where id = p_job_id;
  else
    -- status = 'processing' but the lease has expired (prior worker crashed
    -- mid-run) — reclaim it explicitly rather than falling through silently.
    update public.notification_jobs
      set status = 'processing', last_attempted_at = now(), updated_at = now()
      where id = p_job_id;
  end if;

  select count(*) into v_verified_count from public.subscribers where status = 'verified';
  update public.notification_jobs set emails_total = v_verified_count, updated_at = now() where id = p_job_id;

  -- Idempotent regardless of how many times this fires for the same job —
  -- the unique constraint + ON CONFLICT DO NOTHING (unchanged from 0007)
  -- means re-claiming after a crash never duplicates a subscriber's row.
  insert into public.email_log (subscriber_id, notification_job_id, economic_event_id, email_type, status)
  select s.id, p_job_id, v_job.economic_event_id, 'event_alert', 'queued'
  from public.subscribers s
  where s.status = 'verified'
  on conflict (subscriber_id, economic_event_id, email_type) do nothing;

  return jsonb_build_object('success', true, 'job_id', p_job_id, 'economic_event_id', v_job.economic_event_id, 'emails_total', v_verified_count);
end;
$$;

-- ── Fix 2: atomic batch claim (SELECT + status flip in one statement) ──────
create or replace function public.get_pending_email_log_batch(p_internal_secret text, p_job_id uuid, p_limit int default 100)
returns table (email_log_id uuid, subscriber_id uuid, email text, unsubscribe_token text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lease interval := interval '6 minutes';
begin
  if not public.check_internal_secret('notification_worker', p_internal_secret) then
    raise exception 'unauthorized';
  end if;

  update public.email_log el
    set status = 'skipped', status_detail = 'subscriber no longer verified', last_attempted_at = now()
    where el.notification_job_id = p_job_id
      and el.status in ('queued', 'failed')
      and exists (select 1 from public.subscribers s where s.id = el.subscriber_id and s.status <> 'verified');

  return query
    with claimed as (
      select el.id, el.subscriber_id, s.email, s.unsubscribe_token
      from public.email_log el
      join public.subscribers s on s.id = el.subscriber_id
      where el.notification_job_id = p_job_id
        and s.status = 'verified'
        and (
          el.status = 'queued'
          or (el.status = 'failed' and el.attempt_count < 3)
          -- Crash recovery: a 'sending' row whose lease has expired means
          -- the worker that claimed it died mid-batch before recording a
          -- result. Anything still within the lease is a live send in
          -- flight and must never be picked up by a second caller.
          or (el.status = 'sending' and el.last_attempted_at < now() - v_lease)
        )
      order by el.created_at
      limit p_limit
      for update of el skip locked
    )
    update public.email_log el
      set status = 'sending', last_attempted_at = now()
      from claimed
      where el.id = claimed.id
      returning el.id, claimed.subscriber_id, claimed.email, claimed.unsubscribe_token;
end;
$$;
