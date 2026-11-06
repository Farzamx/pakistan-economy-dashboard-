// F.2f: the status command stays read-only. Structural and in-process: nothing here runs it (the subprocess tests in
// ingestScriptsEntrySafety.test.ts prove it is inert on import and refuses under a harness).

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..");
const script = readFileSync(join(ROOT, "scripts", "checkCpiLedgerStatus.ts"), "utf-8");
const WRITE_RPCS = ["ingest_raw_observation", "resolve_canonical_observation", "log_cron_run", "log_source_health", "store_cpi", "sync_event_actual", "p_internal_secret"];

describe("scripts/checkCpiLedgerStatus.ts is read-only", () => {
  it("names exactly two RPCs, both public reads, in one allow-list that gates every call", () => {
    const allow = /ALLOWED_READ_RPCS: readonly string\[\] = \[([^\]]*)\]/.exec(script)?.[1] ?? "";
    expect([...allow.matchAll(/"([a-z_]+)"/g)].map((m) => m[1])).toEqual(["get_canonical_freshness_summary", "get_cron_run_history"]);
    expect(script).toMatch(/is not on the read-only allow-list/);
    for (const m of script.matchAll(/\.rpc\(/g)) expect(script.slice(Math.max(0, (m.index as number) - 8), m.index), "an .rpc( call outside the wrapper").toMatch(/(db|client)$/);
  });

  it("uses no write RPC, no secret and no service credential", () => {
    for (const w of WRITE_RPCS) expect(script, w).not.toContain(w);
    expect(script).not.toMatch(/NOTIFICATION_WORKER_SECRET|SERVICE_ROLE|CRON_SECRET/);
    expect(script).toMatch(/NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  });

  it("makes no request of its own except through the probe (one GET of the public PBS file)", () => {
    expect(script).not.toMatch(/\bfetch\(/);
    expect(script).toContain("probePbs()");
  });

  it("is an npm script and nothing else (not scheduled, not a Vercel cron)", () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8"));
    expect(pkg.scripts["check:cpistatus"]).toBe("tsx scripts/checkCpiLedgerStatus.ts");
    expect(readFileSync(join(ROOT, "vercel.json"), "utf-8")).not.toMatch(/checkCpi|cpistatus/i);
  });
});
