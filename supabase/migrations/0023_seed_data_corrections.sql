-- Migration 0023: Seed data corrections + Phase 2 gap-detection RPC
-- Production Data Synchronization — Final Hardening, 2026-07-01
--
-- PART A: SEED VALUE CORRECTIONS (two confirmed wrong historical values)
--   Two events in migration 0003 carried values that do not match any
--   official publication for their respective observation periods.
--   Both are corrected here with full source attribution.
--
--   1. cpi-2026-05-10 (April 2026 CPI, released May 10)
--      Seed actual='6.8% YoY'. Official PBS April 2026 CPI = 10.9% YoY.
--      Source: Pakistan Bureau of Statistics, April 2026 CPI Monthly Report.
--      The value 6.8% has no matching official publication — it appears to be
--      a misaligned estimate (possibly the March figure written to May's slot).
--
--   2. current-account-2026-05-15 (March 2026 CA, released May 15 under lagMonths=2)
--      Seed actual='-$0.5B', title='Current Account Balance (April 2026)'.
--      Official SBP BPM6: March 2026 CA = surplus of +$1.07B.
--      Source: State Bank of Pakistan BPM6 Summary Balance of Payments.
--      The title also incorrectly references April (either release-month with
--      wrong lag, or data-month with wrong observation). Under lagMonths=2
--      (the authoritative config in seriesPublicationConfig.ts), May 15
--      releases March 2026 data. Corrected to March 2026 in title and value.
--
-- PART B: CASCADING previous_value CORRECTIONS
--   Migration 0022 inserted current-account-2026-06-15 with previous_value='-$0.5B'
--   (the then-current seed value for May 15). After correcting May 15 to '+$1.07B',
--   the June 15 previous_value must cascade. Also corrects future-event titles
--   for BoP series to use the data-month convention (obs month, not release month)
--   consistent with the rolling calendar's event_title_template convention.
--
-- PART C: FUTURE BOPN EVENT TITLE CORRECTIONS
--   Seed scheduled events for current-account and worker-remittances in July/August
--   incorrectly titled those events with the release month, not the observation month.
--   Rolling-calendar auto-generated events use data-month titles (see migration 0013
--   event_title_template). These corrections make seed titles consistent.
--
-- PART D: create_missing_scheduled_event() RPC
--   New SECURITY DEFINER function called by the Phase 2 gap detector
--   (src/lib/economicCalendar/automation/detectCalendarGaps.ts) during the
--   daily cron run. Creates a scheduled/estimated event when a gap is detected
--   (expected release date passed with no corresponding DB event), enabling the
--   SBP actual-value sync to fill it in the same cron pass. Authenticated via
--   the same check_internal_secret() pattern used by all other worker RPCs.
--
-- IDEMPOTENCY: all updates are conditional (WHERE actual_value = 'old value'
--   or WHERE previous_value = 'old value'). Safe to re-run.

-- ═══════════════════════════════════════════════════════════════════════════
-- PART A-1: CPI May 10 — 6.8% → 10.9%
-- ═══════════════════════════════════════════════════════════════════════════
-- Event: May 10, 2026 (release of April 2026 CPI, lagMonths=1)
-- Observation period: April 2026 (obsDate 2026-04-30)
-- Correct value: 10.9% YoY
-- Source: Pakistan Bureau of Statistics, April 2026 CPI Monthly Inflation Report.
-- Cross-confirmed: Business Recorder, Dawn citing PBS; noted as highest print
--   in several months ahead of the April 27 MPC surprise hike.
-- Previous value (7.1% YoY = March 2026 CPI from cpi-2026-04-10) remains correct.

update public.economic_events
set
  actual_value  = '10.9% YoY',
  description   =
    'Monthly Consumer Price Index, national, Year-on-Year. '
    'Source: Pakistan Bureau of Statistics, April 2026 CPI Monthly Inflation Report '
    '(pbs.gov.pk, verified 2026-07-01). '
    'Observation period: April 2026 (obsDate 2026-04-30). '
    'Correction (migration 0023): original seed value 6.8% did not match any official '
    'publication for April 2026; official PBS figure is 10.9% YoY.',
  updated_at    = now()
where slug        = 'cpi-2026-05-10'
  and actual_value = '6.8% YoY';

-- ═══════════════════════════════════════════════════════════════════════════
-- PART A-2: Current Account May 15 — -$0.5B → +$1.07B (surplus)
-- ═══════════════════════════════════════════════════════════════════════════
-- Event: May 15, 2026 (release of March 2026 CA under lagMonths=2)
-- Observation period: March 2026 (obsDate 2026-03-31)
-- Correct value: +$1.07B (surplus of approximately $1.07 billion)
-- Source: State Bank of Pakistan, BPM6 Summary Balance of Payments — March 2026.
-- Cross-confirmed: Arab News PK — "Pakistan posts $459 million current account
--   surplus as FY26 balance turns positive" (table shows March = +$1.07B).
-- Title corrected from "(April 2026)" to "(March 2026)":
--   Under lagMonths=2, May 15 releases March data. The seed's "(April 2026)"
--   title is inconsistent with this lag and has no correct interpretation
--   (April data with lagMonths=1 would be -$0.28B, not -$0.5B either).

update public.economic_events
set
  actual_value = '+$1.07B',
  title        = 'Current Account Balance — March 2026',
  description  =
    'Monthly current account balance, BPM6 methodology. '
    'Source: State Bank of Pakistan BPM6 Summary Balance of Payments, March 2026 '
    '(sbp.org.pk, verified 2026-07-01). '
    'Observation period: March 2026 (obsDate 2026-03-31). '
    'Correction (migration 0023): original seed value -$0.5B did not match the '
    'official SBP BPM6 figure (+$1.07B surplus). Title corrected from '
    '"April 2026" to "March 2026" to reflect lagMonths=2 observation convention.',
  updated_at   = now()
where slug        = 'current-account-2026-05-15'
  and actual_value = '-$0.5B';

-- ═══════════════════════════════════════════════════════════════════════════
-- PART B: Cascade previous_value corrections
-- ═══════════════════════════════════════════════════════════════════════════

-- current-account-2026-06-15 previous_value: '-$0.5B' → '+$1.07B'
-- Migration 0022 inserted this event using the then-current seed value of
-- -$0.5B as the previous_value. Now that May 15 is corrected to +$1.07B, the
-- chain must cascade. Status is 'released' (migration 0022 inserted it as
-- released with actual='$-0.28B'), so only previous_value is updated.
update public.economic_events
set   previous_value = '+$1.07B', updated_at = now()
where slug           = 'current-account-2026-06-15'
  and previous_value = '-$0.5B';

-- ═══════════════════════════════════════════════════════════════════════════
-- PART C: Future BoP event title corrections (data-month convention)
-- ═══════════════════════════════════════════════════════════════════════════
-- Rolling calendar convention (migration 0013 event_title_template): titles
-- use the OBSERVATION month, not the release month. Example: a July 15 event
-- with lagMonths=2 covers May 2026 data → title "(May 2026)".
-- The seed used release-month for some events and observation-month for others,
-- creating inconsistency. Standardize all scheduled BoP events to obs-month.

-- July 15 CA: release month=July, lag=2, obs month=May 2026
update public.economic_events
set   title      = 'Current Account Balance (May 2026)', updated_at = now()
where slug       = 'current-account-2026-07-15'
  and status     = 'scheduled'
  and title like '%June 2026%';

-- July 18 Remittances: release month=July, lag=2, obs month=May 2026
update public.economic_events
set   title      = 'Worker Remittances (May 2026)', updated_at = now()
where slug       = 'remittances-2026-07-18'
  and status     = 'scheduled'
  and title like '%June 2026%';

-- August 14 CA: release month=August, lag=2, obs month=June 2026
update public.economic_events
set   title      = 'Current Account Balance (June 2026)', updated_at = now()
where slug       = 'current-account-2026-08-14'
  and status     = 'scheduled'
  and title like '%July 2026%';

-- ═══════════════════════════════════════════════════════════════════════════
-- PART D: create_missing_scheduled_event() — Phase 2 gap detection RPC
-- ═══════════════════════════════════════════════════════════════════════════
-- Called by detectCalendarGaps.ts during the daily cron run.
-- Inserts a new scheduled/estimated event only when no event already exists
-- within ±p_window_days of p_event_date for the given series.
-- Returns JSONB: { created: bool, reason?: string, slug?: string }
-- Authenticated via check_internal_secret('notification_worker', p_internal_secret),
-- the same pattern used by all other SECURITY DEFINER worker RPCs.
--
-- Security properties:
--   - Requires NOTIFICATION_WORKER_SECRET — not callable via anon key alone
--   - Writes only to economic_events — no other table is touched
--   - ON CONFLICT (slug) DO NOTHING — safe even if called twice for the same gap
--   - Window check prevents duplicate events for the same series/period

create or replace function public.create_missing_scheduled_event(
  p_internal_secret  text,
  p_series_slug      text,
  p_event_date       date,
  p_event_slug       text,
  p_event_time       time,
  p_title            text,
  p_importance       text        default 'Medium',
  p_previous_value   text        default null,
  p_description      text        default null,
  p_reference_period date        default null,
  p_window_days      int         default 7
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_series_id      uuid;
  v_existing_count int;
  v_existing_slug  text;
  v_inserted       int;
begin
  if not public.check_internal_secret('notification_worker', p_internal_secret) then
    raise exception 'unauthorized';
  end if;

  select id into v_series_id
    from public.economic_event_series
    where slug = p_series_slug;

  if v_series_id is null then
    return jsonb_build_object(
      'created', false,
      'reason', 'series_not_found',
      'series_slug', p_series_slug
    );
  end if;

  -- Check for any existing event within the tolerance window.
  -- "Exists" means either the exact slug or any row for this series
  -- within ±p_window_days — prevents gap-filling from creating a second
  -- event when the expected date shifted slightly (e.g. seed event on
  -- the 10th vs. rolling-calendar event on the 7th for the same month).
  select count(*), min(slug) into v_existing_count, v_existing_slug
    from public.economic_events
    where series_id  = v_series_id
      and event_date between (p_event_date - p_window_days) and (p_event_date + p_window_days);

  if v_existing_count > 0 then
    return jsonb_build_object(
      'created', false,
      'reason', 'event_exists_in_window',
      'existing_slug', v_existing_slug,
      'window_days', p_window_days
    );
  end if;

  insert into public.economic_events (
    series_id, slug, title, event_date, event_time,
    previous_value, forecast_value, actual_value,
    status, importance, data_confidence, description, reference_period
  ) values (
    v_series_id, p_event_slug, p_title, p_event_date, p_event_time,
    p_previous_value, null, null,
    'scheduled', p_importance, 'estimated',
    coalesce(p_description, 'Auto-created by gap detector — missing event recovered by cron.'),
    p_reference_period
  )
  on conflict (slug) do nothing;

  get diagnostics v_inserted = row_count;

  return jsonb_build_object(
    'created', v_inserted > 0,
    'slug', p_event_slug,
    'event_date', p_event_date
  );
end;
$$;

revoke all on function public.create_missing_scheduled_event(text, text, date, text, time, text, text, text, text, date, int) from public;
grant execute on function public.create_missing_scheduled_event(text, text, date, text, time, text, text, text, text, date, int) to anon, authenticated;
