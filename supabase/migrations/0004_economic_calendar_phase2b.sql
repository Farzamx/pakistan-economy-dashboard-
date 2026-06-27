-- Economic Calendar Phase 2B — run AFTER re-running the regenerated
-- 0003_economic_calendar_seed.sql (which now excludes Oil Price Update and
-- US Federal Reserve FOMC, and adds Core Inflation/LSM/T-Bill/PIB
-- auctions/Government Debt/PSX Holiday Calendar). Like every other
-- migration in this project, run this manually in the Supabase SQL editor
-- — no service-role key or migration framework exists here.

-- 1. Remove the two non-Pakistan series the calendar previously included.
-- economic_events.series_id has "on delete cascade", so this also removes
-- their event rows (oil-2026-07-01, fomc-2026-07-29) without a separate
-- delete statement.
delete from public.economic_event_series
where slug in ('oil-price-update', 'us-federal-reserve-fomc-meeting-decision');

-- 2. Secure, narrow write path for Phase 2B's automation (SBP EasyData
-- actual-value sync) — the anon key cannot write to economic_events
-- directly (see 0002's RLS policies, deliberately no public write path),
-- and this project has no service-role key. A SECURITY DEFINER function
-- bypasses RLS internally but only exposes this one specific, bounded
-- operation: update actual_value/status/data_confidence for an EXISTING
-- scheduled event matched by series + date. It cannot insert, delete, or
-- touch any other column — there is no way to call this and do anything
-- other than "mark one already-scheduled release as released."
create or replace function public.sync_event_actual(
  p_series_slug text,
  p_event_date date,
  p_actual_value text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated_count int;
begin
  update public.economic_events
  set actual_value = p_actual_value,
      status = 'released',
      data_confidence = 'confirmed',
      updated_at = now()
  where series_id = (select id from public.economic_event_series where slug = p_series_slug)
    and event_date = p_event_date
    and status = 'scheduled';

  get diagnostics v_updated_count = row_count;
  return v_updated_count > 0;
end;
$$;

revoke all on function public.sync_event_actual(text, date, text) from public;
grant execute on function public.sync_event_actual(text, date, text) to anon, authenticated;
