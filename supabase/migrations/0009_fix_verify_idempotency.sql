-- Fixes a real bug found during end-to-end production verification:
-- clicking a verification link a SECOND time returned "invalid_token"
-- instead of the intended idempotent "already verified" response.
--
-- Root cause: verify_subscriber's success path set verification_token =
-- null after marking the subscriber verified. Its own lookup is
-- `where verification_token = p_token` — once nulled, that WHERE clause
-- can never match again (NULL = 'anything' is never true in SQL), so a
-- second click can't find the row at all and falls through to
-- invalid_token, even though the `if v_status = 'verified' then return
-- already_verified` branch right above it was specifically written to
-- handle exactly this case. The row became unfindable before that check
-- ever got a chance to run on the next call.
--
-- This isn't just a double-click edge case: many corporate/Gmail security
-- scanners pre-fetch links in emails to scan them, which would have
-- silently "used up" the token before the real subscriber ever clicked it
-- — meaning some real users would have hit "invalid or expired link" on
-- their first genuine click.
--
-- Fix: stop nulling verification_token on success. Its only remaining
-- capability after verification is to idempotently re-confirm an
-- already-true state — there's nothing to protect by invalidating it, and
-- subscribing again (subscribe_email) already issues a fresh token if the
-- subscriber is ever reset to pending_verification later. Also adds
-- subscriber_id to the already_verified response, for consistency with
-- the success path (a presentation inconsistency caught by the same test,
-- not a functional bug).

create or replace function public.verify_subscriber(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_status text;
begin
  select id, status into v_id, v_status from public.subscribers where verification_token = p_token;

  if v_id is null then
    return jsonb_build_object('success', false, 'error', 'invalid_token');
  end if;

  if v_status = 'verified' then
    return jsonb_build_object('success', true, 'already_verified', true, 'subscriber_id', v_id);
  end if;

  update public.subscribers
    set status = 'verified', verified_at = now(), updated_at = now()
    where id = v_id;

  return jsonb_build_object('success', true, 'subscriber_id', v_id);
end;
$$;

revoke all on function public.verify_subscriber(text) from public;
grant execute on function public.verify_subscriber(text) to anon, authenticated;
