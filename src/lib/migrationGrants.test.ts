// Regression test: the migrations' table / function privileges against the row level security they declare (see src/lib/testUtils/migrationGrantsAnalyzer.ts and docs/database-privileges.md).
//
// Row level security filters rows only for a role that already holds the TABLE privilege, and a project is not guaranteed to hand those privileges out by default. This test fails when:
//   * a policy assumes a privilege that no migration grants (and that is not a recorded, reasoned, intentional gap),
//   * a reviewed role (anon, authenticated, service_role, authenticator) holds a table privilege that is not in the reviewed list below (a blanket, accidental or unreviewed grant),
//   * anything is granted to PUBLIC, GRANT ALL / ALL TABLES|FUNCTIONS IN SCHEMA / ALTER DEFAULT PRIVILEGES is used, a role outside the reviewed set is named, or row level security is missing or switched off,
//   * a privilege statement is hidden inside a function / DO body, or the migrations use a construct the checker cannot model (it fails closed rather than skipping it),
//   * check_internal_secret becomes executable by anyone but its owner (PUBLIC, anon, authenticated, authenticator, service_role), or a notification worker function loses its anon/authenticated EXECUTE
//     or is left executable by PUBLIC,
//   * the post-condition block of 0054 loses one of its checks (known tables must exist, PUBLIC must not execute any worker overload or the helper, the helper check covers authenticator),
//   * a migration added after 0054 creates a table without declaring its privileges.
// The analyzer is itself tested below with synthetic SQL, and the repository check is attacked with in-memory mutants (each one breaks exactly one rule), so a parser regression or a blind
// spot cannot make the check pass vacuously. This test and supabase/migrations/0054_explicit_privileges.sql are meant to LAND TOGETHER: the test asserts that the migration exists.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  analyzeMigrations,
  findGuardGaps,
  findViolations,
  hiddenPrivilegeText,
  requiredPairs,
  tokenize,
  type MigrationFile,
  type PolicyInfo,
  type PrivilegeConfig,
} from "@/lib/testUtils/migrationGrantsAnalyzer";

/** The reviewed privilege model. Changing a line here is the review step for changing who can touch what. */
const CONFIG: PrivilegeConfig = {
  expectedTableGrants: {
    // createPublicDataClient connects with the anon key and no session: it reads the public calendar reference data.
    anon: { economic_event_series: ["select"], economic_events: ["select"] },
    // The signed-in user's cookie client: select, upsert (insert + update) and insert, exactly as src/lib/supabase/{preferences,economicProfile,calculationSnapshots}.ts do.
    authenticated: {
      user_preferences: ["select", "insert", "update"],
      user_economic_profile: ["select", "insert", "update"],
      calculation_snapshots: ["select", "insert"],
      profile_history: ["select", "insert"],
    },
    // service_role and authenticator are reviewed roles that hold NO explicit table privilege through the migrations.
  },
  intentionalGaps: [
    // Public calendar tables: every caller reads them through the anon key (createPublicDataClient); signed-in users use the same client.
    { table: "economic_event_series", role: "authenticated", privilege: "select", reason: "read through the anon-key client only" },
    { table: "economic_events", role: "authenticated", privilege: "select", reason: "read through the anon-key client only" },
    { table: "economic_event_impact_stats", role: "authenticated", privilege: "select", reason: "no code reads this table" },
    { table: "economic_event_impact_stats", role: "anon", privilege: "select", reason: "no code reads this table" },
    // Policies that allow more than the application ever does: the privilege is withheld on purpose (least privilege).
    { table: "user_preferences", role: "authenticated", privilege: "delete", reason: "no feature deletes preferences" },
    { table: "user_economic_profile", role: "authenticated", privilege: "delete", reason: "no feature deletes the profile" },
    { table: "calculation_snapshots", role: "authenticated", privilege: "update", reason: "snapshots are append-only" },
    { table: "calculation_snapshots", role: "authenticated", privilege: "delete", reason: "no feature deletes snapshots" },
    { table: "profile_history", role: "authenticated", privilege: "delete", reason: "history is append-only" },
    // 0002's reserved table, "unused by anything" (see 0007): nothing may touch it until a feature needs it.
    { table: "user_event_subscriptions", role: "authenticated", privilege: "select", reason: "table is unused" },
    { table: "user_event_subscriptions", role: "authenticated", privilege: "insert", reason: "table is unused" },
    { table: "user_event_subscriptions", role: "authenticated", privilege: "update", reason: "table is unused" },
    { table: "user_event_subscriptions", role: "authenticated", privilege: "delete", reason: "table is unused" },
  ],
  ownerOnlyFunctions: ["check_internal_secret"],
  workerFunctions: [
    "get_pending_notification_jobs",
    "claim_notification_job_work",
    "get_pending_email_log_batch",
    "record_email_batch_results",
    "update_email_delivery_status",
  ],
  conventionAppliesAfter: 54,
};

// Synthetic migrations are numbered 0010 (older than the convention rule) unless a test says otherwise.
const run = (sql: string, name = "0010_synthetic.sql") => analyzeMigrations([{ name, sql }]);
const EMPTY: PrivilegeConfig = { expectedTableGrants: { anon: {}, authenticated: {} }, intentionalGaps: [], ownerOnlyFunctions: [], workerFunctions: [], conventionAppliesAfter: 54 };
const acl = (a: ReturnType<typeof run>, table: string, role: string) => [...(a.tableAcl.get(table)?.get(role) ?? [])].sort();
const violations = (sql: string, cfg: PrivilegeConfig = EMPTY, name?: string) => findViolations(run(sql, name), cfg).join("\n");

describe("tokenize", () => {
  it("drops comments, string literals and dollar-quoted bodies, keeps quoted identifiers", () => {
    const { code, comments } = tokenize(`-- grant all on public.t to anon;\nselect 'grant all on public.t to anon';\ndo $$ begin grant all on public.t to anon; end $$;\n/* grant all */ create policy "Anyone can read" on public.t for select using (true);`);
    expect(code).not.toMatch(/grant/);
    expect(code).toContain('"Anyone can read"');
    expect(comments.join("|")).toContain("grant all");
  });
  it("understands tagged dollar quotes and doubled single quotes, and returns the bodies", () => {
    const { code, bodies } = tokenize(`select 'it''s; grant all'; do $body$ grant all on public.t to anon; $body$; select 1;`);
    expect(code).not.toMatch(/grant/);
    expect(code).toContain("select 1");
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toContain("grant all on public.t to anon");
  });
  it("treats E'...' strings as backslash-escaped (an escaped quote does not end the string)", () => {
    const { code } = tokenize(`select E'it\\'s; grant all on public.t to anon'; select 2;`);
    expect(code).not.toMatch(/grant/);
    expect(code).toContain("select 2");
    expect(violations(`select E'it\\'s; grant all on public.t to anon';`)).toBe("");
  });
  it("handles nested block comments", () => {
    const { code } = tokenize(`/* outer /* inner grant all on public.t to anon; */ still a comment grant all */ select 3;`);
    expect(code).not.toMatch(/grant/);
    expect(code).toContain("select 3");
  });
});

describe("table privileges are replayed in file order", () => {
  it("handles several tables, several roles, REVOKE, ALL PRIVILEGES and WITH GRANT OPTION", () => {
    const a = run(`
      grant select, insert on public.t1, public.t2 to anon, authenticated;
      revoke insert on public.t1 from anon;
      grant all privileges on table public.t3 to authenticated with grant option;
      revoke delete, truncate on public.t3 from authenticated;`);
    expect(acl(a, "t1", "anon")).toEqual(["select"]);
    expect(acl(a, "t1", "authenticated")).toEqual(["insert", "select"]);
    expect(acl(a, "t2", "anon")).toEqual(["insert", "select"]);
    expect(acl(a, "t3", "authenticated")).toEqual(["insert", "maintain", "references", "select", "trigger", "update"]);
  });
  it("does not replay grants inside function bodies, comments and strings (a body that grants is REPORTED instead)", () => {
    const a = run(`create function public.f() returns void language plpgsql as $$ begin execute 'grant select on public.t to anon'; end; $$; -- grant select on public.t to anon;`);
    expect(a.tableAcl.size).toBe(0);
    expect(a.unsupported).toHaveLength(1);
  });
  it("does not treat REVOKE ... FROM PUBLIC as a violation", () => {
    const a = run(`create table public.t (id int); alter table public.t enable row level security; revoke all on public.t from public;`);
    expect(findViolations(a, EMPTY)).toEqual([]);
  });
  it("understands upper-case and quoted forms", () => {
    const a = run('GRANT SELECT ON TABLE PUBLIC."T" TO "ANON";');
    expect(acl(a, "t", "anon")).toEqual(["select"]);
  });
});

describe("blanket and unsafe grants are rejected", () => {
  it.each([
    ["GRANT ALL to anon", "grant all on public.t to anon;"],
    ["GRANT ALL PRIVILEGES to authenticated", "grant all privileges on table public.t to authenticated;"],
    ["grant to PUBLIC", "grant select on public.t to public;"],
    ["ALL TABLES IN SCHEMA", "grant select on all tables in schema public to anon;"],
    ["ALL FUNCTIONS IN SCHEMA", "grant execute on all functions in schema public to anon;"],
    ["ALL SEQUENCES IN SCHEMA", "grant usage on all sequences in schema public to anon;"],
    ["ALTER DEFAULT PRIVILEGES", "alter default privileges in schema public grant select on tables to anon;"],
    ["column-level grant", "grant select (id) on public.t to anon;"],
  ])("%s", (_label, sql) => {
    expect(violations(sql)).toMatch(/blanket or unsafe grant|unsupported SQL construct|PUBLIC holds|unintended grant/);
  });
});

describe("policies", () => {
  const policy = (sql: string): PolicyInfo => run(`create table public.t (id int); ${sql}`).policies[0];
  it("parses command, roles and ownership", () => {
    expect(policy(`create policy "Anyone can read" on public.t for select using (true);`)).toMatchObject({ table: "t", command: "select", roles: [], ownerScoped: false });
    expect(policy(`create policy "Own rows" on public.t for insert to authenticated with check ((select auth.uid()) = user_id);`)).toMatchObject({ command: "insert", roles: ["authenticated"], ownerScoped: true });
    expect(policy(`create policy p on public.t using (auth.uid() = user_id);`)).toMatchObject({ command: "all", ownerScoped: true });
    expect(policy(`create policy p on public.t for select to authenticated, anon using (true);`)).toMatchObject({ roles: ["authenticated", "anon"] });
  });
  it("maps a policy to the table privileges it assumes", () => {
    const pairs = (sql: string) => requiredPairs(policy(sql)).map((p) => `${p.role}:${p.privilege}`).sort();
    expect(pairs(`create policy a on public.t for select using (true);`)).toEqual(["anon:select", "authenticated:select"]);
    expect(pairs(`create policy a on public.t for update using (auth.uid() = user_id);`)).toEqual(["authenticated:update"]);
    expect(pairs(`create policy a on public.t for delete to anon using (true);`)).toEqual(["anon:delete"]);
    expect(pairs(`create policy a on public.t for all using (auth.uid() = user_id);`)).toEqual(["authenticated:delete", "authenticated:insert", "authenticated:select", "authenticated:update"]);
  });
});

describe("functions", () => {
  it("replays REVOKE / GRANT EXECUTE and resets on DROP", () => {
    const a = run(`
      create function public.h(a int) returns int language sql as $$ select 1 $$;
      revoke all on function public.h(int) from public, anon, authenticated, service_role;
      create function public.w(a int) returns int language sql as $$ select 1 $$;
      revoke all on function public.w(int) from public;
      grant execute on function public.w(int) to anon, authenticated;`);
    expect([...a.functionExec.get("h")!].filter(([, ok]) => ok)).toEqual([]);
    expect(a.functionExec.get("w")!.get("public")).toBe(false);
    expect(a.functionExec.get("w")!.get("anon")).toBe(true);
    const b = analyzeMigrations([{ name: "0100_a.sql", sql: "create function public.h(a int) returns int language sql as $$ select 1 $$; revoke all on function public.h(int) from anon;" }, { name: "0101_b.sql", sql: "drop function if exists public.h(int); create function public.h(a int) returns int language sql as $$ select 1 $$;" }]);
    expect(b.functionExec.get("h")!.get("anon")).toBe(true);
  });
  it("accepts a function reference without an argument list", () => {
    const a = run(`create function public.h() returns int language sql as $$ select 1 $$; revoke all on function public.h from anon;`);
    expect(a.functionExec.get("h")!.get("anon")).toBe(false);
  });
  it("DOCUMENTED LIMITATION: privileges are tracked by function NAME, so a REVOKE on one overload is recorded for all of them", () => {
    const a = run(`create function public.f(a int) returns int language sql as $$ select 1 $$; create function public.f(a text) returns int language sql as $$ select 1 $$; revoke all on function public.f(int) from anon;`);
    expect(a.functionExec.get("f")!.get("anon")).toBe(false);
  });
});

describe("analyzer blind spots closed in G.43 (each is reported, never skipped)", () => {
  const T = "create table public.t (id int); alter table public.t enable row level security;";

  it("DISABLE ROW LEVEL SECURITY removes the table from the enabled set", () => {
    expect(run(`${T} alter table public.t disable row level security;`).rlsEnabled.has("t")).toBe(false);
    expect(violations(`${T} alter table public.t disable row level security;`)).toMatch(/never enables row level security, or a later migration disables it/);
    expect(violations(`${T} alter table public.t disable row level security; alter table public.t enable row level security;`)).toBe("");
  });

  it("a privilege statement hidden in a DO block, function body or EXECUTE / format() string is reported", () => {
    expect(violations(`do $$ begin execute 'grant all on public.t to anon'; end $$;`)).toMatch(/contains GRANT \/ REVOKE \/ ALTER DEFAULT PRIVILEGES text/);
    expect(violations(`create function public.f() returns void language plpgsql as $x$ begin revoke all on public.t from anon; end $x$;`)).toMatch(/contains GRANT \/ REVOKE/);
    expect(violations(`create function public.f() returns void language plpgsql as $$ begin execute format('grant select on %I to anon', 't'); end $$;`)).toMatch(/contains GRANT \/ REVOKE/);
    expect(violations(`do $$ begin alter default privileges in schema public grant select on tables to anon; end $$;`)).toMatch(/contains GRANT \/ REVOKE/);
  });
  it("...but ordinary bodies, and comments inside bodies, are not false positives", () => {
    expect(violations(`create function public.f() returns int language plpgsql as $$ begin -- this grants nothing: grant is only a word in a comment on purpose to anon\n return 1; end $$;`)).toBe("");
    expect(violations(`do $$ begin raise exception 'permission is granted by the owner'; end $$;`)).toBe("");
    expect(hiddenPrivilegeText("select has_table_privilege('anon', 'public.t', 'select')")).toBe(false);
    expect(hiddenPrivilegeText("execute 'revoke all on public.t from anon'")).toBe(true);
  });

  it("GRANT ... ON ALL FUNCTIONS / TABLES / SEQUENCES IN SCHEMA is flagged", () => {
    expect(violations(`grant execute on all functions in schema public to anon;`)).toMatch(/ON ALL FUNCTIONS IN SCHEMA/);
    expect(violations(`grant select on all tables in schema public to authenticated;`)).toMatch(/ON ALL TABLES IN SCHEMA/);
    expect(violations(`revoke all on all tables in schema public from anon;`)).toBe(""); // a REVOKE only narrows
  });

  it("grants to roles outside the reviewed set are flagged; service_role and authenticator are reviewed but expected to hold nothing", () => {
    expect(violations(`grant select on public.t to someone_else;`)).toMatch(/unreviewed role "someone_else"/);
    expect(violations(`grant execute on function public.f(int) to dashboard_user;`)).toMatch(/unreviewed role "dashboard_user"/);
    expect(violations(`grant select on public.t to service_role;`)).toMatch(/unintended grant: service_role holds SELECT on t/);
    expect(violations(`grant select on public.t to authenticator;`)).toMatch(/unintended grant: authenticator holds SELECT on t/);
    const cfg: PrivilegeConfig = { ...EMPTY, expectedTableGrants: { service_role: { t: ["select"] } } };
    expect(violations(`grant select on public.t to service_role;`, cfg)).toBe("");
  });

  it("DROP TABLE and DROP POLICY are modelled", () => {
    const a = run(`${T} create policy p on public.t for select using (true); grant select on public.t to anon; drop policy p on public.t;`);
    expect(a.policies).toHaveLength(0);
    expect(acl(a, "t", "anon")).toEqual(["select"]);
    const b = run(`${T} create policy p on public.t for select using (true); grant select on public.t to anon; drop table public.t;`);
    expect(b.tables.has("t")).toBe(false);
    expect(b.rlsEnabled.has("t")).toBe(false);
    expect(b.policies).toHaveLength(0);
    expect(b.tableAcl.has("t")).toBe(false);
    expect(violations(`${T} drop table if exists public.t cascade;`)).toBe("");
  });
  it("ALTER POLICY, RENAME / SET SCHEMA / OWNER TO, views and role DDL are unsupported, not ignored", () => {
    expect(violations(`${T} alter policy p on public.t to authenticated;`)).toMatch(/ALTER POLICY is not modelled/);
    expect(violations(`${T} alter table public.t rename to u;`)).toMatch(/RENAME \/ SET SCHEMA \/ OWNER TO is not modelled/);
    expect(violations(`${T} alter table public.t set schema other;`)).toMatch(/RENAME \/ SET SCHEMA \/ OWNER TO is not modelled/);
    expect(violations(`${T} alter table public.t owner to someone;`)).toMatch(/RENAME \/ SET SCHEMA \/ OWNER TO is not modelled/);
    expect(violations(`create view public.v as select 1;`)).toMatch(/views are not modelled/);
    expect(violations(`create materialized view public.v as select 1;`)).toMatch(/views are not modelled/);
    expect(violations(`create role evil;`)).toMatch(/role DDL is not modelled/);
  });
  it("a CREATE TABLE in another schema is flagged, not mis-recorded as a public table", () => {
    const a = run(`create table private.secrets (id int);`);
    expect(a.tables.size).toBe(0);
    expect(violations(`create table private.secrets (id int);`)).toMatch(/CREATE TABLE in schema "private" is not modelled/);
    expect(violations(`drop table private.secrets;`)).toMatch(/DROP TABLE in schema "private" is not modelled/);
    expect(violations(`alter table auth.users enable row level security;`)).toBe(""); // not this repository's table
  });
  it("grants on schemas, sequences and role membership are unsupported, not ignored; revokes of them are harmless", () => {
    expect(violations(`grant usage on schema public to anon;`)).toMatch(/GRANT on SCHEMA is not modelled/);
    expect(violations(`grant usage on sequence public.s to anon;`)).toMatch(/GRANT on SEQUENCE is not modelled/);
    expect(violations(`grant anon to authenticator;`)).toMatch(/GRANT \/ REVOKE form not understood/);
    expect(violations(`revoke usage on schema public from anon;`)).toBe("");
  });
  it("BEGIN ATOMIC function bodies are unsupported", () => {
    expect(violations(`create function public.f() returns int language sql begin atomic select 1; end;`)).toMatch(/BEGIN ATOMIC function bodies are not modelled/);
  });
});

describe("findViolations catches each class of mistake", () => {
  const cfg = (over: Partial<PrivilegeConfig> = {}): PrivilegeConfig => ({ ...EMPTY, ...over });
  const base = `create table public.t (id int, user_id uuid); alter table public.t enable row level security;`;
  const msgs = (sql: string, c: PrivilegeConfig, name?: string) => violations(sql, c, name);
  const NEW = "0100_synthetic.sql";

  it("a table without row level security", () => expect(msgs(`create table public.t (id int);`, cfg())).toMatch(/never enables row level security/));
  it("a policy with no matching grant", () => expect(msgs(`${base} create policy p on public.t for select using (true);`, cfg())).toMatch(/assumes anon may SELECT t.*no migration grants it/));
  it("a grant that is not in the reviewed list", () => expect(msgs(`${base} grant select on public.t to anon;`, cfg())).toMatch(/unintended grant: anon holds SELECT on t/));
  it("a reviewed grant that is missing", () => expect(msgs(base, cfg({ expectedTableGrants: { anon: { t: ["select"] }, authenticated: {} } }))).toMatch(/missing grant: anon should hold SELECT on t/));
  it("a stale intentional gap", () => expect(msgs(base, cfg({ intentionalGaps: [{ table: "t", role: "anon", privilege: "select", reason: "x" }] }))).toMatch(/stale intentional gap/));
  it("an intentional gap that is actually granted", () => {
    const sql = `${base} create policy p on public.t for select using (true); grant select on public.t to anon;`;
    expect(msgs(sql, cfg({ expectedTableGrants: { anon: { t: ["select"] }, authenticated: {} }, intentionalGaps: [{ table: "t", role: "anon", privilege: "select", reason: "x" }] }))).toMatch(/is actually granted/);
  });
  it("an intentional gap makes a policy pass, and needs a reason", () => {
    const sql = `${base} create policy p on public.t for delete to authenticated using (auth.uid() = user_id);`;
    expect(msgs(sql, cfg({ intentionalGaps: [{ table: "t", role: "authenticated", privilege: "delete", reason: "no feature deletes" }] }))).toBe("");
    expect(msgs(sql, cfg({ intentionalGaps: [{ table: "t", role: "authenticated", privilege: "delete", reason: " " }] }))).toMatch(/has no reason/);
  });
  it("a policy plus its grant passes", () => {
    const sql = `${base} create policy p on public.t for select to authenticated using (auth.uid() = user_id); grant select on public.t to authenticated;`;
    expect(msgs(sql, cfg({ expectedTableGrants: { anon: {}, authenticated: { t: ["select"] } } }))).toBe("");
  });
  it("the internal helper executable by anon", () => expect(msgs(`create function public.h(a int) returns int language sql as $$ select 1 $$;`, cfg({ ownerOnlyFunctions: ["h"] }))).toMatch(/still executable by anon/));
  it("the internal helper executable by authenticator or PUBLIC (explicit grants; the revoke list does not need to name authenticator)", () => {
    const create = `create function public.h(a int) returns int language sql as $$ select 1 $$; revoke all on function public.h(int) from public, anon, authenticated, service_role;`;
    expect(msgs(create, cfg({ ownerOnlyFunctions: ["h"] }))).toBe("");
    expect(msgs(`${create} grant execute on function public.h(int) to authenticator;`, cfg({ ownerOnlyFunctions: ["h"] }))).toMatch(/function h is still executable by authenticator/);
    expect(msgs(`${create} grant execute on function public.h(int) to public;`, cfg({ ownerOnlyFunctions: ["h"] }))).toMatch(/function h is still executable by public/);
    expect(msgs(`${create} grant execute on function public.h(int) to authenticator; revoke execute on function public.h(int) from authenticator;`, cfg({ ownerOnlyFunctions: ["h"] }))).toBe("");
  });
  it("a worker function left executable by PUBLIC, or not granted to anon", () => {
    const sql = `create function public.w(a int) returns int language sql as $$ select 1 $$; revoke all on function public.w(int) from public, anon; grant execute on function public.w(int) to authenticated;`;
    expect(msgs(sql, cfg({ workerFunctions: ["w"] }))).toMatch(/not executable by anon/);
    expect(msgs(`create function public.w(a int) returns int language sql as $$ select 1 $$;`, cfg({ workerFunctions: ["w"] }))).toMatch(/executable by PUBLIC/);
  });
  it("a new table migration must declare its privileges", () => {
    expect(msgs(base, cfg(), NEW)).toMatch(/has no "-- privileges:" comment/);
    expect(msgs(base, cfg())).toBe(""); // a migration older than the rule is not subject to it
    expect(msgs(`-- privileges: none (reached only through SECURITY DEFINER functions)\n${base}`, cfg(), NEW)).toBe("");
    expect(msgs(`-- privileges: authenticated select\n${base}`, cfg(), NEW)).toMatch(/contains no GRANT for it/);
    expect(msgs(`-- privileges: authenticated select\n${base} grant select on public.t to authenticated;`, cfg({ expectedTableGrants: { anon: {}, authenticated: { t: ["select"] } } }), NEW)).toBe("");
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

describe("the repository's migrations", () => {
  // Relative to THIS file (src/lib/), not to the process's working directory.
  const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "supabase", "migrations");
  const files: MigrationFile[] = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort().map((name) => ({ name, sql: fs.readFileSync(path.join(dir, name), "utf8") }));
  const analysis = analyzeMigrations(files);
  const number = (name: string) => parseInt(name.slice(0, 4), 10);
  const migration0054 = files.find((f) => f.name === "0054_explicit_privileges.sql");

  it("were found and parsed (the check below cannot pass vacuously)", () => {
    expect(files.length).toBeGreaterThanOrEqual(54);
    expect(migration0054, "0054_explicit_privileges.sql must land together with this test").toBeDefined();
    expect(analysis.tables.size).toBeGreaterThanOrEqual(25);
    expect(analysis.policies.length).toBeGreaterThanOrEqual(22);
    expect(analysis.functionExec.has("check_internal_secret")).toBe(true);
  });

  it("grant exactly the privileges their row level security assumes, and nothing broader", () => {
    expect(findViolations(analysis, CONFIG)).toEqual([]);
  });

  it("use no construct the checker cannot model (it fails closed)", () => {
    expect(analysis.unsupported).toEqual([]);
    expect(analysis.blanket).toEqual([]);
  });

  describe("0054_explicit_privileges.sql", () => {
    const sql = migration0054?.sql ?? "";
    const { code } = tokenize(sql);

    it("is one transaction with a bounded lock wait", () => {
      expect(code).toMatch(/^\s*begin\s*;/m);
      expect(code).toMatch(/\bset local lock_timeout\b/);
      expect(code.trimEnd().endsWith("commit;")).toBe(true);
    });
    it("keeps the optional converge block disabled (no table-level REVOKE ALL outside comments)", () => {
      expect(code).not.toMatch(/revoke all on public\./);
    });
    it("lists exactly the tables the migrations create (the guard's row-level-security exception covers every table)", () => {
      const m = /known\s+constant\s+text\[\]\s*:=\s*array\[([\s\S]*?)\];/.exec(sql);
      expect(m, "the guard's list of known tables was not found").not.toBeNull();
      const listed = [...(m?.[1] ?? "").matchAll(/'([a-z0-9_]+)'/g)].map((x) => x[1]).sort();
      const created = [...analysis.tables.entries()].filter(([, file]) => number(file) <= 54).map(([table]) => table).sort();
      expect(listed).toEqual(created);
    });
    it("lists the same worker functions as the reviewed configuration", () => {
      const m = /workers\s+constant\s+text\[\]\s*:=\s*array\[([\s\S]*?)\];/.exec(sql);
      const listed = [...(m?.[1] ?? "").matchAll(/'([a-z0-9_]+)'/g)].map((x) => x[1]).sort();
      expect(listed).toEqual([...CONFIG.workerFunctions].sort());
    });
    it("keeps every check of its post-condition block (known tables exist, PUBLIC cannot execute the helper or any worker overload, the helper check covers authenticator)", () => {
      expect(findGuardGaps(sql)).toEqual([]);
    });
    it("does not revoke from roles beyond the reviewed four (authenticator is verified, not revoked)", () => {
      const revokes = [...code.matchAll(/\brevoke\b[^;]*;/gi)].map((x) => x[0].replace(/\s+/g, " "));
      expect(revokes).toEqual(["revoke all on function public.check_internal_secret(text, text) from public, anon, authenticated, service_role;"]);
    });
  });

  // Each mutant is applied IN MEMORY to the real migrations and breaks exactly one rule; the check must fail with that rule's message.
  interface Mutant { label: string; extra?: string; edit?: (f: MigrationFile) => MigrationFile; expect: RegExp }
  const in0054 = (replace: RegExp, by = "-- removed by mutant") => (f: MigrationFile): MigrationFile => (f.name === "0054_explicit_privileges.sql" ? { ...f, sql: f.sql.replace(replace, by) } : f);
  const MUTANTS: Mutant[] = [
    // --- the regression suite carried over from G.42
    { label: "GRANT ALL on a user table to anon", extra: "grant all on public.user_preferences to anon;", expect: /GRANT ALL on user_preferences to anon/ },
    { label: "an extra DELETE privilege for authenticated", extra: "grant delete on public.user_preferences to authenticated;", expect: /unintended grant: authenticated holds DELETE on user_preferences/ },
    { label: "a table privilege granted to PUBLIC", extra: "grant select on public.subscribers to public;", expect: /PUBLIC holds select on subscribers/ },
    { label: "the helper revoke removed from 0054", edit: in0054(/revoke all on function public\.check_internal_secret\(text, text\) from public, anon, authenticated, service_role;/), expect: /function check_internal_secret is still executable by anon/ },
    { label: "the anon SELECT on the calendar tables removed from 0054", edit: in0054(/grant select on public\.economic_event_series, public\.economic_events to anon;/), expect: /missing grant: anon should hold SELECT on economic_event_series/ },
    { label: "a new table with no RLS and no privileges note", extra: "create table public.leaky (id int);", expect: /never enables row level security/ },
    { label: "a new RLS policy whose grant is missing", extra: "-- privileges: authenticated select\ncreate table public.thing (id int, user_id uuid); alter table public.thing enable row level security; create policy p on public.thing for select to authenticated using (auth.uid() = user_id);", expect: /assumes authenticated may SELECT thing/ },
    { label: "ALTER DEFAULT PRIVILEGES", extra: "alter default privileges in schema public grant select on tables to anon;", expect: /ALTER DEFAULT PRIVILEGES is not allowed/ },
    { label: "a worker function loses its anon EXECUTE", extra: "revoke execute on function public.get_pending_notification_jobs(text, int) from anon;", expect: /worker function get_pending_notification_jobs is not executable by anon/ },
    { label: "a new table that declares privileges but never enables RLS", extra: "-- privileges: none\ncreate table public.open_t (id int);", expect: /creates open_t without enabling row level security/ },
    { label: "a reviewed grant revoked again", extra: "revoke select on public.user_preferences from authenticated;", expect: /missing grant: authenticated should hold SELECT on user_preferences/ },
    // --- the blind spots found in the G.42 review
    { label: "ROW LEVEL SECURITY switched off on an existing table", extra: "alter table public.user_preferences disable row level security;", expect: /user_preferences .* never enables row level security, or a later migration disables it/ },
    { label: "GRANT ALL hidden in a DO block via EXECUTE", extra: "do $$ begin execute 'grant all on public.user_preferences to anon'; end $$;", expect: /contains GRANT \/ REVOKE \/ ALTER DEFAULT PRIVILEGES text/ },
    { label: "REVOKE hidden in a tagged function body", extra: "create function public.sneaky() returns void language plpgsql as $f$ begin revoke all on public.economic_events from anon; end $f$;", expect: /contains GRANT \/ REVOKE/ },
    { label: "a GRANT built with format() inside a body", extra: "do $$ begin execute format('grant select on %I to anon', 'subscribers'); end $$;", expect: /contains GRANT \/ REVOKE/ },
    { label: "GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA", extra: "grant execute on all functions in schema public to anon;", expect: /ON ALL FUNCTIONS IN SCHEMA/ },
    { label: "GRANT SELECT ON ALL TABLES IN SCHEMA", extra: "grant select on all tables in schema public to authenticated;", expect: /ON ALL TABLES IN SCHEMA/ },
    { label: "a table privilege granted to authenticator", extra: "grant select on public.user_preferences to authenticator;", expect: /unintended grant: authenticator holds SELECT on user_preferences/ },
    { label: "a table privilege granted to service_role", extra: "grant select on public.user_preferences to service_role;", expect: /unintended grant: service_role holds SELECT on user_preferences/ },
    { label: "a table privilege granted to an unreviewed role", extra: "grant select on public.user_preferences to dashboard_user;", expect: /unreviewed role "dashboard_user"/ },
    { label: "a function privilege granted to an unreviewed role", extra: "grant execute on function public.get_pending_notification_jobs(text, int) to someone_else;", expect: /unreviewed role "someone_else"/ },
    { label: "a known table dropped", extra: "drop table public.user_preferences;", expect: /missing grant: authenticated should hold SELECT on user_preferences/ },
    { label: "a policy dropped (its gap entry becomes stale)", extra: 'drop policy "Anyone can read event series" on public.economic_event_series;', expect: /stale intentional gap/ },
    { label: "ALTER POLICY", extra: 'alter policy "Anyone can read events" on public.economic_events to authenticated;', expect: /ALTER POLICY is not modelled/ },
    { label: "a table created in another schema", extra: "create table private.secret_stuff (id int);", expect: /CREATE TABLE in schema "private" is not modelled/ },
    { label: "a table renamed", extra: "alter table public.user_preferences rename to prefs;", expect: /RENAME \/ SET SCHEMA \/ OWNER TO is not modelled/ },
    { label: "a table's owner changed", extra: "alter table public.user_preferences owner to someone_else;", expect: /RENAME \/ SET SCHEMA \/ OWNER TO is not modelled/ },
    { label: "a view over a user table", extra: "create view public.prefs_view as select * from public.user_preferences;", expect: /views are not modelled/ },
    { label: "role membership granted", extra: "grant anon to authenticator;", expect: /GRANT \/ REVOKE form not understood/ },
    { label: "a role created", extra: "create role evil;", expect: /role DDL is not modelled/ },
    { label: "a schema privilege granted to anon", extra: "grant usage on schema public to anon;", expect: /GRANT on SCHEMA is not modelled/ },
    { label: "a sequence privilege granted to anon", extra: "grant usage on sequence public.some_seq to anon;", expect: /GRANT on SEQUENCE is not modelled/ },
    { label: "a BEGIN ATOMIC function body", extra: "create function public.atomic_f() returns int language sql begin atomic select 1; end;", expect: /BEGIN ATOMIC function bodies are not modelled/ },
    // --- G.45: the helper reachable through authenticator or PUBLIC, a worker through PUBLIC
    { label: "the helper granted to authenticator", extra: "grant execute on function public.check_internal_secret(text, text) to authenticator;", expect: /function check_internal_secret is still executable by authenticator/ },
    { label: "the helper granted to PUBLIC", extra: "grant execute on function public.check_internal_secret(text, text) to public;", expect: /function check_internal_secret is still executable by public/ },
    { label: "a worker function granted to PUBLIC again", extra: "grant execute on function public.get_pending_notification_jobs(text, int) to public;", expect: /worker function get_pending_notification_jobs is executable by PUBLIC/ },
  ];

  it("(control) the unmutated migrations pass", () => {
    expect(findViolations(analysis, CONFIG)).toEqual([]);
  });

  for (const m of MUTANTS) {
    it(`mutant: ${m.label}`, () => {
      const mutated = [...files.map(m.edit ?? ((f) => f)), ...(m.extra ? [{ name: "0055_mutant.sql", sql: m.extra }] : [])];
      const found = findViolations(analyzeMigrations(mutated), CONFIG);
      expect(found.length, "the mutant was NOT detected").toBeGreaterThan(0);
      expect(found.join("\n")).toMatch(m.expect);
    });
  }

  // G.45: mutants of the post-condition block itself. Each one deletes or weakens exactly one check in 0054's DO block; the block's contract must name that check as missing.
  // (The block is PL/pgSQL, so this proves the check is PRESENT, not that PostgreSQL evaluates it correctly; the evaluation was shown separately, read-only, against a live database.)
  interface GuardMutant { label: string; edit: RegExp; by?: string; gap: RegExp }
  const GUARD_MUTANTS: GuardMutant[] = [
    // (a) a worker overload executable by PUBLIC
    { label: "the per-overload PUBLIC check of the workers removed", edit: /if rec\.public_exec then[\s\S]*?end if;/, gap: /a worker overload executable by PUBLIC raises an exception/ },
    { label: "the workers' ACL query ignores the default ACL (a NULL proacl would hide PUBLIC)", edit: /aclexplode\(coalesce\(pr\.proacl, acldefault\('f', pr\.proowner\)\)\) as x\s+where x\.grantee = 0/, by: "aclexplode(pr.proacl) as x where x.grantee = 0", gap: /each worker overload's ACL is read for PUBLIC/ },
    { label: "the workers' ACL query looks at the wrong grantee", edit: /where x\.grantee = 0 and x\.privilege_type = 'EXECUTE'\s*\) as public_exec/, by: "where x.grantee = 1 and x.privilege_type = 'EXECUTE') as public_exec", gap: /each worker overload's ACL is read for PUBLIC/ },
    { label: "the workers' anon / authenticated EXECUTE check removed", edit: /foreach role_name in array array\['anon', 'authenticated'\] loop[\s\S]*?end loop;/, gap: /every worker overload must be executable by anon and authenticated/ },
    { label: "the worker loop sees only one overload per name (DISTINCT)", edit: /for rec in\s+select pr\.oid, /, by: "for rec in select distinct on (pr.proname) pr.oid, ", gap: /every overload of the workers is visited/ },
    { label: "the five-distinct-names check weakened to count(*)", edit: /count\(distinct pr\.proname\) into n_found/, by: "count(*) into n_found", gap: /five worker names are counted by DISTINCT name/ },
    // (b) a missing known table
    { label: "the known-table existence check removed", edit: /-- D0\.[\s\S]*?raise exception 'migration 0054: known table\(s\) missing from schema public: %', bad;\s*end if;/, gap: /known tables must exist in public/ },
    { label: "the known-table existence check only warns", edit: /raise exception 'migration 0054: known table\(s\) missing/, by: "raise warning 'migration 0054: known table(s) missing", gap: /known tables must exist in public/ },
    { label: "the known-table existence check moved after the row-level-security check", edit: /(-- D0\.[\s\S]*?raise exception 'migration 0054: known table\(s\) missing from schema public: %', bad;\s*end if;\n)([\s\S]*?)(-- D6\.)/, by: "$2$1\n  $3", gap: /must run BEFORE the first row-level-security check/ },
    { label: "a known table without row level security only warns", edit: /raise exception 'migration 0054: row level security is not enabled on/, by: "raise warning 'migration 0054: row level security is not enabled on", gap: /a known table without row level security raises an exception/ },
    { label: "an unexpected table without row level security aborts (the report-only behaviour lost)", edit: /raise warning 'migration 0054 \(report only\): public tables NOT created by this repository/, by: "raise exception 'migration 0054 (report only): public tables NOT created by this repository", gap: /an unexpected public table without row level security only raises a warning/ },
    // (c) the helper executable by authenticator
    { label: "authenticator dropped from the helper check", edit: /array\['anon', 'authenticated', 'authenticator', 'service_role'\]/, by: "array['anon', 'authenticated', 'service_role']", gap: /the helper check covers authenticator/ },
    { label: "anon dropped from the helper check", edit: /array\['anon', 'authenticated', 'authenticator', 'service_role'\]/, by: "array['authenticated', 'authenticator', 'service_role']", gap: /the helper check covers anon/ },
    // (d) the helper executable by PUBLIC
    { label: "the helper's PUBLIC check removed", edit: /if exists \(\s*select 1\s*from pg_proc pr, aclexplode[\s\S]*?executable by PUBLIC';\s*end if;/, gap: /the helper check reads PUBLIC from the ACL/ },
    { label: "the helper's PUBLIC check ignores the default ACL", edit: /aclexplode\(coalesce\(pr\.proacl, acldefault\('f', pr\.proowner\)\)\) as x\s+where pr\.oid/, by: "aclexplode(pr.proacl) as x where pr.oid", gap: /the helper check reads PUBLIC from the ACL/ },
  ];
  const sql0054 = migration0054?.sql ?? "";
  for (const g of GUARD_MUTANTS) {
    it(`guard mutant: ${g.label}`, () => {
      const mutatedSql = sql0054.replace(g.edit, g.by ?? "-- removed by mutant");
      expect(mutatedSql, "the mutant did not change the migration (its pattern is stale)").not.toBe(sql0054);
      const gaps = findGuardGaps(mutatedSql);
      expect(gaps.length, "the mutant was NOT detected").toBeGreaterThan(0);
      expect(gaps.join("\n")).toMatch(g.gap);
    });
  }
  it("(control) the unmutated guard has no gaps, and a file without the block is reported", () => {
    expect(findGuardGaps(sql0054)).toEqual([]);
    expect(findGuardGaps("begin; commit;")).toEqual(["the DO block with the known-table list was not found"]);
  });
});
