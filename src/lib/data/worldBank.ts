import type { TrendPoint } from "@/components/charts/TrendLineChart";
import { fallbackGdpKpi, type Kpi } from "@/data/kpiData";

// All indicators are read for Pakistan from the free, keyless World Bank API:
// https://api.worldbank.org/v2/country/PAK/indicator/{code}?format=json&mrv=10
const WORLD_BANK_BASE_URL = "https://api.worldbank.org/v2/country/PAK/indicator";

// World Bank annual indicators are refreshed a few times a year at most —
// re-fetching once a day is more than enough.
const REVALIDATE_SECONDS = 60 * 60 * 24;

const INDICATORS = {
  gdpGrowth: "NY.GDP.MKTP.KD.ZG",
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
    source: "World Bank",
    seriesId: "NY.GDP.MKTP.KD.ZG",
    latestDate: series.latestYear,   // "2024" — annual, year-only
    frequency: "Annual",
  };
}

/**
 * Fetches the GDP growth KPI (the only headline indicator still sourced from
 * the World Bank — the rest come from SBP EasyData, see src/lib/data/sbp.ts).
 */
export async function getGdpKpi(): Promise<Kpi> {
  try {
    const series = await fetchIndicator(INDICATORS.gdpGrowth);
    return buildGdpKpi(series);
  } catch {
    return fallbackGdpKpi;
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
