-- Migration 0027: Harden sync_event_actual
--
-- Closes the authentication gap where sync_event_actual() (migration 0004)
-- had no internal secret requirement — unlike every other write RPC introduced
-- after migration 0011 (check_internal_secret pattern). Any holder of the
-- anon key could call it directly via Supabase REST and write arbitrary values
-- to any scheduled economic event. This was confirmed during production
-- verification (2026-07-01) when a test script corrupted two live events
-- (cpi-inflation-release and core-inflation-release on 2026-07-01) by calling
-- the RPC without any authentication or period validation at the DB level.
--
-- Root cause:
--   sync_event_actual was created in migration 0004, before the
--   NOTIFICATION_WORKER_SECRET / check_internal_secret pattern was introduced
--   in migration 0011. It was never retrofitted. All five notification worker
--   RPCs (log_source_health, log_sync_trigger, etc.) correctly use the pattern;
--   sync_event_actual was the sole exception.
--
-- This migration:
--   1. Drops the old 3-parameter sync_event_actual(text, date, text).
--   2. Creates a hardened replacement that:
--        a. Requires p_internal_secret — checked via check_internal_secret()
--           (same as log_source_health, log_sync_trigger, claim_notification_job_work).
--        b. Accepts optional p_observation_date with a lightweight sanity check:
--           rejects dates >180 days in the past or >7 days in the future.
--           This is defense-in-depth; full period validation remains in
--           application code (validateObservationPeriod in
--           observationPeriodValidator.ts). The sanity check catches clearly
--           garbage dates — a 2020 observation or a 2027 observation would
--           indicate a bug or injection attempt, not a legitimate sync.
--   3. Adds reset_event_to_scheduled — a secret-gated operational recovery RPC
--      for resetting a released event back to scheduled when a sync wrote wrong
--      data. This replaces the unsafe pattern of running manual SQL in the
--      Supabase dashboard; it requires the same internal secret and only
--      operates on currently 'released' rows (cannot accidentally reset a
--      genuinely-scheduled event).
--   4. Seeds a permanent _verify_test_sync test series with two test events on
--      1970-01-01 and 1970-01-02 — dates that will never conflict with real
--      calendar events. Verification scripts MUST use these fixtures for all
--      write tests and MUST NEVER call sync_event_actual on real event slugs.
--
-- Callers updated: syncFromSbpEasyData.ts (2 call sites), lsmSync.ts (1 call
-- site). All pass p_internal_secret from NOTIFICATION_WORKER_SECRET env var.
--
-- Run this manually in the Supabase SQL editor (no migration framework).
-- Idempotent: DROP IF EXISTS + CREATE OR REPLACE + ON CONFLICT DO NOTHING.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Drop old unauthenticated sync_event_actual
-- ─────────────────────────────────────────────────────────────────────────────

drop function if exists public.sync_event_actual(text, date, text);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Hardened sync_event_actual
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.sync_event_actual(
  p_internal_secret  text,
  p_series_slug      text,
  p_event_date       date,
  p_actual_value     text,
  p_observation_date text default null   -- "YYYY-MM-DD"; optional sanity check
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated_count int;
begin
  -- Authentication: same NOTIFICATION_WORKER_SECRET pattern as every other
  -- write RPC added after migration 0011.
  if not public.check_internal_secret('notification_worker', p_internal_secret) then
    raise exception 'unauthorized';
  end if;

  -- Observation date sanity check (when provided).
  -- Full period validation — whether this observation belongs to the right
  -- release window for this specific event — lives in application code
  -- (validateObservationPeriod in observationPeriodValidator.ts) because the
  -- lag-months config per series lives in TypeScript, not in the DB.
  -- This check only catches clearly impossible dates: a six-month-old
  -- observation or a future observation would indicate a bug, not legitimate sync.
  if p_observation_date is not null then
    if p_observation_date::date < (current_date - interval '180 days') then
      raise exception 'observation_date % is too stale (>180 days before today %)',
        p_observation_date, current_date;
    end if;
    if p_observation_date::date > (current_date + interval '7 days') then
      raise exception 'observation_date % is in the future (>7 days after today %)',
        p_observation_date, current_date;
    end if;
  end if;

  update public.economic_events
  set actual_value    = p_actual_value,
      status          = 'released',
      data_confidence = 'confirmed',
      updated_at      = now()
  where series_id = (
      select id from public.economic_event_series where slug = p_series_slug
    )
    and event_date = p_event_date
    and status     = 'scheduled';

  get diagnostics v_updated_count = row_count;
  return v_updated_count > 0;
end;
$$;

revoke all on function public.sync_event_actual(text, text, date, text, text) from public;
grant execute on function public.sync_event_actual(text, text, date, text, text) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. reset_event_to_scheduled — operational recovery
-- ─────────────────────────────────────────────────────────────────────────────
-- Used when a sync writes wrong data and the event must be retried cleanly,
-- or when a test run accidentally marks a real event as released. Requires the
-- same internal secret as sync_event_actual. Only operates on rows currently
-- in 'released' state — it cannot reset a genuinely-scheduled event.

create or replace function public.reset_event_to_scheduled(
  p_internal_secret text,
  p_series_slug     text,
  p_event_date      date
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated_count int;
begin
  if not public.check_internal_secret('notification_worker', p_internal_secret) then
    raise exception 'unauthorized';
  end if;

  update public.economic_events
  set actual_value    = null,
      status          = 'scheduled',
      data_confidence = 'estimated',
      updated_at      = now()
  where series_id = (
      select id from public.economic_event_series where slug = p_series_slug
    )
    and event_date = p_event_date
    and status     = 'released';

  get diagnostics v_updated_count = row_count;
  return v_updated_count > 0;
end;
$$;

revoke all on function public.reset_event_to_scheduled(text, text, date) from public;
grant execute on function public.reset_event_to_scheduled(text, text, date) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Permanent test fixtures for verification scripts
-- ─────────────────────────────────────────────────────────────────────────────
-- The _verify_test_sync series is not in SYNC_TARGETS and is never touched by
-- the production sync pipeline. The leading underscore makes it structurally
-- distinct from all real series slugs (which are kebab-case without underscores).
-- Event dates 1970-01-01 and 1970-01-02 will never conflict with real calendar
-- events. Verification scripts use Event A for primary write tests, Event B for
-- idempotency tests. Both events must be reset to 'scheduled' via
-- reset_event_to_scheduled between runs.

insert into public.economic_event_series (
  slug, title, category, default_importance, cadence,
  source_name, automation_tier, reliability_score, description
) values (
  '_verify_test_sync',
  '[TEST ONLY] Sync Verification Fixture',
  'Real Economy',
  'Low',
  'irregular',
  'Internal',
  'manual',
  1,
  'Permanent fixture for sync verification scripts. Not a real economic series. '
  'Production sync pipeline never targets this series. Test events on '
  '1970-01-01 (Event A) and 1970-01-02 (Event B). Reset to scheduled between runs '
  'using reset_event_to_scheduled.'
) on conflict (slug) do nothing;

insert into public.economic_events (
  series_id, slug, title, event_date, status, importance, data_confidence
)
select
  s.id,
  '_verify-test-sync-event-a',
  '[TEST ONLY] Sync Verification Event A',
  '1970-01-01'::date,
  'scheduled',
  'Low',
  'estimated'
from public.economic_event_series s
where s.slug = '_verify_test_sync'
on conflict (slug) do nothing;

insert into public.economic_events (
  series_id, slug, title, event_date, status, importance, data_confidence
)
select
  s.id,
  '_verify-test-sync-event-b',
  '[TEST ONLY] Sync Verification Event B',
  '1970-01-02'::date,
  'scheduled',
  'Low',
  'estimated'
from public.economic_event_series s
where s.slug = '_verify_test_sync'
on conflict (slug) do nothing;
