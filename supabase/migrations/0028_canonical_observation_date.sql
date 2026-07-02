-- Migration 0028: Store observation_date on economic_events
--
-- Context: the KPI data layer (src/lib/data/sbp.ts) reads directly from SBP
-- EasyData and is unaware of the confirmed observations the sync pipeline writes
-- to economic_events. When PBS releases CPI on July 1st, economic_events is
-- updated immediately by syncCpiFromPbs (within 15 min), but the KPI card
-- continues to show SBP EasyData's stale May value for up to 24h.
--
-- The canonical read path (src/lib/data/canonicalObservation.ts) fixes this by
-- overlaying the confirmed economic_events observation onto the SBP result when
-- the canonical is fresher. To do this comparison it needs the observation date
-- stored per row — not just the calendar event_date (which is the publication
-- date, not the reference period end date).
--
-- sync_event_actual() already receives p_observation_date for its DB-level
-- sanity check (migration 0027) but discards it after validation. This
-- migration persists it into the new column.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS + CREATE OR REPLACE.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Add observation_date column
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.economic_events
ADD COLUMN IF NOT EXISTS observation_date DATE;

COMMENT ON COLUMN public.economic_events.observation_date IS
'Last day of the reference period this observation covers (e.g. 2026-06-30 '
'for June CPI released July 1st). Populated by sync_event_actual() when '
'p_observation_date is provided. Used by canonicalObservation.ts to compare '
'freshness against SBP EasyData directly without computing lag-months offsets.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Replace sync_event_actual to also store observation_date
-- ─────────────────────────────────────────────────────────────────────────────
-- All other behaviour (auth check, date sanity, WHERE clause, return value)
-- is unchanged from migration 0027. The only difference is the addition of
--   observation_date = COALESCE(p_observation_date::date, observation_date)
-- which stores the date on new writes and leaves existing rows unchanged when
-- p_observation_date is NULL (re-running old callers without the argument).

create or replace function public.sync_event_actual(
  p_internal_secret  text,
  p_series_slug      text,
  p_event_date       date,
  p_actual_value     text,
  p_observation_date text default null
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated_count int;
begin
  -- Authentication: NOTIFICATION_WORKER_SECRET pattern (migration 0011/0027).
  if not public.check_internal_secret('notification_worker', p_internal_secret) then
    raise exception 'unauthorized';
  end if;

  -- Observation date sanity check (when provided).
  -- Full period validation lives in application code (observationPeriodValidator.ts).
  -- This only catches clearly impossible dates (>180 days old or >7 days future).
  if p_observation_date is not null then
    if p_observation_date::date < (current_date - interval '180 days') then
      raise exception 'observation_date % is too stale (>180 days before today %)',
        p_observation_date, current_date;
    end if;
    if p_observation_date::date > (current_date + interval '7 days') then
      raise exception 'observation_date % is in the future (>7 days after today %)',
        p_observation_date, current_date;
    end if;
  end if;

  update public.economic_events
  set actual_value     = p_actual_value,
      status           = 'released',
      data_confidence  = 'confirmed',
      -- Store the observation period end date so canonicalObservation.ts can
      -- compare freshness directly with SBP EasyData's latestDate.
      -- COALESCE preserves an already-stored observation_date if this call
      -- omits p_observation_date (e.g. legacy callers, manual corrections).
      observation_date = COALESCE(p_observation_date::date, observation_date),
      updated_at       = now()
  where series_id = (
      select id from public.economic_event_series where slug = p_series_slug
    )
    and event_date = p_event_date
    and status     = 'scheduled';

  get diagnostics v_updated_count = row_count;
  return v_updated_count > 0;
end;
$$;

revoke all on function public.sync_event_actual(text, text, date, text, text) from public;
grant execute on function public.sync_event_actual(text, text, date, text, text) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Index for the canonical-observation read query
-- ─────────────────────────────────────────────────────────────────────────────
-- canonicalObservation.ts queries: WHERE series_id = ? AND status = 'released'
-- ORDER BY observation_date DESC LIMIT 1. This covering index makes that a
-- single index scan with no heap access for the two filter columns.

CREATE INDEX IF NOT EXISTS economic_events_canonical_idx
ON public.economic_events(series_id, status, observation_date DESC)
WHERE status = 'released';
