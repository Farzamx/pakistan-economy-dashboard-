-- Migration 0032: Configure recurrence rules for exports-release and imports-release
--
-- Migration 0030 created these series without specifying recurrence_type, so
-- they defaulted to 'manual' (the schema default from migration 0013). With
-- recurrence_type='manual', generate_next_occurrence() fires after each release
-- but immediately returns 'no_recurrence_rule' and creates nothing.
--
-- The gap detector (detectCalendarGaps.ts) handles rolling event creation for
-- past months, but generate_next_occurrence() is the canonical backup mechanism
-- that creates the NEXT event in the same cron pass as the release, before the
-- gap detector's lookback window even reaches the new month.
--
-- Fix:
--   1. recurrence_type = 'monthly_lag' — same rule as trade-balance, since all
--      three series are co-published from the same PBS advance release Excel.
--   2. recurrence_lag_days = 15 — identical to trade-balance; formula produces
--      the 17th of the following month (shifted off weekends) for end-of-month
--      reference periods.
--   3. event_slug_prefix / event_title_template / default_event_time — needed
--      by generate_next_occurrence() to build the slug and title string.
--   4. reference_period backfill — generate_next_occurrence() requires this
--      column on the released event to compute the next reference period.
--      Formula: first day of the month before event_month (lagMonths = 1).
--
-- Idempotent: UPDATE ... WHERE reference_period IS NULL is safe to re-run.

BEGIN;

UPDATE public.economic_event_series
SET
  recurrence_type      = 'monthly_lag',
  recurrence_lag_days  = 15,
  default_event_time   = '10:00',
  event_slug_prefix    = 'exports-release',
  event_title_template = 'Exports Release ({month})',
  updated_at           = now()
WHERE slug = 'exports-release';

UPDATE public.economic_event_series
SET
  recurrence_type      = 'monthly_lag',
  recurrence_lag_days  = 15,
  default_event_time   = '10:00',
  event_slug_prefix    = 'imports-release',
  event_title_template = 'Imports Release ({month})',
  updated_at           = now()
WHERE slug = 'imports-release';

-- Backfill reference_period on all existing events for these two series.
-- reference_period = first day of the reference month = first of the month
-- before event_date's month (lagMonths = 1).
--
--   event_date '2026-05-17' → reference_period '2026-04-01' (April data)
--   event_date '2026-06-17' → reference_period '2026-05-01' (May data)
--   event_date '2026-07-17' → reference_period '2026-06-01' (June data)
--   event_date '2026-08-18' → reference_period '2026-07-01' (July data)

UPDATE public.economic_events e
SET
  reference_period = (date_trunc('month', e.event_date) - INTERVAL '1 month')::date,
  updated_at       = now()
FROM public.economic_event_series s
WHERE s.id   = e.series_id
  AND s.slug IN ('exports-release', 'imports-release')
  AND e.reference_period IS NULL;

-- Verify: confirm recurrence metadata and reference_period backfill.
SELECT
  s.slug,
  s.recurrence_type,
  s.recurrence_lag_days,
  s.event_slug_prefix,
  e.event_date,
  e.reference_period,
  e.status
FROM public.economic_events e
JOIN public.economic_event_series s ON s.id = e.series_id
WHERE s.slug IN ('exports-release', 'imports-release')
ORDER BY s.slug, e.event_date;

COMMIT;
