# Database privileges: every table migration states its own

## The rule

**Every migration that creates a table must say, explicitly, which database roles may touch it.** Do not rely on any default privilege of the Supabase project.

A table in `public` is reached by three roles, each through a different door:

| Role | How the app connects as it | Typical use |
|---|---|---|
| `anon` | the anon key with no session (`createPublicDataClient`, the browser client of a guest) | public reference data |
| `authenticated` | the cookie-aware client of a signed-in user (`createClient` in `src/lib/supabase/server.ts`) | the user's own rows |
| the table owner (`postgres`) | `SECURITY DEFINER` functions, the dashboard SQL editor, migrations | everything else |

## Why: row level security is not enough

A row level security (RLS) policy only decides **which rows** a role may see or change. The role must first hold the **table privilege** (`SELECT`, `INSERT`, ...). Without it the query fails before any policy runs, with
`permission denied for table X` (SQLSTATE `42501`).

Until migration 0054 none of our migrations granted a table privilege. They relied on the privileges that Supabase's default privileges handed to `anon`, `authenticated` and `service_role` on the projects they were written for.

### What was observed, and what was not

* **Observed on the staging project (created in November 2026):** new tables received only `TRUNCATE`, `REFERENCES`, `TRIGGER` and `MAINTAIN` for those roles. With that, `/admin/sync-status` and every signed-in feature failed with
  "permission denied". The same project also showed `check_internal_secret` executable by `anon` and `authenticated`, although 0011 documents it as "not granted to anyone".
* **Not a guarantee.** This is what one project did on one date. It is not a statement about every new Supabase project, nor about how Supabase's defaults will behave later. The migrations must not depend on either behaviour; that is the point of this rule.
* **Production was not inspected for this.** Its tables were created earlier and are *assumed* to still carry the broader privileges of the old defaults, which would explain why it never showed the problem. That has not been verified and must be checked read-only before 0054 is applied there.

## What to write in a migration

Add the grants next to the policies, and keep them as small as the application needs. Use this template:

```sql
-- privileges: authenticated select, insert, update (the signed-in code reads and upserts; per-user RLS filters the rows)
create table public.example (...);
alter table public.example enable row level security;
create policy "Users can view their own examples" on public.example for select to authenticated using (auth.uid() = user_id);
-- ...the other policies...
grant select, insert, update on public.example to authenticated;
```

A table that is only reached through `SECURITY DEFINER` functions (for example a log or a secrets table) gets **no** grant for `anon` / `authenticated`, and says so:

```sql
-- privileges: none (reached only through SECURITY DEFINER functions)
create table public.example_log (...);
alter table public.example_log enable row level security;   -- no policies: default deny
```

For a function that `anon` or `authenticated` must call, keep the pattern already used since 0007:

```sql
revoke all on function public.some_rpc(text) from public;
grant execute on function public.some_rpc(text) to anon, authenticated;
```

and for an internal helper that only other `SECURITY DEFINER` functions call, revoke it from everyone (see 0054).

### Serial and identity columns need sequence privileges (not modelled)

A table with a `serial`, `bigserial` or `generated ... as identity` column is filled from a sequence. A role that inserts into it also needs `USAGE` (and for some patterns `SELECT`) on that sequence:

```sql
grant usage, select on sequence public.example_id_seq to authenticated;
```

None of the current tables does this (their keys are `gen_random_uuid()`), so no migration contains a sequence grant today. **The checker does not model sequences:** a `GRANT` on a sequence is reported as unsupported (see below), so it is never accepted silently,
and a missing sequence grant is **not** detected. If you add a table with a serial or identity column, state the sequence privilege in the same migration and review it by hand.

### Never

* `grant all ...` or `grant ... on all tables | functions | sequences in schema ...` to anyone
* any grant to `PUBLIC`
* `alter default privileges ...` (it changes every future object and differs between projects)
* column-level grants (the checker does not model them)
* a table without `alter table ... enable row level security`, or switching it off again with `disable row level security`
* a `grant` / `revoke` hidden inside a `DO` block or function body (including `execute '...'` and `format(...)`)

## The test that enforces it

`src/lib/migrationGrants.test.ts` replays every migration in order (`src/lib/testUtils/migrationGrantsAnalyzer.ts`) and fails when:

1. a policy assumes a privilege that no migration grants, and no reasoned exception exists;
2. a reviewed role (`anon`, `authenticated`, `service_role`, `authenticator`) holds a table privilege that is not in the reviewed list at the top of the test (a blanket, accidental or unreviewed grant);
3. anything is granted to `PUBLIC`, a blanket form above is used, a role outside the reviewed set is named, or a table has no RLS (or RLS is switched off);
4. `check_internal_secret` is executable by anyone but its owner (`PUBLIC`, `anon`, `authenticated`, `authenticator` or `service_role`), or a notification worker function loses its `anon` / `authenticated` EXECUTE or is granted to `PUBLIC` again;
5. a migration numbered above 0054 creates a table but has neither a `-- privileges:` comment nor a matching `grant`;
6. the migrations contain a construct the checker cannot model (it **fails closed**: see the next section);
7. the post-condition block of 0054 loses one of its checks (see "The guard in 0054" below).

The test and `supabase/migrations/0054_explicit_privileges.sql` are meant to land together: the test asserts that the migration exists, and checks that the list of tables in the migration's guard equals the tables the migrations create.

When you add a table and its grants, update the reviewed list (`CONFIG.expectedTableGrants`) in the same change: that edit is the review of who can touch what. If a policy deliberately allows more than the app uses
(for example a `delete` policy for a feature that does not exist), record it in `CONFIG.intentionalGaps` with a reason instead of granting the privilege. A gap entry that is no longer needed, or that is actually granted, fails the test.
Add the new table's name to the `known` list in the guard of any future privilege migration that repeats it.

## The guard in 0054

The `DO` block at the end of 0054 runs inside the migration's transaction; any exception rolls the whole migration back. In order:

| Check | Fails the migration when |
|---|---|
| D0 | any of the 25 known tables is **missing** from `public` (a missing table would otherwise slip past the row-level-security check, which only sees tables that exist); runs before every RLS check |
| D1 | `check_internal_secret(text, text)` is executable by `anon`, `authenticated`, `authenticator` or `service_role` (effective privilege), **or** by `PUBLIC` (read from the function's ACL) |
| D2 | fewer than the five worker functions exist (counted by distinct name); or **any overload** of a worker is executable by `PUBLIC` (ACL), or is **not** executable by `anon` or `authenticated` |
| D3, D4 | `anon` / `authenticated` lack the table privileges 0054 grants |
| D5 | a known table has no row level security. An *unexpected* public table without RLS is only a `WARNING` |
| D6 | never fails: it reports broader privileges as `WARNING`s |

**Why the ACL is read directly for `PUBLIC`.** `has_function_privilege(role, ...)` answers "can this role execute it", which is also true when the role merely *inherits* the right from `PUBLIC`; it cannot tell whether `PUBLIC` itself holds it. So the guard reads the ACL: `aclexplode(coalesce(proacl, acldefault('f', proowner)))` with `grantee = 0` (0 is `PUBLIC`). The `coalesce` matters: a function that was never granted or revoked has a **NULL** `proacl`, and that *means* the default ACL, which for a function includes `EXECUTE` for `PUBLIC`.

**Why `authenticator` is checked but not revoked.** `authenticator` is the role PostgREST connects as. Supabase's default function privileges name `anon`, `authenticated` and `service_role`, not `authenticator`, so a normal project never granted it anything and there is nothing to revoke. 0054 therefore only *verifies* it (D1); if a project did grant it explicitly, the guard fails loudly and a person decides, instead of the migration silently widening its own scope. For the same reason it does not revoke from `postgres`, `supabase_admin` or any other role: the owner keeps the function by design, and none of those roles is named anywhere in this repository. The test requires that 0054 contains exactly one `REVOKE` statement (the one for the four roles above).

**What the repository test proves about the guard, and what it does not.** The test checks that each check is *present* in the block (comments are stripped first, so a comment cannot stand in for a check) and mutates the block to prove each missing check is reported. It cannot run PL/pgSQL. That a check *evaluates correctly* was shown separately, by running the guard (and deliberately broken variants of it) against a live database inside `BEGIN READ ONLY ... ROLLBACK`.

## What the checker cannot see

The checker is a static, text-level replay of the migration files. It never talks to a database. A green test means "the migrations, as written, state these privileges and nothing broader"; it does **not** mean "every database has them".

**Not detected, or only partly:**

* **The state of any real project.** It models only EXPLICIT `GRANT` / `REVOKE` statements. Whatever a project grants by default, and anything changed by hand in the dashboard, is invisible. The guard in 0054 and the read-only query below are how a live project is checked.
* **Missing sequence privileges** for serial / identity columns (see above).
* **Policies whose meaning depends on more than the command:** an `UPDATE` or `DELETE` policy also needs `SELECT` on the table to evaluate its `WHERE` clause; only the privilege named by the policy's command is required.
* **Function privileges are tracked by function *name*, not full signature.** A `REVOKE` on one overload is recorded for every overload of that name; `DROP FUNCTION` forgets the name. This is conservative for owner-only functions and weak for worker functions. The 0054 guard checks every overload in the database itself.
* **Identifier case.** Names are compared lower-case; objects differing only in the case of a quoted identifier are not told apart.
* **What a policy expression really allows.** The checker only tells "uses `auth.uid()` / `auth.jwt()`" (signed-in users) from "does not" (everyone).
* **Grants to `service_role` or `authenticator`** are accepted as roles but flagged as unintended unless the reviewed list names them.

**Reported as unsupported (the test fails until a person reviews it and extends the checker):**

* `GRANT ... ON ALL TABLES | FUNCTIONS | ROUTINES | PROCEDURES | SEQUENCES IN SCHEMA`, `ALTER DEFAULT PRIVILEGES`, `GRANT ... TO PUBLIC`, `GRANT ALL`
* any role outside `anon`, `authenticated`, `service_role`, `authenticator` and `PUBLIC` in a `GRANT` / `REVOKE`; role DDL (`CREATE | ALTER | DROP ROLE | USER | GROUP`); role membership (`GRANT role TO role`)
* `GRANT` on a schema, sequence, database, type, domain, language, foreign object, large object, tablespace or parameter
* column-level grants and `GRANT OPTION FOR`
* `GRANT` / `REVOKE` / `ALTER DEFAULT PRIVILEGES` text inside a function or `DO` body, including `EXECUTE '...'` and `format(...)`
* `CREATE TABLE` / `DROP TABLE` / `CREATE POLICY` / `DROP POLICY` outside the `public` schema
* `ALTER POLICY`; `ALTER TABLE ... RENAME | SET SCHEMA | OWNER TO`
* `CREATE VIEW` and `CREATE MATERIALIZED VIEW` (a view can expose rows that RLS hides)
* `BEGIN ATOMIC` function bodies
* any other `GRANT` / `REVOKE` form the checker does not recognise

**Modelled:** `CREATE TABLE`, `DROP TABLE`, `ENABLE` and `DISABLE ROW LEVEL SECURITY`, `CREATE POLICY`, `DROP POLICY`, table `GRANT` / `REVOKE`, function `GRANT` / `REVOKE EXECUTE`, `CREATE` / `DROP FUNCTION`.

## Verified on staging, assumed for Production

| Statement | Staging | Production |
|---|---|---|
| New tables received only `TRUNCATE`, `REFERENCES`, `TRIGGER`, `MAINTAIN` for `anon` / `authenticated` | observed | not checked (the tables are older) |
| `check_internal_secret` was executable by `anon` and `authenticated` | observed | assumed, same migrations and defaults of that era |
| All 21 functions that call `check_internal_secret` are `SECURITY DEFINER` and owned by the migration role | verified | **not verified**: check read-only before applying 0054 |
| The post-condition guard of 0054 passes | run against the live state inside `BEGIN READ ONLY ... ROLLBACK` | not run |
| The guard detects a worker overload / the helper executable by `PUBLIC`, the helper executable by `authenticator`, and a missing known table | each shown with a deliberately broken copy of the block, inside `BEGIN READ ONLY ... ROLLBACK` (a stand-in function was used for the first three, see the G.45 report) | not run |
| No worker overload and not the helper is executable by `PUBLIC`; the helper is owner-only | verified (ACL read directly) | **not verified** |
| The six tables 0054 grants on already hold those privileges | yes (applied by hand) | assumed (old defaults), not checked |
| No public table outside the migrations lacks RLS | yes | **unknown**: 0054 reports such tables as warnings and does not abort |

## Verifying a project

The 0054 migration contains a block (see "The guard in 0054") that fails the migration unless the intended privileges, the existence of and RLS on the 25 tables the repository creates, the worker functions' EXECUTE grants (and no `PUBLIC` EXECUTE on any overload) and the owner-only helper are in place, and it prints `WARNING` lines for broader privileges or unexpected tables
a project carries. To look at a project directly (read-only):

```sql
select c.relname,
       has_table_privilege('anon', c.oid, 'select') as anon_select,
       has_table_privilege('authenticated', c.oid, 'select') as auth_select,
       has_table_privilege('authenticated', c.oid, 'delete') as auth_delete
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' order by 1;
```

Projects created at different times can carry different *inherited* privileges. The migrations are the source of truth for what must be granted; the optional block at the end of 0054 shows how to converge an older project to exactly that.
