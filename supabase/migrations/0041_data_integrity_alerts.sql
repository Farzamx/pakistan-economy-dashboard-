-- Post-Release Verification System (production-hardening audit, 2026-07-18).
--
-- The audit's Finding 2 (Critical, architectural risk): sync_event_actual()'s
-- own `WHERE status = 'scheduled'` guard means a release can only transition
-- ONCE — if any bug ever wrote a wrong or premature actual_value, nothing in
-- this system could ever detect it after the fact, let alone correct it.
--
-- This migration adds the write/read surface for a NEW, separate safety net:
-- for every event released within the last 48 hours, re-fetch the official
-- source and compare it against what's stored. A mismatch NEVER overwrites
-- the released row (sync_event_actual's guard already makes that impossible
-- even if this code tried) — it only logs a data_integrity_alerts row for a
-- human to review. The released value stays authoritative until a maintainer
-- acts on it.
--
-- Same pattern as source_health_log (migration 0025): RLS enabled, zero
-- policies, all access via SECURITY DEFINER functions gated by
-- check_internal_secret('notification_worker', ...) — no service-role key,
-- no new security model, just one more table on the existing pattern.

create table if not exists public.data_integrity_alerts (
  id                    uuid primary key default gen_random_uuid(),
  economic_event_id     uuid not null references public.economic_events(id) on delete cascade,
  series_slug           text not null,
  event_date            date not null,
  released_actual_value text not null,
  released_observation_date text,
  fresh_value           text,
  fresh_observation_date text,
  mismatch_type         text not null check (mismatch_type in ('value', 'observation_date', 'period', 'source_unreachable', 'other')),
  detail                text not null,
  status                text not null default 'open' check (status in ('open', 'acknowledged', 'resolved', 'dismissed')),
  detected_at           timestamptz not null default now(),
  resolved_at           timestamptz,
  resolution_note       text,
  created_at            timestamptz not null default now()
);

create index if not exists data_integrity_alerts_status_idx
  on public.data_integrity_alerts (status, detected_at desc);

create index if not exists data_integrity_alerts_event_idx
  on public.data_integrity_alerts (economic_event_id);

alter table public.data_integrity_alerts enable row level security;
-- No RLS policies — all access via SECURITY DEFINER functions below, same as
-- every other internal log table in this project (cron_run_log, source_health_log).

-- ── Write RPC — called by the post-release verification pass ───────────────
-- Idempotent per (economic_event_id, mismatch_type) within a 48h window: the
-- verification pass re-runs on every pipeline invocation (as often as every
-- 15 minutes) for up to 48h per event, so without de-duplication the SAME
-- mismatch would otherwise create dozens of alert rows for one real issue.
create or replace function public.log_data_integrity_alert(
  p_internal_secret          text,
  p_economic_event_id        uuid,
  p_series_slug              text,
  p_event_date               date,
  p_released_actual_value    text,
  p_mismatch_type            text,
  p_detail                   text,
  p_released_observation_date text default null,
  p_fresh_value              text default null,
  p_fresh_observation_date   text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_id uuid;
begin
  if not public.check_internal_secret('notification_worker', p_internal_secret) then
    raise exception 'unauthorized';
  end if;

  select id into v_existing_id
    from public.data_integrity_alerts
    where economic_event_id = p_economic_event_id
      and mismatch_type = p_mismatch_type
      and status = 'open'
      and detected_at > now() - interval '48 hours'
    limit 1;

  if v_existing_id is not null then
    update public.data_integrity_alerts
      set detail = p_detail,
          fresh_value = p_fresh_value,
          fresh_observation_date = p_fresh_observation_date,
          detected_at = now()
      where id = v_existing_id;
    return jsonb_build_object('success', true, 'alert_id', v_existing_id, 'deduplicated', true);
  end if;

  insert into public.data_integrity_alerts (
    economic_event_id, series_slug, event_date, released_actual_value,
    released_observation_date, fresh_value, fresh_observation_date,
    mismatch_type, detail
  ) values (
    p_economic_event_id, p_series_slug, p_event_date, p_released_actual_value,
    p_released_observation_date, p_fresh_value, p_fresh_observation_date,
    p_mismatch_type, p_detail
  )
  returning id into v_existing_id;

  return jsonb_build_object('success', true, 'alert_id', v_existing_id, 'deduplicated', false);
end;
$$;

revoke all on function public.log_data_integrity_alert(text, uuid, text, date, text, text, text, text, text, text) from public;
grant execute on function public.log_data_integrity_alert(text, uuid, text, date, text, text, text, text, text, text) to anon, authenticated;

-- ── Read RPC — internal monitoring surface ──────────────────────────────────
create or replace function public.get_data_integrity_alerts(
  p_internal_secret text,
  p_status          text default 'open',
  p_limit           int default 100
)
returns table (
  id uuid,
  economic_event_id uuid,
  series_slug text,
  event_date date,
  released_actual_value text,
  released_observation_date text,
  fresh_value text,
  fresh_observation_date text,
  mismatch_type text,
  detail text,
  status text,
  detected_at timestamptz,
  resolved_at timestamptz,
  resolution_note text
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.check_internal_secret('notification_worker', p_internal_secret) then
    raise exception 'unauthorized';
  end if;

  return query
    select a.id, a.economic_event_id, a.series_slug, a.event_date, a.released_actual_value,
           a.released_observation_date, a.fresh_value, a.fresh_observation_date,
           a.mismatch_type, a.detail, a.status, a.detected_at, a.resolved_at, a.resolution_note
    from public.data_integrity_alerts a
    where (p_status = 'all' or a.status = p_status)
    order by a.detected_at desc
    limit p_limit;
end;
$$;

revoke all on function public.get_data_integrity_alerts(text, text, int) from public;
grant execute on function public.get_data_integrity_alerts(text, text, int) to anon, authenticated;

-- ── Resolution RPC — lets a maintainer close out an alert after manual review ──
create or replace function public.resolve_data_integrity_alert(
  p_internal_secret text,
  p_alert_id        uuid,
  p_new_status      text,
  p_resolution_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.check_internal_secret('notification_worker', p_internal_secret) then
    raise exception 'unauthorized';
  end if;

  if p_new_status not in ('acknowledged', 'resolved', 'dismissed') then
    raise exception 'invalid status: %', p_new_status;
  end if;

  update public.data_integrity_alerts
    set status = p_new_status,
        resolution_note = coalesce(p_resolution_note, resolution_note),
        resolved_at = case when p_new_status in ('resolved', 'dismissed') then now() else resolved_at end
    where id = p_alert_id;

  return jsonb_build_object('success', true);
end;
$$;

revoke all on function public.resolve_data_integrity_alert(text, uuid, text, text) from public;
grant execute on function public.resolve_data_integrity_alert(text, uuid, text, text) to anon, authenticated;
