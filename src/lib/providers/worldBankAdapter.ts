// World Bank provider adapter — Phase 8.2 pilot.
//
// Implements the Phase 8.1 ProviderAdapter contract against the World
// Bank's free, keyless Indicators API (https://api.worldbank.org/v2/...),
// the exact same endpoint src/lib/data/worldBank.ts already calls. This
// adapter is STANDALONE and NOT WIRED INTO PRODUCTION: nothing imports it
// except its own tests and the reconciliation fixtures, and it does not
// import from or modify src/lib/data/worldBank.ts. That file continues
// serving every existing consumer (KPI card, Comparisons, weekly
// intelligence, system health) completely unchanged.
//
// Pilot scope: exactly the three GDP-growth-by-country series PEIC's
// Comparisons feature already consumes via getGdpGrowthHistory() -- see
// WORLD_BANK_SERIES below. Population and GDP sector composition
// (getPopulation / getGdpSectorComposition) are explicitly NOT piloted --
// out of scope per the brief's "World Bank only, minimal pilot" framing.
//
// --- Provenance decisions (documented, not invented) ---
//
// releaseDate: always null. Confirmed via a live audit query (see Phase
// 8.2 report) that the API exposes no per-observation release date --
// only one per-QUERY `lastupdated` field for the whole indicator/country
// series, which is a database-freshness signal, not a per-observation
// release date.
//
// sourceUpdatedAt: derived from that same `lastupdated` field (e.g.
// "2026-07-13"), re-encoded as a full ISO-8601 timestamp
// ("2026-07-13T00:00:00.000Z") because the ProviderAdapter contract's
// validator requires a full timestamp, not a bare date. This is a
// lossless re-encoding of the exact string the API returned -- the
// semantic precision (day-level) is preserved, nothing more specific is
// implied or fabricated. The same value is applied to every observation
// returned by one query, since the API only reports freshness at that
// granularity.
//
// unit: NOT read from the API response. Confirmed live that the API's own
// per-observation `unit` field is an empty string for this indicator --
// exactly as unreliable as the existing worldBank.ts path already (silently)
// treats it: that file never reads it either, and hardcodes "%" wherever a
// unit is needed. This adapter does the same, via a declared per-indicator
// config value, not a fetched one.
//
// methodology: always null. The API exposes no methodology distinct from
// the indicator definition itself, and the existing PEIC path never
// represented one either -- there is nothing to preserve or invent.
//
// sourceReference: { endpoint, countryCode, indicatorCode } -- no API key
// exists for this endpoint (free, keyless), so there is nothing to redact.
// Still passes through validateNormalizedObservation's credential-shape
// scan like any other adapter's output would.
//
// --- Fetch strategy: deliberately ignores the sinceDate hint ---
//
// Unlike a monthly-cadence provider, World Bank's annual GDP growth figures
// are revised across MANY historical years at once when the underlying
// national-accounts estimates are updated (the single per-query
// `lastupdated` timestamp reflects this: World Bank does not track
// per-year revision dates). A 60-day incremental lookback window (the
// orchestrator's generic default, designed for monthly SBP-style series)
// would silently miss a revision to e.g. a five-year-old figure. Because
// this indicator's full history is tiny (~65 rows per country) and the
// endpoint is free, this adapter always fetches the FULL available history
// for a configured series and ignores `seriesRef.sinceDate` entirely --
// letting the orchestrator's own existing-vs-new diff naturally catch any
// revision, to any period, without the orchestrator needing to know
// anything provider-specific. This is an adapter-internal fetch-strategy
// choice, not a revision model: the adapter still does not decide what
// counts as "changed" or write anything -- see ingestionOrchestrator.ts.

import type { NormalizedObservation, ProviderAdapter } from "./providerAdapter";

const WORLD_BANK_BASE_URL = "https://api.worldbank.org/v2/country";
const FETCH_TIMEOUT_MS = 10_000;
const PER_PAGE = 1000;
// Safety bound against a pathological paging loop. One country/indicator's
// full annual history has never approached even a single 1000-row page
// (confirmed live: 66 rows total for Pakistan 1960-2025) -- this exists so
// a malformed/adversarial response can't spin the loop forever.
const MAX_PAGES = 10;

interface WorldBankPagingInfo {
  page: number;
  pages: number;
  per_page: number;
  total: number;
  lastupdated?: string;
}

interface WorldBankObservationRaw {
  date: string;
  value: number | null;
}

type WorldBankApiResponse = [WorldBankPagingInfo, WorldBankObservationRaw[] | null];

export interface WorldBankSeriesConfig {
  countryCode: string; // ISO-3, e.g. "PAK"
  indicatorCode: string; // e.g. "NY.GDP.MKTP.KD.ZG"
  unit: string;
  cadence: NormalizedObservation["cadence"];
}

/**
 * Phase 8.2 pilot set -- exactly the World Bank series already consumed by
 * PEIC's Comparisons feature (see WORLD_BANK_COUNTRY_BY_PROVIDER in
 * src/lib/comparisons/comparisonData.ts). This map is read only by this
 * standalone adapter; adding an entry here changes no production behavior.
 */
export const WORLD_BANK_SERIES: Record<string, WorldBankSeriesConfig> = {
  "worldbank:gdpGrowthPak": { countryCode: "PAK", indicatorCode: "NY.GDP.MKTP.KD.ZG", unit: "%", cadence: "annual" },
  "worldbank:gdpGrowthIndia": { countryCode: "IND", indicatorCode: "NY.GDP.MKTP.KD.ZG", unit: "%", cadence: "annual" },
  "worldbank:gdpGrowthBangladesh": { countryCode: "BGD", indicatorCode: "NY.GDP.MKTP.KD.ZG", unit: "%", cadence: "annual" },
};

/** Re-encodes a bare "YYYY-MM-DD" (or "YYYY") lastupdated value as a full ISO-8601 timestamp. Returns null for anything unparseable rather than guessing. */
function toIsoTimestamp(dateOnly: string | undefined): string | null {
  if (!dateOnly) return null;
  const d = new Date(`${dateOnly}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

/**
 * World Bank annual observations are year-only ("2025"). Normalized to the
 * last calendar day of that year -- an explicit, documented Phase 8.2
 * decision (no prior annual-cadence convention exists elsewhere in this
 * codebase to inherit; World Bank is the first annual-cadence provider
 * considered for the canonical ledger). Flagged in the Phase 8.2 report as
 * an architectural decision for explicit approval before a second
 * annual-cadence provider reuses it.
 */
export function yearToObservationPeriod(year: string): string {
  return `${year}-12-31`;
}

const YEAR_RE = /^\d{4}$/;

async function fetchPage(countryCode: string, indicatorCode: string, page: number): Promise<WorldBankApiResponse> {
  const url = `${WORLD_BANK_BASE_URL}/${countryCode}/indicator/${indicatorCode}?format=json&per_page=${PER_PAGE}&page=${page}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!response.ok) {
    throw new Error(`World Bank API returned ${response.status} for ${indicatorCode} (${countryCode}), page ${page}`);
  }
  const json = (await response.json()) as unknown;
  if (!Array.isArray(json) || json.length !== 2 || typeof json[0] !== "object" || json[0] === null) {
    throw new Error(`World Bank API returned a malformed response shape for ${indicatorCode} (${countryCode})`);
  }
  return json as WorldBankApiResponse;
}

export function buildWorldBankSourceReference(countryCode: string, indicatorCode: string): Record<string, unknown> {
  return {
    endpoint: `${WORLD_BANK_BASE_URL}/${countryCode}/indicator/${indicatorCode}`,
    countryCode,
    indicatorCode,
  };
}

/**
 * Fetches every available observation for one configured World Bank
 * series, normalizing into the Phase 8.1 NormalizedObservation contract.
 * Never retries (see ingestionOrchestrator.ts -- retries are the
 * orchestrator's responsibility, not the adapter's); throws on any
 * transport, shape, or HTTP failure.
 */
export async function fetchWorldBankSeries(indicatorKey: string, config: WorldBankSeriesConfig): Promise<NormalizedObservation[]> {
  const { countryCode, indicatorCode, unit, cadence } = config;

  let lastUpdated: string | undefined;
  const rawObservations: WorldBankObservationRaw[] = [];

  let page = 1;
  for (; page <= MAX_PAGES; page++) {
    const [paging, observations] = await fetchPage(countryCode, indicatorCode, page);
    lastUpdated = paging.lastupdated ?? lastUpdated;
    if (observations) rawObservations.push(...observations);
    if (page >= paging.pages) break;
  }
  if (page > MAX_PAGES) {
    throw new Error(`World Bank API paging exceeded ${MAX_PAGES} pages for ${indicatorCode} (${countryCode}) -- aborting rather than looping unboundedly`);
  }

  const sourceUpdatedAt = toIsoTimestamp(lastUpdated);
  const sourceReference = buildWorldBankSourceReference(countryCode, indicatorCode);

  // Newest-first from the API. Drop nulls (years without a published
  // value yet) and malformed year strings; de-duplicate by keeping the
  // FIRST occurrence encountered in this newest-first order (a real
  // duplicate has never been observed live, but a deterministic rule is
  // defined and tested regardless of whether the API would ever exercise it).
  const seenPeriods = new Set<string>();
  const deduped: { observationPeriod: string; value: number }[] = [];
  for (const obs of rawObservations) {
    if (obs.value === null || obs.value === undefined) continue; // legitimate "not yet published" -- matches worldBank.ts's existing null-filter behavior
    if (typeof obs.value !== "number" || !Number.isFinite(obs.value)) {
      throw new Error(`World Bank API returned a non-numeric value for ${indicatorCode} (${countryCode}) at "${obs.date}": ${JSON.stringify(obs.value)}`);
    }
    if (!YEAR_RE.test(obs.date)) {
      throw new Error(`World Bank API returned an unrecognized date "${obs.date}" for ${indicatorCode} (${countryCode}) -- expected a bare 4-digit year`);
    }
    const observationPeriod = yearToObservationPeriod(obs.date);
    if (seenPeriods.has(observationPeriod)) continue;
    seenPeriods.add(observationPeriod);
    deduped.push({ observationPeriod, value: obs.value });
  }

  // Ascending (oldest -> newest) -- ingestionOrchestrator.ts assumes this
  // ordering when computing latestPeriod from the last array element,
  // exactly mirroring src/lib/data/worldBank.ts's own existing .reverse().
  deduped.sort((a, b) => (a.observationPeriod < b.observationPeriod ? -1 : a.observationPeriod > b.observationPeriod ? 1 : 0));

  return deduped.map((obs) => ({
    indicatorKey,
    observationPeriod: obs.observationPeriod,
    value: obs.value,
    unit,
    cadence,
    provider: "world-bank",
    sourceSeriesId: indicatorCode,
    qualityStatus: "official",
    releaseDate: null,
    sourceUpdatedAt,
    sourceReference,
    methodology: null,
  }));
}

export const worldBankAdapter: ProviderAdapter = {
  providerId: "world-bank",
  async fetchObservations({ indicatorKey }) {
    const config = WORLD_BANK_SERIES[indicatorKey];
    if (!config) {
      throw new Error(`worldBankAdapter: no series configuration for indicatorKey "${indicatorKey}" -- pilot scope is limited to ${Object.keys(WORLD_BANK_SERIES).join(", ")}`);
    }
    return fetchWorldBankSeries(indicatorKey, config);
  },
};
