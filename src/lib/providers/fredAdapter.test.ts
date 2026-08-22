// Phase 8.12 tests for the FRED adapter. Fixtures below are captured
// verbatim from live queries against
// https://api.stlouisfed.org/fred/series/observations for CPIAUCSL
// (units=pc1) and DFF (frequency=m&aggregation_method=eop) on 2026-08-13 —
// the same live verification call the Phase 8.12 report's CPI Date
// Verification section documents (reordered ascending here to match this
// adapter's own sort_order=asc request; values/dates otherwise unchanged).
// Tests mock global fetch with these exact captured shapes so CI never
// depends on live FRED availability, while still exercising the adapter
// against real, previously-observed response data rather than invented
// shapes.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchFredSeries, fredAdapter, FRED_SERIES, monthStartToMonthEnd, buildFredSourceReference } from "./fredAdapter";
import { validateNormalizedObservation } from "./providerAdapter";
import { COMPARISONS } from "@/lib/comparisons/comparisonRegistry";

const CPI_PC1_FIXTURE = {
  observations: [
    { realtime_start: "2026-08-12", realtime_end: "2026-08-12", date: "2026-05-01", value: "4.16661" },
    { realtime_start: "2026-08-12", realtime_end: "2026-08-12", date: "2026-06-01", value: "3.46353" },
    { realtime_start: "2026-08-12", realtime_end: "2026-08-12", date: "2026-07-01", value: "3.30386" },
  ],
};

const DFF_EOP_FIXTURE = {
  observations: [
    { realtime_start: "2026-08-13", realtime_end: "2026-08-13", date: "2026-06-01", value: "3.63" },
    { realtime_start: "2026-08-13", realtime_end: "2026-08-13", date: "2026-07-01", value: "3.63" },
    { realtime_start: "2026-08-13", realtime_end: "2026-08-13", date: "2026-08-01", value: "." }, // current in-progress month, no value yet
  ],
};

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body } as Response;
}

let fetchMock: ReturnType<typeof vi.fn>;
const ORIGINAL_KEY = process.env.FRED_API_KEY;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  process.env.FRED_API_KEY = "test-fred-key-not-real";
});
afterEach(() => {
  vi.unstubAllGlobals();
  process.env.FRED_API_KEY = ORIGINAL_KEY;
});

const FED_FUNDS_CONFIG = FRED_SERIES["fred:fedFunds"];
const CPI_CONFIG = FRED_SERIES["fred:usCpiInflation"];

describe("1. FRED adapter configuration", () => {
  it("declares exactly the two Phase 8.12 pilot series and nothing else", () => {
    expect(Object.keys(FRED_SERIES).sort()).toEqual(["fred:fedFunds", "fred:usCpiInflation"]);
  });

  it("fred:fedFunds is configured against native series DFF", () => {
    expect(FED_FUNDS_CONFIG.seriesId).toBe("DFF");
  });

  it("fred:usCpiInflation is configured against native series CPIAUCSL", () => {
    expect(CPI_CONFIG.seriesId).toBe("CPIAUCSL");
  });

  it("both declare monthly cadence and % unit", () => {
    expect(FED_FUNDS_CONFIG.cadence).toBe("monthly");
    expect(CPI_CONFIG.cadence).toBe("monthly");
    expect(FED_FUNDS_CONFIG.unit).toBe("%");
    expect(CPI_CONFIG.unit).toBe("%");
  });

  it("fredAdapter.providerId is 'fred'", () => {
    expect(fredAdapter.providerId).toBe("fred");
  });

  it("rejects an indicatorKey outside the Phase 8.12 pilot scope", async () => {
    await expect(fredAdapter.fetchObservations({ indicatorKey: "fred:us10y" })).rejects.toThrow(/no series configuration/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("2. DFF request parameters", () => {
  it("requests DFF with frequency=m and aggregation_method=eop", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(DFF_EOP_FIXTURE));
    await fetchFredSeries("fred:fedFunds", FED_FUNDS_CONFIG);
    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.searchParams.get("series_id")).toBe("DFF");
    expect(url.searchParams.get("frequency")).toBe("m");
    expect(url.searchParams.get("aggregation_method")).toBe("eop");
    expect(url.searchParams.get("units")).toBeNull();
  });
});

describe("3. CPI request parameters", () => {
  it("requests CPIAUCSL with units=pc1 and no frequency/aggregation_method", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(CPI_PC1_FIXTURE));
    await fetchFredSeries("fred:usCpiInflation", CPI_CONFIG);
    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.searchParams.get("series_id")).toBe("CPIAUCSL");
    expect(url.searchParams.get("units")).toBe("pc1");
    expect(url.searchParams.get("frequency")).toBeNull();
    expect(url.searchParams.get("aggregation_method")).toBeNull();
  });

  it("requests ascending order and no observation_start (full history, sinceDate ignored — see file header)", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(CPI_PC1_FIXTURE));
    await fredAdapter.fetchObservations({ indicatorKey: "fred:usCpiInflation", sinceDate: "2026-01-01" });
    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.searchParams.get("sort_order")).toBe("asc");
    expect(url.searchParams.get("observation_start")).toBeNull();
  });
});

describe("4. parsing", () => {
  it("parses a real captured CPI (pc1) response into NormalizedObservation[]", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(CPI_PC1_FIXTURE));
    const result = await fetchFredSeries("fred:usCpiInflation", CPI_CONFIG);
    expect(result).toHaveLength(3);
    for (const obs of result) expect(validateNormalizedObservation(obs).valid).toBe(true);
  });

  it("parses a real captured DFF (eop) response, skipping the in-progress month's '.' value", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(DFF_EOP_FIXTURE));
    const result = await fetchFredSeries("fred:fedFunds", FED_FUNDS_CONFIG);
    expect(result).toHaveLength(2); // June, July -- August's "." is dropped
  });

  it("fredAdapter.fetchObservations dispatches through the same path", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(DFF_EOP_FIXTURE));
    const result = await fredAdapter.fetchObservations({ indicatorKey: "fred:fedFunds" });
    expect(result).toHaveLength(2);
  });

  it("throws on a non-numeric, non-'.' value rather than silently coercing or dropping it", async () => {
    const malformed = { observations: [{ realtime_start: "x", realtime_end: "x", date: "2026-07-01", value: "not-a-number" }] };
    fetchMock.mockResolvedValueOnce(jsonResponse(malformed));
    await expect(fetchFredSeries("fred:fedFunds", FED_FUNDS_CONFIG)).rejects.toThrow(/non-numeric value/);
  });

  it("throws on a malformed response shape (missing observations array)", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error_message: "Bad Request" }));
    await expect(fetchFredSeries("fred:fedFunds", FED_FUNDS_CONFIG)).rejects.toThrow(/malformed response shape/);
  });

  it("throws with the HTTP status on a non-2xx response", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, false, 429));
    await expect(fetchFredSeries("fred:fedFunds", FED_FUNDS_CONFIG)).rejects.toThrow(/429/);
  });

  it("makes exactly one fetch call — the adapter itself never retries (retry is the orchestrator's job)", async () => {
    fetchMock.mockRejectedValueOnce(new Error("The operation was aborted due to timeout"));
    await expect(fetchFredSeries("fred:fedFunds", FED_FUNDS_CONFIG)).rejects.toThrow(/timeout/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("5. CPI period normalization (live convention verified — Phase 8.12 Section D)", () => {
  it("monthStartToMonthEnd converts FRED's period-start date to the correct month-end", () => {
    expect(monthStartToMonthEnd("2026-07-01")).toBe("2026-07-31");
    expect(monthStartToMonthEnd("2026-02-01")).toBe("2026-02-28"); // non-leap Feb
    expect(monthStartToMonthEnd("2028-02-01")).toBe("2028-02-29"); // leap Feb
    expect(monthStartToMonthEnd("2026-04-01")).toBe("2026-04-30"); // 30-day month
  });

  it("CPI observations are normalized to month-end, not FRED's native month-start date", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(CPI_PC1_FIXTURE));
    const result = await fetchFredSeries("fred:usCpiInflation", CPI_CONFIG);
    expect(result.map((o) => o.observationPeriod)).toEqual(["2026-05-31", "2026-06-30", "2026-07-31"]);
  });

  it("DFF (frequency=m) observations are ALSO normalized to month-end — confirmed live, not just CPI (Phase 8.12 refinement over the Phase 8.11 audit)", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(DFF_EOP_FIXTURE));
    const result = await fetchFredSeries("fred:fedFunds", FED_FUNDS_CONFIG);
    expect(result.map((o) => o.observationPeriod)).toEqual(["2026-06-30", "2026-07-31"]);
  });
});

describe("6. units", () => {
  it("uses the declared unit ('%'), never a unit read from the API response (FRED's observation shape carries no per-observation unit field)", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(CPI_PC1_FIXTURE));
    const result = await fetchFredSeries("fred:usCpiInflation", CPI_CONFIG);
    expect(result.every((o) => o.unit === "%")).toBe(true);
  });
});

describe("7. provenance", () => {
  it("source_series_id is DFF for fred:fedFunds", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(DFF_EOP_FIXTURE));
    const result = await fetchFredSeries("fred:fedFunds", FED_FUNDS_CONFIG);
    expect(result.every((o) => o.sourceSeriesId === "DFF")).toBe(true);
  });

  it("source_series_id is CPIAUCSL for fred:usCpiInflation", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(CPI_PC1_FIXTURE));
    const result = await fetchFredSeries("fred:usCpiInflation", CPI_CONFIG);
    expect(result.every((o) => o.sourceSeriesId === "CPIAUCSL")).toBe(true);
  });

  it("fred:fedFunds source_reference records frequency=m and aggregationMethod=eop", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(DFF_EOP_FIXTURE));
    const result = await fetchFredSeries("fred:fedFunds", FED_FUNDS_CONFIG);
    expect(result[0].sourceReference).toMatchObject({ seriesId: "DFF", frequency: "m", aggregationMethod: "eop" });
    expect(result[0].sourceReference).not.toHaveProperty("units");
  });

  it("fred:usCpiInflation source_reference records units=pc1", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(CPI_PC1_FIXTURE));
    const result = await fetchFredSeries("fred:usCpiInflation", CPI_CONFIG);
    expect(result[0].sourceReference).toMatchObject({ seriesId: "CPIAUCSL", units: "pc1" });
    expect(result[0].sourceReference).not.toHaveProperty("frequency");
    expect(result[0].sourceReference).not.toHaveProperty("aggregationMethod");
  });

  it("release_date is always null (FRED exposes no per-observation release date)", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(CPI_PC1_FIXTURE));
    const result = await fetchFredSeries("fred:usCpiInflation", CPI_CONFIG);
    expect(result.every((o) => o.releaseDate === null)).toBe(true);
  });

  it("source_updated_at is always null — realtime_start/realtime_end are deliberately NOT read (see file header: confirmed live to equal the query date, not a genuine per-observation update timestamp)", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(CPI_PC1_FIXTURE));
    const result = await fetchFredSeries("fred:usCpiInflation", CPI_CONFIG);
    expect(result.every((o) => o.sourceUpdatedAt === null)).toBe(true);
  });

  it("quality_status is 'official' for every observation", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(DFF_EOP_FIXTURE));
    const result = await fetchFredSeries("fred:fedFunds", FED_FUNDS_CONFIG);
    expect(result.every((o) => o.qualityStatus === "official")).toBe(true);
  });

  it("methodology is always null", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(DFF_EOP_FIXTURE));
    const result = await fetchFredSeries("fred:fedFunds", FED_FUNDS_CONFIG);
    expect(result.every((o) => o.methodology === null)).toBe(true);
  });
});

describe("8. credential leakage prevention", () => {
  it("the constructed request URL DOES contain api_key (required for FRED to respond) but source_reference never does", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(DFF_EOP_FIXTURE));
    const result = await fetchFredSeries("fred:fedFunds", FED_FUNDS_CONFIG);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("api_key=test-fred-key-not-real");
    expect(JSON.stringify(result[0].sourceReference)).not.toContain("test-fred-key-not-real");
    expect(JSON.stringify(result[0].sourceReference)).not.toMatch(/api_key/i);
  });

  it("buildFredSourceReference never includes api_key regardless of transformParams shape", () => {
    const ref = buildFredSourceReference({ seriesId: "DFF", unit: "%", cadence: "monthly", transformParams: { frequency: "m", aggregation_method: "eop" } });
    expect(JSON.stringify(ref)).not.toMatch(/api_key|apikey/i);
  });

  it("a thrown HTTP error never includes the API key", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, false, 400));
    await expect(fetchFredSeries("fred:fedFunds", FED_FUNDS_CONFIG)).rejects.not.toThrow(/test-fred-key-not-real/);
  });

  it("every normalized observation still passes validateNormalizedObservation's credential-shape scan", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(DFF_EOP_FIXTURE));
    const result = await fetchFredSeries("fred:fedFunds", FED_FUNDS_CONFIG);
    for (const obs of result) expect(validateNormalizedObservation(obs)).toEqual({ valid: true });
  });

  it("throws a clear error (not a silent undefined key) when FRED_API_KEY is unset", async () => {
    delete process.env.FRED_API_KEY;
    await expect(fetchFredSeries("fred:fedFunds", FED_FUNDS_CONFIG)).rejects.toThrow(/FRED_API_KEY is not set/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("9. transformation identity", () => {
  it("fred:fedFunds's config is the DFF+frequency=m+aggregation_method=eop derivative, never native daily DFF", () => {
    expect(FED_FUNDS_CONFIG.transformParams).toEqual({ frequency: "m", aggregation_method: "eop" });
    expect(FED_FUNDS_CONFIG.cadence).toBe("monthly"); // never "daily"
  });

  it("fred:usCpiInflation's config is the CPIAUCSL+units=pc1 derivative, never the native index level", () => {
    expect(CPI_CONFIG.transformParams).toEqual({ units: "pc1" });
  });

  it("no native-daily or native-index identity (e.g. a bare 'fred:dff' or 'fred:cpiauscl') exists in this pilot's registry", () => {
    expect(FRED_SERIES["fred:dff"]).toBeUndefined();
    expect(FRED_SERIES["fred:cpiauscl"]).toBeUndefined();
    expect(FRED_SERIES["fred:dgs10"]).toBeUndefined();
  });
});

describe("10. comparison compatibility (drift guard)", () => {
  it("fred:fedFunds's adapter-declared unit/cadence match comparisonRegistry.ts's existing declared config exactly", () => {
    const comparison = COMPARISONS.find((c) => c.seriesA.id === "fred:fedFunds" || c.seriesB.id === "fred:fedFunds");
    const seriesConfig = comparison?.seriesA.id === "fred:fedFunds" ? comparison.seriesA : comparison?.seriesB;
    expect(seriesConfig?.unit).toBe(FED_FUNDS_CONFIG.unit);
    expect(seriesConfig?.frequency).toBe(FED_FUNDS_CONFIG.cadence);
  });

  it("fred:usCpiInflation's adapter-declared unit/cadence match comparisonRegistry.ts's existing declared config exactly", () => {
    const comparison = COMPARISONS.find((c) => c.seriesA.id === "fred:usCpiInflation" || c.seriesB.id === "fred:usCpiInflation");
    const seriesConfig = comparison?.seriesA.id === "fred:usCpiInflation" ? comparison.seriesA : comparison?.seriesB;
    expect(seriesConfig?.unit).toBe(CPI_CONFIG.unit);
    expect(seriesConfig?.frequency).toBe(CPI_CONFIG.cadence);
  });

  it("both pilot comparisons (pakistan-vs-fed-funds-rate, pakistan-vs-us-inflation) still exist, unmodified in shape", () => {
    expect(COMPARISONS.find((c) => c.slug === "pakistan-vs-fed-funds-rate")).toBeDefined();
    expect(COMPARISONS.find((c) => c.slug === "pakistan-vs-us-inflation")).toBeDefined();
  });
});
