-- Migration 0026: Scheduler-Agnostic Sync Trigger Log + Source Benchmarking
-- (Phase 4: Scheduler Independence & Continuous Source Intelligence)
--
-- Three capabilities added here:
--
--   1. sync_trigger_log — one row per HTTP invocation of the sync endpoint,
--      recording who triggered it (Vercel, GitHub Actions, Railway, etc.),
--      how long it took, and a summary of which jobs ran. This decouples
--      "what scheduler called us" from "what the sync pipeline did" — the
--      pipeline (syncPipeline.ts) has no scheduler knowledge; the route
--      adapter writes this record after the pipeline returns.
--
--   2. get_source_benchmark_stats() — computes rolling latency percentiles
--      (avg / median / p95), success rates, fallback rates, and observation
--      freshness from the source_health_log written by Phase 3. This is the
--      quantitative foundation for Parts 4-6 (benchmarking + ranking).
--      Runs live over the existing table — no separate materialized table
--      needed given the 100-row-per-source retention trim in 0025.
--
--   3. get_publication_lead_stats() — answers "which source had the data
--      first?" for every (series, observation_period) pair. Computes lead
--      time as hours-before-the-slowest-source by ranking sources by when
--      they first returned a specific observation_date. No join with
--      economic_events required; purely from source_health_log.
--
-- Security: same pattern as 0020/0025 — write via SECURITY DEFINER RPCs
-- authenticated by check_internal_secret, read RPCs open to anon.
-- Retention: 200 rows for sync_trigger_log (infrequent writes; once/day = 200 days).

-- ══════════════════════════════════════════════════════════════════════════════
-- 1.  sync_trigger_log
-- ══════════════════════════════════════════════════════════════════════════════

create table if not exists public.sync_trigger_log (
  id                uuid primary key default gen_random_uuid(),
  triggered_at      timestamptz not null,
  finished_at       timestamptz not null,
  total_duration_ms int not null,
  scheduler_name    text not null,   -- "vercel" | "github-actions" | "railway" | "render" | "easycron" | "cron-job.org" | "gitlab" | "external" | "unknown"
  trigger_type      text not null,   -- "scheduled" | "manual" | "unknown"
  scheduler_version text,            -- x-vercel-deployment-id, github run_id, etc.
  request_id        text,            -- x-request-id header if present
  auth_method       text not null,   -- "bearer-cron-secret"
  jobs_summary      jsonb not null,  -- [{job_name, status, duration_ms, detail?}]
  total_synced      int not null default 0,  -- count of SyncResult.status="synced" this run
  total_failed      int not null default 0,  -- count of SyncResult.status="error"
  created_at        timestamptz not null default now()
);

create index if not exists sync_trigger_triggered_idx
  on public.sync_trigger_log (triggered_at desc);

create index if not exists sync_trigger_scheduler_idx
  on public.sync_trigger_log (scheduler_name, triggered_at desc);

alter table public.sync_trigger_log enable row level security;

-- ── Write RPC ────────────────────────────────────────────────────────────────

create or replace function public.log_sync_trigger(
  p_internal_secret  text,
  p_triggered_at     timestamptz,
  p_finished_at      timestamptz,
  p_scheduler_name   text,
  p_trigger_type     text,
  p_scheduler_version text  default null,
  p_request_id       text   default null,
  p_auth_method      text   default 'bearer-cron-secret',
  p_jobs_summary     jsonb  default '[]'::jsonb,
  p_total_synced     int    default 0,
  p_total_failed     int    default 0
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

  insert into public.sync_trigger_log (
    triggered_at, finished_at, total_duration_ms,
    scheduler_name, trigger_type, scheduler_version, request_id, auth_method,
    jobs_summary, total_synced, total_failed
  ) values (
    p_triggered_at, p_finished_at,
    greatest(0, (extract(epoch from (p_finished_at - p_triggered_at)) * 1000)::int),
    p_scheduler_name, p_trigger_type, p_scheduler_version, p_request_id, p_auth_method,
    p_jobs_summary, p_total_synced, p_total_failed
  );

  -- Retention trim: keep the 200 most recent rows.
  delete from public.sync_trigger_log
  where id not in (
    select id from public.sync_trigger_log order by triggered_at desc limit 200
  );
end;
$$;

revoke all on function public.log_sync_trigger(text, timestamptz, timestamptz, text, text, text, text, text, jsonb, int, int) from public;
grant execute on function public.log_sync_trigger(text, timestamptz, timestamptz, text, text, text, text, text, jsonb, int, int) to anon, authenticated;

-- ── Read RPC ─────────────────────────────────────────────────────────────────

create or replace function public.get_sync_trigger_history(p_limit int default 30)
returns setof public.sync_trigger_log
language sql
security definer
set search_path = public
stable
as $$
  select * from public.sync_trigger_log
  order by triggered_at desc
  limit p_limit;
$$;

revoke all on function public.get_sync_trigger_history(int) from public;
grant execute on function public.get_sync_trigger_history(int) to anon, authenticated;

-- ══════════════════════════════════════════════════════════════════════════════
-- 2.  get_source_benchmark_stats
--     Rolling percentile benchmarks from source_health_log (0025).
--     Computes avg / median / p95 latency, success/failure/fallback counts,
--     and average observation freshness (how old was the data when fetched?).
-- ══════════════════════════════════════════════════════════════════════════════

create or replace function public.get_source_benchmark_stats(
  p_since_hours int default 720  -- default: last 30 days
)
returns table (
  source_name        text,
  source_type        text,
  series_slug        text,
  total_attempts     bigint,
  total_succeeded    bigint,
  total_failed       bigint,
  total_fallbacks    bigint,
  success_rate_pct   int,
  avg_latency_ms     numeric,
  median_latency_ms  numeric,
  p95_latency_ms     numeric,
  consecutive_failures int,
  last_succeeded_at  timestamptz,
  last_observation_date text,
  avg_freshness_days numeric   -- avg(attempted_at::date - observation_date::date) for succeeded non-fallback rows
)
language sql
security definer
set search_path = public
stable
as $$
  with window_data as (
    select
      source_name, source_type, series_slug,
      attempted_at, succeeded, is_fallback,
      latency_ms, observation_date
    from public.source_health_log
    where attempted_at >= now() - (p_since_hours || ' hours')::interval
  ),
  stats as (
    select
      source_name, source_type, series_slug,
      count(*)                                            as total_attempts,
      count(*) filter (where succeeded)                   as total_succeeded,
      count(*) filter (where not succeeded)               as total_failed,
      count(*) filter (where is_fallback)                 as total_fallbacks,
      round(100.0 * count(*) filter (where succeeded) / nullif(count(*), 0))::int
                                                          as success_rate_pct,
      round(avg(latency_ms) filter (where latency_ms is not null), 1)
                                                          as avg_latency_ms,
      percentile_cont(0.5) within group (order by latency_ms)
        filter (where latency_ms is not null)             as median_latency_ms,
      percentile_cont(0.95) within group (order by latency_ms)
        filter (where latency_ms is not null)             as p95_latency_ms,
      max(attempted_at) filter (where succeeded)          as last_succeeded_at,
      max(observation_date) filter (where succeeded)      as last_observation_date,
      round(
        avg(
          attempted_at::date - observation_date::date
        ) filter (where succeeded and not is_fallback and observation_date is not null),
        1
      )                                                   as avg_freshness_days
    from window_data
    group by source_name, source_type, series_slug
  ),
  -- Consecutive failures: same logic as in get_source_health_summary (0025)
  consec as (
    select
      s.source_name, s.series_slug,
      (
        select count(*) from window_data w
        where w.source_name = s.source_name
          and w.series_slug = s.series_slug
          and w.attempted_at > coalesce(s.last_succeeded_at, '1970-01-01'::timestamptz)
          and not w.succeeded
      )::int as consecutive_failures
    from stats s
  )
  select
    s.source_name, s.source_type, s.series_slug,
    s.total_attempts, s.total_succeeded, s.total_failed, s.total_fallbacks,
    s.success_rate_pct,
    s.avg_latency_ms, s.median_latency_ms, s.p95_latency_ms,
    c.consecutive_failures,
    s.last_succeeded_at, s.last_observation_date,
    s.avg_freshness_days
  from stats s
  join consec c using (source_name, series_slug)
  order by s.series_slug, s.source_name;
$$;

revoke all on function public.get_source_benchmark_stats(int) from public;
grant execute on function public.get_source_benchmark_stats(int) to anon, authenticated;

-- ══════════════════════════════════════════════════════════════════════════════
-- 3.  get_publication_lead_stats
--     Answers "which source published a given data period first, and by
--     how many hours?" For each (series_slug, observation_date), this
--     ranks data sources by when they first successfully returned that
--     observation period's data. Lead is measured relative to the slowest
--     source that also saw that period — so the slowest source always has
--     lead_hours_vs_slowest = 0, and faster sources have positive values.
--
--     This function does NOT join with economic_events. The ranking is
--     purely source-vs-source: it answers "PBS had June CPI data 2.3 days
--     before SBP EasyData did." That is the publication lead metric.
-- ══════════════════════════════════════════════════════════════════════════════

create or replace function public.get_publication_lead_stats(
  p_since_days int default 90
)
returns table (
  series_slug             text,
  observation_date        text,
  source_name             text,
  source_type             text,
  first_seen_at           timestamptz,
  pub_rank                int,          -- 1 = fastest source for this period
  lead_hours_vs_slowest   numeric       -- hours ahead of the slowest source (0 for slowest)
)
language sql
security definer
set search_path = public
stable
as $$
  with first_seen as (
    -- For each (series, source, observation_period): earliest successful non-fallback fetch
    select
      series_slug,
      source_name,
      source_type,
      observation_date,
      min(attempted_at) as first_seen_at
    from public.source_health_log
    where succeeded
      and not is_fallback
      and observation_date is not null
      and attempted_at >= now() - (p_since_days || ' days')::interval
    group by series_slug, source_name, source_type, observation_date
  ),
  ranked as (
    select
      series_slug, source_name, source_type, observation_date, first_seen_at,
      rank() over (
        partition by series_slug, observation_date
        order by first_seen_at
      )::int as pub_rank,
      max(first_seen_at) over (
        partition by series_slug, observation_date
      ) as slowest_first_seen_at
    from first_seen
  )
  select
    series_slug,
    observation_date,
    source_name,
    source_type,
    first_seen_at,
    pub_rank,
    round(
      extract(epoch from (slowest_first_seen_at - first_seen_at)) / 3600.0,
      2
    ) as lead_hours_vs_slowest
  from ranked
  -- Only return rows where multiple sources saw the same period
  -- (a period seen by only one source has no meaningful lead comparison).
  -- Use a having-equivalent: filter on pub_rank > 1 existing for this window.
  where (series_slug, observation_date) in (
    select series_slug, observation_date from first_seen
    group by series_slug, observation_date having count(distinct source_name) > 1
  )
  order by series_slug, observation_date desc, pub_rank;
$$;

revoke all on function public.get_publication_lead_stats(int) from public;
grant execute on function public.get_publication_lead_stats(int) to anon, authenticated;
