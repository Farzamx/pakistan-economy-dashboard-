// Market fallback snapshot writes are opt-in: page rendering, builds and ISR revalidation never write; only the CRON_SECRET-authenticated freshness job
// does (docs/market-snapshot-writes.md). The Supabase client is mocked: no network, no database.

import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Kpi } from "@/data/kpiData";

const rpc = vi.fn(async (...args: unknown[]) => ({ error: null, args }));
const select = vi.fn();
vi.mock("@/lib/supabase/publicDataClient", () => ({
  createPublicDataClient: () => ({
    rpc,
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => { select(); return { data: null, error: null }; } }) }) }),
  }),
}));

const audit = vi.fn();
vi.mock("@/lib/data/globalMarketsFreshnessAudit", () => ({ auditGlobalMarketsFreshness: () => audit() }));
vi.mock("@/lib/cronLogging", () => ({ logCronRun: vi.fn(async () => undefined) }));
const pakEtf = vi.fn();
vi.mock("@/lib/data/yfinance", () => ({ getPakEtfKpi: () => pakEtf() }));

const { resolveWithPersistedFallback, savePersistedSnapshot, snapshotWritesEnabled, withSnapshotWrites } = await import("./marketFallbackSnapshot");

/** Only the upsert is a write; get_market_fallback_snapshot (the fallback read) is allowed everywhere. */
const writes = () => rpc.mock.calls.filter((c) => c[0] === "upsert_market_fallback_snapshot");

const KPI = { title: "Gold", value: "2,650.10", unit: "$/oz", source: "test" } as unknown as Kpi;
const FALLBACK = { title: "Gold", value: "1", unit: "$/oz", latestDate: "2026-01-01" } as unknown as Kpi;

beforeEach(() => {
  rpc.mockClear();
  audit.mockReset();
  pakEtf.mockReset();
});

describe("the write gate", () => {
  it("outside the job (a render, a build, a revalidation) nothing is written", async () => {
    expect(snapshotWritesEnabled()).toBe(false);
    await savePersistedSnapshot("gold", KPI, "test");
    const live = await resolveWithPersistedFallback("gold", async () => KPI, FALLBACK);
    expect(live.sourceStatus).toBe("live"); // the page still gets the live value
    expect(writes()).toHaveLength(0);
  });

  it("inside withSnapshotWrites a successful live value is upserted once, as one row per symbol", async () => {
    await withSnapshotWrites(() => resolveWithPersistedFallback("gold", async () => KPI, FALLBACK));
    expect(writes()).toHaveLength(1);
    expect(writes()[0][1]).toMatchObject({ p_symbol_key: "gold", p_source: "test" });
  });

  it("a failed live fetch writes nothing, even inside the job, and still falls back as before", async () => {
    const r = await withSnapshotWrites(() => resolveWithPersistedFallback("gold", async () => { throw new Error("down"); }, FALLBACK));
    expect(writes()).toHaveLength(0);
    expect(r.sourceStatus).toBe("fallback");
  });

  it("does not leak: concurrent work outside the job stays read-only, and the gate closes when the job ends", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const job = withSnapshotWrites(async () => {
      await gate;
      await savePersistedSnapshot("silver", KPI, "job");
    });
    await savePersistedSnapshot("gold", KPI, "visitor"); // runs while the job is open
    release();
    await job;
    expect(writes().map((c) => (c[1] as { p_symbol_key: string }).p_symbol_key)).toEqual(["silver"]);
    expect(snapshotWritesEnabled()).toBe(false);
  });
});

describe("the only writer: GET /api/cron/global-markets-freshness", () => {
  const call = async (auth?: string) => {
    const { GET } = await import("@/app/api/cron/global-markets-freshness/route");
    return GET(new Request("http://localhost/api/cron/global-markets-freshness", auth ? { headers: { authorization: auth } } : undefined));
  };

  beforeEach(() => {
    process.env.CRON_SECRET = "test-cron-secret";
    audit.mockImplementation(async () => {
      await savePersistedSnapshot("gold", KPI, "audit");
      return [];
    });
    pakEtf.mockImplementation(async () => {
      await savePersistedSnapshot("pak-etf", KPI, "audit");
      return KPI;
    });
  });

  it.each([[undefined], ["Bearer wrong"], ["test-cron-secret"], ["Basic test-cron-secret"]])("refuses %p with 401 and writes nothing", async (auth) => {
    const r = await call(auth);
    expect(r.status).toBe(401);
    expect(audit).not.toHaveBeenCalled();
    expect(writes()).toHaveLength(0);
  });

  it("with the bearer secret, runs the audit with writes enabled and refreshes the Pakistan ETF too", async () => {
    const r = await call("Bearer test-cron-secret");
    expect(r.status).toBe(200);
    expect(writes().map((c) => (c[1] as { p_symbol_key: string }).p_symbol_key)).toEqual(["gold", "pak-etf"]);
  });

  it("refuses when CRON_SECRET is not configured at all", async () => {
    delete process.env.CRON_SECRET;
    const r = await call("Bearer undefined");
    expect(r.status).toBe(401);
    expect(writes()).toHaveLength(0);
  });
});

describe("no other code can enable writes", () => {
  it("withSnapshotWrites is called only by the authenticated cron route", () => {
    const hits: string[] = [];
    const walk = (d: string) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\.ts$/.test(e.name) && /withSnapshotWrites\(/.test(fs.readFileSync(p, "utf8"))) hits.push(path.relative(process.cwd(), p).replace(/\\/g, "/"));
      }
    };
    walk(path.resolve("src"));
    expect(hits.sort()).toEqual(["src/app/api/cron/global-markets-freshness/route.ts", "src/lib/marketFallbackSnapshot.ts"]);
  });

  it("the RPC is called from one function only, and that function checks the gate first", () => {
    const src = fs.readFileSync(path.resolve("src/lib/marketFallbackSnapshot.ts"), "utf8");
    expect((src.match(/upsert_market_fallback_snapshot/g) ?? []).length).toBe(1);
    expect(src).toMatch(/export async function savePersistedSnapshot[^{]*\{\s*if \(!snapshotWritesEnabled\(\)\) return;/);
  });
});
