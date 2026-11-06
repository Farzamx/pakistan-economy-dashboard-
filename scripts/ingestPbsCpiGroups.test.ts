// F.2b: the script's contract. It is exercised as a REAL SUBPROCESS where behaviour
// matters (default mode, the write refusal, rejection of bad input), and by reading
// its source where structure matters (the write path is gated and is the only place
// that can log a cron run). Every subprocess run reads a LOCAL FILE and compares
// against an EMPTY in-memory ledger: no network, no database, no credentials.

import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { USAGE, WRITE_MODE_AUTHORIZED, parseIngestArgs, writeRefusal } from "@/lib/providers/pbsCpiGroupsIngestion";
import { editSeries, FULL_XML } from "@/lib/inflation/__fixtures__/pbsCpiVariants";
import { isolatedChildEnv } from "@/lib/testUtils/productionIsolation";

const ROOT = join(__dirname, "..");
const FIXTURE = join(ROOT, "src", "lib", "inflation", "__fixtures__", "pbsCpiFull.xml");
const script = readFileSync(join(ROOT, "scripts", "ingestPbsCpiGroups.ts"), "utf-8");

// SAFETY (Phase F.2b-R): the subprocess gets an EXPLICIT, verified-isolated environment — an allow-list of
// runtime variables, dead credentials, a loopback database URL and the isolation marker — never a copy of
// process.env. isolatedChildEnv() throws (fails closed) if it cannot prove that. The script additionally
// refuses every write when the marker is present and reads `.env.local` only through loadLocalEnv(), which
// is a no-op under isolation. A mutation of WRITE_MODE_AUTHORIZED therefore cannot reach a database from
// here: see scripts/ingestPbsCpiGroups.isolation.test.ts, which proves it by running a mutated copy.
// (Learned the hard way: an earlier version of this helper let a mutated flag perform a real write.)
function run(args: string[]) {
  const q = (a: string) => `"${a}"`;
  const r = spawnSync("npx", ["tsx", q(join("scripts", "ingestPbsCpiGroups.ts")), ...args.map(q)], { cwd: ROOT, encoding: "utf8", shell: true, timeout: 120_000, env: isolatedChildEnv(ROOT) });
  return { code: r.status, out: r.stdout ?? "", err: r.stderr ?? "" };
}

describe("authorization", () => {
  it("writing is not authorized in this phase", () => {
    expect(WRITE_MODE_AUTHORIZED).toBe(false);
  });

  it("the refusal message says so and points at the activation runbook", () => {
    expect(writeRefusal()).toMatch(/not authorized/);
    expect(writeRefusal()).toMatch(/WRITE_MODE_AUTHORIZED is false/);
    expect(writeRefusal()).toMatch(/docs\/pbs-cpi-ingestion-operations\.md/);
  });
});

describe("argument parsing", () => {
  it("defaults to a dry run from the live file against an empty ledger", () => {
    expect(parseIngestArgs([])).toEqual({ args: { mode: "dry-run", source: { kind: "live" }, ledger: "empty", showProvenance: false, help: false }, errors: [] });
  });

  it("parses the supported flags, with space or = syntax", () => {
    const a = parseIngestArgs(["--file", "x.xml", "--ledger=live-read", "--show-provenance"]).args;
    expect(a.source).toEqual({ kind: "file", path: "x.xml" });
    expect(a.ledger).toBe("live-read");
    expect(a.showProvenance).toBe(true);
    expect(parseIngestArgs(["--file=y.xml"]).args.source).toEqual({ kind: "file", path: "y.xml" });
  });

  it("recognises --write (so it can be refused) and reports unknown or malformed arguments", () => {
    expect(parseIngestArgs(["--write"]).args.mode).toBe("write");
    expect(parseIngestArgs(["--frobnicate"]).errors).toEqual(["Unknown argument: --frobnicate"]);
    expect(parseIngestArgs(["--ledger", "somewhere"]).errors[0]).toMatch(/must be "empty" or "live-read"/);
    expect(parseIngestArgs(["--file"]).errors[0]).toMatch(/needs a path/);
  });

  it("the usage text says the default is a dry run and lists every condition for --write", () => {
    expect(USAGE).toMatch(/DEFAULT is a dry run/);
    expect(USAGE).toMatch(/--write\s+REAL RUN/);
    expect(USAGE).toMatch(/WRITE_MODE_AUTHORIZED is true/);
    expect(USAGE).toMatch(/no test harness is active/);
    expect(USAGE).toMatch(/--confirm-write-host <host>/);
  });

  it("parses --confirm-write-host (space and = forms) and rejects it without a value", () => {
    expect(parseIngestArgs(["--write", "--confirm-write-host", "abc.supabase.co"]).args).toMatchObject({ mode: "write", confirmWriteHost: "abc.supabase.co" });
    expect(parseIngestArgs(["--confirm-write-host=abc.supabase.co"]).args.confirmWriteHost).toBe("abc.supabase.co");
    expect(parseIngestArgs(["--confirm-write-host"]).errors[0]).toMatch(/needs the database host/);
    expect(parseIngestArgs(["--confirm-write-host", "--write"]).errors[0]).toMatch(/needs the database host/);
    expect(parseIngestArgs([]).args.confirmWriteHost).toBeUndefined();
  });
});

describe("running the script (subprocess)", () => {
  it("with no mode argument it is a DRY RUN: validates, plans 1,352 observations, and states 0 database writes", () => {
    const r = run(["--file", FIXTURE]);
    expect(r.code).toBe(0);
    expect(r.out).toContain("=== PBS CPI group ingestion — DRY RUN ===");
    expect(r.out).toMatch(/file ACCEPTED/);
    expect(r.out).toMatch(/observations in source\s+1352/);
    expect(r.out).toMatch(/new periods\s+1352/);
    expect(r.out).toContain("DATABASE WRITES: 0");
  }, 130_000);

  it("--show-provenance prints the provenance exactly as it would be written", () => {
    const r = run(["--file", FIXTURE, "--show-provenance"]);
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/source_updated_at 2026-11-03T06:38:35\.000Z/);
    expect(r.out).toMatch(/release_date null/);
    expect(r.out).toContain('"basePeriod":"2015/2016"');
    // Provenance names PBS's own URL, never the local file the bytes happened to come from.
    expect(r.out).toContain('"file":"https://www.pbs.gov.pk/wp-content/uploads/2020/07/CPI.xml"');
  }, 130_000);

  it("--write is REFUSED with exit 2, before any file is read, any network call or any environment is loaded", () => {
    const r = run(["--write"]);
    expect(r.code).toBe(2);
    expect(r.err).toMatch(/REFUSED: write mode is not authorized/);
    expect(r.out).not.toContain("DRY RUN");
    expect(r.out).not.toContain("SOURCE VALIDATION");
  }, 130_000);

  it("--write is refused even when combined with a file", () => {
    expect(run(["--write", "--file", FIXTURE]).code).toBe(2);
  }, 130_000);

  it("a file that fails validation exits 1 with a rejection report, ZERO planned writes, and nothing prepared", () => {
    const dir = mkdtempSync(join(tmpdir(), "peic-cpi-"));
    const bad = join(dir, "bad.xml");
    writeFileSync(bad, editSeries(FULL_XML, "PCPI_CP_04_IX", (m, v) => (m === "2025-06" ? String(Number(v) + 5) : v)));
    const r = run(["--file", bad]);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/\[FAIL\].*headline index/);
    expect(r.out).toMatch(/file REJECTED/);
    expect(r.out).toContain("PLANNED WRITES: 0 (nothing prepared)");
    expect(r.out).toContain("DATABASE WRITES: 0");
    expect(r.out).not.toContain("PLANNED OPERATIONS");
  }, 130_000);

  it("an unreadable file exits 1 and still reports 0 database writes", () => {
    const r = run(["--file", join(tmpdir(), "peic-does-not-exist.xml")]);
    expect(r.code).toBe(1);
    expect(r.err).toMatch(/Could not obtain the PBS file/);
    expect(r.err).toContain("DATABASE WRITES: 0");
  }, 130_000);

  it("SAFETY: the subprocess cannot reach the real database (dead credentials win over .env.local)", () => {
    // The real ledger currently holds these 26 series. If this subprocess could read it,
    // live-read would report "already holds 1352 current rows". It must instead fail to connect.
    const r = run(["--file", FIXTURE, "--ledger", "live-read"]);
    expect(r.code).not.toBe(0);
    expect(r.out + r.err).not.toMatch(/already holds \d+ current rows/);
    expect(r.out).not.toContain("PLANNED OPERATIONS");
  }, 130_000);

  it("an unknown argument exits 2 and prints the usage", () => {
    const r = run(["--nope"]);
    expect(r.code).toBe(2);
    expect(r.err).toMatch(/Unknown argument: --nope/);
  }, 130_000);
});

describe("structure of the script (it must never be able to write by accident)", () => {
  const writeFn = script.indexOf("async function runWrite");
  const mainFn = script.indexOf("async function main");

  it("refuses write mode before it reads a file, touches the network or loads any environment", () => {
    const refusal = script.indexOf("if (args.mode === \"write\" && !WRITE_MODE_AUTHORIZED)");
    expect(refusal).toBeGreaterThan(mainFn);
    for (const later of ["readFileSync(args.source.path", "fetchPbsCpiFile()", "loadLocalEnv("]) {
      expect(script.indexOf(later, mainFn), later).toBeGreaterThan(refusal);
    }
  });

  it("the write path sits behind independent barriers that do not depend on WRITE_MODE_AUTHORIZED, in the right order", () => {
    expect(script, "the script must not load env files except through loadLocalEnv()").not.toMatch(/from "dotenv"/);
    const flagGate = script.indexOf("!WRITE_MODE_AUTHORIZED");
    const underTest = script.indexOf("assertNotUnderTest(process.env)");
    expect(underTest, "test-harness refusal comes right after the flag gate").toBeGreaterThan(flagGate);
    // ...and before a file is read, the network is touched or any env file is loaded:
    for (const later of ["readFileSync(args.source.path", "fetchPbsCpiFile()", "loadLocalEnv("]) expect(script.indexOf(later, mainFn), later).toBeGreaterThan(underTest);
    // target-bound confirmation comes before the lock, the network fetch, any client, ingest or cron-log write in the write path:
    const confirm = script.indexOf("assertWriteConfirmed(", writeFn);
    expect(confirm).toBeGreaterThan(writeFn);
    for (const later of ["acquireRunLock(", "fetchPbsCpiFileCounted(", "createClient(url, anonKey)", "logCronRun(", "ingestManySeries(", "executeWriteRun("]) expect(script.indexOf(later, writeFn), later).toBeGreaterThan(confirm);
  });

  it("the write path is reached only after that refusal, only for the live source, and BEFORE this script reads any file or fetches anything itself", () => {
    const call = script.indexOf("await runWrite(args)");
    expect(call).toBeGreaterThan(script.indexOf("!WRITE_MODE_AUTHORIZED"));
    const branch = script.lastIndexOf('if (args.mode === "write") {', call);
    expect(script.slice(branch, call)).toContain('args.source.kind !== "live"');
    // a write run fetches inside executeWriteRun (so an outage is logged); main() must not read or fetch first
    for (const dryOnly of ["readFileSync(args.source.path", "await fetchPbsCpiFile()"]) expect(script.indexOf(dryOnly, mainFn), dryOnly).toBeGreaterThan(call);
  });

  it("every write run goes through executeWriteRun, which owns the lock, the fetch and the one cron row", () => {
    expect(script).toMatch(/executeWriteRun\(\{/);
    for (const dep of ["acquireLock:", "fetchFile:", "ingest:", "logRun:"]) expect(script).toContain(dep);
    expect(script, "the script must not keep its own success/failure logic").not.toMatch(/failed\.length === outcomes\.length/);
  });

  it("a cron run is logged ONLY inside the write path (logging is itself a database write)", () => {
    const calls = [...script.matchAll(/logCronRun\(/g)].map((m) => m.index as number);
    expect(calls.length).toBeGreaterThan(0);
    for (const at of calls) expect(at, "logCronRun outside runWrite").toBeGreaterThan(writeFn);
  });

  it("the orchestrator's write-capable ingest is only invoked inside the write path", () => {
    for (const m of script.matchAll(/ingestManySeries\(/g)) expect(m.index as number).toBeGreaterThan(writeFn);
  });

  it("the only Supabase client in the dry-run path is the live-read reader, which calls just the public read RPC", () => {
    const dryPart = script.slice(mainFn, writeFn);
    expect(dryPart.match(/createClient\(/g)).toHaveLength(1);
    expect(dryPart).toContain('"get_canonical_observation_history"');
    for (const writeRpc of ["ingest_raw_observation", "resolve_canonical_observation", "log_cron_run", "store_cpi"]) expect(dryPart).not.toContain(writeRpc);
  });

  it("is an npm script; it is NOT a Vercel cron (the ingestion host is the Task Scheduler laptop, like every other ledger job)", () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8"));
    expect(pkg.scripts["ingest:pbscpigroups"]).toBe("tsx scripts/ingestPbsCpiGroups.ts");
    expect(readFileSync(join(ROOT, "vercel.json"), "utf-8")).not.toMatch(/pbs-?cpi-?groups/i);
    // Phase F.2f registers the job with the watchdog and the freshness registry; cpiIngestionSchedule.test.ts and the
    // monitor tests pin those. The scheduler definition is a repository file that is NOT registered anywhere.
  });
});
