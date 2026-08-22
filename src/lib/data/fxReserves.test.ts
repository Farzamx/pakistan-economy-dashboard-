// Phase 8.10B tests for fxReserves.ts's canonical-DB-backed read path.
// memoryCache.ts is mocked with a resettable in-memory store (the same
// established pattern used for worldBank.test.ts in Phase 8.3, since its
// state is genuinely shared across test cases within one file when using
// fixed cache keys). getCanonicalNetLiquidReservesHistory and
// fetchFxReservesHistoryFresh are both mocked — no network, no Supabase.

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

const getCanonicalNetLiquidReservesHistoryMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/data/netLiquidReservesCanonicalStore", () => ({
  getCanonicalNetLiquidReservesHistory: getCanonicalNetLiquidReservesHistoryMock,
}));

const fetchFxReservesHistoryFreshMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/economicCalendar/automation/syncFxReservesFromSbpExcel", () => ({
  fetchFxReservesHistoryFresh: fetchFxReservesHistoryFreshMock,
}));

import { getNetLiquidReserves, getNetLiquidReservesFresh } from "./fxReserves";

function canonicalRow(overrides: Partial<{ observationPeriod: string; value: number; unit: string; vintage: string; releaseDate: string | null; sourceUpdatedAt: string | null; fetchedAt: string | null; qualityStatus: string | null; sourceSeriesId: string | null; sourceReference: Record<string, unknown> | null }> = {}) {
  return {
    observationPeriod: "2026-07-31",
    value: 17043,
    unit: "Million USD",
    vintage: "2026-08-13T12:00:00.000Z",
    releaseDate: null,
    sourceUpdatedAt: null,
    fetchedAt: "2026-08-13T12:00:00.000Z",
    qualityStatus: "official",
    sourceSeriesId: "Forex_Arch.xlsx:NET RESERVES WITH SBP",
    sourceReference: { endpoint: "https://www.sbp.org.pk/assets/document/Forex_Arch.xlsx" },
    ...overrides,
  };
}

const CANONICAL_HISTORY = [
  canonicalRow({ observationPeriod: "2026-07-17", value: 11000.5 }),
  canonicalRow({ observationPeriod: "2026-07-24", value: 11050.2 }),
  canonicalRow({ observationPeriod: "2026-07-31", value: 17043 }),
];

beforeEach(() => {
  cacheStore.clear();
  getCanonicalNetLiquidReservesHistoryMock.mockReset();
  fetchFxReservesHistoryFreshMock.mockReset();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getNetLiquidReserves — canonical DB primary path", () => {
  it("maps the canonical DB's latest row into the existing Kpi/trend/meta shape", async () => {
    getCanonicalNetLiquidReservesHistoryMock.mockResolvedValueOnce(CANONICAL_HISTORY);
    const result = await getNetLiquidReserves();
    expect(result.kpi.title).toBe("Foreign Reserves");
    expect(result.kpi.value).toBe("17.0"); // 17043M / 1000, unchanged display conversion
    expect(result.kpi.unit).toBe("B USD");
    expect(result.kpi.latestDate).toBe("2026-07-31");
    expect(result.kpi.sourceStatus).toBe("live");
    expect(result.trend).toHaveLength(3);
  });

  it("populates freshness on the DB-backed result (Phase 6 activation)", async () => {
    // A genuinely recent week (2 days before the real system clock, safely
    // inside the 7-day weekly cadence window regardless of when this test
    // runs) -- CANONICAL_HISTORY's own 2026-07-31 fixture is intentionally
    // realistic production data, not "as of today", so it is exercised for
    // staleness in the dedicated test below instead.
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const recent = [...CANONICAL_HISTORY.slice(0, -1), canonicalRow({ observationPeriod: twoDaysAgo, value: 17100 })];
    getCanonicalNetLiquidReservesHistoryMock.mockResolvedValueOnce(recent);
    const result = await getNetLiquidReserves();
    expect(result.kpi.freshness).toBeDefined();
    expect(result.kpi.freshness?.state).toBe("current");
  });

  it("a stale canonical observation is correctly flagged stale, never silently current", async () => {
    getCanonicalNetLiquidReservesHistoryMock.mockResolvedValueOnce([canonicalRow({ observationPeriod: "2025-01-03", value: 9000 })]);
    const result = await getNetLiquidReserves();
    expect(result.kpi.sourceStatus).toBe("live"); // the DB read itself succeeded
    expect(result.kpi.freshness?.state).toBe("stale"); // but the data is stale -- Phase 6's core distinction
  });
});

describe("getNetLiquidReserves — fallback chain", () => {
  it("empty canonical history falls back to the existing live-fetch path, unchanged", async () => {
    getCanonicalNetLiquidReservesHistoryMock.mockResolvedValueOnce([]);
    fetchFxReservesHistoryFreshMock.mockResolvedValueOnce([
      { weekEndingDate: "2026-07-31", netSbpReservesM: 17000, netBankReservesM: 500, totalLiquidReservesM: 17500 },
    ]);
    const result = await getNetLiquidReserves();
    expect(result.kpi.value).toBe("17.0");
    expect(result.kpi.sourceStatus).toBe("live");
  });

  it("both DB and live fetch fail: falls to the static fallback, still receives a freshness verdict", async () => {
    getCanonicalNetLiquidReservesHistoryMock.mockResolvedValueOnce([]);
    fetchFxReservesHistoryFreshMock.mockRejectedValueOnce(new Error("SBP Forex_Arch.xlsx fetch returned 403"));
    const result = await getNetLiquidReserves();
    // Pre-existing characteristic (unrelated to Phase 8.10B, not modified
    // here): withFallbackFreshness()/fallbackNetLiquidReserves never stamped
    // sourceStatus:"fallback" the way SBP/World Bank's own fallbacks do --
    // the static snapshot's `source` field ("SBP Forex_Arch.xlsx (fallback)")
    // is the only textual signal today. Documented as an out-of-scope
    // observation in the Phase 8.10B report, not fixed here.
    expect(result.meta.source).toBe("SBP Forex_Arch.xlsx (fallback)");
    expect(result.kpi.freshness).toBeDefined();
    // Not pinned to one exact state: fallbackNetLiquidReserves's snapshot
    // date is a fixed historical constant, so its age relative to the real
    // system clock only grows — asserting "not current" is the
    // calendar-drift-proof way to confirm it's honestly never claimed fresh.
    expect(result.kpi.freshness?.state).not.toBe("current");
    expect(result.kpi.freshness?.severity).not.toBe("healthy");
  });
});

describe("getNetLiquidReservesFresh", () => {
  it("also reads canonical DB first, same shape as getNetLiquidReserves", async () => {
    getCanonicalNetLiquidReservesHistoryMock.mockResolvedValueOnce(CANONICAL_HISTORY);
    const result = await getNetLiquidReservesFresh();
    expect(result.kpi.sourceStatus).toBe("live");
    expect(result.kpi.value).toBe("17.0");
  });

  it("falls back to fetchFxReservesHistoryFresh(true) — bypassing L1 — when canonical is empty", async () => {
    getCanonicalNetLiquidReservesHistoryMock.mockResolvedValueOnce([]);
    fetchFxReservesHistoryFreshMock.mockResolvedValueOnce([
      { weekEndingDate: "2026-07-31", netSbpReservesM: 17000, netBankReservesM: 500, totalLiquidReservesM: 17500 },
    ]);
    await getNetLiquidReservesFresh();
    expect(fetchFxReservesHistoryFreshMock).toHaveBeenCalledWith(null); // revalidateSeconds=null == cache:"no-store", the existing noCache=true contract
  });
});
