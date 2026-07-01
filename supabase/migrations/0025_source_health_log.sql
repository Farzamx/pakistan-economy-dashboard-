-- Migration 0025: Source Health Monitoring (Phase 3, Part 5)
--
-- Tracks the health of every data source the cron pipeline attempts.
-- One row per source+series attempt; retention trim keeps at most 100 rows
-- per (source_name, series_slug) pair. Written by the sync pipeline after
-- each attempt and read by the System Health dashboard.
--
-- Why a separate table from cron_run_log:
--   cron_run_log records JOB-level outcomes (one row per cron invocation).
--   source_health_log records SOURCE-level outcomes (one row per source
--   attempt per series per run). The separation keeps cron_run_log concise
--   while making per-source health queryable independently — e.g. "has
--   the SBP EasyData remittances fetch failed 3 runs in a row?" is not
--   answerable from cron_run_log alone.
--
-- Security: read/write via SECURITY DEFINER functions only. No direct
-- table access. Same pattern as cron_run_log (migration 0020).

create table if not exists public.source_health_log (
  id              uuid primary key default gen_random_uuid(),
  source_name     text not null,
  source_type     text not null,
  series_slug     text not null,
  attempted_at    timestamptz not null default now(),
  succeeded       boolean not null,
  latency_ms      int,
  observation_date text,  -- "YYYY-MM-DD" of the data point returned, if any
  error_text      text,   -- populated on succeeded=false
  is_fallback     boolean not null default false,
  cron_job_name   text,   -- which cron job triggered this (e.g. "sbp-actual-value-sync")
  created_at      timestamptz not null default now()
);

create index if not exists source_health_source_series_idx
  on public.source_health_log (source_name, series_slug, attempted_at desc);

create index if not exists source_health_attempted_idx
  on public.source_health_log (attempted_at desc);

alter table public.source_health_log enable row level security;
-- No RLS policies — all access via SECURITY DEFINER functions below.

-- ── Write RPC ────────────────────────────────────────────────────────────────
create or replace function public.log_source_health(
  p_internal_secret  text,
  p_source_name      text,
  p_source_type      text,
  p_series_slug      text,
  p_succeeded        boolean,
  p_latency_ms       int      default null,
  p_observation_date text     default null,
  p_error_text       text     default null,
  p_is_fallback      boolean  default false,
  p_cron_job_name    text     default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.check_internal_secret('notification_worker', p_internal_secret) then
    raise exception 'unauthorized';
  end if;

  insert into public.source_health_log (
    source_name, source_type, series_slug, succeeded, latency_ms,
    observation_date, error_text, is_fallback, cron_job_name
  ) values (
    p_source_name, p_source_type, p_series_slug, p_succeeded, p_latency_ms,
    p_observation_date, p_error_text, p_is_fallback, p_cron_job_name
  );

  -- Retention trim: keep latest 100 rows per (source_name, series_slug).
  delete from public.source_health_log
  where (source_name, series_slug) = (p_source_name, p_series_slug)
    and id not in (
      select id from public.source_health_log
      where (source_name, series_slug) = (p_source_name, p_series_slug)
      order by attempted_at desc
      limit 100
    );
end;
$$;

revoke all on function public.log_source_health(text, text, text, text, boolean, int, text, text, boolean, text) from public;
grant execute on function public.log_source_health(text, text, text, text, boolean, int, text, text, boolean, text) to anon, authenticated;

-- ── Read RPC (System Health dashboard) ───────────────────────────────────────
-- Returns the most recent attempt per (source_name, series_slug) pair,
-- plus rolling 7-day consecutive failure count and last success date.
-- Used by the /admin/system-health page to surface source degradation.

create or replace function public.get_source_health_summary(
  p_since_hours int default 168  -- default: last 7 days
)
returns table (
  source_name       text,
  source_type       text,
  series_slug       text,
  last_attempted_at timestamptz,
  last_succeeded_at timestamptz,
  last_observation_date text,
  last_error        text,
  consecutive_failures int,
  total_attempts    int,
  success_rate_pct  int
)
language sql
security definer
set search_path = public
stable
as $$
  with window_data as (
    select
      source_name,
      source_type,
      series_slug,
      attempted_at,
      succeeded,
      observation_date,
      error_text
    from public.source_health_log
    where attempted_at >= now() - (p_since_hours || ' hours')::interval
  ),
  aggregated as (
    select
      source_name,
      source_type,
      series_slug,
      max(attempted_at)                                                    as last_attempted_at,
      max(attempted_at) filter (where succeeded)                           as last_succeeded_at,
      max(observation_date) filter (where succeeded)                       as last_observation_date,
      (array_agg(error_text order by attempted_at desc) filter (where not succeeded))[1] as last_error,
      count(*) filter (where not succeeded)                                as total_failures,
      count(*)                                                              as total_attempts,
      round(100.0 * count(*) filter (where succeeded) / nullif(count(*), 0))::int as success_rate_pct
    from window_data
    group by source_name, source_type, series_slug
  ),
  -- Consecutive failures: count from the most recent attempt going backward
  -- until we hit a success. Implemented as a subquery per group.
  consec as (
    select
      a.source_name,
      a.series_slug,
      (
        select count(*)
        from window_data w
        where w.source_name = a.source_name
          and w.series_slug = a.series_slug
          and w.attempted_at > coalesce(a.last_succeeded_at, '1970-01-01'::timestamptz)
          and not w.succeeded
      ) as consecutive_failures
    from aggregated a
  )
  select
    a.source_name,
    a.source_type,
    a.series_slug,
    a.last_attempted_at,
    a.last_succeeded_at,
    a.last_observation_date,
    a.last_error,
    c.consecutive_failures::int,
    a.total_attempts::int,
    a.success_rate_pct
  from aggregated a
  join consec c using (source_name, series_slug)
  order by c.consecutive_failures desc, a.source_name, a.series_slug;
$$;

revoke all on function public.get_source_health_summary(int) from public;
grant execute on function public.get_source_health_summary(int) to anon, authenticated;
