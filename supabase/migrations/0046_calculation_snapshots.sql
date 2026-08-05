-- Calculation Snapshots — Decision Support Lab Phase 5.5. Every report
-- download persists one row here (tool_id + the inputs/assumptions/outputs
-- that produced it), making reports reproducible and, as a side effect,
-- giving Health Score a place to accumulate history (tool_id =
-- 'health-score' rows ordered by created_at). Same RLS/manual-run
-- convention as 0001_user_preferences.sql / 0045_user_economic_profile.sql.

create table if not exists public.calculation_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tool_id text not null,
  profile_schema_version integer,
  inputs jsonb not null default '{}'::jsonb,
  assumptions jsonb not null default '{}'::jsonb,
  outputs jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.calculation_snapshots enable row level security;

create index if not exists calculation_snapshots_user_tool_idx on public.calculation_snapshots(user_id, tool_id, created_at desc);

create policy "Users can view their own calculation snapshots"
  on public.calculation_snapshots for select
  using (auth.uid() = user_id);

create policy "Users can insert their own calculation snapshots"
  on public.calculation_snapshots for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own calculation snapshots"
  on public.calculation_snapshots for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own calculation snapshots"
  on public.calculation_snapshots for delete
  using (auth.uid() = user_id);
