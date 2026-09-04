-- Macro Intelligence Signal History & Regime Persistence (Phase 10.1).
--
-- Persists the ALREADY-COMPUTED output of buildMacroIntelligenceReport()
-- (src/lib/intelligence/macroIntelligence.ts) so the UI can answer "how
-- long has this state persisted / has it recently changed" -- questions
-- the deterministic engine itself has no memory to answer, since it only
-- ever evaluates the current moment. This migration adds memory; it does
-- not change what the engine computes or how, and nothing here is ever
-- read back into signal computation (persistence is a downstream,
-- read-only consumer of a report the engine already finished building).
--
-- Mirrors weekly_intelligence_snapshots' own established shape (migrations
-- 0017/0019/0042) as closely as this feature's actual needs allow: one row
-- per computation, RLS-locked with no policies (access only through the
-- two SECURITY DEFINER functions below), the same internal_secrets/
-- check_internal_secret('notification_worker', ...) trust model reused
-- rather than provisioning a new secret for what is, architecturally, just
-- another trusted server-side cron.
--
-- Compact by design: `dimensions` stores exactly the fields the historical
-- UI needs per dimension (state, direction, confidence, confidenceScore,
-- summary) -- never the underlying per-indicator evidence array
-- (IndicatorObservationEvidence), which already lives in
-- canonical_observations and would duplicate it here for no benefit this
-- feature needs.
--
-- Cadence: daily, not weekly. Unlike weekly_intelligence_snapshots (which
-- gates an AI narration call -- genuinely rate/cost-sensitive, the reason
-- for its 7-day cadence), buildMacroIntelligenceReport() is pure and
-- cheap: every read goes through the already-cached canonical/read-model
-- layer (see macroIntelligence.ts's own header -- no provider/API call
-- originates from this layer), so there is no cost reason to snapshot it
-- only weekly. A daily cadence gives meaningfully finer regime-duration
-- tracking ("3 consecutive days" vs. "3 consecutive weeks") at negligible
-- storage cost (7 dimensions packed into one small jsonb column, once a
-- day). `snapshot_date` + its unique index cap this at exactly one row per
-- UTC calendar day regardless of how many times the cron fires that day
-- (Vercel Cron's at-least-once delivery, a manual re-trigger, etc.) -- the
-- same unique_violation-catch idempotency pattern migration 0042
-- established for the scheduled weekly path.

create table public.macro_intelligence_snapshots (
  id uuid primary key default gen_random_uuid(),
  computed_at timestamptz not null default now(),
  -- UTC calendar day this snapshot represents -- the uniqueness boundary,
  -- deliberately not `computed_at` itself (which is unique-by-construction
  -- and would defeat the point of a duplicate guard).
  snapshot_date date not null default (current_date at time zone 'UTC'),
  -- { [dimension]: { state, direction, confidence, confidenceScore, summary } }
  -- -- one key per IntelligenceDimension (see src/lib/intelligence/types.ts).
  -- A dimension is simply absent here if its own signal could not be
  -- computed at all that day, mirroring MacroRegimeSnapshot's own "omit,
  -- never guess" convention. "insufficient-data" is itself a valid,
  -- honestly-persisted state -- never hidden or fabricated into something
  -- else.
  dimensions jsonb not null
);

create unique index macro_intelligence_snapshots_date_uidx
  on public.macro_intelligence_snapshots (snapshot_date);

create index macro_intelligence_snapshots_computed_at_idx
  on public.macro_intelligence_snapshots (computed_at desc);

alter table public.macro_intelligence_snapshots enable row level security;
-- No policies -- read/write only via the two SECURITY DEFINER functions
-- below, consistent with every other table in this project.

create function public.store_macro_intelligence_snapshot(
  p_internal_secret text,
  p_dimensions jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.check_internal_secret('notification_worker', p_internal_secret) then
    raise exception 'unauthorized';
  end if;

  begin
    insert into public.macro_intelligence_snapshots (dimensions)
    values (p_dimensions)
    returning id into v_id;
  exception
    when unique_violation then
      return jsonb_build_object('id', null, 'skipped', true, 'reason', 'A snapshot for this UTC calendar day already exists.');
  end;

  return jsonb_build_object('id', v_id, 'skipped', false);
end;
$$;

revoke all on function public.store_macro_intelligence_snapshot(text, jsonb) from public;
grant execute on function public.store_macro_intelligence_snapshot(text, jsonb) to anon, authenticated;

-- Publicly readable by design -- this is exactly the data /macro-intelligence
-- already shows every visitor as "the current state"; history is the same
-- sensitivity level, just more rows. An RPC (not a SELECT policy) only to
-- stay consistent with this project's "every table is RLS-locked, all
-- access goes through a narrow function" convention.
--
-- Bounded by p_limit (the app passes a small constant) -- this is a
-- history *strip*, not an export; there is no use case in this feature
-- for an unbounded read, so the function itself caps it defensively
-- (clamped to [1, 60] regardless of what a caller passes).
create function public.get_recent_macro_intelligence_snapshots(p_limit int default 14)
returns setof public.macro_intelligence_snapshots
language sql
security definer
set search_path = public
stable
as $$
  select * from public.macro_intelligence_snapshots
  order by computed_at desc
  limit least(greatest(p_limit, 1), 60);
$$;

revoke all on function public.get_recent_macro_intelligence_snapshots(int) from public;
grant execute on function public.get_recent_macro_intelligence_snapshots(int) to anon, authenticated;
