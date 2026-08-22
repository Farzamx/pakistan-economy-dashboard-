// Phase 8.17 tests for the Yahoo Gold Monthly canonical read helper. Mocks
// createPublicDataClient entirely — no real Supabase connection.

import { describe, it, expect, vi, beforeEach } from "vitest";

const rpcMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/publicDataClient", () => ({
  createPublicDataClient: () => ({ rpc: rpcMock }),
}));

import { getCanonicalYahooGoldHistory } from "./yahooGoldCanonicalStore";

function provenanceRow(overrides: Partial<{
  observation_period: string; value: number; unit: string; vintage: string;
  release_date: string | null; source_updated_at: string | null; fetched_at: string | null;
  quality_status: string | null; source_series_id: string | null; source_reference: Record<string, unknown> | null;
}> = {}) {
  return {
    observation_period: "2026-07-31",
    value: 4049.10009765625,
    unit: "$/oz",
    vintage: "2026-08-13T21:00:00.000Z",
    release_date: null,
    source_updated_at: null,
    fetched_at: "2026-08-13T20:59:55.000Z",
    quality_status: "official",
    source_series_id: "GC=F",
    source_reference: { endpoint: "https://query1.finance.yahoo.com/v8/finance/chart", symbol: "GC=F", interval: "1mo", range: "10y" },
    ...overrides,
  };
}

beforeEach(() => {
  rpcMock.mockReset();
});

describe("getCanonicalYahooGoldHistory", () => {
  it("maps RPC rows into CanonicalYahooGoldRow[], reversed to oldest -> newest", async () => {
    rpcMock.mockResolvedValueOnce({
      data: [provenanceRow({ observation_period: "2026-07-31", value: 4049.1 }), provenanceRow({ observation_period: "2026-06-30", value: 4022.9 })], // RPC returns newest-first
      error: null,
    });
    const rows = await getCanonicalYahooGoldHistory("yahoo:goldMonthly");
    expect(rows.map((r) => r.observationPeriod)).toEqual(["2026-06-30", "2026-07-31"]); // oldest -> newest
  });

  it("preserves full numeric precision", async () => {
    rpcMock.mockResolvedValueOnce({ data: [provenanceRow({ value: 4049.10009765625 })], error: null });
    const rows = await getCanonicalYahooGoldHistory("yahoo:goldMonthly");
    expect(rows[0].value).toBe(4049.10009765625);
  });

  it("maps every provenance field (releaseDate and sourceUpdatedAt both null, per yahooGoldAdapter.ts's documented decisions)", async () => {
    rpcMock.mockResolvedValueOnce({ data: [provenanceRow()], error: null });
    const [row] = await getCanonicalYahooGoldHistory("yahoo:goldMonthly");
    expect(row.releaseDate).toBeNull();
    expect(row.sourceUpdatedAt).toBeNull();
    expect(row.qualityStatus).toBe("official");
    expect(row.sourceSeriesId).toBe("GC=F");
    expect(row.sourceReference).toMatchObject({ symbol: "GC=F", interval: "1mo", range: "10y" });
  });

  it("empty history: returns [] when no canonical rows exist yet (never throws)", async () => {
    rpcMock.mockResolvedValue({ data: [], error: null });
    const rows = await getCanonicalYahooGoldHistory("yahoo:goldMonthly");
    expect(rows).toEqual([]);
  });

  it("database failure: returns [] after exhausting retries, never throws", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "connection reset" } });
    const rows = await getCanonicalYahooGoldHistory("yahoo:goldMonthly");
    expect(rows).toEqual([]);
    expect(rpcMock).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it("recovers after a transient failure within the retry budget", async () => {
    rpcMock
      .mockResolvedValueOnce({ data: null, error: { message: "transient" } })
      .mockResolvedValueOnce({ data: [provenanceRow()], error: null });
    const rows = await getCanonicalYahooGoldHistory("yahoo:goldMonthly");
    expect(rows).toHaveLength(1);
  });

  it("calls get_canonical_observation_provenance (not the plain history RPC) with the exact indicator key and limit", async () => {
    rpcMock.mockResolvedValueOnce({ data: [], error: null });
    await getCanonicalYahooGoldHistory("yahoo:goldMonthly", 42);
    expect(rpcMock).toHaveBeenCalledWith("get_canonical_observation_provenance", { p_indicator_key: "yahoo:goldMonthly", p_limit: 42 });
  });

  it("no secret-shaped strings ever appear in the mapped output", async () => {
    rpcMock.mockResolvedValueOnce({ data: [provenanceRow()], error: null });
    const rows = await getCanonicalYahooGoldHistory("yahoo:goldMonthly");
    expect(JSON.stringify(rows)).not.toMatch(/api[_-]?key|bearer|secret|token/i);
  });
});
