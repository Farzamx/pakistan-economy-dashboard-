-- Purely additive: verify_subscriber now also returns unsubscribe_token
-- (a column that already existed on subscribers since 0007) so the
-- post-verification success page can deep-link a real "Manage
-- Subscription" action instead of a generic, non-personalized one. No
-- change to validation, side effects, or idempotency — see 0009 for why
-- the already_verified branch exists and behaves as it does; that logic
-- is untouched here.

create or replace function public.verify_subscriber(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_status text;
  v_unsubscribe_token text;
begin
  select id, status, unsubscribe_token into v_id, v_status, v_unsubscribe_token
    from public.subscribers where verification_token = p_token;

  if v_id is null then
    return jsonb_build_object('success', false, 'error', 'invalid_token');
  end if;

  if v_status = 'verified' then
    return jsonb_build_object('success', true, 'already_verified', true, 'subscriber_id', v_id, 'unsubscribe_token', v_unsubscribe_token);
  end if;

  update public.subscribers
    set status = 'verified', verified_at = now(), updated_at = now()
    where id = v_id;

  return jsonb_build_object('success', true, 'subscriber_id', v_id, 'unsubscribe_token', v_unsubscribe_token);
end;
$$;
