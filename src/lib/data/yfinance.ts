// Yahoo Finance free API — no API key required.
// Used as a secondary fallback for Global Markets KPIs when the primary
// provider (Twelve Data / FRED) has no API key configured.
//
// Uses the v8/finance/chart endpoint (1d interval, 2d range).
// Reads meta.regularMarketPrice (latest) and meta.chartPreviousClose.
// Revalidates every hour — Yahoo Finance updates intraday.

import type { Kpi } from "@/data/kpiData";
import type { MarketType } from "@/lib/marketCalendar";
import { dedupeInFlight, getFresh, setCache } from "@/lib/memoryCache";
import { resolveWithPersistedFallback } from "@/lib/marketFallbackSnapshot";
import { fallbackPakEtfKpi } from "@/data/globalMarketsFallbackData";
import { globalMarketCacheTag } from "@/lib/data/globalMarketsCacheTags";

const YF_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";
const REVALIDATE = 60 * 60; // 1h

// fetch() has no default timeout — without this, a stalled connection hangs
// for undici's ~5 minute default instead of falling into the existing
// try/catch error handling.
const FETCH_TIMEOUT_MS = 10_000;

// Yahoo Finance symbols for Global Markets indicators
export const YF_SYMBOLS = {
  gold: "GC=F",      // Gold Futures (COMEX)
  silver: "SI=F",    // Silver Futures (COMEX)
  wti: "CL=F",       // WTI Crude Oil Futures
  brent: "BZ=F",     // Brent Crude Oil Futures
  naturalGas: "NG=F", // Henry Hub Natural Gas Futures
  dxy: "DX-Y.NYB",   // US Dollar Index
  us10y: "^TNX",     // CBOE 10-Year Treasury Yield
} as const;

interface YfMeta {
  symbol: string;
  regularMarketPrice: number;
  regularMarketTime: number;
  chartPreviousClose: number | null;
}

interface YfResponse {
  chart: {
    result: Array<{ meta: YfMeta }> | null;
    error: { description: string } | null;
  };
}

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"] as const;

function formatUnixDate(epoch: number): string {
  const d = new Date(epoch * 1000);
  return `${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

export interface YfQuoteOptions {
  /** Next.js Data Cache tag — lets globalMarketsFreshnessAudit.ts force-revalidate this exact symbol via revalidateTag(), instead of waiting out REVALIDATE. Omitted for callers (fxRates.ts, getPakEtfKpi) that manage their own cache tag/layer. */
  cacheTag?: string;
  /** Bypasses the Data Cache entirely (cache: "no-store") for a genuinely-live re-check — used by the freshness audit, never by a normal page render. Mutually exclusive with cacheTag per Next.js's fetch cache rules. */
  noCache?: boolean;
}

export async function fetchYfQuote(symbol: string, options?: YfQuoteOptions): Promise<{
  price: number;
  prevClose: number | null;
  updatedAt: number;
}> {
  const encoded = encodeURIComponent(symbol);
  const cacheOptions: RequestInit = options?.noCache
    ? { cache: "no-store" }
    : { next: { revalidate: REVALIDATE, ...(options?.cacheTag ? { tags: [options.cacheTag] } : {}) } };
  const res = await fetch(`${YF_BASE}/${encoded}?interval=1d&range=2d`, {
    headers: { "User-Agent": "Mozilla/5.0" },
    ...cacheOptions,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Yahoo Finance HTTP ${res.status} for ${symbol}`);
  const json = (await res.json()) as YfResponse;
  if (!json.chart.result?.length) throw new Error(`Yahoo Finance no result for ${symbol}`);
  const meta = json.chart.result[0].meta;
  if (!meta.regularMarketPrice || meta.regularMarketPrice === 0) {
    throw new Error(`Yahoo Finance zero price for ${symbol}`);
  }
  return {
    price: meta.regularMarketPrice,
    prevClose: meta.chartPreviousClose ?? null,
    updatedAt: meta.regularMarketTime ?? Math.floor(Date.now() / 1000),
  };
}

export function buildYfKpi(
  price: number,
  prevClose: number | null,
  updatedAt: number,
  title: string,
  unit: string,
  glow: Kpi["glow"],
  decimals: number,
  seriesId: string,
  marketType: MarketType = "global-market",
): Kpi {
  const diff = prevClose !== null ? price - prevClose : 0;
  const sign = diff >= 0 ? "+" : "";
  const changeStr =
    prevClose !== null
      ? `${sign}${diff.toFixed(decimals)} vs prev close · ${formatUnixDate(updatedAt)}`
      : `as of ${formatUnixDate(updatedAt)}`;
  return {
    title,
    value: price.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }),
    unit,
    change: changeStr,
    trend: diff >= 0 ? "up" : "down",
    glow,
    source: "Yahoo Finance",
    seriesId,
    latestDate: new Date(updatedAt * 1000).toISOString().slice(0, 10),
    frequency: "Hourly",
    marketType,
  };
}

// Individual getters — each returns null on failure so callers can chain fallbacks

export async function getYfGoldKpi(noCache = false): Promise<Kpi | null> {
  try {
    const { price, prevClose, updatedAt } = await fetchYfQuote(YF_SYMBOLS.gold, { cacheTag: globalMarketCacheTag("gold"), noCache });
    return buildYfKpi(price, prevClose, updatedAt, "Gold", "$/oz", "blue", 2, YF_SYMBOLS.gold);
  } catch { return null; }
}

export async function getYfSilverKpi(noCache = false): Promise<Kpi | null> {
  try {
    const { price, prevClose, updatedAt } = await fetchYfQuote(YF_SYMBOLS.silver, { cacheTag: globalMarketCacheTag("silver"), noCache });
    return buildYfKpi(price, prevClose, updatedAt, "Silver", "$/oz", "purple", 2, YF_SYMBOLS.silver);
  } catch { return null; }
}

export async function getYfWtiKpi(noCache = false): Promise<Kpi | null> {
  try {
    const { price, prevClose, updatedAt } = await fetchYfQuote(YF_SYMBOLS.wti, { cacheTag: globalMarketCacheTag("wti"), noCache });
    return buildYfKpi(price, prevClose, updatedAt, "WTI Crude", "$/bbl", "blue", 2, YF_SYMBOLS.wti);
  } catch { return null; }
}

export async function getYfBrentKpi(noCache = false): Promise<Kpi | null> {
  try {
    const { price, prevClose, updatedAt } = await fetchYfQuote(YF_SYMBOLS.brent, { cacheTag: globalMarketCacheTag("brent"), noCache });
    return buildYfKpi(price, prevClose, updatedAt, "Brent Crude", "$/bbl", "purple", 2, YF_SYMBOLS.brent);
  } catch { return null; }
}

export async function getYfNaturalGasKpi(noCache = false): Promise<Kpi | null> {
  try {
    const { price, prevClose, updatedAt } = await fetchYfQuote(YF_SYMBOLS.naturalGas, { cacheTag: globalMarketCacheTag("natural-gas"), noCache });
    return buildYfKpi(price, prevClose, updatedAt, "Natural Gas", "$/MMBtu", "blue", 3, YF_SYMBOLS.naturalGas);
  } catch { return null; }
}

export async function getYfDxyKpi(noCache = false): Promise<Kpi | null> {
  try {
    const { price, prevClose, updatedAt } = await fetchYfQuote(YF_SYMBOLS.dxy, { cacheTag: globalMarketCacheTag("dxy"), noCache });
    return buildYfKpi(price, prevClose, updatedAt, "US Dollar Index", "DXY", "purple", 2, YF_SYMBOLS.dxy);
  } catch { return null; }
}

export async function getYfUs10yKpi(noCache = false): Promise<Kpi | null> {
  try {
    const { price, prevClose, updatedAt } = await fetchYfQuote(YF_SYMBOLS.us10y, { cacheTag: globalMarketCacheTag("us10y"), noCache });
    return buildYfKpi(price, prevClose, updatedAt, "US 10Y Treasury", "%", "blue", 3, YF_SYMBOLS.us10y, "us-treasury");
  } catch { return null; }
}

// PAK ETF — Global X MSCI Pakistan ETF (NYSE: PAK)
// Equity-market proxy: PSX requires a commercial data license for live KSE-100
// index feeds; this free Yahoo Finance ticker correlates with KSE-100 performance.
// Returns null if the price data is stale (>30 days old), which indicates the
// ETF is delisted or has stopped trading on the exchange.
const PAK_ETF_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function getPakEtfKpi(): Promise<Kpi> {
  return resolveWithPersistedFallback(
    "pak-etf",
    async () => {
      const { price, prevClose, updatedAt } = await fetchYfQuote("PAK");
      const ageMs = Date.now() - updatedAt * 1000;
      if (ageMs > PAK_ETF_MAX_AGE_MS) {
        const ageDays = Math.round(ageMs / 86_400_000);
        throw new Error(`PAK ETF data is ${ageDays} days old — fund may be delisted`);
      }
      return buildYfKpi(price, prevClose, updatedAt, "Pakistan ETF (NYSE: PAK)", "$", "blue", 2, "PAK");
    },
    fallbackPakEtfKpi,
  );
}

// --- Comparisons feature: historical series ---------------------------------
// Same free, keyless v8/finance/chart endpoint as the snapshot quotes above,
// just with a wider `range`/`interval` instead of `range=2d` — Yahoo Finance
// supports this for the same symbols with no separate access tier. Verified
// live: GC=F (gold futures) returns ~10 years of monthly closes (2016-07 to
// present) under range=10y&interval=1mo.

export interface YfHistoryPoint {
  /** "YYYY-MM-DD" */
  date: string;
  close: number;
}

export async function fetchYfHistory(
  symbol: string,
  range: "1y" | "3y" | "5y" | "10y" | "max",
  interval: "1d" | "1wk" | "1mo",
): Promise<YfHistoryPoint[]> {
  const encoded = encodeURIComponent(symbol);
  const res = await fetch(`${YF_BASE}/${encoded}?interval=${interval}&range=${range}`, {
    headers: { "User-Agent": "Mozilla/5.0" },
    next: { revalidate: REVALIDATE },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Yahoo Finance HTTP ${res.status} for ${symbol} history`);

  const json = (await res.json()) as {
    chart: {
      result: Array<{
        timestamp: number[];
        indicators: { quote: Array<{ close: (number | null)[] }> };
      }> | null;
      error: { description: string } | null;
    };
  };
  const result = json.chart.result?.[0];
  if (!result) throw new Error(`Yahoo Finance no history result for ${symbol}`);

  const { timestamp, indicators } = result;
  const closes = indicators.quote[0]?.close ?? [];

  const points: YfHistoryPoint[] = [];
  for (let i = 0; i < timestamp.length; i++) {
    const close = closes[i];
    if (close === null || close === undefined || !Number.isFinite(close)) continue;
    points.push({ date: new Date(timestamp[i] * 1000).toISOString().slice(0, 10), close });
  }
  if (points.length === 0) throw new Error(`Yahoo Finance returned no usable closes for ${symbol}`);
  return points;
}

/** Gold futures (GC=F) monthly closes, up to 10 years of history. */
/**
 * Memoized (memoryCache.ts, TTL = REVALIDATE, same window the underlying
 * fetch() already uses) — gold-vs-usd-pkr, gold-vs-treasury-bills, and the
 * performance calculator all reference this same series independently
 * within one render of /comparisons.
 */
export async function getGoldHistory(): Promise<YfHistoryPoint[] | null> {
  const cacheKey = "yfinance-gold-history";
  const cached = getFresh<YfHistoryPoint[]>(cacheKey, REVALIDATE * 1000);
  if (cached) return cached.data;

  try {
    return await dedupeInFlight(cacheKey, async () => {
      const result = await fetchYfHistory(YF_SYMBOLS.gold, "10y", "1mo");
      setCache(cacheKey, result);
      return result;
    });
  } catch {
    return null;
  }
}
