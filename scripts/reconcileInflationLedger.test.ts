// Phase F.2e-Prep: the read-only verification harness stays read-only. Structural, in-process: nothing here runs the
// script (the subprocess tests in ingestScriptsEntrySafety.test.ts prove it is inert on import and refuses under a
// harness). These pin WHAT it is able to call.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..");
const script = readFileSync(join(ROOT, "scripts", "reconcileInflationLedger.ts"), "utf-8");
const reader = readFileSync(join(ROOT, "src", "lib", "data", "cpiGroupLedgerReader.ts"), "utf-8");

const WRITE_RPCS = ["ingest_raw_observation", "resolve_canonical_observation", "log_cron_run", "log_source_health", "store_cpi", "sync_event_actual", "p_internal_secret"];

describe("scripts/reconcileInflationLedger.ts is read-only", () => {
  it("names exactly three RPCs, all public reads, in one allow-list that gates every call", () => {
    const allow = /ALLOWED_READ_RPCS: readonly string\[\] = \[([^\]]*)\]/.exec(script)?.[1] ?? "";
    expect([...allow.matchAll(/"([a-z_]+)"/g)].map((m) => m[1])).toEqual(["get_canonical_observation_provenance", "get_canonical_freshness_summary", "get_cron_run_history"]);
    expect(script).toMatch(/is not on the read-only allow-list/);
    // every .rpc( in the script goes through the wrapper (db.rpc), never the raw client
    for (const m of script.matchAll(/\.rpc\(/g)) {
      const before = script.slice(Math.max(0, (m.index as number) - 8), m.index);
      expect(before, "an .rpc( call that is not db.rpc( or the wrapper's own client.rpc(").toMatch(/(db|client)$/);
    }
  });

  it("uses no write RPC and no secret anywhere", () => {
    for (const w of WRITE_RPCS) expect(script, w).not.toContain(w);
    expect(script).not.toMatch(/NOTIFICATION_WORKER_SECRET|SERVICE_ROLE|CRON_SECRET/);
    expect(script).toMatch(/NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  });
});

describe("the ledger reader is read-only", () => {
  it("names one RPC in code, the existing public provenance read (comments may discuss others)", () => {
    const code = reader.split("\n").filter((l) => !l.trimStart().startsWith("//")).join("\n");
    expect([...code.matchAll(/get_[a-z_]+/g)].map((m) => m[0]).filter((v, i, a) => a.indexOf(v) === i)).toEqual(["get_canonical_observation_provenance"]);
    for (const w of WRITE_RPCS) expect(code, w).not.toContain(w);
  });
});
