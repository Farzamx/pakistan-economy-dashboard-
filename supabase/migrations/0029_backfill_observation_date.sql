-- Migration 0029: Backfill observation_date on historical released events
--
-- Context: migration 0028 added the observation_date column and updated
-- sync_event_actual() to persist it. However, every row written BEFORE 0028
-- was applied has observation_date = NULL because the 0027 version of
-- sync_event_actual() accepted but silently discarded p_observation_date.
--
-- This one-time backfill derives the correct observation_date from event_date
-- using the known publication lag for each canonical series:
--
--   Series                                  lagMonths  Formula
--   cpi-inflation-release                   1          last day of (event_month - 1)
--   core-inflation-release                  1          last day of (event_month - 1)
--   trade-balance                           1          last day of (event_month - 1)
--   large-scale-manufacturing-lsm-growth    2          last day of (event_month - 2)
--
-- SQL formula for lagMonths=1:
--   (date_trunc('month', event_date) - INTERVAL '1 day')::date
--   e.g. event_date='2026-07-01' → '2026-07-01' - 1 day → '2026-06-30'  ✓
--        event_date='2026-07-17' → '2026-07-01' - 1 day → '2026-06-30'  ✓
--
-- SQL formula for lagMonths=2:
--   (date_trunc('month', event_date) - INTERVAL '1 month' - INTERVAL '1 day')::date
--   e.g. event_date='2026-07-18' → '2026-07-01' - 1 month → '2026-06-01' - 1 day → '2026-05-31'  ✓
--
-- Idempotent: the WHERE clause filters observation_date IS NULL, so re-running
-- this script after the first application makes zero changes.
-- Only touches the four canonical series; all other series are unaffected.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 1: Preview — inspect every row that will be updated BEFORE committing.
--         Run this SELECT, verify the will_be_set_to column looks correct,
--         then proceed to Step 2.
-- ─────────────────────────────────────────────────────────────────────────────

SELECT
  s.slug,
  e.event_date,
  e.actual_value,
  e.observation_date                                                    AS current_null,
  CASE s.slug
    WHEN 'large-scale-manufacturing-lsm-growth'
      THEN (date_trunc('month', e.event_date) - INTERVAL '1 month' - INTERVAL '1 day')::date
    ELSE
         (date_trunc('month', e.event_date) - INTERVAL '1 day')::date
  END                                                                   AS will_be_set_to
FROM public.economic_events e
JOIN public.economic_event_series s ON s.id = e.series_id
WHERE s.slug IN (
  'cpi-inflation-release',
  'core-inflation-release',
  'large-scale-manufacturing-lsm-growth',
  'trade-balance'
)
  AND e.status            = 'released'
  AND e.observation_date IS NULL
ORDER BY s.slug, e.event_date;

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 2: Apply the backfill.
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE public.economic_events e
SET
  observation_date = CASE s.slug
    WHEN 'large-scale-manufacturing-lsm-growth'
      THEN (date_trunc('month', e.event_date) - INTERVAL '1 month' - INTERVAL '1 day')::date
    ELSE
         (date_trunc('month', e.event_date) - INTERVAL '1 day')::date
  END,
  updated_at = now()
FROM public.economic_event_series s
WHERE s.id = e.series_id
  AND s.slug IN (
    'cpi-inflation-release',
    'core-inflation-release',
    'large-scale-manufacturing-lsm-growth',
    'trade-balance'
  )
  AND e.status            = 'released'
  AND e.observation_date IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 3: Verify — must return 0. If non-zero, do not commit; investigate.
-- ─────────────────────────────────────────────────────────────────────────────

SELECT COUNT(*) AS remaining_null_rows
FROM public.economic_events e
JOIN public.economic_event_series s ON s.id = e.series_id
WHERE s.slug IN (
  'cpi-inflation-release',
  'core-inflation-release',
  'large-scale-manufacturing-lsm-growth',
  'trade-balance'
)
  AND e.status            = 'released'
  AND e.observation_date IS NULL;

COMMIT;
