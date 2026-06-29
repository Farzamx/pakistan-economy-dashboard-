-- Notification system: subscribers, notification_jobs, email_log.
-- Like every other migration in this project, run manually in the
-- Supabase SQL editor — no migration framework or service-role key exists.
--
-- Deliberately NOT reusing economic_events.0002's reserved
-- `user_event_subscriptions` table: that table is keyed to auth.users(id)
-- (a registered, logged-in app account) and already has category/
-- min_importance preference columns. This feature is a standalone public
-- email list (verify via emailed link, unsubscribe via emailed link, no
-- login required) with explicitly no preferences yet — a different
-- relationship model, not a smaller version of that one. Left untouched;
-- it remains unused by anything.
--
-- Security model mirrors 0004's sync_event_actual: RLS is enabled on all
-- three tables below with ZERO policies (default-deny for the anon key via
-- PostgREST), and every read/write happens through a narrow, single-
-- purpose SECURITY DEFINER function instead. This project has no
-- service-role key and subscriber emails are more sensitive than the
-- public economic data the rest of this schema holds, so the bar for
-- direct table access is "none, ever" rather than scoped RLS policies.

-- ============================================================
-- Tables
-- ============================================================

create table if not exists public.subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  status text not null default 'pending_verification'
    check (status in ('pending_verification', 'verified', 'unsubscribed', 'bounced', 'complained')),
  verification_token text unique,
  verification_sent_at timestamptz,
  verified_at timestamptz,
  unsubscribe_token text not null unique default encode(gen_random_bytes(24), 'hex'),
  unsubscribed_at timestamptz,
  -- Where the signup happened (e.g. "homepage_footer") — analytics only,
  -- not a preference. No preferences column: every verified subscriber
  -- receives every Economic Calendar release, by explicit design (MVP).
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists subscribers_status_idx on public.subscribers (status);

alter table public.subscribers enable row level security;

create table if not exists public.notification_jobs (
  id uuid primary key default gen_random_uuid(),
  economic_event_id uuid not null references public.economic_events(id) on delete cascade,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'completed', 'failed', 'partial')),
  started_at timestamptz,        -- set once, on the first processing pass only
  last_attempted_at timestamptz, -- updated on every pass, including retries/resumes
  completed_at timestamptz,      -- set when status reaches a terminal value
  emails_total int not null default 0,
  emails_sent int not null default 0,
  emails_failed int not null default 0,
  -- Answers "whether retries occurred" directly rather than needing to be
  -- inferred from timestamps — incremented only when a *terminal*
  -- (failed/partial) job is re-claimed, not on every resumed pass of an
  -- in-progress one.
  retry_count int not null default 0,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- THE duplicate-prevention guarantee: the database rejects a second
  -- insert outright, closing the race a "check then insert" in application
  -- code can't fully close on its own.
  unique (economic_event_id)
);
create index if not exists notification_jobs_status_idx on public.notification_jobs (status);

alter table public.notification_jobs enable row level security;

create table if not exists public.email_log (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references public.subscribers(id) on delete cascade,
  notification_job_id uuid references public.notification_jobs(id) on delete set null,
  economic_event_id uuid references public.economic_events(id) on delete set null,
  email_type text not null
    check (email_type in ('verification', 'event_alert', 'unsubscribe_confirmation', 'test')),
  resend_message_id text,
  status text not null default 'queued'
    check (status in ('queued', 'sent', 'delivered', 'bounced', 'delivery_delayed', 'complained', 'failed', 'skipped')),
  status_detail text,
  attempt_count int not null default 0,
  last_attempted_at timestamptz not null default now(),
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  -- Idempotency at the individual-send level: re-running the worker for
  -- the same job never creates a second row for the same subscriber.
  unique (subscriber_id, economic_event_id, email_type)
);
create index if not exists email_log_job_idx on public.email_log (notification_job_id);
create index if not exists email_log_status_idx on public.email_log (status);
create index if not exists email_log_message_idx on public.email_log (resend_message_id);

alter table public.email_log enable row level security;

-- ============================================================
-- Trigger: every release creates exactly one job, from any code path
-- ============================================================

create or replace function public.create_notification_job_on_release()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'released' and old.status is distinct from 'released' then
    insert into public.notification_jobs (economic_event_id)
    values (new.id)
    on conflict (economic_event_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_create_notification_job on public.economic_events;
create trigger trg_create_notification_job
  after update on public.economic_events
  for each row execute function public.create_notification_job_on_release();

-- ============================================================
-- RPCs: subscriber lifecycle (callable by anon — these ARE the public
-- write path, narrowly scoped to exactly one operation each)
-- ============================================================

create or replace function public.subscribe_email(p_email text, p_source text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
  v_id uuid;
  v_status text;
  v_token text := encode(gen_random_bytes(24), 'hex');
begin
  if v_email = '' or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return jsonb_build_object('success', false, 'error', 'invalid_email');
  end if;

  select id, status into v_id, v_status from public.subscribers where email = v_email;

  if v_id is not null then
    if v_status = 'verified' then
      return jsonb_build_object('success', true, 'already_verified', true);
    end if;
    -- pending_verification / unsubscribed / bounced / complained: allow
    -- re-subscribing with a fresh token rather than erroring.
    update public.subscribers
      set status = 'pending_verification', verification_token = v_token, verification_sent_at = now(), updated_at = now()
      where id = v_id;
    return jsonb_build_object('success', true, 'subscriber_id', v_id, 'verification_token', v_token);
  end if;

  insert into public.subscribers (email, verification_token, verification_sent_at, source)
  values (v_email, v_token, now(), p_source)
  returning id into v_id;

  return jsonb_build_object('success', true, 'subscriber_id', v_id, 'verification_token', v_token);
end;
$$;

create or replace function public.verify_subscriber(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_status text;
begin
  select id, status into v_id, v_status from public.subscribers where verification_token = p_token;

  if v_id is null then
    return jsonb_build_object('success', false, 'error', 'invalid_token');
  end if;

  if v_status = 'verified' then
    return jsonb_build_object('success', true, 'already_verified', true);
  end if;

  update public.subscribers
    set status = 'verified', verified_at = now(), verification_token = null, updated_at = now()
    where id = v_id;

  return jsonb_build_object('success', true);
end;
$$;

create or replace function public.unsubscribe_subscriber(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_status text;
begin
  select id, status into v_id, v_status from public.subscribers where unsubscribe_token = p_token;

  if v_id is null then
    return jsonb_build_object('success', false, 'error', 'invalid_token');
  end if;

  if v_status = 'unsubscribed' then
    return jsonb_build_object('success', true, 'already_unsubscribed', true);
  end if;

  update public.subscribers
    set status = 'unsubscribed', unsubscribed_at = now(), updated_at = now()
    where id = v_id;

  return jsonb_build_object('success', true);
end;
$$;

-- ============================================================
-- RPCs: notification job worker (called only from server-side cron/webhook
-- routes, never from a browser, but still routed through the anon key like
-- everything else in this project — see header)
-- ============================================================

-- Discovers work for the worker loop. processing/partial/failed are
-- included so resuming an interrupted pass and retrying a previously-failed
-- one are the same "find outstanding jobs" query, not separate code paths.
create or replace function public.get_pending_notification_jobs(p_limit int default 10)
returns table (id uuid, economic_event_id uuid, status text, retry_count int)
language sql
security definer
set search_path = public
as $$
  select id, economic_event_id, status, retry_count
  from public.notification_jobs
  where status in ('queued', 'processing', 'partial', 'failed')
  order by created_at
  limit p_limit;
$$;

create or replace function public.claim_notification_job_work(p_job_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job record;
  v_verified_count int;
begin
  -- SKIP LOCKED: if another invocation already holds this job, this call
  -- returns "locked" immediately rather than blocking — two invocations
  -- must never process the same job at once.
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
  else -- already 'processing' — resuming a multi-invocation pass
    update public.notification_jobs
      set last_attempted_at = now(), updated_at = now()
      where id = p_job_id;
  end if;

  select count(*) into v_verified_count from public.subscribers where status = 'verified';
  update public.notification_jobs set emails_total = v_verified_count, updated_at = now() where id = p_job_id;

  -- Idempotent: ON CONFLICT DO NOTHING means re-running this never
  -- duplicates a row, and newly-verified subscribers since the last pass
  -- are picked up automatically.
  insert into public.email_log (subscriber_id, notification_job_id, economic_event_id, email_type, status)
  select s.id, p_job_id, v_job.economic_event_id, 'event_alert', 'queued'
  from public.subscribers s
  where s.status = 'verified'
  on conflict (subscriber_id, economic_event_id, email_type) do nothing;

  return jsonb_build_object('success', true, 'job_id', p_job_id, 'economic_event_id', v_job.economic_event_id, 'emails_total', v_verified_count);
end;
$$;

create or replace function public.get_pending_email_log_batch(p_job_id uuid, p_limit int default 100)
returns table (email_log_id uuid, subscriber_id uuid, email text, unsubscribe_token text)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- A subscriber who unsubscribed/bounced/complained after their row was
  -- queued must not receive it — mark skipped rather than silently
  -- sending to someone who's no longer eligible.
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
      -- 'failed' rows are retried within the same pass up to 3 attempts;
      -- beyond that, only a fresh job-level retry (claim_notification_job_work
      -- incrementing retry_count) will attempt them again, preventing an
      -- unbounded loop against a persistently-failing address.
      and (el.status = 'queued' or (el.status = 'failed' and el.attempt_count < 3))
    order by el.created_at
    limit p_limit;
end;
$$;

create or replace function public.record_email_batch_results(p_job_id uuid, p_results jsonb)
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

  select count(*) filter (where status in ('sent', 'delivered', 'opened', 'clicked')),
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

-- ============================================================
-- RPC: webhook-driven delivery status updates
-- ============================================================

create or replace function public.update_email_delivery_status(p_resend_message_id text, p_status text, p_status_detail text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email_log_id uuid;
  v_subscriber_id uuid;
begin
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

  -- Hard bounces/complaints suppress future sends to this address —
  -- updated here so it's reflected the moment we learn about it, not just
  -- relying on Resend's own account-wide suppression list. Never downgrades
  -- an already-unsubscribed subscriber.
  if p_status in ('bounced', 'complained') then
    update public.subscribers
      set status = p_status, updated_at = now()
      where id = v_subscriber_id and status <> 'unsubscribed';
  end if;

  return jsonb_build_object('success', true);
end;
$$;

-- ============================================================
-- Grants — every function above is the ONLY way to touch these tables
-- ============================================================

revoke all on function public.subscribe_email(text, text) from public;
grant execute on function public.subscribe_email(text, text) to anon, authenticated;

revoke all on function public.verify_subscriber(text) from public;
grant execute on function public.verify_subscriber(text) to anon, authenticated;

revoke all on function public.unsubscribe_subscriber(text) from public;
grant execute on function public.unsubscribe_subscriber(text) to anon, authenticated;

revoke all on function public.get_pending_notification_jobs(int) from public;
grant execute on function public.get_pending_notification_jobs(int) to anon, authenticated;

revoke all on function public.claim_notification_job_work(uuid) from public;
grant execute on function public.claim_notification_job_work(uuid) to anon, authenticated;

revoke all on function public.get_pending_email_log_batch(uuid, int) from public;
grant execute on function public.get_pending_email_log_batch(uuid, int) to anon, authenticated;

revoke all on function public.record_email_batch_results(uuid, jsonb) from public;
grant execute on function public.record_email_batch_results(uuid, jsonb) to anon, authenticated;

revoke all on function public.update_email_delivery_status(text, text, text) from public;
grant execute on function public.update_email_delivery_status(text, text, text) to anon, authenticated;
