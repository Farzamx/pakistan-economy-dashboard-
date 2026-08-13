-- Phase 4 — Observation Contract & Provenance (additive only).
--
-- Context: migration 0050 established the raw/canonical ledger. It never
-- recorded *when* PEIC learned of a value, *what timing metadata the source
-- itself reports* (if any), or *which native series id* on the provider's
-- side produced it — canonical_observations was silent on all of that beyond
-- source_provider/source_raw_observation_id. This migration adds six
-- nullable columns to canonical_observations so ingestion CAN record that
-- information going forward, without requiring it and without touching a
-- single existing row.
--
-- Deliberately additive only:
--   - All six columns are nullable. NULL means "not recorded for this
--     observation" — never backfilled, inferred, or estimated for rows
--     written before this migration, and never invented for a period where
--     the source genuinely doesn't expose the information. Concretely: SBP
--     EasyData's /data endpoint returns Observation Date/Value/Unit/Series
--     Name only (see src/lib/data/sbp.ts's SbpApiResponse/SbpSeries) — no
--     release date, no "source last updated" timestamp — so SBP-sourced
--     rows leave release_date/source_updated_at NULL by design, not by
--     oversight, indefinitely, until a provider that genuinely exposes
--     those actually does.
--   - No existing row is UPDATEd by this migration.
--   - Revision/vintage behaviour (superseded_at, the partial unique index on
--     (indicator_key, observation_period) where superseded_at is null, the
--     unchanged-value short-circuit in resolve_canonical_observation) is
--     untouched. A row with new provenance but the same value/unit is still
--     "unchanged" — provenance never triggers a new vintage on its own.
--   - Kept provider-agnostic: no SBP-specific column, no enum/CHECK
--     constraint on quality_status — other providers will have different
--     quality vocabularies later; this stays free text.
--
-- resolve_canonical_observation() gains six new trailing parameters, every
-- one optional (default null), so the existing caller (scripts/ingestSbp.ts,
-- which calls this RPC with named parameters) keeps working unmodified in
-- shape — it's updated in this same change to actually supply the values it
-- now has, but a caller that didn't would get identical behaviour to before.
-- The function is DROPped and recreated rather than just CREATE OR REPLACEd:
-- Postgres treats a changed parameter list as a distinct overload rather
-- than a replacement of the old one, so leaving the old 9-parameter
-- signature in place would leave two ambiguous overloads of the same name.
-- ingest_raw_observation, get_canonical_observation_history and
-- get_canonical_freshness_summary are untouched — this migration's scope is
-- the canonical write path's provenance columns only.

alter table public.canonical_observations
  add column if not exists release_date      date,
  add column if not exists source_updated_at timestamptz,
  add column if not exists fetched_at         timestamptz,
  add column if not exists quality_status     text,
  add column if not exists source_series_id   text,
  add column if not exists source_reference   jsonb;

comment on column public.canonical_observations.release_date is
  'Date the source publisher designates as this observation''s official release date, only when the source genuinely exposes one. NULL means not recorded -- never inferred from ingestion time or the economic calendar.';
comment on column public.canonical_observations.source_updated_at is
  'Timestamp the source itself reports as its own last-updated time for this value, only when exposed. NULL means the source does not expose this (true for SBP EasyData today).';
comment on column public.canonical_observations.fetched_at is
  'When PEIC''s ingestion pipeline retrieved this value from the source. Distinct from `vintage` (when it became the canonical answer for this period) and `created_at` (row insert time), both of which already existed.';
comment on column public.canonical_observations.quality_status is
  'Free-text status describing the source''s own data-quality/publication designation for this value (e.g. "official"). Provider-defined vocabulary -- deliberately not constrained by an enum/CHECK so future providers are not forced into SBP''s vocabulary.';
comment on column public.canonical_observations.source_series_id is
  'The provider''s own native series identifier (e.g. SBP EasyData''s series key, "TS_GP_..."), distinct from this platform''s internal indicator_key.';
comment on column public.canonical_observations.source_reference is
  'Structured, non-secret provenance the provider exposes (e.g. the public endpoint that produced this value). Must never contain an API key or an authenticated URL -- enforced at the call site, not by this column.';

-- ── resolve_canonical_observation — extended with optional provenance ──────
drop function if exists public.resolve_canonical_observation(text, text, date, numeric, text, text, uuid, text, text);

create function public.resolve_canonical_observation(
  p_internal_secret            text,
  p_indicator_key              text,
  p_observation_period         date,
  p_value                      numeric,
  p_unit                       text,
  p_source_provider            text,
  p_source_raw_observation_id  uuid default null,
  p_series_name                text default null,
  p_confidence                 text default 'official',
  p_release_date               date default null,
  p_source_updated_at          timestamptz default null,
  p_fetched_at                 timestamptz default null,
  p_quality_status             text default null,
  p_source_series_id           text default null,
  p_source_reference           jsonb default null
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

  -- Unchanged-value short-circuit is untouched by this migration: provenance
  -- fields alone (e.g. now having a fetched_at where the existing row has
  -- none) never trigger a new vintage. Only a genuine value/unit change does.
  if v_current_id is not null and v_current_value = p_value and v_current_unit = p_unit then
    return jsonb_build_object('success', true, 'changed', false, 'canonical_id', v_current_id);
  end if;

  if v_current_id is not null then
    update public.canonical_observations set superseded_at = now() where id = v_current_id;
  end if;

  insert into public.canonical_observations (
    indicator_key, observation_period, value, unit, series_name,
    source_provider, source_raw_observation_id, confidence,
    release_date, source_updated_at, fetched_at, quality_status,
    source_series_id, source_reference
  ) values (
    p_indicator_key, p_observation_period, p_value, p_unit, p_series_name,
    p_source_provider, p_source_raw_observation_id, p_confidence,
    p_release_date, p_source_updated_at, p_fetched_at, p_quality_status,
    p_source_series_id, p_source_reference
  )
  returning id into v_new_id;

  return jsonb_build_object('success', true, 'changed', true, 'canonical_id', v_new_id, 'previous_id', v_current_id);
end;
$$;

revoke all on function public.resolve_canonical_observation(text, text, date, numeric, text, text, uuid, text, text, date, timestamptz, timestamptz, text, text, jsonb) from public;
grant execute on function public.resolve_canonical_observation(text, text, date, numeric, text, text, uuid, text, text, date, timestamptz, timestamptz, text, text, jsonb) to anon, authenticated;
