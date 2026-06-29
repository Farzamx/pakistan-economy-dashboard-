-- Rolling Calendar refactor — "Pakistan's Forex Factory." Three things
-- happen in this migration: (1) the event allowlist is cut down to only
-- series that can materially move PSX/rates/bonds/PKR/inflation
-- expectations, (2) every remaining series gets a machine-readable
-- recurrence rule instead of just a descriptive cadence string, and (3) a
-- generate_next_occurrence() function — called automatically from
-- sync_event_actual() the moment a release is detected — creates the next
-- scheduled instance, so this calendar never again needs months of
-- hand-seeded future rows to stay populated.
--
-- Interpretation notes (flagging judgment calls made while applying the
-- brief, so they're easy to challenge/override):
-- * The "Keep" list was treated as a definitive allowlist, not a partial
--   list of examples — government-debt-release isn't on it, so it's
--   removed alongside the four explicitly-named removals.
-- * "Monetary Policy Statement" is the SAME announcement as the MPC
--   decision (same press release, same timestamp) — not a separate row.
-- * "Monetary Policy Reports" is added as one new lightweight series,
--   since SBP's own FY27 announcement already gives 2 concrete dates
--   (Aug 10 2026, Feb 8 2027) — genuinely "officially scheduled."
-- * T-Bill auctions are split into 3 series (3M/6M/12M) since SBP reports
--   3 separate cut-off yields per auction, not one blended figure. 6M/12M
--   have no confirmed live SBP EasyData yield indicator (only 3M does) —
--   their actual-value sync is semi_automated, not automated, until that's
--   verified. Their auction DATE is still fully automated (same official
--   calendar drives all 3 tenors).
-- * "Auction Results" is the SAME event as the auction itself transitioning
--   to released with actual_value populated — not a separate row.

-- ============================================================
-- 1. Remove events that no longer belong on an investor-focused calendar.
--    Cascades to every event in each series (including historical/archive
--    rows — explicitly instructed: "Remove them from... Archive... Do not
--    leave orphaned records"). notification_jobs for any of their events
--    cascade-delete too (on delete cascade); email_log rows survive with
--    economic_event_id set null (on delete set null), preserving delivery
--    history without referencing a series that no longer exists.
-- ============================================================

delete from public.economic_event_series where slug in (
  'kse-100-weekly-market-review',
  'pakistan-economic-survey',
  'federal-budget',
  'psx-holiday-calendar',
  'government-debt-release',
  'test-notification-pipeline-check'
);

-- ============================================================
-- 2. Schema additions for machine-readable recurrence.
-- ============================================================

alter table public.economic_event_series add column if not exists recurrence_type text not null default 'manual'
  check (recurrence_type in ('weekly', 'monthly_lag', 'official_calendar', 'manual'));
alter table public.economic_event_series add column if not exists recurrence_anchor_weekday smallint check (recurrence_anchor_weekday between 0 and 6); -- 0=Sunday..6=Saturday, weekly type only
alter table public.economic_event_series add column if not exists recurrence_lag_days smallint; -- monthly_lag type only: next event_date = end of (reference month + 1) + this many days, shifted off weekends
alter table public.economic_event_series add column if not exists default_event_time time;
alter table public.economic_event_series add column if not exists event_slug_prefix text;
alter table public.economic_event_series add column if not exists event_title_template text; -- '{month}' is replaced with e.g. "July 2026" for monthly_lag series

alter table public.economic_events add column if not exists reference_period date; -- first day of the reference month, monthly_lag series only — lets generate_next_occurrence() compute "the month after this one" without parsing it back out of the title string

-- Official advance-calendar dates (MPC, T-Bill, PIB) — populated from each
-- source's own published rolling calendar, consumed (one row each) as
-- generate_next_occurrence() uses them. When a series runs out of
-- unconsumed rows, auto-generation correctly stops rather than guessing —
-- that's the signal this table needs a refresh against the source's latest
-- published calendar.
create table if not exists public.economic_event_official_dates (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references public.economic_event_series(id) on delete cascade,
  event_date date not null,
  event_time time,
  source_url text,
  consumed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (series_id, event_date)
);
alter table public.economic_event_official_dates enable row level security;
-- No policies — not public reference data in the same sense as the calendar
-- tables; only read/written by SECURITY DEFINER functions below.

-- ============================================================
-- 3. Recurrence rules for every remaining series.
-- ============================================================

update public.economic_event_series set
  recurrence_type = 'weekly', recurrence_anchor_weekday = 4, default_event_time = '16:30',
  event_slug_prefix = 'fx-reserves', event_title_template = 'SBP Foreign Exchange Reserves (Weekly)', updated_at = now()
  where slug = 'sbp-foreign-exchange-reserves';

update public.economic_event_series set
  recurrence_type = 'weekly', recurrence_anchor_weekday = 5, default_event_time = '12:00',
  event_slug_prefix = 'spi', event_title_template = 'SPI Weekly Inflation Release', updated_at = now()
  where slug = 'spi-weekly-inflation-release';

update public.economic_event_series set
  recurrence_type = 'monthly_lag', recurrence_lag_days = 1, default_event_time = '12:00',
  event_slug_prefix = 'cpi', event_title_template = 'CPI Inflation Release ({month})', updated_at = now()
  where slug = 'cpi-inflation-release';

update public.economic_event_series set
  recurrence_type = 'monthly_lag', recurrence_lag_days = 1, default_event_time = '12:00',
  event_slug_prefix = 'core-inflation', event_title_template = 'Core Inflation Release ({month})', updated_at = now()
  where slug = 'core-inflation-release';

update public.economic_event_series set
  recurrence_type = 'monthly_lag', recurrence_lag_days = 15, default_event_time = '17:00',
  event_slug_prefix = 'trade-balance', event_title_template = 'Trade Balance ({month})', updated_at = now()
  where slug = 'trade-balance';

update public.economic_event_series set
  recurrence_type = 'monthly_lag', recurrence_lag_days = 16, default_event_time = '17:00',
  event_slug_prefix = 'current-account', event_title_template = 'Current Account Balance ({month})', updated_at = now()
  where slug = 'current-account-balance';

update public.economic_event_series set
  recurrence_type = 'monthly_lag', recurrence_lag_days = 9, default_event_time = '16:00',
  event_slug_prefix = 'remittances', event_title_template = 'Worker Remittances ({month})', updated_at = now()
  where slug = 'worker-remittances';

update public.economic_event_series set
  recurrence_type = 'monthly_lag', recurrence_lag_days = 45, default_event_time = '16:00',
  event_slug_prefix = 'lsm', event_title_template = 'Large Scale Manufacturing (LSM) Growth ({month})', updated_at = now()
  where slug = 'large-scale-manufacturing-lsm-growth';

update public.economic_event_series set
  recurrence_type = 'official_calendar', default_event_time = '14:00',
  event_slug_prefix = 'sbp-mpc', event_title_template = 'SBP Monetary Policy Committee Meeting', updated_at = now()
  where slug = 'sbp-monetary-policy-committee-meeting';

-- GDP has no clean computable rule (PBS's National Accounts Committee
-- doesn't meet on a fixed schedule this audit could confirm) — stays
-- 'manual' (the default), explicitly disclosed rather than guessed.

-- ============================================================
-- 4. Treasury Bill tenor split — rename the existing 3M series, add 6M/12M
--    as new series. All three share the same official auction calendar.
-- ============================================================

update public.economic_event_series set
  slug = 'treasury-bill-auction-3m',
  title = 'Treasury Bill Auction (3M)',
  recurrence_type = 'official_calendar', default_event_time = '12:00',
  event_slug_prefix = 'tbill-auction-3m', event_title_template = 'Treasury Bill Auction (3M)',
  updated_at = now()
  where slug = 'treasury-bill-auction';

update public.economic_events set slug = replace(slug, 'tbill-auction-', 'tbill-auction-3m-')
  where series_id = (select id from public.economic_event_series where slug = 'treasury-bill-auction-3m');

insert into public.economic_event_series (slug, title, category, default_importance, cadence, source_name, source_url, automation_tier, reliability_score, description, recurrence_type, default_event_time, event_slug_prefix, event_title_template)
values
  ('treasury-bill-auction-6m', 'Treasury Bill Auction (6M)', 'Fiscal Sector', 'Medium', 'irregular', 'State Bank of Pakistan', 'https://www.sbp.org.pk/ecodata/auction-treasurybills.pdf', 'semi_automated', 4, 'SBP''s 6-month Treasury Bill auction, per SBP''s published advance auction calendar — auctioned alongside the 3M and 12M tenors on the same date. No confirmed live SBP EasyData yield indicator yet (date is automated; actual-value sync is currently manual pending that source).', 'official_calendar', '12:00', 'tbill-auction-6m', 'Treasury Bill Auction (6M)'),
  ('treasury-bill-auction-12m', 'Treasury Bill Auction (12M)', 'Fiscal Sector', 'Medium', 'irregular', 'State Bank of Pakistan', 'https://www.sbp.org.pk/ecodata/auction-treasurybills.pdf', 'semi_automated', 4, 'SBP''s 12-month Treasury Bill auction, per SBP''s published advance auction calendar — auctioned alongside the 3M and 6M tenors on the same date. No confirmed live SBP EasyData yield indicator yet (date is automated; actual-value sync is currently manual pending that source).', 'official_calendar', '12:00', 'tbill-auction-12m', 'Treasury Bill Auction (12M)')
on conflict (slug) do nothing;

update public.economic_event_series set
  recurrence_type = 'official_calendar', default_event_time = '12:00',
  event_slug_prefix = 'pib-auction', event_title_template = 'PIB Auction (Fixed Rate)', updated_at = now()
  where slug = 'pib-auction';

-- New: Monetary Policy Reports — explicitly "officially scheduled" per
-- SBP's own FY27 announcement (referenced in the MPC series' event
-- descriptions: Aug 10 2026 and Feb 8 2027 due dates).
insert into public.economic_event_series (slug, title, category, default_importance, cadence, source_name, source_url, automation_tier, reliability_score, description, recurrence_type, default_event_time, event_slug_prefix, event_title_template, is_headline)
values ('sbp-monetary-policy-report', 'SBP Monetary Policy Report', 'Monetary Policy', 'Medium', 'irregular', 'State Bank of Pakistan', 'https://www.sbp.org.pk/m_policy/index.asp', 'manual', 4, 'SBP''s periodic Monetary Policy Report — a deeper analytical companion to the MPC''s rate decisions, published on dates SBP announces alongside its MPC calendar. Not a numeric indicator (a PDF report), so there is no actual-value sync — only the release date is tracked.', 'official_calendar', '12:00', 'sbp-monetary-policy-report', 'SBP Monetary Policy Report', false)
on conflict (slug) do nothing;

-- ============================================================
-- 5. Backfill reference_period on currently-scheduled monthly_lag events
--    (forward-looking only — historical/archive rows are left as recorded,
--    consistent with the prior audit's same scope decision).
-- ============================================================

update public.economic_events set reference_period = '2026-06-01' where slug in ('cpi-2026-07-01', 'core-inflation-2026-07-01', 'remittances-2026-07-09', 'trade-balance-2026-07-15', 'current-account-2026-07-16');
update public.economic_events set reference_period = '2026-07-01' where slug in ('cpi-2026-08-03', 'core-inflation-2026-08-03', 'remittances-2026-08-10', 'trade-balance-2026-08-17', 'current-account-2026-08-17');
update public.economic_events set reference_period = '2026-05-01' where slug = 'lsm-2026-07-18';

-- ============================================================
-- 6. Seed official advance-calendar dates. MPC dates that already have a
--    matching scheduled event are marked consumed so generate_next_
--    occurrence() doesn't try to recreate them; the 6M/12M/Monetary Policy
--    Report rows are unconsumed (no event exists for them yet) so the
--    first call after this migration runs creates their initial instance.
-- ============================================================

insert into public.economic_event_official_dates (series_id, event_date, event_time, source_url, consumed)
select id, d.event_date, '14:00', 'https://www.sbp.org.pk/m_policy/mp-calendar.asp', true
from public.economic_event_series, (values
  ('2026-07-27'::date), ('2026-09-14'::date), ('2026-10-26'::date), ('2026-12-14'::date),
  ('2027-01-25'::date), ('2027-03-08'::date), ('2027-04-26'::date), ('2027-06-17'::date)
) as d(event_date)
where slug = 'sbp-monetary-policy-committee-meeting'
on conflict (series_id, event_date) do nothing;

insert into public.economic_event_official_dates (series_id, event_date, event_time, source_url, consumed)
select id, d.event_date, '12:00', 'https://www.sbp.org.pk/m_policy/index.asp', false
from public.economic_event_series, (values ('2026-08-10'::date), ('2027-02-08'::date)) as d(event_date)
where slug = 'sbp-monetary-policy-report'
on conflict (series_id, event_date) do nothing;

-- All three dates already have a matching scheduled event for 3M (seeded
-- in the prior audit) — marked consumed so generate_next_occurrence()
-- doesn't try to recreate them.
insert into public.economic_event_official_dates (series_id, event_date, event_time, source_url, consumed)
select id, d.event_date, '12:00', 'https://www.sbp.org.pk/ecodata/auction-treasurybills.pdf', true
from public.economic_event_series, (values ('2026-07-08'::date), ('2026-07-22'::date), ('2026-08-05'::date)) as d(event_date)
where slug = 'treasury-bill-auction-3m'
on conflict (series_id, event_date) do nothing;

insert into public.economic_event_official_dates (series_id, event_date, event_time, source_url, consumed)
select id, d.event_date, '12:00', 'https://www.sbp.org.pk/ecodata/auction-treasurybills.pdf', false
from public.economic_event_series, (values ('2026-07-08'::date), ('2026-07-22'::date), ('2026-08-05'::date)) as d(event_date)
where slug in ('treasury-bill-auction-6m', 'treasury-bill-auction-12m')
on conflict (series_id, event_date) do nothing;

insert into public.economic_event_official_dates (series_id, event_date, event_time, source_url, consumed)
select id, d.event_date, '12:00', 'https://www.sbp.org.pk/ecodata/auction-bond.pdf', true
from public.economic_event_series, (values ('2026-07-02'::date), ('2026-08-04'::date)) as d(event_date)
where slug = 'pib-auction'
on conflict (series_id, event_date) do nothing;

-- Bootstrap the FIRST scheduled instance for the three brand-new series
-- (6M/12M T-Bill, Monetary Policy Report) — generate_next_occurrence()
-- only ever fires when an EXISTING event is released, so a series with no
-- prior event at all has nothing to bootstrap the chain from. These three
-- inserts are the one-time exception; every occurrence after this is
-- created automatically. Marks the corresponding official_dates row
-- consumed so generate_next_occurrence() picks up from the next one.
insert into public.economic_events (series_id, slug, title, event_date, event_time, previous_value, forecast_value, actual_value, status, importance, description, source_url, data_confidence, date_time_classification)
values
  ((select id from public.economic_event_series where slug = 'treasury-bill-auction-6m'), 'tbill-auction-6m-2026-07-08', 'Treasury Bill Auction (6M)', '2026-07-08', '12:00', null, null, null, 'scheduled', 'Medium', 'SBP''s 6-month Treasury Bill auction, per SBP''s published advance auction calendar.', 'https://www.sbp.org.pk/ecodata/auction-treasurybills.pdf', 'estimated', 'confirmed'),
  ((select id from public.economic_event_series where slug = 'treasury-bill-auction-12m'), 'tbill-auction-12m-2026-07-08', 'Treasury Bill Auction (12M)', '2026-07-08', '12:00', null, null, null, 'scheduled', 'Medium', 'SBP''s 12-month Treasury Bill auction, per SBP''s published advance auction calendar.', 'https://www.sbp.org.pk/ecodata/auction-treasurybills.pdf', 'estimated', 'confirmed'),
  ((select id from public.economic_event_series where slug = 'sbp-monetary-policy-report'), 'sbp-monetary-policy-report-2026-08-10', 'SBP Monetary Policy Report', '2026-08-10', '12:00', null, null, null, 'scheduled', 'Medium', 'SBP''s periodic Monetary Policy Report — a deeper analytical companion to the MPC''s rate decisions.', 'https://www.sbp.org.pk/m_policy/index.asp', 'estimated', 'confirmed')
on conflict (slug) do nothing;

update public.economic_event_official_dates set consumed = true
  where event_date = '2026-07-08' and series_id in (select id from public.economic_event_series where slug in ('treasury-bill-auction-6m', 'treasury-bill-auction-12m'));
update public.economic_event_official_dates set consumed = true
  where event_date = '2026-08-10' and series_id = (select id from public.economic_event_series where slug = 'sbp-monetary-policy-report');

-- ============================================================
-- 7. generate_next_occurrence() — the core of the rolling calendar. Called
--    by sync_event_actual() immediately after marking an event released.
--    Idempotent (on conflict do nothing on the event slug) — safe even if
--    called twice for the same release.
-- ============================================================

create or replace function public.generate_next_occurrence(p_series_id uuid, p_released_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_series record;
  v_released record;
  v_next_date date;
  v_next_time time;
  v_next_reference_period date;
  v_official record;
  v_title text;
  v_slug text;
begin
  select * into v_series from public.economic_event_series where id = p_series_id;
  if v_series.id is null or v_series.recurrence_type = 'manual' then
    return jsonb_build_object('generated', false, 'reason', 'no_recurrence_rule');
  end if;

  select * into v_released from public.economic_events where id = p_released_event_id;

  if v_series.recurrence_type = 'weekly' then
    v_next_date := v_released.event_date + 7;
    v_next_time := v_series.default_event_time;
    v_title := v_series.event_title_template;

  elsif v_series.recurrence_type = 'monthly_lag' then
    if v_released.reference_period is null then
      return jsonb_build_object('generated', false, 'reason', 'missing_reference_period');
    end if;
    v_next_reference_period := (v_released.reference_period + interval '1 month')::date;
    -- Last day of v_next_reference_period's month = (that month + 1 month) - 1 day.
    v_next_date := (((v_next_reference_period + interval '1 month')::date) - 1) + v_series.recurrence_lag_days;
    if extract(dow from v_next_date) = 6 then v_next_date := v_next_date + 2;
    elsif extract(dow from v_next_date) = 0 then v_next_date := v_next_date + 1;
    end if;
    v_next_time := v_series.default_event_time;
    v_title := replace(v_series.event_title_template, '{month}', trim(to_char(v_next_reference_period, 'FMMonth YYYY')));

  elsif v_series.recurrence_type = 'official_calendar' then
    select * into v_official from public.economic_event_official_dates
      where series_id = p_series_id and consumed = false and event_date > v_released.event_date
      order by event_date asc limit 1;
    if v_official.id is null then
      return jsonb_build_object('generated', false, 'reason', 'official_calendar_exhausted');
    end if;
    v_next_date := v_official.event_date;
    v_next_time := coalesce(v_official.event_time, v_series.default_event_time);
    v_title := v_series.event_title_template;
  else
    return jsonb_build_object('generated', false, 'reason', 'unknown_recurrence_type');
  end if;

  v_slug := v_series.event_slug_prefix || '-' || to_char(v_next_date, 'YYYY-MM-DD');

  insert into public.economic_events (series_id, slug, title, event_date, event_time, previous_value, forecast_value, actual_value, status, importance, description, source_url, data_confidence, date_time_classification, reference_period)
  values (
    v_series.id, v_slug, v_title, v_next_date, v_next_time,
    v_released.actual_value, null, null, 'scheduled', v_series.default_importance, v_series.description, v_series.source_url,
    'estimated',
    case when v_series.recurrence_type = 'official_calendar' then 'confirmed' else 'estimated' end,
    v_next_reference_period
  )
  on conflict (slug) do nothing;

  if v_series.recurrence_type = 'official_calendar' then
    update public.economic_event_official_dates set consumed = true where id = v_official.id;
  end if;

  return jsonb_build_object('generated', true, 'slug', v_slug, 'event_date', v_next_date);
end;
$$;

-- Not granted to anyone directly — called internally by sync_event_actual
-- (and, for manually-released events, would need its own call site; see
-- the Final Report for what's NOT yet wired to call this).

-- ============================================================
-- 8. Wire generate_next_occurrence() into sync_event_actual() — the moment
--    an event is marked released, the next one is created automatically.
-- ============================================================

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
  v_event_id uuid;
  v_series_id uuid;
begin
  select id into v_series_id from public.economic_event_series where slug = p_series_slug;

  update public.economic_events
  set actual_value = p_actual_value,
      status = 'released',
      data_confidence = 'confirmed',
      updated_at = now()
  where series_id = v_series_id
    and event_date = p_event_date
    and status = 'scheduled'
  returning id into v_event_id;

  get diagnostics v_updated_count = row_count;

  if v_updated_count > 0 then
    perform public.generate_next_occurrence(v_series_id, v_event_id);
  end if;

  return v_updated_count > 0;
end;
$$;

revoke all on function public.sync_event_actual(text, date, text) from public;
grant execute on function public.sync_event_actual(text, date, text) to anon, authenticated;
