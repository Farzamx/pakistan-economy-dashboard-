-- Global Market Reliability — auto-regenerating fallback lifecycle
-- (Production Reliability & Institutional Upgrade, Part 6). Previously,
-- Gold/Silver/DXY/Brent/WTI/NatGas/US10Y/FedFunds/PAK-ETF fell back to a
-- hardcoded snapshot in globalMarketsFallbackData.ts that was captured
-- once and never updated — every day that passed made it more stale, and
-- once both primary and secondary sources failed for a symbol, that card
-- was guaranteed to read "Stale" almost immediately, forever.
--
-- This table is a durable, auto-refreshing replacement: whenever a live
-- fetch succeeds for a symbol, the result is opportunistically persisted
-- here (throttled — see marketFallbackSnapshot.ts, not on every single
-- call). When both primary and secondary fail, callers read the most
-- recent persisted snapshot here FIRST — always more recent than the
-- static file — and only fall back to the hardcoded file if no persisted
-- snapshot exists at all (e.g. immediately after this feature ships).
--
-- One row per symbol, upserted in place (not history) — this is a rolling
-- "last known good" cache, not an audit trail; the weekly intelligence
-- snapshots table (0017) is the place for genuine history.

create table if not exists public.market_fallback_snapshots (
  symbol_key text primary key,
  kpi_json jsonb not null,
  captured_at timestamptz not null default now(),
  source text not null
);

alter table public.market_fallback_snapshots enable row level security;
-- No policies — read/write only via the two SECURITY DEFINER functions
-- below, consistent with every other table in this project.

create or replace function public.upsert_market_fallback_snapshot(p_symbol_key text, p_kpi_json jsonb, p_source text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.market_fallback_snapshots (symbol_key, kpi_json, captured_at, source)
  values (p_symbol_key, p_kpi_json, now(), p_source)
  on conflict (symbol_key) do update
    set kpi_json = excluded.kpi_json, captured_at = excluded.captured_at, source = excluded.source;
$$;

revoke all on function public.upsert_market_fallback_snapshot(text, jsonb, text) from public;
grant execute on function public.upsert_market_fallback_snapshot(text, jsonb, text) to anon, authenticated;

-- Publicly readable for the same reason 0017's weekly snapshot read RPC
-- is — this is exactly the data already shown to every visitor, an RPC
-- only to stay consistent with this project's RLS convention.
create or replace function public.get_market_fallback_snapshot(p_symbol_key text)
returns public.market_fallback_snapshots
language sql
security definer
set search_path = public
stable
as $$
  select * from public.market_fallback_snapshots where symbol_key = p_symbol_key;
$$;

revoke all on function public.get_market_fallback_snapshot(text) from public;
grant execute on function public.get_market_fallback_snapshot(text) to anon, authenticated;
