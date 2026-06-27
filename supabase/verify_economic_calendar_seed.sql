-- Economic Calendar — seed verification script.
-- Read-only (no inserts/updates) — safe to run any time, paste-and-run
-- immediately after 0003_economic_calendar_seed.sql to confirm it actually
-- took effect. Single query (UNION ALL of one row per check) so every
-- result appears in one grid regardless of how the SQL editor handles
-- multi-statement scripts.

select '1. Total series' as check, count(*)::text as result
from public.economic_event_series

union all
select '2. Total events', count(*)::text
from public.economic_events

union all
select '3. Scheduled events', count(*)::text
from public.economic_events where status = 'scheduled'

union all
select '4. Released events', count(*)::text
from public.economic_events where status = 'released'

union all
select '4b. Postponed events', count(*)::text
from public.economic_events where status = 'postponed'

union all
select '4c. Cancelled events', count(*)::text
from public.economic_events where status = 'cancelled'

union all
select '5. Missing Pakistan-only series', coalesce(
  (select string_agg(expected.slug, ', ')
   from (values
     ('core-inflation-release'),
     ('large-scale-manufacturing-lsm-growth'),
     ('treasury-bill-auction'),
     ('pib-auction'),
     ('government-debt-release'),
     ('psx-holiday-calendar')
   ) as expected(slug)
   where not exists (select 1 from public.economic_event_series s where s.slug = expected.slug)
  ), 'NONE — all 6 present'
)

union all
select '6. Current Account default_importance', coalesce(
  (select default_importance from public.economic_event_series where slug = 'current-account-balance'),
  'SERIES NOT FOUND'
)

union all
select '7. Duplicate series (slug x count)', coalesce(
  (select string_agg(slug || ' (x' || cnt || ')', ', ')
   from (select slug, count(*) as cnt from public.economic_event_series group by slug having count(*) > 1) d
  ), 'NONE'
)

union all
select '8. Duplicate events (slug x count)', coalesce(
  (select string_agg(slug || ' (x' || cnt || ')', ', ')
   from (select slug, count(*) as cnt from public.economic_events group by slug having count(*) > 1) d
  ), 'NONE'
)

order by 1;
