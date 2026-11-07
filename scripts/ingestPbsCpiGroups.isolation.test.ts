// Phase F.2b-R — PROOF (not assertion) that the test harness cannot reach production, even when the
// application's own write safeguards are mutated away.
//
// Method. Real MUTATED COPIES of the production script are written to a temp directory (the originals are never
// touched) and RUN as subprocesses, with a verified-isolated environment whose database URL points at a local
// spy server. The spy records every request the script makes and what credentials it carries.
//
//   A. flag flipped (the Phase F.2b incident)             -> refused by an independent barrier; spy sees 0 requests
//   B. flag flipped + barrier 2 removed                    -> refused by barrier 3 (no confirmation); spy sees 0 requests
//   C. flag flipped + ALL THREE software barriers removed
//      + .env.local loading forced on                      -> the script really runs its write path (1,352 + 1,352 RPCs
//                                                             reach the spy) and every request carries only DEAD
//                                                             credentials; no real credential or host appears anywhere
//
// C is the point: it shows the last line of defence — the environment — holds on its own. Nothing here talks to
// a real database: the only reachable endpoint is a loopback server started by this test.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawn } from "node:child_process";
import { createServer, type IncomingMessage, type Server } from "node:http";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { AddressInfo } from "node:net";
import { isolatedChildEnv, loadProductionFingerprints } from "@/lib/testUtils/productionIsolation";
import { DENY_NETWORK_PRELOAD } from "@/lib/testUtils/scriptHarness";
import { parseCpiRunDetail } from "@/lib/providers/cpiIngestionRunLog";

const ROOT = path.resolve(__dirname, "..");
const FIXTURE = path.join(ROOT, "src", "lib", "inflation", "__fixtures__", "pbsCpiFull.xml");
const fwd = (p: string) => p.replace(/\\/g, "/");

// ── spy server ──────────────────────────────────────────────────────────────
interface SpyRequest { path: string; host: string; apikey: string; body: Record<string, unknown> | null }
let server: Server;
let spyUrl = "";
let seen: SpyRequest[] = [];

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
  });
}

beforeAll(async () => {
  server = createServer(async (req, res) => {
    const raw = await readBody(req);
    let body: Record<string, unknown> | null = null;
    try { body = raw ? JSON.parse(raw) : null; } catch { body = null; }
    const rpc = (req.url ?? "").split("/").pop() ?? "";
    seen.push({ path: req.url ?? "", host: String(req.headers.host ?? ""), apikey: String(req.headers.apikey ?? ""), body });
    res.setHeader("content-type", "application/json");
    if (rpc === "get_canonical_observation_history") res.end("[]");
    else if (rpc === "ingest_raw_observation") res.end(JSON.stringify({ success: true, inserted: true, raw_observation_id: "00000000-0000-0000-0000-000000000001" }));
    else res.end("null");
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  spyUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
});

// ── mutated copies ──────────────────────────────────────────────────────────
// Inside node_modules/.cache (git-ignored) so that bare imports such as "@supabase/supabase-js" resolve to the
// repository's packages; removed afterwards.
const cacheDir = path.join(ROOT, "node_modules", ".cache", "peic-mutants");
mkdirSync(cacheDir, { recursive: true });
const tmp = mkdtempSync(path.join(cacheDir, "run-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

/** Replace `from` with `to`, exactly once — a mutation that does not apply must fail the test, never silently pass. */
function mutate(src: string, from: string, to: string, label: string): string {
  const n = src.split(from).length - 1;
  if (n !== 1) throw new Error(`mutation "${label}" matched ${n} times (expected exactly 1) — the production source changed; update this test`);
  return src.replace(from, to);
}

/** Make a copy's imports absolute so it can live outside the source tree. */
function absolutise(src: string, dirOfOriginal: string): string {
  return src
    .replace(/from "@\//g, `from "${fwd(path.join(ROOT, "src"))}/`)
    .replace(/from "\.\/([^"]+)"/g, (_m, p) => `from "${fwd(path.join(dirOfOriginal, p))}"`);
}

const PROVIDERS = path.join(ROOT, "src", "lib", "providers");
// Line endings are normalised to LF before any text is matched. A fresh Windows checkout (core.autocrlf=true) writes CRLF, and the
// multi-line anchors below (e.g. "  if (underTest(env)) return false;\n") would then match 0 times. The test must prove the
// SAME thing whichever line endings the checkout used.
const read = (p: string) => readFileSync(p, "utf-8").replace(/\r\n/g, "\n");

/** How the mutant gets its PBS file. "network" leaves the real fetch in place (only safe when the run is refused before it). */
type FetchMode = "network" | "fixture" | "outage";

function buildMutants(opts: { flag: boolean; noTestBarrier: boolean; noConfirmBarrier: boolean; forceEnvFileLoad: boolean; fetch: FetchMode; denyNetwork?: boolean }): string {
  const dir = mkdtempSync(path.join(tmp, "m-"));
  let ingestion = read(path.join(PROVIDERS, "pbsCpiGroupsIngestion.ts"));
  if (opts.flag) ingestion = mutate(ingestion, "export const WRITE_MODE_AUTHORIZED = false as boolean;", "export const WRITE_MODE_AUTHORIZED = true as boolean;", "flip write flag");
  writeFileSync(path.join(dir, "ingestion.ts"), absolutise(ingestion, PROVIDERS));

  let guard = read(path.join(PROVIDERS, "writeSafetyGuard.ts"));
  if (opts.noTestBarrier) guard = mutate(guard, "export function assertNotUnderTest(env: Record<string, string | undefined>): void {", "export function assertNotUnderTest(env: Record<string, string | undefined>): void {\n  return;", "disable barrier 2");
  if (opts.noConfirmBarrier) guard = mutate(guard, "export function assertWriteConfirmed(env: Record<string, string | undefined>): void {", "export function assertWriteConfirmed(env: Record<string, string | undefined>): void {\n  return;", "disable barrier 3");
  if (opts.forceEnvFileLoad) guard = mutate(guard, "  if (underTest(env)) return false;\n", "", "force .env.local loading");
  writeFileSync(path.join(dir, "guard.ts"), absolutise(guard, PROVIDERS));

  let script = read(path.join(ROOT, "scripts", "ingestPbsCpiGroups.ts"));
  script = mutate(script, '"@/lib/providers/pbsCpiGroupsIngestion"', `"${fwd(path.join(dir, "ingestion"))}"`, "redirect ingestion import");
  script = mutate(script, '"@/lib/providers/writeSafetyGuard"', `"${fwd(path.join(dir, "guard"))}"`, "redirect guard import");
  // The write path's fetch (the ONLY one a write run makes) is replaced; the dry-run fetch is left alone and never reached.
  const FETCH_CALL = "fetchPbsCpiFileCounted({ attempts: 3, retryDelayMs: 20_000 })";
  if (opts.fetch === "fixture") script = mutate(script, FETCH_CALL, `Promise.resolve({ text: readFileSync(${JSON.stringify(fwd(FIXTURE))}, "utf-8"), attempts: 1 })`, "read the fixture instead of the PBS site");
  if (opts.fetch === "outage") script = mutate(script, FETCH_CALL, `Promise.reject(new Error("PBS CPI file request returned HTTP 503."))`, "simulate a PBS outage");
  if (opts.denyNetwork) {
    writeFileSync(path.join(dir, "deny.ts"), DENY_NETWORK_PRELOAD);
    script = `import "${fwd(path.join(dir, "deny"))}";\n` + script;
  }
  writeFileSync(path.join(dir, "script.ts"), absolutise(script, path.join(ROOT, "scripts")));
  return path.join(dir, "script.ts");
}

// ── runner ──────────────────────────────────────────────────────────────────
/** The run lock lives in os.tmpdir(); each run gets its OWN scratch TEMP so a lock can never leak between tests or into the real one. */
function runScript(scriptPath: string, args: string[], scratchTemp: string = mkdtempSync(path.join(tmp, "t-"))): Promise<{ code: number | null; out: string; err: string; temp: string }> {
  return new Promise((resolve, reject) => {
    const q = (a: string) => `"${a}"`;
    const child = spawn("npx", ["tsx", q(scriptPath), ...args.map(q)], {
      cwd: ROOT,
      shell: true,
      env: isolatedChildEnv(ROOT, process.env, { NEXT_PUBLIC_SUPABASE_URL: spyUrl, TEMP: scratchTemp, TMP: scratchTemp }),
    });
    let out = "", err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    const timer = setTimeout(() => { child.kill(); reject(new Error("mutant timed out")); }, 150_000);
    child.on("close", (code) => { clearTimeout(timer); resolve({ code, out, err, temp: scratchTemp }); });
  });
}

/** A short, printable-ASCII excerpt of subprocess output, safe to use in an assertion message. */
const brief = (s: string) => s.split("").map((c) => (c >= " " && c <= "~") || c === "\n" ? c : "?").join("").split("\n").slice(0, 10).join(" | ").slice(0, 600);

const realValues = () => [...loadProductionFingerprints(ROOT).values];
const realHosts = () => [...loadProductionFingerprints(ROOT).hosts];

describe("mutating the write flag cannot enable a production write", () => {
  it("A. flag flipped to TRUE (the exact Phase F.2b incident): refused by the independent test-harness barrier; the database is never contacted", async () => {
    seen = [];
    const script = buildMutants({ flag: true, noTestBarrier: false, noConfirmBarrier: false, forceEnvFileLoad: false, fetch: "network" });
    const r = await runScript(script, ["--write"]);
    expect(r.code, brief(r.err)).toBe(2);
    expect(r.err).toMatch(/a write path was invoked while a test harness is active/);
    expect(r.err, "must be the NEW barrier, not the flag's own refusal").not.toMatch(/not authorized/);
    expect(r.out).not.toContain("SOURCE VALIDATION");
    expect(r.err).toContain("DATABASE WRITES: 0");
    expect(seen, "no request of any kind may reach the (spy) database").toHaveLength(0);
  }, 170_000);

  it("B. flag flipped AND the test-harness barrier removed: refused by the target-bound confirmation; still zero requests", async () => {
    seen = [];
    const script = buildMutants({ flag: true, noTestBarrier: true, noConfirmBarrier: false, forceEnvFileLoad: false, fetch: "fixture" });
    const r = await runScript(script, ["--write"]);
    expect(r.code, brief(r.err)).toBe(2);
    expect(r.err).toMatch(/REFUSED: this run would write to the database at "127\.0\.0\.1:\d+"/);
    expect(r.err).toContain("PEIC_CONFIRM_WRITE_HOST=");
    expect(seen).toHaveLength(0);
  }, 170_000);
});

describe("mutation testing cannot invoke a real database connection", () => {
  it("C. flag flipped AND all three software barriers removed AND .env.local loading forced on: the write path runs, and every request reaches only the loopback spy, carrying only dead credentials", async () => {
    seen = [];
    const script = buildMutants({ flag: true, noTestBarrier: true, noConfirmBarrier: true, forceEnvFileLoad: true, fetch: "fixture", denyNetwork: true });
    const r = await runScript(script, ["--write"]);

    // The mutated script genuinely ran its production write path to completion, against the spy...
    expect(r.code, brief(r.err)).toBe(0);
    const count = (fn: string) => seen.filter((s) => s.path.endsWith(`/${fn}`)).length;
    expect(count("ingest_raw_observation")).toBe(1352);
    expect(count("resolve_canonical_observation")).toBe(1352);
    expect(count("log_cron_run")).toBe(1);
    expect(count("get_canonical_observation_history")).toBe(26);

    // ...and the ONLY thing it could reach was the loopback server, with only dead credentials.
    const spyHost = new URL(spyUrl).host;
    expect(seen.every((s) => s.host === spyHost), "a request went somewhere other than the spy").toBe(true);
    expect(seen.every((s) => s.apikey.startsWith("dead-")), "a non-dead API key was sent").toBe(true);
    const secrets = seen.map((s) => s.body?.p_internal_secret).filter((x): x is string => typeof x === "string");
    expect(secrets.length).toBe(1352 + 1352 + 1);
    expect(secrets.every((s) => s.startsWith("dead-")), "a non-dead worker secret was sent").toBe(true);

    // F.2f: hermetic beyond the database — the run made NO non-loopback connection at all (the preload denies and reports them)...
    expect(deniedConnections(r.err), "the write run tried to reach something other than the spy").toEqual([]);
    // ...it left exactly one cron row, a success, in the structured format the watchdog reads...
    const cron = seen.filter((s) => s.path.endsWith("/log_cron_run")).map((s) => s.body as Record<string, unknown>);
    expect(cron).toHaveLength(1);
    expect(cron[0]).toMatchObject({ p_job_name: "pbs-cpi-groups-ingestion", p_status: "success" });
    expect(parseCpiRunDetail(String(cron[0].p_detail))).toMatchObject({ format: "v1", outcome: "updated", series: 26, updated: 26, failed: 0, periodsWritten: 1352, latest: "2026-10", attempts: 1 });
    // ...and its lock, kept in the scratch TEMP, is gone.
    expect(existsSync(path.join(r.temp, "peic-pbs-cpi-ingestion.lock")), "the run lock was not released").toBe(false);

    // No real credential or production host appears anywhere the script could have put one.
    const everything = JSON.stringify(seen) + r.out + r.err;
    for (const v of realValues()) expect(everything.includes(v), "a real credential value appeared in the script's traffic or output").toBe(false);
    for (const h of realHosts()) expect(everything.toLowerCase().includes(h), "a production host appeared in the script's traffic or output").toBe(false);
  }, 170_000);
});

/** The connections the network-denial preload refused, as it reports them on exit. */
function deniedConnections(stderr: string): string[] {
  const m = /\[harness\] denied outbound: (\[.*\])/.exec(stderr);
  return m ? (JSON.parse(m[1]) as string[]) : ["<preload did not report>"];
}

const cronRows = () => seen.filter((s) => s.path.endsWith("/log_cron_run")).map((s) => s.body as Record<string, unknown>);
const writeRpcs = () => seen.filter((s) => /\/(ingest_raw_observation|resolve_canonical_observation)$/.test(s.path)).length;

describe("F.2f: a scheduled run leaves evidence for the watchdog whatever happens (through the REAL script wiring, against the loopback spy)", () => {
  // All of these remove the flag and the harness barrier (so the run proceeds); barrier 3, the target confirmation, is KEPT
  // and satisfied exactly the way a Task Scheduler action would: with --confirm-write-host on the command line.
  it("D. PBS is down: exit 1, ZERO ledger writes, and one FAILURE row saying pbs-unavailable (an outage is never silent)", async () => {
    seen = [];
    const script = buildMutants({ flag: true, noTestBarrier: true, noConfirmBarrier: false, forceEnvFileLoad: false, fetch: "outage", denyNetwork: true });
    const r = await runScript(script, ["--write", "--confirm-write-host", new URL(spyUrl).host]);
    expect(r.code, brief(r.err)).toBe(1);
    expect(writeRpcs()).toBe(0);
    expect(cronRows()).toHaveLength(1);
    expect(cronRows()[0]).toMatchObject({ p_job_name: "pbs-cpi-groups-ingestion", p_status: "failure" });
    expect(parseCpiRunDetail(String(cronRows()[0].p_detail))).toMatchObject({ outcome: "pbs-unavailable" });
    expect(String(cronRows()[0].p_detail)).toMatch(/HTTP 503/);
    expect(deniedConnections(r.err)).toEqual([]);
    expect(existsSync(path.join(r.temp, "peic-pbs-cpi-ingestion.lock"))).toBe(false);
  }, 170_000);

  it("E. another run holds the lock: this one does NOTHING (no fetch, no ledger write), logs one SKIPPED row and exits 0", async () => {
    seen = [];
    const scratch = mkdtempSync(path.join(tmp, "t-"));
    // a live holder: this very test process, started just now
    writeFileSync(path.join(scratch, "peic-pbs-cpi-ingestion.lock"), JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
    const script = buildMutants({ flag: true, noTestBarrier: true, noConfirmBarrier: false, forceEnvFileLoad: false, fetch: "outage", denyNetwork: true });
    const r = await runScript(script, ["--write", "--confirm-write-host", new URL(spyUrl).host], scratch);
    expect(r.code, brief(r.err)).toBe(0);
    expect(writeRpcs()).toBe(0);
    expect(cronRows()).toHaveLength(1);
    expect(cronRows()[0]).toMatchObject({ p_status: "skipped" });
    expect(parseCpiRunDetail(String(cronRows()[0].p_detail)).outcome).toBe("busy");
    expect(existsSync(path.join(scratch, "peic-pbs-cpi-ingestion.lock")), "must not release a lock it never held").toBe(true);
  }, 170_000);

  it("H. the CONFIRMATION barrier, as the scheduled task uses it: the right host on the command line proceeds; a wrong host, or none, is refused with zero requests", async () => {
    // wrong host -> refused
    seen = [];
    let script = buildMutants({ flag: true, noTestBarrier: true, noConfirmBarrier: false, forceEnvFileLoad: false, fetch: "fixture", denyNetwork: true });
    const wrong = await runScript(script, ["--write", "--confirm-write-host", "somewhere-else.supabase.co"]);
    expect(wrong.code, brief(wrong.err)).toBe(2);
    expect(wrong.err).toMatch(/REFUSED: this run would write to the database at/);
    expect(seen).toHaveLength(0);
    // no confirmation at all -> refused
    seen = [];
    const none = await runScript(script, ["--write"]);
    expect(none.code).toBe(2);
    expect(seen).toHaveLength(0);
    // the right host -> proceeds (full run against the spy)
    seen = [];
    script = buildMutants({ flag: true, noTestBarrier: true, noConfirmBarrier: false, forceEnvFileLoad: false, fetch: "fixture", denyNetwork: true });
    const ok = await runScript(script, ["--write", "--confirm-write-host", new URL(spyUrl).host]);
    expect(ok.code, brief(ok.err)).toBe(0);
    expect(writeRpcs()).toBe(1352 * 2);
    expect(cronRows()[0]).toMatchObject({ p_status: "success" });
  }, 400_000);
});
