// Phase 8.2 tests for the World Bank adapter. All fixtures below are
// captured verbatim from a live query against
// https://api.worldbank.org/v2/country/{PAK,IND,BGD}/indicator/NY.GDP.MKTP.KD.ZG
// on 2026-08-13 (lastupdated "2026-07-13") -- see the Phase 8.2 report's
// "real-data verification" section. Tests mock global fetch with these
// exact captured shapes so CI never depends on live World Bank
// availability, while still exercising the adapter against real,
// previously-observed response data rather than invented shapes.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchWorldBankSeries, worldBankAdapter, WORLD_BANK_SERIES } from "./worldBankAdapter";
import { validateNormalizedObservation } from "./providerAdapter";

const PAK_FIXTURE = [
  { page: 1, pages: 1, per_page: 50, total: 8, sourceid: "2", lastupdated: "2026-07-13" },
  [
    { indicator: { id: "NY.GDP.MKTP.KD.ZG", value: "GDP growth (annual %)" }, country: { id: "PK", value: "Pakistan" }, countryiso3code: "PAK", date: "2025", value: 3.69842668749033, unit: "", obs_status: "", decimal: 1 },
    { indicator: { id: "NY.GDP.MKTP.KD.ZG", value: "GDP growth (annual %)" }, country: { id: "PK", value: "Pakistan" }, countryiso3code: "PAK", date: "2024", value: 3.08176295579301, unit: "", obs_status: "", decimal: 1 },
    { indicator: { id: "NY.GDP.MKTP.KD.ZG", value: "GDP growth (annual %)" }, country: { id: "PK", value: "Pakistan" }, countryiso3code: "PAK", date: "2023", value: -0.414935997088406, unit: "", obs_status: "", decimal: 1 },
    { indicator: { id: "NY.GDP.MKTP.KD.ZG", value: "GDP growth (annual %)" }, country: { id: "PK", value: "Pakistan" }, countryiso3code: "PAK", date: "2022", value: 4.7781068690358, unit: "", obs_status: "", decimal: 1 },
    { indicator: { id: "NY.GDP.MKTP.KD.ZG", value: "GDP growth (annual %)" }, country: { id: "PK", value: "Pakistan" }, countryiso3code: "PAK", date: "2021", value: 6.51388575852702, unit: "", obs_status: "", decimal: 1 },
    { indicator: { id: "NY.GDP.MKTP.KD.ZG", value: "GDP growth (annual %)" }, country: { id: "PK", value: "Pakistan" }, countryiso3code: "PAK", date: "2020", value: -1.27408744338709, unit: "", obs_status: "", decimal: 1 },
    { indicator: { id: "NY.GDP.MKTP.KD.ZG", value: "GDP growth (annual %)" }, country: { id: "PK", value: "Pakistan" }, countryiso3code: "PAK", date: "2019", value: 2.49763692943365, unit: "", obs_status: "", decimal: 1 },
    { indicator: { id: "NY.GDP.MKTP.KD.ZG", value: "GDP growth (annual %)" }, country: { id: "PK", value: "Pakistan" }, countryiso3code: "PAK", date: "2018", value: 6.15170261099519, unit: "", obs_status: "", decimal: 1 },
  ],
] as const;

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as Response;
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const PAK_CONFIG = WORLD_BANK_SERIES["worldbank:gdpGrowthPak"];

describe("1. successful response parsing", () => {
  it("parses a real captured World Bank response into NormalizedObservation[]", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(PAK_FIXTURE));
    const result = await fetchWorldBankSeries("worldbank:gdpGrowthPak", PAK_CONFIG);
    expect(result).toHaveLength(8);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    for (const obs of result) {
      expect(validateNormalizedObservation(obs).valid).toBe(true);
    }
  });

  it("worldBankAdapter.fetchObservations dispatches through the same path", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(PAK_FIXTURE));
    const result = await worldBankAdapter.fetchObservations({ indicatorKey: "worldbank:gdpGrowthPak" });
    expect(result).toHaveLength(8);
    expect(worldBankAdapter.providerId).toBe("world-bank");
  });

  it("rejects an indicatorKey outside the Phase 8.2 pilot scope", async () => {
    await expect(worldBankAdapter.fetchObservations({ indicatorKey: "worldbank:population" })).rejects.toThrow(/no series configuration/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("2. pagination handling", () => {
  it("follows multiple pages and concatenates all observations", async () => {
    const page1 = [{ page: 1, pages: 2, per_page: 1, total: 2, lastupdated: "2026-07-13" }, [PAK_FIXTURE[1][0]]];
    const page2 = [{ page: 2, pages: 2, per_page: 1, total: 2, lastupdated: "2026-07-13" }, [PAK_FIXTURE[1][1]]];
    fetchMock.mockResolvedValueOnce(jsonResponse(page1)).mockResolvedValueOnce(jsonResponse(page2));
    const result = await fetchWorldBankSeries("worldbank:gdpGrowthPak", PAK_CONFIG);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(2);
    expect(result.map((o) => o.observationPeriod)).toEqual(["2024-12-31", "2025-12-31"]);
  });

  it("stops after a single page when pages === 1 (the real, observed shape)", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(PAK_FIXTURE));
    await fetchWorldBankSeries("worldbank:gdpGrowthPak", PAK_CONFIG);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("aborts rather than looping unboundedly against a pathological pages value", async () => {
    fetchMock.mockImplementation(async () => jsonResponse([{ page: 1, pages: 999, per_page: 1, total: 999 }, [PAK_FIXTURE[1][0]]]));
    await expect(fetchWorldBankSeries("worldbank:gdpGrowthPak", PAK_CONFIG)).rejects.toThrow(/paging exceeded/);
  });
});

describe("3. missing value handling", () => {
  it("silently omits a null-value year (not yet published) -- matches worldBank.ts's existing behavior", async () => {
    const withNull = [PAK_FIXTURE[0], [{ ...PAK_FIXTURE[1][0], date: "2026", value: null }, ...PAK_FIXTURE[1]]];
    fetchMock.mockResolvedValueOnce(jsonResponse(withNull));
    const result = await fetchWorldBankSeries("worldbank:gdpGrowthPak", PAK_CONFIG);
    expect(result.find((o) => o.observationPeriod === "2026-12-31")).toBeUndefined();
    expect(result).toHaveLength(8);
  });
});

describe("4. invalid numeric value", () => {
  it("throws on a non-null, non-numeric value rather than silently coercing or dropping it", async () => {
    const malformed = [PAK_FIXTURE[0], [{ ...PAK_FIXTURE[1][0], value: "not-a-number" as unknown as number }]];
    fetchMock.mockResolvedValueOnce(jsonResponse(malformed));
    await expect(fetchWorldBankSeries("worldbank:gdpGrowthPak", PAK_CONFIG)).rejects.toThrow(/non-numeric value/);
  });

  it("throws on NaN/Infinity", async () => {
    const malformed = [PAK_FIXTURE[0], [{ ...PAK_FIXTURE[1][0], value: Infinity }]];
    fetchMock.mockResolvedValueOnce(jsonResponse(malformed));
    await expect(fetchWorldBankSeries("worldbank:gdpGrowthPak", PAK_CONFIG)).rejects.toThrow(/non-numeric value/);
  });
});

describe("5. duplicate period handling", () => {
  it("de-duplicates a repeated year, deterministically keeping the first (newest-first-order) occurrence", async () => {
    const dup = [PAK_FIXTURE[0], [PAK_FIXTURE[1][0], { ...PAK_FIXTURE[1][0], value: 999 }]]; // same date "2025", conflicting value
    fetchMock.mockResolvedValueOnce(jsonResponse(dup));
    const result = await fetchWorldBankSeries("worldbank:gdpGrowthPak", PAK_CONFIG);
    const y2025 = result.filter((o) => o.observationPeriod === "2025-12-31");
    expect(y2025).toHaveLength(1);
    expect(y2025[0].value).toBe(3.69842668749033); // the first-encountered (real) value, not the injected duplicate
  });
});

describe("6. date normalization", () => {
  it("normalizes a bare year to that year's Dec 31 (the documented Phase 8.2 annual-cadence convention)", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(PAK_FIXTURE));
    const result = await fetchWorldBankSeries("worldbank:gdpGrowthPak", PAK_CONFIG);
    expect(result.find((o) => o.value === 3.69842668749033)?.observationPeriod).toBe("2025-12-31");
  });

  it("throws on an unrecognized date shape instead of silently passing it through", async () => {
    const malformed = [PAK_FIXTURE[0], [{ ...PAK_FIXTURE[1][0], date: "2025-Q1" }]];
    fetchMock.mockResolvedValueOnce(jsonResponse(malformed));
    await expect(fetchWorldBankSeries("worldbank:gdpGrowthPak", PAK_CONFIG)).rejects.toThrow(/unrecognized date/);
  });
});

describe("7. ordering", () => {
  it("returns observations ascending (oldest -> newest) despite the API's newest-first order", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(PAK_FIXTURE));
    const result = await fetchWorldBankSeries("worldbank:gdpGrowthPak", PAK_CONFIG);
    const periods = result.map((o) => o.observationPeriod);
    expect(periods).toEqual([...periods].sort());
    expect(periods[0]).toBe("2018-12-31");
    expect(periods[periods.length - 1]).toBe("2025-12-31");
  });
});

describe("8. unit normalization", () => {
  it("uses the configured unit, never the API's own (empty) per-observation unit field", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(PAK_FIXTURE));
    const result = await fetchWorldBankSeries("worldbank:gdpGrowthPak", PAK_CONFIG);
    expect(result.every((o) => o.unit === "%")).toBe(true);
  });
});

describe("9. cadence declaration", () => {
  it("declares annual cadence for every observation", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(PAK_FIXTURE));
    const result = await fetchWorldBankSeries("worldbank:gdpGrowthPak", PAK_CONFIG);
    expect(result.every((o) => o.cadence === "annual")).toBe(true);
  });
});

describe("10. sourceSeriesId", () => {
  it("preserves the World Bank indicator code as sourceSeriesId", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(PAK_FIXTURE));
    const result = await fetchWorldBankSeries("worldbank:gdpGrowthPak", PAK_CONFIG);
    expect(result.every((o) => o.sourceSeriesId === "NY.GDP.MKTP.KD.ZG")).toBe(true);
  });
});

describe("11. provenance", () => {
  it("derives sourceUpdatedAt from the API's lastupdated field, re-encoded as a full ISO timestamp", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(PAK_FIXTURE));
    const result = await fetchWorldBankSeries("worldbank:gdpGrowthPak", PAK_CONFIG);
    expect(result.every((o) => o.sourceUpdatedAt === "2026-07-13T00:00:00.000Z")).toBe(true);
  });

  it("sets releaseDate to null (never fabricated -- the API exposes no per-observation release date)", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(PAK_FIXTURE));
    const result = await fetchWorldBankSeries("worldbank:gdpGrowthPak", PAK_CONFIG);
    expect(result.every((o) => o.releaseDate === null)).toBe(true);
  });

  it("attaches a credential-free sourceReference with endpoint, countryCode, and indicatorCode", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(PAK_FIXTURE));
    const result = await fetchWorldBankSeries("worldbank:gdpGrowthPak", PAK_CONFIG);
    const ref = result[0].sourceReference as Record<string, unknown>;
    expect(ref.countryCode).toBe("PAK");
    expect(ref.indicatorCode).toBe("NY.GDP.MKTP.KD.ZG");
    expect(String(ref.endpoint)).not.toMatch(/key|token/i);
  });

  it("returns null sourceUpdatedAt if the API omits lastupdated entirely, rather than fabricating a timestamp", async () => {
    const noLastUpdated = [{ page: 1, pages: 1, per_page: 50, total: 1 }, [PAK_FIXTURE[1][0]]];
    fetchMock.mockResolvedValueOnce(jsonResponse(noLastUpdated));
    const result = await fetchWorldBankSeries("worldbank:gdpGrowthPak", PAK_CONFIG);
    expect(result.every((o) => o.sourceUpdatedAt === null)).toBe(true);
  });
});

describe("12. methodology", () => {
  it("is always null -- the API declares no methodology distinct from the indicator definition", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(PAK_FIXTURE));
    const result = await fetchWorldBankSeries("worldbank:gdpGrowthPak", PAK_CONFIG);
    expect(result.every((o) => o.methodology === null)).toBe(true);
  });
});

describe("13. full precision preservation", () => {
  it("never truncates or rounds the API's full-precision float (no toFixed anywhere in normalization)", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(PAK_FIXTURE));
    const result = await fetchWorldBankSeries("worldbank:gdpGrowthPak", PAK_CONFIG);
    const y2023 = result.find((o) => o.observationPeriod === "2023-12-31");
    expect(y2023?.value).toBe(-0.414935997088406); // full precision, not -0.4
  });
});

describe("14. malformed response", () => {
  it("throws on a response that isn't a 2-element array", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "message" }));
    await expect(fetchWorldBankSeries("worldbank:gdpGrowthPak", PAK_CONFIG)).rejects.toThrow(/malformed response shape/);
  });

  it("throws on a response missing the paging-info element", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([null, []]));
    await expect(fetchWorldBankSeries("worldbank:gdpGrowthPak", PAK_CONFIG)).rejects.toThrow(/malformed response shape/);
  });

  it("treats a null observations array (World Bank's own shape for a fully-invalid indicator/country pair) as zero observations, not a crash", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([{ page: 1, pages: 1, per_page: 50, total: 0 }, null]));
    const result = await fetchWorldBankSeries("worldbank:gdpGrowthPak", PAK_CONFIG);
    expect(result).toEqual([]);
  });
});

describe("15. HTTP failure", () => {
  it("throws with the HTTP status on a non-2xx response", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, false, 503));
    await expect(fetchWorldBankSeries("worldbank:gdpGrowthPak", PAK_CONFIG)).rejects.toThrow(/503/);
  });

  it("propagates a network-level rejection (e.g. DNS failure) unchanged", async () => {
    fetchMock.mockRejectedValueOnce(new Error("getaddrinfo ENOTFOUND api.worldbank.org"));
    await expect(fetchWorldBankSeries("worldbank:gdpGrowthPak", PAK_CONFIG)).rejects.toThrow(/ENOTFOUND/);
  });
});

describe("16. timeout / retry interaction", () => {
  it("makes exactly one fetch call per page -- the adapter itself never retries (retry is the orchestrator's job)", async () => {
    fetchMock.mockRejectedValueOnce(new Error("The operation was aborted due to timeout"));
    await expect(fetchWorldBankSeries("worldbank:gdpGrowthPak", PAK_CONFIG)).rejects.toThrow(/timeout/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("passes an AbortSignal with a bounded timeout on every request", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(PAK_FIXTURE));
    await fetchWorldBankSeries("worldbank:gdpGrowthPak", PAK_CONFIG);
    const options = fetchMock.mock.calls[0][1] as { signal?: AbortSignal };
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });
});

describe("security", () => {
  it("the endpoint URL is unauthenticated -- no api_key/token query parameter is ever constructed", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(PAK_FIXTURE));
    await fetchWorldBankSeries("worldbank:gdpGrowthPak", PAK_CONFIG);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).not.toMatch(/key=|token=|secret=/i);
  });

  it("every normalized observation still passes validateNormalizedObservation's credential-shape scan", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(PAK_FIXTURE));
    const result = await fetchWorldBankSeries("worldbank:gdpGrowthPak", PAK_CONFIG);
    for (const obs of result) {
      expect(validateNormalizedObservation(obs)).toEqual({ valid: true });
    }
  });
});
