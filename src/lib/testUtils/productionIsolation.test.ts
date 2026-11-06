// Phase F.2b-R regression tests for the harness-level barrier between the test suite and production.
// Everything here is either synthetic (fake "production" values in a temp directory) or compares REAL
// values only in memory (hashes and equality) — nothing secret is ever printed or asserted by value.

import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { parse as parseDotenv } from "dotenv";
import {
  DEAD_URL,
  ISOLATION_MARKER,
  IsolationError,
  assertEnvIsolated,
  assertNonProductionUrl,
  isolatedChildEnv,
  loadProductionFingerprints,
  scrubProcessEnvForTests,
} from "./productionIsolation";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

/** A throwaway "repository root" whose .env.local holds fake production values. */
function fakeRoot(extra: Record<string, string> = {}): { root: string; values: Record<string, string> } {
  const values = {
    NEXT_PUBLIC_SUPABASE_URL: "https://zzfakeprojectref.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "fake-anon-key-0123456789abcdef",
    NOTIFICATION_WORKER_SECRET: "fake-worker-secret-0123456789",
    SUPABASE_ACCESS_TOKEN: "fake-mgmt-token-0123456789",
    RESEND_API_KEY: "fake-resend-key-0123456789",
    ...extra,
  };
  const root = mkdtempSync(path.join(tmpdir(), "peic-iso-"));
  writeFileSync(path.join(root, ".env.local"), Object.entries(values).map(([k, v]) => `${k}=${v}`).join("\n") + "\n");
  return { root, values };
}

describe("this test worker (set up by src/lib/testUtils/isolationSetup.ts)", () => {
  it("holds only dead credentials and a loopback database URL, verified against the repository's own env files", () => {
    expect(process.env[ISOLATION_MARKER]).toBe("1");
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBe(DEAD_URL);
    expect(process.env.NOTIFICATION_WORKER_SECRET).toMatch(/^dead-/);
    expect(() => assertEnvIsolated(process.env as Record<string, string | undefined>, loadProductionFingerprints(ROOT))).not.toThrow();
  });

  it("no value in process.env equals any credential defined in the repository's env files", () => {
    const fp = loadProductionFingerprints(ROOT);
    const leaked = Object.entries(process.env).filter(([, v]) => v !== undefined && fp.values.has(v)).map(([k]) => k);
    expect(leaked).toEqual([]);
  });
});

describe("assertNonProductionUrl", () => {
  it.each([
    ["a hosted Supabase project", "https://abcdefghijklmnop.supabase.co"],
    ["a hosted Supabase project over http", "http://abcdefghijklmnop.supabase.co"],
    ["another Supabase domain", "https://x.supabase.in"],
    ["an arbitrary remote host", "https://db.example.com"],
    ["a remote host with a port", "https://example.com:5432"],
    ["a private-network host", "http://10.0.0.5:54321"],
    ["an unparseable string (fail closed)", "not a url"],
    ["an empty string (fail closed)", ""],
  ])("rejects %s", (_label, url) => {
    expect(() => assertNonProductionUrl(url)).toThrow(IsolationError);
  });

  it("names hosted Supabase projects explicitly (a second rule, redundant with the loopback rule, kept as defence in depth)", () => {
    expect(() => assertNonProductionUrl("https://abcdefghijklmnop.supabase.co")).toThrow(/hosted Supabase project/);
    expect(() => assertNonProductionUrl("https://db.example.com")).toThrow(/not loopback/);
  });

  it("rejects an undefined URL (fail closed)", () => {
    expect(() => assertNonProductionUrl(undefined)).toThrow(IsolationError);
  });

  it.each(["http://127.0.0.1:9", "http://127.0.0.1:54321", "http://localhost:54321", "http://[::1]:8080"])("accepts loopback %s", (url) => {
    expect(() => assertNonProductionUrl(url)).not.toThrow();
  });

  it("rejects a host defined in the env files even when it is not a *.supabase.* name", () => {
    const { root } = fakeRoot({ DATABASE_URL: "https://db.internal.example.org" });
    expect(() => assertNonProductionUrl("https://db.internal.example.org", loadProductionFingerprints(root))).toThrow(/env files/);
  });

  it.runIf(existsSync(path.join(ROOT, ".env.local")))("rejects the REAL production host defined in this repository's .env.local", () => {
    const fp = loadProductionFingerprints(ROOT);
    expect(fp.hosts.size).toBeGreaterThan(0);
    for (const host of fp.hosts) expect(() => assertNonProductionUrl(`https://${host}`, fp), "a real production host was accepted").toThrow(IsolationError);
  });
});

describe("assertEnvIsolated fails closed", () => {
  const good = () => ({ ...isolatedChildEnv(fakeRoot().root) });

  it("accepts an environment built by isolatedChildEnv", () => {
    expect(() => assertEnvIsolated(good())).not.toThrow();
  });
  it("rejects a missing marker", () => {
    const e = good();
    delete e[ISOLATION_MARKER];
    expect(() => assertEnvIsolated(e)).toThrow(/not established/);
  });
  it("rejects a real-looking secret under a sensitive name", () => {
    expect(() => assertEnvIsolated({ ...good(), NOTIFICATION_WORKER_SECRET: "s3cr3t-real-value-123" })).toThrow(/non-dead/);
  });
  it("rejects a production database URL", () => {
    expect(() => assertEnvIsolated({ ...good(), NEXT_PUBLIC_SUPABASE_URL: "https://zzfakeprojectref.supabase.co" })).toThrow(IsolationError);
  });
  it("rejects an environment missing the dead stand-ins (a script could then fall back to the real .env.local)", () => {
    const e = good();
    delete e.NOTIFICATION_WORKER_SECRET;
    expect(() => assertEnvIsolated(e)).toThrow(/NOTIFICATION_WORKER_SECRET/);
  });
  it("rejects a real credential smuggled into a NON-sensitive variable name", () => {
    const { root, values } = fakeRoot();
    expect(() => assertEnvIsolated({ ...isolatedChildEnv(root), INNOCENT_LOOKING: values.NOTIFICATION_WORKER_SECRET }, loadProductionFingerprints(root))).toThrow(/matches a credential/);
  });
  it("rejects a variable that merely mentions a production host", () => {
    const { root } = fakeRoot();
    expect(() => assertEnvIsolated({ ...isolatedChildEnv(root), NOTE: "see https://zzfakeprojectref.supabase.co/rest" }, loadProductionFingerprints(root))).toThrow(/production host/);
  });
});

describe("isolatedChildEnv: real credentials cannot enter a subprocess", () => {
  const dirtyBase = (values: Record<string, string>): Record<string, string | undefined> => ({
    PATH: process.env.PATH,
    SystemRoot: process.env.SystemRoot,
    ...values,
    GITHUB_TOKEN: "ghp_fake_token_0123456789",
    SOME_RANDOM_VAR: "should-not-be-inherited",
    DATABASE_URL: "postgres://user:pw@prod.example.com/db",
  });

  it("is built from an allow-list: arbitrary and credential-bearing variables are not inherited", () => {
    const { root, values } = fakeRoot();
    const env = isolatedChildEnv(root, dirtyBase(values));
    expect(env.SOME_RANDOM_VAR).toBeUndefined();
    expect(Object.values(env)).not.toContain(values.NOTIFICATION_WORKER_SECRET);
    expect(Object.values(env)).not.toContain(values.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    expect(Object.values(env)).not.toContain("ghp_fake_token_0123456789");
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe(DEAD_URL);
    expect(env.DATABASE_URL).toBe(DEAD_URL); // a URL-valued sensitive name gets the dead loopback URL
    expect(env[ISOLATION_MARKER]).toBe("1");
  });

  it("a real child process, started with it, sees none of the real values (compared by hash, nothing printed)", () => {
    const { root, values } = fakeRoot();
    const code = "const c=require('node:crypto');console.log(JSON.stringify(Object.values(process.env).map(v=>c.createHash('sha256').update(v).digest('hex'))))";
    const r = spawnSync(process.execPath, ["-e", code], { encoding: "utf8", env: isolatedChildEnv(root, dirtyBase(values)) });
    expect(r.status).toBe(0);
    const childHashes = new Set<string>(JSON.parse(r.stdout));
    for (const [name, v] of Object.entries(values)) expect(childHashes.has(sha(v)), `${name} reached the child`).toBe(false);
  });

  it.runIf(existsSync(path.join(ROOT, ".env.local")))("same, for the REAL .env.local credentials, even if a test (wrongly) hands the real values in as the base", () => {
    const fp = loadProductionFingerprints(ROOT);
    // The real values under their real names, in memory only.
    const realBase: Record<string, string> = parseDotenv(readFileSync(path.join(ROOT, ".env.local"), "utf-8"));
    const code = "const c=require('node:crypto');console.log(JSON.stringify(Object.values(process.env).map(v=>c.createHash('sha256').update(v).digest('hex'))))";
    const r = spawnSync(process.execPath, ["-e", code], { encoding: "utf8", env: isolatedChildEnv(ROOT, { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, ...realBase }) });
    expect(r.status).toBe(0);
    const childHashes = new Set<string>(JSON.parse(r.stdout));
    let checked = 0;
    for (const v of fp.values) {
      checked++;
      expect(childHashes.has(sha(v)), "a real credential reached the child").toBe(false);
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("dotenv, run inside the child against the real-shaped .env.local, still cannot override the dead values", () => {
    const { root, values } = fakeRoot();
    const code = `require(${JSON.stringify(createRequire(import.meta.url).resolve("dotenv"))}).config({path:${JSON.stringify(path.join(root, ".env.local"))},quiet:true});` +
      "console.log(JSON.stringify({url:process.env.NEXT_PUBLIC_SUPABASE_URL,secret:process.env.NOTIFICATION_WORKER_SECRET}))";
    const r = spawnSync(process.execPath, ["-e", code], { encoding: "utf8", env: isolatedChildEnv(root, dirtyBase(values)) });
    expect(r.status).toBe(0);
    const seen = JSON.parse(r.stdout) as { url: string; secret: string };
    expect(seen.url).toBe(DEAD_URL);
    expect(seen.secret).not.toBe(values.NOTIFICATION_WORKER_SECRET);
    expect(seen.secret).toMatch(/^dead-/);
  });

  it("fails CLOSED: an extra sensitive value that is not dead is refused", () => {
    expect(() => isolatedChildEnv(fakeRoot().root, {}, { NOTIFICATION_WORKER_SECRET: "real-secret-value-123" })).toThrow(IsolationError);
  });
  it("fails CLOSED: an extra production database URL is refused", () => {
    expect(() => isolatedChildEnv(fakeRoot().root, {}, { NEXT_PUBLIC_SUPABASE_URL: "https://zzfakeprojectref.supabase.co" })).toThrow(IsolationError);
  });
  it("allows an extra loopback database URL (a local stand-in server)", () => {
    expect(isolatedChildEnv(fakeRoot().root, {}, { NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54999" }).NEXT_PUBLIC_SUPABASE_URL).toBe("http://127.0.0.1:54999");
  });
  it("fails CLOSED when an env file exists but cannot be inspected (here: .env.local is a directory)", () => {
    const root = mkdtempSync(path.join(tmpdir(), "peic-iso-"));
    mkdirSync(path.join(root, ".env.local"));
    expect(() => isolatedChildEnv(root)).toThrow(/cannot read \.env\.local/);
  });
  it("with no env file at all there is nothing to leak, and isolation is still fully established", () => {
    const root = mkdtempSync(path.join(tmpdir(), "peic-iso-"));
    const env = isolatedChildEnv(root);
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe(DEAD_URL);
    expect(env[ISOLATION_MARKER]).toBe("1");
  });
});

describe("scrubProcessEnvForTests", () => {
  it("replaces every credential in a worker environment, keeps unrelated variables, and verifies the result", () => {
    const { root, values } = fakeRoot();
    const env: Record<string, string | undefined> = { ...values, GITHUB_TOKEN: "ghp_fake_token_0123456789", KEEP_ME: "harmless" };
    scrubProcessEnvForTests(root, env);
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe(DEAD_URL);
    expect(env.NOTIFICATION_WORKER_SECRET).toMatch(/^dead-/);
    expect(env.GITHUB_TOKEN).toMatch(/^dead-/);
    expect(env.KEEP_ME).toBe("harmless");
    expect(env[ISOLATION_MARKER]).toBe("1");
    for (const v of Object.values(values)) expect(Object.values(env)).not.toContain(v);
  });
});
