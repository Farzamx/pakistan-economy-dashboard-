import type { TrendPoint } from "@/components/charts/TrendLineChart";
import { fallbackGdpKpi, type Kpi } from "@/data/kpiData";
import { dedupeInFlight, getFresh, setCache } from "@/lib/memoryCache";
import { getTrendDirection } from "@/lib/trendDirection";

// All indicators are read from the free, keyless World Bank API:
// https://api.worldbank.org/v2/country/{ISO3}/indicator/{code}?format=json&mrv=10
const WORLD_BANK_BASE_URL = "https://api.worldbank.org/v2/country";

// World Bank annual indicators are refreshed a few times a year at most —
// re-fetching once a day is more than enough.
const REVALIDATE_SECONDS = 60 * 60 * 24;

// fetch() has no default timeout — without this, a stalled connection hangs
// for undici's ~5 minute default instead of falling into the existing
// try/catch error handling.
const FETCH_TIMEOUT_MS = 10_000;

const INDICATORS = {
  gdpGrowth: "NY.GDP.MKTP.KD.ZG",
  population: "SP.POP.TOTL",
  agricultureValueAddedPct: "NV.AGR.TOTL.ZS",
  industryValueAddedPct: "NV.IND.TOTL.ZS",
  servicesValueAddedPct: "NV.SRV.TOTL.ZS",
} as const;

/** ISO-3 country codes used by the comparisons feature for international GDP growth comparisons. */
export type WorldBankCountryCode = "PAK" | "IND" | "BGD";

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

async function fetchIndicator(
  code: string,
  countryCode: WorldBankCountryCode = "PAK",
  mostRecentValues = 10,
): Promise<IndicatorSeries> {
  const url = `${WORLD_BANK_BASE_URL}/${countryCode}/indicator/${code}?format=json&mrv=${mostRecentValues}`;
  const response = await fetch(url, {
    next: { revalidate: REVALIDATE_SECONDS },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`World Bank API returned ${response.status} for ${code} (${countryCode})`);
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

function changeLabel(diff: number | null, previousYear: string | null, format: (value: number) => string): string {
  if (previousYear === null || diff === null) {
    return "no prior-year data";
  }
  const sign = diff >= 0 ? "+" : "";
  return `${sign}${format(diff)} vs ${previousYear}`;
}

function buildGdpKpi(series: IndicatorSeries): Kpi {
  const diff = series.previousValue !== null ? series.latestValue - series.previousValue : null;
  return {
    title: "GDP Growth",
    value: series.latestValue.toFixed(1),
    unit: "%",
    change: changeLabel(diff, series.previousYear, (d) => `${d.toFixed(1)} pp`),
    trend: getTrendDirection(diff),
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

// --- Comparisons feature: international GDP growth + sector composition ---

/**
 * Annual real GDP growth (% YoY) for Pakistan, India, or Bangladesh, with up
 * to ~30 years of history (World Bank's `mrv` parameter — same free, keyless
 * endpoint already used for the headline GDP Growth KPI). Returns null on
 * failure rather than fabricating a fallback series, since unlike the
 * single-headline KPI there's no pre-vetted static snapshot for India/
 * Bangladesh to fall back to.
 *
 * Memoized (memoryCache.ts, TTL = REVALIDATE_SECONDS, same window the
 * underlying fetch() already uses) so Pakistan's GDP growth series — used by
 * both the India and Bangladesh comparisons in the same /comparisons render
 * — is fetched once per country, not once per comparison. Only successful
 * results are cached; a transient failure is never "frozen" as null for the
 * full TTL, so the next call still retries live.
 */
export async function getGdpGrowthHistory(
  countryCode: WorldBankCountryCode,
): Promise<IndicatorSeries | null> {
  const cacheKey = `worldbank-gdp-growth-history:${countryCode}`;
  const cached = getFresh<IndicatorSeries>(cacheKey, REVALIDATE_SECONDS * 1000);
  if (cached) return cached.data;

  try {
    return await dedupeInFlight(cacheKey, async () => {
      const result = await fetchIndicator(INDICATORS.gdpGrowth, countryCode, 30);
      setCache(cacheKey, result);
      return result;
    });
  } catch {
    return null;
  }
}

export interface GdpSectorComposition {
  agriculture: IndicatorSeries;
  industry: IndicatorSeries;
  services: IndicatorSeries;
}

/**
 * Pakistan's GDP composition by sector (agriculture / industry / services,
 * each as % of GDP), up to ~30 years of annual history. Used as the
 * Comparisons feature's substitute for stock-market "sector performance"
 * (Banking/Cement/Oil & Gas/etc.), which has no available data source in
 * this project — see the Phase 1 feasibility audit. This is a genuinely
 * different metric (economic structure, not equity returns) and is labeled
 * as such everywhere it's shown.
 */
export async function getGdpSectorComposition(): Promise<GdpSectorComposition | null> {
  const cacheKey = "worldbank-gdp-sector-composition";
  const cached = getFresh<GdpSectorComposition>(cacheKey, REVALIDATE_SECONDS * 1000);
  if (cached) return cached.data;

  try {
    return await dedupeInFlight(cacheKey, async () => {
      const [agriculture, industry, services] = await Promise.all([
        fetchIndicator(INDICATORS.agricultureValueAddedPct, "PAK", 30),
        fetchIndicator(INDICATORS.industryValueAddedPct, "PAK", 30),
        fetchIndicator(INDICATORS.servicesValueAddedPct, "PAK", 30),
      ]);
      const result = { agriculture, industry, services };
      setCache(cacheKey, result);
      return result;
    });
  } catch {
    return null;
  }
}
