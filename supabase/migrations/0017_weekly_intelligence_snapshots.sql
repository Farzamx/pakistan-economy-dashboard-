-- Weekly Intelligence Engine (Production Reliability & Institutional
-- Upgrade, Part 2). Health Score / Recession Probability / Sovereign
-- Default Probability previously recomputed on every page load (the
-- deterministic math) or every 6h (the AI narration) — this table is the
-- durable store that lets them instead update once a week, every Monday,
-- via a new cron route (/api/cron/weekly-intelligence) that computes once
-- and writes here; the homepage then just reads the latest row instead of
-- recomputing anything.
--
-- One row per weekly run (history kept, not overwritten) — useful for the
-- internal System Health page (Part 11) to show past runs, and as a
-- genuine audit trail for a number that's now publicly described as
-- "updated weekly" rather than "live".
--
-- Reuses the existing internal_secrets/check_internal_secret() pattern
-- from 0011_secure_worker_rpcs.sql under the SAME 'notification_worker'
-- key — this is just another trusted, server-side-only cron, the same
-- threat model as the jobs already gated by that secret, so no new secret
-- needs provisioning.

create table if not exists public.weekly_intelligence_snapshots (
  id uuid primary key default gen_random_uuid(),
  computed_at timestamptz not null default now(),
  health_score int not null,
  health_label text not null,
  health_factors jsonb not null,
  recession_probability int not null,
  recession_category text not null,
  recession_model_score int not null,
  recession_factors jsonb not null,
  default_probability int not null,
  default_category text not null,
  default_model_score int not null,
  default_factors jsonb not null,
  ai_sentiment text not null,
  ai_summary text not null,
  ai_top_drivers jsonb not null,
  ai_recession_explanation jsonb not null,
  ai_default_explanation jsonb not null,
  ai_model_used text not null,
  ai_model_display_name text not null
);
create index if not exists weekly_intelligence_snapshots_computed_at_idx
  on public.weekly_intelligence_snapshots (computed_at desc);

alter table public.weekly_intelligence_snapshots enable row level security;
-- No policies — read/write only via the two SECURITY DEFINER functions
-- below, consistent with every other table in this project.

create or replace function public.store_weekly_intelligence_snapshot(p_internal_secret text, p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.check_internal_secret('notification_worker', p_internal_secret) then
    raise exception 'unauthorized';
  end if;

  insert into public.weekly_intelligence_snapshots (
    health_score, health_label, health_factors,
    recession_probability, recession_category, recession_model_score, recession_factors,
    default_probability, default_category, default_model_score, default_factors,
    ai_sentiment, ai_summary, ai_top_drivers,
    ai_recession_explanation, ai_default_explanation,
    ai_model_used, ai_model_display_name
  ) values (
    (p_payload->>'healthScore')::int, p_payload->>'healthLabel', p_payload->'healthFactors',
    (p_payload->>'recessionProbability')::int, p_payload->>'recessionCategory', (p_payload->>'recessionModelScore')::int, p_payload->'recessionFactors',
    (p_payload->>'defaultProbability')::int, p_payload->>'defaultCategory', (p_payload->>'defaultModelScore')::int, p_payload->'defaultFactors',
    p_payload->>'aiSentiment', p_payload->>'aiSummary', p_payload->'aiTopDrivers',
    p_payload->'aiRecessionExplanation', p_payload->'aiDefaultExplanation',
    p_payload->>'aiModelUsed', p_payload->>'aiModelDisplayName'
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.store_weekly_intelligence_snapshot(text, jsonb) from public;
grant execute on function public.store_weekly_intelligence_snapshot(text, jsonb) to anon, authenticated;

-- Publicly readable by design — this is exactly the data the homepage
-- already displays to every visitor; an RPC (not a SELECT policy) only to
-- stay consistent with this project's "every table is RLS-locked, all
-- access goes through a narrow function" convention.
create or replace function public.get_latest_weekly_intelligence_snapshot()
returns public.weekly_intelligence_snapshots
language sql
security definer
set search_path = public
stable
as $$
  select * from public.weekly_intelligence_snapshots order by computed_at desc limit 1;
$$;

revoke all on function public.get_latest_weekly_intelligence_snapshot() from public;
grant execute on function public.get_latest_weekly_intelligence_snapshot() to anon, authenticated;
