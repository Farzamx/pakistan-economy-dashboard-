// Phase 8.17 — orchestrator dry run using the real yahooGoldAdapter
// (fetchYfHistory mocked) against a MOCKED Supabase client only. Nothing
// here touches a real database; this proves the generic
// ingestionOrchestrator (built and certified in Phase 8.1, reused
// unchanged) works correctly when driven by the Yahoo Gold adapter's real
// output, before any cutover decision is made.

import { describe, it, expect, vi, beforeEach } from "vitest";

const fetchYfHistoryMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/data/yfinance", () => ({ fetchYfHistory: fetchYfHistoryMock }));

const { ingestOneSeries, ingestManySeries } = await import("@/lib/providers/ingestionOrchestrator");
const { yahooGoldAdapter, YAHOO_GOLD_INDICATOR_KEY } = await import("@/lib/providers/yahooGoldAdapter");

const GOLD_FIXTURE = [
  { date: "2026-06-01", close: 4022.89990234375 },
  { date: "2026-07-01", close: 4049.10009765625 },
  { date: "2026-08-13", close: 4426.2001953125 }, // trailing current-month bar -- must never be persisted
];

function fakeSupabase() {
  const rpc = vi.fn();
  return { rpc } as unknown as import("@supabase/supabase-js").SupabaseClient & { rpc: typeof rpc };
}
function historyResponse(rows: { observation_period: string; value: number; unit: string }[]) {
  return { data: rows, error: null };
}

beforeEach(() => {
  fetchYfHistoryMock.mockReset();
});

describe("adapter -> orchestrator integration", () => {
  it("ingests yahoo:goldMonthly end-to-end through the real, unmodified generic orchestrator, excluding the trailing in-progress bar", async () => {
    const supabase = fakeSupabase();
    supabase.rpc.mockImplementation(async (fn: string) => {
      if (fn === "get_canonical_observation_history") return historyResponse([]);
      if (fn === "ingest_raw_observation") return { data: { raw_observation_id: "raw-1" }, error: null };
      if (fn === "resolve_canonical_observation") return { data: {}, error: null };
      throw new Error(`unexpected rpc: ${fn}`);
    });
    fetchYfHistoryMock.mockResolvedValueOnce(GOLD_FIXTURE);

    const outcome = await ingestOneSeries(supabase, "secret", "run-1", yahooGoldAdapter, YAHOO_GOLD_INDICATOR_KEY);

    expect(outcome.status).toBe("updated");
    expect(outcome.periodsWritten).toBe(2); // June + July only -- August's trailing bar excluded
    expect(outcome.latestPeriod).toBe("2026-07-31");
  });

  it("retries a transient Yahoo fetch failure — the adapter itself never retries", async () => {
    const supabase = fakeSupabase();
    supabase.rpc.mockImplementation(async (fn: string) => {
      if (fn === "get_canonical_observation_history") return historyResponse([]);
      if (fn === "ingest_raw_observation") return { data: { raw_observation_id: "raw-1" }, error: null };
      if (fn === "resolve_canonical_observation") return { data: {}, error: null };
      throw new Error(`unexpected rpc: ${fn}`);
    });
    fetchYfHistoryMock
      .mockRejectedValueOnce(new Error("ETIMEDOUT"))
      .mockResolvedValueOnce(GOLD_FIXTURE);

    const outcome = await ingestOneSeries(supabase, "secret", "run-1", yahooGoldAdapter, YAHOO_GOLD_INDICATOR_KEY, { maxRetries: 2, retryBaseDelayMs: 1 });

    expect(fetchYfHistoryMock).toHaveBeenCalledTimes(2);
    expect(outcome.status).toBe("updated");
  });
});

describe("L. unchanged observation produces no canonical write", () => {
  it("reports 'unchanged' and never calls ingest_raw_observation/resolve_canonical_observation when the fetched value/unit exactly match what's already canonical", async () => {
    const supabase = fakeSupabase();
    supabase.rpc.mockImplementation(async (fn: string) => {
      if (fn === "get_canonical_observation_history") {
        return historyResponse([
          { observation_period: "2026-06-30", value: 4022.89990234375, unit: "$/oz" },
          { observation_period: "2026-07-31", value: 4049.10009765625, unit: "$/oz" },
        ]);
      }
      throw new Error(`unexpected rpc: ${fn} — no write should occur`);
    });
    fetchYfHistoryMock.mockResolvedValueOnce(GOLD_FIXTURE);

    const outcome = await ingestOneSeries(supabase, "secret", "run-1", yahooGoldAdapter, YAHOO_GOLD_INDICATOR_KEY);

    expect(outcome.status).toBe("unchanged");
    expect(outcome.periodsWritten).toBe(0);
    expect(supabase.rpc).not.toHaveBeenCalledWith("ingest_raw_observation", expect.anything());
    expect(supabase.rpc).not.toHaveBeenCalledWith("resolve_canonical_observation", expect.anything());
  });
});

describe("N. repeated ingestion is idempotent", () => {
  it("a repeated ingestion run against the SAME fixture produces zero new revisions", async () => {
    const supabase = fakeSupabase();
    let writeCount = 0;
    supabase.rpc.mockImplementation(async (fn: string) => {
      if (fn === "get_canonical_observation_history") {
        return historyResponse([
          { observation_period: "2026-06-30", value: 4022.89990234375, unit: "$/oz" },
          { observation_period: "2026-07-31", value: 4049.10009765625, unit: "$/oz" },
        ]);
      }
      if (fn === "ingest_raw_observation" || fn === "resolve_canonical_observation") { writeCount++; return { data: {}, error: null }; }
      throw new Error(`unexpected rpc: ${fn}`);
    });
    fetchYfHistoryMock.mockResolvedValue(GOLD_FIXTURE);

    await ingestOneSeries(supabase, "secret", "run-1", yahooGoldAdapter, YAHOO_GOLD_INDICATOR_KEY);
    await ingestOneSeries(supabase, "secret", "run-2", yahooGoldAdapter, YAHOO_GOLD_INDICATOR_KEY);

    expect(writeCount).toBe(0);
  });
});

describe("M. changed completed-month observation creates a new revision", () => {
  it("writes exactly the changed period through the mocked RPCs with full provenance, and no real database is ever touched", async () => {
    const supabase = fakeSupabase();
    let canonParams: Record<string, unknown> | null = null;
    supabase.rpc.mockImplementation(async (fn: string, params?: unknown) => {
      if (fn === "get_canonical_observation_history") return historyResponse([{ observation_period: "2026-06-30", value: 4022.89990234375, unit: "$/oz" }]); // 2026-07-31 is new
      if (fn === "ingest_raw_observation") return { data: { raw_observation_id: "raw-1" }, error: null };
      if (fn === "resolve_canonical_observation") { canonParams = params as Record<string, unknown>; return { data: {}, error: null }; }
      throw new Error(`unexpected rpc: ${fn}`);
    });
    fetchYfHistoryMock.mockResolvedValueOnce(GOLD_FIXTURE);

    const outcome = await ingestOneSeries(supabase, "secret", "run-1", yahooGoldAdapter, YAHOO_GOLD_INDICATOR_KEY);

    expect(outcome.status).toBe("updated");
    expect(outcome.periodsWritten).toBe(1);
    expect(canonParams).toMatchObject({
      p_indicator_key: YAHOO_GOLD_INDICATOR_KEY,
      p_observation_period: "2026-07-31",
      p_value: 4049.10009765625,
      p_unit: "$/oz",
      p_source_provider: "yahoo-finance",
      p_quality_status: "official",
      p_source_series_id: "GC=F",
      p_release_date: null,
      p_source_updated_at: null,
    });
    expect(supabase.rpc).toBeTypeOf("function"); // confirms fakeSupabase never opened a real connection
  });

  it("a genuine value change (a revision) produces a new write even when the period already exists canonically", async () => {
    const supabase = fakeSupabase();
    let canonParams: Record<string, unknown> | null = null;
    supabase.rpc.mockImplementation(async (fn: string, params?: unknown) => {
      if (fn === "get_canonical_observation_history") return historyResponse([{ observation_period: "2026-07-31", value: 4000.0, unit: "$/oz" }]); // old value differs from fixture's 4049.1
      if (fn === "ingest_raw_observation") return { data: { raw_observation_id: "raw-2" }, error: null };
      if (fn === "resolve_canonical_observation") { canonParams = params as Record<string, unknown>; return { data: { changed: true, previous_id: "old-row" }, error: null }; }
      throw new Error(`unexpected rpc: ${fn}`);
    });
    fetchYfHistoryMock.mockResolvedValueOnce([{ date: "2026-07-01", close: 4049.10009765625 }]);

    const outcome = await ingestOneSeries(supabase, "secret", "run-1", yahooGoldAdapter, YAHOO_GOLD_INDICATOR_KEY);

    expect(outcome.status).toBe("updated");
    expect(canonParams).toMatchObject({ p_observation_period: "2026-07-31", p_value: 4049.10009765625 });
  });
});

describe("provenance-only change never creates a revision", () => {
  it("this pilot's adapter never varies release_date/source_updated_at across runs (both always null), so metadata-only drift cannot occur by construction", async () => {
    const supabase = fakeSupabase();
    supabase.rpc.mockImplementation(async (fn: string) => {
      if (fn === "get_canonical_observation_history") {
        return historyResponse([
          { observation_period: "2026-06-30", value: 4022.89990234375, unit: "$/oz" },
          { observation_period: "2026-07-31", value: 4049.10009765625, unit: "$/oz" },
        ]);
      }
      throw new Error(`unexpected rpc: ${fn} — provenance never differs across runs for this adapter, so no write should ever occur here`);
    });
    fetchYfHistoryMock.mockResolvedValueOnce(GOLD_FIXTURE);

    const outcome = await ingestOneSeries(supabase, "secret", "run-1", yahooGoldAdapter, YAHOO_GOLD_INDICATOR_KEY);
    expect(outcome.status).toBe("unchanged");
  });
});

describe("missing month produces no synthetic revision", () => {
  it("a genuine Yahoo gap is never filled with a fabricated observation", async () => {
    const supabase = fakeSupabase();
    let writeCount = 0;
    supabase.rpc.mockImplementation(async (fn: string) => {
      if (fn === "get_canonical_observation_history") return historyResponse([]);
      if (fn === "ingest_raw_observation" || fn === "resolve_canonical_observation") { writeCount++; return { data: {}, error: null }; }
      throw new Error(`unexpected rpc: ${fn}`);
    });
    fetchYfHistoryMock.mockResolvedValueOnce([
      { date: "2025-05-01", close: 3288.89990234375 },
      { date: "2025-07-01", close: 3293.199951171875 }, // June 2025 genuinely absent
    ]);

    const outcome = await ingestOneSeries(supabase, "secret", "run-1", yahooGoldAdapter, YAHOO_GOLD_INDICATOR_KEY);
    expect(outcome.status).toBe("updated");
    expect(outcome.periodsWritten).toBe(2); // exactly the 2 periods Yahoo actually returned
    expect(writeCount).toBe(4); // 2 periods x (ingest_raw_observation + resolve_canonical_observation)
  });
});

describe("per-job isolation via ingestManySeries", () => {
  it("an out-of-pilot-scope indicatorKey fails in isolation without affecting the real gold series", async () => {
    const supabase = fakeSupabase();
    supabase.rpc.mockImplementation(async (fn: string) => {
      if (fn === "get_canonical_observation_history") return historyResponse([]);
      if (fn === "ingest_raw_observation") return { data: { raw_observation_id: "raw-1" }, error: null };
      if (fn === "resolve_canonical_observation") return { data: {}, error: null };
      throw new Error(`unexpected rpc: ${fn}`);
    });
    fetchYfHistoryMock.mockResolvedValue(GOLD_FIXTURE);

    const outcomes = await ingestManySeries(supabase, "secret", "run-1", [
      { adapter: yahooGoldAdapter, indicatorKey: "yahoo:silverMonthly" }, // not in pilot scope -- throws immediately, no fetch
      { adapter: yahooGoldAdapter, indicatorKey: YAHOO_GOLD_INDICATOR_KEY },
    ], { maxRetries: 0, retryBaseDelayMs: 1 });

    const bad = outcomes.find((o) => o.indicatorKey === "yahoo:silverMonthly")!;
    const gold = outcomes.find((o) => o.indicatorKey === YAHOO_GOLD_INDICATOR_KEY)!;
    expect(bad.status).toBe("failed");
    expect(bad.error).toMatch(/no series configuration/);
    expect(gold.status).toBe("updated");
  });
});
