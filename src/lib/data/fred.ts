import type { Kpi } from "@/data/kpiData";
import type { MarketType } from "@/lib/marketCalendar";
import {
  fallbackBrentKpi,
  fallbackFedFundsKpi,
  fallbackNatGasKpi,
  fallbackUs10yKpi,
  fallbackWtiKpi,
} from "@/data/globalMarketsFallbackData";
import {
  getYfBrentKpi,
  getYfNaturalGasKpi,
  getYfUs10yKpi,
  getYfWtiKpi,
} from "./yfinance";
import { dedupeInFlight, getFresh, setCache } from "@/lib/memoryCache";
import { resolveWithPersistedFallback } from "@/lib/marketFallbackSnapshot";
import { globalMarketCacheTag } from "@/lib/data/globalMarketsCacheTags";

// All series are read from the St. Louis Fed's FRED API:
// https://api.stlouisfed.org/fred/series/observations?series_id=...&api_key=...
//
// The API key is a secret and must only ever be read from the server-side
// environment — never hardcoded, never exposed to the client.
const FRED_BASE_URL = "https://api.stlouisfed.org/fred/series/observations";

// These are daily series, so re-checking once a day is more than enough.
const REVALIDATE_SECONDS = 60 * 60 * 24; // 24h

// fetch() has no default timeout — without this, a stalled connection hangs
// for undici's ~5 minute default instead of falling into the existing
// try/catch error handling.
const FETCH_TIMEOUT_MS = 10_000;

const SERIES_IDS = {
  wti: "DCOILWTICO", // Crude Oil Prices: West Texas Intermediate (Cushing, OK)
  brent: "DCOILBRENTEU", // Crude Oil Prices: Brent - Europe
  naturalGas: "DHHNGSP", // Henry Hub Natural Gas Spot Price
  us10y: "DGS10", // Market Yield on U.S. Treasury Securities at 10-Year Constant Maturity
  fedFunds: "DFF", // Federal Funds Effective Rate
  usCpi: "CPIAUCSL", // CPI for All Urban Consumers — fetched with units=pc1 for YoY % directly
} as const;

interface FredObservation {
  date: string;
  value: string;
}

interface FredResponse {
  observations: FredObservation[];
}

interface FredSeries {
  latestValue: number;
  latestDate: string;
  previousValue: number | null;
  previousDate: string | null;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/** "2026-06-12" -> "Jun 12" */
function formatDateLabel(dateStr: string): string {
  const [, month, day] = dateStr.split("-");
  return `${MONTH_NAMES[Number(month) - 1]} ${Number(day)}`;
}

function changeLabel(diff: number, previousDate: string | null, format: (value: number) => string): string {
  if (previousDate === null) {
    return "no prior data";
  }
  const sign = diff >= 0 ? "+" : "";
  return `${sign}${format(diff)} vs ${formatDateLabel(previousDate)}`;
}

/**
 * Fetches a single FRED series and reduces it to its latest and previous
 * observation. FRED returns "." for days without a published value (e.g.
 * weekends/holidays for daily series); those are skipped.
 *
 * Throws on a missing API key, non-200 response, or a series with no usable
 * numeric observations — callers are expected to catch and fall back.
 */
async function fetchFredSeries(seriesId: string, options?: { cacheTag?: string; noCache?: boolean }): Promise<FredSeries> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    throw new Error("FRED_API_KEY is not set");
  }

  const params = new URLSearchParams({
    series_id: seriesId,
    api_key: apiKey,
    file_type: "json",
    sort_order: "desc",
    limit: "10",
  });

  // noCache=true (globalMarketsFreshnessAudit.ts's live re-check) bypasses the
  // Data Cache entirely; otherwise tag the request so a drifted indicator can
  // be force-revalidated without waiting out REVALIDATE_SECONDS (24h).
  const cacheOptions: RequestInit = options?.noCache
    ? { cache: "no-store" }
    : { next: { revalidate: REVALIDATE_SECONDS, ...(options?.cacheTag ? { tags: [options.cacheTag] } : {}) } };

  const response = await fetch(`${FRED_BASE_URL}?${params.toString()}`, {
    ...cacheOptions,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`FRED API returned ${response.status} for ${seriesId}`);
  }

  const json = (await response.json()) as FredResponse;

  // sort_order=desc, so the first usable observations are newest-first.
  const points = json.observations
    .filter((obs) => obs.value !== "." && obs.value !== "")
    .map((obs) => ({ date: obs.date, value: Number(obs.value) }))
    .filter((point) => Number.isFinite(point.value));

  if (points.length === 0) {
    throw new Error(`FRED API returned no numeric observations for ${seriesId}`);
  }

  return {
    latestValue: points[0].value,
    latestDate: points[0].date,
    previousValue: points[1]?.value ?? null,
    previousDate: points[1]?.date ?? null,
  };
}

function buildKpi(
  series: FredSeries,
  title: string,
  unit: string,
  glow: Kpi["glow"],
  decimals: number,
  seriesId: string,
  marketType: MarketType = "global-market",
): Kpi {
  const diff = series.previousValue !== null ? series.latestValue - series.previousValue : 0;
  return {
    title,
    value: series.latestValue.toFixed(decimals),
    unit,
    change: changeLabel(diff, series.previousDate, (d) => d.toFixed(decimals)),
    trend: diff >= 0 ? "up" : "down",
    glow,
    source: "FRED",
    seriesId,
    latestDate: series.latestDate,
    frequency: "Daily",
    marketType,
  };
}

/** West Texas Intermediate crude oil futures (CL=F) — Yahoo Finance primary, FRED daily as fallback. */
export async function getWtiKpi(noCache = false): Promise<Kpi> {
  return resolveWithPersistedFallback(
    "wti",
    async () => {
      const yfKpi = await getYfWtiKpi(noCache);
      if (yfKpi) return yfKpi;
      const series = await fetchFredSeries(SERIES_IDS.wti, { cacheTag: globalMarketCacheTag("wti"), noCache });
      return buildKpi(series, "WTI Crude", "$/bbl", "blue", 2, SERIES_IDS.wti);
    },
    fallbackWtiKpi,
  );
}

/** Brent crude oil futures (BZ=F) — Yahoo Finance primary, FRED daily as fallback. */
export async function getBrentKpi(noCache = false): Promise<Kpi> {
  return resolveWithPersistedFallback(
    "brent",
    async () => {
      const yfKpi = await getYfBrentKpi(noCache);
      if (yfKpi) return yfKpi;
      const series = await fetchFredSeries(SERIES_IDS.brent, { cacheTag: globalMarketCacheTag("brent"), noCache });
      return buildKpi(series, "Brent Crude", "$/bbl", "purple", 2, SERIES_IDS.brent);
    },
    fallbackBrentKpi,
  );
}

/** Henry Hub natural gas futures (NG=F) — Yahoo Finance primary, FRED daily as fallback. */
export async function getNaturalGasKpi(noCache = false): Promise<Kpi> {
  return resolveWithPersistedFallback(
    "natural-gas",
    async () => {
      const yfKpi = await getYfNaturalGasKpi(noCache);
      if (yfKpi) return yfKpi;
      const series = await fetchFredSeries(SERIES_IDS.naturalGas, { cacheTag: globalMarketCacheTag("natural-gas"), noCache });
      return buildKpi(series, "Natural Gas", "$/MMBtu", "blue", 2, SERIES_IDS.naturalGas);
    },
    fallbackNatGasKpi,
  );
}

/** US 10-Year Treasury constant maturity yield, in percent. */
export async function getUs10yKpi(noCache = false): Promise<Kpi> {
  return resolveWithPersistedFallback(
    "us10y",
    async () => {
      try {
        const series = await fetchFredSeries(SERIES_IDS.us10y, { cacheTag: globalMarketCacheTag("us10y"), noCache });
        return buildKpi(series, "US 10Y Treasury", "%", "blue", 2, SERIES_IDS.us10y, "us-treasury");
      } catch {
        const yfKpi = await getYfUs10yKpi(noCache);
        if (yfKpi) return yfKpi;
        throw new Error("Both FRED and Yahoo Finance failed for US 10Y");
      }
    },
    fallbackUs10yKpi,
  );
}

/** US Federal Funds effective rate, in percent.
 *  FRED is the authoritative source; no free keyless alternative exists.
 *  The rate only changes 8 times/year so the fallback stays accurate
 *  between FOMC meetings. */
export async function getFedFundsKpi(noCache = false): Promise<Kpi> {
  return resolveWithPersistedFallback(
    "fed-funds",
    () => fetchFredSeries(SERIES_IDS.fedFunds, { cacheTag: globalMarketCacheTag("fed-funds"), noCache }).then((series) => buildKpi(series, "Fed Funds Rate", "%", "purple", 2, SERIES_IDS.fedFunds, "us-treasury")),
    fallbackFedFundsKpi,
  );
}

// --- Comparisons feature: historical series ---------------------------------
// FRED has decades of history for every series below (verified live: DFF
// since 1954, CPIAUCSL since 1947, DGS10 since 1962) — far more than the
// 10-year window requested. Each fetcher below asks FRED to do the
// resampling/transformation server-side (monthly aggregation, YoY % change)
// rather than reimplementing that math from raw daily data.

export interface FredHistoryPoint {
  /** "YYYY-MM-DD" */
  date: string;
  value: number;
}

async function fetchFredHistory(
  seriesId: string,
  startDate: string,
  extraParams: Record<string, string> = {},
): Promise<FredHistoryPoint[]> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) throw new Error("FRED_API_KEY is not set");

  const params = new URLSearchParams({
    series_id: seriesId,
    api_key: apiKey,
    file_type: "json",
    observation_start: startDate,
    sort_order: "asc",
    ...extraParams,
  });

  const response = await fetch(`${FRED_BASE_URL}?${params.toString()}`, {
    next: { revalidate: REVALIDATE_SECONDS },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`FRED API returned ${response.status} for ${seriesId}`);
  }

  const json = (await response.json()) as FredResponse;
  return json.observations
    .filter((obs) => obs.value !== "." && obs.value !== "")
    .map((obs) => ({ date: obs.date, value: Number(obs.value) }))
    .filter((point) => Number.isFinite(point.value));
}

/**
 * US Federal Funds effective rate, resampled to monthly end-of-period, since
 * `startDate`. Memoized (memoryCache.ts, TTL = REVALIDATE_SECONDS, same
 * window the underlying fetch() already uses) — shared by every comparison
 * that references it instead of each independently re-fetching. Only
 * successful results are cached; failures always retry live.
 */
export async function getFedFundsHistory(startDate = "2016-01-01"): Promise<FredHistoryPoint[] | null> {
  const cacheKey = `fred-fedfunds-history:${startDate}`;
  const cached = getFresh<FredHistoryPoint[]>(cacheKey, REVALIDATE_SECONDS * 1000);
  if (cached) return cached.data;

  try {
    return await dedupeInFlight(cacheKey, async () => {
      const result = await fetchFredHistory(SERIES_IDS.fedFunds, startDate, {
        frequency: "m",
        aggregation_method: "eop",
      });
      setCache(cacheKey, result);
      return result;
    });
  } catch {
    return null;
  }
}

/** US 10-Year Treasury constant maturity yield, resampled to monthly end-of-period, since `startDate`. Memoized — see getFedFundsHistory. */
export async function getUs10yHistory(startDate = "2016-01-01"): Promise<FredHistoryPoint[] | null> {
  const cacheKey = `fred-us10y-history:${startDate}`;
  const cached = getFresh<FredHistoryPoint[]>(cacheKey, REVALIDATE_SECONDS * 1000);
  if (cached) return cached.data;

  try {
    return await dedupeInFlight(cacheKey, async () => {
      const result = await fetchFredHistory(SERIES_IDS.us10y, startDate, {
        frequency: "m",
        aggregation_method: "eop",
      });
      setCache(cacheKey, result);
      return result;
    });
  } catch {
    return null;
  }
}

/**
 * US CPI inflation, year-over-year %, since `startDate`. Uses FRED's
 * `units=pc1` transform (percent change from a year ago, computed
 * server-side by FRED from the underlying CPIAUCSL index) rather than
 * computing YoY % manually from index levels. Memoized — see getFedFundsHistory.
 */
export async function getUsCpiInflationHistory(startDate = "2016-01-01"): Promise<FredHistoryPoint[] | null> {
  const cacheKey = `fred-uscpi-history:${startDate}`;
  const cached = getFresh<FredHistoryPoint[]>(cacheKey, REVALIDATE_SECONDS * 1000);
  if (cached) return cached.data;

  try {
    return await dedupeInFlight(cacheKey, async () => {
      const result = await fetchFredHistory(SERIES_IDS.usCpi, startDate, { units: "pc1" });
      setCache(cacheKey, result);
      return result;
    });
  } catch {
    return null;
  }
}
