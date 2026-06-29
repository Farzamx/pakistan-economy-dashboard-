-- Fixes a real, serious security gap found during final production
-- verification: every "worker" RPC (meant to be called ONLY by this
-- project's own cron/webhook routes) was granted to `anon` — the exact
-- same public key embedded in every browser's JS bundle, extractable by
-- anyone. That meant ANYONE could call these directly against Supabase's
-- REST API, with no further authentication:
--
--   get_pending_notification_jobs()        -> lists internal job state
--   claim_notification_job_work(job_id)     -> mutates job state, creates
--                                              email_log rows for every
--                                              verified subscriber
--   get_pending_email_log_batch(job_id, n)  -> returns real subscriber
--                                              EMAIL ADDRESSES and their
--                                              personal unsubscribe tokens
--   record_email_batch_results(...)         -> can corrupt delivery counts
--   update_email_delivery_status(...)        -> can fabricate bounce/
--                                               complaint events for any
--                                               guessed message id
--
-- get_pending_email_log_batch is the worst of these: a real PII exposure
-- (subscriber emails + unsubscribe tokens for anyone willing to call it),
-- not a hypothetical. This blocks onboarding real subscribers until fixed.
--
-- The subscriber-facing RPCs (subscribe_email, verify_subscriber,
-- unsubscribe_subscriber) are deliberately NOT touched here — being
-- callable by anyone is their entire purpose.
--
-- Fix: a tiny, RLS-locked secrets table that only these five
-- SECURITY DEFINER functions read from internally. Each now requires a
-- matching p_internal_secret argument; the cron/webhook routes pass it
-- from a new NOTIFICATION_WORKER_SECRET env var (set by the application,
-- never committed to a file). No service-role key is introduced — this
-- keeps the existing "anon key everywhere, RPCs gate everything" pattern
-- this project already uses, just adds one more gate to the calls that
-- specifically need it.
--
-- ACTION REQUIRED after running this migration: insert your own secret
-- value (generate something long and random) by running, in the SQL
-- editor, with YOUR OWN value substituted — never commit this value to
-- any file:
--   insert into public.internal_secrets (key, value) values ('notification_worker', 'paste-a-long-random-string-here');
-- Then set NOTIFICATION_WORKER_SECRET to that SAME value in .env.local and Vercel.

create table if not exists public.internal_secrets (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table public.internal_secrets enable row level security;
-- No policies, no grants to anon/authenticated at all — not even SELECT.
-- The only access path is the helper function below, which is itself
-- SECURITY DEFINER and never exposed to anon/authenticated.

create or replace function public.check_internal_secret(p_key text, p_secret text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_value text;
begin
  select value into v_value from public.internal_secrets where key = p_key;
  return v_value is not null and v_value = p_secret;
end;
$$;
-- Deliberately not granted to anyone — only called internally by the
-- functions below (a SECURITY DEFINER function can call another SECURITY
-- DEFINER function without needing its own grant).

create or replace function public.get_pending_notification_jobs(p_internal_secret text, p_limit int default 10)
returns table (id uuid, economic_event_id uuid, status text, retry_count int)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.check_internal_secret('notification_worker', p_internal_secret) then
    raise exception 'unauthorized';
  end if;
  return query
    select n.id, n.economic_event_id, n.status, n.retry_count
    from public.notification_jobs n
    where n.status in ('queued', 'processing', 'partial', 'failed')
    order by n.created_at
    limit p_limit;
end;
$$;

create or replace function public.claim_notification_job_work(p_internal_secret text, p_job_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job record;
  v_verified_count int;
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

  if v_job.status in ('failed', 'partial') then
    update public.notification_jobs
      set status = 'processing', retry_count = retry_count + 1, last_attempted_at = now(), updated_at = now()
      where id = p_job_id;
  elsif v_job.status = 'queued' then
    update public.notification_jobs
      set status = 'processing', started_at = now(), last_attempted_at = now(), updated_at = now()
      where id = p_job_id;
  else
    update public.notification_jobs
      set last_attempted_at = now(), updated_at = now()
      where id = p_job_id;
  end if;

  select count(*) into v_verified_count from public.subscribers where status = 'verified';
  update public.notification_jobs set emails_total = v_verified_count, updated_at = now() where id = p_job_id;

  insert into public.email_log (subscriber_id, notification_job_id, economic_event_id, email_type, status)
  select s.id, p_job_id, v_job.economic_event_id, 'event_alert', 'queued'
  from public.subscribers s
  where s.status = 'verified'
  on conflict (subscriber_id, economic_event_id, email_type) do nothing;

  return jsonb_build_object('success', true, 'job_id', p_job_id, 'economic_event_id', v_job.economic_event_id, 'emails_total', v_verified_count);
end;
$$;

create or replace function public.get_pending_email_log_batch(p_internal_secret text, p_job_id uuid, p_limit int default 100)
returns table (email_log_id uuid, subscriber_id uuid, email text, unsubscribe_token text)
language plpgsql
security definer
set search_path = public
as $$
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
    select el.id, el.subscriber_id, s.email, s.unsubscribe_token
    from public.email_log el
    join public.subscribers s on s.id = el.subscriber_id
    where el.notification_job_id = p_job_id
      and s.status = 'verified'
      and (el.status = 'queued' or (el.status = 'failed' and el.attempt_count < 3))
    order by el.created_at
    limit p_limit;
end;
$$;

create or replace function public.record_email_batch_results(p_internal_secret text, p_job_id uuid, p_results jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_sent_count int;
  v_failed_count int;
  v_pending int;
  v_new_status text;
begin
  if not public.check_internal_secret('notification_worker', p_internal_secret) then
    raise exception 'unauthorized';
  end if;

  for v_item in select * from jsonb_array_elements(p_results)
  loop
    update public.email_log
      set status = (v_item->>'status'),
          resend_message_id = coalesce((v_item->>'resend_message_id'), resend_message_id),
          status_detail = (v_item->>'status_detail'),
          attempt_count = attempt_count + 1,
          last_attempted_at = now()
      where id = (v_item->>'email_log_id')::uuid;
  end loop;

  select count(*) filter (where status in ('sent', 'delivered', 'bounced', 'delivery_delayed', 'complained')),
         count(*) filter (where status = 'failed')
    into v_sent_count, v_failed_count
    from public.email_log where notification_job_id = p_job_id;

  select count(*) into v_pending from public.email_log
    where notification_job_id = p_job_id
      and (status = 'queued' or (status = 'failed' and attempt_count < 3));

  if v_pending = 0 then
    v_new_status := case
      when v_failed_count = 0 then 'completed'
      when v_sent_count = 0 then 'failed'
      else 'partial'
    end;
    update public.notification_jobs
      set emails_sent = v_sent_count, emails_failed = v_failed_count, status = v_new_status, completed_at = now(), updated_at = now()
      where id = p_job_id;
  else
    update public.notification_jobs
      set emails_sent = v_sent_count, emails_failed = v_failed_count, updated_at = now()
      where id = p_job_id;
  end if;

  return jsonb_build_object('success', true, 'pending', v_pending, 'sent', v_sent_count, 'failed', v_failed_count);
end;
$$;

create or replace function public.update_email_delivery_status(p_internal_secret text, p_resend_message_id text, p_status text, p_status_detail text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email_log_id uuid;
  v_subscriber_id uuid;
begin
  if not public.check_internal_secret('notification_worker', p_internal_secret) then
    raise exception 'unauthorized';
  end if;

  select id, subscriber_id into v_email_log_id, v_subscriber_id
    from public.email_log where resend_message_id = p_resend_message_id
    order by created_at desc limit 1;

  if v_email_log_id is null then
    return jsonb_build_object('success', false, 'error', 'message_not_found');
  end if;

  update public.email_log
    set status = p_status,
        status_detail = coalesce(p_status_detail, status_detail),
        delivered_at = case when p_status = 'delivered' then now() else delivered_at end
    where id = v_email_log_id;

  if p_status in ('bounced', 'complained') then
    update public.subscribers
      set status = p_status, updated_at = now()
      where id = v_subscriber_id and status <> 'unsubscribed';
  end if;

  return jsonb_build_object('success', true);
end;
$$;

-- Drop the old, unsecured signatures (Postgres treats a changed parameter
-- list as a different function — the grants below target the NEW
-- signatures; the old ones are removed so they can't be called at all).
drop function if exists public.get_pending_notification_jobs(int);
drop function if exists public.claim_notification_job_work(uuid);
drop function if exists public.get_pending_email_log_batch(uuid, int);
drop function if exists public.record_email_batch_results(uuid, jsonb);
drop function if exists public.update_email_delivery_status(text, text, text);

revoke all on function public.get_pending_notification_jobs(text, int) from public;
grant execute on function public.get_pending_notification_jobs(text, int) to anon, authenticated;

revoke all on function public.claim_notification_job_work(text, uuid) from public;
grant execute on function public.claim_notification_job_work(text, uuid) to anon, authenticated;

revoke all on function public.get_pending_email_log_batch(text, uuid, int) from public;
grant execute on function public.get_pending_email_log_batch(text, uuid, int) to anon, authenticated;

revoke all on function public.record_email_batch_results(text, uuid, jsonb) from public;
grant execute on function public.record_email_batch_results(text, uuid, jsonb) to anon, authenticated;

revoke all on function public.update_email_delivery_status(text, text, text, text) from public;
grant execute on function public.update_email_delivery_status(text, text, text, text) to anon, authenticated;

-- check_internal_secret is intentionally NOT granted to anyone — internal
-- helper only, called by the functions above from inside their own
-- SECURITY DEFINER context.
