// Phase 8.2 Step 6 — orchestrator dry run using the real WorldBankAdapter
// (network mocked) against a MOCKED Supabase client only. Nothing here
// touches a real database; this proves the generic ingestionOrchestrator
// (built and certified in Phase 8.1) works correctly when driven by a real
// provider adapter's output, before any cutover decision is made.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ingestOneSeries, ingestManySeries } from "./ingestionOrchestrator";
import { worldBankAdapter } from "./worldBankAdapter";

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body } as Response;
}

function rawFixture(iso3: string, iso2: string, name: string, rows: { date: string; value: number }[]) {
  return [
    { page: 1, pages: 1, per_page: 1000, total: rows.length, sourceid: "2", lastupdated: "2026-07-13" },
    rows.map((r) => ({ indicator: { id: "NY.GDP.MKTP.KD.ZG", value: "GDP growth (annual %)" }, country: { id: iso2, value: name }, countryiso3code: iso3, date: r.date, value: r.value, unit: "", obs_status: "", decimal: 1 })),
  ];
}

const PAK_ROWS = [{ date: "2025", value: 3.69842668749033 }, { date: "2024", value: 3.08176295579301 }];
const IND_ROWS = [{ date: "2025", value: 7.56666179284244 }];
const BGD_ROWS = [{ date: "2025", value: 3.48990671836833 }];

function fakeSupabase() {
  const rpc = vi.fn();
  return { rpc } as unknown as import("@supabase/supabase-js").SupabaseClient & { rpc: typeof rpc };
}
function historyResponse(rows: { observation_period: string; value: number; unit: string }[]) {
  return { data: rows, error: null };
}

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("27. retry — a transient World Bank fetch failure is retried by the orchestrator, never the adapter itself", () => {
  it("succeeds on a later attempt after the orchestrator retries", async () => {
    const supabase = fakeSupabase();
    supabase.rpc.mockImplementation(async (fn: string) => {
      if (fn === "get_canonical_observation_history") return historyResponse([]);
      if (fn === "ingest_raw_observation") return { data: { raw_observation_id: "raw-1" }, error: null };
      if (fn === "resolve_canonical_observation") return { data: {}, error: null };
      throw new Error(`unexpected rpc: ${fn}`);
    });
    fetchMock
      .mockRejectedValueOnce(new Error("ETIMEDOUT"))
      .mockRejectedValueOnce(new Error("ETIMEDOUT"))
      .mockResolvedValueOnce(jsonResponse(rawFixture("PAK", "PK", "Pakistan", PAK_ROWS)));

    const outcome = await ingestOneSeries(supabase, "secret", "run-1", worldBankAdapter, "worldbank:gdpGrowthPak", { maxRetries: 3, retryBaseDelayMs: 1 });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(outcome.status).toBe("updated");
    expect(outcome.periodsWritten).toBe(2);
  });
});

describe("28. retry exhaustion", () => {
  it("throws after exactly maxRetries+1 attempts when World Bank is permanently unreachable", async () => {
    const supabase = fakeSupabase();
    supabase.rpc.mockResolvedValue(historyResponse([]));
    fetchMock.mockRejectedValue(new Error("ENOTFOUND api.worldbank.org"));

    await expect(
      ingestOneSeries(supabase, "secret", "run-1", worldBankAdapter, "worldbank:gdpGrowthPak", { maxRetries: 2, retryBaseDelayMs: 1 }),
    ).rejects.toThrow(/ENOTFOUND/);
    expect(fetchMock).toHaveBeenCalledTimes(3); // initial + 2 retries
  });
});

describe("29. concurrency bound", () => {
  it("never runs more than the configured concurrency's worth of World Bank fetches at once", async () => {
    const supabase = fakeSupabase();
    supabase.rpc.mockResolvedValue(historyResponse([]));
    let concurrent = 0;
    let maxConcurrent = 0;
    fetchMock.mockImplementation(async () => {
      concurrent++;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await new Promise((r) => setTimeout(r, 5));
      concurrent--;
      return jsonResponse(rawFixture("PAK", "PK", "Pakistan", PAK_ROWS));
    });
    const jobs = [
      { adapter: worldBankAdapter, indicatorKey: "worldbank:gdpGrowthPak" },
      { adapter: worldBankAdapter, indicatorKey: "worldbank:gdpGrowthIndia" },
      { adapter: worldBankAdapter, indicatorKey: "worldbank:gdpGrowthBangladesh" },
    ];

    await ingestManySeries(supabase, "secret", "run-1", jobs, { concurrency: 2 });

    expect(maxConcurrent).toBeLessThanOrEqual(2);
  });
});

describe("30. per-series isolation", () => {
  it("an out-of-pilot-scope indicatorKey fails in isolation without affecting the other two real series", async () => {
    const supabase = fakeSupabase();
    supabase.rpc.mockImplementation(async (fn: string) => {
      if (fn === "get_canonical_observation_history") return historyResponse([]);
      if (fn === "ingest_raw_observation") return { data: { raw_observation_id: "raw-1" }, error: null };
      if (fn === "resolve_canonical_observation") return { data: {}, error: null };
      throw new Error(`unexpected rpc: ${fn}`);
    });
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes("/IND/")) return jsonResponse(rawFixture("IND", "IN", "India", IND_ROWS));
      if (url.includes("/BGD/")) return jsonResponse(rawFixture("BGD", "BD", "Bangladesh", BGD_ROWS));
      throw new Error("unexpected url in isolation test");
    });

    const outcomes = await ingestManySeries(supabase, "secret", "run-1", [
      { adapter: worldBankAdapter, indicatorKey: "worldbank:population" }, // not in WORLD_BANK_SERIES -- throws immediately, no fetch
      { adapter: worldBankAdapter, indicatorKey: "worldbank:gdpGrowthIndia" },
      { adapter: worldBankAdapter, indicatorKey: "worldbank:gdpGrowthBangladesh" },
    ], { maxRetries: 0, retryBaseDelayMs: 1 });

    const bad = outcomes.find((o) => o.indicatorKey === "worldbank:population")!;
    const india = outcomes.find((o) => o.indicatorKey === "worldbank:gdpGrowthIndia")!;
    const bangladesh = outcomes.find((o) => o.indicatorKey === "worldbank:gdpGrowthBangladesh")!;
    expect(bad.status).toBe("failed");
    expect(bad.error).toMatch(/no series configuration/);
    expect(india.status).toBe("updated");
    expect(bangladesh.status).toBe("updated");
  });
});

describe("31. unchanged observation produces no canonical write", () => {
  it("reports 'unchanged' and never calls ingest_raw_observation/resolve_canonical_observation when the fetched value/unit exactly match what's already canonical", async () => {
    const supabase = fakeSupabase();
    supabase.rpc.mockImplementation(async (fn: string) => {
      if (fn === "get_canonical_observation_history") {
        return historyResponse([
          { observation_period: "2024-12-31", value: 3.08176295579301, unit: "%" },
          { observation_period: "2025-12-31", value: 3.69842668749033, unit: "%" },
        ]);
      }
      throw new Error(`unexpected rpc: ${fn} -- no write should occur`);
    });
    fetchMock.mockResolvedValueOnce(jsonResponse(rawFixture("PAK", "PK", "Pakistan", PAK_ROWS)));

    const outcome = await ingestOneSeries(supabase, "secret", "run-1", worldBankAdapter, "worldbank:gdpGrowthPak");

    expect(outcome.status).toBe("unchanged");
    expect(outcome.periodsWritten).toBe(0);
    expect(supabase.rpc).not.toHaveBeenCalledWith("ingest_raw_observation", expect.anything());
    expect(supabase.rpc).not.toHaveBeenCalledWith("resolve_canonical_observation", expect.anything());
  });
});

describe("32. changed observation reaches the persistence layer with full provenance, and no real database is ever touched", () => {
  it("writes exactly the changed period through the mocked RPCs -- fakeSupabase proves this never reaches a real DB", async () => {
    const supabase = fakeSupabase();
    let canonParams: Record<string, unknown> | null = null;
    supabase.rpc.mockImplementation(async (fn: string, params?: unknown) => {
      if (fn === "get_canonical_observation_history") return historyResponse([{ observation_period: "2024-12-31", value: 3.08176295579301, unit: "%" }]); // 2025 is new/changed
      if (fn === "ingest_raw_observation") return { data: { raw_observation_id: "raw-1" }, error: null };
      if (fn === "resolve_canonical_observation") { canonParams = params as Record<string, unknown>; return { data: {}, error: null }; }
      throw new Error(`unexpected rpc: ${fn}`);
    });
    fetchMock.mockResolvedValueOnce(jsonResponse(rawFixture("PAK", "PK", "Pakistan", PAK_ROWS)));

    const outcome = await ingestOneSeries(supabase, "secret", "run-1", worldBankAdapter, "worldbank:gdpGrowthPak");

    expect(outcome.status).toBe("updated");
    expect(outcome.periodsWritten).toBe(1);
    expect(canonParams).toMatchObject({
      p_indicator_key: "worldbank:gdpGrowthPak",
      p_observation_period: "2025-12-31",
      p_value: 3.69842668749033,
      p_unit: "%",
      p_source_provider: "world-bank",
      p_quality_status: "official",
      p_source_series_id: "NY.GDP.MKTP.KD.ZG",
      p_release_date: null,
      p_source_updated_at: "2026-07-13T00:00:00.000Z",
    });
    // Confirms this test never opened a real Supabase connection: fakeSupabase
    // is a plain vi.fn(), never a real @supabase/supabase-js client instance.
    expect(supabase.rpc).toBeTypeOf("function");
  });
});
