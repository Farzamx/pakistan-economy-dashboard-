-- Profile History — Decision Support Lab Phase 5.5. A throttled (at most
-- once per UTC day per user, enforced client-side) snapshot of the whole
-- Economic Profile whenever it meaningfully changes, distinct from
-- calculation_snapshots (which records tool OUTPUTS, not profile INPUTS).
-- Powers a future profile trend view — this migration only makes the data
-- start accumulating. Same RLS/manual-run convention as the other
-- Phase 5.5 tables.

create table if not exists public.profile_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.profile_history enable row level security;

create index if not exists profile_history_user_id_idx on public.profile_history(user_id, created_at desc);

create policy "Users can view their own profile history"
  on public.profile_history for select
  using (auth.uid() = user_id);

create policy "Users can insert their own profile history"
  on public.profile_history for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own profile history"
  on public.profile_history for delete
  using (auth.uid() = user_id);
