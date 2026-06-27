import type { Kpi } from "@/data/kpiData";
import {
  fallbackDxyKpi,
  fallbackGoldKpi,
  fallbackSilverKpi,
} from "@/data/globalMarketsFallbackData";
import {
  getYfDxyKpi,
  getYfGoldKpi,
  getYfSilverKpi,
} from "./yfinance";

// Gold, Silver and the US Dollar Index are read from Twelve Data's time
// series endpoint: https://api.twelvedata.com/time_series?symbol=...&apikey=...
//
// The API key is a secret and must only ever be read from the server-side
// environment — never hardcoded, never exposed to the client.
const TWELVE_DATA_BASE_URL = "https://api.twelvedata.com/time_series";

// Daily closes — re-checking every 6h is plenty and keeps well within
// Twelve Data's free-tier rate limit.
const REVALIDATE_SECONDS = 60 * 60 * 6; // 6h

// fetch() has no default timeout — without this, a stalled connection hangs
// for undici's ~5 minute default (or blocks `next build` static generation)
// instead of falling into the existing try/catch error handling.
const FETCH_TIMEOUT_MS = 10_000;

const SYMBOLS = {
  gold: "XAU/USD",
  silver: "XAG/USD",
  dxy: "DXY",
} as const;

interface TwelveDataValue {
  datetime: string;
  close: string;
}

interface TwelveDataResponse {
  status?: string;
  values?: TwelveDataValue[];
}

interface MetalSeries {
  latestValue: number;
  latestDate: string;
  previousValue: number | null;
  previousDate: string | null;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/** "2026-06-12" -> "Jun 12" (also handles "2026-06-12 00:00:00") */
function formatDateLabel(dateStr: string): string {
  const [, month, day] = dateStr.split(/[-T ]/);
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
 * Fetches a daily time series from Twelve Data and reduces it to its latest
 * and previous close.
 *
 * Throws on a missing API key, non-200 response, or an error/empty payload —
 * callers are expected to catch and fall back.
 */
async function fetchTwelveDataSeries(symbol: string): Promise<MetalSeries> {
  const apiKey = process.env.TWELVEDATA_API_KEY;
  if (!apiKey) {
    throw new Error("TWELVEDATA_API_KEY is not set");
  }

  const params = new URLSearchParams({
    symbol,
    interval: "1day",
    outputsize: "5",
    apikey: apiKey,
  });

  const response = await fetch(`${TWELVE_DATA_BASE_URL}?${params.toString()}`, {
    next: { revalidate: REVALIDATE_SECONDS },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Twelve Data API returned ${response.status} for ${symbol}`);
  }

  const json = (await response.json()) as TwelveDataResponse;
  if (json.status === "error" || !json.values || json.values.length === 0) {
    throw new Error(`Twelve Data API returned no values for ${symbol}`);
  }

  // Twelve Data returns values newest-first.
  const points = json.values
    .map((v) => ({ date: v.datetime, value: Number(v.close) }))
    .filter((point) => Number.isFinite(point.value));

  if (points.length === 0) {
    throw new Error(`Twelve Data API returned no numeric closes for ${symbol}`);
  }

  return {
    latestValue: points[0].value,
    latestDate: points[0].date,
    previousValue: points[1]?.value ?? null,
    previousDate: points[1]?.date ?? null,
  };
}

function buildKpi(series: MetalSeries, title: string, unit: string, glow: Kpi["glow"], symbol: string): Kpi {
  const diff = series.previousValue !== null ? series.latestValue - series.previousValue : 0;
  return {
    title,
    value: series.latestValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    unit,
    change: changeLabel(diff, series.previousDate, (d) => d.toFixed(2)),
    trend: diff >= 0 ? "up" : "down",
    glow,
    source: "Twelve Data",
    seriesId: symbol,
    latestDate: series.latestDate.split(/[ T]/)[0], // "2026-06-12 00:00:00" → "2026-06-12"
    frequency: "Daily",
    marketType: "global-market",
  };
}

/** Gold spot price (XAU/USD), in USD per troy ounce. */
export async function getGoldKpi(): Promise<Kpi> {
  try {
    const series = await fetchTwelveDataSeries(SYMBOLS.gold);
    return buildKpi(series, "Gold", "$/oz", "blue", SYMBOLS.gold);
  } catch { /* fall through to Yahoo Finance */ }
  return (await getYfGoldKpi()) ?? fallbackGoldKpi;
}

/** Silver spot price (XAG/USD), in USD per troy ounce. */
export async function getSilverKpi(): Promise<Kpi> {
  try {
    const series = await fetchTwelveDataSeries(SYMBOLS.silver);
    return buildKpi(series, "Silver", "$/oz", "purple", SYMBOLS.silver);
  } catch { /* fall through to Yahoo Finance */ }
  return (await getYfSilverKpi()) ?? fallbackSilverKpi;
}

/** ICE US Dollar Index (DXY). */
export async function getDxyKpi(): Promise<Kpi> {
  try {
    const series = await fetchTwelveDataSeries(SYMBOLS.dxy);
    return buildKpi(series, "US Dollar Index", "DXY", "purple", SYMBOLS.dxy);
  } catch { /* fall through to Yahoo Finance */ }
  return (await getYfDxyKpi()) ?? fallbackDxyKpi;
}
