-- Economic Calendar Phase 2A — first persistence layer for the Economic
-- Calendar feature (Phase 1 was pure static mock data in
-- src/data/economicCalendarEvents.ts). Like 0001_user_preferences.sql, no
-- migration framework is installed and no service-role key is available to
-- this app, so this file is the source of truth to run manually in the
-- Supabase SQL editor — it is not auto-applied by anything. Run this file,
-- then 0003_economic_calendar_seed.sql, in order.
--
-- Four tables, matching the Phase 2 architecture plan:
--   economic_event_series        the recurring TEMPLATE (one row per release
--                                 type — "SBP MPC", "CPI Inflation Release")
--   economic_events               each real OCCURRENCE of a series
--   economic_event_impact_stats   reserved for a later phase (Event Impact
--                                 Intelligence) — created now so its FK
--                                 target is stable, deliberately left empty
--   user_event_subscriptions      reserved for a later phase (email/push
--                                 alerts) — schema only, no sender exists yet
--
-- economic_event_series and economic_events are public reference data, not
-- user data — RLS is enabled with a public SELECT policy and deliberately
-- NO insert/update/delete policy for anon or authenticated. Writes happen
-- the same way BUDGET_HISTORICAL/PROVINCIAL_SEO_PAGES are maintained today:
-- a manual process (here, the SQL editor), not a public write path.

create table if not exists public.economic_event_series (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text not null check (category in ('Inflation','Monetary Policy','External Sector','Fiscal Sector','Real Economy','Financial Markets','Global Events')),
  default_importance text not null check (default_importance in ('High','Medium','Low')),
  cadence text not null check (cadence in ('weekly','monthly','quarterly','annual','irregular')),
  source_name text not null,
  source_url text,
  automation_tier text not null check (automation_tier in ('automated','semi_automated','manual')),
  reliability_score smallint not null check (reliability_score between 1 and 5),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.economic_events (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references public.economic_event_series(id) on delete cascade,
  slug text not null unique,
  title text not null,
  event_date date not null,
  event_time time,
  previous_value text,
  forecast_value text,
  actual_value text,
  status text not null default 'scheduled' check (status in ('scheduled','released','postponed','cancelled')),
  importance text not null check (importance in ('High','Medium','Low')),
  description text,
  source_url text,
  data_confidence text not null default 'estimated' check (data_confidence in ('confirmed','estimated')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists economic_events_date_idx on public.economic_events(event_date);
create index if not exists economic_events_series_idx on public.economic_events(series_id);

create table if not exists public.economic_event_impact_stats (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references public.economic_event_series(id) on delete cascade,
  metric text not null,
  value numeric,
  sample_size int,
  computed_at timestamptz not null default now()
);
create index if not exists economic_event_impact_stats_series_idx on public.economic_event_impact_stats(series_id);

create table if not exists public.user_event_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  series_id uuid references public.economic_event_series(id) on delete cascade,
  category text check (category in ('Inflation','Monetary Policy','External Sector','Fiscal Sector','Real Economy','Financial Markets','Global Events')),
  min_importance text not null default 'High' check (min_importance in ('High','Medium','Low')),
  channel text not null default 'email' check (channel in ('email','push')),
  created_at timestamptz not null default now(),
  constraint user_event_subscriptions_target check (series_id is not null or category is not null),
  unique (user_id, series_id, category)
);
create index if not exists user_event_subscriptions_user_idx on public.user_event_subscriptions(user_id);

alter table public.economic_event_series enable row level security;
alter table public.economic_events enable row level security;
alter table public.economic_event_impact_stats enable row level security;
alter table public.user_event_subscriptions enable row level security;

-- Public reference data — readable by anyone (anon included), matching how
-- every other indicator on this dashboard is publicly viewable.
create policy "Anyone can read event series" on public.economic_event_series for select using (true);
create policy "Anyone can read events" on public.economic_events for select using (true);
create policy "Anyone can read impact stats" on public.economic_event_impact_stats for select using (true);

-- User subscriptions: own-row only — identical ownership pattern to
-- user_preferences in 0001. Not used by any code yet (Phase 2A explicitly
-- does not build alert sending); created now purely so Phase 3 has a
-- stable table to build against without another migration.
create policy "Users can view their own event subscriptions"
  on public.user_event_subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own event subscriptions"
  on public.user_event_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own event subscriptions"
  on public.user_event_subscriptions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own event subscriptions"
  on public.user_event_subscriptions for delete
  using (auth.uid() = user_id);
