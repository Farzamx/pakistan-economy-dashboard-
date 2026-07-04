-- Migration 0035: Cancel deployment-orphan stuck scheduled events
-- (Phase 10 audit, 2026-07-03)
--
-- Background:
--   Several automated calendar series have past-due "scheduled" events that
--   can never auto-release because their observation period has rolled past
--   what the live data sources still provide. These are "deployment orphans" —
--   events seeded before the sync pipeline was live, or co-dated events seeded
--   after the relevant sync run had already consumed the prior period's data.
--
-- Root cause per event:
--
-- Class A — Pre-deployment inflation orphans (May 1, 2026):
--   cpi-inflation-release and core-inflation-release were seeded at 2026-05-01
--   (expecting April 2026 data, obs=2026-04-30). The PBS CPI PDF sync
--   (syncCpiFromPbs.ts) was not yet live when PBS published April CPI on
--   May 1. By the time the sync was deployed, PBS's Monthly Inflation Report
--   showed June CPI (May data). The May 1 events cannot be released because
--   PBS does not re-serve historical report PDFs under a searchable endpoint.
--
-- Class B — Pre-deployment trade orphan (May 17, 2026):
--   trade-balance was seeded at 2026-05-17 (expecting April 2026 trade data,
--   obs=2026-04-30). Same root cause: syncTradeBalanceFromPbs.ts was not yet
--   live. By deployment time, PBS had published June advance release (May data).
--
-- Class C — Pre-deployment LSM orphan (May 18, 2026):
--   large-scale-manufacturing-lsm-growth was seeded at 2026-05-18 (expecting
--   March 2026 data, obs=2026-03-31, lagMonths=2). SBP EasyData had April LSM
--   by deployment time; March obs no longer matches the May 18 event.
--
-- Class D — Post-deployment exports/imports seeding gap (June 17, 2026):
--   exports-release and imports-release events at 2026-06-17 were seeded by
--   migration 0031 AFTER the June 17 sync run had already released trade-balance
--   with May data (obs=2026-05-31). On the subsequent sync run, PBS had already
--   published July advance release (June data, obs=2026-06-30). The period
--   validator (lagMonths=1: June 17 event expects May obs) correctly rejects
--   June obs — but the May data is no longer the latest PBS file. Permanently
--   stuck.
--
-- Idempotent: WHERE status = 'scheduled' ensures re-running is safe.
-- Unaffected: all released events (2026-06-01 CPI/Core, 2026-06-17 trade-balance,
--             2026-06-18 LSM) are preserved — only the stuck "scheduled" orphans
--             are cancelled.

BEGIN;

-- ── Class A: May 1 CPI / Core orphans ─────────────────────────────────────

UPDATE public.economic_events e
SET
  status     = 'cancelled',
  updated_at = now()
FROM public.economic_event_series s
WHERE e.series_id = s.id
  AND s.slug      IN ('cpi-inflation-release', 'core-inflation-release')
  AND e.event_date = '2026-05-01'
  AND e.status    = 'scheduled';

-- ── Class B: May 17 trade-balance orphan ──────────────────────────────────

UPDATE public.economic_events e
SET
  status     = 'cancelled',
  updated_at = now()
FROM public.economic_event_series s
WHERE e.series_id = s.id
  AND s.slug      = 'trade-balance'
  AND e.event_date = '2026-05-17'
  AND e.status    = 'scheduled';

-- ── Class C: May 18 LSM orphan ─────────────────────────────────────────────

UPDATE public.economic_events e
SET
  status     = 'cancelled',
  updated_at = now()
FROM public.economic_event_series s
WHERE e.series_id = s.id
  AND s.slug      = 'large-scale-manufacturing-lsm-growth'
  AND e.event_date = '2026-05-18'
  AND e.status    = 'scheduled';

-- ── Class D: June 17 exports / imports seeding-gap orphans ────────────────

UPDATE public.economic_events e
SET
  status     = 'cancelled',
  updated_at = now()
FROM public.economic_event_series s
WHERE e.series_id = s.id
  AND s.slug      IN ('exports-release', 'imports-release')
  AND e.event_date = '2026-06-17'
  AND e.status    = 'scheduled';

-- ── Verify: show the cancelled events and current state per series ─────────

SELECT
  s.slug,
  e.event_date,
  e.status,
  e.actual_value,
  e.observation_date
FROM public.economic_events e
JOIN public.economic_event_series s ON s.id = e.series_id
WHERE s.slug IN (
  'cpi-inflation-release', 'core-inflation-release',
  'trade-balance',
  'large-scale-manufacturing-lsm-growth',
  'exports-release', 'imports-release'
)
  AND e.event_date >= '2026-05-01'
ORDER BY s.slug, e.event_date;

COMMIT;
