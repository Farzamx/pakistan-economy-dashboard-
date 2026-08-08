-- Institutional Data Core, Wave 1 (SBP slice) — Priority 1 permanent fix.
--
-- Context: easydata.sbp.org.pk is fronted by Cloudflare bot-management,
-- which challenges every request from Vercel, GitHub Actions, AND Supabase
-- Edge Functions (confirmed by direct testing — see cron_run_log job
-- "network-diag-probe" history). All three are shared/multi-tenant IP
-- pools. The user's own laptop has always reached SBP EasyData successfully.
--
-- Fix: stop calling SBP live at render time. A local ingestion runner
-- (scripts/ingestSbp.ts), scheduled via Windows Task Scheduler on a machine
-- that can actually reach SBP, fetches all 20 indicators and writes here.
-- The production website (src/lib/data/sbp.ts) reads ONLY from
-- canonical_observations at render time — never SBP EasyData directly.
--
-- Two tables, deliberately provider-agnostic (not SBP-specific) so future
-- providers (PBS, World Bank, FRED, Yahoo Finance) reuse this schema
-- without a migration:
--
--   raw_observations       Append-only ledger. One row per provider-reported
--                           value for a given indicator+period. Never
--                           UPDATEd/DELETEd — a revision is a NEW row, the
--                           old one stays for audit. ingest_raw_observation()
--                           skips inserting when the value is unchanged from
--                           the most recent row for that period (idempotent,
--                           no daily-rerun bloat).
--
--   canonical_observations  "Current best answer" per indicator+period.
--                           Never UPDATEd in place when a revision arrives —
--                           the superseded row gets `superseded_at` set and a
--                           new row is inserted (ALFRED-style vintaging, not
--                           FRED-style overwrite). Exactly one row per
--                           (indicator_key, observation_period) has
--                           superseded_at is null at any time — enforced by
--                           the partial unique index below.
--
-- Same security pattern as every other internal table in this project
-- (source_health_log, cron_run_log, data_integrity_alerts): RLS enabled,
-- zero policies, all writes gated by check_internal_secret('notification_worker', ...)
-- (migration 0011) so no new secret is needed — the local ingestion runner
-- reuses the existing NOTIFICATION_WORKER_SECRET env var. Reads are public
-- RPCs (no secret) because this is the same data already shown to every
-- visitor today — matching get_source_health_summary/get_cron_run_history's
-- own precedent of ungated reads.

create table if not exists public.raw_observations (
  id                  uuid primary key default gen_random_uuid(),
  indicator_key       text not null,        -- provider-qualified, e.g. "sbp:moneySupplyM2"
  provider            text not null,        -- "sbp-easydata" | ...
  observation_period  date not null,        -- the period this value describes
  value               numeric not null,
  unit                text not null,
  series_name         text,                 -- official series name as reported by the provider
  raw_payload         jsonb,                 -- verbatim provider response fragment, for audit
  ingested_at         timestamptz not null default now(),
  ingestion_run_id    uuid                   -- which ingestion run produced this row
);

create index if not exists raw_observations_lookup_idx
  on public.raw_observations (indicator_key, provider, observation_period, ingested_at desc);

alter table public.raw_observations enable row level security;
-- No RLS policies — append-only ledger, accessible only via the
-- SECURITY DEFINER RPC below. There is deliberately no UPDATE/DELETE path
-- for this table anywhere in the schema.

create table if not exists public.canonical_observations (
  id                          uuid primary key default gen_random_uuid(),
  indicator_key               text not null,
  observation_period          date not null,
  value                        numeric not null,
  unit                         text not null,
  series_name                  text,
  source_provider              text not null,       -- which provider "won" this period
  source_raw_observation_id    uuid references public.raw_observations(id),
  vintage                      timestamptz not null default now(),  -- when this became canonical for this period
  superseded_at                timestamptz,          -- null = currently the best-known value for this period
  confidence                   text not null default 'official',
  created_at                   timestamptz not null default now()
);

-- Exactly one "current" row per (indicator_key, observation_period).
create unique index if not exists canonical_observations_current_idx
  on public.canonical_observations (indicator_key, observation_period)
  where superseded_at is null;

create index if not exists canonical_observations_history_idx
  on public.canonical_observations (indicator_key, observation_period desc)
  where superseded_at is null;

alter table public.canonical_observations enable row level security;
-- No RLS policies — all access via SECURITY DEFINER RPCs below.

-- ── Write RPC 1 — append to the raw ledger ──────────────────────────────────
-- Skips the insert (returns inserted:false) when the most recent raw row for
-- this exact (indicator_key, provider, observation_period) already carries
-- the same value+unit — the "smart update" behaviour: re-running ingestion
-- on unchanged data never bloats the ledger or creates duplicate rows.
create or replace function public.ingest_raw_observation(
  p_internal_secret     text,
  p_indicator_key       text,
  p_provider            text,
  p_observation_period  date,
  p_value               numeric,
  p_unit                text,
  p_series_name         text default null,
  p_raw_payload         jsonb default null,
  p_ingestion_run_id    uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_id    uuid;
  v_existing_value numeric;
  v_existing_unit  text;
  v_new_id         uuid;
begin
  if not public.check_internal_secret('notification_worker', p_internal_secret) then
    raise exception 'unauthorized';
  end if;

  select id, value, unit into v_existing_id, v_existing_value, v_existing_unit
    from public.raw_observations
    where indicator_key = p_indicator_key
      and provider = p_provider
      and observation_period = p_observation_period
    order by ingested_at desc
    limit 1;

  if v_existing_id is not null and v_existing_value = p_value and v_existing_unit = p_unit then
    return jsonb_build_object('success', true, 'inserted', false, 'raw_observation_id', v_existing_id);
  end if;

  insert into public.raw_observations (
    indicator_key, provider, observation_period, value, unit, series_name, raw_payload, ingestion_run_id
  ) values (
    p_indicator_key, p_provider, p_observation_period, p_value, p_unit, p_series_name, p_raw_payload, p_ingestion_run_id
  )
  returning id into v_new_id;

  return jsonb_build_object('success', true, 'inserted', true, 'raw_observation_id', v_new_id);
end;
$$;

revoke all on function public.ingest_raw_observation(text, text, text, date, numeric, text, text, jsonb, uuid) from public;
grant execute on function public.ingest_raw_observation(text, text, text, date, numeric, text, text, jsonb, uuid) to anon, authenticated;

-- ── Write RPC 2 — resolve the canonical value for a period ─────────────────
-- No-op (changed:false) when the value is unchanged from the current
-- canonical row. Otherwise supersedes the old row (if any) and inserts a
-- new one — never an in-place UPDATE of value, preserving full vintage
-- history per period.
create or replace function public.resolve_canonical_observation(
  p_internal_secret            text,
  p_indicator_key              text,
  p_observation_period         date,
  p_value                      numeric,
  p_unit                       text,
  p_source_provider            text,
  p_source_raw_observation_id  uuid default null,
  p_series_name                text default null,
  p_confidence                 text default 'official'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_id    uuid;
  v_current_value numeric;
  v_current_unit  text;
  v_new_id        uuid;
begin
  if not public.check_internal_secret('notification_worker', p_internal_secret) then
    raise exception 'unauthorized';
  end if;

  select id, value, unit into v_current_id, v_current_value, v_current_unit
    from public.canonical_observations
    where indicator_key = p_indicator_key
      and observation_period = p_observation_period
      and superseded_at is null;

  if v_current_id is not null and v_current_value = p_value and v_current_unit = p_unit then
    return jsonb_build_object('success', true, 'changed', false, 'canonical_id', v_current_id);
  end if;

  if v_current_id is not null then
    update public.canonical_observations set superseded_at = now() where id = v_current_id;
  end if;

  insert into public.canonical_observations (
    indicator_key, observation_period, value, unit, series_name,
    source_provider, source_raw_observation_id, confidence
  ) values (
    p_indicator_key, p_observation_period, p_value, p_unit, p_series_name,
    p_source_provider, p_source_raw_observation_id, p_confidence
  )
  returning id into v_new_id;

  return jsonb_build_object('success', true, 'changed', true, 'canonical_id', v_new_id, 'previous_id', v_current_id);
end;
$$;

revoke all on function public.resolve_canonical_observation(text, text, date, numeric, text, text, uuid, text, text) from public;
grant execute on function public.resolve_canonical_observation(text, text, date, numeric, text, text, uuid, text, text) to anon, authenticated;

-- ── Read RPC 1 — full (or capped) history for one indicator ────────────────
-- Ordered newest-first; callers reverse to oldest-first if that's their
-- convention (src/lib/data/sbp.ts's SbpSeries.history is oldest-first).
-- Ungated (no secret) — this is the same public data already rendered on
-- every page today, same precedent as get_source_health_summary.
create or replace function public.get_canonical_observation_history(
  p_indicator_key text,
  p_limit         int default 500
)
returns table (
  observation_period date,
  value               numeric,
  unit                text,
  series_name         text,
  source_provider     text,
  vintage             timestamptz,
  confidence          text
)
language sql
security definer
set search_path = public
stable
as $$
  select observation_period, value, unit, series_name, source_provider, vintage, confidence
  from public.canonical_observations
  where indicator_key = p_indicator_key
    and superseded_at is null
  order by observation_period desc
  limit p_limit;
$$;

revoke all on function public.get_canonical_observation_history(text, int) from public;
grant execute on function public.get_canonical_observation_history(text, int) to anon, authenticated;

-- ── Read RPC 2 — one row per indicator, its latest canonical period ────────
-- Provider-independent freshness surface: does NOT re-query SBP (which is
-- itself Cloudflare-blocked from every shared cloud network tested) — it
-- only reports what this platform has actually ingested and when. The
-- System Health dashboard computes staleness by comparing
-- latest_observation_period / vintage against each indicator's own declared
-- cadence (see src/lib/data/sbp.ts's per-indicator Frequency).
create or replace function public.get_canonical_freshness_summary()
returns table (
  indicator_key             text,
  latest_observation_period date,
  vintage                   timestamptz,
  source_provider           text
)
language sql
security definer
set search_path = public
stable
as $$
  select c.indicator_key, c.observation_period, c.vintage, c.source_provider
  from public.canonical_observations c
  where c.superseded_at is null
    and c.observation_period = (
      select max(c2.observation_period)
      from public.canonical_observations c2
      where c2.indicator_key = c.indicator_key
        and c2.superseded_at is null
    );
$$;

revoke all on function public.get_canonical_freshness_summary() from public;
grant execute on function public.get_canonical_freshness_summary() to anon, authenticated;
