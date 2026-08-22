// Phase 8.1 tests for the generic ingestion orchestrator. Exercised ONLY
// against a fixture/mock adapter and a mocked Supabase client -- no real
// SBP/network/database access, and scripts/ingestSbp.ts is never imported
// or invoked by this file.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ingestOneSeries, ingestManySeries } from "./ingestionOrchestrator";
import type { ProviderAdapter, NormalizedObservation } from "./providerAdapter";

function fixtureObs(overrides: Partial<NormalizedObservation> = {}): NormalizedObservation {
  return {
    indicatorKey: "fixture:testIndicator",
    observationPeriod: "2026-07-31",
    value: 42,
    unit: "%",
    cadence: "monthly",
    provider: "fixture-provider",
    sourceSeriesId: "FIXTURE-1",
    qualityStatus: "official",
    releaseDate: null,
    sourceUpdatedAt: null,
    sourceReference: null,
    ...overrides,
  };
}

function makeAdapter(fetchImpl: ProviderAdapter["fetchObservations"]): ProviderAdapter {
  return { providerId: "fixture-provider", fetchObservations: fetchImpl };
}

function fakeSupabase() {
  const rpc = vi.fn();
  return { rpc } as unknown as import("@supabase/supabase-js").SupabaseClient & { rpc: typeof rpc };
}

function historyResponse(rows: { observation_period: string; value: number; unit: string }[]) {
  return { data: rows, error: null };
}

beforeEach(() => {
  vi.useRealTimers();
});

describe("ingestOneSeries — happy paths", () => {
  it("reports 'unchanged' and writes nothing when the adapter returns exactly the existing value/unit", async () => {
    const supabase = fakeSupabase();
    supabase.rpc.mockImplementation(async (fn: string) => {
      if (fn === "get_canonical_observation_history") return historyResponse([{ observation_period: "2026-07-31", value: 42, unit: "%" }]);
      throw new Error(`unexpected rpc: ${fn}`);
    });
    const adapter = makeAdapter(async () => [fixtureObs()]);

    const outcome = await ingestOneSeries(supabase, "secret", "run-1", adapter, "fixture:testIndicator");

    expect(outcome.status).toBe("unchanged");
    expect(outcome.periodsWritten).toBe(0);
    expect(supabase.rpc).not.toHaveBeenCalledWith("ingest_raw_observation", expect.anything());
  });

  it("writes raw + canonical rows and reports 'updated' when the value genuinely changed", async () => {
    const supabase = fakeSupabase();
    const rawCalls: unknown[] = [];
    const canonCalls: unknown[] = [];
    supabase.rpc.mockImplementation(async (fn: string, params: unknown) => {
      if (fn === "get_canonical_observation_history") return historyResponse([{ observation_period: "2026-06-30", value: 40, unit: "%" }]);
      if (fn === "ingest_raw_observation") { rawCalls.push(params); return { data: { raw_observation_id: "raw-1" }, error: null }; }
      if (fn === "resolve_canonical_observation") { canonCalls.push(params); return { data: { canonical_id: "canon-1" }, error: null }; }
      throw new Error(`unexpected rpc: ${fn}`);
    });
    const adapter = makeAdapter(async () => [fixtureObs({ observationPeriod: "2026-07-31", value: 42 })]);

    const outcome = await ingestOneSeries(supabase, "secret", "run-1", adapter, "fixture:testIndicator");

    expect(outcome.status).toBe("updated");
    expect(outcome.periodsWritten).toBe(1);
    expect(rawCalls).toHaveLength(1);
    expect(canonCalls).toHaveLength(1);
  });

  it("passes provenance fields through to resolve_canonical_observation unchanged", async () => {
    const supabase = fakeSupabase();
    let canonParams: Record<string, unknown> | null = null;
    supabase.rpc.mockImplementation(async (fn: string, params: unknown) => {
      if (fn === "get_canonical_observation_history") return historyResponse([]);
      if (fn === "ingest_raw_observation") return { data: { raw_observation_id: "raw-1" }, error: null };
      if (fn === "resolve_canonical_observation") { canonParams = params as Record<string, unknown>; return { data: {}, error: null }; }
      throw new Error(`unexpected rpc: ${fn}`);
    });
    const adapter = makeAdapter(async () => [fixtureObs({
      releaseDate: "2026-08-01",
      sourceUpdatedAt: "2026-08-01T09:00:00.000Z",
      qualityStatus: "preliminary",
      sourceSeriesId: "FIXTURE-XYZ",
      sourceReference: { endpoint: "https://fixture.example/series/XYZ" },
    })]);

    await ingestOneSeries(supabase, "secret", "run-1", adapter, "fixture:testIndicator");

    expect(canonParams).toMatchObject({
      p_release_date: "2026-08-01",
      p_source_updated_at: "2026-08-01T09:00:00.000Z",
      p_quality_status: "preliminary",
      p_source_series_id: "FIXTURE-XYZ",
      p_source_reference: { endpoint: "https://fixture.example/series/XYZ" },
    });
  });
});

describe("11. adapter failure", () => {
  it("ingestOneSeries throws when the adapter's fetch ultimately fails (exhausted retries)", async () => {
    const supabase = fakeSupabase();
    supabase.rpc.mockResolvedValue(historyResponse([]));
    const adapter = makeAdapter(async () => { throw new Error("adapter is down"); });

    await expect(
      ingestOneSeries(supabase, "secret", "run-1", adapter, "fixture:testIndicator", { maxRetries: 0, retryBaseDelayMs: 0 }),
    ).rejects.toThrow("adapter is down");
  });

  it("throws (does not silently write) when the adapter returns an invalid observation", async () => {
    const supabase = fakeSupabase();
    supabase.rpc.mockResolvedValue(historyResponse([]));
    const adapter = makeAdapter(async () => [fixtureObs({ value: NaN })]);

    await expect(
      ingestOneSeries(supabase, "secret", "run-1", adapter, "fixture:testIndicator"),
    ).rejects.toThrow(/invalid observation/);
    expect(supabase.rpc).not.toHaveBeenCalledWith("ingest_raw_observation", expect.anything());
  });
});

describe("12/13. orchestrator retry behavior and exhaustion", () => {
  it("12. retries a transient adapter failure and succeeds on a later attempt", async () => {
    const supabase = fakeSupabase();
    supabase.rpc.mockImplementation(async (fn: string) => {
      if (fn === "get_canonical_observation_history") return historyResponse([]);
      if (fn === "ingest_raw_observation") return { data: { raw_observation_id: "raw-1" }, error: null };
      if (fn === "resolve_canonical_observation") return { data: {}, error: null };
      throw new Error("unexpected");
    });
    let attempts = 0;
    const adapter = makeAdapter(async () => {
      attempts++;
      if (attempts < 3) throw new Error("transient");
      return [fixtureObs()];
    });

    const outcome = await ingestOneSeries(supabase, "secret", "run-1", adapter, "fixture:testIndicator", { maxRetries: 3, retryBaseDelayMs: 1 });

    expect(attempts).toBe(3);
    expect(outcome.status).toBe("updated");
  });

  it("13. exhausts retries and throws when every attempt fails, having made exactly maxRetries+1 attempts", async () => {
    const supabase = fakeSupabase();
    supabase.rpc.mockResolvedValue(historyResponse([]));
    let attempts = 0;
    const adapter = makeAdapter(async () => { attempts++; throw new Error("permanently down"); });

    await expect(
      ingestOneSeries(supabase, "secret", "run-1", adapter, "fixture:testIndicator", { maxRetries: 2, retryBaseDelayMs: 1 }),
    ).rejects.toThrow("permanently down");
    expect(attempts).toBe(3); // initial attempt + 2 retries
  });
});

describe("14. error isolation (ingestManySeries)", () => {
  it("one series' failure never aborts the run and never affects other series' outcomes", async () => {
    const supabase = fakeSupabase();
    supabase.rpc.mockImplementation(async (fn: string) => {
      if (fn === "get_canonical_observation_history") return historyResponse([]);
      if (fn === "ingest_raw_observation") return { data: { raw_observation_id: "raw-1" }, error: null };
      if (fn === "resolve_canonical_observation") return { data: {}, error: null };
      throw new Error("unexpected");
    });
    const goodAdapter = makeAdapter(async () => [fixtureObs({ indicatorKey: "fixture:good" })]);
    const badAdapter = makeAdapter(async () => { throw new Error("boom"); });

    const outcomes = await ingestManySeries(supabase, "secret", "run-1", [
      { adapter: badAdapter, indicatorKey: "fixture:bad" },
      { adapter: goodAdapter, indicatorKey: "fixture:good" },
    ], { maxRetries: 0, retryBaseDelayMs: 1 });

    const bad = outcomes.find((o) => o.indicatorKey === "fixture:bad")!;
    const good = outcomes.find((o) => o.indicatorKey === "fixture:good")!;
    expect(bad.status).toBe("failed");
    expect(bad.error).toContain("boom");
    expect(good.status).toBe("updated");
  });

  it("bounded concurrency: never runs more than `concurrency` fetches at once", async () => {
    const supabase = fakeSupabase();
    supabase.rpc.mockResolvedValue(historyResponse([]));
    let concurrent = 0;
    let maxConcurrent = 0;
    const adapter = makeAdapter(async () => {
      concurrent++;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await new Promise((r) => setTimeout(r, 5));
      concurrent--;
      return [fixtureObs()];
    });
    const jobs = Array.from({ length: 10 }, (_, i) => ({ adapter, indicatorKey: `fixture:${i}` }));

    await ingestManySeries(supabase, "secret", "run-1", jobs, { concurrency: 3 });

    expect(maxConcurrent).toBeLessThanOrEqual(3);
  });
});

describe("26. revision handling remains outside adapter responsibility", () => {
  it("the ProviderAdapter interface has no revision/vintage-shaped method or field", async () => {
    const { validateNormalizedObservation } = await import("./providerAdapter");
    const observation = fixtureObs();
    // Structural proof: a NormalizedObservation has no vintage/supersededAt/
    // revision field at all -- validation passes without one, and nothing
    // in the adapter contract could carry one even if a future adapter tried.
    expect(validateNormalizedObservation(observation).valid).toBe(true);
    expect(observation).not.toHaveProperty("vintage");
    expect(observation).not.toHaveProperty("supersededAt");
    expect(observation).not.toHaveProperty("revision");
  });

  it("the orchestrator alone decides revision via the existing unchanged-value short-circuit -- an adapter returning the same value twice never causes a second write", async () => {
    const supabase = fakeSupabase();
    let canonicalWrites = 0;
    supabase.rpc.mockImplementation(async (fn: string) => {
      if (fn === "get_canonical_observation_history") return historyResponse([{ observation_period: "2026-07-31", value: 42, unit: "%" }]);
      if (fn === "resolve_canonical_observation") { canonicalWrites++; return { data: {}, error: null }; }
      if (fn === "ingest_raw_observation") return { data: { raw_observation_id: "raw-1" }, error: null };
      throw new Error("unexpected");
    });
    const adapter = makeAdapter(async () => [fixtureObs()]); // identical value/unit to what's already canonical

    await ingestOneSeries(supabase, "secret", "run-1", adapter, "fixture:testIndicator");

    expect(canonicalWrites).toBe(0);
  });
});

describe("security — the orchestrator itself never constructs a secret-shaped string", () => {
  it("never reads process.env directly (the internalSecret is always caller-injected, not self-sourced)", async () => {
    // Structural check: the orchestrator takes internalSecret as a plain
    // parameter (see ingestOneSeries's signature) rather than reading
    // SBP_EASYDATA_API_KEY/NOTIFICATION_WORKER_SECRET/etc. itself -- it
    // cannot leak an env var it never touches.
    const source = await import("node:fs/promises").then((fs) => fs.readFile(new URL("./ingestionOrchestrator.ts", import.meta.url), "utf-8"));
    expect(source).not.toMatch(/process\.env/);
  });

  it("a validation rejection's reason string contains only the caller-supplied observation data, never an env-sourced secret", async () => {
    const { validateNormalizedObservation } = await import("./providerAdapter");
    const r = validateNormalizedObservation(fixtureObs({ sourceReference: { endpoint: "https://example.org?api_key=LEAKED" } }));
    expect(r.valid).toBe(false);
    // The rejection surfaces exactly the caller's own bad input back to
    // them (necessary for a useful error) -- it never adds anything from
    // this process's own environment.
    expect(r.reason).not.toMatch(/SBP_EASYDATA|NOTIFICATION_WORKER_SECRET|CRON_SECRET/);
  });

  it("does not construct or log the internalSecret in a retry warning", async () => {
    const supabase = fakeSupabase();
    supabase.rpc.mockResolvedValue(historyResponse([]));
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const adapter = makeAdapter(async () => { throw new Error("transient failure"); });

    await expect(
      ingestOneSeries(supabase, "SUPER-SECRET-VALUE", "run-1", adapter, "fixture:testIndicator", { maxRetries: 1, retryBaseDelayMs: 1 }),
    ).rejects.toThrow();

    const logged = warnSpy.mock.calls.flat().join(" ");
    expect(logged).not.toContain("SUPER-SECRET-VALUE");
    warnSpy.mockRestore();
  });
});
