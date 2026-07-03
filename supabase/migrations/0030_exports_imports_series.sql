-- Migration 0030: Add exports-release and imports-release economic_event_series
--
-- The PBS advance release Excel (syncTradeBalanceFromPbs.ts) already fetches and
-- parses monthly exports and imports values alongside trade balance. This migration
-- adds the two series so the sync can write those values to economic_events, and
-- sbpServer.ts can serve them via the canonical override — 28–30 days ahead of
-- SBP BPM6.
--
-- Methodology note: PBS customs-basis (FOB exports, CIF-adjusted imports).
-- The canonical override labels these "PBS advance release — SBP BPM6
-- confirmation pending" to distinguish from the BPM6 KPI card values.
--
-- Publication timing: same PBS Excel as trade-balance, ~16th–18th of M+1.
-- lagMonths=1 (identical to trade-balance): July 17 event → June 2026 data.
--
-- Idempotent: ON CONFLICT DO NOTHING on series; NOT EXISTS guard on events.

BEGIN;

-- ─── 1. Series ────────────────────────────────────────────────────────────────

INSERT INTO public.economic_event_series (
  slug, title, category, default_importance, cadence,
  source_name, automation_tier, reliability_score, description
)
VALUES
  (
    'exports-release',
    'Exports (PBS Advance Release)',
    'External Sector',
    'Medium',
    'monthly',
    'Pakistan Bureau of Statistics',
    'automated',
    4,
    'Monthly Pakistan goods exports (FOB, customs-basis) from the PBS advance Foreign Trade Statistics Excel. '
    'Published ~16th–18th of M+1, 28–30 days before SBP BPM6. '
    'Parsed alongside trade balance in syncTradeBalanceFromPbs.ts.'
  ),
  (
    'imports-release',
    'Imports (PBS Advance Release)',
    'External Sector',
    'Medium',
    'monthly',
    'Pakistan Bureau of Statistics',
    'automated',
    4,
    'Monthly Pakistan goods imports (CIF-adjusted, customs-basis) from the PBS advance Foreign Trade Statistics Excel. '
    'Published ~16th–18th of M+1, 28–30 days before SBP BPM6. '
    'Parsed alongside trade balance in syncTradeBalanceFromPbs.ts.'
  )
ON CONFLICT (slug) DO NOTHING;

-- ─── 2. Seed upcoming scheduled events ───────────────────────────────────────
-- Seeds the July 17, 2026 event (June 2026 data) and August 18, 2026 event
-- (July 2026 data) for each series. The cron gap detector will create any
-- additional events going forward using the gapDetection config in
-- seriesPublicationConfig.ts.
--
-- Event slugs follow the same pattern as trade-balance: {prefix}-YYYY-MM-DD.
-- NOT EXISTS guard makes this idempotent on re-run.

INSERT INTO public.economic_events (
  series_id, slug, title, event_date, event_time, status, importance
)
SELECT
  s.id,
  e.slug,
  e.title,
  e.event_date::date,
  '10:00'::time,
  'scheduled',
  'Medium'
FROM public.economic_event_series s
CROSS JOIN (VALUES
  ('exports-release', 'exports-release-2026-07-17', 'Exports Release (June 2026)',  '2026-07-17'),
  ('exports-release', 'exports-release-2026-08-18', 'Exports Release (July 2026)',  '2026-08-18'),
  ('imports-release', 'imports-release-2026-07-17', 'Imports Release (June 2026)',  '2026-07-17'),
  ('imports-release', 'imports-release-2026-08-18', 'Imports Release (July 2026)',  '2026-08-18')
) AS e(series_slug, slug, title, event_date)
WHERE s.slug = e.series_slug
  AND NOT EXISTS (
    SELECT 1 FROM public.economic_events ee
    WHERE ee.series_id = s.id AND ee.event_date = e.event_date::date
  );

COMMIT;
