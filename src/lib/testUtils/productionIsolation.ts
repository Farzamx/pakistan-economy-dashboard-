// PEIC test isolation — the harness-level barrier between the test suite and PRODUCTION.
//
// Why this exists (Phase F.2b-R). A mutation experiment flipped the PBS ingestion script's
// WRITE_MODE_AUTHORIZED flag to true and ran a test that starts the real script. The script
// loads `.env.local` ITSELF (dotenv, from the working directory), so production credentials
// reached the process and 1,352 observations were written. The application flag was the
// only barrier. This module is a barrier that does NOT depend on that flag, or on any flag
// the tests are allowed to mutate:
//
//   * every test worker has its process.env scrubbed of credentials (isolationSetup.ts);
//     dotenv never overrides a variable that is already set, so a script that loads
//     `.env.local` afterwards still cannot obtain the real values;
//   * every test subprocess is given an EXPLICIT environment built from a short allow-list
//     (isolatedChildEnv), never a copy of process.env;
//   * the result is verified, and the verification fails CLOSED: if isolation cannot be
//     proven, an error is thrown and the test or worker does not start;
//   * a database URL is accepted only if it is loopback (assertNonProductionUrl).
//
// Nothing here prints a secret. Real values are only ever compared, in memory, against the
// environment being checked.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse as parseDotenv } from "dotenv";

/** Set to "1" in every isolated environment. Production write guards refuse to run when it is present. */
export const ISOLATION_MARKER = "PEIC_TEST_ISOLATION";
/** The only database URL an isolated environment may carry: loopback, port 9 (discard) — nothing listens there. */
export const DEAD_URL = "http://127.0.0.1:9";

export class IsolationError extends Error {
  constructor(message: string) {
    super(`[test isolation] ${message}`);
    this.name = "IsolationError";
  }
}

/** Names that are ALWAYS made dead, even if no env file defines them — so a missing .env.local cannot weaken the guard. */
export const ALWAYS_DEAD_NAMES: readonly string[] = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_ACCESS_TOKEN",
  "NOTIFICATION_WORKER_SECRET",
  "CRON_SECRET",
  "RESEND_API_KEY",
  "RESEND_WEBHOOK_SECRET",
  "VERCEL_OIDC_TOKEN",
  "FRED_API_KEY",
  "SBP_EASYDATA_API_KEY",
  "OPENROUTER_API_KEY",
  "GROQ_API_KEY",
  "TAVILY_API_KEY",
  "ADMIN_EMAIL",
];

const SENSITIVE_NAME = /(SECRET|TOKEN|PASSWORD|API_?KEY|ACCESS_?KEY|SERVICE_?ROLE|ANON_?KEY|SUPABASE|DATABASE_URL|POSTGRES|WEBHOOK|OIDC|CREDENTIAL|PRIVATE_?KEY|ADMIN_EMAIL)/i;

export function isSensitiveName(name: string): boolean {
  return SENSITIVE_NAME.test(name) || ALWAYS_DEAD_NAMES.includes(name);
}

function isUrlName(name: string): boolean {
  return /URL$/i.test(name);
}

/** A value an isolated environment is allowed to hold for a sensitive name. */
export function isDeadValue(value: string): boolean {
  return value === DEAD_URL || value.startsWith("dead-");
}

export function deadValueFor(name: string): string {
  return isUrlName(name) ? DEAD_URL : `dead-${name.toLowerCase()}`;
}

export function isLoopbackHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, "");
  return h === "localhost" || h === "127.0.0.1" || h === "::1" || /^127\.\d+\.\d+\.\d+$/.test(h);
}

// ─────────────────────────────── production fingerprints ───────────────────────────────

export interface ProductionFingerprints {
  /** Names defined in the repo's env files. */
  names: string[];
  /** Values of sensitive variables (>= 8 chars). Used ONLY for in-memory comparison; never printed or logged. */
  values: Set<string>;
  /** Hosts found in any URL-valued sensitive variable. */
  hosts: Set<string>;
}

function envFilesIn(root: string): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root)
    .filter((f) => /^\.env(\..+)?$/.test(f) && !/\.(example|sample|template)$/.test(f))
    .map((f) => path.join(root, f));
}

/**
 * Reads the repository's env files (`.env`, `.env.local`, `.env.production`, …) so the harness knows what
 * "real" looks like. An env file that EXISTS but cannot be read is an error (fail closed): isolation cannot
 * be verified against something that cannot be inspected. No env file at all is fine (nothing to leak).
 */
export function loadProductionFingerprints(root: string): ProductionFingerprints {
  const fp: ProductionFingerprints = { names: [], values: new Set(), hosts: new Set() };
  for (const file of envFilesIn(root)) {
    let parsed: Record<string, string>;
    try {
      parsed = parseDotenv(readFileSync(file, "utf-8"));
    } catch (err) {
      throw new IsolationError(`cannot read ${path.basename(file)} to verify isolation (${err instanceof Error ? err.message : String(err)}) — refusing to continue`);
    }
    for (const [name, value] of Object.entries(parsed)) {
      fp.names.push(name);
      if (!isSensitiveName(name) || value.length < 8) continue;
      fp.values.add(value);
      if (/^https?:\/\//i.test(value)) {
        try {
          fp.hosts.add(new URL(value).host.toLowerCase());
          fp.hosts.add(new URL(value).hostname.toLowerCase());
        } catch {
          /* not a URL — the value itself is already fingerprinted */
        }
      }
    }
  }
  return fp;
}

// ─────────────────────────────── URL gate ───────────────────────────────

const SUPABASE_HOST = /\.supabase\.(co|in|net|com|red)$/i;

/**
 * Accepts ONLY loopback database URLs. Everything else is rejected — including URLs that merely look
 * harmless — and anything that cannot be parsed (fail closed). Known production hosts are named in the
 * error only by category, never echoed with credentials.
 */
export function assertNonProductionUrl(url: string | undefined, fingerprints?: ProductionFingerprints): void {
  if (!url) throw new IsolationError("database URL is empty — refusing (fail closed)");
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new IsolationError("database URL is not parseable — refusing (fail closed)");
  }
  const host = parsed.hostname.toLowerCase();
  if (fingerprints && (fingerprints.hosts.has(host) || fingerprints.hosts.has(parsed.host.toLowerCase()))) {
    throw new IsolationError(`URL host matches a host defined in the repository's env files (production) — rejected`);
  }
  if (SUPABASE_HOST.test(host)) throw new IsolationError(`URL host "${host}" is a hosted Supabase project — rejected`);
  if (!isLoopbackHost(host)) throw new IsolationError(`URL host "${host}" is not loopback — only loopback database URLs are allowed in tests`);
}

// ─────────────────────────────── environment construction + verification ───────────────────────────────

/** The only inherited variables a test subprocess receives: what a runtime needs to start, and nothing else. */
export const CHILD_ENV_ALLOWLIST: readonly string[] = [
  "PATH", "Path", "PATHEXT", "SystemRoot", "SYSTEMROOT", "SystemDrive", "windir", "WINDIR", "ComSpec", "COMSPEC",
  "TEMP", "TMP", "TMPDIR", "USERPROFILE", "HOMEDRIVE", "HOMEPATH", "HOME", "APPDATA", "LOCALAPPDATA",
  "ProgramData", "ProgramFiles", "ProgramFiles(x86)", "ProgramW6432", "CommonProgramFiles", "CommonProgramFiles(x86)",
  "NUMBER_OF_PROCESSORS", "PROCESSOR_ARCHITECTURE", "OS", "USERNAME", "USER", "USERDOMAIN", "LANG", "LC_ALL", "SHELL",
  "TERM", "NO_COLOR", "FORCE_COLOR",
];

/**
 * Throws unless `env` is provably free of production access. Checks: the marker is set; every sensitive
 * variable holds a dead value; every URL-valued variable is loopback; no value equals a real credential and no
 * value contains a real host (when fingerprints are supplied).
 */
export function assertEnvIsolated(env: Record<string, string | undefined>, fingerprints?: ProductionFingerprints): void {
  if (env[ISOLATION_MARKER] !== "1") throw new IsolationError(`${ISOLATION_MARKER} is not set — isolation not established`);
  for (const [name, value] of Object.entries(env)) {
    if (value === undefined) continue;
    if (isSensitiveName(name)) {
      // A URL may point at a local stand-in server (any loopback port); every other sensitive value must be dead.
      if (isUrlName(name)) assertNonProductionUrl(value, fingerprints);
      else if (!isDeadValue(value)) throw new IsolationError(`${name} holds a non-dead value — isolation not established`);
    }
    if (fingerprints) {
      if (fingerprints.values.has(value)) throw new IsolationError(`${name} holds a value that matches a credential defined in the repository's env files`);
      for (const host of fingerprints.hosts) if (value.toLowerCase().includes(host)) throw new IsolationError(`${name} mentions a production host`);
    }
  }
  for (const required of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "NOTIFICATION_WORKER_SECRET"]) {
    if (env[required] === undefined) throw new IsolationError(`${required} is not set to a dead value — a script could fall back to loading the real one from .env.local`);
  }
}

/** Dead values for every name in play: the fixed list, every sensitive name in `base`, and every sensitive name in the env files. */
export function deadOverrides(base: Record<string, string | undefined>, fingerprints: ProductionFingerprints): Record<string, string> {
  const names = new Set<string>(ALWAYS_DEAD_NAMES);
  for (const n of Object.keys(base)) if (isSensitiveName(n)) names.add(n);
  for (const n of fingerprints.names) if (isSensitiveName(n)) names.add(n);
  const out: Record<string, string> = {};
  for (const n of names) out[n] = deadValueFor(n);
  return out;
}

/**
 * The environment for a test subprocess: EXPLICIT, not inherited. Starts from the allow-list only, then dead
 * credentials, then the isolation marker; then verifies the result and throws if isolation cannot be proven.
 */
export function isolatedChildEnv(
  root: string,
  base: Record<string, string | undefined> = process.env,
  extra: Record<string, string> = {},
): NodeJS.ProcessEnv {
  const fingerprints = loadProductionFingerprints(root);
  const env: Record<string, string> = {};
  for (const name of CHILD_ENV_ALLOWLIST) {
    const v = base[name];
    if (v !== undefined) env[name] = v;
  }
  Object.assign(env, deadOverrides(base, fingerprints));
  env[ISOLATION_MARKER] = "1";
  for (const [k, v] of Object.entries(extra)) {
    // assertEnvIsolated below is the real check; this just fails early with a clearer message.
    if (isSensitiveName(k) && !isUrlName(k) && !isDeadValue(v)) throw new IsolationError(`extra env ${k} is a sensitive name with a non-dead value`);
    env[k] = v;
  }
  assertEnvIsolated(env, fingerprints);
  return env as NodeJS.ProcessEnv;
}

/** Test-worker setup: replace every credential in the worker's own process.env with a dead value and verify. */
export function scrubProcessEnvForTests(root: string, env: Record<string, string | undefined> = process.env): void {
  const fingerprints = loadProductionFingerprints(root);
  for (const [name, dead] of Object.entries(deadOverrides(env, fingerprints))) env[name] = dead;
  env[ISOLATION_MARKER] = "1";
  assertEnvIsolated(env, fingerprints);
}
