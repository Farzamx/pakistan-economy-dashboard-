-- Weekly Intelligence Engine idempotency (Final Production Hardening,
-- Part 1). The cron route previously had no guard against running twice in
-- the same week — Vercel Cron's documented at-least-once delivery, a
-- manual re-trigger during an incident, or a slow first attempt racing a
-- retry could all have produced two snapshot rows for the same week. The
-- route-level check (computeWeeklyIntelligence skipped if a recent
-- snapshot already exists) is cheap insurance but has a race window
-- between two near-simultaneous invocations; this constraint is the hard
-- guarantee, enforced atomically by Postgres regardless of the app layer.
--
-- NOT a generated column: date_trunc('week', timestamptz) first converts
-- to the session's local timezone before truncating, which makes it
-- STABLE (depends on a session setting), not IMMUTABLE — Postgres rejects
-- a generated-column expression built from a STABLE function (error
-- 42P17: "generation expression is not immutable", confirmed live).
-- Fixed by making week_start a plain column, computed explicitly at
-- insert time inside the function body (where STABLE functions are
-- fine), anchored to UTC explicitly so the result never depends on
-- whatever timezone the calling session happens to be in.

alter table public.weekly_intelligence_snapshots
  add column if not exists week_start date;

-- Backfill any pre-existing rows (none expected before this migration,
-- but safe either way) using the same UTC-anchored truncation the insert
-- path below uses, so historical rows stay consistent with new ones.
update public.weekly_intelligence_snapshots
  set week_start = (date_trunc('week', computed_at at time zone 'UTC'))::date
  where week_start is null;

alter table public.weekly_intelligence_snapshots
  alter column week_start set not null;

create unique index if not exists weekly_intelligence_snapshots_week_start_uidx
  on public.weekly_intelligence_snapshots (week_start);

-- Dropped and re-created, not just CREATE OR REPLACE — the return type
-- changes from uuid to jsonb (Postgres doesn't allow CREATE OR REPLACE to
-- change a function's return type). New shape adds the duplicate-week
-- guard: a second attempt within the same ISO week returns a normal,
-- non-error "skipped" result instead of letting the unique-constraint
-- violation surface as a hard failure — a duplicate run is an expected,
-- benign outcome of at-least-once cron delivery, not an operational error.
drop function if exists public.store_weekly_intelligence_snapshot(text, jsonb);

create function public.store_weekly_intelligence_snapshot(p_internal_secret text, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_now timestamptz := now();
begin
  if not public.check_internal_secret('notification_worker', p_internal_secret) then
    raise exception 'unauthorized';
  end if;

  begin
    insert into public.weekly_intelligence_snapshots (
      computed_at, week_start,
      health_score, health_label, health_factors,
      recession_probability, recession_category, recession_model_score, recession_factors,
      default_probability, default_category, default_model_score, default_factors,
      ai_sentiment, ai_summary, ai_top_drivers,
      ai_recession_explanation, ai_default_explanation,
      ai_model_used, ai_model_display_name
    ) values (
      v_now, (date_trunc('week', v_now at time zone 'UTC'))::date,
      (p_payload->>'healthScore')::int, p_payload->>'healthLabel', p_payload->'healthFactors',
      (p_payload->>'recessionProbability')::int, p_payload->>'recessionCategory', (p_payload->>'recessionModelScore')::int, p_payload->'recessionFactors',
      (p_payload->>'defaultProbability')::int, p_payload->>'defaultCategory', (p_payload->>'defaultModelScore')::int, p_payload->'defaultFactors',
      p_payload->>'aiSentiment', p_payload->>'aiSummary', p_payload->'aiTopDrivers',
      p_payload->'aiRecessionExplanation', p_payload->'aiDefaultExplanation',
      p_payload->>'aiModelUsed', p_payload->>'aiModelDisplayName'
    )
    returning id into v_id;
  exception
    when unique_violation then
      return jsonb_build_object('id', null, 'skipped', true, 'reason', 'A snapshot for this ISO week already exists.');
  end;

  return jsonb_build_object('id', v_id, 'skipped', false);
end;
$$;

revoke all on function public.store_weekly_intelligence_snapshot(text, jsonb) from public;
grant execute on function public.store_weekly_intelligence_snapshot(text, jsonb) to anon, authenticated;
