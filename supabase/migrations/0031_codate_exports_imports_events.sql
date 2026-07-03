-- Migration 0031: Seed exports-release and imports-release events at every
-- date where a trade-balance event already exists.
--
-- Root cause of the gap: migration 0030 seeded exports-release and
-- imports-release events only at July 17 and August 18, 2026. But the gap
-- detector had already created trade-balance events at earlier dates (e.g.
-- June 17 for May 2026 data). The sync's `lte("event_date", today)` filter
-- finds those earlier trade-balance events but finds NO corresponding event
-- for exports-release or imports-release → skipped-no-due-event.
--
-- Fix: insert a matching exports-release and imports-release event at every
-- date where a trade-balance event exists in the past 6 months. The sync
-- will find these as due events on the next run and populate them using the
-- PBS advance release that is already live for that period.
--
-- Idempotent: NOT EXISTS guard prevents duplicates on re-run.
-- Does NOT modify any existing events.

BEGIN;

INSERT INTO public.economic_events (
  series_id,
  slug,
  title,
  event_date,
  event_time,
  status,
  importance
)
SELECT
  ees.id                                                                              AS series_id,
  ees.slug || '-' || to_char(tb.event_date, 'YYYY-MM-DD')                            AS slug,
  CASE ees.slug
    WHEN 'exports-release'
      THEN 'Exports Release (' ||
           to_char(
             date_trunc('month', tb.event_date) - INTERVAL '1 day',
             'FMMonth YYYY'
           ) || ')'
    ELSE
      'Imports Release (' ||
      to_char(
        date_trunc('month', tb.event_date) - INTERVAL '1 day',
        'FMMonth YYYY'
      ) || ')'
  END                                                                                 AS title,
  tb.event_date,
  '10:00'::time                                                                       AS event_time,
  'scheduled'                                                                         AS status,
  'Medium'                                                                            AS importance
FROM public.economic_events tb
JOIN public.economic_event_series tbs ON tbs.id = tb.series_id AND tbs.slug = 'trade-balance'
CROSS JOIN (
  SELECT id, slug
  FROM public.economic_event_series
  WHERE slug IN ('exports-release', 'imports-release')
) ees
WHERE tb.event_date >= CURRENT_DATE - INTERVAL '6 months'
  AND NOT EXISTS (
    SELECT 1 FROM public.economic_events ee
    WHERE ee.series_id = ees.id
      AND ee.event_date  = tb.event_date
  );

-- Preview: show all events that were just created (or would be created).
-- Rows with actual_value IS NULL are newly seeded; the next sync run will
-- attempt to populate any event with status='scheduled' and event_date <= today.
SELECT
  s.slug,
  e.event_date,
  e.status,
  e.actual_value,
  e.observation_date,
  CASE WHEN e.event_date <= CURRENT_DATE THEN 'DUE NOW' ELSE 'FUTURE' END AS sync_state
FROM public.economic_events e
JOIN public.economic_event_series s ON s.id = e.series_id
WHERE s.slug IN ('trade-balance', 'exports-release', 'imports-release')
ORDER BY e.event_date DESC, s.slug;

COMMIT;
