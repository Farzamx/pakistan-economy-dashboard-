// Phase F.2b-R policy scan. Reads the source of every test file and fails if the weakness behind the
// Phase F.2b incident could be reintroduced:
//   1. a test that starts a real subprocess without an explicit, verified-isolated environment;
//   2. a test that IMPORTS a script whose module body loads an env file or runs main() — importing it would run
//      production code with whatever credentials the process holds;
//   3. any env-file load that overrides already-set (dead) variables;
//   4. the worker-level scrub not being registered in the vitest configuration.
// Known, documented exceptions are listed explicitly and must carry their own safeguards.

import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const rel = (p: string) => path.relative(ROOT, p).replace(/\\/g, "/");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name === ".git") continue;
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const testFiles = [...walk(path.join(ROOT, "src")), ...walk(path.join(ROOT, "scripts"))].filter((p) => p.endsWith(".test.ts"));
const text = (p: string) => readFileSync(p, "utf-8");

/**
 * Test files that import a script whose module body runs production code. Each must carry its own safeguards.
 * EMPTY since Phase F.2b-S: every ingestion script's start-up now sits behind runIfEntryPoint(), so importing one is
 * inert. (The one exception that existed, scripts/ingestSbp.test.ts, and its process.exit stub were removed.)
 */
const SCRIPT_IMPORT_EXCEPTIONS: Record<string, string[]> = {};

const scriptFiles = readdirSync(path.join(ROOT, "scripts")).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts")).map((f) => path.join(ROOT, "scripts", f));

describe("isolation policy (static scan of every test file)", () => {
  it("scans a meaningful number of test files (guards against the scan silently matching nothing)", () => {
    expect(testFiles.length).toBeGreaterThan(80);
  });

  it("every test that starts a real subprocess gives it an explicit isolated environment", () => {
    const offenders: string[] = [];
    for (const f of testFiles) {
      const src = text(f);
      const usesChildProcess = /from "(node:)?child_process"/.test(src) && /\b(spawnSync|spawn|execSync|execFileSync|execFile|exec|fork)\s*\(/.test(src);
      const mocked = /vi\.mock\("(node:)?child_process"/.test(src);
      if (usesChildProcess && !mocked && !/isolatedChildEnv\(/.test(src)) offenders.push(rel(f));
    }
    expect(offenders, "these tests spawn processes without isolatedChildEnv()").toEqual([]);
  });

  it("the isolation tests themselves use the verified helper (not a hand-rolled env)", () => {
    for (const f of ["scripts/ingestPbsCpiGroups.test.ts", "scripts/ingestPbsCpiGroups.isolation.test.ts", "src/lib/testUtils/productionIsolation.test.ts"]) {
      expect(text(path.join(ROOT, f)), f).toMatch(/isolatedChildEnv\(/);
    }
  });

  it("no test imports a script that loads an env file or runs main() at module load, except documented exceptions that carry their own safeguards", () => {
    // Column-0 calls run at import; an indented main().catch sits inside the runIfEntryPoint() callback and does not.
    const risky = (scriptSrc: string) => /^(main|loadEnv)\(/m.test(scriptSrc);
    const found: string[] = [];
    for (const f of testFiles) {
      const src = text(f);
      for (const m of src.matchAll(/from "(\.{1,2}\/[^"]+)"/g)) {
        const resolved = [path.resolve(path.dirname(f), m[1]) + ".ts", path.resolve(path.dirname(f), m[1], "index.ts")].find((c) => existsSync(c));
        if (!resolved || !rel(resolved).startsWith("scripts/")) continue;
        if (risky(text(resolved))) found.push(rel(f));
      }
    }
    const unexpected = found.filter((f) => !(f in SCRIPT_IMPORT_EXCEPTIONS));
    expect(unexpected, "these tests import a script that runs production code on import").toEqual([]);
    // The known exception(s) must still be real (otherwise delete the exception) and must carry their safeguards.
    expect(found.sort()).toEqual(Object.keys(SCRIPT_IMPORT_EXCEPTIONS).sort());
    for (const [file, markers] of Object.entries(SCRIPT_IMPORT_EXCEPTIONS)) for (const marker of markers) expect(text(path.join(ROOT, file)), `${file} must contain "${marker}"`).toContain(marker);
  });

  it("EVERY script that touches credentials starts only through runIfEntryPoint(): no top-level main()/loadEnv(), no direct dotenv", () => {
    const touchesCredentials = (src: string) => /\.env\.local|NOTIFICATION_WORKER_SECRET|createClient\(|loadLocalEnv|from "dotenv"/.test(src);
    const credentialScripts = scriptFiles.filter((f) => touchesCredentials(text(f)));
    expect(credentialScripts.map(rel).sort(), "the scan found the known ingestion scripts").toEqual(
      [
        "scripts/calendarCanonicalDryRun.ts",
        "scripts/ingestFred.ts",
        "scripts/ingestNetLiquidReserves.ts",
        "scripts/ingestPbsCpiGroups.ts",
        "scripts/ingestSbp.ts",
        "scripts/ingestWorldBank.ts",
        "scripts/ingestYahooGold.ts",
        "scripts/reconcileInflationLedger.ts", // Phase F.2e-Prep: read-only verification harness
        "scripts/checkCpiLedgerStatus.ts", // Phase F.2f: read-only ingestion/currency status
      ].sort(),
    );
    for (const f of credentialScripts) {
      const src = text(f);
      expect(src, `${rel(f)} must start through runIfEntryPoint()`).toMatch(/runIfEntryPoint\(\s*\{\s*filename:\s*__filename,\s*requireMain:\s*typeof require !== "undefined" && require\.main === module\s*\}/);
      expect(src, `${rel(f)} must not call main() at module level`).not.toMatch(/^main\(\)/m);
      expect(src, `${rel(f)} must not call loadEnv() at module level`).not.toMatch(/^loadEnv\(/m);
      expect(src, `${rel(f)} must not import dotenv directly (use the guarded loader)`).not.toMatch(/from "dotenv"/);
      // every main() invocation sits INSIDE the entry block, i.e. after runIfEntryPoint(
      const entryAt = src.indexOf("runIfEntryPoint({");
      for (const m of src.matchAll(/\bmain\(\)\.catch/g)) expect(m.index as number, `${rel(f)}: main() started outside the entry block`).toBeGreaterThan(entryAt);
    }
  });

  it("no test imports the manual verify_*.mjs operator tools (they load .env.local at the top level and can call write RPCs)", () => {
    for (const f of testFiles) {
      if (f.endsWith("isolationPolicy.test.ts")) continue; // this file names what it forbids
      expect(text(f), rel(f)).not.toMatch(/verify_(phase\d+|sync_hardening)/);
    }
  });

  it("the six scripts enter through enterScript() (test-harness refusal, then the env file) — and add NO new requirement for the scheduler", () => {
    for (const f of ["ingestSbp", "ingestWorldBank", "ingestFred", "ingestNetLiquidReserves", "ingestYahooGold", "calendarCanonicalDryRun"]) {
      const src = text(path.join(ROOT, "scripts", `${f}.ts`));
      expect(src, f).toMatch(/enterScript\("/);
      // Task Scheduler supplies no confirmation variable; requiring one here would silently stop scheduled ingestion.
      expect(src, `${f} must not require the PBS write confirmation`).not.toMatch(/assertWriteConfirmed|PEIC_CONFIRM_WRITE_HOST/);
    }
  });

  it("nothing in tests or the isolation modules loads an env file with override", () => {
    const files = [...testFiles, path.join(ROOT, "src/lib/testUtils/productionIsolation.ts"), path.join(ROOT, "src/lib/testUtils/isolationSetup.ts"), path.join(ROOT, "src/lib/providers/writeSafetyGuard.ts"), path.join(ROOT, "scripts/ingestPbsCpiGroups.ts")];
    for (const f of files) {
      if (f.endsWith("isolationPolicy.test.ts")) continue; // this file names the pattern it forbids
      expect(text(f), rel(f)).not.toMatch(/override\s*:\s*true/);
    }
  });

  it("the PBS write path reads .env.local only through the guarded loader", () => {
    const script = text(path.join(ROOT, "scripts/ingestPbsCpiGroups.ts"));
    expect(script).not.toMatch(/from "dotenv"/);
    expect(script).toMatch(/loadLocalEnv\(/);
  });

  it("the worker-level credential scrub is registered in the vitest configuration", () => {
    expect(text(path.join(ROOT, "vitest.config.mts"))).toMatch(/setupFiles:\s*\[\s*"\.\/src\/lib\/testUtils\/isolationSetup\.ts"\s*\]/);
  });
});
