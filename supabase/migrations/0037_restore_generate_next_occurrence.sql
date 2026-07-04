-- Migration 0037: Restore generate_next_occurrence() in sync_event_actual()
--
-- Root cause:
--   Migration 0013 wired generate_next_occurrence() into sync_event_actual()
--   so that releasing an event automatically created the next scheduled row.
--   Migration 0027 re-created sync_event_actual() to add NOTIFICATION_WORKER_SECRET
--   authentication but omitted the generate_next_occurrence() call.
--   Migration 0028 re-created it again to persist observation_date and also
--   omitted the call. Result: every indicator release marks the current event
--   released correctly but never advances the rolling calendar chain.
--
-- Impact per series type:
--   • monthly_lag  — detectCalendarGaps() (Step 2, every cron pass) covers these
--     by looking back lookbackMonths and recreating any missing scheduled rows.
--     They appear broken if inspected in isolation but are self-healing each cron.
--   • official_calendar — T-Bill/PIB/MPC consume from economic_event_official_dates;
--     next event is created from that table, so missing generate_next_occurrence()
--     call means no next event after each release.
--   • weekly (SPI, FX Reserves) — no gap detector, no official_calendar fallback.
--     PERMANENTLY BROKEN until this migration. After the last scheduled weekly
--     event is released, the sync returns skipped-no-due-event on every subsequent
--     cron run. This is why spi-2026-07-09 was never created after spi-2026-07-02.
--
-- This migration:
--   1. Replaces sync_event_actual() with the full behaviour from migrations
--      0027+0028 PLUS the generate_next_occurrence() call from 0013.
--   2. Runs a one-time repair for SPI: if spi-2026-07-02 has already been
--      released between the URL fix deploy (2026-07-04) and this migration,
--      calls generate_next_occurrence() now so spi-2026-07-09 is created
--      immediately. If spi-2026-07-02 is still scheduled, does nothing — the
--      next cron run will release it and the fixed sync_event_actual() will
--      create spi-2026-07-09 automatically.
--   3. Runs a one-time repair for FX Reserves: same pattern — if the last
--      released fx-reserves event has no future scheduled successor, calls
--      generate_next_occurrence() for it.
--
-- Idempotent:
--   CREATE OR REPLACE for the function.
--   generate_next_occurrence() itself uses ON CONFLICT (slug) DO NOTHING, so
--   calling it when the next event already exists is a safe no-op.
--
-- Run manually in the Supabase SQL editor.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Fix sync_event_actual() — add generate_next_occurrence() call
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.sync_event_actual(
  p_internal_secret  text,
  p_series_slug      text,
  p_event_date       date,
  p_actual_value     text,
  p_observation_date text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_series_id  uuid;
  v_event_id   uuid;
  v_updated_count int;
BEGIN
  -- Authentication: same NOTIFICATION_WORKER_SECRET pattern as every write RPC
  -- added after migration 0011. Checked before any DB reads.
  IF NOT public.check_internal_secret('notification_worker', p_internal_secret) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  -- Observation date sanity check (when provided).
  -- Full period validation lives in application code (observationPeriodValidator.ts).
  -- This only rejects clearly impossible dates: >180 days old or >7 days future.
  IF p_observation_date IS NOT NULL THEN
    IF p_observation_date::date < (current_date - INTERVAL '180 days') THEN
      RAISE EXCEPTION 'observation_date % is too stale (>180 days before today %)',
        p_observation_date, current_date;
    END IF;
    IF p_observation_date::date > (current_date + INTERVAL '7 days') THEN
      RAISE EXCEPTION 'observation_date % is in the future (>7 days after today %)',
        p_observation_date, current_date;
    END IF;
  END IF;

  -- Resolve series ID once — used for both the UPDATE and generate_next_occurrence().
  SELECT id INTO v_series_id
  FROM public.economic_event_series
  WHERE slug = p_series_slug;

  -- Release the event and capture its UUID.
  -- RETURNING id is required by generate_next_occurrence(p_series_id, p_released_event_id).
  UPDATE public.economic_events
  SET actual_value     = p_actual_value,
      status           = 'released',
      data_confidence  = 'confirmed',
      -- Persist observation period end date so canonicalObservation.ts can compare
      -- freshness against SBP EasyData's latestDate without computing lag offsets.
      -- COALESCE preserves an existing observation_date if p_observation_date is NULL.
      observation_date = COALESCE(p_observation_date::date, observation_date),
      updated_at       = now()
  WHERE series_id = v_series_id
    AND event_date = p_event_date
    AND status     = 'scheduled'
  RETURNING id INTO v_event_id;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  -- Advance the rolling calendar — originally wired by migration 0013, accidentally
  -- dropped by 0027 (auth hardening) and 0028 (observation_date). Without this call
  -- no next scheduled event is ever created after a release, permanently stalling
  -- weekly series (SPI, FX Reserves) that have no gap-detector fallback.
  IF v_updated_count > 0 THEN
    PERFORM public.generate_next_occurrence(v_series_id, v_event_id);
  END IF;

  RETURN v_updated_count > 0;
END;
$$;

-- Re-grant as in migrations 0027/0028.
REVOKE ALL ON FUNCTION public.sync_event_actual(text, text, date, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.sync_event_actual(text, text, date, text, text) TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. One-time SPI repair: create spi-2026-07-09 if spi-2026-07-02 is
--    already released but has no future scheduled successor.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_series_id  uuid;
  v_event_id   uuid;
  v_next_count int;
  v_result     jsonb;
BEGIN
  SELECT id INTO v_series_id
  FROM public.economic_event_series
  WHERE slug = 'spi-weekly-inflation-release';

  -- Find spi-2026-07-02 only if it's already released.
  SELECT id INTO v_event_id
  FROM public.economic_events
  WHERE series_id = v_series_id
    AND event_date = '2026-07-02'
    AND status = 'released';

  IF v_event_id IS NULL THEN
    RAISE NOTICE '[0037] spi-2026-07-02 is not yet released — no repair needed. Next cron run will release it and create spi-2026-07-09 via the fixed sync_event_actual().';
    RETURN;
  END IF;

  -- Event is released — check whether a future scheduled event already exists.
  SELECT COUNT(*) INTO v_next_count
  FROM public.economic_events
  WHERE series_id = v_series_id
    AND status = 'scheduled'
    AND event_date > '2026-07-02';

  IF v_next_count > 0 THEN
    RAISE NOTICE '[0037] spi-2026-07-02 is released and a future scheduled SPI event already exists — no repair needed.';
    RETURN;
  END IF;

  -- spi-2026-07-02 released but no successor — call generate_next_occurrence() now.
  v_result := public.generate_next_occurrence(v_series_id, v_event_id);
  RAISE NOTICE '[0037] SPI repair: generate_next_occurrence() returned %', v_result;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. One-time FX Reserves repair: same pattern as SPI — weekly series,
--    no gap detector, same vulnerability.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_series_id    uuid;
  v_last_event   record;
  v_next_count   int;
  v_result       jsonb;
BEGIN
  SELECT id INTO v_series_id
  FROM public.economic_event_series
  WHERE slug = 'sbp-foreign-exchange-reserves';

  -- Find the most recently released FX Reserves event.
  SELECT id, event_date INTO v_last_event
  FROM public.economic_events
  WHERE series_id = v_series_id
    AND status = 'released'
  ORDER BY event_date DESC
  LIMIT 1;

  IF v_last_event.id IS NULL THEN
    RAISE NOTICE '[0037] No released FX Reserves event found — no repair needed.';
    RETURN;
  END IF;

  -- Check whether a future scheduled event already exists.
  SELECT COUNT(*) INTO v_next_count
  FROM public.economic_events
  WHERE series_id = v_series_id
    AND status = 'scheduled'
    AND event_date > v_last_event.event_date;

  IF v_next_count > 0 THEN
    RAISE NOTICE '[0037] FX Reserves last released: % — future scheduled event exists. No repair needed.', v_last_event.event_date;
    RETURN;
  END IF;

  -- Last released event has no successor — call generate_next_occurrence() now.
  v_result := public.generate_next_occurrence(v_series_id, v_last_event.id);
  RAISE NOTICE '[0037] FX Reserves repair: generate_next_occurrence() returned %', v_result;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Verify: show current state of SPI events (post-migration)
-- ─────────────────────────────────────────────────────────────────────────────

SELECT
  slug,
  event_date,
  status,
  actual_value,
  observation_date,
  updated_at
FROM public.economic_events
WHERE series_id = (
  SELECT id FROM public.economic_event_series WHERE slug = 'spi-weekly-inflation-release'
)
ORDER BY event_date DESC
LIMIT 10;
