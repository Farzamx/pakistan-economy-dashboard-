-- CPI Category Breakdown (Personal Inflation Calculator, 2026-07-25).
--
-- PBS's Monthly Inflation Report PDF — the same PDF syncCpiFromPbs.ts
-- already fetches every month for the headline CPI/Core figures — contains
-- a full "Table 1: Consumer Price Index (National) by Group of Commodities
-- and Services" breakdown: 12 official expenditure groups, each with its
-- basket weight (%) and YoY % change. This is the REAL, authoritative
-- category-level data the Personal Inflation Calculator needs — not a
-- synthetic or hardcoded split. See syncCpiFromPbs.ts's new
-- parseCpiCategoryTable() for the extraction logic (same PDF fetch, no new
-- network call).
--
-- Twelve groups, not the calculator brief's ad hoc 14-category suggestion:
-- PBS's own official basket structure bundles Housing/Water/Electricity/
-- Gas/Fuels into ONE group (23.63% combined weight) rather than five
-- separate ones — inventing a synthetic 5-way split would mean fabricating
-- sub-weights PBS doesn't publish as a single coherent figure. Using PBS's
-- real 12-group taxonomy keeps every number traceable to an official
-- source, consistent with this project's standing rule against fabricated
-- data.
--
-- Same pattern as every other log/data table in this project: RLS enabled,
-- zero policies, SECURITY DEFINER functions only, write path gated by the
-- existing 'notification_worker' internal secret (check_internal_secret,
-- migration 0011) — no new secret, no new security model.

create table if not exists public.cpi_category_breakdown (
  id               uuid primary key default gen_random_uuid(),
  observation_date date not null,          -- last day of the CPI reference month, e.g. 2026-06-30
  group_no         int not null,           -- PBS's own numbering, 1-12 (stable basket order)
  group_name       text not null,          -- PBS's own group label, verbatim
  weight_pct       numeric not null,       -- basket weight, National, out of 100
  yoy_pct_change   numeric not null,       -- % change vs the same month last year (National)
  source_pdf_url   text not null,
  computed_at      timestamptz not null default now(),
  unique (observation_date, group_no)
);

create index if not exists cpi_category_breakdown_obs_idx
  on public.cpi_category_breakdown (observation_date desc);

alter table public.cpi_category_breakdown enable row level security;
-- No RLS policies — all access via the two SECURITY DEFINER functions below.

-- ── Write RPC — replaces the full 12-row set for one observation month ─────
-- Upsert on (observation_date, group_no): a re-run for the same month
-- (retry, manual re-trigger) overwrites cleanly rather than duplicating.
create or replace function public.store_cpi_category_breakdown(
  p_internal_secret text,
  p_observation_date date,
  p_groups jsonb,          -- array of { group_no, group_name, weight_pct, yoy_pct_change }
  p_source_pdf_url text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group jsonb;
  v_count int := 0;
begin
  if not public.check_internal_secret('notification_worker', p_internal_secret) then
    raise exception 'unauthorized';
  end if;

  for v_group in select * from jsonb_array_elements(p_groups)
  loop
    insert into public.cpi_category_breakdown (
      observation_date, group_no, group_name, weight_pct, yoy_pct_change, source_pdf_url, computed_at
    ) values (
      p_observation_date,
      (v_group->>'group_no')::int,
      v_group->>'group_name',
      (v_group->>'weight_pct')::numeric,
      (v_group->>'yoy_pct_change')::numeric,
      p_source_pdf_url,
      now()
    )
    on conflict (observation_date, group_no) do update set
      group_name = excluded.group_name,
      weight_pct = excluded.weight_pct,
      yoy_pct_change = excluded.yoy_pct_change,
      source_pdf_url = excluded.source_pdf_url,
      computed_at = now();
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('success', true, 'groupsWritten', v_count);
end;
$$;

revoke all on function public.store_cpi_category_breakdown(text, date, jsonb, text) from public;
grant execute on function public.store_cpi_category_breakdown(text, date, jsonb, text) to anon, authenticated;

-- ── Read RPC — the latest observation month's full 12-group set ───────────
-- Public data, no secret required to read (matches get_source_health_summary
-- and every other read-only summary RPC in this project).
create or replace function public.get_latest_cpi_category_breakdown()
returns table (
  observation_date date,
  group_no int,
  group_name text,
  weight_pct numeric,
  yoy_pct_change numeric,
  source_pdf_url text,
  computed_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select observation_date, group_no, group_name, weight_pct, yoy_pct_change, source_pdf_url, computed_at
  from public.cpi_category_breakdown
  where observation_date = (select max(observation_date) from public.cpi_category_breakdown)
  order by group_no;
$$;

revoke all on function public.get_latest_cpi_category_breakdown() from public;
grant execute on function public.get_latest_cpi_category_breakdown() to anon, authenticated;

-- ── Seed: live-verified June 2026 National breakdown ───────────────────────
-- Fetched and parsed directly from the real PBS PDF at implementation time
-- (https://www.pbs.gov.pk/wp-content/uploads/2020/07/Monthly-Review-June-2026.pdf,
-- "Table 1: Consumer Price Index (National) by Group of Commodities and
-- Services", the "June 2026 Over June 25" column) — not fabricated. Weights
-- sum to 100.00; General YoY (11.07%) matches the headline CPI figure
-- already live in economic_events for the same period. The monthly sync
-- (syncCpiFromPbs.ts) supersedes this row automatically from the next PBS
-- release onward via the upsert above.
insert into public.cpi_category_breakdown (observation_date, group_no, group_name, weight_pct, yoy_pct_change, source_pdf_url)
values
  ('2026-06-30', 1,  'Food & Non-Alcoholic Beverages',                    34.58, 9.38,  'https://www.pbs.gov.pk/wp-content/uploads/2020/07/Monthly-Review-June-2026.pdf'),
  ('2026-06-30', 2,  'Alcoholic Beverages & Tobacco',                      1.02, 3.32,  'https://www.pbs.gov.pk/wp-content/uploads/2020/07/Monthly-Review-June-2026.pdf'),
  ('2026-06-30', 3,  'Clothing & Footwear',                                8.60, 9.30,  'https://www.pbs.gov.pk/wp-content/uploads/2020/07/Monthly-Review-June-2026.pdf'),
  ('2026-06-30', 4,  'Housing, Water, Electricity, Gas & Fuels',          23.63, 15.50, 'https://www.pbs.gov.pk/wp-content/uploads/2020/07/Monthly-Review-June-2026.pdf'),
  ('2026-06-30', 5,  'Furnishing & Household Equipment Maintenance',       4.10, 5.94,  'https://www.pbs.gov.pk/wp-content/uploads/2020/07/Monthly-Review-June-2026.pdf'),
  ('2026-06-30', 6,  'Health',                                             2.79, 7.59,  'https://www.pbs.gov.pk/wp-content/uploads/2020/07/Monthly-Review-June-2026.pdf'),
  ('2026-06-30', 7,  'Transport',                                          5.91, 25.72, 'https://www.pbs.gov.pk/wp-content/uploads/2020/07/Monthly-Review-June-2026.pdf'),
  ('2026-06-30', 8,  'Communication',                                      2.21, 0.86,  'https://www.pbs.gov.pk/wp-content/uploads/2020/07/Monthly-Review-June-2026.pdf'),
  ('2026-06-30', 9,  'Recreation & Culture',                               1.59, 0.09,  'https://www.pbs.gov.pk/wp-content/uploads/2020/07/Monthly-Review-June-2026.pdf'),
  ('2026-06-30', 10, 'Education',                                          3.79, 8.30,  'https://www.pbs.gov.pk/wp-content/uploads/2020/07/Monthly-Review-June-2026.pdf'),
  ('2026-06-30', 11, 'Restaurants & Hotels',                                6.92, 5.38,  'https://www.pbs.gov.pk/wp-content/uploads/2020/07/Monthly-Review-June-2026.pdf'),
  ('2026-06-30', 12, 'Miscellaneous',                                      4.87, 12.21, 'https://www.pbs.gov.pk/wp-content/uploads/2020/07/Monthly-Review-June-2026.pdf')
on conflict (observation_date, group_no) do nothing;
