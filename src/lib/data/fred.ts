import type { Kpi } from "@/data/kpiData";
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

// All series are read from the St. Louis Fed's FRED API:
// https://api.stlouisfed.org/fred/series/observations?series_id=...&api_key=...
//
// The API key is a secret and must only ever be read from the server-side
// environment — never hardcoded, never exposed to the client.
const FRED_BASE_URL = "https://api.stlouisfed.org/fred/series/observations";

// These are daily series, so re-checking once a day is more than enough.
const REVALIDATE_SECONDS = 60 * 60 * 24; // 24h

const SERIES_IDS = {
  wti: "DCOILWTICO", // Crude Oil Prices: West Texas Intermediate (Cushing, OK)
  brent: "DCOILBRENTEU", // Crude Oil Prices: Brent - Europe
  naturalGas: "DHHNGSP", // Henry Hub Natural Gas Spot Price
  us10y: "DGS10", // Market Yield on U.S. Treasury Securities at 10-Year Constant Maturity
  fedFunds: "DFF", // Federal Funds Effective Rate
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
async function fetchFredSeries(seriesId: string): Promise<FredSeries> {
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

  const response = await fetch(`${FRED_BASE_URL}?${params.toString()}`, {
    next: { revalidate: REVALIDATE_SECONDS },
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
  };
}

/** West Texas Intermediate crude oil spot price, in USD per barrel. */
export async function getWtiKpi(): Promise<Kpi> {
  try {
    const series = await fetchFredSeries(SERIES_IDS.wti);
    return buildKpi(series, "WTI Crude", "$/bbl", "blue", 2, SERIES_IDS.wti);
  } catch { /* fall through to Yahoo Finance */ }
  return (await getYfWtiKpi()) ?? fallbackWtiKpi;
}

/** Brent crude oil spot price, in USD per barrel. */
export async function getBrentKpi(): Promise<Kpi> {
  try {
    const series = await fetchFredSeries(SERIES_IDS.brent);
    return buildKpi(series, "Brent Crude", "$/bbl", "purple", 2, SERIES_IDS.brent);
  } catch { /* fall through to Yahoo Finance */ }
  return (await getYfBrentKpi()) ?? fallbackBrentKpi;
}

/** Henry Hub natural gas spot price, in USD per MMBtu. */
export async function getNaturalGasKpi(): Promise<Kpi> {
  try {
    const series = await fetchFredSeries(SERIES_IDS.naturalGas);
    return buildKpi(series, "Natural Gas", "$/MMBtu", "blue", 2, SERIES_IDS.naturalGas);
  } catch { /* fall through to Yahoo Finance */ }
  return (await getYfNaturalGasKpi()) ?? fallbackNatGasKpi;
}

/** US 10-Year Treasury constant maturity yield, in percent. */
export async function getUs10yKpi(): Promise<Kpi> {
  try {
    const series = await fetchFredSeries(SERIES_IDS.us10y);
    return buildKpi(series, "US 10Y Treasury", "%", "blue", 2, SERIES_IDS.us10y);
  } catch { /* fall through to Yahoo Finance */ }
  return (await getYfUs10yKpi()) ?? fallbackUs10yKpi;
}

/** US Federal Funds effective rate, in percent.
 *  FRED is the authoritative source; no free keyless alternative exists.
 *  The rate only changes 8 times/year so the fallback stays accurate
 *  between FOMC meetings. */
export async function getFedFundsKpi(): Promise<Kpi> {
  try {
    const series = await fetchFredSeries(SERIES_IDS.fedFunds);
    return buildKpi(series, "Fed Funds Rate", "%", "purple", 2, SERIES_IDS.fedFunds);
  } catch {
    return fallbackFedFundsKpi;
  }
}
