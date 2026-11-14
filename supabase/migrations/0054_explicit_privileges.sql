-- Migration 0054: explicit privileges (consolidates the parked "revoke check_internal_secret" draft and the staging table grants).
--
-- Why this migration exists
--   Nothing before this file ever GRANTs a table privilege. Every earlier migration relied on the privileges that Supabase's default privileges
--   handed to anon / authenticated / service_role on new objects in `public`. That is not what a newly created project did for tables when this was
--   written: on the staging project (created in November 2026) new tables received only TRUNCATE / REFERENCES / TRIGGER / MAINTAIN for those roles.
--   That is an OBSERVATION about that one project, not a documented guarantee, and other projects may differ. On staging it made the app's anon-key
--   reads and the signed-in users' reads/writes fail with SQLSTATE 42501 "permission denied for table ...", because a row level security policy
--   only filters rows for a role that already holds the table privilege.
--   The same reliance left check_internal_secret(text, text) -- documented in 0011 as "NOT granted to anyone" -- executable by anon and authenticated
--   on staging (also observed there), i.e. an unmetered true/false guessing oracle for the 'notification_worker' secret.
--
-- What it does (idempotent: GRANT / REVOKE of a privilege that is already in the requested state is a no-op, so re-running changes nothing)
--   A. check_internal_secret(text, text): EXECUTE removed from PUBLIC, anon, authenticated, service_role. Only the owner keeps it. The functions that
--      call it are SECURITY DEFINER, so they run with their owner's privileges and keep working (see "Verified" below).
--      The post-condition (D1) also checks `authenticator` and the PUBLIC pseudo-role. `authenticator` is NOT revoked here: Supabase's default function
--      privileges name anon / authenticated / service_role, not authenticator, so a normal project never granted it anything. It is only VERIFIED; if a
--      project did grant it explicitly, the guard fails loudly and a person decides, instead of this file silently widening its own scope. Nor are
--      other roles (postgres, supabase_admin, ...) revoked: the owner keeps the function by design and no further role is named in this repository.
--   B. anon           : SELECT on economic_event_series, economic_events. The RLS policies of 0002 already say "readable by anyone"; this is the table
--                       privilege those policies assume. (createPublicDataClient connects with the anon key and no session.)
--   C. authenticated  : SELECT, INSERT, UPDATE on user_preferences, user_economic_profile; SELECT, INSERT on calculation_snapshots, profile_history.
--                       Exactly what the signed-in code does (select, upsert, insert); the per-user RLS policies still decide which rows. No DELETE
--                       anywhere, no UPDATE on the two append-only tables.
--   D. A post-condition block fails the migration (and therefore rolls everything back) unless the intended privileges, all 25 tables this repository
--      creates (they must EXIST in public, and have row level security), and the worker functions' EXECUTE grants (anon and authenticated yes, PUBLIC
--      no, for every overload) are all in place. It also REPORTS (RAISE WARNING, never an error)
--      anything broader or unexpected: write privileges anon still holds, DELETE that authenticated still holds, privileges held by PUBLIC, and public
--      tables that this repository did not create and that lack row level security. The report changes nothing.
--
-- What it deliberately does NOT do
--   * It does not touch row level security, policies, other tables, other roles, default privileges, or any other function.
--   * It does not REVOKE the broader privileges that older projects may still hold from earlier defaults (see the optional block at the end).
--   * The five notification worker functions keep the explicit EXECUTE grants 0007/0011 gave them; their own secret check stays in force.
--   * It takes no lock beyond what GRANT / REVOKE need, and gives up after 5 seconds (lock_timeout) instead of waiting behind a long-running query;
--     a timeout aborts and rolls back the whole migration, and it can simply be re-run.
--
-- Verified on STAGING (the project this was developed against)
--   * All 21 functions whose bodies call check_internal_secret are SECURITY DEFINER and owned by the role that ran the migrations.
--   * The post-condition block passed against staging's live state, run inside BEGIN READ ONLY ... ROLLBACK (it cannot write).
--   * Staging already holds every privilege granted here (applied by hand as separate statements), so applying this file there is a no-op.
-- NOT verified on PRODUCTION (assumptions to check read-only before applying there)
--   * the same owner / SECURITY DEFINER facts for the callers of check_internal_secret;
--   * that its tables still carry privileges from earlier defaults (then B and C are no-ops and block D reports the broader ones as warnings);
--   * that no table outside the 25 below lacks row level security (if one does, block D warns; it does not abort).

begin;

-- Fail fast instead of queueing behind a long-running statement; the surrounding transaction rolls back and the migration can be re-run.
set local lock_timeout = '5s';

-- A. The internal helper is owner-only.
revoke all on function public.check_internal_secret(text, text) from public, anon, authenticated, service_role;

-- B. Public reference data read through the anon key.
grant select on public.economic_event_series, public.economic_events to anon;

-- C. Signed-in users' own data (the per-user RLS policies filter rows).
grant select, insert, update on public.user_preferences, public.user_economic_profile to authenticated;
grant select, insert on public.calculation_snapshots, public.profile_history to authenticated;

-- D. Post-conditions. Any exception here aborts the whole migration.
do $$
declare
  -- The 25 tables created by migrations 0001-0053 (src/lib/migrationGrants.test.ts keeps this list equal to the repository's tables).
  known   constant text[] := array[
    'calculation_snapshots', 'canonical_observations', 'cpi_category_breakdown', 'cpi_monthly_index', 'cron_run_log',
    'data_integrity_alerts', 'economic_event_impact_stats', 'economic_event_official_dates', 'economic_event_series', 'economic_events',
    'email_log', 'internal_secrets', 'macro_intelligence_snapshots', 'market_fallback_snapshots', 'notification_jobs',
    'profile_history', 'raw_observations', 'source_health_log', 'subscribe_attempts', 'subscribers',
    'sync_trigger_log', 'user_economic_profile', 'user_event_subscriptions', 'user_preferences', 'weekly_intelligence_snapshots'
  ];
  workers constant text[] := array[
    'get_pending_notification_jobs', 'claim_notification_job_work', 'get_pending_email_log_batch',
    'record_email_batch_results', 'update_email_delivery_status'
  ];
  role_name text;
  tbl       text;
  priv      text;
  rec       record;
  bad       text;
  n_found   int;
begin
  -- D0. Every one of the 25 known tables must exist in public (a missing one would otherwise slip past the RLS check below, which only looks at
  --     tables that exist). Runs before any RLS check.
  select string_agg(k, ', ' order by k) into bad
    from unnest(known) as k
   where not exists (
     select 1 from pg_class c join pg_namespace ns on ns.oid = c.relnamespace
      where ns.nspname = 'public' and c.relkind in ('r', 'p') and c.relname = k);
  if bad is not null then
    raise exception 'migration 0054: known table(s) missing from schema public: %', bad;
  end if;

  -- D1. The helper is executable by nobody but its owner.
  --     (a) Effective privilege (has_function_privilege also sees what a role inherits through PUBLIC) for every role that can reach the API:
  --         anon, authenticated, authenticator (the connection role PostgREST logs in as) and service_role.
  foreach role_name in array array['anon', 'authenticated', 'authenticator', 'service_role'] loop
    if has_function_privilege(role_name, 'public.check_internal_secret(text, text)', 'execute') then
      raise exception 'migration 0054: check_internal_secret is still executable by %', role_name;
    end if;
  end loop;
  --     (b) The PUBLIC pseudo-role, read from the ACL itself. A NULL proacl means the DEFAULT ACL, which for a function grants EXECUTE to PUBLIC,
  --         so coalesce(proacl, acldefault('f', owner)); grantee 0 is PUBLIC.
  if exists (
    select 1
      from pg_proc pr, aclexplode(coalesce(pr.proacl, acldefault('f', pr.proowner))) as x
     where pr.oid = 'public.check_internal_secret(text, text)'::regprocedure
       and x.grantee = 0 and x.privilege_type = 'EXECUTE'
  ) then
    raise exception 'migration 0054: check_internal_secret is executable by PUBLIC';
  end if;

  -- D2. All five worker functions exist (by DISTINCT NAME, so extra overloads never matter), and EVERY overload of each is executable by anon and
  --     authenticated and NOT executable by PUBLIC (ACL read directly, same coalesce/acldefault rule as D1b).
  select count(distinct pr.proname) into n_found
    from pg_proc pr join pg_namespace ns on ns.oid = pr.pronamespace
   where ns.nspname = 'public' and pr.proname = any (workers);
  if n_found < cardinality(workers) then
    select string_agg(w, ', ' order by w) into bad
      from unnest(workers) as w
     where not exists (select 1 from pg_proc p2 join pg_namespace n2 on n2.oid = p2.pronamespace where n2.nspname = 'public' and p2.proname = w);
    raise exception 'migration 0054: missing notification worker function(s): %', bad;
  end if;
  for rec in
    select pr.oid, pr.oid::regprocedure::text as sig,
           exists (
             select 1 from aclexplode(coalesce(pr.proacl, acldefault('f', pr.proowner))) as x
              where x.grantee = 0 and x.privilege_type = 'EXECUTE'
           ) as public_exec
      from pg_proc pr join pg_namespace ns on ns.oid = pr.pronamespace
     where ns.nspname = 'public' and pr.proname = any (workers)
  loop
    if rec.public_exec then
      raise exception 'migration 0054: worker function % is executable by PUBLIC', rec.sig;
    end if;
    foreach role_name in array array['anon', 'authenticated'] loop
      if not has_function_privilege(role_name, rec.oid, 'execute') then
        raise exception 'migration 0054: worker function % is not executable by %', rec.sig, role_name;
      end if;
    end loop;
  end loop;

  -- D3. anon can read the two calendar tables.
  foreach tbl in array array['economic_event_series', 'economic_events'] loop
    if not has_table_privilege('anon', 'public.' || tbl, 'select') then
      raise exception 'migration 0054: anon cannot select from public.%', tbl;
    end if;
  end loop;

  -- D4. authenticated has the intended privileges on the four user-data tables.
  foreach tbl in array array['user_preferences', 'user_economic_profile'] loop
    foreach priv in array array['select', 'insert', 'update'] loop
      if not has_table_privilege('authenticated', 'public.' || tbl, priv) then
        raise exception 'migration 0054: authenticated lacks % on public.%', upper(priv), tbl;
      end if;
    end loop;
  end loop;
  foreach tbl in array array['calculation_snapshots', 'profile_history'] loop
    foreach priv in array array['select', 'insert'] loop
      if not has_table_privilege('authenticated', 'public.' || tbl, priv) then
        raise exception 'migration 0054: authenticated lacks % on public.%', upper(priv), tbl;
      end if;
    end loop;
  end loop;

  -- D5. Row level security is on for every one of the 25 known tables (an exception: without it the grants above would be open access).
  --     Any OTHER table in public that lacks it (created outside the migrations: dashboard, an extension) is reported, not fatal.
  select string_agg(c.relname, ', ' order by c.relname) into bad
    from pg_class c join pg_namespace ns on ns.oid = c.relnamespace
   where ns.nspname = 'public' and c.relkind in ('r', 'p') and c.relname = any (known) and not c.relrowsecurity;
  if bad is not null then
    raise exception 'migration 0054: row level security is not enabled on: %', bad;
  end if;

  select string_agg(c.relname, ', ' order by c.relname) into bad
    from pg_class c join pg_namespace ns on ns.oid = c.relnamespace
   where ns.nspname = 'public' and c.relkind in ('r', 'p') and not (c.relname = any (known)) and not c.relrowsecurity;
  if bad is not null then
    raise warning 'migration 0054 (report only): public tables NOT created by this repository have no row level security: %', bad;
  end if;

  -- D6. Drift report (warnings only). Projects with earlier defaults can hold broader privileges; row level security still limits the rows.
  select string_agg(c.relname, ', ' order by c.relname) into bad
    from pg_class c join pg_namespace ns on ns.oid = c.relnamespace
   where ns.nspname = 'public' and c.relkind in ('r', 'p')
     and (has_table_privilege('anon', c.oid, 'insert') or has_table_privilege('anon', c.oid, 'update') or has_table_privilege('anon', c.oid, 'delete'));
  if bad is not null then
    raise warning 'migration 0054 (report only): anon holds INSERT/UPDATE/DELETE on: %', bad;
  end if;

  select string_agg(c.relname, ', ' order by c.relname) into bad
    from pg_class c join pg_namespace ns on ns.oid = c.relnamespace
   where ns.nspname = 'public' and c.relkind in ('r', 'p') and has_table_privilege('authenticated', c.oid, 'delete');
  if bad is not null then
    raise warning 'migration 0054 (report only): authenticated holds DELETE on: %', bad;
  end if;

  select string_agg(distinct c.relname, ', ' order by c.relname) into bad
    from pg_class c join pg_namespace ns on ns.oid = c.relnamespace
   cross join lateral aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) as a
   where ns.nspname = 'public' and c.relkind in ('r', 'p') and a.grantee = 0;
  if bad is not null then
    raise warning 'migration 0054 (report only): PUBLIC holds table privileges on: %', bad;
  end if;
end;
$$;

commit;

-- OPTIONAL, NOT ENABLED. Converge the six tables above to exactly the intended privileges on projects that still carry broader privileges from earlier
-- defaults (it also removes TRUNCATE/REFERENCES/TRIGGER from anon/authenticated on those tables). Row level security already blocks the writes it would
-- remove, so this is least-privilege hardening, not a fix; enabling it changes an existing project's grants and needs its own review.
--
--   revoke all on public.economic_event_series, public.economic_events from anon;
--   grant select on public.economic_event_series, public.economic_events to anon;
--   revoke all on public.user_preferences, public.user_economic_profile, public.calculation_snapshots, public.profile_history from authenticated;
--   grant select, insert, update on public.user_preferences, public.user_economic_profile to authenticated;
--   grant select, insert on public.calculation_snapshots, public.profile_history to authenticated;
