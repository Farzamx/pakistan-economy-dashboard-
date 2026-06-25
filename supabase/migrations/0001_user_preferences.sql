-- Dashboard Preference System — first per-user public-schema table in this
-- project (everything before this was auth.users only, via Supabase Auth
-- directly). No migration framework is installed and no service-role key
-- is available to this app, so this file is the source of truth to run
-- manually in the Supabase SQL editor — it is not auto-applied by anything.

create table if not exists public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  favorite_indicators jsonb not null default '[]'::jsonb,
  dashboard_layout jsonb not null default '{}'::jsonb,
  preferred_province text check (preferred_province in ('punjab', 'sindh', 'kp', 'balochistan')),
  preferred_theme text check (preferred_theme in ('dark', 'light')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

-- One row per user, looked up by user_id on every read.
create index if not exists user_preferences_user_id_idx on public.user_preferences(user_id);

-- Full RLS: a user can only ever see or touch their own row. There is no
-- policy granting access to any other user's row under any condition, and
-- no broader "authenticated" or "anon" read policy exists.
create policy "Users can view their own preferences"
  on public.user_preferences for select
  using (auth.uid() = user_id);

create policy "Users can insert their own preferences"
  on public.user_preferences for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own preferences"
  on public.user_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own preferences"
  on public.user_preferences for delete
  using (auth.uid() = user_id);

-- Keep updated_at accurate on every write without relying on the client to
-- set it correctly.
create or replace function public.set_user_preferences_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists user_preferences_set_updated_at on public.user_preferences;
create trigger user_preferences_set_updated_at
  before update on public.user_preferences
  for each row
  execute function public.set_user_preferences_updated_at();
