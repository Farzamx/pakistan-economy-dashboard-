-- Migration 0038: Fix release title/period drift from actual observation_date
--
-- Incident (Phase 20, 2026-07-09):
--   SBP published Worker Remittances for June 2026. The dashboard KPI card
--   (src/lib/data/sbp.ts — always shows SBP's latest available observation,
--   no period gating) updated immediately and correctly. The Economic
--   Calendar and its email notification, however, kept announcing "Worker
--   Remittances (May 2026)" even after June's figure was live everywhere
--   else.
--
-- Root cause:
--   `economic_events.title` and `.reference_period` are NOT derived at
--   read/render/email time from the row's `observation_date` (the one
--   field that always reflects reality once a release happens). They are
--   write-once guesses, computed by generate_next_occurrence() the moment
--   the *previous* event releases — before the new event's real data
--   exists — using `previous.reference_period + 1 month`. sync_event_actual()
--   has never updated title or reference_period on release (confirmed
--   across every prior version: 0013, 0027, 0028, 0037) — only actual_value,
--   status, data_confidence, and (since 0028) observation_date get written.
--
--   Every consumer (calendar UI via economicEventsRepo.ts, the email
--   template via notificationJobWorker.ts, the homepage, and the release
--   history/archive) reads the stored `title` column verbatim — none of
--   them recompute a label from observation_date. So once `title` drifts
--   from the truth, it stays wrong everywhere, permanently, for that row
--   and (via generate_next_occurrence()'s +1-month chaining) every row
--   generated after it.
--
--   The `reference_period` chain for two series — worker-remittances and
--   current-account-balance (both lagMonths=2) — was seeded one month
--   ahead of the correct value by migration 0013's manual backfill
--   (line 176 set reference_period='2026-06-01' for remittances-2026-07-09,
--   but that event's own lagMonths=2 formula — and its own, separately
--   correct, title "(May 2026)" — says the answer is May, not June). CPI,
--   Core Inflation, and Trade Balance (all lagMonths=1) happened to get the
--   correct value from that same backfill line and show no drift today —
--   but nothing prevented them from drifting, and nothing will prevent a
--   future manual correction from introducing the same one-month error
--   again for any series, at any lagMonths value, unless the write path
--   itself becomes self-correcting.
--
-- Fix (two parts):
--   1. sync_event_actual() now recomputes BOTH reference_period and title
--      from the real observation_date at the moment of release, whenever
--      one is provided and the series' event_title_template has a
--      {month} placeholder to fill. This makes the already-released row's
--      title always match its own actual_value/observation_date, AND
--      re-anchors reference_period so generate_next_occurrence()'s
--      subsequent "+1 month" guess for the *next* event starts from a
--      value known to be correct — self-correcting the whole chain on
--      every single release, regardless of what was wrong before.
--      This is the ONE canonical place every consumer's displayed period
--      label ultimately derives from — no other write path sets title.
--   2. One-time backfill of the four rows currently showing drift (see
--      Part 2 below) — two already-released (title already correct;
--      reference_period corrected so future chaining self-heals) and two
--      still-scheduled (title + reference_period both corrected now, so
--      the calendar shows the right expected period even before release).
--
-- Verified NOT affected: weekly series (SPI, FX Reserves) and
-- official_calendar series (MPC, T-Bill/PIB auctions, Monetary Policy
-- Report) — their event_title_template has no {month} placeholder at all
-- ("SPI Weekly Inflation Release", "SBP Monetary Policy Committee Meeting",
-- etc.), so this bug class cannot occur for them by construction.
--
-- Idempotent: CREATE OR REPLACE for the function; Part 2's UPDATEs are
-- scoped with an explicit WHERE on the known-wrong current value, so
-- re-running this migration after it has already applied is a no-op.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. sync_event_actual() — derive title + reference_period from the real
--    observation_date at release time, instead of trusting whatever was
--    guessed when the row was created.
-- ─────────────────────────────────────────────────────────────────────────────

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
  v_series_id       uuid;
  v_title_template  text;
  v_event_id        uuid;
  v_updated_count   int;
  v_obs_period      date;
  v_new_title       text;
begin
  -- Authentication: same NOTIFICATION_WORKER_SECRET pattern as every write RPC
  -- added after migration 0011. Checked before any DB reads.
  if not public.check_internal_secret('notification_worker', p_internal_secret) then
    raise exception 'unauthorized';
  end if;

  -- Observation date sanity check (when provided). Unchanged from 0028/0037 —
  -- full period validation lives in application code (observationPeriodValidator.ts).
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

  select id, event_title_template into v_series_id, v_title_template
  from public.economic_event_series
  where slug = p_series_slug;

  -- Canonical release-period recomputation. Whenever we know the TRUE
  -- observation_date and this series' title actually encodes a period
  -- (i.e. its template has a {month} placeholder — weekly/official_calendar
  -- series never do), re-derive reference_period AND title from it right
  -- now rather than trusting generate_next_occurrence()'s earlier guess.
  -- This is the single point every consumer's displayed period label
  -- (calendar UI, email, homepage, release history, API) traces back to —
  -- none of them compute their own month label; they all just read the
  -- `title` column this function writes.
  if p_observation_date is not null and v_title_template like '%{month}%' then
    v_obs_period := date_trunc('month', p_observation_date::date)::date;
    v_new_title  := replace(v_title_template, '{month}', trim(to_char(v_obs_period, 'FMMonth YYYY')));
  end if;

  update public.economic_events
  set actual_value      = p_actual_value,
      status            = 'released',
      data_confidence   = 'confirmed',
      -- Persist observation period end date so canonicalObservation.ts can compare
      -- freshness against SBP EasyData's latestDate without computing lag offsets.
      observation_date  = COALESCE(p_observation_date::date, observation_date),
      -- NEW: re-anchor reference_period to the real observation, so the next
      -- generate_next_occurrence() call (below) inherits a correct value
      -- instead of chaining forward whatever was here before.
      reference_period  = COALESCE(v_obs_period, reference_period),
      -- NEW: keep the just-released row's own title in sync with the data
      -- it actually shipped with — this is what fixes the incident directly.
      title             = COALESCE(v_new_title, title),
      updated_at        = now()
  where series_id = v_series_id
    and event_date = p_event_date
    and status     = 'scheduled'
  returning id into v_event_id;

  get diagnostics v_updated_count = row_count;

  -- Advance the rolling calendar (migration 0013, restored in 0037). Now
  -- reads the just-corrected reference_period, so the newly generated next
  -- occurrence's title is right too.
  if v_updated_count > 0 then
    perform public.generate_next_occurrence(v_series_id, v_event_id);
  end if;

  return v_updated_count > 0;
end;
$$;

revoke all on function public.sync_event_actual(text, text, date, text, text) from public;
grant execute on function public.sync_event_actual(text, text, date, text, text) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. One-time backfill of the four rows already showing drift as of the
--    2026-07-09 audit. Each UPDATE is guarded by the exact known-wrong
--    current value, so this is safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- worker-remittances-2026-07-09: RELEASED. Title already correct
-- ("Worker Remittances (May 2026)", matches its own observation_date
-- 2026-05-31) — only reference_period was wrong (June instead of May),
-- which is what poisoned the next occurrence below. Fixing it here so any
-- future manual generate_next_occurrence() re-run (or historical re-derivation)
-- starts from the correct anchor.
update public.economic_events
set reference_period = '2026-05-01', updated_at = now()
where slug = 'remittances-2026-07-09'
  and reference_period = '2026-06-01';

-- worker-remittances-2026-08-10: SCHEDULED, not yet released. Currently
-- displays "Worker Remittances (July 2026)" in the live calendar — wrong;
-- per lagMonths=2 for an August event, and inherited from the row above's
-- corrected reference_period, this should read June 2026. Corrected now so
-- the calendar shows the right *expected* period even before release; will
-- also be re-derived correctly from the real observation_date regardless
-- once sync_event_actual() (Part 1) releases it.
update public.economic_events
set title = 'Worker Remittances (June 2026)',
    reference_period = '2026-06-01',
    updated_at = now()
where slug = 'remittances-2026-08-10'
  and title = 'Worker Remittances (July 2026)';

-- current-account-balance-2026-07-16: SCHEDULED, not yet released. Title
-- already correct ("Current Account Balance (May 2026)", matches
-- lagMonths=2 for a July event) — only reference_period was wrong (June
-- instead of May), same root cause as remittances above.
update public.economic_events
set reference_period = '2026-05-01', updated_at = now()
where slug = 'current-account-2026-07-16'
  and reference_period = '2026-06-01';

-- current-account-balance-2026-08-17: SCHEDULED, not yet released. Title
-- already happens to read "Current Account Balance (June 2026)" (correct
-- per lagMonths=2 for an August event) but reference_period says July —
-- fixed so it matches its own title and so ITS next occurrence doesn't
-- inherit a one-month-ahead error.
update public.economic_events
set reference_period = '2026-06-01', updated_at = now()
where slug = 'current-account-2026-08-17'
  and reference_period = '2026-07-01';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Verify: show the four corrected rows plus their series' lagMonths
--    context, so running this migration in the SQL editor prints
--    confirmation of what changed.
-- ─────────────────────────────────────────────────────────────────────────────

select slug, title, event_date, reference_period, observation_date, actual_value, status, updated_at
from public.economic_events
where slug in (
  'remittances-2026-07-09', 'remittances-2026-08-10',
  'current-account-2026-07-16', 'current-account-2026-08-17'
)
order by slug;
