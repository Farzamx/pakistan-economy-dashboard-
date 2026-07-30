-- CPI Monthly Index (Decision Support Lab Phase 2 — Purchasing Power
-- Calculator, 2026-07-31).
--
-- The Purchasing Power / Historical Purchasing Power tool needs a genuine
-- TIME SERIES of the National CPI index level (not just a single month's
-- YoY % change, which is all cpi_category_breakdown / economic_events
-- carry) so it can compute "Rs X from month A is worth Y in month B" via
-- index-ratio deflation: real_value = amount * (index_A / index_B).
--
-- Sourced from PBS's own published SDMX data file — a real, official,
-- machine-readable time series (National CPI, Base 2015-16=100), NOT a
-- fabricated or estimated series:
--   https://www.pbs.gov.pk/wp-content/uploads/2020/07/CPI.xml
-- (this exact URL is what pbs.gov.pk/cpi redirects to). Verified against
-- migration 0043's independently-sourced June 2026 PDF figure — both give
-- 293.47 for June 2026, confirming the two PBS sources agree.
--
-- Honest scope limitation: this SDMX file's own history starts July 2022,
-- not the 2015-16 base period itself — PBS does not publish a longer
-- machine-readable back-series at this URL. The Purchasing Power
-- Calculator's supported year range is therefore July 2022 onward, and the
-- UI discloses this rather than implying deeper history exists. Seeded
-- once here with the 48 real published months (2022-07 through 2026-06);
-- the monthly sync (syncCpiFromPbs.ts) appends each new month going
-- forward via the same upsert.
--
-- Same pattern as every other log/data table in this project: RLS
-- enabled, zero policies, SECURITY DEFINER functions only, write path
-- gated by the existing 'notification_worker' internal secret.

create table if not exists public.cpi_monthly_index (
  id               uuid primary key default gen_random_uuid(),
  observation_date date not null unique,   -- last day of the index month, e.g. 2026-06-30
  index_value      numeric not null,       -- National CPI, Base 2015-16 = 100
  source_url       text not null,
  computed_at      timestamptz not null default now()
);

create index if not exists cpi_monthly_index_obs_idx
  on public.cpi_monthly_index (observation_date desc);

alter table public.cpi_monthly_index enable row level security;
-- No RLS policies — all access via the two SECURITY DEFINER functions below.

-- ── Write RPC — upserts one or more monthly index points ───────────────
create or replace function public.store_cpi_monthly_index(
  p_internal_secret text,
  p_rows jsonb,          -- array of { observation_date, index_value }
  p_source_url text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row jsonb;
  v_count int := 0;
begin
  if not public.check_internal_secret('notification_worker', p_internal_secret) then
    raise exception 'unauthorized';
  end if;

  for v_row in select * from jsonb_array_elements(p_rows)
  loop
    insert into public.cpi_monthly_index (observation_date, index_value, source_url, computed_at)
    values (
      (v_row->>'observation_date')::date,
      (v_row->>'index_value')::numeric,
      p_source_url,
      now()
    )
    on conflict (observation_date) do update set
      index_value = excluded.index_value,
      source_url = excluded.source_url,
      computed_at = now();
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('success', true, 'rowsWritten', v_count);
end;
$$;

revoke all on function public.store_cpi_monthly_index(text, jsonb, text) from public;
grant execute on function public.store_cpi_monthly_index(text, jsonb, text) to anon, authenticated;

-- ── Read RPC — the full series, oldest to newest ────────────────────────
-- Public data, no secret required to read (matches
-- get_latest_cpi_category_breakdown and every other read-only RPC).
create or replace function public.get_cpi_monthly_index_series()
returns table (
  observation_date date,
  index_value numeric,
  source_url text,
  computed_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select observation_date, index_value, source_url, computed_at
  from public.cpi_monthly_index
  order by observation_date asc;
$$;

revoke all on function public.get_cpi_monthly_index_series() from public;
grant execute on function public.get_cpi_monthly_index_series() to anon, authenticated;

-- ── Seed: real published monthly index, July 2022 – June 2026 ──────────
-- Fetched directly from https://www.pbs.gov.pk/wp-content/uploads/2020/07/CPI.xml
-- at implementation time (2026-07-31) — not fabricated or interpolated.
insert into public.cpi_monthly_index (observation_date, index_value, source_url)
values
  ('2022-07-31', 183.35, 'https://www.pbs.gov.pk/wp-content/uploads/2020/07/CPI.xml'),
  ('2022-08-31', 187.84, 'https://www.pbs.gov.pk/wp-content/uploads/2020/07/CPI.xml'),
  ('2022-09-30', 185.68, 'https://www.pbs.gov.pk/wp-content/uploads/2020/07/CPI.xml'),
  ('2022-10-31', 194.42, 'https://www.pbs.gov.pk/wp-content/uploads/2020/07/CPI.xml'),
  ('2022-11-30', 195.89, 'https://www.pbs.gov.pk/wp-content/uploads/2020/07/CPI.xml'),
  ('2022-12-31', 196.86, 'https://www.pbs.gov.pk/wp-content/uploads/2020/07/CPI.xml'),
  ('2023-01-31', 202.53, 'https://www.pbs.gov.pk/wp-content/uploads/2020/07/CPI.xml'),
  ('2023-02-28', 211.28, 'https://www.pbs.gov.pk/wp-content/uploads/2020/07/CPI.xml'),
  ('2023-03-31', 219.14, 'https://www.pbs.gov.pk/wp-content/uploads/2020/07/CPI.xml'),
  ('2023-04-30', 224.41, 'https://www.pbs.gov.pk/wp-content/uploads/2020/07/CPI.xml'),
  ('2023-05-31', 227.96, 'https://www.pbs.gov.pk/wp-content/uploads/2020/07/CPI.xml'),
  ('2023-06-30', 227.37, 'https://www.pbs.gov.pk/wp-content/uploads/2020/07/CPI.xml'),
  ('2023-07-31', 235.23, 'https://www.pbs.gov.pk/wp-content/uploads/2020/07/CPI.xml'),
  ('2023-08-31', 239.27, 'https://www.pbs.gov.pk/wp-content/uploads/2020/07/CPI.xml'),
  ('2023-09-30', 244.05, 'https://www.pbs.gov.pk/wp-content/uploads/2020/07/CPI.xml'),
  ('2023-10-31', 246.69, 'https://www.pbs.gov.pk/wp-content/uploads/2020/07/CPI.xml'),
  ('2023-11-30', 253.15, 'https://www.pbs.gov.pk/wp-content/uploads/2020/07/CPI.xml'),
  ('2023-12-31', 255.24, 'https://www.pbs.gov.pk/wp-content/uploads/2020/07/CPI.xml'),
  ('2024-01-31', 259.92, 'https://www.pbs.gov.pk/wp-content/uploads/2020/07/CPI.xml'),
  ('2024-02-29', 260.01, 'https://www.pbs.gov.pk/wp-content/uploads/2020/07/CPI.xml'),
  ('2024-03-31', 264.46, 'https://www.pbs.gov.pk/wp-content/uploads/2020/07/CPI.xml'),
  ('2024-04-30', 263.32, 'https://www.pbs.gov.pk/wp-content/uploads/2020/07/CPI.xml'),
  ('2024-05-31', 254.78, 'https://www.pbs.gov.pk/wp-content/uploads/2020/07/CPI.xml'),
  ('2024-06-30', 255.94, 'https://www.pbs.gov.pk/wp-content/uploads/2020/07/CPI.xml'),
  ('2024-07-31', 261.32, 'https://www.pbs.gov.pk/wp-content/uploads/2020/07/CPI.xml'),
  ('2024-08-31', 262.32, 'https://www.pbs.gov.pk/wp-content/uploads/2020/07/CPI.xml'),
  ('2024-09-30', 260.96, 'https://www.pbs.gov.pk/wp-content/uploads/2020/07/CPI.xml'),
  ('2024-10-31', 264.17, 'https://www.pbs.gov.pk/wp-content/uploads/2020/07/CPI.xml'),
  ('2024-11-30', 265.46, 'https://www.pbs.gov.pk/wp-content/uploads/2020/07/CPI.xml'),
  ('2024-12-31', 265.63, 'https://www.pbs.gov.pk/wp-content/uploads/2020/07/CPI.xml'),
  ('2025-01-31', 266.17, 'https://www.pbs.gov.pk/wp-content/uploads/2020/07/CPI.xml'),
  ('2025-02-28', 263.95, 'https://www.pbs.gov.pk/wp-content/uploads/2020/07/CPI.xml'),
  ('2025-03-31', 266.29, 'https://www.pbs.gov.pk/wp-content/uploads/2020/07/CPI.xml'),
  ('2025-04-30', 264.06, 'https://www.pbs.gov.pk/wp-content/uploads/2020/07/CPI.xml'),
  ('2025-05-31', 263.60, 'https://www.pbs.gov.pk/wp-content/uploads/2020/07/CPI.xml'),
  ('2025-06-30', 264.22, 'https://www.pbs.gov.pk/wp-content/uploads/2020/07/CPI.xml'),
  ('2025-07-31', 271.94, 'https://www.pbs.gov.pk/wp-content/uploads/2020/07/CPI.xml'),
  ('2025-08-31', 270.35, 'https://www.pbs.gov.pk/wp-content/uploads/2020/07/CPI.xml'),
  ('2025-09-30', 276.01, 'https://www.pbs.gov.pk/wp-content/uploads/2020/07/CPI.xml'),
  ('2025-10-31', 280.66, 'https://www.pbs.gov.pk/wp-content/uploads/2020/07/CPI.xml'),
  ('2025-11-30', 281.78, 'https://www.pbs.gov.pk/wp-content/uploads/2020/07/CPI.xml'),
  ('2025-12-31', 280.53, 'https://www.pbs.gov.pk/wp-content/uploads/2020/07/CPI.xml'),
  ('2026-01-31', 281.62, 'https://www.pbs.gov.pk/wp-content/uploads/2020/07/CPI.xml'),
  ('2026-02-28', 282.39, 'https://www.pbs.gov.pk/wp-content/uploads/2020/07/CPI.xml'),
  ('2026-03-31', 285.73, 'https://www.pbs.gov.pk/wp-content/uploads/2020/07/CPI.xml'),
  ('2026-04-30', 292.81, 'https://www.pbs.gov.pk/wp-content/uploads/2020/07/CPI.xml'),
  ('2026-05-31', 294.34, 'https://www.pbs.gov.pk/wp-content/uploads/2020/07/CPI.xml'),
  ('2026-06-30', 293.47, 'https://www.pbs.gov.pk/wp-content/uploads/2020/07/CPI.xml')
on conflict (observation_date) do nothing;
