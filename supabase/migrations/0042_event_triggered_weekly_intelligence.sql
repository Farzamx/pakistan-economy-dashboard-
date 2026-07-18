-- Weekly Intelligence Engine — event-triggered recompute (Weekly
-- Intelligence Engine Audit, 2026-07-18).
--
-- DECISION: Hybrid architecture (Option B). The weekly Monday cadence
-- (migration 0019's per-ISO-week uniqueness) stays exactly as it was —
-- this migration does not touch that guarantee for the *scheduled* path.
-- It ADDS a second, narrower path: a recompute triggered immediately after
-- a `notificationPriority: "critical"` release is confirmed (currently:
-- sbp-monetary-policy-committee-meeting, gdp-growth-release,
-- federal-budget — see SERIES_PUBLICATION_META in
-- seriesPublicationConfig.ts, the single source of truth this reads from
-- at call time, not duplicated here).
--
-- Why only "critical", not every example in the audit request (CPI,
-- Current Account, Trade Balance, FX Reserves, LSM, etc.): those release
-- monthly-or-more-often — FX Reserves is literally weekly — so triggering
-- on them would make "event-triggered" indistinguishable from "continuous
-- recompute", reintroducing the exact cost/noise/rate-limit problem the
-- weekly cadence was built to avoid (see weeklyIntelligenceCompute.ts's own
-- header history). "Critical" releases (policy rate decisions, GDP,
-- Federal Budget) are rare (an estimated 8-10/year combined) and each one
-- materially changes the recession/default models' direct inputs — a
-- genuine case where a multi-day lag is a real accuracy problem, not
-- noise-chasing.
--
-- Guards (the audit's explicit requirements):
--   - Never run unnecessarily: gated to "critical" tier only, checked by
--     the caller (syncPipeline.ts) against config, not by this migration.
--   - Prevent duplicate executions / avoid AI recomputation loops: a
--     MINIMUM_INTERVAL_HOURS guard (below) rejects a new insert — event OR
--     scheduled — if any snapshot already exists within that window. A
--     burst of same-day releases (e.g. CPI+Core, or two MPC-adjacent
--     announcements) can only ever produce one recompute.
--   - Respect rate limits / keep costs low: this alone doesn't change AI
--     call volume — the OpenRouter chain already free-tier by default
--     (openRouterClient.ts) — but the interval guard caps worst-case added
--     volume regardless of how many "critical" releases land close together.
--   - Deterministic outputs: unchanged — the models are deterministic given
--     their inputs; only the AI narration varies slightly per call, same as
--     the existing weekly path.
--   - Preserve auditability: every row now records WHY it was computed
--     (trigger_reason) and, for event-triggered rows, WHICH release caused
--     it (trigger_series_slug) — a genuine "why does this number look
--     different from last week" audit trail, not just a timestamp.

alter table public.weekly_intelligence_snapshots
  add column if not exists trigger_reason text not null default 'scheduled'
    check (trigger_reason in ('scheduled', 'event')),
  add column if not exists trigger_series_slug text;

-- The old constraint applied to every row; replaced with one scoped only
-- to the scheduled path so a scheduled + an event-triggered row can
-- legitimately coexist in the same ISO week (e.g. an MPC surprise hike on
-- a Wednesday, then the normal Monday run five days later) without either
-- one rejecting the other. A partial unique index — Postgres has no
-- "unique except when X" syntax, this is the standard way to express it.
drop index if exists public.weekly_intelligence_snapshots_week_start_uidx;

create unique index if not exists weekly_intelligence_snapshots_scheduled_week_uidx
  on public.weekly_intelligence_snapshots (week_start)
  where trigger_reason = 'scheduled';

create index if not exists weekly_intelligence_snapshots_trigger_reason_idx
  on public.weekly_intelligence_snapshots (trigger_reason, computed_at desc);

drop function if exists public.store_weekly_intelligence_snapshot(text, jsonb);

create function public.store_weekly_intelligence_snapshot(
  p_internal_secret text,
  p_payload jsonb,
  p_trigger_reason text default 'scheduled',
  p_trigger_series_slug text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_now timestamptz := now();
  v_min_interval interval := interval '20 hours';
  v_last_computed_at timestamptz;
begin
  if not public.check_internal_secret('notification_worker', p_internal_secret) then
    raise exception 'unauthorized';
  end if;

  if p_trigger_reason not in ('scheduled', 'event') then
    raise exception 'invalid trigger_reason: %', p_trigger_reason;
  end if;

  -- Interval guard applies to BOTH paths (not just event-triggered): this
  -- is what makes "prevent duplicate executions" and "avoid AI
  -- recomputation loops" a hard guarantee rather than a convention. A
  -- scheduled run landing within 20h of a same-week event-triggered run
  -- is exactly the "already fresh, don't bother" case too.
  select max(computed_at) into v_last_computed_at from public.weekly_intelligence_snapshots;
  if v_last_computed_at is not null and v_now - v_last_computed_at < v_min_interval then
    return jsonb_build_object(
      'id', null, 'skipped', true,
      'reason', format('A snapshot was already computed %s ago (minimum interval: %s).', v_now - v_last_computed_at, v_min_interval)
    );
  end if;

  begin
    insert into public.weekly_intelligence_snapshots (
      computed_at, week_start, trigger_reason, trigger_series_slug,
      health_score, health_label, health_factors,
      recession_probability, recession_category, recession_model_score, recession_factors,
      default_probability, default_category, default_model_score, default_factors,
      ai_sentiment, ai_summary, ai_top_drivers,
      ai_recession_explanation, ai_default_explanation,
      ai_model_used, ai_model_display_name
    ) values (
      v_now, (date_trunc('week', v_now at time zone 'UTC'))::date, p_trigger_reason, p_trigger_series_slug,
      (p_payload->>'healthScore')::int, p_payload->>'healthLabel', p_payload->'healthFactors',
      (p_payload->>'recessionProbability')::int, p_payload->>'recessionCategory', (p_payload->>'recessionModelScore')::int, p_payload->'recessionFactors',
      (p_payload->>'defaultProbability')::int, p_payload->>'defaultCategory', (p_payload->>'defaultModelScore')::int, p_payload->'defaultFactors',
      p_payload->>'aiSentiment', p_payload->>'aiSummary', p_payload->'aiTopDrivers',
      p_payload->'aiRecessionExplanation', p_payload->'aiDefaultExplanation',
      p_payload->>'aiModelUsed', p_payload->>'aiModelDisplayName'
    )
    returning id into v_id;
  exception
    when unique_violation then
      return jsonb_build_object('id', null, 'skipped', true, 'reason', 'A scheduled snapshot for this ISO week already exists.');
  end;

  return jsonb_build_object('id', v_id, 'skipped', false);
end;
$$;

revoke all on function public.store_weekly_intelligence_snapshot(text, jsonb, text, text) from public;
grant execute on function public.store_weekly_intelligence_snapshot(text, jsonb, text, text) to anon, authenticated;
