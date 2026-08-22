// Phase 8.10B Step (orchestrator integration) — exercises the real,
// unmodified Phase 8.1 ingestionOrchestrator.ts against the real
// netLiquidReservesAdapter, with sbpTransportGetBinary mocked (no real
// curl/network) and a mocked Supabase client (no real database writes).
// Covers required categories 12-16: unchanged short-circuit, changed-value
// revision, historical-period revision, provenance-only-change-is-not-a-
// revision, and per-series failure isolation.

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as XLSX from "xlsx";
import { ingestOneSeries, ingestManySeries } from "./ingestionOrchestrator";
import { netLiquidReservesAdapter, NET_LIQUID_RESERVES_INDICATOR_KEY } from "./netLiquidReservesAdapter";

const sbpTransportGetBinaryMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/data/sbpTransport", () => ({
  sbpTransportGetBinary: sbpTransportGetBinaryMock,
}));

function serialFor(dateIso: string): number {
  const [y, m, d] = dateIso.split("-").map(Number);
  const ms = Date.UTC(y, m - 1, d);
  return Math.round((ms - Date.UTC(1899, 11, 30)) / 86_400_000);
}

function buildXlsx(rows: (string | number)[][]): Buffer {
  const aoa = [
    ["Pakistan's Foreign Exchange Reserves", null, null, null],
    ["END PERIOD", "NET RESERVES WITH SBP", "NET RESERVES WITH BANKS", "TOTAL LIQUID FX RESERVES"],
    ...rows,
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Week-end");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

function mockTransport(rows: (string | number)[][]) {
  sbpTransportGetBinaryMock.mockResolvedValueOnce({ status: 200, body: buildXlsx(rows) });
}

function fakeSupabase() {
  const rpc = vi.fn();
  return { rpc } as unknown as import("@supabase/supabase-js").SupabaseClient & { rpc: typeof rpc };
}
function historyResponse(rows: { observation_period: string; value: number; unit: string }[]) {
  return { data: rows, error: null };
}

beforeEach(() => {
  sbpTransportGetBinaryMock.mockReset();
});

describe("12. same week, same value/unit -> no new vintage", () => {
  it("reports 'unchanged' and never calls the write RPCs", async () => {
    const supabase = fakeSupabase();
    supabase.rpc.mockImplementation(async (fn: string) => {
      if (fn === "get_canonical_observation_history") {
        return historyResponse([
          { observation_period: "2026-07-24", value: 11050.2, unit: "Million USD" },
          { observation_period: "2026-07-31", value: 11123.4, unit: "Million USD" },
        ]);
      }
      throw new Error(`unexpected rpc: ${fn} -- no write should occur`);
    });
    mockTransport([
      [serialFor("2026-07-24"), 11050.2, 510, 11560.2],
      [serialFor("2026-07-31"), 11123.4, 520, 11643.4],
    ]);

    const outcome = await ingestOneSeries(supabase, "secret", "run-1", netLiquidReservesAdapter, NET_LIQUID_RESERVES_INDICATOR_KEY);

    expect(outcome.status).toBe("unchanged");
    expect(outcome.periodsWritten).toBe(0);
  });
});

describe("13. changed value -> new vintage, old row superseded (via resolve_canonical_observation's own semantics)", () => {
  it("writes exactly the changed week through ingest_raw_observation + resolve_canonical_observation", async () => {
    const supabase = fakeSupabase();
    let canonParams: Record<string, unknown> | null = null;
    supabase.rpc.mockImplementation(async (fn: string, params?: unknown) => {
      if (fn === "get_canonical_observation_history") return historyResponse([{ observation_period: "2026-07-31", value: 11100.0, unit: "Million USD" }]); // stale value
      if (fn === "ingest_raw_observation") return { data: { raw_observation_id: "raw-1" }, error: null };
      if (fn === "resolve_canonical_observation") { canonParams = params as Record<string, unknown>; return { data: {}, error: null }; }
      throw new Error(`unexpected rpc: ${fn}`);
    });
    mockTransport([[serialFor("2026-07-31"), 11123.4, 520, 11643.4]]); // genuinely revised value

    const outcome = await ingestOneSeries(supabase, "secret", "run-1", netLiquidReservesAdapter, NET_LIQUID_RESERVES_INDICATOR_KEY);

    expect(outcome.status).toBe("updated");
    expect(outcome.periodsWritten).toBe(1);
    expect(canonParams).toMatchObject({
      p_indicator_key: NET_LIQUID_RESERVES_INDICATOR_KEY,
      p_observation_period: "2026-07-31",
      p_value: 11123.4,
      p_unit: "Million USD",
      p_source_provider: "sbp-forex-arch",
      p_source_series_id: "Forex_Arch.xlsx:NET RESERVES WITH SBP",
      p_quality_status: "official",
      p_release_date: null,
      p_source_updated_at: null,
    });
  });
});

describe("14. an older week is revised -> only that observation period receives a new vintage", () => {
  it("writes only the revised historical week, leaving the newer week's write untouched by that revision", async () => {
    const supabase = fakeSupabase();
    const canonWrites: Record<string, unknown>[] = [];
    supabase.rpc.mockImplementation(async (fn: string, params?: unknown) => {
      if (fn === "get_canonical_observation_history") {
        return historyResponse([
          { observation_period: "2026-07-17", value: 10999.0, unit: "Million USD" }, // will be revised
          { observation_period: "2026-07-24", value: 11050.2, unit: "Million USD" }, // unchanged
          { observation_period: "2026-07-31", value: 11123.4, unit: "Million USD" }, // unchanged
        ]);
      }
      if (fn === "ingest_raw_observation") return { data: { raw_observation_id: "raw-1" }, error: null };
      if (fn === "resolve_canonical_observation") { canonWrites.push(params as Record<string, unknown>); return { data: {}, error: null }; }
      throw new Error(`unexpected rpc: ${fn}`);
    });
    mockTransport([
      [serialFor("2026-07-17"), 11000.5, 500, 11500.5], // genuinely revised
      [serialFor("2026-07-24"), 11050.2, 510, 11560.2],
      [serialFor("2026-07-31"), 11123.4, 520, 11643.4],
    ]);

    const outcome = await ingestOneSeries(supabase, "secret", "run-1", netLiquidReservesAdapter, NET_LIQUID_RESERVES_INDICATOR_KEY);

    expect(outcome.status).toBe("updated");
    expect(outcome.periodsWritten).toBe(1);
    expect(canonWrites).toHaveLength(1);
    expect(canonWrites[0]).toMatchObject({ p_observation_period: "2026-07-17", p_value: 11000.5 });
  });
});

describe("15. provenance-only change does not create a revision", () => {
  it("identical value/unit never triggers a write even though sourceReference/provenance is re-supplied every run", async () => {
    const supabase = fakeSupabase();
    let canonicalWrites = 0;
    supabase.rpc.mockImplementation(async (fn: string) => {
      if (fn === "get_canonical_observation_history") return historyResponse([{ observation_period: "2026-07-31", value: 11123.4, unit: "Million USD" }]);
      if (fn === "resolve_canonical_observation") { canonicalWrites++; return { data: {}, error: null }; }
      if (fn === "ingest_raw_observation") return { data: { raw_observation_id: "raw-1" }, error: null };
      throw new Error("unexpected");
    });
    mockTransport([[serialFor("2026-07-31"), 11123.4, 520, 11643.4]]); // same value; provenance (sourceReference) is freshly constructed every call regardless

    await ingestOneSeries(supabase, "secret", "run-1", netLiquidReservesAdapter, NET_LIQUID_RESERVES_INDICATOR_KEY);

    expect(canonicalWrites).toBe(0);
  });
});

describe("16. provider failure isolation within ingestManySeries", () => {
  it("a Net Liquid Reserves transport failure does not abort other jobs in the same batch", async () => {
    const supabase = fakeSupabase();
    supabase.rpc.mockImplementation(async (fn: string) => {
      if (fn === "get_canonical_observation_history") return historyResponse([]);
      if (fn === "ingest_raw_observation") return { data: { raw_observation_id: "raw-1" }, error: null };
      if (fn === "resolve_canonical_observation") return { data: {}, error: null };
      throw new Error("unexpected");
    });
    sbpTransportGetBinaryMock.mockRejectedValue(new Error("SBP Forex_Arch.xlsx transport returned HTTP 403"));

    const goodAdapter = { providerId: "fixture", fetchObservations: async () => [{
      indicatorKey: "fixture:good", observationPeriod: "2026-07-31", value: 1, unit: "%", cadence: "weekly" as const,
      provider: "fixture", sourceSeriesId: "F1", qualityStatus: "official", releaseDate: null, sourceUpdatedAt: null, sourceReference: null,
    }] };

    const outcomes = await ingestManySeries(supabase, "secret", "run-1", [
      { adapter: netLiquidReservesAdapter, indicatorKey: NET_LIQUID_RESERVES_INDICATOR_KEY },
      { adapter: goodAdapter, indicatorKey: "fixture:good" },
    ], { maxRetries: 0, retryBaseDelayMs: 1 });

    const fxOutcome = outcomes.find((o) => o.indicatorKey === NET_LIQUID_RESERVES_INDICATOR_KEY)!;
    const goodOutcome = outcomes.find((o) => o.indicatorKey === "fixture:good")!;
    expect(fxOutcome.status).toBe("failed");
    expect(fxOutcome.error).toMatch(/403/);
    expect(goodOutcome.status).toBe("updated");
  });
});

describe("1/new week appears", () => {
  it("a genuinely new week (not previously canonical) is written as a fresh observation", async () => {
    const supabase = fakeSupabase();
    let written = 0;
    supabase.rpc.mockImplementation(async (fn: string) => {
      if (fn === "get_canonical_observation_history") return historyResponse([{ observation_period: "2026-07-24", value: 11050.2, unit: "Million USD" }]);
      if (fn === "ingest_raw_observation") return { data: { raw_observation_id: "raw-1" }, error: null };
      if (fn === "resolve_canonical_observation") { written++; return { data: {}, error: null }; }
      throw new Error("unexpected");
    });
    mockTransport([
      [serialFor("2026-07-24"), 11050.2, 510, 11560.2],
      [serialFor("2026-07-31"), 11123.4, 520, 11643.4], // new week
    ]);

    const outcome = await ingestOneSeries(supabase, "secret", "run-1", netLiquidReservesAdapter, NET_LIQUID_RESERVES_INDICATOR_KEY);
    expect(outcome.status).toBe("updated");
    expect(written).toBe(1);
  });
});
