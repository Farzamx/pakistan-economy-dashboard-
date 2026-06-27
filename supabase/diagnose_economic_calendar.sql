-- Economic Calendar — full diagnostic script.
-- Parts A-E were already run directly by Claude against the live database
-- (via the anon key, read-only) — see the accompanying report for those
-- exact results. Parts F and G require catalog/admin access the anon key
-- doesn't have, so run this whole file in the Supabase SQL Editor.
--
-- Each lettered section is a SEPARATE statement on purpose — if your SQL
-- editor only shows the result of the last statement when running
-- everything at once, select and run one section at a time instead.

-- ============================================================
-- A. Existing series, full rows, ordered by slug
-- ============================================================
select id, slug, title, category, default_importance, cadence, created_at, updated_at
from public.economic_event_series
order by slug;

-- ============================================================
-- B. Existing events: slug, series slug, date, status
-- ============================================================
select e.slug, s.slug as series_slug, e.event_date, e.status, e.updated_at
from public.economic_events e
join public.economic_event_series s on s.id = e.series_id
order by e.event_date;

-- ============================================================
-- C. Missing series (expected 17 vs what actually exists)
-- ============================================================
select expected.slug as missing_series
from (values
  ('spi-weekly-inflation-release'),('sbp-foreign-exchange-reserves'),('kse-100-weekly-market-review'),
  ('trade-balance'),('cpi-inflation-release'),('current-account-balance'),('worker-remittances'),
  ('sbp-monetary-policy-committee-meeting'),('gdp-growth-release'),('pakistan-economic-survey'),
  ('federal-budget'),('treasury-bill-auction'),('core-inflation-release'),
  ('large-scale-manufacturing-lsm-growth'),('pib-auction'),('government-debt-release'),
  ('psx-holiday-calendar')
) as expected(slug)
where not exists (select 1 from public.economic_event_series s where s.slug = expected.slug);

-- ============================================================
-- D. Missing events (expected 45 vs what actually exists)
-- ============================================================
select expected.slug as missing_event
from (values
  ('spi-2026-06-27'),('fx-reserves-2026-06-29'),('kse-2026-06-30'),('spi-2026-07-02'),
  ('trade-balance-2026-07-03'),('fx-reserves-2026-07-05'),('kse-2026-07-07'),('spi-2026-07-09'),
  ('cpi-2026-07-10'),('fx-reserves-2026-07-12'),('current-account-2026-07-15'),('spi-2026-07-16'),
  ('remittances-2026-07-18'),('fx-reserves-2026-07-19'),('kse-2026-07-21'),('sbp-mpc-2026-07-22'),
  ('spi-2026-07-23'),('fx-reserves-2026-07-26'),('spi-2026-07-30'),('trade-balance-2026-07-31'),
  ('fx-reserves-2026-08-02'),('gdp-2026-08-07'),('cpi-2026-08-10'),('current-account-2026-08-14'),
  ('sbp-mpc-2026-09-09'),('economic-survey-2027-06-05'),('federal-budget-2027-06-06'),
  ('tbill-auction-2026-07-02'),('core-inflation-2026-07-10'),('lsm-2026-07-18'),
  ('pib-auction-2026-07-24'),('debt-2026-07-28'),('psx-holiday-2026-08-14'),('cpi-2026-04-10'),
  ('gdp-2026-04-15'),('sbp-mpc-2026-04-27'),('current-account-2026-05-15'),('cpi-2026-05-10'),
  ('sbp-mpc-2026-06-15'),('fx-reserves-2026-06-18'),('tbill-auction-2026-04-16'),
  ('core-inflation-2026-04-10'),('lsm-2026-04-18'),('pib-auction-2026-04-24'),('debt-2026-04-28')
) as expected(slug)
where not exists (select 1 from public.economic_events e where e.slug = expected.slug);

-- ============================================================
-- E. Current Account — full row
-- ============================================================
select * from public.economic_event_series where slug = 'current-account-balance';

-- ============================================================
-- F1. RLS policies on both tables
-- ============================================================
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where tablename in ('economic_event_series', 'economic_events');

-- F2. Indexes on both tables
select indexname, indexdef
from pg_indexes
where tablename in ('economic_event_series', 'economic_events');

-- F3. Triggers on both tables
select event_object_table, trigger_name, action_timing, event_manipulation, action_statement
from information_schema.triggers
where event_object_table in ('economic_event_series', 'economic_events');

-- F4. Foreign keys involving both tables
select tc.table_name, kcu.column_name, ccu.table_name as foreign_table, ccu.column_name as foreign_column
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu on tc.constraint_name = kcu.constraint_name
join information_schema.constraint_column_usage ccu on tc.constraint_name = ccu.constraint_name
where tc.constraint_type = 'FOREIGN KEY'
  and (tc.table_name in ('economic_event_series', 'economic_events')
       or ccu.table_name in ('economic_event_series', 'economic_events'));

-- ============================================================
-- G. Insert test — proves whether INSERT actually succeeds in this
--    session/role. Self-cleaning: inserts, reads back, deletes, re-checks.
--    Run these four statements IN ORDER (one at a time if your editor
--    only shows the last result).
-- ============================================================

-- G1. Insert
insert into public.economic_event_series
  (slug, title, category, default_importance, cadence, source_name, automation_tier, reliability_score, description)
values
  ('diagnostic-seed-test', 'Diagnostic Seed Test', 'Inflation', 'Low', 'irregular', 'Diagnostic', 'manual', 1, 'Temporary row — proves INSERT works. Deleted by G3 below.')
returning id, slug, created_at;

-- G2. Read it back
select id, slug, title, created_at from public.economic_event_series where slug = 'diagnostic-seed-test';

-- G3. Delete it
delete from public.economic_event_series where slug = 'diagnostic-seed-test';

-- G4. Confirm it's gone
select count(*) as should_be_zero from public.economic_event_series where slug = 'diagnostic-seed-test';
