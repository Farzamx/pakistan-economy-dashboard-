// Static analysis of supabase/migrations: what the migrations GRANT and REVOKE, checked against the row level security they declare.
//
// WHY. Row level security only filters rows for a role that already holds the TABLE privilege. The first 53 migrations never granted any: they relied on the privileges Supabase's
// default privileges handed out on the projects they were written for, which is not what a newly created project necessarily does. A migration set that does not state its own privileges
// therefore works on one project and fails ("permission denied for table ...", SQLSTATE 42501) on another. This module lets a test (src/lib/migrationGrants.test.ts) show, without a
// database, that every privilege a policy assumes is granted on purpose, that nothing broader is granted, and that the internal helper stays owner-only.
//
// HOW. It tokenizes each file (dropping comments, string literals and dollar-quoted bodies, so text inside a function body is never mistaken for a statement), splits it into statements, and
// replays CREATE TABLE / DROP TABLE / ENABLE | DISABLE ROW LEVEL SECURITY / CREATE | DROP POLICY / GRANT / REVOKE in file order. Only EXPLICIT statements are modelled: the implicit defaults
// of a particular Supabase project are exactly what this repository must not depend on. It is a pure module (no I/O), so it is unit-tested with synthetic SQL.
//
// FAIL CLOSED. Anything the checker cannot model is NOT ignored: it is recorded in `Analysis.unsupported` and reported by findViolations(), so a construct it cannot reason about can never
// make the check pass silently. Whoever introduces such a construct must review it by hand and extend this module. See docs/database-privileges.md, "What the checker cannot see".
//
// KNOWN LIMITATIONS (documented, not hidden)
//   * Function privileges are tracked by function NAME, not by full signature: a REVOKE on one overload is recorded for every overload of that name, and DROP FUNCTION forgets the name.
//     This is conservative for owner-only functions and weak for worker functions; the 0054 guard checks every overload in the database itself.
//   * Identifiers are matched lower-case: two objects whose names differ only by the case of a quoted identifier are not told apart.
//   * A policy that assumes SELECT in order to evaluate an UPDATE / DELETE WHERE clause is not modelled (only the privilege named by the policy's command is required).
//   * Sequence, schema, type and other non-table grants are reported as unsupported, not modelled.
//   * Statements nested inside a function / DO body are scanned only for privilege text (see hiddenPrivilegeText), not parsed.

export type TablePrivilege = "select" | "insert" | "update" | "delete" | "truncate" | "references" | "trigger" | "maintain";

export const ALL_TABLE_PRIVILEGES: readonly TablePrivilege[] = ["select", "insert", "update", "delete", "truncate", "references", "trigger", "maintain"];

/** The only roles a migration may name in a GRANT / REVOKE without being reported (plus the pseudo-role PUBLIC, which is reported separately when granted to). */
export const REVIEWED_ROLES = ["anon", "authenticated", "service_role", "authenticator"] as const;
export type ReviewedRole = (typeof REVIEWED_ROLES)[number];

export type PolicyCommand = "select" | "insert" | "update" | "delete" | "all";

export interface MigrationFile {
  name: string;
  sql: string;
}

export interface PolicyInfo {
  table: string;
  policy: string;
  command: PolicyCommand;
  /** Roles named in a TO clause (lower-case), or [] when the clause is absent (= PUBLIC). */
  roles: string[];
  /** True when the USING / WITH CHECK expression calls auth.uid() / auth.jwt(): the policy is meant for signed-in users only. */
  ownerScoped: boolean;
  file: string;
}

export interface FileFacts {
  created: string[];
  /** Tables that received a GRANT in this file (any role). */
  granted: Set<string>;
  /** Text of "-- privileges: ..." comment lines (lower-case). */
  markers: string[];
}

export interface Analysis {
  /** table -> the file that creates it (public schema only). */
  tables: Map<string, string>;
  rlsEnabled: Set<string>;
  policies: PolicyInfo[];
  /** table -> role -> privileges, from explicit GRANT / REVOKE statements replayed in file order. */
  tableAcl: Map<string, Map<string, Set<TablePrivilege>>>;
  /** function NAME -> role -> may execute (starts from "everyone", then replays GRANT / REVOKE EXECUTE). Name-level: see the limitations above. */
  functionExec: Map<string, Map<string, boolean>>;
  /** Grants that are too broad to reason about (GRANT ALL, ALL TABLES / FUNCTIONS IN SCHEMA, TO PUBLIC, ALTER DEFAULT PRIVILEGES). */
  blanket: string[];
  /** Constructs this module cannot model. Each one is reported as a violation: it must be reviewed by hand. */
  unsupported: string[];
  perFile: Map<string, FileFacts>;
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

export interface Tokens {
  /** The SQL with comments removed, string literals replaced by '' and dollar-quoted bodies replaced by $$. Double-quoted identifiers are kept. */
  code: string;
  comments: string[];
  /** The text of every dollar-quoted body (function bodies, DO blocks), for the hidden-privilege scan. */
  bodies: string[];
}

export function tokenize(sql: string): Tokens {
  let i = 0;
  let code = "";
  const comments: string[] = [];
  const bodies: string[] = [];
  while (i < sql.length) {
    const c = sql[i];
    const n = sql[i + 1];
    if (c === "-" && n === "-") {
      const e = sql.indexOf("\n", i);
      const end = e === -1 ? sql.length : e;
      comments.push(sql.slice(i + 2, end).trim());
      i = end;
      continue;
    }
    if (c === "/" && n === "*") {
      // PostgreSQL block comments nest.
      let depth = 1;
      let j = i + 2;
      while (j < sql.length && depth > 0) {
        if (sql[j] === "/" && sql[j + 1] === "*") { depth++; j += 2; }
        else if (sql[j] === "*" && sql[j + 1] === "/") { depth--; j += 2; }
        else j++;
      }
      comments.push(sql.slice(i + 2, Math.max(i + 2, j - 2)).trim());
      code += " ";
      i = j;
      continue;
    }
    if (c === "'") {
      // E'...' strings use backslash escapes; ordinary strings only double their quotes.
      const escapeString = i > 0 && /[eE]/.test(sql[i - 1]) && (i < 2 || !/[A-Za-z0-9_]/.test(sql[i - 2]));
      let j = i + 1;
      while (j < sql.length) {
        if (escapeString && sql[j] === "\\") { j += 2; continue; }
        if (sql[j] === "'") {
          if (sql[j + 1] === "'") { j += 2; continue; }
          break;
        }
        j++;
      }
      code += "''";
      i = j + 1;
      continue;
    }
    if (c === '"') {
      const e = sql.indexOf('"', i + 1);
      const end = e === -1 ? sql.length - 1 : e;
      code += sql.slice(i, end + 1);
      i = end + 1;
      continue;
    }
    if (c === "$") {
      const m = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(i, i + 80));
      if (m) {
        const tag = m[0];
        const e = sql.indexOf(tag, i + tag.length);
        const end = e === -1 ? sql.length : e + tag.length;
        bodies.push(sql.slice(i + tag.length, e === -1 ? sql.length : e));
        code += "$$";
        i = end;
        continue;
      }
    }
    code += c;
    i++;
  }
  return { code, comments, bodies };
}

/** Comment-free text of a dollar-quoted body, for scanning. */
function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\n]*/g, " ");
}

/** True when a function / DO body contains text that grants, revokes or changes default privileges (also via EXECUTE '...' or format(...)). Such statements are invisible to the replay. */
export function hiddenPrivilegeText(body: string): boolean {
  const t = stripComments(body);
  return /\b(grant|revoke)\b[\s\S]{0,200}?\b(on|to|from)\b/i.test(t) || /\balter\s+default\s+privileges\b/i.test(t);
}

function normalise(statement: string): string {
  return statement.replace(/\s+/g, " ").trim().toLowerCase();
}

interface Qualified {
  schema: string | null;
  name: string;
}

/** Splits "public"."t", other.t or t into schema and name (lower-case, quotes removed). */
function qualify(raw: string): Qualified {
  const parts = raw.trim().replace(/"/g, "").split(".");
  return parts.length >= 2 ? { schema: parts[parts.length - 2], name: parts[parts.length - 1] } : { schema: null, name: parts[0] };
}

const isPublic = (q: Qualified): boolean => q.schema === null || q.schema === "public";

function parseRoles(list: string): string[] {
  const cleaned = list
    .replace(/\s+with grant option\b.*$/, "")
    .replace(/\s+granted by\b.*$/, "")
    .replace(/\s+(cascade|restrict)\s*$/, "");
  return cleaned.split(",").map((r) => r.trim().replace(/^group\s+/, "").replace(/^"|"$/g, "")).filter(Boolean);
}

function parsePrivileges(list: string): { privileges: TablePrivilege[]; unsupported: string[] } {
  const privileges: TablePrivilege[] = [];
  const unsupported: string[] = [];
  for (const raw of list.split(",")) {
    const p = raw.trim();
    if (p === "all" || p === "all privileges") { privileges.push(...ALL_TABLE_PRIVILEGES); continue; }
    if ((ALL_TABLE_PRIVILEGES as readonly string[]).includes(p)) { privileges.push(p as TablePrivilege); continue; }
    if (p) unsupported.push(p);
  }
  return { privileges, unsupported };
}

function fileNumber(name: string): number {
  const m = /^(\d+)_/.exec(name);
  return m ? parseInt(m[1], 10) : -1;
}

const DEFAULT_EXEC_ROLES = ["public", "anon", "authenticated", "service_role"];

function execState(map: Map<string, Map<string, boolean>>, fn: string): Map<string, boolean> {
  let s = map.get(fn);
  if (!s) {
    s = new Map(DEFAULT_EXEC_ROLES.map((r) => [r, true] as [string, boolean]));
    map.set(fn, s);
  }
  return s;
}

function aclFor(acl: Analysis["tableAcl"], table: string, role: string): Set<TablePrivilege> {
  let byRole = acl.get(table);
  if (!byRole) { byRole = new Map(); acl.set(table, byRole); }
  let set = byRole.get(role);
  if (!set) { set = new Set(); byRole.set(role, set); }
  return set;
}

const NAME = `[a-z0-9_".]+`;
const KNOWN_ROLE_WORDS = new Set<string>([...REVIEWED_ROLES, "public"]);

/** Replays the migrations (in the order given: pass them sorted by file name). */
export function analyzeMigrations(files: MigrationFile[]): Analysis {
  const a: Analysis = {
    tables: new Map(), rlsEnabled: new Set(), policies: [], tableAcl: new Map(), functionExec: new Map(), blanket: [], unsupported: [], perFile: new Map(),
  };

  for (const file of files) {
    const facts: FileFacts = { created: [], granted: new Set(), markers: [] };
    a.perFile.set(file.name, facts);
    const unsupported = (why: string, s: string) => a.unsupported.push(`${file.name}: ${why} (${s.slice(0, 100)})`);
    const { code, comments, bodies } = tokenize(file.sql);
    for (const c of comments) {
      if (/^privileges\s*:/i.test(c)) facts.markers.push(c.toLowerCase());
    }
    for (const body of bodies) {
      if (hiddenPrivilegeText(body)) a.unsupported.push(`${file.name}: a function / DO body contains GRANT / REVOKE / ALTER DEFAULT PRIVILEGES text (privilege statements inside code blocks are not modelled)`);
    }
    if (/\bbegin\s+atomic\b/i.test(code)) a.unsupported.push(`${file.name}: BEGIN ATOMIC function bodies are not modelled`);

    const checkRoles = (roles: string[], s: string) => {
      for (const role of roles) if (!KNOWN_ROLE_WORDS.has(role)) unsupported(`unreviewed role "${role}" (reviewed: ${REVIEWED_ROLES.join(", ")}, PUBLIC)`, s);
    };

    for (const raw of code.split(";")) {
      const s = normalise(raw);
      if (!s) continue;
      // `begin` / `commit` / `set local ...` / `do $$` and other statements with no privilege meaning fall through every pattern below and are ignored.

      let m = new RegExp(`^create (?:unlogged )?table (?:if not exists )?(${NAME})`).exec(s);
      if (m) {
        const q = qualify(m[1]);
        if (!isPublic(q)) { unsupported(`CREATE TABLE in schema "${q.schema}" is not modelled (only the public schema is)`, s); continue; }
        if (!a.tables.has(q.name)) a.tables.set(q.name, file.name);
        facts.created.push(q.name);
        continue;
      }

      m = new RegExp(`^drop table (?:if exists )?(.+?)(?: cascade| restrict)?$`).exec(s);
      if (m) {
        for (const part of m[1].split(",")) {
          const q = qualify(part);
          if (!isPublic(q)) { unsupported(`DROP TABLE in schema "${q.schema}" is not modelled`, s); continue; }
          a.tables.delete(q.name);
          a.rlsEnabled.delete(q.name);
          a.tableAcl.delete(q.name);
          a.policies = a.policies.filter((p) => p.table !== q.name);
        }
        continue;
      }

      m = new RegExp(`^alter table (?:if exists )?(?:only )?(${NAME}) (.*)$`).exec(s);
      if (m) {
        const q = qualify(m[1]);
        const rest = m[2];
        if (!isPublic(q)) continue; // other schemas are outside this repository's tables
        if (/\b(rename to|set schema|owner to)\b/.test(rest)) { unsupported(`ALTER TABLE ... RENAME / SET SCHEMA / OWNER TO is not modelled`, s); continue; }
        if (/\bdisable row level security\b/.test(rest)) a.rlsEnabled.delete(q.name);
        if (/\benable row level security\b/.test(rest)) a.rlsEnabled.add(q.name);
        continue;
      }

      m = new RegExp(`^create policy ("[^"]*"|\\S+) on (${NAME})(.*)$`).exec(s);
      if (m) {
        const q = qualify(m[2]);
        if (!isPublic(q)) { unsupported(`CREATE POLICY on schema "${q.schema}" is not modelled`, s); continue; }
        const rest = m[3] ?? "";
        const cmd = /\bfor (all|select|insert|update|delete)\b/.exec(rest);
        const to = /\bto ((?:[a-z_][a-z0-9_]*)(?:\s*,\s*[a-z_][a-z0-9_]*)*)(?=\s+(?:using|with check)\b|\s*$)/.exec(rest.replace(/\bfor (?:all|select|insert|update|delete)\b/, " "));
        a.policies.push({
          table: q.name,
          policy: m[1].replace(/^"|"$/g, ""),
          command: (cmd ? cmd[1] : "all") as PolicyCommand,
          roles: to ? parseRoles(to[1]) : [],
          ownerScoped: /\bauth\s*\.\s*(uid|jwt)\s*\(/.test(rest),
          file: file.name,
        });
        continue;
      }

      m = new RegExp(`^drop policy (?:if exists )?("[^"]*"|\\S+) on (${NAME})`).exec(s);
      if (m) {
        const q = qualify(m[2]);
        const policy = m[1].replace(/^"|"$/g, "");
        if (isPublic(q)) a.policies = a.policies.filter((p) => !(p.table === q.name && p.policy === policy));
        else unsupported(`DROP POLICY on schema "${q.schema}" is not modelled`, s);
        continue;
      }

      if (/^alter policy\b/.test(s)) { unsupported("ALTER POLICY is not modelled (it can change roles and expressions)", s); continue; }
      if (/^create (?:or replace )?(?:materialized )?view\b/.test(s)) { unsupported("views are not modelled (a view can expose rows that row level security hides)", s); continue; }
      if (/^(create|alter|drop) (role|user|group)\b/.test(s)) { unsupported("role DDL is not modelled", s); continue; }
      if (/^alter default privileges\b/.test(s)) { a.blanket.push(`${file.name}: ALTER DEFAULT PRIVILEGES is not allowed (${s.slice(0, 90)})`); continue; }

      m = /^create (?:or replace )?function (?:"?public"?\.)?"?([a-z0-9_]+)"?\s*\(/.exec(s);
      if (m) { execState(a.functionExec, m[1]); continue; }

      m = /^drop function (?:if exists )?(?:"?public"?\.)?"?([a-z0-9_]+)"?\s*\(/.exec(s);
      if (m) { a.functionExec.delete(m[1]); continue; }

      m = new RegExp(`^(grant|revoke) (execute|all(?: privileges)?) on (?:function|routine) (?:"?public"?\\.)?"?([a-z0-9_]+)"?(?:\\s*\\(.*?\\))? (to|from) (.+)$`).exec(s);
      if (m) {
        const roles = parseRoles(m[5]);
        checkRoles(roles, s);
        const state = execState(a.functionExec, m[3]);
        for (const role of roles) state.set(role, m[1] === "grant");
        continue;
      }

      m = /^(grant|revoke) (.+?) on (.+?) (to|from) (.+)$/.exec(s);
      if (m) {
        const [, verb, privText, objectText, , roleText] = m;
        const roles = parseRoles(roleText);
        checkRoles(roles, s);
        const inSchema = /^all (tables|functions|routines|procedures|sequences) in schema\b/.exec(objectText);
        if (inSchema) {
          if (verb === "grant") a.blanket.push(`${file.name}: GRANT ... ON ALL ${inSchema[1].toUpperCase()} IN SCHEMA (${s.slice(0, 90)})`);
          continue;
        }
        const otherKind = /^(function|routine|procedure|schema|sequence|database|type|domain|language|foreign|large object|tablespace|parameter)\b/.exec(objectText);
        if (otherKind) {
          if (verb === "grant") unsupported(`GRANT on ${otherKind[1].toUpperCase()} is not modelled (review by hand)`, s);
          continue;
        }
        const tables = objectText.replace(/^table\s+/, "").split(",").map(qualify).map((q) => (isPublic(q) ? q.name : `${q.schema}.${q.name}`)).filter(Boolean);
        const { privileges, unsupported: odd } = parsePrivileges(privText);
        if (odd.length) unsupported(`unsupported privilege form "${odd.join(", ")}" (column-level grants and GRANT OPTION FOR are not modelled)`, s);
        if (verb === "grant") {
          if (/^all( privileges)?$/.test(privText.trim()) && roles.some((r) => r === "anon" || r === "authenticated" || r === "public")) {
            a.blanket.push(`${file.name}: GRANT ALL on ${tables.join(", ")} to ${roles.join(", ")}`);
          }
          if (roles.includes("public")) a.blanket.push(`${file.name}: grant to PUBLIC on ${tables.join(", ")}`);
        }
        for (const table of tables) {
          if (verb === "grant") facts.granted.add(table);
          for (const role of roles) {
            const set = aclFor(a.tableAcl, table, role);
            for (const p of privileges) { if (verb === "grant") set.add(p); else set.delete(p); }
          }
        }
        continue;
      }

      // Anything else that still starts with GRANT / REVOKE (role membership, malformed forms) was not understood: never skip it silently.
      if (/^(grant|revoke)\b/.test(s)) { unsupported("GRANT / REVOKE form not understood (role membership?)", s); continue; }
    }
  }
  return a;
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

export interface IntentionalGap {
  table: string;
  role: "anon" | "authenticated";
  privilege: TablePrivilege;
  /** Why a policy exists but the privilege is deliberately not granted. Required: an exception without a reason is itself a violation. */
  reason: string;
}

export interface PrivilegeConfig {
  /**
   * The exact set of EXPLICIT table privileges each reviewed role may hold after every migration. Anything else is "unintended". A reviewed role that is not listed
   * (service_role, authenticator) is expected to hold none.
   */
  expectedTableGrants: Partial<Record<ReviewedRole, Record<string, TablePrivilege[]>>>;
  intentionalGaps: IntentionalGap[];
  /** Functions only their owner may execute (not anon, authenticated, service_role or PUBLIC). */
  ownerOnlyFunctions: string[];
  /** SECURITY DEFINER entry points that must stay executable by anon and authenticated, and NOT by PUBLIC (an explicit grant model). */
  workerFunctions: string[];
  /** Migrations numbered above this that create a table must declare their privileges (see docs/database-privileges.md). */
  conventionAppliesAfter: number;
}

/** What a policy assumes: the (role, privilege) pairs that must be backed by a table privilege. */
export function requiredPairs(p: PolicyInfo): { role: "anon" | "authenticated"; privilege: TablePrivilege }[] {
  const explicit = p.roles.filter((r) => r === "anon" || r === "authenticated") as ("anon" | "authenticated")[];
  const appliesToPublic = p.roles.length === 0 || p.roles.includes("public");
  const roles: ("anon" | "authenticated")[] = appliesToPublic ? (p.ownerScoped ? ["authenticated"] : ["anon", "authenticated"]) : explicit;
  const privileges: TablePrivilege[] = p.command === "all" ? ["select", "insert", "update", "delete"] : [p.command];
  const out: { role: "anon" | "authenticated"; privilege: TablePrivilege }[] = [];
  for (const role of roles) for (const privilege of privileges) out.push({ role, privilege });
  return out;
}

function granted(a: Analysis, table: string, role: string): Set<TablePrivilege> {
  return a.tableAcl.get(table)?.get(role) ?? new Set<TablePrivilege>();
}

/** Every rule violation, as a human-readable line. An empty array means the migrations pass. */
export function findViolations(a: Analysis, cfg: PrivilegeConfig): string[] {
  const v: string[] = [];

  // 0. Constructs the checker cannot model are never skipped silently.
  for (const u of a.unsupported) v.push(`unsupported SQL construct (review by hand and extend the checker): ${u}`);

  // 1. Every table has row level security (and it is still enabled after the last migration).
  for (const [table, file] of a.tables) if (!a.rlsEnabled.has(table)) v.push(`table ${table} (${file}) never enables row level security, or a later migration disables it`);

  // 2. No blanket / unsafe grants anywhere.
  for (const b of a.blanket) v.push(`blanket or unsafe grant: ${b}`);

  // 3. PUBLIC holds nothing on any table.
  for (const [table, byRole] of a.tableAcl) {
    const pub = byRole.get("public");
    if (pub && pub.size) v.push(`PUBLIC holds ${[...pub].join(", ")} on ${table}`);
  }

  // 4. The explicit privileges of every reviewed role are EXACTLY the expected ones (no extras, none missing).
  for (const role of REVIEWED_ROLES) {
    const expected = cfg.expectedTableGrants[role] ?? {};
    const tables = new Set<string>([...Object.keys(expected), ...[...a.tableAcl.keys()].filter((t) => granted(a, t, role).size > 0)]);
    for (const table of [...tables].sort()) {
      const want = new Set<TablePrivilege>(expected[table] ?? []);
      const have = granted(a, table, role);
      for (const p of have) if (!want.has(p)) v.push(`unintended grant: ${role} holds ${p.toUpperCase()} on ${table}`);
      for (const p of want) if (!have.has(p)) v.push(`missing grant: ${role} should hold ${p.toUpperCase()} on ${table}`);
    }
  }

  // 5. Every privilege a policy assumes is granted, or listed as an intentional gap with a reason; no stale gaps.
  const required = new Map<string, string>();
  for (const p of a.policies) for (const r of requiredPairs(p)) required.set(`${p.table}|${r.role}|${r.privilege}`, `policy "${p.policy}" (${p.file})`);
  const gapKeys = new Set<string>();
  for (const g of cfg.intentionalGaps) {
    const key = `${g.table}|${g.role}|${g.privilege}`;
    gapKeys.add(key);
    if (!g.reason.trim()) v.push(`intentional gap ${key} has no reason`);
    if (!required.has(key)) v.push(`stale intentional gap: no policy needs ${g.privilege.toUpperCase()} for ${g.role} on ${g.table}`);
    if (granted(a, g.table, g.role).has(g.privilege)) v.push(`intentional gap ${key} is actually granted: remove it from the gap list`);
  }
  for (const [key, who] of required) {
    const [table, role, privilege] = key.split("|");
    if (!granted(a, table, role).has(privilege as TablePrivilege) && !gapKeys.has(key)) {
      v.push(`${who} assumes ${role} may ${privilege.toUpperCase()} ${table}, but no migration grants it (grant it, or record an intentional gap with a reason)`);
    }
  }

  // 6. Owner-only functions.
  for (const fn of cfg.ownerOnlyFunctions) {
    const s = a.functionExec.get(fn);
    if (!s) { v.push(`function ${fn} is not created by any migration`); continue; }
    // authenticator is not part of the default state (Supabase's default function privileges name anon / authenticated / service_role), so it is
    // flagged only when a migration grants it explicitly; no revoke is needed for it.
    for (const role of ["public", "anon", "authenticated", "authenticator", "service_role"]) if (s.get(role)) v.push(`function ${fn} is still executable by ${role}`);
  }

  // 7. Worker functions keep an explicit anon + authenticated grant, and PUBLIC is revoked.
  for (const fn of cfg.workerFunctions) {
    const s = a.functionExec.get(fn);
    if (!s) { v.push(`worker function ${fn} is not created by any migration`); continue; }
    if (s.get("public")) v.push(`worker function ${fn} is executable by PUBLIC (revoke it, then grant anon and authenticated explicitly)`);
    for (const role of ["anon", "authenticated"]) if (!s.get(role)) v.push(`worker function ${fn} is not executable by ${role}`);
  }

  // 8. The convention for NEW tables.
  for (const [file, facts] of a.perFile) {
    if (fileNumber(file) <= cfg.conventionAppliesAfter || facts.created.length === 0) continue;
    if (facts.markers.length === 0) { v.push(`${file} creates ${facts.created.join(", ")} but has no "-- privileges:" comment (see docs/database-privileges.md)`); continue; }
    const none = facts.markers.some((m) => /^privileges\s*:\s*none\b/.test(m));
    for (const t of facts.created) {
      if (!none && !facts.granted.has(t)) v.push(`${file} creates ${t} and declares privileges, but contains no GRANT for it`);
      if (!a.rlsEnabled.has(t)) v.push(`${file} creates ${t} without enabling row level security`);
    }
  }

  return v;
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

/**
 * A structural contract for the post-condition block (the DO block) of a privilege migration such as 0054. It cannot RUN the block (that needs a database; 0054 was run read-only on staging
 * by hand), but it proves the block still CONTAINS each check, so deleting or weakening one is a test failure. The text is scanned with comments removed and whitespace collapsed, so a
 * comment that merely mentions a check can never satisfy it. Returns the names of the checks that are missing (empty = all present).
 */
export function findGuardGaps(sql: string): string[] {
  const body = tokenize(sql).bodies.find((b) => /\bknown\s+constant\s+text\[\]/i.test(b));
  if (body === undefined) return ["the DO block with the known-table list was not found"];
  const t = stripComments(body).replace(/\s+/g, " ").trim();
  const gaps: string[] = [];
  const need = (name: string, ok: boolean) => { if (!ok) gaps.push(name); };

  // Known tables must exist, and that check must come before any row-level-security check.
  const existence = /from unnest\(known\) as k where not exists \([^;]*?pg_class[^;]*?c\.relname = k\)\; if bad is not null then raise exception 'migration 0054: known table\(s\) missing from schema public: %', bad;/i.exec(t);
  need("known tables must exist in public (exception listing the missing ones)", existence !== null);
  const firstRls = t.search(/relrowsecurity/i);
  need("the known-table existence check must run BEFORE the first row-level-security check", existence !== null && firstRls !== -1 && existence.index < firstRls);

  // Known tables without RLS are an exception; other public tables without RLS only a warning.
  need("a known table without row level security raises an exception", /c\.relname = any \(known\) and not c\.relrowsecurity; if bad is not null then raise exception 'migration 0054: row level security is not enabled on: %', bad;/i.test(t));
  need("an unexpected public table without row level security only raises a warning", /not \(c\.relname = any \(known\)\) and not c\.relrowsecurity; if bad is not null then raise warning /i.test(t));

  // The helper: effective privilege for every API-reachable role, plus the PUBLIC pseudo-role read from the ACL.
  const helperRoles = /foreach role_name in array array\[([^\]]*)\] loop if has_function_privilege\(role_name, 'public\.check_internal_secret\(text, text\)', 'execute'\) then raise exception 'migration 0054: check_internal_secret is still executable by %', role_name;/i.exec(t);
  const roleList = (helperRoles?.[1] ?? "").match(/'([a-z_]+)'/gi)?.map((r) => r.replace(/'/g, "")) ?? [];
  for (const role of ["anon", "authenticated", "authenticator", "service_role"]) need(`the helper check covers ${role}`, roleList.includes(role));
  need(
    "the helper check reads PUBLIC from the ACL (aclexplode of coalesce(proacl, acldefault), grantee = 0)",
    /if exists \( select 1 from pg_proc pr, aclexplode\(coalesce\(pr\.proacl, acldefault\('f', pr\.proowner\)\)\) as x where pr\.oid = 'public\.check_internal_secret\(text, text\)'::regprocedure and x\.grantee = 0 and x\.privilege_type = 'EXECUTE' \) then raise exception 'migration 0054: check_internal_secret is executable by PUBLIC';/i.test(t),
  );

  // The workers: five distinct names, EVERY overload checked, PUBLIC absent (ACL), anon and authenticated present.
  need("the five worker names are counted by DISTINCT name", /select count\(distinct pr\.proname\) into n_found/i.test(t) && /if n_found < cardinality\(workers\) then/i.test(t));
  need("every overload of the workers is visited (no DISTINCT / LIMIT in the loop query)", /for rec in select pr\.oid, pr\.oid::regprocedure::text as sig, exists \([^;]*?\) as public_exec from pg_proc pr join pg_namespace ns on ns\.oid = pr\.pronamespace where ns\.nspname = 'public' and pr\.proname = any \(workers\) loop /i.test(t));
  need(
    "each worker overload's ACL is read for PUBLIC (aclexplode of coalesce(proacl, acldefault), grantee = 0)",
    /exists \( select 1 from aclexplode\(coalesce\(pr\.proacl, acldefault\('f', pr\.proowner\)\)\) as x where x\.grantee = 0 and x\.privilege_type = 'EXECUTE' \) as public_exec/i.test(t),
  );
  need("a worker overload executable by PUBLIC raises an exception", /if rec\.public_exec then raise exception 'migration 0054: worker function % is executable by PUBLIC', rec\.sig; end if;/i.test(t));
  need(
    "every worker overload must be executable by anon and authenticated",
    /foreach role_name in array array\['anon', 'authenticated'\] loop if not has_function_privilege\(role_name, rec\.oid, 'execute'\) then raise exception 'migration 0054: worker function % is not executable by %', rec\.sig, role_name;/i.test(t),
  );
  return gaps;
}
