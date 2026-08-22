// Phase 8.3 tests for the World Bank canonical read helper. Mocks
// createPublicDataClient entirely -- no real Supabase connection.

import { describe, it, expect, vi, beforeEach } from "vitest";

const rpcMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/publicDataClient", () => ({
  createPublicDataClient: () => ({ rpc: rpcMock }),
}));

import { getCanonicalWorldBankHistory } from "./worldBankCanonicalStore";

function provenanceRow(overrides: Partial<{
  observation_period: string; value: number; unit: string; vintage: string;
  release_date: string | null; source_updated_at: string | null; fetched_at: string | null;
  quality_status: string | null; source_series_id: string | null; source_reference: Record<string, unknown> | null;
}> = {}) {
  return {
    observation_period: "2025-12-31",
    value: 3.69842668749033,
    unit: "%",
    vintage: "2026-08-12T20:50:40.828Z",
    release_date: null,
    source_updated_at: "2026-07-13T00:00:00.000Z",
    fetched_at: "2026-08-12T20:50:36.308Z",
    quality_status: "official",
    source_series_id: "NY.GDP.MKTP.KD.ZG",
    source_reference: { endpoint: "https://api.worldbank.org/v2/country/PAK/indicator/NY.GDP.MKTP.KD.ZG" },
    ...overrides,
  };
}

beforeEach(() => {
  rpcMock.mockReset();
});

describe("getCanonicalWorldBankHistory", () => {
  it("16/18. maps RPC rows into CanonicalWorldBankRow[], reversed to oldest -> newest", async () => {
    rpcMock.mockResolvedValueOnce({
      data: [provenanceRow({ observation_period: "2025-12-31", value: 3.7 }), provenanceRow({ observation_period: "2024-12-31", value: 3.1 })], // RPC returns newest-first
      error: null,
    });
    const rows = await getCanonicalWorldBankHistory("worldbank:gdpGrowthPak");
    expect(rows.map((r) => r.observationPeriod)).toEqual(["2024-12-31", "2025-12-31"]); // oldest -> newest
  });

  it("19. preserves full numeric precision", async () => {
    rpcMock.mockResolvedValueOnce({ data: [provenanceRow({ value: -0.414935997088406 })], error: null });
    const rows = await getCanonicalWorldBankHistory("worldbank:gdpGrowthPak");
    expect(rows[0].value).toBe(-0.414935997088406);
  });

  it("maps every provenance field (release_date null, sourceUpdatedAt/fetchedAt/qualityStatus/sourceSeriesId/sourceReference populated)", async () => {
    rpcMock.mockResolvedValueOnce({ data: [provenanceRow()], error: null });
    const [row] = await getCanonicalWorldBankHistory("worldbank:gdpGrowthPak");
    expect(row.releaseDate).toBeNull();
    expect(row.sourceUpdatedAt).toBe("2026-07-13T00:00:00.000Z");
    expect(row.fetchedAt).toBe("2026-08-12T20:50:36.308Z");
    expect(row.qualityStatus).toBe("official");
    expect(row.sourceSeriesId).toBe("NY.GDP.MKTP.KD.ZG");
    expect(row.sourceReference).toMatchObject({ endpoint: expect.stringContaining("worldbank.org") });
  });

  it("21. empty history: returns [] when no canonical rows exist yet (never throws)", async () => {
    rpcMock.mockResolvedValue({ data: [], error: null });
    const rows = await getCanonicalWorldBankHistory("worldbank:gdpGrowthPak");
    expect(rows).toEqual([]);
  });

  it("22. database failure: returns [] after exhausting retries, never throws", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "connection reset" } });
    const rows = await getCanonicalWorldBankHistory("worldbank:gdpGrowthPak");
    expect(rows).toEqual([]);
    expect(rpcMock).toHaveBeenCalledTimes(3); // initial + 2 retries, matching sbpCanonicalStore.ts's own READ_RETRIES
  });

  it("recovers after a transient failure within the retry budget", async () => {
    rpcMock
      .mockResolvedValueOnce({ data: null, error: { message: "transient" } })
      .mockResolvedValueOnce({ data: [provenanceRow()], error: null });
    const rows = await getCanonicalWorldBankHistory("worldbank:gdpGrowthPak");
    expect(rows).toHaveLength(1);
  });

  it("calls get_canonical_observation_provenance (not the plain history RPC) with the exact indicator key and limit", async () => {
    rpcMock.mockResolvedValueOnce({ data: [], error: null });
    await getCanonicalWorldBankHistory("worldbank:gdpGrowthIndia", 42);
    expect(rpcMock).toHaveBeenCalledWith("get_canonical_observation_provenance", { p_indicator_key: "worldbank:gdpGrowthIndia", p_limit: 42 });
  });
});
