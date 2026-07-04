-- Migration 0036: Fix SPI calendar chain broken by Eid ul-Adha publication gap
-- (Phase 10 audit, 2026-07-04)
--
-- Background:
--   PBS publishes the weekly SPI report every Thursday. In 2026, PBS did NOT
--   publish a report for the week ending June 26 (Eid ul-Adha holiday).
--   The next report appeared on July 3, for the week ended July 2 (one day
--   earlier than the usual Thursday week-ending convention).
--
--   This created two compounding problems:
--
--   Problem 1 — June 26 stuck event:
--     Migration 0012 seeded 'spi-2026-06-26' with event_date = 2026-06-26.
--     The sync looks for a PBS point where p.date === dueEvent.event_date.
--     Since PBS never published a "week ended 26-06-2026" report, no matching
--     point exists. The event returns "skipped-period-mismatch" on every cron
--     run — permanently stuck.
--
--   Problem 2 — July 3 event date mismatch:
--     Migration 0012 seeded 'spi-2026-07-03' with event_date = 2026-07-03.
--     The actual PBS report published on July 3 says "week ended 02-07-2026"
--     (a Wednesday, not a Thursday). The sync would look for p.date === "2026-07-03"
--     but PBS has "2026-07-02" — another permanent mismatch.
--
--   Problem 3 — Pre-seeded future event conflicts:
--     Migration 0012 seeded Thursday-anchored future SPI events:
--     July 10, 17, 24, 31. After July 2 is fixed and released,
--     generate_next_occurrence() creates July 9 (2026-07-02 + 7). On July 10
--     both July 9 and July 10 are past-due; the sync picks the most recent
--     (July 10), which won't match PBS's "week ended July 9" data. July 9
--     is never tried. The chain stalls again.
--
-- Fix:
--   Step 1: Cancel June 26 (PBS never published it).
--   Step 2: Update July 3 event to event_date = 2026-07-02, slug = spi-2026-07-02.
--           On next cron, the sync finds the due event at 2026-07-02, fetches
--           PBS data where p.date === "2026-07-02" — match — releases it.
--           generate_next_occurrence() creates spi-2026-07-09 (July 2 + 7 days).
--   Step 3: Cancel the pre-seeded future Thursday-anchored events (July 10–31)
--           to prevent dual-due conflicts after the chain restores from July 9.
--
-- Chain after this migration + next cron run:
--   spi-2026-07-02 released → spi-2026-07-09 created → PBS publishes ~July 10
--   for week ending July 9 → spi-2026-07-09 released → spi-2026-07-16 created
--   ... and so on indefinitely via generate_next_occurrence().
--
-- Idempotent: WHERE status = 'scheduled' guards all cancellations.
-- Slug update: 'spi-2026-07-02' does not already exist (verified from 0012 seed).

BEGIN;

-- ── Step 1: Cancel the June 26 orphan ────────────────────────────────────────

UPDATE public.economic_events
SET status = 'cancelled', updated_at = now()
WHERE slug = 'spi-2026-06-26'
  AND status = 'scheduled';

-- ── Step 2: Correct the July event to match PBS's actual week-ending date ────
-- PBS report published 2026-07-03 says "week ended on 02-07-2026".
-- Change event_date from 2026-07-03 → 2026-07-02, and update the slug to match.

UPDATE public.economic_events
SET
  event_date = '2026-07-02',
  slug       = 'spi-2026-07-02',
  updated_at = now()
WHERE slug = 'spi-2026-07-03'
  AND status = 'scheduled';

-- ── Step 3: Cancel pre-seeded Thursday-anchored future events ────────────────
-- Migration 0012 seeded July 10, 17, 24, 31 assuming a strict Thursday cadence.
-- After July 2 releases, generate_next_occurrence() creates July 9 (July 2 + 7).
-- If July 10 remains scheduled alongside July 9, the sync on July 10 would pick
-- July 10 (most recent past-due), fail the PBS date match, and July 9 would
-- never be tried — stalling the chain again. Cancel all of them.

UPDATE public.economic_events
SET status = 'cancelled', updated_at = now()
WHERE slug IN ('spi-2026-07-10', 'spi-2026-07-17', 'spi-2026-07-24', 'spi-2026-07-31')
  AND status = 'scheduled';

-- ── Verify: show current state of all SPI events ─────────────────────────────

SELECT
  slug,
  event_date,
  status,
  actual_value,
  observation_date
FROM public.economic_events
WHERE series_id = (
  SELECT id FROM public.economic_event_series WHERE slug = 'spi-weekly-inflation-release'
)
ORDER BY event_date DESC
LIMIT 15;

COMMIT;
