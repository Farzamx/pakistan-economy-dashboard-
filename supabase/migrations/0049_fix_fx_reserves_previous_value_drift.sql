-- Fixes a live data-integrity bug in the Economic Calendar's FX Reserves
-- release alert (Phase 6A reserves audit).
--
-- Root cause:
--   generate_next_occurrence() (migration 0013) correctly sets a NEW
--   scheduled event's previous_value = the just-released event's
--   actual_value, AT THE MOMENT the new row is created. That's a
--   write-once snapshot, not a live reference — if the prior event's
--   actual_value is ever corrected afterwards (exactly what happened when
--   sbp-foreign-exchange-reserves moved from the wrong EasyData-based
--   sync to the correct Forex_Arch.xlsx one, Phase 7 Step 3, 2026-07-02),
--   every already-created successor row keeps the stale previous_value
--   forever — nothing ever goes back and reconciles it.
--
--   Confirmed live in production: the 2026-08-06 release has
--   actual_value = "$17.0B" but previous_value = "$11.8B" — a figure that
--   matches no real adjacent week in SBP's own published data (which shows
--   net liquid reserves consistently in the $17B range across the entire
--   surrounding month). The "$11.x B" figures are leftover snapshots from
--   before the Forex_Arch fix landed.
--
--   This directly violates "the Weekly Release Alert must always compare
--   against the immediately previous official release" — previous_value
--   was comparing against a stale, unrelated historical value instead.
--
-- This migration:
--   1. Backfills previous_value for every sbp-foreign-exchange-reserves
--      event from the TRUE chain of actual_value, ordered by event_date
--      (a plain LAG() over the real release history — not a guess).
--   2. Hardens sync_event_actual() so this can't silently recur: after
--      releasing an event, it now also corrects the immediate successor's
--      previous_value if that successor already exists (covers the
--      reset_event_to_scheduled + re-release repair path, which the
--      original write-once design didn't account for). This is additive to
--      the existing behavior — the generate_next_occurrence() call is
--      unchanged.
--
-- Run manually in the Supabase SQL editor (no migration framework).

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. One-time backfill: recompute previous_value from the real actual_value
--    chain for sbp-foreign-exchange-reserves.
-- ─────────────────────────────────────────────────────────────────────────────

WITH ordered AS (
  SELECT
    e.id,
    e.event_date,
    e.previous_value AS old_previous_value,
    LAG(e.actual_value) OVER (ORDER BY e.event_date) AS correct_previous_value
  FROM public.economic_events e
  JOIN public.economic_event_series s ON s.id = e.series_id
  WHERE s.slug = 'sbp-foreign-exchange-reserves'
)
UPDATE public.economic_events e
SET previous_value = ordered.correct_previous_value
FROM ordered
WHERE e.id = ordered.id
  AND ordered.correct_previous_value IS NOT NULL
  AND (e.previous_value IS DISTINCT FROM ordered.correct_previous_value);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Harden sync_event_actual() — also reconcile the immediate successor's
--    previous_value on every release, not just at successor-creation time.
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
  IF NOT public.check_internal_secret('notification_worker', p_internal_secret) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

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

  SELECT id INTO v_series_id
  FROM public.economic_event_series
  WHERE slug = p_series_slug;

  UPDATE public.economic_events
  SET actual_value     = p_actual_value,
      status           = 'released',
      data_confidence  = 'confirmed',
      observation_date = COALESCE(p_observation_date::date, observation_date),
      updated_at       = now()
  WHERE series_id = v_series_id
    AND event_date = p_event_date
    AND status     = 'scheduled'
  RETURNING id INTO v_event_id;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  IF v_updated_count > 0 THEN
    -- Reconcile the immediate successor's previous_value against the value
    -- that was JUST released — closes the drift class this migration's
    -- backfill (above) fixes retroactively. Normally a no-op (the successor
    -- doesn't exist yet, and generate_next_occurrence() below creates it
    -- with the correct value); only has an effect when a successor was
    -- already pre-created and this release corrects a previously-wrong
    -- actual_value (e.g. after reset_event_to_scheduled + re-release).
    UPDATE public.economic_events
    SET previous_value = p_actual_value
    WHERE series_id = v_series_id
      AND event_date = (
        SELECT MIN(event_date) FROM public.economic_events
        WHERE series_id = v_series_id AND event_date > p_event_date
      )
      AND previous_value IS DISTINCT FROM p_actual_value;

    PERFORM public.generate_next_occurrence(v_series_id, v_event_id);
  END IF;

  RETURN v_updated_count > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_event_actual(text, text, date, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.sync_event_actual(text, text, date, text, text) TO anon, authenticated;

-- Note: deliberately NOT renaming economic_event_series.title/
-- event_title_template here. That rename cascades further than it first
-- appears — event titles are baked into each economic_events row at
-- creation time (generate_next_occurrence() reads event_title_template
-- live, but only for NEW rows), getMostRecentEvent() in page.tsx matches
-- events by a title-PREFIX string (not by slug), and the same literal
-- title string is duplicated in src/data/economicCalendarEvents.ts,
-- marketImpactScore.ts, and LiveEmailPreview.tsx. Now that the dashboard's
-- primary "Foreign Reserves" KPI is backed by this same Forex_Arch data
-- (src/lib/data/fxReserves.ts), the calendar and dashboard already show
-- the same number under this title — the confusion this would have fixed
-- (different numbers, similar names) no longer exists, so the rename's
-- risk (silently breaking the calendar cross-reference for future events)
-- isn't worth taking for the remaining marginal clarity.

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Verify: show the corrected FX Reserves event chain.
-- ─────────────────────────────────────────────────────────────────────────────

SELECT event_date, status, actual_value, previous_value, observation_date
FROM public.economic_events
WHERE series_id = (SELECT id FROM public.economic_event_series WHERE slug = 'sbp-foreign-exchange-reserves')
ORDER BY event_date DESC
LIMIT 10;
