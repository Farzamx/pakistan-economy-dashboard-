// Phase 8.3 Step 3 — dry run of the PRODUCTION job list (exactly what
// scripts/ingestWorldBank.ts constructs from WORLD_BANK_SERIES) through the
// real ingestionOrchestrator + real worldBankAdapter, against a MOCKED
// Supabase client and MOCKED fetch. No real network, no real database.
// This is deliberately run again here, distinct from Phase 8.2's generic
// orchestrator dry-run tests, because the brief requires proving the EXACT
// production configuration resolves cleanly before any real write — not
// just that the orchestrator works in general.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ingestManySeries, type IngestJob } from "@/lib/providers/ingestionOrchestrator";
import { worldBankAdapter, WORLD_BANK_SERIES } from "@/lib/providers/worldBankAdapter";

function jsonResponse(body: unknown): Response {
  return { ok: true, status: 200, json: async () => body } as Response;
}

function rawFixture(iso3: string, iso2: string, name: string, rows: { date: string; value: number }[]) {
  return [
    { page: 1, pages: 1, per_page: 1000, total: rows.length, sourceid: "2", lastupdated: "2026-07-13" },
    rows.map((r) => ({ indicator: { id: "NY.GDP.MKTP.KD.ZG", value: "GDP growth (annual %)" }, country: { id: iso2, value: name }, countryiso3code: iso3, date: r.date, value: r.value, unit: "", obs_status: "", decimal: 1 })),
  ];
}

// Same real, live-captured (2026-08-13) values used throughout Phase 8.2.
const PAK_ROWS = [{ date: "2025", value: 3.69842668749033 }, { date: "2024", value: 3.08176295579301 }, { date: "2023", value: -0.414935997088406 }];
const IND_ROWS = [{ date: "2025", value: 7.56666179284244 }, { date: "2024", value: 7.09927893176518 }];
const BGD_ROWS = [{ date: "2025", value: 3.48990671836833 }, { date: "2024", value: 4.22325911250161 }];

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

// Exactly what scripts/ingestWorldBank.ts's main() constructs.
function productionJobs(): IngestJob[] {
  return Object.keys(WORLD_BANK_SERIES).map((indicatorKey) => ({ adapter: worldBankAdapter, indicatorKey }));
}

describe("Phase 8.3 dry run — exact production job list, first run (empty canonical DB)", () => {
  it("all 3 series resolve, exactly the expected observation counts, correct provenance, YYYY-12-31 convention, no unexplained discrepancies", async () => {
    const jobs = productionJobs();
    expect(jobs.map((j) => j.indicatorKey).sort()).toEqual(["worldbank:gdpGrowthBangladesh", "worldbank:gdpGrowthIndia", "worldbank:gdpGrowthPak"]);

    const supabase = fakeSupabase();
    const canonicalWrites: Record<string, unknown>[] = [];
    supabase.rpc.mockImplementation(async (fn: string, params?: unknown) => {
      if (fn === "get_canonical_observation_history") return historyResponse([]); // first run — nothing ingested yet
      if (fn === "ingest_raw_observation") return { data: { raw_observation_id: `raw-${canonicalWrites.length}` }, error: null };
      if (fn === "resolve_canonical_observation") { canonicalWrites.push(params as Record<string, unknown>); return { data: {}, error: null }; }
      throw new Error(`unexpected rpc: ${fn}`);
    });
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes("/PAK/")) return jsonResponse(rawFixture("PAK", "PK", "Pakistan", PAK_ROWS));
      if (url.includes("/IND/")) return jsonResponse(rawFixture("IND", "IN", "India", IND_ROWS));
      if (url.includes("/BGD/")) return jsonResponse(rawFixture("BGD", "BD", "Bangladesh", BGD_ROWS));
      throw new Error(`unexpected fetch url: ${url}`);
    });

    const outcomes = await ingestManySeries(supabase, "secret", "dry-run-1", jobs, { concurrency: 3 });

    // 1. all 3 series resolve
    expect(outcomes).toHaveLength(3);
    expect(outcomes.every((o) => o.status !== "failed")).toBe(true);

    // 2. expected observation count (3 + 2 + 2 = 7 periods written, first run)
    const pak = outcomes.find((o) => o.indicatorKey === "worldbank:gdpGrowthPak")!;
    const ind = outcomes.find((o) => o.indicatorKey === "worldbank:gdpGrowthIndia")!;
    const bgd = outcomes.find((o) => o.indicatorKey === "worldbank:gdpGrowthBangladesh")!;
    expect(pak.periodsWritten).toBe(3);
    expect(ind.periodsWritten).toBe(2);
    expect(bgd.periodsWritten).toBe(2);
    expect(canonicalWrites).toHaveLength(7);

    // 3/4. no duplicate writes -- one write per (indicatorKey, period), no repeats
    const seen = new Set<string>();
    for (const w of canonicalWrites) {
      const key = `${w.p_indicator_key}@${w.p_observation_period}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }

    // 5. observationPeriod uses the approved YYYY-12-31 convention
    expect(canonicalWrites.every((w) => /^\d{4}-12-31$/.test(w.p_observation_period as string))).toBe(true);

    // 6. provenance passes through unchanged; sourceUpdatedAt preserved
    for (const w of canonicalWrites) {
      expect(w.p_source_provider).toBe("world-bank");
      expect(w.p_quality_status).toBe("official");
      expect(w.p_source_series_id).toBe("NY.GDP.MKTP.KD.ZG");
      expect(w.p_release_date).toBeNull();
      expect(w.p_source_updated_at).toBe("2026-07-13T00:00:00.000Z");
      expect(w.p_source_reference).toMatchObject({ indicatorCode: "NY.GDP.MKTP.KD.ZG" });
    }

    // 7. full precision preserved (spot-check the real Pakistan 2025 value)
    const pak2025 = canonicalWrites.find((w) => w.p_indicator_key === "worldbank:gdpGrowthPak" && w.p_observation_period === "2025-12-31");
    expect(pak2025?.p_value).toBe(3.69842668749033);
  });
});

describe("Phase 8.3 dry run — second run against unchanged canonical state", () => {
  it("unchanged observations produce zero canonical writes", async () => {
    const jobs = productionJobs();
    const supabase = fakeSupabase();
    let canonicalWriteCount = 0;
    supabase.rpc.mockImplementation(async (fn: string) => {
      if (fn === "get_canonical_observation_history") {
        // Already fully ingested from the "first run" scenario above.
        return historyResponse([
          { observation_period: "2023-12-31", value: -0.414935997088406, unit: "%" },
          { observation_period: "2024-12-31", value: 3.08176295579301, unit: "%" },
          { observation_period: "2025-12-31", value: 3.69842668749033, unit: "%" },
        ]);
      }
      if (fn === "resolve_canonical_observation") { canonicalWriteCount++; return { data: {}, error: null }; }
      throw new Error(`unexpected rpc for unchanged run: ${fn}`);
    });
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes("/PAK/")) return jsonResponse(rawFixture("PAK", "PK", "Pakistan", PAK_ROWS));
      if (url.includes("/IND/")) return jsonResponse(rawFixture("IND", "IN", "India", [])); // no data configured for this scenario -> empty history, unchanged trivially
      if (url.includes("/BGD/")) return jsonResponse(rawFixture("BGD", "BD", "Bangladesh", []));
      throw new Error(`unexpected fetch url: ${url}`);
    });

    const outcomes = await ingestManySeries(supabase, "secret", "dry-run-2", jobs.filter((j) => j.indicatorKey === "worldbank:gdpGrowthPak"), { concurrency: 3 });

    expect(outcomes[0].status).toBe("unchanged");
    expect(outcomes[0].periodsWritten).toBe(0);
    expect(canonicalWriteCount).toBe(0);
  });
});
