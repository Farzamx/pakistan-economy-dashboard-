// Yahoo Finance free API — no API key required.
// Used as a secondary fallback for Global Markets KPIs when the primary
// provider (Twelve Data / FRED) has no API key configured.
//
// Uses the v8/finance/chart endpoint (1d interval, 2d range).
// Reads meta.regularMarketPrice (latest) and meta.chartPreviousClose.
// Revalidates every hour — Yahoo Finance updates intraday.

import type { Kpi } from "@/data/kpiData";

const YF_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";
const REVALIDATE = 60 * 60; // 1h

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

export async function fetchYfQuote(symbol: string): Promise<{
  price: number;
  prevClose: number | null;
  updatedAt: number;
}> {
  const encoded = encodeURIComponent(symbol);
  const res = await fetch(`${YF_BASE}/${encoded}?interval=1d&range=2d`, {
    headers: { "User-Agent": "Mozilla/5.0" },
    next: { revalidate: REVALIDATE },
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
  };
}

// Individual getters — each returns null on failure so callers can chain fallbacks

export async function getYfGoldKpi(): Promise<Kpi | null> {
  try {
    const { price, prevClose, updatedAt } = await fetchYfQuote(YF_SYMBOLS.gold);
    return buildYfKpi(price, prevClose, updatedAt, "Gold", "$/oz", "blue", 2);
  } catch { return null; }
}

export async function getYfSilverKpi(): Promise<Kpi | null> {
  try {
    const { price, prevClose, updatedAt } = await fetchYfQuote(YF_SYMBOLS.silver);
    return buildYfKpi(price, prevClose, updatedAt, "Silver", "$/oz", "purple", 2);
  } catch { return null; }
}

export async function getYfWtiKpi(): Promise<Kpi | null> {
  try {
    const { price, prevClose, updatedAt } = await fetchYfQuote(YF_SYMBOLS.wti);
    return buildYfKpi(price, prevClose, updatedAt, "WTI Crude", "$/bbl", "blue", 2);
  } catch { return null; }
}

export async function getYfBrentKpi(): Promise<Kpi | null> {
  try {
    const { price, prevClose, updatedAt } = await fetchYfQuote(YF_SYMBOLS.brent);
    return buildYfKpi(price, prevClose, updatedAt, "Brent Crude", "$/bbl", "purple", 2);
  } catch { return null; }
}

export async function getYfNaturalGasKpi(): Promise<Kpi | null> {
  try {
    const { price, prevClose, updatedAt } = await fetchYfQuote(YF_SYMBOLS.naturalGas);
    return buildYfKpi(price, prevClose, updatedAt, "Natural Gas", "$/MMBtu", "blue", 3);
  } catch { return null; }
}

export async function getYfDxyKpi(): Promise<Kpi | null> {
  try {
    const { price, prevClose, updatedAt } = await fetchYfQuote(YF_SYMBOLS.dxy);
    return buildYfKpi(price, prevClose, updatedAt, "US Dollar Index", "DXY", "purple", 2);
  } catch { return null; }
}

export async function getYfUs10yKpi(): Promise<Kpi | null> {
  try {
    const { price, prevClose, updatedAt } = await fetchYfQuote(YF_SYMBOLS.us10y);
    return buildYfKpi(price, prevClose, updatedAt, "US 10Y Treasury", "%", "blue", 3);
  } catch { return null; }
}

// PAK ETF — Global X MSCI Pakistan ETF (NYSE: PAK)
// Equity-market proxy: PSX requires a commercial data license for live KSE-100
// index feeds; this free Yahoo Finance ticker correlates with KSE-100 performance.
// Returns null if the price data is stale (>30 days old), which indicates the
// ETF is delisted or has stopped trading on the exchange.
const PAK_ETF_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function getPakEtfKpi(): Promise<Kpi | null> {
  try {
    const { price, prevClose, updatedAt } = await fetchYfQuote("PAK");
    const ageMs = Date.now() - updatedAt * 1000;
    if (ageMs > PAK_ETF_MAX_AGE_MS) {
      const ageDays = Math.round(ageMs / 86_400_000);
      throw new Error(`PAK ETF data is ${ageDays} days old — fund may be delisted`);
    }
    return buildYfKpi(price, prevClose, updatedAt, "Pakistan ETF (NYSE: PAK)", "$", "blue", 2);
  } catch { return null; }
}
