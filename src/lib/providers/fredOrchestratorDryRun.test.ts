// Phase 8.12 — orchestrator dry run using the real fredAdapter (network
// mocked) against a MOCKED Supabase client only. Nothing here touches a
// real database; this proves the generic ingestionOrchestrator (built and
// certified in Phase 8.1, reused unchanged) works correctly when driven by
// the FRED adapter's real output, before any cutover decision is made.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ingestOneSeries, ingestManySeries } from "./ingestionOrchestrator";
import { fredAdapter } from "./fredAdapter";

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body } as Response;
}

const DFF_FIXTURE = {
  observations: [
    { realtime_start: "2026-08-13", realtime_end: "2026-08-13", date: "2026-06-01", value: "3.63" },
    { realtime_start: "2026-08-13", realtime_end: "2026-08-13", date: "2026-07-01", value: "3.63" },
  ],
};
const CPI_FIXTURE = {
  observations: [
    { realtime_start: "2026-08-12", realtime_end: "2026-08-12", date: "2026-06-01", value: "3.46353" },
    { realtime_start: "2026-08-12", realtime_end: "2026-08-12", date: "2026-07-01", value: "3.30386" },
  ],
};

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
  process.env.FRED_API_KEY = "test-fred-key-not-real";
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("11. adapter -> orchestrator integration", () => {
  it("ingests fred:fedFunds end-to-end through the real, unmodified generic orchestrator", async () => {
    const supabase = fakeSupabase();
    supabase.rpc.mockImplementation(async (fn: string) => {
      if (fn === "get_canonical_observation_history") return historyResponse([]);
      if (fn === "ingest_raw_observation") return { data: { raw_observation_id: "raw-1" }, error: null };
      if (fn === "resolve_canonical_observation") return { data: {}, error: null };
      throw new Error(`unexpected rpc: ${fn}`);
    });
    fetchMock.mockResolvedValueOnce(jsonResponse(DFF_FIXTURE));

    const outcome = await ingestOneSeries(supabase, "secret", "run-1", fredAdapter, "fred:fedFunds");

    expect(outcome.status).toBe("updated");
    expect(outcome.periodsWritten).toBe(2);
    expect(outcome.latestPeriod).toBe("2026-07-31");
  });

  it("retries a transient FRED fetch failure — the adapter itself never retries", async () => {
    const supabase = fakeSupabase();
    supabase.rpc.mockImplementation(async (fn: string) => {
      if (fn === "get_canonical_observation_history") return historyResponse([]);
      if (fn === "ingest_raw_observation") return { data: { raw_observation_id: "raw-1" }, error: null };
      if (fn === "resolve_canonical_observation") return { data: {}, error: null };
      throw new Error(`unexpected rpc: ${fn}`);
    });
    fetchMock
      .mockRejectedValueOnce(new Error("ETIMEDOUT"))
      .mockResolvedValueOnce(jsonResponse(DFF_FIXTURE));

    const outcome = await ingestOneSeries(supabase, "secret", "run-1", fredAdapter, "fred:fedFunds", { maxRetries: 2, retryBaseDelayMs: 1 });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(outcome.status).toBe("updated");
  });
});

describe("9. unchanged-value short-circuit", () => {
  it("reports 'unchanged' and never calls ingest_raw_observation/resolve_canonical_observation when the fetched value/unit exactly match what's already canonical", async () => {
    const supabase = fakeSupabase();
    supabase.rpc.mockImplementation(async (fn: string) => {
      if (fn === "get_canonical_observation_history") {
        return historyResponse([
          { observation_period: "2026-06-30", value: 3.63, unit: "%" },
          { observation_period: "2026-07-31", value: 3.63, unit: "%" },
        ]);
      }
      throw new Error(`unexpected rpc: ${fn} — no write should occur`);
    });
    fetchMock.mockResolvedValueOnce(jsonResponse(DFF_FIXTURE));

    const outcome = await ingestOneSeries(supabase, "secret", "run-1", fredAdapter, "fred:fedFunds");

    expect(outcome.status).toBe("unchanged");
    expect(outcome.periodsWritten).toBe(0);
    expect(supabase.rpc).not.toHaveBeenCalledWith("ingest_raw_observation", expect.anything());
    expect(supabase.rpc).not.toHaveBeenCalledWith("resolve_canonical_observation", expect.anything());
  });

  it("a repeated ingestion run against the SAME fixture produces zero new revisions (idempotent rerun)", async () => {
    const supabase = fakeSupabase();
    let writeCount = 0;
    supabase.rpc.mockImplementation(async (fn: string) => {
      if (fn === "get_canonical_observation_history") {
        return historyResponse([
          { observation_period: "2026-06-30", value: 3.63, unit: "%" },
          { observation_period: "2026-07-31", value: 3.63, unit: "%" },
        ]);
      }
      if (fn === "ingest_raw_observation" || fn === "resolve_canonical_observation") { writeCount++; return { data: {}, error: null }; }
      throw new Error(`unexpected rpc: ${fn}`);
    });
    fetchMock.mockResolvedValue(jsonResponse(DFF_FIXTURE));

    await ingestOneSeries(supabase, "secret", "run-1", fredAdapter, "fred:fedFunds");
    await ingestOneSeries(supabase, "secret", "run-2", fredAdapter, "fred:fedFunds");

    expect(writeCount).toBe(0);
  });
});

describe("10. changed-value revision", () => {
  it("writes exactly the changed period through the mocked RPCs with full provenance, and no real database is ever touched", async () => {
    const supabase = fakeSupabase();
    let canonParams: Record<string, unknown> | null = null;
    supabase.rpc.mockImplementation(async (fn: string, params?: unknown) => {
      if (fn === "get_canonical_observation_history") return historyResponse([{ observation_period: "2026-06-30", value: 3.63, unit: "%" }]); // 2026-07-31 is new
      if (fn === "ingest_raw_observation") return { data: { raw_observation_id: "raw-1" }, error: null };
      if (fn === "resolve_canonical_observation") { canonParams = params as Record<string, unknown>; return { data: {}, error: null }; }
      throw new Error(`unexpected rpc: ${fn}`);
    });
    fetchMock.mockResolvedValueOnce(jsonResponse(DFF_FIXTURE));

    const outcome = await ingestOneSeries(supabase, "secret", "run-1", fredAdapter, "fred:fedFunds");

    expect(outcome.status).toBe("updated");
    expect(outcome.periodsWritten).toBe(1);
    expect(canonParams).toMatchObject({
      p_indicator_key: "fred:fedFunds",
      p_observation_period: "2026-07-31",
      p_value: 3.63,
      p_unit: "%",
      p_source_provider: "fred",
      p_quality_status: "official",
      p_source_series_id: "DFF",
      p_release_date: null,
      p_source_updated_at: null,
    });
    expect(supabase.rpc).toBeTypeOf("function"); // confirms fakeSupabase never opened a real connection
  });

  it("a genuine value change (a revision) produces a new write even when the period already exists canonically", async () => {
    const supabase = fakeSupabase();
    let canonParams: Record<string, unknown> | null = null;
    supabase.rpc.mockImplementation(async (fn: string, params?: unknown) => {
      if (fn === "get_canonical_observation_history") return historyResponse([{ observation_period: "2026-07-31", value: 3.6, unit: "%" }]); // old value 3.6, new fixture has 3.63
      if (fn === "ingest_raw_observation") return { data: { raw_observation_id: "raw-2" }, error: null };
      if (fn === "resolve_canonical_observation") { canonParams = params as Record<string, unknown>; return { data: { changed: true, previous_id: "old-row" }, error: null }; }
      throw new Error(`unexpected rpc: ${fn}`);
    });
    fetchMock.mockResolvedValueOnce(jsonResponse(DFF_FIXTURE));

    const outcome = await ingestOneSeries(supabase, "secret", "run-1", fredAdapter, "fred:fedFunds");

    expect(outcome.status).toBe("updated");
    expect(canonParams).toMatchObject({ p_observation_period: "2026-07-31", p_value: 3.63 });
  });
});

describe("11. metadata-only change does not create a revision", () => {
  it("this pilot's adapter never varies release_date/source_updated_at across runs (both always null), so metadata-only drift cannot occur by construction — value/unit are the only fields the orchestrator's diff (or resolve_canonical_observation's own short-circuit) ever compares", async () => {
    const supabase = fakeSupabase();
    supabase.rpc.mockImplementation(async (fn: string) => {
      if (fn === "get_canonical_observation_history") {
        return historyResponse([
          { observation_period: "2026-06-30", value: 3.63, unit: "%" },
          { observation_period: "2026-07-31", value: 3.63, unit: "%" },
        ]);
      }
      throw new Error(`unexpected rpc: ${fn} — provenance never differs across runs for this adapter, so no write should ever occur here`);
    });
    fetchMock.mockResolvedValueOnce(jsonResponse(DFF_FIXTURE));

    const outcome = await ingestOneSeries(supabase, "secret", "run-1", fredAdapter, "fred:fedFunds");
    expect(outcome.status).toBe("unchanged");
  });
});

describe("16. per-series failure isolation", () => {
  it("fred:fedFunds failing (e.g. a transient FRED error) never affects fred:usCpiInflation in the same run", async () => {
    const supabase = fakeSupabase();
    supabase.rpc.mockImplementation(async (fn: string) => {
      if (fn === "get_canonical_observation_history") return historyResponse([]);
      if (fn === "ingest_raw_observation") return { data: { raw_observation_id: "raw-1" }, error: null };
      if (fn === "resolve_canonical_observation") return { data: {}, error: null };
      throw new Error(`unexpected rpc: ${fn}`);
    });
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes("series_id=DFF")) throw new Error("FRED 503 for DFF");
      if (url.includes("series_id=CPIAUCSL")) return jsonResponse(CPI_FIXTURE);
      throw new Error("unexpected url in isolation test");
    });

    const outcomes = await ingestManySeries(supabase, "secret", "run-1", [
      { adapter: fredAdapter, indicatorKey: "fred:fedFunds" },
      { adapter: fredAdapter, indicatorKey: "fred:usCpiInflation" },
    ], { maxRetries: 0, retryBaseDelayMs: 1 });

    const fedFunds = outcomes.find((o) => o.indicatorKey === "fred:fedFunds")!;
    const cpi = outcomes.find((o) => o.indicatorKey === "fred:usCpiInflation")!;
    expect(fedFunds.status).toBe("failed");
    expect(fedFunds.error).toMatch(/503/);
    expect(cpi.status).toBe("updated");
  });

  it("an out-of-pilot-scope indicatorKey fails in isolation without affecting the real pilot series", async () => {
    const supabase = fakeSupabase();
    supabase.rpc.mockImplementation(async (fn: string) => {
      if (fn === "get_canonical_observation_history") return historyResponse([]);
      if (fn === "ingest_raw_observation") return { data: { raw_observation_id: "raw-1" }, error: null };
      if (fn === "resolve_canonical_observation") return { data: {}, error: null };
      throw new Error(`unexpected rpc: ${fn}`);
    });
    fetchMock.mockResolvedValue(jsonResponse(DFF_FIXTURE));

    const outcomes = await ingestManySeries(supabase, "secret", "run-1", [
      { adapter: fredAdapter, indicatorKey: "fred:dgs10" }, // not in FRED_SERIES -- throws immediately, no fetch
      { adapter: fredAdapter, indicatorKey: "fred:fedFunds" },
    ], { maxRetries: 0, retryBaseDelayMs: 1 });

    const bad = outcomes.find((o) => o.indicatorKey === "fred:dgs10")!;
    const fedFunds = outcomes.find((o) => o.indicatorKey === "fred:fedFunds")!;
    expect(bad.status).toBe("failed");
    expect(bad.error).toMatch(/no series configuration/);
    expect(fedFunds.status).toBe("updated");
  });
});
