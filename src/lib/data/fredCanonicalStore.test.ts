// Phase 8.12 tests for the FRED canonical read helper. Mocks
// createPublicDataClient entirely — no real Supabase connection.

import { describe, it, expect, vi, beforeEach } from "vitest";

const rpcMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/publicDataClient", () => ({
  createPublicDataClient: () => ({ rpc: rpcMock }),
}));

import { getCanonicalFredHistory } from "./fredCanonicalStore";

function provenanceRow(overrides: Partial<{
  observation_period: string; value: number; unit: string; vintage: string;
  release_date: string | null; source_updated_at: string | null; fetched_at: string | null;
  quality_status: string | null; source_series_id: string | null; source_reference: Record<string, unknown> | null;
}> = {}) {
  return {
    observation_period: "2026-07-31",
    value: 3.63,
    unit: "%",
    vintage: "2026-08-13T20:50:40.828Z",
    release_date: null,
    source_updated_at: null,
    fetched_at: "2026-08-13T20:50:36.308Z",
    quality_status: "official",
    source_series_id: "DFF",
    source_reference: { endpoint: "https://api.stlouisfed.org/fred/series/observations", seriesId: "DFF", frequency: "m", aggregationMethod: "eop" },
    ...overrides,
  };
}

beforeEach(() => {
  rpcMock.mockReset();
});

describe("13. canonical read path — getCanonicalFredHistory", () => {
  it("maps RPC rows into CanonicalFredRow[], reversed to oldest -> newest", async () => {
    rpcMock.mockResolvedValueOnce({
      data: [provenanceRow({ observation_period: "2026-07-31", value: 3.63 }), provenanceRow({ observation_period: "2026-06-30", value: 3.6 })], // RPC returns newest-first
      error: null,
    });
    const rows = await getCanonicalFredHistory("fred:fedFunds");
    expect(rows.map((r) => r.observationPeriod)).toEqual(["2026-06-30", "2026-07-31"]); // oldest -> newest
  });

  it("preserves full numeric precision", async () => {
    rpcMock.mockResolvedValueOnce({ data: [provenanceRow({ value: 3.30386 })], error: null });
    const rows = await getCanonicalFredHistory("fred:usCpiInflation");
    expect(rows[0].value).toBe(3.30386);
  });

  it("maps every provenance field (releaseDate and sourceUpdatedAt both null, per fredAdapter.ts's documented decisions)", async () => {
    rpcMock.mockResolvedValueOnce({ data: [provenanceRow()], error: null });
    const [row] = await getCanonicalFredHistory("fred:fedFunds");
    expect(row.releaseDate).toBeNull();
    expect(row.sourceUpdatedAt).toBeNull();
    expect(row.fetchedAt).toBe("2026-08-13T20:50:36.308Z");
    expect(row.qualityStatus).toBe("official");
    expect(row.sourceSeriesId).toBe("DFF");
    expect(row.sourceReference).toMatchObject({ frequency: "m", aggregationMethod: "eop" });
  });

  it("empty history: returns [] when no canonical rows exist yet (never throws)", async () => {
    rpcMock.mockResolvedValue({ data: [], error: null });
    const rows = await getCanonicalFredHistory("fred:fedFunds");
    expect(rows).toEqual([]);
  });

  it("database failure: returns [] after exhausting retries, never throws", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "connection reset" } });
    const rows = await getCanonicalFredHistory("fred:fedFunds");
    expect(rows).toEqual([]);
    expect(rpcMock).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it("recovers after a transient failure within the retry budget", async () => {
    rpcMock
      .mockResolvedValueOnce({ data: null, error: { message: "transient" } })
      .mockResolvedValueOnce({ data: [provenanceRow()], error: null });
    const rows = await getCanonicalFredHistory("fred:fedFunds");
    expect(rows).toHaveLength(1);
  });

  it("calls get_canonical_observation_provenance (not the plain history RPC) with the exact indicator key and limit", async () => {
    rpcMock.mockResolvedValueOnce({ data: [], error: null });
    await getCanonicalFredHistory("fred:usCpiInflation", 42);
    expect(rpcMock).toHaveBeenCalledWith("get_canonical_observation_provenance", { p_indicator_key: "fred:usCpiInflation", p_limit: 42 });
  });

  it("no secret-shaped strings ever appear in the mapped output", async () => {
    rpcMock.mockResolvedValueOnce({ data: [provenanceRow()], error: null });
    const rows = await getCanonicalFredHistory("fred:fedFunds");
    expect(JSON.stringify(rows)).not.toMatch(/api[_-]?key|bearer|secret/i);
  });
});
