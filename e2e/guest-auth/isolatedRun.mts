// Builds or serves the app under the ISOLATED environment: dead credentials for everything, and the Supabase URL pointed at the LOOPBACK mock (mockAuth.mjs),
// never at a real project. Reuses the project's own isolation helper, re-verifies it, and aborts if anything could still be read from .env.local.
//
//   npx tsx --tsconfig tsconfig.json e2e/guest-auth/isolatedRun.mts build  [--copy]
//   npx tsx --tsconfig tsconfig.json e2e/guest-auth/isolatedRun.mts start  [--copy] [--port 3100]
//   npx tsx --tsconfig tsconfig.json e2e/guest-auth/isolatedRun.mts nav-json
//
// --copy builds/serves a COPY of the project in the OS temp directory (no .env files, no .git, node_modules linked). Use it whenever a `next dev` is running in the
// real project: `next build` replaces the .next folder and would corrupt a live dev server. `nav-json` writes the navigation registry's hrefs for browserFlows.mjs.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { assertEnvIsolated, isolatedChildEnv, loadProductionFingerprints } from "@/lib/testUtils/productionIsolation";
import { ADMIN_TEST_USER_ID } from "./constants.mjs";

const REPO = path.resolve(import.meta.dirname, "..", "..");
const args = process.argv.slice(2);
const mode = args[0];
const useCopy = args.includes("--copy");
const port = args.includes("--port") ? args[args.indexOf("--port") + 1] : "3100";
const OUT = process.env.PEIC_E2E_OUT ?? path.join(os.tmpdir(), "peic-e2e");
const COPY = path.join(OUT, "app-copy");
const MOCK = `http://127.0.0.1:${process.env.PEIC_E2E_MOCK_PORT ?? "54329"}`;
fs.mkdirSync(OUT, { recursive: true });

if (mode === "nav-json") {
  const { APP_NAV, allNavLinks } = await import("@/lib/appNav");
  const hrefs = allNavLinks(APP_NAV).map((l) => l.href);
  fs.writeFileSync(path.join(OUT, "nav-links.json"), JSON.stringify(hrefs, null, 1));
  console.log(`wrote ${hrefs.length} navigation hrefs to ${path.join(OUT, "nav-links.json")}`);
  process.exit(0);
}
if (mode !== "build" && mode !== "start") throw new Error("usage: build | start | nav-json  [--copy] [--port N]");

const env = isolatedChildEnv(REPO, process.env, { NEXT_TELEMETRY_DISABLED: "1", NEXT_PUBLIC_GA_MEASUREMENT_ID: "", NEXT_PUBLIC_SUPABASE_URL: MOCK, ADMIN_USER_ID: ADMIN_TEST_USER_ID });
const fp = loadProductionFingerprints(REPO);
assertEnvIsolated(env as Record<string, string | undefined>, fp);
const uncovered = [...fp.names].filter((n) => env[n] === undefined);
if (uncovered.length) throw new Error(`ABORT: env-file names would still load from .env.local: ${uncovered.join(", ")}`);
if (env.NEXT_PUBLIC_SUPABASE_URL !== MOCK) throw new Error("ABORT: database URL is not the loopback mock");
if (!String(env.NEXT_PUBLIC_SUPABASE_ANON_KEY).startsWith("dead-")) throw new Error("ABORT: anon key is not a dead placeholder");
console.log(`isolation verified: ${fp.names.length} env-file names all defined in the child env; Supabase URL = ${MOCK} (loopback mock)`);

let cwd = REPO;
if (useCopy && mode === "build") {
  fs.rmSync(COPY, { recursive: true, force: true });
  fs.cpSync(REPO, COPY, {
    recursive: true,
    filter: (src) => {
      const rel = path.relative(REPO, src).replace(/\\/g, "/");
      return !(/^(node_modules|\.next|\.git|\.vercel|\.claude)(\/|$)/.test(rel) || /^\.env/.test(path.basename(src)) || rel === "pakistan economy dashboard");
    },
  });
  fs.symlinkSync(path.join(REPO, "node_modules"), path.join(COPY, "node_modules"), "junction");
  // Turbopack refuses a node_modules link that points outside its root, so in the COPY ONLY the root is widened to the drive that holds both (the repo's own
  // next.config.ts is not touched).
  const cfg = path.join(COPY, "next.config.ts");
  const patched = fs.readFileSync(cfg, "utf8").replace("const nextConfig: NextConfig = {", `const nextConfig: NextConfig = {\n  turbopack: { root: ${JSON.stringify(path.parse(COPY).root)} },`);
  if (patched === fs.readFileSync(cfg, "utf8")) throw new Error("could not patch the copy's next.config.ts");
  fs.writeFileSync(cfg, patched);
  console.log(`copied the project to ${COPY} (no env files, no .git; Turbopack root widened in the copy only)`);
  cwd = COPY;
} else if (useCopy) {
  cwd = COPY;
}

if (mode === "build") {
  const log = fs.openSync(path.join(OUT, "build.log"), "w");
  const r = spawnSync("npx", ["next", "build"], { cwd, env, shell: true, stdio: ["ignore", log, log], timeout: 900_000 });
  console.log("next build exit:", r.status, `(log: ${path.join(OUT, "build.log")})`);
  process.exit(r.status ?? 1);
} else {
  const log = fs.openSync(path.join(OUT, "start.log"), "w");
  const child = spawn("npx", ["next", "start", "-p", port], { cwd, env, shell: true, detached: true, stdio: ["ignore", log, log] });
  child.unref();
  console.log(`next start launched (isolated) on :${port}, pid ${child.pid} (log: ${path.join(OUT, "start.log")})`);
}
