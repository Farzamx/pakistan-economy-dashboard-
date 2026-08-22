// Phase 8.0 rename-equivalence tests for canonicalObservation.ts ->
// latestReleasedEventValue.ts. Proves the rename (module path,
// getLatestCanonicalObservation -> getLatestReleasedEventValue,
// canonicalObsCacheKey -> releasedEventValueCacheKey) introduced zero
// behavioral change: same parsing, same cache-key format, same null-on-
// failure semantics. No live Supabase access -- createPublicDataClient is
// mocked with a minimal chainable query-builder stub.

import { describe, it, expect, vi, beforeEach } from "vitest";

interface Row {
  data: unknown;
  error: { message: string } | null;
}

function fakeBuilder(row: Row) {
  const builder: Record<string, (...args: unknown[]) => unknown> = {};
  for (const method of ["from", "select", "eq", "not", "order", "limit"]) {
    builder[method] = () => builder;
  }
  builder.maybeSingle = async () => row;
  return builder;
}

const createPublicDataClientMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/publicDataClient", () => ({
  createPublicDataClient: createPublicDataClientMock,
}));

const { getLatestReleasedEventValue, releasedEventValueCacheKey } = await import("./latestReleasedEventValue");

function mockDbResponses(seriesRow: Row, eventRow: Row) {
  let callCount = 0;
  createPublicDataClientMock.mockReturnValue({
    from: () => {
      callCount++;
      return fakeBuilder(callCount === 1 ? seriesRow : eventRow);
    },
  });
}

beforeEach(() => {
  createPublicDataClientMock.mockReset();
});

describe("releasedEventValueCacheKey — rename equivalence (test 3: renamed PBS series constant / cache key behaves identically)", () => {
  it("produces the exact same literal format as the pre-rename canonicalObsCacheKey ('canonical-obs:<slug>')", () => {
    // Deliberately still asserting the OLD literal prefix: the function was
    // renamed, the string format it produces was not (see this file's own
    // header in latestReleasedEventValue.ts for why that's the safer choice
    // for a zero-behavior-change phase).
    expect(releasedEventValueCacheKey("cpi-inflation-release")).toBe("canonical-obs:cpi-inflation-release");
  });
});

describe("getLatestReleasedEventValue — rename equivalence (tests 1/2: module imports correctly, renamed function behaves identically)", () => {
  it("parses a percent-YoY series (CPI) identically to the pre-rename implementation", async () => {
    mockDbResponses(
      { data: { id: "series-1", source_name: "PBS" }, error: null },
      { data: { actual_value: "+11.3% YoY", observation_date: "2026-06-30" }, error: null },
    );
    const result = await getLatestReleasedEventValue("cpi-inflation-release");
    expect(result).toEqual({
      value: 11.3,
      observationDate: "2026-06-30",
      sourceName: "PBS",
      formattedValue: "+11.3% YoY",
    });
  });

  it("parses a signed billions-USD series (trade balance) identically", async () => {
    mockDbResponses(
      { data: { id: "series-2", source_name: "PBS" }, error: null },
      { data: { actual_value: "-$2.84B", observation_date: "2026-06-30" }, error: null },
    );
    const result = await getLatestReleasedEventValue("trade-balance");
    expect(result?.value).toBe(-2.84);
  });

  it("returns null for a series slug with no registered parser (unchanged null-on-unknown-slug semantics)", async () => {
    const result = await getLatestReleasedEventValue("not-a-real-series");
    expect(result).toBeNull();
    expect(createPublicDataClientMock).not.toHaveBeenCalled();
  });

  it("returns null when no series row is found", async () => {
    // Distinct slug from the other tests in this file -- the module-level
    // memoryCache is real and shared across test cases; reusing a slug
    // already resolved successfully above would hit that cache instead of
    // exercising this scenario.
    mockDbResponses({ data: null, error: null }, { data: null, error: null });
    const result = await getLatestReleasedEventValue("core-inflation-release");
    expect(result).toBeNull();
  });

  it("returns null (never throws) when the DB query throws", async () => {
    createPublicDataClientMock.mockImplementation(() => {
      throw new Error("connection refused");
    });
    const result = await getLatestReleasedEventValue("exports-release");
    expect(result).toBeNull();
  });
});
