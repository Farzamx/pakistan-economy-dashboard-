-- Migration 0022: Backfill verified missing historical calendar events
-- Production Data Integrity Phase 1 — 2026-07-01
--
-- Worker Remittances (lagMonths=2)
-- ═══════════════════════════════════════════════════════════════════════════
-- SBP publishes monthly remittance inflows ~45-60 days after month-end.
-- Source authority: State Bank of Pakistan (official press releases).
-- The two-month calendar lag (lagMonths=2) is verified: March data published
-- ~May 10, April data published ~June 10.

-- Event: May 10, 2026 (release of March 2026 remittances, lagMonths=2)
-- Observation period: March 2026 (obsDate 2026-03-31)
-- Value: $3.8B — SBP official monthly remittances figure
-- Source: Business Recorder — "Pakistan records $3.8bn in remittances for
--   March 2026" (brecorder.com/news/40415417) citing SBP press release

insert into public.economic_events (
  series_id, slug, title, event_date, event_time,
  previous_value, forecast_value,
  status, importance, data_confidence, actual_value,
  description
)
values (
  (select id from public.economic_event_series where slug = 'worker-remittances'),
  'remittances-2026-05-10',
  'Worker Remittances — May 2026',
  '2026-05-10',
  '10:00',
  null,
  null,
  'released',
  'High',
  'confirmed',
  '$3.8B',   -- March 2026 — SBP official press release (verified 2026-07-01)
  'Worker remittances inflows, monthly. '
  'Source: State Bank of Pakistan official press release, March 2026 data (verified 2026-07-01). '
  'Cross-confirmed: Business Recorder citing SBP. Observation period: March 2026 (obsDate 2026-03-31).'
)
on conflict (slug) do nothing;

-- Event: June 10, 2026 (release of April 2026 remittances, lagMonths=2)
-- Observation period: April 2026 (obsDate 2026-04-30)
-- Value: $3.53B — SBP official monthly remittances figure
-- Source: The News — "Pakistan receives $3.53bn remittances in April: SBP"
--   (thenews.pk/story/1414945-pakistan-receives-353bn-remittances-in-april-sbp)
-- Note: previous migration draft used $3.5B (rounded). Corrected to $3.53B
--   to match the official SBP-reported figure exactly.

insert into public.economic_events (
  series_id, slug, title, event_date, event_time,
  previous_value, forecast_value,
  status, importance, data_confidence, actual_value,
  description
)
values (
  (select id from public.economic_event_series where slug = 'worker-remittances'),
  'remittances-2026-06-10',
  'Worker Remittances — June 2026',
  '2026-06-10',
  '10:00',
  '$3.8B',   -- March 2026 actual (remittances-2026-05-10, inserted above)
  null,
  'released',
  'High',
  'confirmed',
  '$3.53B',  -- April 2026 — SBP official press release (verified 2026-07-01)
  'Worker remittances inflows, monthly. '
  'Source: State Bank of Pakistan official press release, April 2026 data (verified 2026-07-01). '
  'Cross-confirmed: The News citing SBP. Observation period: April 2026 (obsDate 2026-04-30).'
)
on conflict (slug) do nothing;

-- ═══════════════════════════════════════════════════════════════════════════
-- Current Account Balance (lagMonths=2)
-- ═══════════════════════════════════════════════════════════════════════════
-- SBP publishes BoP data (BPM6) ~45 days after month-end. April data → June 15.
-- Source authority: State Bank of Pakistan BPM6 Summary BoP.

-- Event: June 15, 2026 (release of April 2026 current account, lagMonths=2)
-- Observation period: April 2026 (obsDate 2026-04-30)
-- Value: $-0.28B (deficit of $276 million)
-- Source: SBP Summary Balance of Payments as per BPM6 — April 2026
--   (sbp.org.pk/ecodata/Balancepayment_BPM6.pdf)
-- Cross-confirmed: Arab News PK — "Pakistan posts $459 million current account
--   surplus as FY26 balance turns positive" (with April at -$276M in the table)
-- Note: March 2026 current account was a surplus of $1.07B (confirmed). The
--   existing seed event current-account-2026-05-15 (actual='-$0.5B') appears
--   incorrect — it does not match either lagMonths=1 (April=-$0.28B) or
--   lagMonths=2 (March=+$1.07B surplus). A separate correction migration is
--   required. Previous_value here uses the seed event's actual value ('-$0.5B')
--   to maintain internal DB chain consistency until that correction is made.

insert into public.economic_events (
  series_id, slug, title, event_date, event_time,
  previous_value, forecast_value,
  status, importance, data_confidence, actual_value,
  description
)
values (
  (select id from public.economic_event_series where slug = 'current-account-balance'),
  'current-account-2026-06-15',
  'Current Account Balance — June 2026',
  '2026-06-15',
  '10:00',
  '-$0.5B',   -- May 15 event actual (existing seed current-account-2026-05-15)
  null,
  'released',
  'High',
  'confirmed',
  '$-0.28B',  -- April 2026, -$276M — SBP BoP BPM6 (verified 2026-07-01)
  'Current account balance, BPM6 methodology, monthly. '
  'Source: State Bank of Pakistan BPM6 BoP, April 2026 data (verified 2026-07-01). '
  'Observation period: April 2026 (obsDate 2026-04-30).'
)
on conflict (slug) do nothing;

-- ═══════════════════════════════════════════════════════════════════════════
-- Correct stale previous_value fields on scheduled future events
-- ═══════════════════════════════════════════════════════════════════════════
-- The seed (0003) was generated before these historical events existed, so
-- future events' previous_value fields reference old estimated values.
-- These UPDATEs align them with the now-confirmed actuals inserted above.
-- Each UPDATE is a no-op if the slug does not exist (safe to re-run).
-- SCOPE: Insert historical economic_events rows that are missing from the DB
-- because the initial seed (0003) only seeded future events. All values here
-- have been independently verified against official sources before insertion.
--
-- VERIFICATION STANDARD (enforced before this migration was written):
--   Every actual_value must be confirmed by a named official publication.
--   If a value could not be verified, it was EXCLUDED. The PENDING_AUTOMATION_REGISTRY
--   in src/lib/economicCalendar/seriesPublicationConfig.ts documents what was
--   excluded and why.
--
-- EXCLUDED FROM THIS MIGRATION (pending verification):
--   Trade Balance (May 15, June 15): SBP EasyData returns BPM6 exchange-records
--     trade balance ($-2.37B March, $-3.37B April). The trade-balance series is
--     labeled PBS (customs-basis). PBS published $-2.84B (March) and $-4.07B
--     (April). These measures are not interchangeable (~$470M gap, 17%).
--     Resolution required before any insert. See seriesPublicationConfig.ts.
--   T-bill auctions (Apr 28, 29; May 13, 20): Apr 28 is a Tuesday (non-standard
--     SBP auction day). Yields for Apr 29, May 13, May 20 sourced from SBP
--     EasyData but could not be confirmed against SBP's published MTB results PDF.
--   PIB auction May 18: 3Y yield of 13.25% from EasyData, not cross-confirmed.
--   Additionally: a PIB auction on April 29 (post-MPC hike) appears to be
--   missing from the calendar entirely — requires SBP PIB results PDF to verify.
--
-- PUBLICATION LAG AUDIT (observation-period → release event):
--   CPI / Core Inflation: lagMonths=1 (May obs → June 10 release). ✓
--   Current Account / Remittances: lagMonths=2 (~45-day BoP lag, April obs → June
--     release). ✓ Confirmed: April CA published ~June 15, April remittances ~June 10.
--
-- IDEMPOTENCY: all INSERTs use ON CONFLICT (slug) DO NOTHING. Safe to re-run.
-- UPDATE statements below are idempotent if slug exists and value is already correct.
--
-- SERIES_ID RESOLUTION: all inserts use a subquery on economic_event_series.slug
-- rather than hardcoding UUIDs — resilient across environments.

-- ═══════════════════════════════════════════════════════════════════════════
-- CPI Inflation
-- ═══════════════════════════════════════════════════════════════════════════
-- Event: June 10, 2026 (release of May 2026 CPI, lagMonths=1)
-- Observation period: May 2026 (obsDate 2026-05-31)
-- Value: 11.7% YoY — national headline CPI, Year-on-Year basis
-- Source: Pakistan Bureau of Statistics, Monthly Inflation Report for May 2026
--   (pbs.gov.pk/monthly-inflation-report-for-may-2026/)
-- Cross-confirmed: Business Recorder, KSE.com.pk, IndexBox citing PBS data
-- Note: represents the highest CPI print since June 2024; previous month
--   (April 2026, released May 10) was 10.9% YoY per official sources.
--   The existing seed event cpi-2026-05-10 carries actual='6.8% YoY' which
--   appears incorrect — a separate correction migration is required for that
--   event. The previous_value here uses the official April 2026 value (10.9%).

insert into public.economic_events (
  series_id, slug, title, event_date, event_time,
  previous_value, forecast_value,
  status, importance, data_confidence, actual_value,
  description
)
values (
  (select id from public.economic_event_series where slug = 'cpi-inflation-release'),
  'cpi-2026-06-10',
  'CPI Inflation Release — June 2026',
  '2026-06-10',
  '10:00',
  '10.9% YoY',  -- April 2026 actual per official sources (NOT the seed value of 6.8%)
  null,
  'released',
  'High',
  'confirmed',
  '11.7% YoY',  -- May 2026 — PBS Monthly Inflation Report (pbs.gov.pk)
  'Monthly Consumer Price Index, national, Year-on-Year. Highest since June 2024. '
  'Source: Pakistan Bureau of Statistics, official May 2026 CPI report (verified 2026-07-01). '
  'Observation period: May 2026 (obsDate 2026-05-31).'
)
on conflict (slug) do nothing;

-- ═══════════════════════════════════════════════════════════════════════════
-- Core Inflation (Urban NFNE)
-- ═══════════════════════════════════════════════════════════════════════════
-- Published same day as headline CPI. lagMonths=1.
-- Source: Pakistan Bureau of Statistics (urban Non-Food Non-Energy inflation).

-- Event: May 10, 2026 (release of April 2026 core, lagMonths=1)
-- Observation period: April 2026 (obsDate 2026-04-30)
-- Value: 8.0% YoY — confirmed by PBS CPI release cross-referenced with SBP EasyData
-- Previous: 9.8% YoY (March 2026 core, from existing seed core-inflation-2026-04-10)

insert into public.economic_events (
  series_id, slug, title, event_date, event_time,
  previous_value, forecast_value,
  status, importance, data_confidence, actual_value,
  description
)
values (
  (select id from public.economic_event_series where slug = 'core-inflation-release'),
  'core-inflation-2026-05-10',
  'Core Inflation Release — May 2026',
  '2026-05-10',
  '10:00',
  '9.8% YoY',   -- March 2026 core (seed: core-inflation-2026-04-10)
  null,
  'released',
  'High',
  'confirmed',
  '8.0% YoY',   -- April 2026 Urban NFNE — PBS CPI Report (verified 2026-07-01)
  'Urban Non-Food Non-Energy (NFNE) core inflation, Year-on-Year. '
  'Source: Pakistan Bureau of Statistics, April 2026 CPI report (verified 2026-07-01). '
  'Observation period: April 2026 (obsDate 2026-04-30).'
)
on conflict (slug) do nothing;

-- Event: June 10, 2026 (release of May 2026 core, lagMonths=1)
-- Observation period: May 2026 (obsDate 2026-05-31)
-- Value: 9.0% YoY — confirmed by PBS CPI release cross-referenced with SBP EasyData
-- Previous: 8.0% YoY (April 2026 core, inserted above)

insert into public.economic_events (
  series_id, slug, title, event_date, event_time,
  previous_value, forecast_value,
  status, importance, data_confidence, actual_value,
  description
)
values (
  (select id from public.economic_event_series where slug = 'core-inflation-release'),
  'core-inflation-2026-06-10',
  'Core Inflation Release — June 2026',
  '2026-06-10',
  '10:00',
  '8.0% YoY',   -- April 2026 core (inserted above)
  null,
  'released',
  'High',
  'confirmed',
  '9.0% YoY',   -- May 2026 Urban NFNE — PBS CPI Report (verified 2026-07-01)
  'Urban Non-Food Non-Energy (NFNE) core inflation, Year-on-Year. '
  'Source: Pakistan Bureau of Statistics, May 2026 CPI report (verified 2026-07-01). '
  'Observation period: May 2026 (obsDate 2026-05-31).'
)
on conflict (slug) do nothing;

-- ═══════════════════════════════════════════════════════════════════════════

-- cpi-2026-07-10: previous was '6.8% YoY' (stale seed estimate).
-- Correct value: '11.7% YoY' (from cpi-2026-06-10 inserted above).
update public.economic_events
set previous_value = '11.7% YoY', updated_at = now()
where slug = 'cpi-2026-07-10'
  and status = 'scheduled'
  and previous_value = '6.8% YoY';

-- core-inflation-2026-07-10: previous was '9.8% YoY' (stale seed estimate).
-- Correct value: '9.0% YoY' (from core-inflation-2026-06-10 inserted above).
update public.economic_events
set previous_value = '9.0% YoY', updated_at = now()
where slug = 'core-inflation-2026-07-10'
  and status = 'scheduled'
  and previous_value = '9.8% YoY';

-- remittances-2026-07-18: previous was '$3.1B' (stale seed estimate).
-- Correct value: '$3.53B' (from remittances-2026-06-10 inserted above).
update public.economic_events
set previous_value = '$3.53B', updated_at = now()
where slug = 'remittances-2026-07-18'
  and status = 'scheduled'
  and previous_value = '$3.1B';

-- current-account-2026-07-15: previous was '-$0.4B' (stale seed estimate).
-- Correct value: '$-0.28B' (from current-account-2026-06-15 inserted above).
update public.economic_events
set previous_value = '$-0.28B', updated_at = now()
where slug = 'current-account-2026-07-15'
  and status = 'scheduled'
  and previous_value = '-$0.4B';
