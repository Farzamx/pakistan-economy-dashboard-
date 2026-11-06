// Test harness for running REAL ingestion-script code safely (Phase F.2b-S).
//
// Three tools, all local:
//   * startSpy()        a loopback HTTP server that stands in for the database and records every request;
//   * makeMutant()      writes a MUTATED COPY of a script (and, optionally, of its safety modules) to a scratch
//                       directory — originals are never touched — with imports made absolute so it can run there;
//   * runChild()        starts a script exactly as Task Scheduler does (node + tsx cli + absolute path) with an
//                       EXPLICIT environment from isolatedChildEnv(), never an inherited one.
//
// Nothing here can reach a real database: the child environment is built by isolatedChildEnv() (dead credentials,
// loopback URL, verified), and the only URL a child is given is the spy's.

import { spawn } from "node:child_process";
import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

export const ROOT = path.resolve(__dirname, "..", "..", "..");
export const TSX_CLI = path.join(ROOT, "node_modules", "tsx", "dist", "cli.mjs");
const PROVIDERS = path.join(ROOT, "src", "lib", "providers");
export const fwd = (p: string) => p.replace(/\\/g, "/");

// ── loopback spy ────────────────────────────────────────────────────────────
export interface SpyRequest { method: string; path: string; host: string; apikey: string; body: Record<string, unknown> | null }
export interface Spy { url: string; host: string; requests: SpyRequest[]; reset(): void; close(): Promise<void> }

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
  });
}

export async function startSpy(): Promise<Spy> {
  const requests: SpyRequest[] = [];
  const server: Server = createServer(async (req, res) => {
    const raw = await readBody(req);
    let body: Record<string, unknown> | null = null;
    try { body = raw ? JSON.parse(raw) : null; } catch { body = null; }
    requests.push({ method: req.method ?? "", path: req.url ?? "", host: String(req.headers.host ?? ""), apikey: String(req.headers.apikey ?? ""), body });
    res.setHeader("content-type", "application/json");
    const rpc = (req.url ?? "").split("?")[0].split("/").pop() ?? "";
    if (rpc === "get_canonical_observation_history") res.end("[]");
    else if (rpc === "ingest_raw_observation") res.end(JSON.stringify({ success: true, inserted: true, raw_observation_id: "00000000-0000-0000-0000-000000000001" }));
    else if ((req.url ?? "").startsWith("/rest/v1/") && !(req.url ?? "").startsWith("/rest/v1/rpc/")) res.end("[]");
    else res.end("null");
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return {
    url,
    host: new URL(url).host,
    requests,
    reset: () => { requests.length = 0; },
    close: () => new Promise<void>((r) => server.close(() => r())),
  };
}

// ── mutated copies ──────────────────────────────────────────────────────────
/** Replace `from` with `to`, exactly once. A mutation that does not apply must fail the test, never pass silently. */
export function mutateOnce(src: string, from: string, to: string, label: string): string {
  const n = src.split(from).length - 1;
  if (n !== 1) throw new Error(`mutation "${label}" matched ${n} times (expected exactly 1) — the source changed; update the test`);
  return src.replace(from, to);
}

/** Make a copy's imports absolute so it can live outside the source tree. */
function absolutise(src: string, dirOfOriginal: string): string {
  return src
    .replace(/from "@\//g, `from "${fwd(path.join(ROOT, "src"))}/`)
    .replace(/from "\.\/([^"]+)"/g, (_m, p) => `from "${fwd(path.join(dirOfOriginal, p))}"`);
}

// Inside node_modules/.cache (git-ignored) so bare imports such as "@supabase/supabase-js" resolve to the repo's packages.
const CACHE = path.join(ROOT, "node_modules", ".cache", "peic-mutants");

export interface Scratch { dir: string; cleanup(): void }
export function scratchDir(): Scratch {
  mkdirSync(CACHE, { recursive: true });
  const dir = mkdtempSync(path.join(CACHE, "run-"));
  return { dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

/** Preload that DENIES every outbound connection except loopback, and reports what it denied on exit. */
export const DENY_NETWORK_PRELOAD = `
import net from "node:net";
const loop = (h: string) => /^(127\\.|localhost$|::1$|\\[::1\\]$)/.test(h);
const denied: string[] = [];
const g = globalThis as unknown as { fetch: (i: unknown, init?: unknown) => Promise<unknown> };
const realFetch = g.fetch;
g.fetch = (input: unknown, init?: unknown) => {
  const u = typeof input === "string" ? input : ((input as { url?: string })?.url ?? String(input));
  let host = ""; try { host = new URL(u).hostname; } catch { /* relative */ }
  if (!loop(host)) { denied.push("fetch:" + host); return Promise.reject(new TypeError("network denied by test harness: " + host)); }
  return realFetch(input, init);
};
const origConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (this: net.Socket, ...args: unknown[]) {
  const o = args[0] as { host?: string; path?: string } | number | string | undefined;
  const host = typeof o === "object" && o ? (o.host ?? "localhost") : (typeof args[1] === "string" ? (args[1] as string) : "localhost");
  const isPipe = typeof o === "object" && o && "path" in o && !!o.path;
  if (!isPipe && !loop(String(host))) {
    denied.push("socket:" + host);
    const e = Object.assign(new Error("network denied by test harness: " + host), { code: "ENETDENIED" });
    process.nextTick(() => this.destroy(e));
    return this;
  }
  return (origConnect as (...a: unknown[]) => net.Socket).apply(this, args);
} as typeof net.Socket.prototype.connect;
process.on("exit", () => { process.stderr.write("\\n[harness] denied outbound: " + JSON.stringify(denied) + "\\n"); });
export {};
`;

export interface MutantOptions {
  /** Script path relative to the repository root, e.g. "scripts/ingestFred.ts". */
  script: string;
  /** Neutralise assertNotUnderTest (the entry barrier), keeping everything else — loadLocalEnv stays a no-op under isolation. */
  disableEntryBarrier?: boolean;
  /** Preload that denies all non-loopback connections and records them. */
  denyNetwork?: boolean;
}

/** Returns the path of the mutated copy of the script, with any safety-module copies it needs beside it. */
export function makeMutant(scratch: Scratch, opts: MutantOptions): string {
  const dir = mkdtempSync(path.join(scratch.dir, "m-"));
  let guard = readFileSync(path.join(PROVIDERS, "writeSafetyGuard.ts"), "utf-8");
  if (opts.disableEntryBarrier) {
    guard = mutateOnce(guard, "export function assertNotUnderTest(env: Record<string, string | undefined>): void {", "export function assertNotUnderTest(env: Record<string, string | undefined>): void {\n  return;", "disable entry barrier");
  }
  writeFileSync(path.join(dir, "guard.ts"), absolutise(guard, PROVIDERS));

  let entry = readFileSync(path.join(PROVIDERS, "scriptEntry.ts"), "utf-8");
  entry = mutateOnce(entry, 'from "./writeSafetyGuard"', `from "${fwd(path.join(dir, "guard"))}"`, "redirect guard import");
  writeFileSync(path.join(dir, "entry.ts"), absolutise(entry, PROVIDERS));

  let script = readFileSync(path.join(ROOT, opts.script), "utf-8");
  script = mutateOnce(script, '"@/lib/providers/scriptEntry"', `"${fwd(path.join(dir, "entry"))}"`, "redirect entry import");
  script = absolutise(script, path.dirname(path.join(ROOT, opts.script)));
  if (opts.denyNetwork) {
    writeFileSync(path.join(dir, "deny.ts"), DENY_NETWORK_PRELOAD);
    script = `import "${fwd(path.join(dir, "deny"))}";\n` + script;
  }
  const out = path.join(dir, path.basename(opts.script));
  writeFileSync(out, script);
  return out;
}

// ── child runner ────────────────────────────────────────────────────────────
export interface ChildResult { code: number | null; out: string; err: string }

/** Starts `node <tsx cli> <script> [args]` — the exact shape of the Task Scheduler actions — with an EXPLICIT environment. */
export function runChild(script: string, args: string[], env: NodeJS.ProcessEnv, opts: { cwd?: string; timeoutMs?: number } = {}): Promise<ChildResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [TSX_CLI, script, ...args], { cwd: opts.cwd ?? ROOT, env, windowsHide: true });
    let out = "", err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    const timer = setTimeout(() => { child.kill(); reject(new Error(`child timed out: ${path.basename(script)}`)); }, opts.timeoutMs ?? 150_000);
    child.on("close", (code) => { clearTimeout(timer); resolve({ code, out, err }); });
  });
}

/** A short, printable-ASCII excerpt of subprocess output, safe to use in an assertion message. */
export const brief = (s: string) => s.split("").map((c) => ((c >= " " && c <= "~") || c === "\n" ? c : "?")).join("").split("\n").slice(0, 10).join(" | ").slice(0, 600);
