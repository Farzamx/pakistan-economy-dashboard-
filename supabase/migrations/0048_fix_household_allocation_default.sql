-- Fixes household_allocation's malformed default (Phase 5.5 follow-up).
--
-- 0045 set `household_allocation jsonb not null default '{}'::jsonb`, but
-- the app's HouseholdAllocationShape is { mode, monthlyBudget, allocation }
-- — a bare {} has none of those keys. Every application writer
-- (setHouseholdAllocationValue, replaceHouseholdAllocation,
-- BudgetAllocationCalculator, PersonalInflationCalculator, the legacy
-- migration seed) always sends the full shape atomically, so the only way
-- a row ends up with a bare {} is this column default firing on a save
-- that never touched the field (e.g. a user who only filled the 5
-- mandatory fields). Confirmed directly against production: such a row
-- has household_allocation = {} stored right now. That value survives
-- profileCompletion.ts's `Object.keys(p.householdAllocation.allocation)`
-- as `undefined`, throwing client-side after hydration once the profile
-- loads (the app's fromRow() mapping is separately hardened to tolerate
-- this regardless of what's in the DB — this migration stops new rows
-- from being born malformed and cleans up existing ones).

alter table public.user_economic_profile
  alter column household_allocation set default '{"mode": "percent", "monthlyBudget": 0, "allocation": {}}'::jsonb;

update public.user_economic_profile
set household_allocation = '{"mode": "percent", "monthlyBudget": 0, "allocation": {}}'::jsonb
where household_allocation is null
   or not (household_allocation ? 'allocation');
