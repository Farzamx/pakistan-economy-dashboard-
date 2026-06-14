import type { TrendPoint } from "@/components/charts/TrendLineChart";
import { fallbackKpiData, type Kpi } from "@/data/kpiData";
import { fallbackInflationTrend } from "@/data/inflationTrendData";
import { fallbackReservesTrend } from "@/data/reservesTrendData";

// All indicators are read for Pakistan from the free, keyless World Bank API:
// https://api.worldbank.org/v2/country/PAK/indicator/{code}?format=json&mrv=10
const WORLD_BANK_BASE_URL = "https://api.worldbank.org/v2/country/PAK/indicator";

// World Bank annual indicators are refreshed a few times a year at most —
// re-fetching once a day is more than enough.
const REVALIDATE_SECONDS = 60 * 60 * 24;

const INDICATORS = {
  gdpGrowth: "NY.GDP.MKTP.KD.ZG",
  inflation: "FP.CPI.TOTL.ZG",
  foreignReserves: "FI.RES.TOTL.CD",
  exchangeRate: "PA.NUS.FCRF",
  remittances: "BX.TRF.PWKR.CD.DT",
  population: "SP.POP.TOTL",
} as const;

interface WorldBankObservation {
  date: string;
  value: number | null;
}

// The API responds with a 2-element array: [pagingInfo, observations].
type WorldBankResponse = [unknown, WorldBankObservation[] | null];

export interface IndicatorSeries {
  latestValue: number;
  latestYear: string;
  previousValue: number | null;
  previousYear: string | null;
  /** Oldest -> newest, non-null values only. */
  history: TrendPoint[];
}

async function fetchIndicator(code: string): Promise<IndicatorSeries> {
  const url = `${WORLD_BANK_BASE_URL}/${code}?format=json&mrv=10`;
  const response = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });

  if (!response.ok) {
    throw new Error(`World Bank API returned ${response.status} for ${code}`);
  }

  const json = (await response.json()) as WorldBankResponse;
  const observations = json[1];

  if (!observations || observations.length === 0) {
    throw new Error(`World Bank API returned no data for ${code}`);
  }

  // The API returns newest-first and includes nulls for years without data
  // yet; drop the nulls and reverse to oldest-first for charting.
  const points = observations
    .filter((obs): obs is { date: string; value: number } => obs.value !== null)
    .reverse();

  if (points.length === 0) {
    throw new Error(`World Bank API returned only null values for ${code}`);
  }

  const latest = points[points.length - 1];
  const previous = points.length > 1 ? points[points.length - 2] : null;

  return {
    latestValue: latest.value,
    latestYear: latest.date,
    previousValue: previous?.value ?? null,
    previousYear: previous?.date ?? null,
    history: points.map((point) => ({ month: point.date, value: point.value })),
  };
}

function changeLabel(diff: number, previousYear: string | null, format: (value: number) => string): string {
  if (previousYear === null) {
    return "no prior-year data";
  }
  const sign = diff >= 0 ? "+" : "";
  return `${sign}${format(diff)} vs ${previousYear}`;
}

function buildGdpKpi(series: IndicatorSeries): Kpi {
  const diff = series.previousValue !== null ? series.latestValue - series.previousValue : 0;
  return {
    title: "GDP Growth",
    value: series.latestValue.toFixed(1),
    unit: "%",
    change: changeLabel(diff, series.previousYear, (d) => `${d.toFixed(1)} pp`),
    trend: diff >= 0 ? "up" : "down",
    glow: "blue",
  };
}

function buildInflationKpi(series: IndicatorSeries): Kpi {
  const diff = series.previousValue !== null ? series.latestValue - series.previousValue : 0;
  return {
    title: "Inflation",
    value: series.latestValue.toFixed(1),
    unit: "%",
    change: changeLabel(diff, series.previousYear, (d) => `${d.toFixed(1)} pp`),
    trend: diff >= 0 ? "up" : "down",
    glow: "purple",
  };
}

function buildReservesKpi(series: IndicatorSeries): Kpi {
  const latestBillions = series.latestValue / 1e9;
  const diffBillions =
    series.previousValue !== null ? (series.latestValue - series.previousValue) / 1e9 : 0;
  return {
    title: "Foreign Reserves",
    value: latestBillions.toFixed(1),
    unit: "B USD",
    change: changeLabel(diffBillions, series.previousYear, (d) => `${d.toFixed(1)}B`),
    trend: diffBillions >= 0 ? "up" : "down",
    glow: "blue",
  };
}

function buildExchangeRateKpi(series: IndicatorSeries): Kpi {
  const diff = series.previousValue !== null ? series.latestValue - series.previousValue : 0;
  return {
    title: "USD / PKR",
    value: series.latestValue.toFixed(2),
    unit: "PKR",
    change: changeLabel(diff, series.previousYear, (d) => d.toFixed(2)),
    trend: diff >= 0 ? "up" : "down",
    glow: "purple",
  };
}

function buildRemittancesKpi(series: IndicatorSeries): Kpi {
  const latestBillions = series.latestValue / 1e9;
  const pctDiff =
    series.previousValue && series.previousValue !== 0
      ? ((series.latestValue - series.previousValue) / series.previousValue) * 100
      : 0;
  return {
    title: "Remittances",
    value: latestBillions.toFixed(1),
    unit: "B USD",
    change: changeLabel(pctDiff, series.previousYear, (d) => `${d.toFixed(1)}%`),
    trend: pctDiff >= 0 ? "up" : "down",
    glow: "blue",
  };
}

/**
 * Fetches the 5 headline KPI values from the World Bank. Each indicator is
 * fetched independently — if one fails, only that card falls back to its
 * last-known value instead of breaking the whole dashboard.
 */
export async function getKpiData(): Promise<Kpi[]> {
  const [gdp, inflation, reserves, exchangeRate, remittances] = await Promise.allSettled([
    fetchIndicator(INDICATORS.gdpGrowth),
    fetchIndicator(INDICATORS.inflation),
    fetchIndicator(INDICATORS.foreignReserves),
    fetchIndicator(INDICATORS.exchangeRate),
    fetchIndicator(INDICATORS.remittances),
  ]);

  return [
    gdp.status === "fulfilled" ? buildGdpKpi(gdp.value) : fallbackKpiData[0],
    inflation.status === "fulfilled" ? buildInflationKpi(inflation.value) : fallbackKpiData[1],
    reserves.status === "fulfilled" ? buildReservesKpi(reserves.value) : fallbackKpiData[2],
    exchangeRate.status === "fulfilled" ? buildExchangeRateKpi(exchangeRate.value) : fallbackKpiData[3],
    remittances.status === "fulfilled" ? buildRemittancesKpi(remittances.value) : fallbackKpiData[4],
  ];
}

/** 10-year inflation history for the Inflation section's trend chart. */
export async function getInflationTrend(): Promise<TrendPoint[]> {
  try {
    const series = await fetchIndicator(INDICATORS.inflation);
    return series.history.map((point) => ({ month: point.month, value: Number(point.value.toFixed(1)) }));
  } catch {
    return fallbackInflationTrend;
  }
}

/** 10-year foreign reserves history (in billions of USD) for the Reserves section's trend chart. */
export async function getReservesTrend(): Promise<TrendPoint[]> {
  try {
    const series = await fetchIndicator(INDICATORS.foreignReserves);
    return series.history.map((point) => ({
      month: point.month,
      value: Number((point.value / 1e9).toFixed(1)),
    }));
  } catch {
    return fallbackReservesTrend;
  }
}

/**
 * Pakistan's total population. Not yet displayed on the dashboard — kept
 * here so a future KPI card or per-capita stat can use it without adding a
 * new fetch.
 */
export async function getPopulation(): Promise<IndicatorSeries | null> {
  try {
    return await fetchIndicator(INDICATORS.population);
  } catch {
    return null;
  }
}
