-- Migration 0034: Cancel all scheduled events for treasury-bill-auction-6m
-- and treasury-bill-auction-12m (Phase 10 fix, 2026-07-03)
--
-- Background:
--   syncOfficialCalendars.ts (Step 1 of the cron pipeline) calls
--   reconcile_official_calendar() for both treasury-bill-auction-6m and
--   treasury-bill-auction-12m using the same SBP T-bill auction PDF as 3M.
--   This creates scheduled events for every future auction date in the PDF.
--
--   However, neither 6M nor 12M has a confirmed SBP EasyData indicator key,
--   so SYNC_TARGETS in syncFromSbpEasyData.ts has no entry for them. Every
--   cron run returns "skipped-no-due-event" or simply never checks them.
--   The events accumulate as permanently-stuck scheduled rows — they show
--   "scheduled" on the calendar even after the auction date has long passed.
--
-- Fix:
--   Cancel ALL scheduled events for these two series (past and future).
--   The reconcile calls have been removed from syncOfficialCalendars.ts
--   (same commit) so no new stuck events will be created going forward.
--   The 3M series (treasury-bill-auction-3m) is unaffected — it has a
--   working sync path and is not touched by this migration.
--
--   Both series remain in the DB with their existing released events
--   (if any historical events were manually released, those are preserved
--   by the status != 'released' guard). Only stuck "scheduled" rows are
--   cancelled.
--
-- Idempotent: WHERE status = 'scheduled' ensures re-running is safe.
-- Automation re-enablement: see PENDING_AUTOMATION_REGISTRY in
--   seriesPublicationConfig.ts for the resolution path.

BEGIN;

UPDATE public.economic_events e
SET
  status     = 'cancelled',
  updated_at = now()
FROM public.economic_event_series s
WHERE e.series_id = s.id
  AND s.slug      IN ('treasury-bill-auction-6m', 'treasury-bill-auction-12m')
  AND e.status    = 'scheduled';

-- Verify: show the current state of all events for these series.
SELECT
  s.slug,
  e.event_date,
  e.status,
  e.actual_value,
  e.slug        AS event_slug
FROM public.economic_events e
JOIN public.economic_event_series s ON s.id = e.series_id
WHERE s.slug IN ('treasury-bill-auction-6m', 'treasury-bill-auction-12m')
ORDER BY s.slug, e.event_date;

COMMIT;
