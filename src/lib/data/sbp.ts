import type { TrendPoint } from "@/components/charts/TrendLineChart";
import type { Kpi } from "@/data/kpiData";
import type { DataFrequency } from "@/lib/dataFreshness";
import type { SourceStatus } from "@/lib/dataQuality";
import { getTrendDirection } from "@/lib/trendDirection";
import { findSamePeriodPriorYear } from "@/lib/yoyMath";
import { dedupeInFlight, getFresh, getStale, setCache } from "@/lib/memoryCache";
import { canonicalIndicatorKey, FOOD_INFLATION_URBAN_INDICATOR_KEY } from "@/lib/data/canonicalResolutionConfig";
import { getCanonicalSbpHistory } from "@/lib/data/sbpCanonicalStore";
import {
  fallbackCoreInflation,
  fallbackCpiInflation,
  fallbackCurrentAccount,
  fallbackExports,
  fallbackFdiInflows,
  fallbackFiscalBalance,
  fallbackForeignReserves,
  fallbackImports,
  fallbackLsm,
  fallbackMoneySupplyM2,
  fallbackNetBankReserves,
  fallbackPibYield3y,
  fallbackPolicyRate,
  fallbackPrivateCreditGrowth,
  fallbackReer,
  fallbackRemittances,
  fallbackTbillYield3m,
  fallbackTradeBalance,
  fallbackUsdPkr,
  fallbackWpiInflation,
} from "@/data/sbpFallbackData";

// All indicators are read from the State Bank of Pakistan's EasyData API:
// https://easydata.sbp.org.pk/api/v1/series/{series_key}/data
//
// The API key is a secret and must only ever be read from the server-side
// environment — never hardcoded, never exposed to the client.
const SBP_API_BASE = "https://easydata.sbp.org.pk/api/v1/series";

// History is requested from this date onward. 2016 gives ~10 years of
// monthly data (and a long run of "as-needed" auction/MPC observations) for
// trend charts, while keeping response sizes small.
const HISTORY_START_DATE = "2016-01-01";

// Only the most recent points are surfaced to trend charts so they stay
// readable (the full history is still available on `SbpSeries.history`).
const HISTORY_DISPLAY_POINTS = 24;

// Revalidation windows, chosen per series update frequency:
// - Monthly statistical releases (CPI, reserves, BoP, M2, ...) are published
//   once a month, so re-checking once a day is more than enough.
// - "As-needed" series (policy rate, T-Bill / PIB auction yields) can change
//   on any business day (MPC decisions, fortnightly auctions), so they are
//   re-checked more frequently.
const REVALIDATE_MONTHLY = 60 * 60 * 24; // 24h
const REVALIDATE_AS_NEEDED = 60 * 60 * 6; // 6h

// L1 in-memory cache (src/lib/memoryCache.ts) sitting in front of the L2
// Next.js fetch cache above — same two-layer shape as src/lib/data/fxRates.ts.
// Goal here isn't fresher data (SBP series only change monthly/as-needed
// anyway) but cutting duplicate upstream calls: getSbpIndicator("X") is
// called independently by the homepage's getAllSbpIndicators(), the
// /pakistan-economic-indicators page's own getAllSbpIndicators() call, and
// up to 4 separate dedicated SEO pages per indicator (e.g. cpiInflation is
// requested by inflation-rate-pakistan, pakistan-economic-dashboard,
// pakistan-food-inflation, AND weekly-inflation-pakistan). Without a shared
// cache, each of those pages' independent static regeneration can trigger
// its own upstream fetch for the exact same series within the same minute.
const L1_TTL_MS = 10 * 60 * 1000; // 10 min — within the 5-15 min target range

export type SbpSourceStatus = SourceStatus;

// Logging-only labels (not used for any UI/value logic) so production logs
// read like "[SBP] Remittances ..." instead of the internal camelCase key.
const INDICATOR_LABELS: Record<SbpIndicatorKey, string> = {
  foreignReserves: "Foreign Reserves",
  netBankReserves: "Bank Reserves",
  usdPkr: "USD/PKR",
  policyRate: "Policy Rate",
  cpiInflation: "CPI Inflation",
  coreInflation: "Core Inflation",
  wpiInflation: "WPI Inflation",
  tbillYield3m: "3M T-Bill Yield",
  pibYield3y: "3Y PIB Yield",
  remittances: "Remittances",
  currentAccount: "Current Account",
  tradeBalance: "Trade Balance",
  moneySupplyM2: "Money Supply (M2)",
  exports: "Exports",
  imports: "Imports",
  fdiInflows: "FDI Inflows",
  reer: "REER",
  lsm: "LSM",
  privateCreditGrowth: "Private Credit Growth",
  fiscalBalance: "Fiscal Balance",
};

/** Structured success/cache-hit log — never thrown, never shown to users. */
function logSbp(key: SbpIndicatorKey, status: SbpSourceStatus, detail: string): void {
  console.log(`[SBP] ${INDICATOR_LABELS[key]} — ${status} — ${detail} — ${new Date().toISOString()}`);
}

/** Structured failure log, in the exact shape requested for production log scanning. Never exposed to users — callers always still return usable data (stale cache or static fallback). */
function logSbpError(key: SbpIndicatorKey, reason: string, servedFrom: SbpSourceStatus): void {
  console.error(
    `[SBP] ${INDICATOR_LABELS[key]} fetch failed\nReason: ${reason}\nServing: ${servedFrom}\nTimestamp: ${new Date().toISOString()}`,
  );
}

// fetch() has no default timeout — without this, a stalled SBP EasyData
// connection hangs the underlying request for undici's ~5 minute default,
// blocking page render (and, during `next build`, static generation)
// instead of falling through to the existing try/catch error handling.
const FETCH_TIMEOUT_MS = 10_000;

export type Frequency = "Monthly" | "As-Needed" | "Weekly" | "Annual";

const SBP_FREQ_MAP: Record<Frequency, DataFrequency> = {
  "Monthly": "Monthly",
  "As-Needed": "As Needed",
  "Weekly": "Weekly",
  "Annual": "Annual",
} as const;

// Series keys discovered via the SBP EasyData /meta endpoints. Each key is
// "{dataset_code}.{series_code}".
export const SERIES_KEYS = {
  foreignReserves: "TS_GP_EXT_PAKRES_M.Z00020", // Total SBP Reserves
  netBankReserves: "TS_GP_EXT_PAKRES_M.Z00050", // Net Reserves With Banks (commercial bank FX reserves)
  usdPkr: "TS_GP_ER_FAERPKR_M.E00220", // Avg exchange rate, PKR per USD
  policyRate: "TS_GP_IR_SIRPR_AH.SBPOL0030", // SBP Policy (Target) Rate
  cpiInflation: "TS_GP_PT_CPI_M.P00011516", // National CPI, YoY
  coreInflation: "TS_GP_PT_CPI_M.P00121516", // Urban NFNE Core, YoY
  wpiInflation: "TS_GP_PT_CPI_M.P00081516", // WPI, YoY (used as PPI proxy)
  tbillYield3m: "TS_GP_BAM_SIRTBIL_AH.TB0040", // 3M T-Bill wtd avg yield
  pibYield3y: "TS_GP_BAM_SIRPIBS_AH.PIB0080", // 3Y PIB wtd avg yield
  remittances: "TS_GP_BOP_WR_M.WR0010", // Workers' remittances inflow
  currentAccount: "TS_GP_BOP_BPM6SUM_M.P00010", // BPM6 current account balance
  tradeBalance: "TS_GP_BOP_BPM6SUM_M.P00050", // BPM6 balance on trade in goods
  // Broad Money (M2), weekly "liability side" stock level. Migrated 2026-07
  // from the monthly M3_M.MA3001700 series, whose "Available Upto" trails
  // ~5 weeks behind (verified against SBP EasyData's own /meta endpoint:
  // monthly M2 caps at month M while this weekly series — same PKR-million
  // stock measure, same "Weekly Broad Money M2" SBP dataset — is available
  // through the most recent Friday, refreshed within days). This was the
  // root cause of the Money Supply KPI showing a stale (prior-month) value
  // while SBP had already published newer data via this faster series.
  moneySupplyM2: "TS_GP_BAM_M2_W.M000070", // Broad Money (M2), weekly (liability side)
  exports: "TS_GP_BOP_BPM6SUM_M.P00030", // BPM6 exports of goods FOB
  imports: "TS_GP_BOP_BPM6SUM_M.P00040", // BPM6 imports of goods FOB
  fdiInflows: "TS_GP_FI_SUMFIPK_M.FI00030", // Net FDI in Pakistan
  reer: "TS_GP_ER_REERNEER_M.R00010", // Real Effective Exchange Rate, base 2010
  lsm: "TS_GP_RL_LSM1516_M.LSM000160000", // LSM Quantum Index - Overall, base 2015-16
  privateCreditGrowth: "TS_GP_BAM_M2_W.M000480", // Credit to private sector, YoY growth (weekly)
  fiscalBalance: "TS_GP_PF_SPF_Y.SPF370000", // Consolidated fiscal balance (annual FY)
} as const;

export type SbpIndicatorKey = keyof typeof SERIES_KEYS;

// Raw shape returned by the EasyData /data endpoint: a column index plus
// rows of stringified values (numbers are returned as strings).
interface SbpApiResponse {
  columns: string[];
  rows: string[][];
}

interface SbpObservation {
  date: string;
  value: number;
}

export interface SbpSeries {
  seriesKey: string;
  seriesName: string;
  unit: string;
  latestValue: number;
  latestDate: string;
  previousValue: number | null;
  previousDate: string | null;
  /** Oldest -> newest, non-empty numeric observations only. Dates are raw "YYYY-MM-DD". */
  history: SbpObservation[];
  lastUpdated: string;
}

export interface SbpMeta {
  // Widened for fxReserves.ts (Phase 6A) — a second, non-EasyData source
  // (SBP's own Forex_Arch.xlsx) reuses this same result shape rather than
  // inventing a parallel one, since every consumer (KpiCard, SeoPageLayout,
  // DataQualityBadge) only cares about the shape, not which literal source
  // string it carries.
  source: "SBP EasyData" | "SBP EasyData (fallback)" | "SBP Forex_Arch.xlsx" | "SBP Forex_Arch.xlsx (fallback)";
  seriesKey: string;
  seriesName: string;
  /** Unit as reported by SBP EasyData (e.g. "Million USD", "Percent"). */
  unit: string;
  frequency: Frequency;
  /** Date of the latest observation, "YYYY-MM-DD". */
  observationDate: string;
  /** ISO timestamp of when this data was fetched (or when the fallback snapshot was captured). */
  lastUpdated: string;
  /**
   * Where this result actually came from this request: a fresh upstream
   * fetch ("live"), the L1 in-memory cache — fresh or stale-on-error, both
   * still real SBP data ("cache"), or the static last-resort snapshot in
   * sbpFallbackData.ts ("fallback"). Optional and currently unused by any
   * UI — set on the main getSbpIndicator() path so it's available for a
   * future tooltip/debug surface without committing to one now.
   */
  sourceStatus?: SbpSourceStatus;
}

export interface SbpIndicatorResult {
  kpi: Kpi;
  trend: TrendPoint[];
  meta: SbpMeta;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/** "2026-04-30" -> "Apr 2026" (or "Apr '26" with style "short"). */
function formatMonthLabel(dateStr: string, style: "long" | "short" = "long"): string {
  const [year, month] = dateStr.split("-");
  const yearLabel = style === "long" ? year : `'${year.slice(2)}`;
  return `${MONTH_NAMES[Number(month) - 1]} ${yearLabel}`;
}

/** "2025-12-16" -> "16 Dec 2025" (or "16 Dec '25" with style "short"). */
function formatDayMonthLabel(dateStr: string, style: "long" | "short" = "long"): string {
  const [year, month, day] = dateStr.split("-");
  const yearLabel = style === "long" ? year : `'${year.slice(2)}`;
  return `${Number(day)} ${MONTH_NAMES[Number(month) - 1]} ${yearLabel}`;
}

function changeLabel(diff: number | null, previousLabel: string | null, format: (value: number) => string): string {
  if (previousLabel === null || diff === null) {
    return "no prior data";
  }
  const sign = diff >= 0 ? "+" : "";
  return `${sign}${format(diff)} vs ${previousLabel}`;
}

/**
 * Fetches a single SBP EasyData series and reduces it to its latest value,
 * previous value, and full observation history (oldest -> newest).
 *
 * Throws on a missing API key, non-200 response, or a series with no usable
 * numeric observations — callers are expected to catch and fall back.
 */
async function fetchSbpSeries(seriesKey: string, revalidateSeconds: number, cacheTag: string, noCache = false, startDate: string = HISTORY_START_DATE): Promise<SbpSeries> {
  const apiKey = process.env.SBP_EASYDATA_API_KEY;
  if (!apiKey) {
    throw new Error("SBP_EASYDATA_API_KEY is not set");
  }

  const params = new URLSearchParams({
    api_key: apiKey,
    start_date: startDate,
    format: "json",
  });

  // noCache=true uses cache:'no-store' for the sync pipeline — bypasses Next.js
  // L2 fetch cache so new SBP observations are seen on the next cron run rather
  // than waiting up to 24h for cache expiry. Options are mutually exclusive per
  // Next.js docs: { revalidate, tags } and { cache:'no-store' } cannot coexist.
  const cacheOptions: RequestInit = noCache
    ? { cache: "no-store" }
    : { next: { revalidate: revalidateSeconds, tags: [cacheTag] } };

  const response = await fetch(`${SBP_API_BASE}/${seriesKey}/data?${params.toString()}`, {
    ...cacheOptions,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`SBP EasyData API returned ${response.status} for ${seriesKey}`);
  }

  const json = (await response.json()) as SbpApiResponse;
  if (!json.rows || json.rows.length === 0) {
    throw new Error(`SBP EasyData API returned no rows for ${seriesKey}`);
  }

  const dateIdx = json.columns.indexOf("Observation Date");
  const valueIdx = json.columns.indexOf("Observation Value");
  const unitIdx = json.columns.indexOf("Unit");
  const nameIdx = json.columns.indexOf("Series Name");

  // The API returns newest-first and marks gaps (e.g. auctions with no
  // result) with an empty value string. Drop those, then reverse to
  // oldest-first for charting and period-over-period diffs.
  const points = json.rows
    .filter((row) => row[valueIdx] !== "" && row[valueIdx] != null)
    .map((row): SbpObservation => ({ date: row[dateIdx], value: Number(row[valueIdx]) }))
    .filter((point) => Number.isFinite(point.value))
    .reverse();

  if (points.length === 0) {
    throw new Error(`SBP EasyData API returned no numeric observations for ${seriesKey}`);
  }

  const latest = points[points.length - 1];
  const previous = points.length > 1 ? points[points.length - 2] : null;

  return {
    seriesKey,
    seriesName: json.rows[0][nameIdx],
    unit: json.rows[0][unitIdx],
    latestValue: latest.value,
    latestDate: latest.date,
    previousValue: previous?.value ?? null,
    previousDate: previous?.date ?? null,
    history: points,
    lastUpdated: new Date().toISOString(),
  };
}

// --- Per-indicator KPI builders -------------------------------------------
// Each builder converts a raw SbpSeries into the shared Kpi shape used by
// KpiGrid/KpiCard, including unit conversion and a human-readable change
// label relative to the previous observation.

// Renamed from "Foreign Reserves" (Phase 6A) — this is EasyData Z00020,
// "Total SBP Reserves," a broader monthly IMF-template figure (includes
// gold/SDR/IMF reserve position) that is NOT the same measure as the
// weekly net-liquid figure most financial media/markets mean by "Pakistan's
// foreign reserves" (see fxReserves.ts's getNetLiquidReserves(), now the
// homepage's primary "Foreign Reserves" card). Kept here as a distinct,
// honestly-labeled secondary metric — never blended with the weekly figure.
function buildForeignReservesKpi(series: SbpSeries): Kpi {
  const latestB = series.latestValue / 1000;
  const diffB = series.previousValue !== null ? (series.latestValue - series.previousValue) / 1000 : null;
  const prevLabel = series.previousDate ? formatMonthLabel(series.previousDate) : null;
  return {
    title: "Total SBP Reserves",
    value: latestB.toFixed(1),
    unit: "B USD",
    change: changeLabel(diffB, prevLabel, (d) => `${d.toFixed(1)}B`),
    trend: getTrendDirection(diffB),
    glow: "blue",
  };
}

function buildNetBankReservesKpi(series: SbpSeries): Kpi {
  const latestB = series.latestValue / 1000;
  const diffB = series.previousValue !== null ? (series.latestValue - series.previousValue) / 1000 : null;
  const prevLabel = series.previousDate ? formatMonthLabel(series.previousDate) : null;
  return {
    title: "Bank Reserves",
    value: latestB.toFixed(2),
    unit: "B USD",
    change: changeLabel(diffB, prevLabel, (d) => `${d.toFixed(2)}B`),
    trend: getTrendDirection(diffB),
    glow: "purple",
  };
}

function buildUsdPkrKpi(series: SbpSeries): Kpi {
  const diff = series.previousValue !== null ? series.latestValue - series.previousValue : null;
  const prevLabel = series.previousDate ? formatMonthLabel(series.previousDate) : null;
  return {
    title: "USD / PKR",
    value: series.latestValue.toFixed(2),
    unit: "PKR",
    change: changeLabel(diff, prevLabel, (d) => d.toFixed(2)),
    trend: getTrendDirection(diff),
    glow: "purple",
  };
}

function buildPolicyRateKpi(series: SbpSeries): Kpi {
  const diff = series.previousValue !== null ? series.latestValue - series.previousValue : null;
  const prevLabel = series.previousDate ? formatDayMonthLabel(series.previousDate) : null;
  return {
    title: "Policy Rate",
    value: series.latestValue.toFixed(2),
    unit: "%",
    change: changeLabel(diff, prevLabel, (d) => `${d.toFixed(2)} pp`),
    trend: getTrendDirection(diff),
    glow: "blue",
  };
}

function buildCpiInflationKpi(series: SbpSeries): Kpi {
  const diff = series.previousValue !== null ? series.latestValue - series.previousValue : null;
  const prevLabel = series.previousDate ? formatMonthLabel(series.previousDate) : null;
  return {
    title: "CPI Inflation",
    value: series.latestValue.toFixed(1),
    unit: "%",
    change: changeLabel(diff, prevLabel, (d) => `${d.toFixed(1)} pp`),
    trend: getTrendDirection(diff),
    glow: "purple",
  };
}

function buildCoreInflationKpi(series: SbpSeries): Kpi {
  const diff = series.previousValue !== null ? series.latestValue - series.previousValue : null;
  const prevLabel = series.previousDate ? formatMonthLabel(series.previousDate) : null;
  return {
    title: "Core Inflation",
    value: series.latestValue.toFixed(1),
    unit: "%",
    change: changeLabel(diff, prevLabel, (d) => `${d.toFixed(1)} pp`),
    trend: getTrendDirection(diff),
    glow: "blue",
  };
}

function buildWpiInflationKpi(series: SbpSeries): Kpi {
  const diff = series.previousValue !== null ? series.latestValue - series.previousValue : null;
  const prevLabel = series.previousDate ? formatMonthLabel(series.previousDate) : null;
  return {
    title: "WPI Inflation",
    value: series.latestValue.toFixed(1),
    unit: "%",
    change: changeLabel(diff, prevLabel, (d) => `${d.toFixed(1)} pp`),
    trend: getTrendDirection(diff),
    glow: "purple",
  };
}

function buildTbillYield3mKpi(series: SbpSeries): Kpi {
  const diff = series.previousValue !== null ? series.latestValue - series.previousValue : null;
  const prevLabel = series.previousDate ? formatDayMonthLabel(series.previousDate) : null;
  return {
    title: "3M T-Bill Yield",
    value: series.latestValue.toFixed(2),
    unit: "%",
    change: changeLabel(diff, prevLabel, (d) => `${d.toFixed(2)} pp`),
    trend: getTrendDirection(diff),
    glow: "blue",
  };
}

function buildPibYield3yKpi(series: SbpSeries): Kpi {
  const diff = series.previousValue !== null ? series.latestValue - series.previousValue : null;
  const prevLabel = series.previousDate ? formatDayMonthLabel(series.previousDate) : null;
  return {
    title: "3Y PIB Yield",
    value: series.latestValue.toFixed(2),
    unit: "%",
    change: changeLabel(diff, prevLabel, (d) => `${d.toFixed(2)} pp`),
    trend: getTrendDirection(diff),
    glow: "purple",
  };
}

function buildRemittancesKpi(series: SbpSeries): Kpi {
  const latestB = series.latestValue / 1000;
  const pctDiff =
    series.previousValue && series.previousValue !== 0
      ? ((series.latestValue - series.previousValue) / series.previousValue) * 100
      : null;
  const prevLabel = series.previousDate ? formatMonthLabel(series.previousDate) : null;
  return {
    title: "Remittances",
    value: latestB.toFixed(1),
    unit: "B USD",
    change: changeLabel(pctDiff, prevLabel, (d) => `${d.toFixed(1)}%`),
    trend: getTrendDirection(pctDiff),
    glow: "blue",
  };
}

function buildCurrentAccountKpi(series: SbpSeries): Kpi {
  const latestB = series.latestValue / 1000;
  const diffB = series.previousValue !== null ? (series.latestValue - series.previousValue) / 1000 : null;
  const prevLabel = series.previousDate ? formatMonthLabel(series.previousDate) : null;
  return {
    title: "Current Account",
    value: latestB.toFixed(2),
    unit: "B USD",
    change: changeLabel(diffB, prevLabel, (d) => `${d.toFixed(2)}B`),
    trend: getTrendDirection(diffB),
    glow: "purple",
  };
}

function buildTradeBalanceKpi(series: SbpSeries): Kpi {
  const latestB = series.latestValue / 1000;
  const diffB = series.previousValue !== null ? (series.latestValue - series.previousValue) / 1000 : null;
  const prevLabel = series.previousDate ? formatMonthLabel(series.previousDate) : null;
  return {
    title: "Trade Balance",
    value: latestB.toFixed(2),
    unit: "B USD",
    change: changeLabel(diffB, prevLabel, (d) => `${d.toFixed(2)}B`),
    trend: getTrendDirection(diffB),
    glow: "blue",
  };
}

function buildMoneySupplyM2Kpi(series: SbpSeries): Kpi {
  const latestT = series.latestValue / 1e6;
  const pctDiff =
    series.previousValue && series.previousValue !== 0
      ? ((series.latestValue - series.previousValue) / series.previousValue) * 100
      : null;
  // Weekly series (see SERIES_KEYS.moneySupplyM2 comment) — day-month label
  // matches the other Weekly/As-Needed KPI builders (e.g. buildPrivateCreditGrowthKpi).
  const prevLabel = series.previousDate ? formatDayMonthLabel(series.previousDate) : null;
  return {
    title: "Money Supply (M2)",
    value: latestT.toFixed(2),
    unit: "T PKR",
    change: changeLabel(pctDiff, prevLabel, (d) => `${d.toFixed(1)}%`),
    trend: getTrendDirection(pctDiff),
    glow: "purple",
  };
}

function buildExportsKpi(series: SbpSeries): Kpi {
  const latestB = series.latestValue / 1000;
  const diffB = series.previousValue !== null ? (series.latestValue - series.previousValue) / 1000 : null;
  const prevLabel = series.previousDate ? formatMonthLabel(series.previousDate) : null;
  return {
    title: "Exports",
    value: latestB.toFixed(2),
    unit: "B USD",
    change: changeLabel(diffB, prevLabel, (d) => `${d.toFixed(2)}B`),
    trend: getTrendDirection(diffB),
    glow: "blue",
  };
}

function buildImportsKpi(series: SbpSeries): Kpi {
  const latestB = series.latestValue / 1000;
  const diffB = series.previousValue !== null ? (series.latestValue - series.previousValue) / 1000 : null;
  const prevLabel = series.previousDate ? formatMonthLabel(series.previousDate) : null;
  return {
    title: "Imports",
    value: latestB.toFixed(2),
    unit: "B USD",
    change: changeLabel(diffB, prevLabel, (d) => `${d.toFixed(2)}B`),
    trend: getTrendDirection(diffB),
    glow: "purple",
  };
}

function buildFdiInflowsKpi(series: SbpSeries): Kpi {
  const diff = series.previousValue !== null ? series.latestValue - series.previousValue : null;
  const prevLabel = series.previousDate ? formatMonthLabel(series.previousDate) : null;
  return {
    title: "FDI Inflows",
    value: series.latestValue.toFixed(1),
    unit: "M USD",
    change: changeLabel(diff, prevLabel, (d) => `${d.toFixed(1)}M`),
    trend: getTrendDirection(diff),
    glow: "blue",
  };
}

function buildReerKpi(series: SbpSeries): Kpi {
  const diff = series.previousValue !== null ? series.latestValue - series.previousValue : null;
  const prevLabel = series.previousDate ? formatMonthLabel(series.previousDate) : null;
  return {
    title: "REER",
    value: series.latestValue.toFixed(1),
    unit: "Index",
    change: changeLabel(diff, prevLabel, (d) => d.toFixed(1)),
    trend: getTrendDirection(diff),
    glow: "purple",
  };
}

function buildLsmKpi(series: SbpSeries): Kpi {
  // EasyData LSM series (LSM000160000) returns a quantum index (base FY2015-16=100),
  // not YoY growth. Compute deterministic YoY: (current / same_month_prior_year − 1) × 100,
  // via the same canonical lookup lsmSync.ts's computeLsmYoY() and
  // sourceChain.ts's LSM adapter now also use (src/lib/yoyMath.ts) — matches
  // the methodology used by syncLsmYoYFromEasyData.ts and PBS official releases.
  const latestDate    = series.latestDate;
  const priorYrPoint  = findSamePeriodPriorYear(series.history, latestDate);

  if (!priorYrPoint || priorYrPoint.value === 0) {
    // No prior-year observation available — show raw quantum index with honest label.
    const rawDiff  = series.previousValue !== null ? series.latestValue - series.previousValue : null;
    const prevLabel = series.previousDate ? formatMonthLabel(series.previousDate) : null;
    return {
      title: "LSM Growth",
      value: series.latestValue.toFixed(1),
      unit:  "Index (base FY16)",
      change: changeLabel(rawDiff, prevLabel, (d) => d.toFixed(1)),
      trend: getTrendDirection(rawDiff),
      glow: "blue",
    };
  }

  const yoyPct = ((series.latestValue / priorYrPoint.value) - 1) * 100;

  // Change label AND trend direction are both this month's YoY − previous
  // month's YoY (pp difference) — the two must agree (PEIC v2.2 fix: trend
  // previously used yoyPct's own sign, i.e. "is the level positive", which
  // silently disagreed with the change text whenever growth was still
  // positive but slowing, or still negative but improving).
  let change = "no prior data";
  let yoyDiff: number | null = null;
  if (series.previousDate && series.previousValue !== null) {
    const prevPriorPt = findSamePeriodPriorYear(series.history, series.previousDate);
    if (prevPriorPt && prevPriorPt.value !== 0) {
      const prevYoY = ((series.previousValue / prevPriorPt.value) - 1) * 100;
      yoyDiff       = yoyPct - prevYoY;
      change        = changeLabel(yoyDiff, formatMonthLabel(series.previousDate), (d) => `${d.toFixed(1)} pp`);
    }
  }

  return {
    title: "LSM Growth",
    value: yoyPct.toFixed(1),
    unit:  "% YoY",
    change,
    trend: getTrendDirection(yoyDiff),
    glow: "blue",
  };
}

function buildPrivateCreditGrowthKpi(series: SbpSeries): Kpi {
  const diff = series.previousValue !== null ? series.latestValue - series.previousValue : null;
  const prevLabel = series.previousDate ? formatDayMonthLabel(series.previousDate) : null;
  return {
    title: "Private Credit Growth",
    value: series.latestValue.toFixed(1),
    unit: "% YoY",
    change: changeLabel(diff, prevLabel, (d) => `${d.toFixed(1)} pp`),
    trend: getTrendDirection(diff),
    glow: "purple",
  };
}

function buildFiscalBalanceKpi(series: SbpSeries): Kpi {
  const latestT = series.latestValue / 1e6;
  const diffT = series.previousValue !== null ? (series.latestValue - series.previousValue) / 1e6 : null;
  const prevLabel = series.previousDate ? formatMonthLabel(series.previousDate) : null;
  return {
    title: "Fiscal Balance",
    value: latestT.toFixed(2),
    unit: "T PKR",
    change: changeLabel(diffT, prevLabel, (d) => `${d.toFixed(2)}T`),
    trend: getTrendDirection(diffT),
    glow: "blue",
  };
}

// --- Indicator configuration -----------------------------------------------

interface IndicatorConfig {
  seriesKey: string;
  revalidate: number;
  frequency: Frequency;
  /** Converts a raw observation value to the unit shown on the trend chart (e.g. Million USD -> Billion USD). */
  toTrendValue: (value: number) => number;
  buildKpi: (series: SbpSeries) => Kpi;
  fallback: SbpIndicatorResult;
}

const CONFIGS: Record<SbpIndicatorKey, IndicatorConfig> = {
  foreignReserves: {
    seriesKey: SERIES_KEYS.foreignReserves,
    revalidate: REVALIDATE_MONTHLY,
    frequency: "Monthly",
    toTrendValue: (v) => v / 1000,
    buildKpi: buildForeignReservesKpi,
    fallback: fallbackForeignReserves,
  },
  netBankReserves: {
    seriesKey: SERIES_KEYS.netBankReserves,
    revalidate: REVALIDATE_MONTHLY,
    frequency: "Monthly",
    toTrendValue: (v) => v / 1000,
    buildKpi: buildNetBankReservesKpi,
    fallback: fallbackNetBankReserves,
  },
  usdPkr: {
    seriesKey: SERIES_KEYS.usdPkr,
    revalidate: REVALIDATE_MONTHLY,
    frequency: "Monthly",
    toTrendValue: (v) => v,
    buildKpi: buildUsdPkrKpi,
    fallback: fallbackUsdPkr,
  },
  policyRate: {
    seriesKey: SERIES_KEYS.policyRate,
    revalidate: REVALIDATE_AS_NEEDED,
    frequency: "As-Needed",
    toTrendValue: (v) => v,
    buildKpi: buildPolicyRateKpi,
    fallback: fallbackPolicyRate,
  },
  cpiInflation: {
    seriesKey: SERIES_KEYS.cpiInflation,
    revalidate: REVALIDATE_MONTHLY,
    frequency: "Monthly",
    toTrendValue: (v) => v,
    buildKpi: buildCpiInflationKpi,
    fallback: fallbackCpiInflation,
  },
  coreInflation: {
    seriesKey: SERIES_KEYS.coreInflation,
    revalidate: REVALIDATE_MONTHLY,
    frequency: "Monthly",
    toTrendValue: (v) => v,
    buildKpi: buildCoreInflationKpi,
    fallback: fallbackCoreInflation,
  },
  wpiInflation: {
    seriesKey: SERIES_KEYS.wpiInflation,
    revalidate: REVALIDATE_MONTHLY,
    frequency: "Monthly",
    toTrendValue: (v) => v,
    buildKpi: buildWpiInflationKpi,
    fallback: fallbackWpiInflation,
  },
  tbillYield3m: {
    seriesKey: SERIES_KEYS.tbillYield3m,
    revalidate: REVALIDATE_AS_NEEDED,
    frequency: "As-Needed",
    toTrendValue: (v) => v,
    buildKpi: buildTbillYield3mKpi,
    fallback: fallbackTbillYield3m,
  },
  pibYield3y: {
    seriesKey: SERIES_KEYS.pibYield3y,
    revalidate: REVALIDATE_AS_NEEDED,
    frequency: "As-Needed",
    toTrendValue: (v) => v,
    buildKpi: buildPibYield3yKpi,
    fallback: fallbackPibYield3y,
  },
  remittances: {
    seriesKey: SERIES_KEYS.remittances,
    revalidate: REVALIDATE_MONTHLY,
    frequency: "Monthly",
    toTrendValue: (v) => v / 1000,
    buildKpi: buildRemittancesKpi,
    fallback: fallbackRemittances,
  },
  currentAccount: {
    seriesKey: SERIES_KEYS.currentAccount,
    revalidate: REVALIDATE_MONTHLY,
    frequency: "Monthly",
    toTrendValue: (v) => v / 1000,
    buildKpi: buildCurrentAccountKpi,
    fallback: fallbackCurrentAccount,
  },
  tradeBalance: {
    seriesKey: SERIES_KEYS.tradeBalance,
    revalidate: REVALIDATE_MONTHLY,
    frequency: "Monthly",
    toTrendValue: (v) => v / 1000,
    buildKpi: buildTradeBalanceKpi,
    fallback: fallbackTradeBalance,
  },
  moneySupplyM2: {
    seriesKey: SERIES_KEYS.moneySupplyM2,
    // Weekly series (see SERIES_KEYS.moneySupplyM2 comment) — 6h revalidate
    // matches the other Weekly/As-Needed series so a new Friday observation
    // is picked up same-day rather than waiting the monthly 24h window.
    revalidate: REVALIDATE_AS_NEEDED,
    frequency: "Weekly",
    toTrendValue: (v) => v / 1e6,
    buildKpi: buildMoneySupplyM2Kpi,
    fallback: fallbackMoneySupplyM2,
  },
  exports: {
    seriesKey: SERIES_KEYS.exports,
    revalidate: REVALIDATE_MONTHLY,
    frequency: "Monthly",
    toTrendValue: (v) => v / 1000,
    buildKpi: buildExportsKpi,
    fallback: fallbackExports,
  },
  imports: {
    seriesKey: SERIES_KEYS.imports,
    revalidate: REVALIDATE_MONTHLY,
    frequency: "Monthly",
    toTrendValue: (v) => v / 1000,
    buildKpi: buildImportsKpi,
    fallback: fallbackImports,
  },
  fdiInflows: {
    seriesKey: SERIES_KEYS.fdiInflows,
    revalidate: REVALIDATE_MONTHLY,
    frequency: "Monthly",
    toTrendValue: (v) => v,
    buildKpi: buildFdiInflowsKpi,
    fallback: fallbackFdiInflows,
  },
  reer: {
    seriesKey: SERIES_KEYS.reer,
    revalidate: REVALIDATE_MONTHLY,
    frequency: "Monthly",
    toTrendValue: (v) => v,
    buildKpi: buildReerKpi,
    fallback: fallbackReer,
  },
  lsm: {
    seriesKey: SERIES_KEYS.lsm,
    revalidate: REVALIDATE_MONTHLY,
    frequency: "Monthly",
    toTrendValue: (v) => v,
    buildKpi: buildLsmKpi,
    fallback: fallbackLsm,
  },
  privateCreditGrowth: {
    seriesKey: SERIES_KEYS.privateCreditGrowth,
    revalidate: REVALIDATE_AS_NEEDED,
    frequency: "Weekly",
    toTrendValue: (v) => v,
    buildKpi: buildPrivateCreditGrowthKpi,
    fallback: fallbackPrivateCreditGrowth,
  },
  fiscalBalance: {
    seriesKey: SERIES_KEYS.fiscalBalance,
    revalidate: REVALIDATE_MONTHLY,
    frequency: "Annual",
    toTrendValue: (v) => v / 1e6,
    buildKpi: buildFiscalBalanceKpi,
    fallback: fallbackFiscalBalance,
  },
};

/** Exported so sbpCacheInvalidation.ts (a separate, server-only module — see its header) can build the matching tag without duplicating this string template. */
export function sbpCacheTag(key: SbpIndicatorKey): string {
  return `sbp-${key}`;
}

/** All 20 SbpIndicatorKey members — exported so scripts/ingestSbp.ts can iterate the exact same indicator set the homepage renders, without hand-maintaining a second copy of this list (see sbpFreshnessAudit.ts's ALL_INDICATOR_KEYS for the pre-existing hand-maintained alternative this deliberately avoids repeating). */
export function getAllSbpIndicatorKeys(): SbpIndicatorKey[] {
  return Object.keys(CONFIGS) as SbpIndicatorKey[];
}

/** This indicator's declared publication cadence — used by systemHealth.ts to compute a provider-independent freshness SLA (grace period past the expected next release) without re-querying SBP itself. */
export function getSbpIndicatorFrequency(key: SbpIndicatorKey): Frequency {
  return CONFIGS[key].frequency;
}

/**
 * Full-history live fetch of one SBP indicator, bypassing every cache layer —
 * for scripts/ingestSbp.ts (the local ingestion runner) only. Reuses the
 * exact same fetch/parse logic as every other path in this file (no parallel
 * implementation to drift out of sync); the only difference from
 * getSbpIndicatorHistoryFresh is that this returns the raw SbpSeries shape
 * (unit + seriesName included) rather than the already-unit-converted
 * SbpIndicatorHistory shape, since the ingestion runner needs the former to
 * write faithful raw_observations rows.
 */
/**
 * @param sinceDate Optional "YYYY-MM-DD" override for SBP EasyData's
 *   start_date param. scripts/ingestSbp.ts passes the existing latest
 *   canonical period (minus a revision-safety buffer) on every run after
 *   the first backfill, so a weekly series with 550+ historical points
 *   downloads ~9 rows instead of 550+ on every ordinary run — the SBP
 *   fetch itself becomes incremental, not just the DB write (Production
 *   Readiness Audit, Phase 6A.3, section 15: the write was already
 *   diff-based, but the fetch was re-downloading full 2016-present history
 *   unconditionally every single run). Omit for a full backfill.
 */
export async function fetchSbpSeriesForIngestion(key: SbpIndicatorKey, sinceDate?: string): Promise<SbpSeries> {
  const config = CONFIGS[key];
  return fetchSbpSeries(config.seriesKey, config.revalidate, sbpCacheTag(key), true, sinceDate);
}

function seriesToIndicatorResult(config: IndicatorConfig, series: SbpSeries): SbpIndicatorResult {
  const formatLabel =
    config.frequency === "Monthly" || config.frequency === "Annual"
      ? formatMonthLabel
      : formatDayMonthLabel;

  const baseKpi = config.buildKpi(series);
  return {
    kpi: {
      ...baseKpi,
      source: "SBP EasyData",
      seriesId: series.seriesKey,
      latestDate: series.latestDate,
      frequency: SBP_FREQ_MAP[config.frequency],
    },
    trend: series.history.slice(-HISTORY_DISPLAY_POINTS).map((point) => ({
      month: formatLabel(point.date, "short"),
      value: Number(config.toTrendValue(point.value).toFixed(2)),
    })),
    meta: {
      source: "SBP EasyData",
      seriesKey: series.seriesKey,
      seriesName: series.seriesName,
      unit: series.unit,
      frequency: config.frequency,
      observationDate: series.latestDate,
      lastUpdated: series.lastUpdated,
    },
  };
}

/**
 * Live-fetch builder — calls SBP EasyData directly. Used ONLY by
 * getSbpIndicatorFresh() now (the calendar-sync pipeline's LSM YoY /
 * freshness-self-heal path — out of scope for this fix). The homepage/SEO/
 * comparisons render path uses buildIndicatorResultFromCanonical() below
 * instead, which never touches SBP EasyData at request time.
 */
async function buildIndicatorResult(key: SbpIndicatorKey, config: IndicatorConfig, noCache = false): Promise<SbpIndicatorResult> {
  const series = await fetchSbpSeries(config.seriesKey, config.revalidate, sbpCacheTag(key), noCache);
  return seriesToIndicatorResult(config, series);
}

/**
 * DB-backed series builder — reads the canonical ledger (migration 0050,
 * populated by scripts/ingestSbp.ts) instead of calling SBP EasyData.
 * Throws when no canonical row has ever been ingested for this indicator
 * yet; the caller (getSbpIndicator) treats that identically to a live-fetch
 * failure — falls through to the L1 stale cache, then the static snapshot.
 */
async function fetchCanonicalSbpSeries(key: SbpIndicatorKey): Promise<SbpSeries> {
  const rows = await getCanonicalSbpHistory(canonicalIndicatorKey(key), 500);
  if (rows.length === 0) {
    throw new Error(`No canonical observations ingested yet for ${key} — run scripts/ingestSbp.ts`);
  }
  const latest = rows[rows.length - 1];
  const previous = rows.length > 1 ? rows[rows.length - 2] : null;
  return {
    seriesKey: SERIES_KEYS[key],
    seriesName: latest.seriesName ?? INDICATOR_LABELS[key],
    unit: latest.unit,
    latestValue: latest.value,
    latestDate: latest.observationPeriod,
    previousValue: previous?.value ?? null,
    previousDate: previous?.observationPeriod ?? null,
    history: rows.map((r) => ({ date: r.observationPeriod, value: r.value })),
    lastUpdated: latest.vintage,
  };
}

async function buildIndicatorResultFromCanonical(key: SbpIndicatorKey, config: IndicatorConfig): Promise<SbpIndicatorResult> {
  const series = await fetchCanonicalSbpSeries(key);
  return seriesToIndicatorResult(config, series);
}

/**
 * Stamps both meta.sourceStatus (internal, always accurate) and
 * kpi.sourceStatus/kpi.source (user-facing — drives DataQualityBadge) with
 * the same verdict. Previously only meta was updated; the fallback branch
 * then unconditionally overwrote kpi.source back to the plain live-looking
 * "SBP EasyData" string, so a card could be silently serving a frozen
 * snapshot with no visible "Fallback" marker anywhere on it — the Production
 * Audit's single highest-impact finding. Fixed here, once, for all 20 series.
 */
function withSourceStatus(result: SbpIndicatorResult, status: SbpSourceStatus): SbpIndicatorResult {
  const isFallback = status === "fallback";
  return {
    ...result,
    kpi: {
      ...result.kpi,
      source: isFallback ? "SBP EasyData (fallback)" : "SBP EasyData",
      sourceStatus: status,
      snapshotDate: isFallback ? result.meta.observationDate : undefined,
    },
    meta: { ...result.meta, sourceStatus: status },
  };
}

/**
 * Fetches a single SBP indicator (KPI + trend + source metadata).
 *
 * Three-tier resolution, each tier logged (see logSbp/logSbpError — never
 * thrown, never shown to users):
 *  1. L1 in-memory cache (memoryCache.ts), if fresh within L1_TTL_MS —
 *     avoids re-hitting SBP when multiple pages request the same indicator
 *     within a short window. Concurrent misses are de-duped via
 *     dedupeInFlight so a stampede of callers shares one upstream call.
 *     This is "cache-fresh" — a normal, healthy fast path, not a degraded
 *     state, since the value is exactly as trustworthy as a live call.
 *  2. A read from the canonical_observations ledger (buildIndicatorResultFromCanonical
 *     -> fetchCanonicalSbpSeries — migration 0050), populated by the local
 *     ingestion runner (scripts/ingestSbp.ts). This is a DB read, never a
 *     live SBP EasyData call — that network path is Cloudflare-blocked from
 *     every shared cloud/CI network tested (Vercel, GitHub Actions, Supabase
 *     Edge Functions). Still logged/labeled "live" since it's exactly as
 *     current as the ingestion runner's last successful run.
 *  3. On any failure (Supabase unreachable, or no canonical row ever
 *     ingested for this indicator yet): the last-known-good L1 value regardless of age
 *     ("cache-stale" — real SBP data, but the live refresh just failed, a
 *     genuinely degraded state worth disclosing), or — only if there is no
 *     cached value at all — the static snapshot in sbpFallbackData.ts
 *     ("fallback").
 */
export async function getSbpIndicator(key: SbpIndicatorKey): Promise<SbpIndicatorResult> {
  const config = CONFIGS[key];
  const cacheKey = `sbp-indicator:${key}`;

  const l1 = getFresh<SbpIndicatorResult>(cacheKey, L1_TTL_MS);
  if (l1) {
    logSbp(key, "cache-fresh", `L1 hit, ${Math.round(l1.ageMs / 1000)}s old, observation=${l1.data.meta.observationDate}`);
    return withSourceStatus(l1.data, "cache-fresh");
  }

  return dedupeInFlight(cacheKey, async () => {
    try {
      const result = await buildIndicatorResultFromCanonical(key, config);
      setCache(cacheKey, result);
      logSbp(key, "live", `read from canonical DB, observation=${result.meta.observationDate}`);
      return withSourceStatus(result, "live");
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      const stale = getStale<SbpIndicatorResult>(cacheKey);
      if (stale) {
        logSbpError(key, reason, "cache-stale");
        return withSourceStatus(stale.data, "cache-stale");
      }
      logSbpError(key, reason, "fallback");
      const fb = config.fallback;
      return withSourceStatus(
        {
          ...fb,
          kpi: {
            ...fb.kpi,
            seriesId: config.seriesKey,
            latestDate: fb.meta.observationDate,
            frequency: SBP_FREQ_MAP[config.frequency],
          },
        },
        "fallback",
      );
    }
  });
}

/**
 * For sync pipeline use only — same logic as getSbpIndicator() but bypasses
 * the 24h Next.js L2 fetch cache via cache:'no-store'. This ensures the sync
 * cron detects new SBP observations within one 15-min polling interval rather
 * than waiting up to 24h for the cache to naturally expire.
 *
 * Does NOT update the L1 memoryCache (the pipeline doesn't need to populate
 * the user-facing cache path; invalidateSbpIndicatorCache() handles clearing
 * both L1 and L2 after a successful write, so the next user-facing request
 * gets fresh data).
 *
 * Falls back to the static snapshot on any error, identical to getSbpIndicator.
 */
export async function getSbpIndicatorFresh(key: SbpIndicatorKey): Promise<SbpIndicatorResult> {
  const config = CONFIGS[key];
  try {
    const result = await buildIndicatorResult(key, config, true);
    logSbp(key, "live", `no-cache fetch OK, observation=${result.meta.observationDate}`);
    return withSourceStatus(result, "live");
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    logSbpError(key, reason, "fallback");
    const fb = config.fallback;
    return withSourceStatus(
      {
        ...fb,
        kpi: {
          ...fb.kpi,
          seriesId: config.seriesKey,
          latestDate: fb.meta.observationDate,
          frequency: SBP_FREQ_MAP[config.frequency],
        },
      },
      "fallback",
    );
  }
}

// invalidateSbpIndicatorCache() lives in sbpCacheInvalidation.ts, a
// separate module — NOT here — specifically because it needs
// revalidateTag() from "next/cache", which Next.js refuses to bundle into
// any client-reachable module. This file is imported by
// comparisonData.ts -> ComparisonWorkspace.tsx (a Client Component), so a
// "next/cache" import here breaks the production build entirely (confirmed
// live: Turbopack build error, not a lint nitpick).

/**
 * Fetches all 20 SBP indicators in parallel. Each indicator falls back
 * independently, so one failing series never breaks the others.
 */
export async function getAllSbpIndicators(): Promise<Record<SbpIndicatorKey, SbpIndicatorResult>> {
  const keys = Object.keys(CONFIGS) as SbpIndicatorKey[];
  const results = await Promise.all(keys.map((key) => getSbpIndicator(key)));

  return keys.reduce((acc, key, index) => {
    acc[key] = results[index];
    return acc;
  }, {} as Record<SbpIndicatorKey, SbpIndicatorResult>);
}

// --- Full-history access (Comparisons feature) ------------------------------
// getSbpIndicator()/getAllSbpIndicators() above intentionally cap their .trend
// at HISTORY_DISPLAY_POINTS (24) for the homepage's compact charts. The
// underlying fetch already pulls the full series since HISTORY_START_DATE
// (2016-01-01 — confirmed against SBP EasyData's own "Available Since"
// metadata to be at or near each series' actual earliest observation, not an
// arbitrarily short window). getSbpIndicatorHistory() exposes that full,
// un-sliced series for comparison charts that need 5-10 years of history.

export interface SbpHistoryPoint {
  /** Raw "YYYY-MM-DD" observation date, for precise cross-series alignment. */
  date: string;
  value: number;
}

export interface SbpIndicatorHistory {
  /** Oldest -> newest, full available history, already unit-converted. */
  points: SbpHistoryPoint[];
  meta: SbpMeta;
}

/**
 * Fetches a single SBP indicator's complete available history (not capped
 * at 24 points), for comparison charts. Falls back to whatever short-label
 * trend the static fallback snapshot carries if the live API is unreachable
 * — that fallback isn't date-keyed, so cross-series alignment degrades
 * gracefully rather than fabricating dates for it.
 *
 * Memoized via the project's existing in-memory TTL cache (memoryCache.ts —
 * already used by the assistant/translate routes) so the several Comparisons
 * pages/cards that reference the same indicator (e.g. USD/PKR appears in 3
 * different comparisons plus the performance calculator, all fetched within
 * one render of /comparisons) share one fetch instead of each independently
 * re-fetching it. The TTL is `config.revalidate` — the exact same per-
 * indicator window (24h monthly / 6h as-needed) already used for this
 * series' own `fetch()` call, so no indicator's revalidation window changes.
 */
export async function getSbpIndicatorHistory(key: SbpIndicatorKey): Promise<SbpIndicatorHistory> {
  const config = CONFIGS[key];
  const cacheKey = `sbp-indicator-history:${key}`;
  const cached = getFresh<SbpIndicatorHistory>(cacheKey, config.revalidate * 1000);
  if (cached) return cached.data;

  return dedupeInFlight(cacheKey, async () => {
    const result = await fetchCanonicalIndicatorHistoryUncached(key);
    setCache(cacheKey, result);
    return result;
  });
}

/**
 * Live fetch of full SBP indicator history — bypasses L1 in-memory cache and
 * forces a no-cache upstream fetch (Next.js L2 also bypassed via noCache=true).
 * Used exclusively by sync paths (lsmSync.ts) that compute YoY from the full
 * time series and must detect new observations without waiting 24 h for the
 * cached history to expire. Warms L1 on success so subsequent comparison-chart
 * renders share the already-fetched result rather than re-fetching SBP.
 */
export async function getSbpIndicatorHistoryFresh(key: SbpIndicatorKey): Promise<SbpIndicatorHistory> {
  const config = CONFIGS[key];
  const cacheKey = `sbp-indicator-history:${key}`;
  try {
    const series = await fetchSbpSeries(config.seriesKey, config.revalidate, sbpCacheTag(key), true);
    const result: SbpIndicatorHistory = {
      points: series.history.map((p) => ({
        date: p.date,
        value: Number(config.toTrendValue(p.value).toFixed(4)),
      })),
      meta: {
        source: "SBP EasyData",
        seriesKey: series.seriesKey,
        seriesName: series.seriesName,
        unit: series.unit,
        frequency: config.frequency,
        observationDate: series.latestDate,
        lastUpdated: series.lastUpdated,
        sourceStatus: "live",
      },
    };
    setCache(cacheKey, result);
    return result;
  } catch (err) {
    logSbpError(key, err instanceof Error ? err.message : String(err), "fallback");
    const fb = config.fallback;
    return {
      points: fb.trend.map((p) => ({ date: parseFallbackMonthLabel(p.month), value: p.value })),
      meta: { ...fb.meta, source: "SBP EasyData", sourceStatus: "fallback" },
    };
  }
}

const MONTH_ABBR: Record<string, number> = {
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
  Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
};

/**
 * Fallback trend data (sbpFallbackData.ts) stores dates as human-readable
 * display labels — "MMM 'YY" for monthly series, "D MMM 'YY" for as-needed
 * series (auction/MPC dates) — since that's what the homepage's compact
 * trend charts render directly as axis labels. The live path's
 * `SbpSeries.history[].date` is always a real "YYYY-MM-DD" string. Every
 * downstream consumer of `SbpIndicatorHistory.points[].date` (date-alignment
 * merge keys in comparisonData.ts/performanceCalculator.ts, chart date
 * formatting) assumes the latter — feeding it a label like "May '26"
 * unparsed produces garbage merge keys and "Invalid Date"/undefined
 * formatting once a series falls back. This converts the label to a real
 * ISO date (monthly labels map to that month's last day, matching the
 * month-end convention SBP's own monthly observation dates use).
 */
function parseFallbackMonthLabel(label: string): string {
  const asNeeded = label.match(/^(\d{1,2}) (\w{3}) '(\d{2})$/);
  if (asNeeded) {
    const [, day, mon, yy] = asNeeded;
    const month = MONTH_ABBR[mon];
    const year = 2000 + Number(yy);
    return `${year}-${String(month).padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  const monthly = label.match(/^(\w{3}) '(\d{2})$/);
  if (monthly) {
    const [, mon, yy] = monthly;
    const month = MONTH_ABBR[mon];
    const year = 2000 + Number(yy);
    const lastDay = new Date(year, month, 0).getDate();
    return `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  }
  return label;
}

/**
 * DB-backed full-history builder — reads canonical_observations (migration
 * 0050) instead of calling SBP EasyData live. Used by getSbpIndicatorHistory()
 * for the Comparisons feature's render path. getSbpIndicatorHistoryFresh()
 * (used by lsmSync.ts's YoY computation, a separate calendar-sync concern)
 * is unchanged and still fetches SBP EasyData live.
 */
async function fetchCanonicalIndicatorHistoryUncached(key: SbpIndicatorKey): Promise<SbpIndicatorHistory> {
  const config = CONFIGS[key];
  const rows = await getCanonicalSbpHistory(canonicalIndicatorKey(key), 5000);
  if (rows.length === 0) {
    logSbpError(key, "No canonical observations ingested yet — run scripts/ingestSbp.ts", "fallback");
    const fb = config.fallback;
    return {
      points: fb.trend.map((p) => ({ date: parseFallbackMonthLabel(p.month), value: p.value })),
      meta: { ...fb.meta, source: "SBP EasyData", sourceStatus: "fallback" },
    };
  }
  const latest = rows[rows.length - 1];
  return {
    points: rows.map((r) => ({
      date: r.observationPeriod,
      value: Number(config.toTrendValue(r.value).toFixed(4)),
    })),
    meta: {
      source: "SBP EasyData",
      seriesKey: SERIES_KEYS[key],
      seriesName: latest.seriesName ?? INDICATOR_LABELS[key],
      unit: latest.unit,
      frequency: config.frequency,
      observationDate: latest.observationPeriod,
      lastUpdated: latest.vintage,
      sourceStatus: "live",
    },
  };
}

// --- Comparisons feature: Urban Food CPI (standalone, not part of the ----
// shared CONFIGS/getAllSbpIndicators() bulk fetch used by the homepage) ---
//
// Deliberately NOT added to SERIES_KEYS/CONFIGS above: that Record type is
// iterated in full by getAllSbpIndicators(), which the homepage calls — a
// new shared-config key would silently add an extra fetch to the homepage's
// render path for an indicator it never displays. This mirrors how
// getGoldHistory()/getGdpGrowthHistory() are standalone, comparisons-only
// fetchers in yfinance.ts/worldBank.ts.
//
// Series key verified directly against SBP EasyData's /meta endpoint by
// exhaustively enumerating every series in the "Inflation Snapshot"
// dataset (P00011516 through P00301516) — there is no National Food CPI,
// only Urban/Rural splits, so this is explicitly labeled "Urban Food
// Inflation" rather than implying a national figure that doesn't exist.
const FOOD_INFLATION_URBAN_SERIES_KEY = "TS_GP_PT_CPI_M.P00041516";

export interface FoodInflationUrbanResult {
  points: SbpHistoryPoint[];
  source: "SBP EasyData";
}

/**
 * Live full-history fetch for scripts/ingestSbp.ts only — Production
 * Readiness Audit (Phase 6A.3) finding: getFoodInflationUrbanHistory() below
 * used to call SBP EasyData directly from the /pakistan-food-inflation page's
 * render path, the one confirmed remaining violation of "no page performs a
 * live SBP EasyData fetch during rendering." This indicator isn't part of
 * CONFIGS/SbpIndicatorKey (deliberately — see FOOD_INFLATION_URBAN_SERIES_KEY's
 * own comment), so it needs its own thin ingestion wrapper rather than reusing
 * fetchSbpSeriesForIngestion, which is keyed by SbpIndicatorKey.
 */
export async function fetchFoodInflationUrbanForIngestion(sinceDate?: string): Promise<SbpSeries> {
  return fetchSbpSeries(FOOD_INFLATION_URBAN_SERIES_KEY, REVALIDATE_MONTHLY, "sbp-food-inflation-urban", true, sinceDate);
}

/**
 * Urban Food CPI, year-over-year %. Reads canonical_observations (migration
 * 0050, indicator_key "sbp:foodInflationUrban") — never calls SBP EasyData
 * during rendering. Returns null when nothing has been ingested yet, same
 * as the original live-fetch-failure contract (no static fallback exists
 * for this series, so callers already handle null).
 */
export async function getFoodInflationUrbanHistory(): Promise<FoodInflationUrbanResult | null> {
  const cacheKey = "sbp-food-inflation-urban-history";
  const cached = getFresh<FoodInflationUrbanResult>(cacheKey, REVALIDATE_MONTHLY * 1000);
  if (cached) return cached.data;

  return dedupeInFlight(cacheKey, async () => {
    const rows = await getCanonicalSbpHistory(FOOD_INFLATION_URBAN_INDICATOR_KEY, 500);
    if (rows.length === 0) {
      console.error(
        `[SBP] Urban Food Inflation — no canonical observations ingested yet\nServing: none (no fallback snapshot exists for this series)\nTimestamp: ${new Date().toISOString()}`,
      );
      return null;
    }
    const result: FoodInflationUrbanResult = {
      points: rows.map((r) => ({ date: r.observationPeriod, value: r.value })),
      source: "SBP EasyData",
    };
    setCache(cacheKey, result);
    return result;
  });
}

// --- Money Supply M2 YoY growth (weeklyIntelligenceCompute.ts only) --------
//
// Standalone, not part of CONFIGS/getAllSbpIndicators() for the same reason
// as FOOD_INFLATION_URBAN_SERIES_KEY above: it's a single extra consumer
// (the Health Score model's m2GrowthPct input), not a homepage KPI card.
//
// This is SBP's own official precomputed weekly M2 YoY growth series — the
// sibling "Memorandum" series to M000070 (the level series moneySupplyM2
// now uses) in the same "Weekly Broad Money M2" dataset. Using it directly
// avoids deriving YoY growth from a trend array via a fixed index offset
// (fragile: correct only as long as the array happens to hold exactly one
// point per period going back a year — true for the old monthly series'
// 24-point cap, but not for a weekly series, where 24 points is under 6
// months). weeklyIntelligenceCompute.ts falls back to its prior trend-index
// estimate if this fetch fails, so a transient SBP outage degrades rather
// than breaks the Health Score computation.
const M2_YOY_GROWTH_SERIES_KEY = "TS_GP_BAM_M2_W.M000500"; // Memorandum: Broad Money (M2) - YoY growth

export interface MoneySupplyM2YoyResult {
  value: number;
  date: string;
  source: "SBP EasyData";
}

export async function getMoneySupplyM2YoyGrowth(): Promise<MoneySupplyM2YoyResult | null> {
  const cacheKey = "sbp-m2-yoy-growth";
  const cached = getFresh<MoneySupplyM2YoyResult>(cacheKey, REVALIDATE_AS_NEEDED * 1000);
  if (cached) return cached.data;

  try {
    return await dedupeInFlight(cacheKey, async () => {
      const series = await fetchSbpSeries(M2_YOY_GROWTH_SERIES_KEY, REVALIDATE_AS_NEEDED, "sbp-m2-yoy-growth");
      const result: MoneySupplyM2YoyResult = {
        value: series.latestValue,
        date: series.latestDate,
        source: "SBP EasyData",
      };
      setCache(cacheKey, result);
      return result;
    });
  } catch (err) {
    console.error(
      `[SBP] M2 YoY Growth fetch failed\nReason: ${err instanceof Error ? err.message : String(err)}\nServing: none (caller falls back to trend-derived estimate)\nTimestamp: ${new Date().toISOString()}`,
    );
    return null;
  }
}
