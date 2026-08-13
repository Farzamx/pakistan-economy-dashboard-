-- Phase 5 (Unified Freshness Engine, Shadow Mode) — read-only RPC exposing
-- migration 0051's provenance columns.
--
-- Why a new function rather than extending get_canonical_observation_history:
-- that RPC is a live production read path (src/lib/data/sbpCanonicalStore.ts
-- -> src/lib/data/sbp.ts -> every SBP-backed page render). Changing its
-- return columns requires DROP + CREATE (Postgres cannot change a `returns
-- table` shape in place), which is unnecessary risk to an already-working
-- production path for a Phase 5 shadow-mode need. This is a brand new,
-- separate, additive function instead — the existing RPC is completely
-- untouched, and this one exists solely so the new freshness engine's shadow
-- adapter (src/lib/freshness/shadowFreshnessAdapter.ts) can read
-- release_date/source_updated_at/fetched_at/quality_status/source_series_id/
-- source_reference through an authorized path instead of the anon role
-- attempting a direct table read (which RLS blocks by design — see
-- migration 0050's comment; there is deliberately no policy on
-- canonical_observations for any role).
--
-- Same security posture as get_canonical_observation_history and
-- get_canonical_freshness_summary: ungated (no internal secret) because this
-- is read access to data already served to every visitor today, just with
-- more columns than the existing read RPC returns. No write capability, no
-- RLS change, no SECURITY DEFINER weakening.

create or replace function public.get_canonical_observation_provenance(
  p_indicator_key text,
  p_limit         int default 500
)
returns table (
  observation_period date,
  value               numeric,
  unit                text,
  vintage             timestamptz,
  release_date        date,
  source_updated_at   timestamptz,
  fetched_at          timestamptz,
  quality_status      text,
  source_series_id    text,
  source_reference    jsonb
)
language sql
security definer
set search_path = public
stable
as $$
  select observation_period, value, unit, vintage,
         release_date, source_updated_at, fetched_at, quality_status,
         source_series_id, source_reference
  from public.canonical_observations
  where indicator_key = p_indicator_key
    and superseded_at is null
  order by observation_period desc
  limit p_limit;
$$;

revoke all on function public.get_canonical_observation_provenance(text, int) from public;
grant execute on function public.get_canonical_observation_provenance(text, int) to anon, authenticated;
