-- Official Calendar Synchronization System — the rolling calendar
-- (0013) introduced generate_next_occurrence(), which reads from
-- economic_event_official_dates but only ever consumes rows that were
-- manually seeded once. This migration adds the write path a genuine
-- periodic sync needs: reconcile_official_calendar(), called from a new
-- TypeScript sync module (syncOfficialCalendars.ts) that actually fetches
-- and parses SBP's live MPC calendar page and DMMD auction PDFs on the
-- existing daily cron. Official data now genuinely overrides estimated
-- recurrence going forward, not just at one-time-seed time.
--
-- Reuses the same p_internal_secret gate as the notification worker RPCs
-- (0011) — one secret for "trusted server-side automation," rather than
-- introducing a second one to configure.
--
-- Reconciliation rules, given a fresh list of official dates for one
-- series:
-- 1. Any fresh date not already in economic_event_official_dates is
--    inserted (unconsumed).
-- 2. Any UNCONSUMED official_dates row for this series that is NOT in the
--    fresh list is deleted — it was a candidate future date that the
--    source no longer publishes (most likely superseded by a different
--    date in the same fresh batch), so leaving it around risks
--    generate_next_occurrence() consuming a stale date later. Consumed
--    rows are never touched here — they already became a real event.
-- 3. Any currently 'scheduled' event for this series whose date is NOT in
--    the fresh list is marked 'postponed' (never deleted — preserves the
--    fact that a release was once expected on that date) and logged in
--    the returned summary as a detected change.
-- 4. If, after 1-3, the series has no 'scheduled' event at all, one is
--    created from the soonest unconsumed official date — so a
--    postponement or a fresh sync against a brand-new series never
--    leaves the calendar with a gap.

create or replace function public.reconcile_official_calendar(
  p_internal_secret text,
  p_series_slug text,
  p_official_dates jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_series record;
  v_item jsonb;
  v_fresh_dates date[];
  v_inserted int := 0;
  v_row_count int;
  v_removed_stale int := 0;
  v_postponed jsonb := '[]'::jsonb;
  v_postponed_count int := 0;
  v_scheduled_count int;
  v_next_official record;
  v_created_slug text;
begin
  if not public.check_internal_secret('notification_worker', p_internal_secret) then
    raise exception 'unauthorized';
  end if;

  select * into v_series from public.economic_event_series where slug = p_series_slug;
  if v_series.id is null then
    return jsonb_build_object('success', false, 'error', 'series_not_found');
  end if;

  -- Explicit guard rather than relying on how NULL propagates through the
  -- "not (x = any(array))" checks below — an empty/failed parse must never
  -- reach the postpone or stale-removal logic.
  if p_official_dates is null or jsonb_array_length(p_official_dates) = 0 then
    return jsonb_build_object('success', false, 'error', 'empty_official_dates');
  end if;

  select array_agg((item->>'event_date')::date) into v_fresh_dates
  from jsonb_array_elements(p_official_dates) as item;

  -- 1. Insert any genuinely new fresh dates.
  for v_item in select * from jsonb_array_elements(p_official_dates)
  loop
    insert into public.economic_event_official_dates (series_id, event_date, event_time, source_url, consumed)
    values (
      v_series.id,
      (v_item->>'event_date')::date,
      coalesce((v_item->>'event_time')::time, v_series.default_event_time),
      v_item->>'source_url',
      exists (
        select 1 from public.economic_events
        where series_id = v_series.id and event_date = (v_item->>'event_date')::date
      )
    )
    on conflict (series_id, event_date) do nothing;
    get diagnostics v_row_count = row_count;
    v_inserted := v_inserted + v_row_count;
  end loop;

  -- 2. Remove stale unconsumed candidates no longer published by the source.
  delete from public.economic_event_official_dates
  where series_id = v_series.id
    and consumed = false
    and not (event_date = any (v_fresh_dates));
  get diagnostics v_removed_stale = row_count;

  -- 3. Postpone any scheduled event whose date the source no longer lists.
  with postponed as (
    update public.economic_events
    set status = 'postponed', updated_at = now()
    where series_id = v_series.id
      and status = 'scheduled'
      and not (event_date = any (v_fresh_dates))
    returning slug, event_date
  )
  select coalesce(jsonb_agg(jsonb_build_object('slug', slug, 'event_date', event_date)), '[]'::jsonb), count(*)
    into v_postponed, v_postponed_count
    from postponed;

  -- 4. Ensure at least one scheduled event exists for this series.
  select count(*) into v_scheduled_count from public.economic_events where series_id = v_series.id and status = 'scheduled';

  if v_scheduled_count = 0 then
    select * into v_next_official from public.economic_event_official_dates
      where series_id = v_series.id and consumed = false
      order by event_date asc limit 1;

    if v_next_official.id is not null then
      v_created_slug := v_series.event_slug_prefix || '-' || to_char(v_next_official.event_date, 'YYYY-MM-DD');
      insert into public.economic_events (series_id, slug, title, event_date, event_time, previous_value, forecast_value, actual_value, status, importance, description, source_url, data_confidence, date_time_classification)
      values (
        v_series.id, v_created_slug, v_series.event_title_template, v_next_official.event_date,
        coalesce(v_next_official.event_time, v_series.default_event_time),
        null, null, null, 'scheduled', v_series.default_importance, v_series.description,
        coalesce(v_next_official.source_url, v_series.source_url), 'estimated', 'confirmed'
      )
      on conflict (slug) do nothing;
      update public.economic_event_official_dates set consumed = true where id = v_next_official.id;
    end if;
  end if;

  return jsonb_build_object(
    'success', true,
    'series_slug', p_series_slug,
    'fresh_dates_count', array_length(v_fresh_dates, 1),
    'official_dates_inserted', v_inserted,
    'stale_candidates_removed', v_removed_stale,
    'postponed_count', v_postponed_count,
    'postponed_events', v_postponed,
    'backfilled_scheduled', v_created_slug
  );
end;
$$;

revoke all on function public.reconcile_official_calendar(text, text, jsonb) from public;
grant execute on function public.reconcile_official_calendar(text, text, jsonb) to anon, authenticated;
