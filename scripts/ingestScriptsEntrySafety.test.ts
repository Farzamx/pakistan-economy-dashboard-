// Phase F.2b-S — import safety, entry points and isolation for the six scripts that used to run at import:
//   ingestSbp · ingestWorldBank · ingestFred · ingestNetLiquidReserves · ingestYahooGold · calendarCanonicalDryRun
//
// Every child process here is started with an EXPLICIT environment from isolatedChildEnv() (dead credentials,
// loopback database URL, isolation marker — verified, fails closed). The only URL a child is ever given is a
// loopback spy. No test can reach a real database; the tests that go further than "refused" also deny every
// non-loopback connection and say what they denied.
//
//   1. IMPORT IS INERT   a real child imports the script with tripwires on: fetch, sockets, child_process,
//                        createClient, dotenv, process.exit, "Started" log lines. All must stay at zero, and the
//                        script's exports must still be there. A synthetic old-style script proves the probe CAN fail.
//   2. EXPLICIT START    run exactly like Task Scheduler (node + tsx cli + absolute path, cwd = repo root) and like
//                        `npm run`: the entry point is reached (it refuses under the harness: exit 2, a clear
//                        message, zero requests) — silence would mean the entry point was NOT detected.
//   3. PAST THE BARRIER  with the entry barrier removed from a mutated copy (marker still set, so no env file is
//                        read), main() runs and behaves exactly as it always has (same message, same exit code).
//   4. CONTAINMENT       with the barrier removed AND a secret present, the World Bank run reaches for its provider
//                        and the database: the provider connection is denied, and every database request lands on
//                        the loopback spy carrying only dead credentials.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse as parseDotenv } from "dotenv";
import { ROOT, TSX_CLI, brief, makeMutant, runChild, scratchDir, startSpy, type Scratch } from "@/lib/testUtils/scriptHarness";
import { CHILD_ENV_ALLOWLIST, isSensitiveName, isolatedChildEnv, loadProductionFingerprints } from "@/lib/testUtils/productionIsolation";

interface ScriptCase { name: string; file: string; label: string; npm: string | null; kind: "ingest" | "calendar" | "reader" }
const SCRIPTS: ScriptCase[] = [
  { name: "ingestSbp", file: "scripts/ingestSbp.ts", label: "ingest:sbp", npm: "ingest:sbp", kind: "ingest" },
  { name: "ingestWorldBank", file: "scripts/ingestWorldBank.ts", label: "ingest:worldbank", npm: "ingest:worldbank", kind: "ingest" },
  { name: "ingestFred", file: "scripts/ingestFred.ts", label: "ingest:fred", npm: "ingest:fred", kind: "ingest" },
  { name: "ingestNetLiquidReserves", file: "scripts/ingestNetLiquidReserves.ts", label: "ingest:netliquidreserves", npm: "ingest:netliquidreserves", kind: "ingest" },
  { name: "ingestYahooGold", file: "scripts/ingestYahooGold.ts", label: "ingest:yahoogold", npm: "ingest:yahoogold", kind: "ingest" },
  { name: "calendarCanonicalDryRun", file: "scripts/calendarCanonicalDryRun.ts", label: "calendarCanonicalDryRun", npm: null, kind: "calendar" },
  // Phase F.2e-Prep: the READ-ONLY ledger verification harness. Sections 1 (import is inert) and 2 (refuses under the
  // harness, zero requests) apply to it; sections 3 and 4 select only "ingest"/"calendar" kinds.
  { name: "reconcileInflationLedger", file: "scripts/reconcileInflationLedger.ts", label: "reconcile:inflation-ledger", npm: null, kind: "reader" },
  // Phase F.2f: the read-only CPI ingestion/currency status command (sections 1 and 2 only, like the reconcile harness).
  { name: "checkCpiLedgerStatus", file: "scripts/checkCpiLedgerStatus.ts", label: "check:cpi-status", npm: "check:cpistatus", kind: "reader" },
];
const abs = (s: ScriptCase) => path.join(ROOT, s.file);

let scratch: Scratch;
let probePath = "";
beforeAll(() => {
  scratch = scratchDir();
  probePath = path.join(scratch.dir, "probe.ts"); // written once: concurrent probes only ever read it
  writeFileSync(probePath, PROBE);
});
afterAll(() => scratch.cleanup());

/** A non-sensitive variable defined in .env.local but never given to a child: if it shows up, the env file was read. */
function canaryName(): string | null {
  const envFile = path.join(ROOT, ".env.local");
  if (!existsSync(envFile)) return null;
  const allow = new Set(CHILD_ENV_ALLOWLIST);
  return Object.keys(parseDotenv(readFileSync(envFile, "utf-8"))).find((n) => !isSensitiveName(n) && !allow.has(n)) ?? null;
}

// ── 1. import is inert ──────────────────────────────────────────────────────
const PROBE = `
import Module from "node:module";
const counts = { fetch: 0, socket: 0, spawn: 0, exit: 0, createClient: 0, dotenv: 0, started: 0 };
const realExit = process.exit.bind(process);
const g = globalThis as unknown as { fetch: unknown };
g.fetch = () => { counts.fetch++; return Promise.reject(new Error("denied")); };
const net = require("node:net");
net.Socket.prototype.connect = function (this: { destroy(e: Error): void }) { counts.socket++; process.nextTick(() => this.destroy(new Error("denied"))); return this; };
const cp = require("node:child_process");
for (const k of ["spawn", "spawnSync", "exec", "execSync", "execFile", "execFileSync", "fork"]) cp[k] = () => { counts.spawn++; throw new Error("denied"); };
process.exit = (() => { counts.exit++; }) as never;
const origLog = console.log;
console.log = (...a: unknown[]) => { if (String(a[0]).includes("Started")) counts.started++; };
const M = Module as unknown as { prototype: { require: (id: string) => unknown } };
const origRequire = M.prototype.require;
M.prototype.require = function (this: unknown, id: string) {
  const m = origRequire.apply(this, [id]) as Record<string, unknown>;
  if (id === "@supabase/supabase-js") return new Proxy(m, { get: (t, p) => (p === "createClient" ? (...a: unknown[]) => { counts.createClient++; return (t.createClient as (...x: unknown[]) => unknown)(...a); } : t[p as string]) });
  if (id === "dotenv") return new Proxy(m, { get: (t, p) => (p === "config" ? (...a: unknown[]) => { counts.dotenv++; return (t.config as (...x: unknown[]) => unknown)(...a); } : t[p as string]) });
  return m;
};
let error: string | null = null;
let exportsKeys: string[] = [];
try { exportsKeys = Object.keys(require(process.env.PROBE_TARGET as string)); } catch (e) { error = String(e).slice(0, 300); }
setTimeout(() => {
  origLog(JSON.stringify({ counts, error, exportsKeys, canary: process.env.PROBE_CANARY ? (process.env[process.env.PROBE_CANARY] ?? null) : null }));
  realExit(0);
}, 1500);
`;

interface ProbeResult { counts: Record<string, number>; error: string | null; exportsKeys: string[]; canary: string | null }

async function probeImport(target: string): Promise<ProbeResult> {
  const probe = probePath;
  const canary = canaryName();
  const spy = await startSpy();
  try {
    const env = isolatedChildEnv(ROOT, process.env, { NEXT_PUBLIC_SUPABASE_URL: spy.url, PROBE_TARGET: target, ...(canary ? { PROBE_CANARY: canary } : {}) });
    const r = await runChild(probe, [], env);
    const line = r.out.split("\n").find((l) => l.startsWith("{"));
    if (!line) throw new Error("probe produced no result: " + brief(r.err || r.out));
    expect(spy.requests, "importing must not contact the database").toHaveLength(0);
    return JSON.parse(line) as ProbeResult;
  } finally {
    await spy.close();
  }
}

describe.concurrent("1. importing a script is inert", () => {
  it.concurrent.each(SCRIPTS.map((s) => [s.name, s] as const))("%s: no main(), no env file, no client, no network, no subprocess, no exit", async (_n, s) => {
    const r = await probeImport(abs(s));
    expect(r.error, "importing must not throw").toBeNull();
    expect(r.counts).toEqual({ fetch: 0, socket: 0, spawn: 0, exit: 0, createClient: 0, dotenv: 0, started: 0 });
    expect(r.canary, "a variable that exists only in .env.local appeared: the env file was read on import").toBeNull();
  }, 170_000);

  it.concurrent("ingestSbp still exports ingestSeries (the thing its unit tests need)", async () => {
    const r = await probeImport(abs(SCRIPTS[0]));
    expect(r.exportsKeys).toContain("ingestSeries");
  }, 170_000);

  it.concurrent("NEGATIVE CONTROL: the probe does detect the old pattern (a synthetic script that loads env and starts main at import)", async () => {
    const old = path.join(scratch.dir, "oldStyle.ts");
    writeFileSync(
      old,
      [
        'import { config as loadEnv } from "dotenv";',
        'import path from "node:path";',
        'loadEnv({ path: path.resolve(process.cwd(), ".env.local") });',
        'async function main() { console.log("[old] Started — run x"); await fetch("https://example.invalid/"); }',
        "main().catch(() => undefined);",
      ].join("\n"),
    );
    const r = await probeImport(old);
    expect(r.counts.dotenv).toBe(1);
    expect(r.counts.started).toBe(1);
    expect(r.counts.fetch).toBe(1);
    const canary = canaryName();
    if (canary) expect(r.canary, "the old pattern should have loaded the env file").not.toBeNull();
  }, 170_000);
});

// ── 2. explicit start reaches the entry point ───────────────────────────────
describe.concurrent("2. explicit invocation reaches the entry point (and refuses under the harness)", () => {
  it.concurrent.each(SCRIPTS.map((s) => [s.name, s] as const))("%s: started like Task Scheduler (node + tsx cli + absolute path, cwd = repo root)", async (_n, s) => {
    const spy = await startSpy();
    try {
      const r = await runChild(abs(s), [], isolatedChildEnv(ROOT, process.env, { NEXT_PUBLIC_SUPABASE_URL: spy.url }));
      expect(r.code, brief(r.err)).toBe(2);
      expect(r.err).toContain(`[${s.label}] REFUSED: a write path was invoked while a test harness is active`);
      expect(r.out).not.toContain("Started");
      expect(spy.requests).toHaveLength(0);
    } finally {
      await spy.close();
    }
  }, 170_000);

  it.concurrent.each(SCRIPTS.filter((s) => s.npm).map((s) => [s.name, s] as const))("%s: started via `npm run` — the entry point is reached there too", async (_n, s) => {
    const spy = await startSpy();
    try {
      const env = isolatedChildEnv(ROOT, process.env, { NEXT_PUBLIC_SUPABASE_URL: spy.url });
      const r = await new Promise<{ code: number | null; out: string; err: string }>((resolve, reject) => {
        const child = spawn("npm", ["run", s.npm as string], { cwd: ROOT, env, shell: true, windowsHide: true });
        let out = "", err = "";
        child.stdout.on("data", (d) => (out += d));
        child.stderr.on("data", (d) => (err += d));
        const t = setTimeout(() => { child.kill(); reject(new Error("npm run timed out")); }, 150_000);
        child.on("close", (code) => { clearTimeout(t); resolve({ code, out, err }); });
      });
      expect(r.code, brief(r.err)).not.toBe(0);
      expect(r.err + r.out).toContain(`[${s.label}] REFUSED`);
      expect(spy.requests).toHaveLength(0);
    } finally {
      await spy.close();
    }
  }, 170_000);

  it("the child environments used above are explicit allow-lists, not copies of process.env (verified on the actual object)", () => {
    const env = isolatedChildEnv(ROOT, { ...process.env, SOME_UNRELATED_VARIABLE: "x", GITHUB_TOKEN: "ghp_real_looking_token_123" });
    expect(env.SOME_UNRELATED_VARIABLE).toBeUndefined();
    expect(env.GITHUB_TOKEN).toMatch(/^dead-/);
    const fp = loadProductionFingerprints(ROOT);
    expect(Object.values(env).filter((v) => v !== undefined && fp.values.has(v))).toEqual([]);
  });
});

// ── 3. past the barrier, behaviour is unchanged ─────────────────────────────
describe.concurrent("3. with the entry barrier removed, main() runs and behaves as before", () => {
  it.concurrent.each(SCRIPTS.filter((s) => s.kind === "ingest").map((s) => [s.name, s] as const))("%s: no worker secret -> the original message and exit code 1, before any client or network", async (_n, s) => {
    const spy = await startSpy();
    try {
      const mutant = makeMutant(scratch, { script: s.file, disableEntryBarrier: true });
      const env = isolatedChildEnv(ROOT, process.env, { NEXT_PUBLIC_SUPABASE_URL: spy.url });
      delete env.NOTIFICATION_WORKER_SECRET; // marker is set, so no env file is read to fill it back in
      const r = await runChild(mutant, [], env);
      expect(r.code, brief(r.err)).toBe(1);
      expect(r.err).toContain(`[${s.label}] NOTIFICATION_WORKER_SECRET is not set — cannot write to Supabase. Check .env.local.`);
      expect(r.out).not.toContain("Started");
      expect(spy.requests).toHaveLength(0);
    } finally {
      await spy.close();
    }
  }, 170_000);

  it.concurrent("calendarCanonicalDryRun: runs its read-only report (exit 0, same header), reading only through the spy with dead credentials", async () => {
    const spy = await startSpy();
    try {
      const mutant = makeMutant(scratch, { script: "scripts/calendarCanonicalDryRun.ts", disableEntryBarrier: true });
      const r = await runChild(mutant, [], isolatedChildEnv(ROOT, process.env, { NEXT_PUBLIC_SUPABASE_URL: spy.url }));
      expect(r.code, brief(r.err)).toBe(0);
      expect(r.out).toContain("=== Calendar Canonical-DB Migration Dry Run ===");
      expect(r.out).toMatch(/=== Summary: 0 of \d+ series would release \+ notify/);
      expect(spy.requests.length).toBeGreaterThan(0);
      expect(spy.requests.every((q) => q.method === "GET" && q.path.startsWith("/rest/v1/economic_events")), "the dry run must only READ economic_events").toBe(true);
      expect(spy.requests.every((q) => q.host === spy.host && q.apikey.startsWith("dead-"))).toBe(true);
    } finally {
      await spy.close();
    }
  }, 170_000);
});

// ── 4. containment, with every software barrier removed ─────────────────────
describe("4. containment: barrier removed AND a secret present", () => {
  it("ingestWorldBank runs its real pipeline; the provider connection is DENIED and every database request reaches only the spy, with dead credentials", async () => {
    const spy = await startSpy();
    try {
      const mutant = makeMutant(scratch, { script: "scripts/ingestWorldBank.ts", disableEntryBarrier: true, denyNetwork: true });
      const r = await runChild(mutant, [], isolatedChildEnv(ROOT, process.env, { NEXT_PUBLIC_SUPABASE_URL: spy.url }), { timeoutMs: 160_000 });

      // It really ran: it started, read the ledger for each of its 3 series, tried the provider, and logged its run.
      expect(r.out).toContain("[ingest:worldbank] Started");
      const count = (fn: string) => spy.requests.filter((q) => q.path.endsWith(`/${fn}`)).length;
      expect(count("get_canonical_observation_history")).toBe(3);
      expect(count("log_cron_run")).toBe(1);
      expect(r.code, "every series failed (provider denied) -> the script's own failure exit code").toBe(1);

      // It reached for the real provider and was denied — the test never touched the internet.
      const denied = JSON.parse((/\[harness\] denied outbound: (\[.*\])/.exec(r.err) ?? [])[1] ?? "[]") as string[];
      expect(denied.length, "the script never tried its provider — this test would prove nothing").toBeGreaterThan(0);

      // Everything that did go out went to the spy, and carried only dead credentials.
      expect(spy.requests.every((q) => q.host === spy.host)).toBe(true);
      expect(spy.requests.every((q) => q.apikey.startsWith("dead-"))).toBe(true);
      const secrets = spy.requests.map((q) => q.body?.p_internal_secret).filter((x): x is string => typeof x === "string");
      expect(secrets.length).toBe(1);
      expect(secrets.every((x) => x.startsWith("dead-"))).toBe(true);

      const fp = loadProductionFingerprints(ROOT);
      const everything = JSON.stringify(spy.requests) + r.out + r.err;
      for (const v of fp.values) expect(everything.includes(v), "a real credential appeared in traffic or output").toBe(false);
      for (const h of fp.hosts) expect(everything.toLowerCase().includes(h), "a production host appeared in traffic or output").toBe(false);
    } finally {
      await spy.close();
    }
  }, 200_000);
});

describe("tools", () => {
  it("tsx cli used by the harness is the same one the scheduled tasks use", () => {
    expect(existsSync(TSX_CLI)).toBe(true);
    expect(TSX_CLI).toBe(path.join(ROOT, "node_modules", "tsx", "dist", "cli.mjs"));
  });
});
