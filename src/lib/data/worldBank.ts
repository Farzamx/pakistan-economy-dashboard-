import type { TrendPoint } from "@/components/charts/TrendLineChart";
import { fallbackGdpKpi, type Kpi } from "@/data/kpiData";
import { dedupeInFlight, getFresh, getStale, setCache } from "@/lib/memoryCache";
import { getTrendDirection } from "@/lib/trendDirection";
import { getCanonicalWorldBankHistory } from "@/lib/data/worldBankCanonicalStore";
import { getSeriesDefinition } from "@/lib/freshness/seriesRegistry";
import { evaluateFreshness, type FreshnessResult } from "@/lib/freshness/freshnessEngine";
import { yearToObservationPeriod } from "@/lib/providers/worldBankAdapter";

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

// ── Phase 8.3: canonical-DB-backed read path for the 3 migrated GDP-growth
// series (Pakistan/India/Bangladesh) — see src/lib/providers/worldBankAdapter.ts's
// WORLD_BANK_SERIES for the exact indicator keys and
// src/lib/data/worldBankCanonicalStore.ts for the read RPC. Population and
// GDP sector composition are explicitly NOT migrated — fetchIndicator()
// above remains their only source, completely unchanged.
//
// WorldBankCountryCode's three values are, not coincidentally, exactly the
// migrated set — every getGdpGrowthHistory() call is now DB-backed.
const MIGRATED_GDP_GROWTH_INDICATOR_KEYS: Record<WorldBankCountryCode, string> = {
  PAK: "worldbank:gdpGrowthPak",
  IND: "worldbank:gdpGrowthIndia",
  BGD: "worldbank:gdpGrowthBangladesh",
};

/**
 * The single place a World Bank GDP-growth observation is joined to its
 * authoritative freshness verdict (Phase 6/8.3) — reuses evaluateFreshness()
 * directly, the one freshness algorithm in this codebase, never
 * reimplemented. Real evidence (sourceUpdatedAt/fetchedAt/vintage) is
 * passed through when genuinely available (the canonical-DB path has it;
 * the live-API-fallback and static-fallback paths honestly do not, and
 * pass null rather than inventing it — same evidence discipline as
 * evaluateSbpFreshness in sbp.ts).
 */
export function evaluateWorldBankFreshness(
  indicatorKey: string,
  observationPeriod: string | null,
  evidence: { sourceUpdatedAt?: string | null; fetchedAt?: string | null; vintage?: string | null } = {},
  now: Date = new Date(),
): FreshnessResult {
  const def = getSeriesDefinition(indicatorKey);
  if (!def) {
    throw new Error(`evaluateWorldBankFreshness: no series definition registered for "${indicatorKey}" — see seriesRegistry.ts`);
  }
  return evaluateFreshness(
    {
      observationPeriod,
      value: null,
      releaseDate: null,
      sourceUpdatedAt: evidence.sourceUpdatedAt ?? null,
      fetchedAt: evidence.fetchedAt ?? null,
      vintage: evidence.vintage ?? null,
    },
    def,
    { now },
  );
}

/**
 * DB-backed IndicatorSeries builder — reads canonical_observations
 * (populated by scripts/ingestWorldBank.ts) instead of calling the World
 * Bank API. Throws when no canonical row has ever been ingested for this
 * country yet; callers treat that identically to a live-fetch failure —
 * fall through to the live API, exactly the sole path that existed before
 * this migration.
 *
 * Output shape deliberately unchanged from the pre-migration live-API
 * builder: latestYear/previousYear/history[].month all stay bare
 * "YYYY" strings (never the DB's "YYYY-12-31") — consumers never become
 * aware of the migration through this function's return shape.
 */
async function fetchCanonicalGrowthSeries(countryCode: WorldBankCountryCode): Promise<IndicatorSeries> {
  const indicatorKey = MIGRATED_GDP_GROWTH_INDICATOR_KEYS[countryCode];
  const rows = await getCanonicalWorldBankHistory(indicatorKey, 100);
  if (rows.length === 0) {
    throw new Error(`No canonical observations ingested yet for ${indicatorKey} — run scripts/ingestWorldBank.ts`);
  }
  const latest = rows[rows.length - 1];
  const previous = rows.length > 1 ? rows[rows.length - 2] : null;
  return {
    latestValue: latest.value,
    latestYear: latest.observationPeriod.slice(0, 4),
    previousValue: previous?.value ?? null,
    previousYear: previous ? previous.observationPeriod.slice(0, 4) : null,
    history: rows.map((r) => ({ month: r.observationPeriod.slice(0, 4), value: r.value })),
  };
}

/** Same as fetchCanonicalGrowthSeries, but also returns the latest row's full provenance for freshness evaluation (the plain IndicatorSeries shape has no room for it — see that function's own comment on why latestYear stays a bare string). */
async function fetchCanonicalGdpKpiSeries(): Promise<{ series: IndicatorSeries; latestObservationPeriod: string; sourceUpdatedAt: string | null; fetchedAt: string | null; vintage: string }> {
  const indicatorKey = MIGRATED_GDP_GROWTH_INDICATOR_KEYS.PAK;
  const rows = await getCanonicalWorldBankHistory(indicatorKey, 5);
  if (rows.length === 0) {
    throw new Error(`No canonical observations ingested yet for ${indicatorKey} — run scripts/ingestWorldBank.ts`);
  }
  const latest = rows[rows.length - 1];
  const previous = rows.length > 1 ? rows[rows.length - 2] : null;
  return {
    series: {
      latestValue: latest.value,
      latestYear: latest.observationPeriod.slice(0, 4),
      previousValue: previous?.value ?? null,
      previousYear: previous ? previous.observationPeriod.slice(0, 4) : null,
      history: rows.map((r) => ({ month: r.observationPeriod.slice(0, 4), value: r.value })),
    },
    latestObservationPeriod: latest.observationPeriod,
    sourceUpdatedAt: latest.sourceUpdatedAt,
    fetchedAt: latest.fetchedAt,
    vintage: latest.vintage,
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

const GDP_KPI_CACHE_KEY = "worldbank-gdp-kpi";

/**
 * Fetches the GDP growth KPI (the only headline indicator still sourced from
 * the World Bank — the rest come from SBP EasyData, see src/lib/data/sbp.ts).
 *
 * Phase 8.3: now DB-first. Four-tier resolution, each tier stamping an
 * authoritative freshness verdict (evaluateWorldBankFreshness — Phase 6):
 *  1. Canonical DB read (fetchCanonicalGdpKpiSeries — migration 0050/0051,
 *     populated by scripts/ingestWorldBank.ts). Labeled "live": exactly as
 *     current as the last successful ingestion run, matching sbp.ts's own
 *     getSbpIndicator() precedent for calling a DB read "live".
 *  2. DB read failed or empty (e.g. ingestion never run yet): falls back to
 *     the live World Bank API — fetchIndicator(), the ONLY path that
 *     existed before this migration. Deliberately kept as a fallback tier
 *     rather than removed: unlike SBP EasyData (Cloudflare-blocked from
 *     every shared cloud network this project has tested), the World Bank
 *     API has no such block, so dropping this tier would make the system
 *     strictly more fragile than it was pre-migration, not just
 *     differently architected. Also labeled "live" — it genuinely is.
 *  3. Both failed: last-known-good L1 cache regardless of age
 *     ("cache-stale" — unchanged from the pre-8.3 behavior).
 *  4. Nothing cached either: the static, dateless fallbackGdpKpi
 *     ("fallback" — unchanged from the pre-8.3 behavior). World Bank
 *     updates a few times a year, so a single transient failure at both
 *     the DB and the live API would otherwise visibly regress a live 2025
 *     figure to the hardcoded "2.5% (2023)" snapshot — this tier exists
 *     for the rare case neither tier 1 nor 2 has ever succeeded at all.
 */
export async function getGdpKpi(): Promise<Kpi> {
  const indicatorKey = MIGRATED_GDP_GROWTH_INDICATOR_KEYS.PAK;

  try {
    const { series, latestObservationPeriod, sourceUpdatedAt, fetchedAt, vintage } = await fetchCanonicalGdpKpiSeries();
    const freshness = evaluateWorldBankFreshness(indicatorKey, latestObservationPeriod, { sourceUpdatedAt, fetchedAt, vintage });
    const kpi: Kpi = { ...buildGdpKpi(series), sourceStatus: "live", freshness };
    setCache(GDP_KPI_CACHE_KEY, kpi);
    return kpi;
  } catch (dbErr) {
    console.error(`[worldBank] canonical DB read failed for ${indicatorKey}, falling back to live API: ${dbErr instanceof Error ? dbErr.message : String(dbErr)}`);
    try {
      const series = await fetchIndicator(INDICATORS.gdpGrowth);
      const freshness = evaluateWorldBankFreshness(indicatorKey, yearToObservationPeriod(series.latestYear), { vintage: new Date().toISOString() });
      const kpi: Kpi = { ...buildGdpKpi(series), sourceStatus: "live", freshness };
      setCache(GDP_KPI_CACHE_KEY, kpi);
      return kpi;
    } catch (liveErr) {
      console.error(`[worldBank] live API fetch also failed for GDP growth: ${liveErr instanceof Error ? liveErr.message : String(liveErr)}`);
      const stale = getStale<Kpi>(GDP_KPI_CACHE_KEY);
      if (stale) return { ...stale.data, sourceStatus: "cache-stale" };
      const freshness = evaluateWorldBankFreshness(indicatorKey, yearToObservationPeriod(fallbackGdpKpi.latestDate!));
      return { ...fallbackGdpKpi, freshness };
    }
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
 * Annual real GDP growth (% YoY) for Pakistan, India, or Bangladesh —
 * WorldBankCountryCode's three values are exactly the Phase 8.3 migrated
 * set, so every call is now DB-backed. Returns null on failure rather than
 * fabricating a fallback series, since unlike the single-headline KPI
 * there's no pre-vetted static snapshot for India/Bangladesh to fall back
 * to — unchanged from the pre-migration contract.
 *
 * Phase 8.3: DB-first (fetchCanonicalGrowthSeries — full ~65-year history,
 * every call), falling back to the live World Bank API (fetchIndicator,
 * `mrv=30`) only if the DB read fails or no ingestion has ever run for
 * that country — the exact same live-API call that was this function's
 * ONLY source before this migration, preserved as a fallback tier for the
 * same resilience reasons documented on getGdpKpi() above. Still returns
 * null (never a fabricated series) if both fail, exactly as before.
 *
 * Memoized (memoryCache.ts, TTL = REVALIDATE_SECONDS) so Pakistan's GDP
 * growth series — used by both the India and Bangladesh comparisons in the
 * same /comparisons render — is fetched once per country, not once per
 * comparison. Only successful results are cached; a transient failure is
 * never "frozen" as null for the full TTL, so the next call still retries.
 */
export async function getGdpGrowthHistory(
  countryCode: WorldBankCountryCode,
): Promise<IndicatorSeries | null> {
  const cacheKey = `worldbank-gdp-growth-history:${countryCode}`;
  const cached = getFresh<IndicatorSeries>(cacheKey, REVALIDATE_SECONDS * 1000);
  if (cached) return cached.data;

  return dedupeInFlight(cacheKey, async () => {
    try {
      const result = await fetchCanonicalGrowthSeries(countryCode);
      setCache(cacheKey, result);
      return result;
    } catch (dbErr) {
      console.error(`[worldBank] canonical DB read failed for ${countryCode} growth history, falling back to live API: ${dbErr instanceof Error ? dbErr.message : String(dbErr)}`);
      try {
        const result = await fetchIndicator(INDICATORS.gdpGrowth, countryCode, 30);
        setCache(cacheKey, result);
        return result;
      } catch {
        return null;
      }
    }
  });
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
