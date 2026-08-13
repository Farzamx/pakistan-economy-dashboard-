import { describe, it, expect, vi, beforeEach } from "vitest";

const fetchComparisonSeriesMock = vi.hoisted(() => vi.fn());
const mergeSeriesMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/comparisons/comparisonData", () => ({
  fetchComparisonSeries: fetchComparisonSeriesMock,
  mergeSeries: mergeSeriesMock,
}));

const { GET } = await import("./route");

function req(a: string | null, b: string | null): Request {
  const url = new URL("https://app.example.com/api/comparisons/series");
  if (a !== null) url.searchParams.set("a", a);
  if (b !== null) url.searchParams.set("b", b);
  return new Request(url);
}

function series(unit: string, frequency: "monthly" | "quarterly" | "annual") {
  return { points: [{ date: "2026-07-31", value: 1 }], source: "SBP", unit, frequency };
}

beforeEach(() => {
  fetchComparisonSeriesMock.mockReset();
  mergeSeriesMock.mockReset();
  mergeSeriesMock.mockReturnValue([{ key: "2026-07", a: 1, b: 1, aOrigin: "observed", bOrigin: "observed" }]);
});

describe("GET /api/comparisons/series", () => {
  it("400s on an invalid/missing series id — never reaches fetchComparisonSeries", async () => {
    const res = await GET(req("not-a-real-id", "sbp:cpiInflation"));
    expect(res.status).toBe(400);
    expect(fetchComparisonSeriesMock).not.toHaveBeenCalled();
  });

  it("17. returns a structured error with reason for an incompatible (annual vs monthly) pair, status 422", async () => {
    fetchComparisonSeriesMock.mockImplementation(async (id: string) =>
      id === "worldbank:gdpGrowthPak" ? series("%", "annual") : series("%", "monthly"),
    );
    const res = await GET(req("worldbank:gdpGrowthPak", "sbp:cpiInflation"));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toBeTruthy();
    expect(body.reason).toBeTruthy();
    expect(body.compatibility.compatible).toBe(false);
    expect(mergeSeriesMock).not.toHaveBeenCalled(); // 15. incompatible pair never reaches mergeSeries
  });

  it("18. still returns 502 (not 422) when a series is genuinely unavailable — never conflated with an incompatible pair", async () => {
    fetchComparisonSeriesMock.mockResolvedValue(null);
    const res = await GET(req("sbp:cpiInflation", "sbp:policyRate"));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toContain("unavailable");
    expect(mergeSeriesMock).not.toHaveBeenCalled();
  });

  it("returns merged data + compatibility for a compatible pair", async () => {
    fetchComparisonSeriesMock.mockResolvedValue(series("%", "monthly"));
    const res = await GET(req("sbp:cpiInflation", "sbp:policyRate"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.merged).toBeDefined();
    expect(body.compatibility.compatible).toBe(true);
    expect(mergeSeriesMock).toHaveBeenCalledTimes(1);
  });

  it("20. never returns placeholder data for an incompatible pair — merged is simply absent, not a fake series", async () => {
    fetchComparisonSeriesMock.mockImplementation(async (id: string) =>
      id === "worldbank:gdpGrowthPak" ? series("%", "annual") : series("%", "monthly"),
    );
    const res = await GET(req("worldbank:gdpGrowthPak", "sbp:cpiInflation"));
    const body = await res.json();
    expect(body.merged).toBeUndefined();
  });

  it("security: never exposes a secret-shaped value in any response", async () => {
    fetchComparisonSeriesMock.mockImplementation(async (id: string) =>
      id === "worldbank:gdpGrowthPak" ? series("%", "annual") : series("%", "monthly"),
    );
    const incompatible = await GET(req("worldbank:gdpGrowthPak", "sbp:cpiInflation"));
    const unavailable = await (async () => {
      fetchComparisonSeriesMock.mockResolvedValue(null);
      return GET(req("sbp:cpiInflation", "sbp:policyRate"));
    })();
    for (const res of [incompatible, unavailable]) {
      const text = JSON.stringify(await res.json());
      expect(text).not.toMatch(/api_key/i);
      expect(text).not.toMatch(/CRON_SECRET|NOTIFICATION_WORKER_SECRET|SBP_EASYDATA_API_KEY/);
    }
  });
});
