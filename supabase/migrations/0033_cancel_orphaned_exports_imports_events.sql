-- Migration 0033: Cancel orphaned and duplicate exports-release / imports-release events
--
-- Background (Phase 9 audit):
--   Migrations 0030 and 0031 seeded exports-release and imports-release events, but
--   created two classes of problem events:
--
-- Class A — Irrecoverable historical orphans (May 17, 2026):
--   Migration 0030 seeded events at 2026-05-17 (reference_period = April 2026, i.e.
--   these events expected April 2026 exports/imports data). By the time migration 0032
--   fixed the recurrence_type, PBS had already published May and June advance releases.
--   The Forex exact-match period validator therefore always rejects any current PBS file
--   for these slots — April data is permanently irrecoverable. Status: cancelled.
--
-- Class B — Seeding duplicates (July 17, August 18, 2026):
--   Migration 0030 seeded events at July 17 and August 18 (the original lag-15
--   estimates). Migration 0031 added co-dated events at July 15 and August 17 to
--   align with existing trade-balance events. Both sets are now in the DB, with
--   identical reference_periods within each pair:
--     July 15  (ref=2026-06-01)  ← co-dated with trade-balance (KEEP)
--     July 17  (ref=2026-06-01)  ← original seed         (CANCEL — duplicate)
--     August 17 (ref=2026-07-01) ← co-dated with trade-balance (KEEP)
--     August 18 (ref=2026-07-01) ← original seed         (CANCEL — duplicate)
--   Leaving both would cause the sync to double-write June/July data when the
--   later event becomes past-due in the same sync window.
--
-- Idempotent: WHERE status = 'scheduled' ensures re-running after any one of these
-- events is released does not flip a released event back to cancelled.

BEGIN;

-- ── Class A: Cancel May 17 orphans (April data, irrecoverable) ─────────────────

UPDATE public.economic_events e
SET
  status     = 'cancelled',
  updated_at = now()
FROM public.economic_event_series s
WHERE e.series_id = s.id
  AND s.slug      IN ('exports-release', 'imports-release')
  AND e.event_date = '2026-05-17'
  AND e.status    = 'scheduled';

-- ── Class B: Cancel July 17 and August 18 duplicates ───────────────────────────

UPDATE public.economic_events e
SET
  status     = 'cancelled',
  updated_at = now()
FROM public.economic_event_series s
WHERE e.series_id = s.id
  AND s.slug      IN ('exports-release', 'imports-release')
  AND e.event_date IN ('2026-07-17', '2026-08-18')
  AND e.status    = 'scheduled';

-- ── Verify: show remaining active events for both series ───────────────────────

SELECT
  s.slug,
  e.event_date,
  e.status,
  e.reference_period,
  e.observation_date,
  e.actual_value
FROM public.economic_events e
JOIN public.economic_event_series s ON s.id = e.series_id
WHERE s.slug IN ('exports-release', 'imports-release')
  AND e.status != 'cancelled'
ORDER BY s.slug, e.event_date;

COMMIT;
