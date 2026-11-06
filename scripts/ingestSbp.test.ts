// Phase 4 (Observation Contract & Provenance Migration) tests for the
// canonical write path in ingestSeries(). No live SBP or Supabase
// connectivity: getCanonicalSbpHistory is mocked, and the Supabase client
// passed to ingestSeries() is a plain object with a mocked .rpc(). series.fetch
// is supplied directly per test, so sbp.ts's real HTTP/curl transport is
// never exercised here either.
//
// Scope: this file proves what the TypeScript write path sends to
// resolve_canonical_observation/ingest_raw_observation. It cannot execute
// supabase/migrations/0051_canonical_observation_provenance.sql itself or the
// SQL-level unchanged-value short-circuit inside that RPC — there is no local
// Postgres in this repo's test setup (see docs/local-ingestion-setup.md; the
// only Supabase instance in this project is the one linked in
// supabase/.temp/linked-project.json). That SQL logic is unmodified by this
// migration (see the migration's own comment) and was exercised for real
// against the live database in prior phases (Phase 2C/2A) via manual
// production-command verification, not via this unit suite.

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SbpSeries } from "@/lib/data/sbp";
import { assertEnvIsolated } from "@/lib/testUtils/productionIsolation";
import { ingestSeries, type IngestibleSeries } from "./ingestSbp";

// Phase F.2b-S: importing ./ingestSbp is now inert (its start-up sits behind runIfEntryPoint()), so this file
// needs none of the protection Phase F.2b-R had to add here — the `process.exit` stub and the explanatory block
// were removed because nothing calls main() any more (verified by removing them and by
// scripts/ingestScriptsEntrySafety.test.ts, which also proves the import is inert).

const getCanonicalSbpHistoryMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/data/sbpCanonicalStore", () => ({
  getCanonicalSbpHistory: getCanonicalSbpHistoryMock,
}));

const SECRET = "test-notification-worker-secret";
const RUN_ID = "11111111-1111-1111-1111-111111111111";

function fakeSbpSeries(overrides: Partial<SbpSeries> = {}): SbpSeries {
  return {
    seriesKey: "TS_GP_BAM_M2_W.M000070",
    seriesName: "Money Supply M2",
    unit: "Million Rupees",
    latestValue: 100,
    latestDate: "2026-07-31",
    previousValue: 95,
    previousDate: "2026-06-30",
    history: [{ date: "2026-07-31", value: 100 }],
    lastUpdated: "2026-08-12T14:20:23.029Z",
    ...overrides,
  };
}

function fakeSeries(overrides: Partial<IngestibleSeries> = {}): IngestibleSeries {
  return {
    label: "moneySupplyM2",
    indicatorKey: "sbp:moneySupplyM2",
    provider: "sbp-easydata",
    qualityStatus: "official",
    buildSourceReference: (live) => ({ endpoint: `https://easydata.sbp.org.pk/api/v1/series/${live.seriesKey}/data` }),
    fetch: async () => fakeSbpSeries(),
    ...overrides,
  };
}

function fakeSupabase(): { rpc: ReturnType<typeof vi.fn> } {
  return {
    rpc: vi.fn().mockImplementation((fn: string) => {
      if (fn === "ingest_raw_observation") {
        return Promise.resolve({ data: { success: true, inserted: true, raw_observation_id: "raw-1" }, error: null });
      }
      if (fn === "resolve_canonical_observation") {
        return Promise.resolve({ data: { success: true, changed: true, canonical_id: "canon-1" }, error: null });
      }
      throw new Error(`unexpected rpc call: ${fn}`);
    }),
  };
}

function resolveCalls(supabase: { rpc: ReturnType<typeof vi.fn> }) {
  return supabase.rpc.mock.calls.filter((c) => c[0] === "resolve_canonical_observation");
}

function rawCalls(supabase: { rpc: ReturnType<typeof vi.fn> }) {
  return supabase.rpc.mock.calls.filter((c) => c[0] === "ingest_raw_observation");
}

beforeEach(() => {
  getCanonicalSbpHistoryMock.mockReset();
});

describe("ingestSeries — Observation Contract provenance (Phase 4)", () => {
  it("populates fetched_at from the fetch's own lastUpdated for a brand-new observation", async () => {
    getCanonicalSbpHistoryMock.mockResolvedValue([]);
    const supabase = fakeSupabase();
    const series = fakeSeries();

    await ingestSeries(supabase as unknown as SupabaseClient, SECRET, RUN_ID, series);

    const calls = resolveCalls(supabase);
    expect(calls).toHaveLength(1);
    expect(calls[0][1].p_fetched_at).toBe("2026-08-12T14:20:23.029Z");
  });

  it("persists source_series_id as the provider's native series key, not the internal indicator key", async () => {
    getCanonicalSbpHistoryMock.mockResolvedValue([]);
    const supabase = fakeSupabase();
    const series = fakeSeries({ indicatorKey: "sbp:moneySupplyM2" });

    await ingestSeries(supabase as unknown as SupabaseClient, SECRET, RUN_ID, series);

    const call = resolveCalls(supabase)[0];
    expect(call[1].p_source_series_id).toBe("TS_GP_BAM_M2_W.M000070");
    expect(call[1].p_source_series_id).not.toBe(series.indicatorKey);
  });

  it("persists quality_status from the series descriptor", async () => {
    getCanonicalSbpHistoryMock.mockResolvedValue([]);
    const supabase = fakeSupabase();
    const series = fakeSeries({ qualityStatus: "official" });

    await ingestSeries(supabase as unknown as SupabaseClient, SECRET, RUN_ID, series);

    expect(resolveCalls(supabase)[0][1].p_quality_status).toBe("official");
  });

  it("persists source_reference built by the series descriptor", async () => {
    getCanonicalSbpHistoryMock.mockResolvedValue([]);
    const supabase = fakeSupabase();
    const series = fakeSeries();

    await ingestSeries(supabase as unknown as SupabaseClient, SECRET, RUN_ID, series);

    const ref = resolveCalls(supabase)[0][1].p_source_reference;
    expect(ref).toEqual({ endpoint: "https://easydata.sbp.org.pk/api/v1/series/TS_GP_BAM_M2_W.M000070/data" });
  });

  it("leaves release_date null when the source does not provide one (never fabricated)", async () => {
    getCanonicalSbpHistoryMock.mockResolvedValue([]);
    const supabase = fakeSupabase();
    const series = fakeSeries();

    await ingestSeries(supabase as unknown as SupabaseClient, SECRET, RUN_ID, series);

    expect(resolveCalls(supabase)[0][1].p_release_date).toBeNull();
  });

  it("leaves source_updated_at null when the source does not provide one (never fabricated)", async () => {
    getCanonicalSbpHistoryMock.mockResolvedValue([]);
    const supabase = fakeSupabase();
    const series = fakeSeries();

    await ingestSeries(supabase as unknown as SupabaseClient, SECRET, RUN_ID, series);

    expect(resolveCalls(supabase)[0][1].p_source_updated_at).toBeNull();
  });

  it("never puts an api_key or authenticated URL in source_reference", async () => {
    getCanonicalSbpHistoryMock.mockResolvedValue([]);
    const supabase = fakeSupabase();
    const series = fakeSeries();

    await ingestSeries(supabase as unknown as SupabaseClient, SECRET, RUN_ID, series);

    const refText = JSON.stringify(resolveCalls(supabase)[0][1].p_source_reference);
    expect(refText).not.toContain("api_key");
    expect(refText).not.toContain(SECRET);
  });

  it("a changed value still attempts a write (a revision, not an overwrite of history)", async () => {
    getCanonicalSbpHistoryMock.mockResolvedValue([
      { observationPeriod: "2026-07-31", value: 95, unit: "Million Rupees", seriesName: "Money Supply M2", sourceProvider: "sbp-easydata", vintage: "2026-08-01T00:00:00.000Z" },
    ]);
    const supabase = fakeSupabase();
    const series = fakeSeries({ fetch: async () => fakeSbpSeries({ history: [{ date: "2026-07-31", value: 100 }] }) });

    const outcome = await ingestSeries(supabase as unknown as SupabaseClient, SECRET, RUN_ID, series);

    expect(outcome.status).toBe("updated");
    expect(resolveCalls(supabase)).toHaveLength(1);
    expect(resolveCalls(supabase)[0][1].p_value).toBe(100);
  });

  it("an unchanged observation never calls resolve_canonical_observation at all", async () => {
    getCanonicalSbpHistoryMock.mockResolvedValue([
      { observationPeriod: "2026-07-31", value: 100, unit: "Million Rupees", seriesName: "Money Supply M2", sourceProvider: "sbp-easydata", vintage: "2026-08-01T00:00:00.000Z" },
    ]);
    const supabase = fakeSupabase();
    const series = fakeSeries({ fetch: async () => fakeSbpSeries({ history: [{ date: "2026-07-31", value: 100 }] }) });

    const outcome = await ingestSeries(supabase as unknown as SupabaseClient, SECRET, RUN_ID, series);

    expect(outcome.status).toBe("unchanged");
    expect(resolveCalls(supabase)).toHaveLength(0);
  });

  it("existing ingest_raw_observation call shape is unchanged by the Phase 4 provenance fields", async () => {
    getCanonicalSbpHistoryMock.mockResolvedValue([]);
    const supabase = fakeSupabase();
    const series = fakeSeries();

    await ingestSeries(supabase as unknown as SupabaseClient, SECRET, RUN_ID, series);

    const call = rawCalls(supabase)[0];
    expect(call[1]).toMatchObject({
      p_internal_secret: SECRET,
      p_indicator_key: series.indicatorKey,
      p_provider: series.provider,
      p_observation_period: "2026-07-31",
      p_value: 100,
      p_unit: "Million Rupees",
      p_ingestion_run_id: RUN_ID,
    });
    expect(call[1]).not.toHaveProperty("p_fetched_at");
    expect(call[1]).not.toHaveProperty("p_source_series_id");
  });

  it("passes the internal secret through resolve_canonical_observation unchanged", async () => {
    getCanonicalSbpHistoryMock.mockResolvedValue([]);
    const supabase = fakeSupabase();
    const series = fakeSeries();

    await ingestSeries(supabase as unknown as SupabaseClient, SECRET, RUN_ID, series);

    expect(resolveCalls(supabase)[0][1].p_internal_secret).toBe(SECRET);
  });
});

describe("isolation (Phase F.2b-R / F.2b-S)", () => {
  it("after importing ./ingestSbp this worker still holds only dead credentials (defence in depth: the import is inert AND the worker is scrubbed)", () => {
    expect(() => assertEnvIsolated(process.env as Record<string, string | undefined>)).not.toThrow();
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBe("http://127.0.0.1:9");
    expect(process.env.NOTIFICATION_WORKER_SECRET).toMatch(/^dead-/);
  });
});
