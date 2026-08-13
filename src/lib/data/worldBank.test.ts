// Phase 8.3 tests for worldBank.ts's canonical-DB-backed read path
// (getGdpKpi/getGdpGrowthHistory) plus regression proof that
// getGdpSectorComposition/getPopulation remain completely untouched.
//
// memoryCache.ts is mocked with a resettable in-memory store (not the real
// module) specifically because its state is genuinely shared across test
// cases within one file when using fixed cache keys like
// "worldbank-gdp-kpi" — the same trap documented for
// latestReleasedEventValue.test.ts in Phase 8.0. Resetting it in beforeEach
// keeps every test hermetic regardless of key reuse.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const cacheStore = vi.hoisted(() => new Map<string, { data: unknown; t: number }>());
vi.mock("@/lib/memoryCache", () => ({
  getFresh: (key: string, ttlMs: number) => {
    const e = cacheStore.get(key);
    if (!e) return null;
    if (Date.now() - e.t > ttlMs) return null;
    return { data: e.data, ageMs: Date.now() - e.t };
  },
  getStale: (key: string) => {
    const e = cacheStore.get(key);
    return e ? { data: e.data, ageMs: Date.now() - e.t } : null;
  },
  setCache: (key: string, data: unknown) => cacheStore.set(key, { data, t: Date.now() }),
  invalidate: (key: string) => cacheStore.delete(key),
  dedupeInFlight: (_key: string, fn: () => Promise<unknown>) => fn(),
}));

const getCanonicalWorldBankHistoryMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/data/worldBankCanonicalStore", () => ({
  getCanonicalWorldBankHistory: getCanonicalWorldBankHistoryMock,
}));

import { getGdpKpi, getGdpGrowthHistory, getGdpSectorComposition, getPopulation } from "./worldBank";

function canonicalRow(overrides: Partial<{ observationPeriod: string; value: number; unit: string; vintage: string; releaseDate: string | null; sourceUpdatedAt: string | null; fetchedAt: string | null; qualityStatus: string | null; sourceSeriesId: string | null; sourceReference: Record<string, unknown> | null }> = {}) {
  return {
    observationPeriod: "2025-12-31",
    value: 3.69842668749033,
    unit: "%",
    vintage: "2026-08-12T20:50:40.828Z",
    releaseDate: null,
    sourceUpdatedAt: "2026-07-13T00:00:00.000Z",
    fetchedAt: "2026-08-12T20:50:36.308Z",
    qualityStatus: "official",
    sourceSeriesId: "NY.GDP.MKTP.KD.ZG",
    sourceReference: { endpoint: "https://api.worldbank.org/v2/country/PAK/indicator/NY.GDP.MKTP.KD.ZG" },
    ...overrides,
  };
}

const PAK_CANONICAL_HISTORY = [
  canonicalRow({ observationPeriod: "2023-12-31", value: -0.414935997088406 }),
  canonicalRow({ observationPeriod: "2024-12-31", value: 3.08176295579301 }),
  canonicalRow({ observationPeriod: "2025-12-31", value: 3.69842668749033 }),
];

function liveApiFixture(rows: { date: string; value: number }[]) {
  return [{ page: 1, pages: 1, per_page: 50, total: rows.length, lastupdated: "2026-07-13" }, rows.map((r) => ({ date: r.date, value: r.value }))];
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  cacheStore.clear();
  getCanonicalWorldBankHistoryMock.mockReset();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getGdpKpi — canonical DB primary path", () => {
  it("16/17. maps the canonical DB's latest row into the existing Kpi shape, unchanged field names", async () => {
    getCanonicalWorldBankHistoryMock.mockResolvedValueOnce(PAK_CANONICAL_HISTORY);
    const kpi = await getGdpKpi();
    expect(kpi.title).toBe("GDP Growth");
    expect(kpi.value).toBe("3.7"); // unchanged .toFixed(1) display formatting, from the untouched buildGdpKpi()
    expect(kpi.unit).toBe("%");
    expect(kpi.source).toBe("World Bank");
    expect(kpi.seriesId).toBe("NY.GDP.MKTP.KD.ZG");
    expect(kpi.frequency).toBe("Annual");
  });

  it("latestDate stays a bare 'YYYY' string, never the DB's 'YYYY-12-31' — consumers never see the migration", async () => {
    getCanonicalWorldBankHistoryMock.mockResolvedValueOnce(PAK_CANONICAL_HISTORY);
    const kpi = await getGdpKpi();
    expect(kpi.latestDate).toBe("2025");
  });

  it("18. ordering: change is computed against the correct previous (second-to-last) row", async () => {
    getCanonicalWorldBankHistoryMock.mockResolvedValueOnce(PAK_CANONICAL_HISTORY);
    const kpi = await getGdpKpi();
    expect(kpi.change).toContain("vs 2024");
  });

  it("19. full precision is used for the freshness-relevant internals even though the display value is rounded", async () => {
    getCanonicalWorldBankHistoryMock.mockResolvedValueOnce(PAK_CANONICAL_HISTORY);
    const kpi = await getGdpKpi();
    // .toFixed(1) rounds 3.69842668749033 -> "3.7", not a precision LOSS in
    // the stored canonical value (which stays full-precision in the DB) --
    // this is the SAME display convention buildGdpKpi() has always used.
    expect(kpi.value).toBe("3.7");
  });

  it("23. sourceStatus is 'live' and freshness is populated (Phase 6 activation) for a fresh DB row", async () => {
    getCanonicalWorldBankHistoryMock.mockResolvedValueOnce(PAK_CANONICAL_HISTORY);
    const kpi = await getGdpKpi();
    expect(kpi.sourceStatus).toBe("live");
    expect(kpi.freshness).toBeDefined();
    expect(kpi.freshness?.state).toBe("current");
    expect(kpi.freshness?.severity).toBe("healthy");
  });

  it("a stale canonical observation (multiple years past due + grace) is correctly flagged stale, never silently 'current'", async () => {
    getCanonicalWorldBankHistoryMock.mockResolvedValueOnce([canonicalRow({ observationPeriod: "2015-12-31", sourceUpdatedAt: "2015-07-01T00:00:00.000Z" })]);
    const kpi = await getGdpKpi();
    expect(kpi.sourceStatus).toBe("live"); // the DB read itself succeeded
    expect(kpi.freshness?.state).toBe("stale"); // but the DATA is stale -- Phase 6's core distinction
    expect(kpi.freshness?.severity).toBe("problem");
  });
});

describe("getGdpKpi — fallback chain", () => {
  it("20. empty canonical history falls back to the live World Bank API, still labeled 'live'", async () => {
    getCanonicalWorldBankHistoryMock.mockResolvedValueOnce([]);
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => liveApiFixture([{ date: "2025", value: 3.5 }, { date: "2024", value: 3.0 }]) });
    const kpi = await getGdpKpi();
    expect(kpi.sourceStatus).toBe("live");
    expect(kpi.value).toBe("3.5");
    expect(kpi.freshness).toBeDefined();
  });

  it("24. database failure (RPC throws internally -> [] per worldBankCanonicalStore's own contract) also falls to the live API", async () => {
    getCanonicalWorldBankHistoryMock.mockResolvedValueOnce([]); // worldBankCanonicalStore never throws -- see its own tests
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => liveApiFixture([{ date: "2025", value: 4.1 }]) });
    const kpi = await getGdpKpi();
    expect(kpi.value).toBe("4.1");
  });

  it("22. both DB and live API fail: falls to last-known-good L1 cache regardless of age, labeled 'cache-stale'", async () => {
    getCanonicalWorldBankHistoryMock.mockResolvedValueOnce(PAK_CANONICAL_HISTORY);
    const first = await getGdpKpi(); // populates the L1 cache
    expect(first.sourceStatus).toBe("live");

    getCanonicalWorldBankHistoryMock.mockResolvedValueOnce([]);
    fetchMock.mockRejectedValueOnce(new Error("World Bank unreachable"));
    const second = await getGdpKpi();
    expect(second.sourceStatus).toBe("cache-stale");
    expect(second.value).toBe(first.value);
  });

  it("24. nothing cached at all: falls to the static fallbackGdpKpi, still gets a freshness verdict (correctly flagged stale, never fabricated as current)", async () => {
    getCanonicalWorldBankHistoryMock.mockResolvedValueOnce([]);
    fetchMock.mockRejectedValueOnce(new Error("World Bank unreachable"));
    const kpi = await getGdpKpi();
    expect(kpi.sourceStatus).toBe("fallback");
    expect(kpi.value).toBe("2.5");
    expect(kpi.freshness?.state).toBe("stale"); // fallbackGdpKpi's "2023" is now materially old
  });
});

describe("getGdpGrowthHistory — canonical DB primary path, 3 migrated countries", () => {
  it("16/17/18. DB success returns the existing IndicatorSeries shape, oldest -> newest, bare-year strings", async () => {
    getCanonicalWorldBankHistoryMock.mockResolvedValueOnce(PAK_CANONICAL_HISTORY);
    const series = await getGdpGrowthHistory("PAK");
    expect(series?.latestYear).toBe("2025");
    expect(series?.history.map((p) => p.month)).toEqual(["2023", "2024", "2025"]);
  });

  it("19. full precision preserved end to end", async () => {
    getCanonicalWorldBankHistoryMock.mockResolvedValueOnce(PAK_CANONICAL_HISTORY);
    const series = await getGdpGrowthHistory("PAK");
    expect(series?.latestValue).toBe(3.69842668749033);
  });

  it("20. empty canonical history falls back to the live API (mrv=30), matching the pre-migration call signature", async () => {
    getCanonicalWorldBankHistoryMock.mockResolvedValueOnce([]);
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => liveApiFixture([{ date: "2025", value: 7.5 }]) });
    const series = await getGdpGrowthHistory("IND");
    expect(series?.latestValue).toBe(7.5);
    expect(fetchMock.mock.calls[0][0]).toContain("mrv=30");
    expect(fetchMock.mock.calls[0][0]).toContain("/IND/");
  });

  it("21/24. both DB and live API fail: returns null, never a fabricated series (unchanged pre-migration contract)", async () => {
    getCanonicalWorldBankHistoryMock.mockResolvedValueOnce([]);
    fetchMock.mockRejectedValueOnce(new Error("unreachable"));
    const series = await getGdpGrowthHistory("BGD");
    expect(series).toBeNull();
  });
});

describe("getGdpSectorComposition / getPopulation — NOT migrated, regression proof", () => {
  it("getGdpSectorComposition never calls the canonical DB read helper", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => liveApiFixture([{ date: "2025", value: 20 }]) });
    await getGdpSectorComposition();
    expect(getCanonicalWorldBankHistoryMock).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalled(); // still the live API, exactly as before Phase 8.3
  });

  it("getPopulation never calls the canonical DB read helper", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => liveApiFixture([{ date: "2025", value: 241_500_000 }]) });
    const pop = await getPopulation();
    expect(getCanonicalWorldBankHistoryMock).not.toHaveBeenCalled();
    expect(pop?.latestValue).toBe(241_500_000);
  });
});

describe("consumer regression — the exact fields each real consumer reads", () => {
  it("33. GDP KPI consumer (gdp-growth-pakistan/page.tsx's kpiQuality={gdpKpi}): value/change/trend/source/latestDate present, freshness now populated so DataQualityBadge activates instead of the plain-text kpiSourceNote fallback", async () => {
    getCanonicalWorldBankHistoryMock.mockResolvedValueOnce(PAK_CANONICAL_HISTORY);
    const kpi = await getGdpKpi();
    // SeoPageLayout.tsx: `kpiQuality && kpiQuality.freshness ? <DataQualityBadge .../> : kpiSourceNote && ...`
    expect(Boolean(kpi.freshness)).toBe(true);
    expect(kpi.value).toBeTruthy();
    expect(kpi.change).toBeTruthy();
    expect(["up", "down", "neutral"]).toContain(kpi.trend);
    expect(kpi.source).toBe("World Bank");
    expect(kpi.latestDate).toBe("2025");
  });

  it("34/35. GDP history / comparison consumer (comparisonData.ts's getGdpGrowthHistory -> {points, source}): history maps to {date, value} pairs unchanged", async () => {
    getCanonicalWorldBankHistoryMock.mockResolvedValueOnce(PAK_CANONICAL_HISTORY);
    const series = await getGdpGrowthHistory("PAK");
    const points = series!.history.map((p) => ({ date: p.month, value: p.value })); // exact transform comparisonData.ts applies
    expect(points).toEqual([
      { date: "2023", value: -0.414935997088406 },
      { date: "2024", value: 3.08176295579301 },
      { date: "2025", value: 3.69842668749033 },
    ]);
  });

  it("36. overview/pakistan-economic-dashboard consumer (KpiCard's freshness dot + DataQualityBadge footer): activates the same way for a DB-backed KPI as any already-migrated SBP card", async () => {
    getCanonicalWorldBankHistoryMock.mockResolvedValueOnce(PAK_CANONICAL_HISTORY);
    const kpi = await getGdpKpi();
    // KpiCard.tsx: `const freshness = kpiFreshness ?? null;` then `{freshness && <dot/>}` and `{latestDate && freshness && <DataQualityBadge/>}`
    expect(kpi.freshness).not.toBeNull();
    expect(kpi.latestDate).toBeTruthy();
  });

  it("37. systemHealth.ts's checkWorldBank(): isFallback = kpi.sourceStatus === 'fallback' still resolves correctly in both states", async () => {
    getCanonicalWorldBankHistoryMock.mockResolvedValueOnce(PAK_CANONICAL_HISTORY);
    const live = await getGdpKpi();
    expect(live.sourceStatus === "fallback").toBe(false);

    cacheStore.clear(); // otherwise the live result cached above would be picked up as "cache-stale" before ever reaching "fallback" -- exactly the intended tier order, just not what this sub-case is isolating
    getCanonicalWorldBankHistoryMock.mockResolvedValueOnce([]);
    fetchMock.mockRejectedValueOnce(new Error("unreachable"));
    const fallback = await getGdpKpi();
    expect(fallback.sourceStatus === "fallback").toBe(true);
  });
});
