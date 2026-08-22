// FRED provider adapter — Phase 8.12 pilot.
//
// Implements the Phase 8.1 ProviderAdapter contract for EXACTLY the two
// FRED series already consumed by PEIC's Comparisons feature via
// src/lib/data/fred.ts's getFedFundsHistory / getUsCpiInflationHistory —
// the MONTHLY-TRANSFORMED derivatives of FRED's DFF and CPIAUCSL series,
// not either series' native daily/index form. This adapter is STANDALONE
// and NOT WIRED INTO PRODUCTION: nothing imports it except its own tests,
// scripts/ingestFred.ts, and reconciliation fixtures. It does not import
// from or modify src/lib/data/fred.ts, which continues serving every
// existing consumer (KPI cards, Comparisons, the US10Y SEO history chart)
// completely unchanged.
//
// Pilot scope: EXACTLY fred:fedFunds and fred:usCpiInflation. Native-daily
// DFF/DGS10 and the other four FRED series (DCOILWTICO, DCOILBRENTEU,
// DHHNGSP) are explicitly out of scope — the Phase 8.11 audit found no
// repository-evidenced daily-cadence graceDays policy, so nothing daily is
// canonicalized here.
//
// --- Transformation identity (Phase 8.11 binding decision) ---
// fred:fedFunds        = FRED series DFF, requested with frequency=m,
//                         aggregation_method=eop (monthly, end-of-period).
// fred:usCpiInflation  = FRED series CPIAUCSL, requested with units=pc1
//                         (year-over-year % change, computed server-side by
//                         FRED from the underlying index).
// indicatorKey — not source_series_id — is the logical identity: two
// observations sharing a source_series_id ("DFF") but different transform
// parameters are DIFFERENT logical series. source_series_id always stays
// the bare native FRED series_id; the transform parameters actually
// requested are recorded in source_reference so the exact request is
// auditable, never folded into or confused with source_series_id itself.
//
// --- Date semantics (Phase 8.12 live verification) ---
// A live, read-only GET against
// https://api.stlouisfed.org/fred/series/observations (see the Phase 8.12
// report's Section D) confirmed FRED labels every monthly-cadence
// observation returned here — both CPIAUCSL's units=pc1 output AND DFF's
// frequency=m/aggregation_method=eop output — with the FIRST day of the
// reference month ("2026-07-01" for July 2026), never the month's last
// day. Both series are therefore converted to their period's actual LAST
// calendar day before becoming this adapter's observationPeriod, matching
// the ProviderAdapter contract's period-END convention and mirroring
// worldBankAdapter.ts's yearToObservationPeriod precedent for the same
// kind of conversion.
//
// --- Provenance decisions (documented, not invented) ---
// releaseDate: always null. FRED's /observations endpoint exposes no
// release-date field distinct from the observation date itself.
// sourceUpdatedAt: always null. The same live verification found
// realtime_start/realtime_end present on every observation by default, but
// EQUAL TO THE QUERY DATE on every single row regardless of how old the
// observation's own period is (e.g. a May-2026 CPI observation carried
// realtime_start="2026-08-12", the day this was queried) — conclusive
// evidence these fields describe the vintage window valid AS OF THE QUERY,
// not a per-observation publication/update timestamp. Populating
// sourceUpdatedAt from them would fabricate a false "just updated" signal
// on every historical row on every ingestion run. Per the Phase 8.11
// audit's explicit warning not to equate the two, this adapter leaves
// sourceUpdatedAt null — there is no genuine per-observation source-update
// evidence here, unlike World Bank's per-query `lastupdated` field, which
// IS a real database-freshness signal.
// qualityStatus: always "official" — a declared constant, not a fetched
// field (FRED exposes none), matching worldBankAdapter.ts's identical
// choice.
// sourceReference: { endpoint, seriesId, frequency?, aggregationMethod?,
// units? } — never api_key. Passes validateNormalizedObservation's
// credential-shape scan like any other adapter's output.
//
// --- Fetch strategy: deliberately ignores the sinceDate hint ---
// CPIAUCSL is seasonally adjusted and FRED periodically revises seasonal
// factors across several PAST years at once (a well-documented, real
// characteristic of this series, distinct from a simple late-arriving
// monthly print) — the orchestrator's generic 60-day incremental lookback
// (designed for SBP-style single-period revisions) would silently miss a
// revision landing further back than that window. Mirroring
// worldBankAdapter.ts's identical reasoning for its own historically-wide
// revision pattern, this adapter always fetches each series' FULL
// available history and lets the orchestrator's existing-vs-new diff
// naturally catch any revision, to any period, without the orchestrator
// needing to know anything FRED-specific. Both series are small (a few
// hundred to ~800 monthly points), so this is cheap. This is an
// adapter-internal fetch-strategy choice, not a revision model — the
// adapter still does not decide what counts as "changed" or write
// anything.

import type { NormalizedObservation, ProviderAdapter } from "./providerAdapter";

const FRED_BASE_URL = "https://api.stlouisfed.org/fred/series/observations";
const FETCH_TIMEOUT_MS = 10_000;

interface FredObservationRaw {
  date: string;
  value: string;
}

interface FredApiResponse {
  observations: FredObservationRaw[];
}

export interface FredSeriesConfig {
  /** FRED's own native series_id — NOT the logical identity, see file header. */
  seriesId: string;
  unit: string;
  cadence: NormalizedObservation["cadence"];
  /** Extra query params this application requests beyond series_id/api_key/file_type/sort_order — the transformation that defines this logical series. */
  transformParams: Record<string, string>;
}

/**
 * Phase 8.12 pilot set — EXACTLY the two FRED series already consumed by
 * PEIC's Comparisons feature (src/lib/comparisons/comparisonData.ts,
 * fred:fedFunds / fred:usCpiInflation), each requested with the SAME
 * transform parameters src/lib/data/fred.ts's getFedFundsHistory /
 * getUsCpiInflationHistory already use. Do not add an entry here without a
 * new, explicitly-approved phase — see the Phase 8.11 audit for why every
 * other FRED series is out of scope.
 */
export const FRED_SERIES: Record<string, FredSeriesConfig> = {
  "fred:fedFunds": {
    seriesId: "DFF",
    unit: "%",
    cadence: "monthly",
    transformParams: { frequency: "m", aggregation_method: "eop" },
  },
  "fred:usCpiInflation": {
    seriesId: "CPIAUCSL",
    unit: "%",
    cadence: "monthly",
    transformParams: { units: "pc1" },
  },
};

/**
 * "YYYY-MM-01" -> "YYYY-MM-<lastDay>". FRED labels every monthly
 * observation this adapter requests with the first day of its reference
 * month (confirmed live — see file header); this converts to the
 * period-END convention NormalizedObservation.observationPeriod requires.
 */
export function monthStartToMonthEnd(dateStr: string): string {
  const [year, month] = dateStr.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}

export function buildFredSourceReference(config: FredSeriesConfig): Record<string, unknown> {
  const ref: Record<string, unknown> = { endpoint: FRED_BASE_URL, seriesId: config.seriesId };
  if (config.transformParams.frequency) ref.frequency = config.transformParams.frequency;
  if (config.transformParams.aggregation_method) ref.aggregationMethod = config.transformParams.aggregation_method;
  if (config.transformParams.units) ref.units = config.transformParams.units;
  return ref;
}

/**
 * Fetches one configured FRED series (already transformed server-side per
 * config.transformParams), normalizing into the Phase 8.1
 * NormalizedObservation contract. Never retries (see
 * ingestionOrchestrator.ts — retries are the orchestrator's
 * responsibility); throws on any transport, HTTP, or shape failure.
 */
export async function fetchFredSeries(indicatorKey: string, config: FredSeriesConfig): Promise<NormalizedObservation[]> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) throw new Error("FRED_API_KEY is not set");

  const params = new URLSearchParams({
    series_id: config.seriesId,
    api_key: apiKey,
    file_type: "json",
    sort_order: "asc",
    ...config.transformParams,
  });

  const response = await fetch(`${FRED_BASE_URL}?${params.toString()}`, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`FRED API returned ${response.status} for ${config.seriesId} (${indicatorKey})`);
  }

  const json = (await response.json()) as FredApiResponse;
  if (!Array.isArray(json.observations)) {
    throw new Error(`FRED API returned a malformed response shape for ${config.seriesId} (${indicatorKey})`);
  }

  const sourceReference = buildFredSourceReference(config);

  // FRED returns "." for a period without a published value yet (e.g. the
  // current in-progress month) — skipped, matching src/lib/data/fred.ts's
  // existing filter behavior.
  return json.observations
    .filter((obs) => obs.value !== "." && obs.value !== "")
    .map((obs) => {
      const value = Number(obs.value);
      if (!Number.isFinite(value)) {
        throw new Error(`FRED API returned a non-numeric value for ${config.seriesId} (${indicatorKey}) at "${obs.date}": ${JSON.stringify(obs.value)}`);
      }
      return {
        indicatorKey,
        observationPeriod: monthStartToMonthEnd(obs.date),
        value,
        unit: config.unit,
        cadence: config.cadence,
        provider: "fred",
        sourceSeriesId: config.seriesId,
        qualityStatus: "official",
        releaseDate: null,
        sourceUpdatedAt: null,
        sourceReference,
        methodology: null,
      };
    });
}

export const fredAdapter: ProviderAdapter = {
  providerId: "fred",
  async fetchObservations({ indicatorKey }) {
    const config = FRED_SERIES[indicatorKey];
    if (!config) {
      throw new Error(`fredAdapter: no series configuration for indicatorKey "${indicatorKey}" — pilot scope is limited to ${Object.keys(FRED_SERIES).join(", ")}`);
    }
    return fetchFredSeries(indicatorKey, config);
  },
};
