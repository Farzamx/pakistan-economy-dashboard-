// An independent safety barrier for ingestion WRITE paths (Phase F.2b-R).
//
// Background. In Phase F.2b a single application flag (WRITE_MODE_AUTHORIZED) was the only thing between
// the test suite and the production database. A mutation experiment flipped that flag, the script loaded
// `.env.local` itself, and 1,352 rows were written. A flag that tests are expected to mutate cannot also
// be the safety barrier. These checks are separate from it, live in their own module, and each one alone
// is sufficient to stop a write:
//
//   1. NOT UNDER TEST. Refuses when any test-runner or isolation signal is present in the environment
//      (PEIC_TEST_ISOLATION, VITEST*, JEST_WORKER_ID, NODE_ENV=test). The signals are set by the test
//      harness itself (src/lib/testUtils/productionIsolation.ts), not by the code under test.
//   2. EXPLICIT, TARGET-BOUND CONFIRMATION. A write needs PEIC_CONFIRM_WRITE_HOST to equal the host of
//      the database the process is about to write to. It must be typed by the operator for that run; it
//      cannot be satisfied by a stale flag, and a confirmation for one database is useless for another.
//   3. NO ENV FILE UNDER ISOLATION. loadLocalEnv() reads `.env.local` only when no isolation signal is
//      present, so an isolated process never even reads the real credentials.
//
// Adopting this for the other ingestion scripts is deliberately NOT done here (unrelated providers);
// see docs/incident-f2b-r-production-write.md for the bounded proposal.

import { config as dotenvConfig } from "dotenv";

export class WriteRefusedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WriteRefusedError";
  }
}

/** The environment variable that must name the target database host for a write to proceed. */
export const WRITE_CONFIRM_ENV = "PEIC_CONFIRM_WRITE_HOST";

/** Variables that mean "a test harness is driving this process". Any non-empty value counts. */
export const TEST_SIGNALS: readonly string[] = ["PEIC_TEST_ISOLATION", "VITEST", "VITEST_WORKER_ID", "VITEST_POOL_ID", "JEST_WORKER_ID"];

export function underTest(env: Record<string, string | undefined>): string | null {
  for (const name of TEST_SIGNALS) if (env[name]) return name;
  if (env.NODE_ENV === "test") return "NODE_ENV=test";
  return null;
}

/** Barrier 1 — call BEFORE any environment file is read or any network call is made. */
export function assertNotUnderTest(env: Record<string, string | undefined>): void {
  const signal = underTest(env);
  if (signal) {
    throw new WriteRefusedError(`REFUSED: a write path was invoked while a test harness is active (${signal}). Test runs can never write to a database.`);
  }
}

/** Barrier 2 — call after the database URL is known and BEFORE a client, RPC or log write is created. */
export function assertWriteConfirmed(env: Record<string, string | undefined>): void {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new WriteRefusedError("REFUSED: no database URL is configured, so the write target cannot be confirmed.");
  let host: string;
  try {
    host = new URL(url).host.toLowerCase();
  } catch {
    throw new WriteRefusedError("REFUSED: the database URL is not parseable, so the write target cannot be confirmed.");
  }
  const confirmed = (env[WRITE_CONFIRM_ENV] ?? "").trim().toLowerCase();
  if (confirmed !== host) {
    throw new WriteRefusedError(
      `REFUSED: this run would write to the database at "${host}". Confirm that deliberately by setting ${WRITE_CONFIRM_ENV}=${host} for this run (it is not set, or names a different host).`,
    );
  }
}

/** Both barriers, for callers that already know the URL. */
export function assertWriteAllowed(env: Record<string, string | undefined>): void {
  assertNotUnderTest(env);
  assertWriteConfirmed(env);
}

/**
 * Loads `.env.local` ONLY when no test or isolation signal is present. Under isolation it is a no-op, so an
 * isolated process never reads real credentials at all. Returns whether the file was loaded.
 */
export function loadLocalEnv(
  env: Record<string, string | undefined>,
  envPath: string,
  load: (opts: { path: string; quiet?: boolean }) => unknown = dotenvConfig,
  quiet = true,
): boolean {
  if (underTest(env)) return false;
  // `quiet: false` keeps dotenv's own banner line, for scripts whose log output must not change.
  load({ path: envPath, quiet });
  return true;
}
