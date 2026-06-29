-- Fixes a real production bug found during end-to-end verification:
-- subscribe_email failed with "function gen_random_bytes(integer) does not
-- exist" (Postgres error 42883).
--
-- Root cause: Supabase installs pgcrypto into the `extensions` schema by
-- default, not `public` (a standard, documented Supabase convention, to
-- keep `public` free of extension objects). 0007's functions deliberately
-- set `search_path = public` only — correct practice for a SECURITY
-- DEFINER function (an unrestricted search_path is a known privilege-
-- escalation vector) — but that same restriction means gen_random_bytes
-- (which actually lives at extensions.gen_random_bytes) was never visible
-- to them. `create extension if not exists pgcrypto;` in 0007 succeeded
-- without error precisely because the extension *did* install correctly —
-- just into a schema these functions can't see.
--
-- Fix: stop depending on pgcrypto at all, rather than chase which schema
-- it landed in (which can vary by project/Supabase version, so a
-- search_path patch here would just trade one assumption for another).
-- gen_random_uuid() is core Postgres (no extension needed) and is already
-- proven to work in this exact project — every prior migration uses it for
-- primary keys. Two concatenated UUIDs (hyphens stripped) give 64 hex
-- characters with ~244 bits of real randomness, more than the 192 bits
-- gen_random_bytes(24) provided — strictly more than sufficient for a
-- verification/unsubscribe token.

create or replace function public.generate_token()
returns text
language sql
security definer
set search_path = public
as $$
  select replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
$$;

alter table public.subscribers alter column unsubscribe_token set default public.generate_token();

create or replace function public.subscribe_email(p_email text, p_source text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
  v_id uuid;
  v_status text;
  v_token text := public.generate_token();
begin
  if v_email = '' or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return jsonb_build_object('success', false, 'error', 'invalid_email');
  end if;

  select id, status into v_id, v_status from public.subscribers where email = v_email;

  if v_id is not null then
    if v_status = 'verified' then
      return jsonb_build_object('success', true, 'already_verified', true);
    end if;
    update public.subscribers
      set status = 'pending_verification', verification_token = v_token, verification_sent_at = now(), updated_at = now()
      where id = v_id;
    return jsonb_build_object('success', true, 'subscriber_id', v_id, 'verification_token', v_token);
  end if;

  insert into public.subscribers (email, verification_token, verification_sent_at, source)
  values (v_email, v_token, now(), p_source)
  returning id into v_id;

  return jsonb_build_object('success', true, 'subscriber_id', v_id, 'verification_token', v_token);
end;
$$;

revoke all on function public.generate_token() from public;
grant execute on function public.generate_token() to anon, authenticated;
-- subscribe_email's grant from 0007 already covers the re-created function
-- (same name + signature), but re-stated for a clean diff against that file.
revoke all on function public.subscribe_email(text, text) from public;
grant execute on function public.subscribe_email(text, text) to anon, authenticated;

-- Backfills any row that managed to get a NULL unsubscribe_token before
-- this fix (e.g. claude-debug-test@example.com / claude-test@example.com
-- from this verification session, if subscribe_email partially inserted
-- before erroring — in practice it didn't, since the error happened before
-- the INSERT ran, but this is a correct, idempotent safety net regardless).
update public.subscribers set unsubscribe_token = public.generate_token() where unsubscribe_token is null;
