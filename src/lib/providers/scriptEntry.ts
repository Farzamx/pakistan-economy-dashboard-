// Shared entry-point handling for PEIC ingestion scripts (Phase F.2b-S).
//
// The problem. Six scripts (ingestSbp, ingestWorldBank, ingestFred, ingestNetLiquidReserves, ingestYahooGold,
// calendarCanonicalDryRun) loaded `.env.local` and called `main()` at MODULE LOAD. Merely importing one — from a
// test, a tool, an IDE — ran the production job with production credentials. Phase F.2b-R proved what that can do.
//
// The fix. Importing a script is now inert. Its start-up lives inside runIfEntryPoint(), which runs only when the
// file is the program being executed:
//
//     runIfEntryPoint({ filename: __filename, requireMain: typeof require !== "undefined" && require.main === module }, () => {
//       enterScript("ingest:fred");          // refuse under a test harness, then load .env.local
//       main().catch(...);                   // unchanged
//     });
//
// "Is this file the program being executed?" is answered by TWO independent signals and EITHER is enough:
//   1. require.main === module                      (what Node itself says)
//   2. process.argv[1] resolves to this very file   (what the launcher asked for)
// Both were verified under every real launch style (Windows Task Scheduler: `node tsx\dist\cli.mjs <abs path>`,
// `npm run ingest:*` -> `tsx scripts/x.ts`, `npx tsx scripts/x.ts`). A silent ingestion outage — the failure that
// matters here — would need BOTH signals to be wrong at once; an accidental run on import would need one of them
// to be wrong the other way, and neither is true of an imported module.
//
// What this module deliberately does NOT do: it adds no environment variable, flag or confirmation that the
// scheduled tasks would have to supply. The scheduled commands and their environment are unchanged. (The PBS
// script, which no schedule runs yet, additionally requires PEIC_CONFIRM_WRITE_HOST — see writeSafetyGuard.ts.)

import { realpathSync } from "node:fs";
import path from "node:path";
import { WriteRefusedError, assertNotUnderTest, loadLocalEnv } from "./writeSafetyGuard";

function canonical(p: string): string {
  let resolved = path.resolve(p);
  try {
    resolved = realpathSync.native(resolved); // normalises case, 8.3 short names and symlinks where the file exists
  } catch {
    /* a path that cannot be resolved is compared as given */
  }
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

export function samePath(a: string, b: string): boolean {
  return canonical(a) === canonical(b);
}

export interface EntryContext {
  /** The script's own file name (`__filename`). */
  filename: string;
  /** `require.main === module`, evaluated in the script itself. */
  requireMain: boolean;
}

/** True when this script file is the program being executed. Either independent signal suffices. */
export function isDirectInvocation(ctx: EntryContext, argv1: string | undefined = process.argv[1]): boolean {
  if (ctx.requireMain) return true;
  if (argv1 && ctx.filename && samePath(argv1, ctx.filename)) return true;
  return false;
}

/** Runs `start` only if this file is the program being executed. Importing the file runs nothing. Returns whether it ran. */
export function runIfEntryPoint(ctx: EntryContext, start: () => void, argv1: string | undefined = process.argv[1]): boolean {
  if (!isDirectInvocation(ctx, argv1)) return false;
  start();
  return true;
}

export interface EnterScriptOptions {
  /** Defaults to `<cwd>/.env.local`, exactly what the scripts did before. */
  envPath?: string;
  env?: Record<string, string | undefined>;
  exit?: (code: number) => never;
  /** Test seam; defaults to dotenv. */
  load?: (opts: { path: string; quiet?: boolean }) => unknown;
}

/**
 * The start-up every ingestion script performs when executed, in the order it always did it — except for the
 * refusal under a test harness (which can never happen in a scheduled or manual run, where no test signal is set):
 *   1. refuse (exit 2) if any test-harness signal is present — before an env file is read or anything is contacted;
 *   2. load `.env.local` from the working directory, printing dotenv's usual banner (logging is unchanged).
 */
export function enterScript(label: string, options: EnterScriptOptions = {}): void {
  const env = options.env ?? process.env;
  const exit = options.exit ?? ((code: number): never => process.exit(code));
  try {
    assertNotUnderTest(env);
  } catch (err) {
    console.error(`[${label}] ${err instanceof WriteRefusedError ? err.message : String(err)}`);
    exit(2);
    return;
  }
  loadLocalEnv(env, options.envPath ?? path.resolve(process.cwd(), ".env.local"), options.load, false);
}
