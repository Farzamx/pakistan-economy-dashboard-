-- Unified Economic Profile — Decision Support Lab Phase 5.5. Single source
-- of truth for every DSL tool's shared inputs, replacing three separate
-- localStorage-only stores (economicIdentity.ts, incomeWealthState.ts,
-- householdAllocation.ts). Same pattern as 0001_user_preferences.sql: one
-- row per user_id, full RLS, manually run in the Supabase SQL editor (no
-- migration framework installed, not auto-applied by anything).
--
-- Column split: typed/CHECK-constrained scalar columns for fields reused
-- verbatim by multiple tools and that drive the completion-% calculation;
-- named jsonb columns only for genuinely variable-shape data
-- (household_allocation, investment_allocation, goals) — a single jsonb
-- blob was rejected because upsertUserEconomicProfile's partial-payload
-- trick (only send changed keys) works cleanly per-column but can't safely
-- express "update just one nested key" in one blob without a
-- read-modify-write race.

create table if not exists public.user_economic_profile (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,

  schema_version integer not null default 1,

  -- Personal
  city text,
  province text check (province in ('punjab', 'sindh', 'kp', 'balochistan')),
  filer_status text check (filer_status in ('filer', 'non-filer', 'unknown')) default 'unknown',

  -- Income
  monthly_income numeric,
  income_type text check (income_type in ('salaried', 'business', 'freelance', 'mixed')),
  current_salary numeric,
  last_raise_pct numeric,
  expected_annual_raise_pct numeric,

  -- Household
  household_size integer,
  monthly_spending numeric,
  household_allocation jsonb not null default '{}'::jsonb,

  -- Housing
  housing_status text check (housing_status in ('own', 'rent', 'family')),
  monthly_housing_cost numeric,

  -- Savings
  current_savings numeric,

  -- Debt
  has_debt boolean not null default false,
  debt_amount numeric,
  debt_interest_rate numeric,

  -- Investments
  current_investment_amount numeric,
  investment_allocation jsonb not null default '{}'::jsonb,
  risk_tolerance text check (risk_tolerance in ('conservative', 'moderate', 'aggressive')),
  owns_investment_property boolean not null default false,
  investment_property_value numeric,

  -- Foreign income
  has_foreign_income boolean not null default false,
  foreign_income_amount numeric,

  -- Goals
  goals jsonb not null default '[]'::jsonb,

  preferred_currency text not null default 'PKR',

  profile_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_economic_profile enable row level security;

create index if not exists user_economic_profile_user_id_idx on public.user_economic_profile(user_id);

create policy "Users can view their own economic profile"
  on public.user_economic_profile for select
  using (auth.uid() = user_id);

create policy "Users can insert their own economic profile"
  on public.user_economic_profile for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own economic profile"
  on public.user_economic_profile for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own economic profile"
  on public.user_economic_profile for delete
  using (auth.uid() = user_id);

create or replace function public.set_user_economic_profile_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists user_economic_profile_set_updated_at on public.user_economic_profile;
create trigger user_economic_profile_set_updated_at
  before update on public.user_economic_profile
  for each row
  execute function public.set_user_economic_profile_updated_at();
