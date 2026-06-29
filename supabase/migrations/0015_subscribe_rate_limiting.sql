-- Production-grade abuse protection for the new public subscribe
-- endpoint (POST /api/subscribers/subscribe — the Subscription Experience
-- feature). subscribe_email() itself has no rate limiting of its own (by
-- design — it's a narrow, idempotent primitive, not a gatekeeper), and
-- until now nothing called it from a public, unauthenticated HTTP route,
-- so this was never exploitable. It is now: anyone could otherwise script
-- repeated calls to email-bomb an arbitrary address with verification
-- emails, or flood the subscribers table with junk rows.
--
-- Durable (table-backed, not in-memory) so it actually holds up across
-- Vercel's multiple serverless instances — an in-memory counter resets
-- per cold start and doesn't share state across concurrent instances,
-- which would make it close to useless for a public endpoint.
--
-- Two independent limits:
-- 1. Per-IP: at most 5 attempts per 10 minutes — generous enough for a
--    legitimate visitor who mistypes their email a couple of times,
--    tight enough to stop scripted abuse.
-- 2. Per-email cooldown: at most 1 attempt per 60 seconds for the exact
--    same address — stops rapid-fire re-triggering of verification
--    emails to the same inbox while still letting someone retry
--    reasonably soon if they didn't receive the first one.
--
-- Rows older than 24 hours are pruned opportunistically on each call
-- (cheap, avoids needing a separate cron just to keep this table small).

create table if not exists public.subscribe_attempts (
  id uuid primary key default gen_random_uuid(),
  ip_address text not null,
  email text not null,
  created_at timestamptz not null default now()
);
create index if not exists subscribe_attempts_ip_idx on public.subscribe_attempts (ip_address, created_at);
create index if not exists subscribe_attempts_email_idx on public.subscribe_attempts (email, created_at);

alter table public.subscribe_attempts enable row level security;
-- No policies — not public reference data; only read/written by the
-- SECURITY DEFINER function below.

create or replace function public.check_subscribe_rate_limit(p_ip text, p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ip_count int;
  v_last_email_attempt timestamptz;
  v_retry_after_seconds int;
begin
  delete from public.subscribe_attempts where created_at < now() - interval '24 hours';

  select count(*) into v_ip_count
    from public.subscribe_attempts
    where ip_address = p_ip and created_at > now() - interval '10 minutes';

  if v_ip_count >= 5 then
    return jsonb_build_object('allowed', false, 'reason', 'ip_rate_limited', 'retry_after_seconds', 600);
  end if;

  select max(created_at) into v_last_email_attempt
    from public.subscribe_attempts
    where email = lower(p_email) and created_at > now() - interval '60 seconds';

  if v_last_email_attempt is not null then
    v_retry_after_seconds := ceil(extract(epoch from (v_last_email_attempt + interval '60 seconds' - now())));
    return jsonb_build_object('allowed', false, 'reason', 'email_cooldown', 'retry_after_seconds', greatest(v_retry_after_seconds, 1));
  end if;

  insert into public.subscribe_attempts (ip_address, email) values (p_ip, lower(p_email));

  return jsonb_build_object('allowed', true);
end;
$$;

revoke all on function public.check_subscribe_rate_limit(text, text) from public;
grant execute on function public.check_subscribe_rate_limit(text, text) to anon, authenticated;
