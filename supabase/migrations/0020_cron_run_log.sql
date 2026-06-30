-- Cron History (Final Production Hardening, Part 5). The System Health
-- page previously could only show *configured* schedules — no run history
-- was persisted anywhere, so "last successful run"/"last failure" for any
-- cron job had to be either omitted or fabricated. This is the lightweight
-- logging mechanism: one row per invocation, written by every cron route
-- via the shared logCronRun() helper (src/lib/cronLogging.ts).
--
-- Deliberately a flat append-only log, not a richer job-scheduling system
-- — that would be unnecessary complexity for what's only ever read by one
-- internal diagnostics page. A simple retention trim (keep the most
-- recent N rows per job) happens at write time rather than via a separate
-- cleanup cron, so this table can't grow unbounded.

create table if not exists public.cron_run_log (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  started_at timestamptz not null,
  finished_at timestamptz not null,
  duration_ms int not null,
  status text not null check (status in ('success', 'failure', 'skipped')),
  detail text,
  created_at timestamptz not null default now()
);
create index if not exists cron_run_log_job_started_idx on public.cron_run_log (job_name, started_at desc);

alter table public.cron_run_log enable row level security;
-- No policies — read/write only via the two SECURITY DEFINER functions
-- below, consistent with every other table in this project.

create or replace function public.log_cron_run(
  p_internal_secret text,
  p_job_name text,
  p_started_at timestamptz,
  p_finished_at timestamptz,
  p_status text,
  p_detail text default null
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

  insert into public.cron_run_log (job_name, started_at, finished_at, duration_ms, status, detail)
  values (p_job_name, p_started_at, p_finished_at, greatest(0, (extract(epoch from (p_finished_at - p_started_at)) * 1000)::int), p_status, p_detail);

  -- Retention trim, same call: keep only the most recent 50 rows per job —
  -- cheap, avoids needing a separate cleanup cron for a table that's
  -- write-heavy (every cron run) but only ever read for recent history.
  delete from public.cron_run_log
  where job_name = p_job_name
    and id not in (
      select id from public.cron_run_log where job_name = p_job_name order by started_at desc limit 50
    );
end;
$$;

revoke all on function public.log_cron_run(text, text, timestamptz, timestamptz, text, text) from public;
grant execute on function public.log_cron_run(text, text, timestamptz, timestamptz, text, text) to anon, authenticated;

-- Publicly readable for the same reason 0017/0018's read RPCs are — this
-- is operational metadata, not sensitive data, and an RPC (not a SELECT
-- policy) only to stay consistent with this project's RLS convention.
-- Still only ever displayed on the gated /admin/system-health page.
create or replace function public.get_cron_run_history(p_job_name text default null, p_limit int default 20)
returns setof public.cron_run_log
language sql
security definer
set search_path = public
stable
as $$
  select * from public.cron_run_log
  where p_job_name is null or job_name = p_job_name
  order by started_at desc
  limit p_limit;
$$;

revoke all on function public.get_cron_run_history(text, int) from public;
grant execute on function public.get_cron_run_history(text, int) to anon, authenticated;
