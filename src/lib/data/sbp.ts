import type { TrendPoint } from "@/components/charts/TrendLineChart";
import type { Kpi } from "@/data/kpiData";
import type { DataFrequency } from "@/lib/dataFreshness";
import type { SourceStatus } from "@/lib/dataQuality";
import { dedupeInFlight, getFresh, getStale, setCache } from "@/lib/memoryCache";
import { getLatestCanonicalObservation } from "@/lib/data/canonicalObservation";
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

type Frequency = "Monthly" | "As-Needed" | "Weekly" | "Annual";

const SBP_FREQ_MAP: Record<Frequency, DataFrequency> = {
  "Monthly": "Monthly",
  "As-Needed": "As Needed",
  "Weekly": "Weekly",
  "Annual": "Annual",
} as const;

// Series keys discovered via the SBP EasyData /meta endpoints. Each key is
// "{dataset_code}.{series_code}".
const SERIES_KEYS = {
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
  moneySupplyM2: "TS_GP_BAM_M3_M.MA3001700", // M2
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
  source: "SBP EasyData" | "SBP EasyData (fallback)";
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

function changeLabel(diff: number, previousLabel: string | null, format: (value: number) => string): string {
  if (previousLabel === null) {
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
async function fetchSbpSeries(seriesKey: string, revalidateSeconds: number, cacheTag: string, noCache = false): Promise<SbpSeries> {
  const apiKey = process.env.SBP_EASYDATA_API_KEY;
  if (!apiKey) {
    throw new Error("SBP_EASYDATA_API_KEY is not set");
  }

  const params = new URLSearchParams({
    api_key: apiKey,
    start_date: HISTORY_START_DATE,
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

function buildForeignReservesKpi(series: SbpSeries): Kpi {
  const latestB = series.latestValue / 1000;
  const diffB = series.previousValue !== null ? (series.latestValue - series.previousValue) / 1000 : 0;
  const prevLabel = series.previousDate ? formatMonthLabel(series.previousDate) : null;
  return {
    title: "Foreign Reserves",
    value: latestB.toFixed(1),
    unit: "B USD",
    change: changeLabel(diffB, prevLabel, (d) => `${d.toFixed(1)}B`),
    trend: diffB >= 0 ? "up" : "down",
    glow: "blue",
  };
}

function buildNetBankReservesKpi(series: SbpSeries): Kpi {
  const latestB = series.latestValue / 1000;
  const diffB = series.previousValue !== null ? (series.latestValue - series.previousValue) / 1000 : 0;
  const prevLabel = series.previousDate ? formatMonthLabel(series.previousDate) : null;
  return {
    title: "Bank Reserves",
    value: latestB.toFixed(2),
    unit: "B USD",
    change: changeLabel(diffB, prevLabel, (d) => `${d.toFixed(2)}B`),
    trend: diffB >= 0 ? "up" : "down",
    glow: "purple",
  };
}

function buildUsdPkrKpi(series: SbpSeries): Kpi {
  const diff = series.previousValue !== null ? series.latestValue - series.previousValue : 0;
  const prevLabel = series.previousDate ? formatMonthLabel(series.previousDate) : null;
  return {
    title: "USD / PKR",
    value: series.latestValue.toFixed(2),
    unit: "PKR",
    change: changeLabel(diff, prevLabel, (d) => d.toFixed(2)),
    trend: diff >= 0 ? "up" : "down",
    glow: "purple",
  };
}

function buildPolicyRateKpi(series: SbpSeries): Kpi {
  const diff = series.previousValue !== null ? series.latestValue - series.previousValue : 0;
  const prevLabel = series.previousDate ? formatDayMonthLabel(series.previousDate) : null;
  return {
    title: "Policy Rate",
    value: series.latestValue.toFixed(2),
    unit: "%",
    change: changeLabel(diff, prevLabel, (d) => `${d.toFixed(2)} pp`),
    trend: diff >= 0 ? "up" : "down",
    glow: "blue",
  };
}

function buildCpiInflationKpi(series: SbpSeries): Kpi {
  const diff = series.previousValue !== null ? series.latestValue - series.previousValue : 0;
  const prevLabel = series.previousDate ? formatMonthLabel(series.previousDate) : null;
  return {
    title: "CPI Inflation",
    value: series.latestValue.toFixed(1),
    unit: "%",
    change: changeLabel(diff, prevLabel, (d) => `${d.toFixed(1)} pp`),
    trend: diff >= 0 ? "up" : "down",
    glow: "purple",
  };
}

function buildCoreInflationKpi(series: SbpSeries): Kpi {
  const diff = series.previousValue !== null ? series.latestValue - series.previousValue : 0;
  const prevLabel = series.previousDate ? formatMonthLabel(series.previousDate) : null;
  return {
    title: "Core Inflation",
    value: series.latestValue.toFixed(1),
    unit: "%",
    change: changeLabel(diff, prevLabel, (d) => `${d.toFixed(1)} pp`),
    trend: diff >= 0 ? "up" : "down",
    glow: "blue",
  };
}

function buildWpiInflationKpi(series: SbpSeries): Kpi {
  const diff = series.previousValue !== null ? series.latestValue - series.previousValue : 0;
  const prevLabel = series.previousDate ? formatMonthLabel(series.previousDate) : null;
  return {
    title: "WPI Inflation",
    value: series.latestValue.toFixed(1),
    unit: "%",
    change: changeLabel(diff, prevLabel, (d) => `${d.toFixed(1)} pp`),
    trend: diff >= 0 ? "up" : "down",
    glow: "purple",
  };
}

function buildTbillYield3mKpi(series: SbpSeries): Kpi {
  const diff = series.previousValue !== null ? series.latestValue - series.previousValue : 0;
  const prevLabel = series.previousDate ? formatDayMonthLabel(series.previousDate) : null;
  return {
    title: "3M T-Bill Yield",
    value: series.latestValue.toFixed(2),
    unit: "%",
    change: changeLabel(diff, prevLabel, (d) => `${d.toFixed(2)} pp`),
    trend: diff >= 0 ? "up" : "down",
    glow: "blue",
  };
}

function buildPibYield3yKpi(series: SbpSeries): Kpi {
  const diff = series.previousValue !== null ? series.latestValue - series.previousValue : 0;
  const prevLabel = series.previousDate ? formatDayMonthLabel(series.previousDate) : null;
  return {
    title: "3Y PIB Yield",
    value: series.latestValue.toFixed(2),
    unit: "%",
    change: changeLabel(diff, prevLabel, (d) => `${d.toFixed(2)} pp`),
    trend: diff >= 0 ? "up" : "down",
    glow: "purple",
  };
}

function buildRemittancesKpi(series: SbpSeries): Kpi {
  const latestB = series.latestValue / 1000;
  const pctDiff =
    series.previousValue && series.previousValue !== 0
      ? ((series.latestValue - series.previousValue) / series.previousValue) * 100
      : 0;
  const prevLabel = series.previousDate ? formatMonthLabel(series.previousDate) : null;
  return {
    title: "Remittances",
    value: latestB.toFixed(1),
    unit: "B USD",
    change: changeLabel(pctDiff, prevLabel, (d) => `${d.toFixed(1)}%`),
    trend: pctDiff >= 0 ? "up" : "down",
    glow: "blue",
  };
}

function buildCurrentAccountKpi(series: SbpSeries): Kpi {
  const latestB = series.latestValue / 1000;
  const diffB = series.previousValue !== null ? (series.latestValue - series.previousValue) / 1000 : 0;
  const prevLabel = series.previousDate ? formatMonthLabel(series.previousDate) : null;
  return {
    title: "Current Account",
    value: latestB.toFixed(2),
    unit: "B USD",
    change: changeLabel(diffB, prevLabel, (d) => `${d.toFixed(2)}B`),
    trend: diffB >= 0 ? "up" : "down",
    glow: "purple",
  };
}

function buildTradeBalanceKpi(series: SbpSeries): Kpi {
  const latestB = series.latestValue / 1000;
  const diffB = series.previousValue !== null ? (series.latestValue - series.previousValue) / 1000 : 0;
  const prevLabel = series.previousDate ? formatMonthLabel(series.previousDate) : null;
  return {
    title: "Trade Balance",
    value: latestB.toFixed(2),
    unit: "B USD",
    change: changeLabel(diffB, prevLabel, (d) => `${d.toFixed(2)}B`),
    trend: diffB >= 0 ? "up" : "down",
    glow: "blue",
  };
}

function buildMoneySupplyM2Kpi(series: SbpSeries): Kpi {
  const latestT = series.latestValue / 1e6;
  const pctDiff =
    series.previousValue && series.previousValue !== 0
      ? ((series.latestValue - series.previousValue) / series.previousValue) * 100
      : 0;
  const prevLabel = series.previousDate ? formatMonthLabel(series.previousDate) : null;
  return {
    title: "Money Supply (M2)",
    value: latestT.toFixed(2),
    unit: "T PKR",
    change: changeLabel(pctDiff, prevLabel, (d) => `${d.toFixed(1)}%`),
    trend: pctDiff >= 0 ? "up" : "down",
    glow: "purple",
  };
}

function buildExportsKpi(series: SbpSeries): Kpi {
  const latestB = series.latestValue / 1000;
  const diffB = series.previousValue !== null ? (series.latestValue - series.previousValue) / 1000 : 0;
  const prevLabel = series.previousDate ? formatMonthLabel(series.previousDate) : null;
  return {
    title: "Exports",
    value: latestB.toFixed(2),
    unit: "B USD",
    change: changeLabel(diffB, prevLabel, (d) => `${d.toFixed(2)}B`),
    trend: diffB >= 0 ? "up" : "down",
    glow: "blue",
  };
}

function buildImportsKpi(series: SbpSeries): Kpi {
  const latestB = series.latestValue / 1000;
  const diffB = series.previousValue !== null ? (series.latestValue - series.previousValue) / 1000 : 0;
  const prevLabel = series.previousDate ? formatMonthLabel(series.previousDate) : null;
  return {
    title: "Imports",
    value: latestB.toFixed(2),
    unit: "B USD",
    change: changeLabel(diffB, prevLabel, (d) => `${d.toFixed(2)}B`),
    trend: diffB >= 0 ? "up" : "down",
    glow: "purple",
  };
}

function buildFdiInflowsKpi(series: SbpSeries): Kpi {
  const diff = series.previousValue !== null ? series.latestValue - series.previousValue : 0;
  const prevLabel = series.previousDate ? formatMonthLabel(series.previousDate) : null;
  return {
    title: "FDI Inflows",
    value: series.latestValue.toFixed(1),
    unit: "M USD",
    change: changeLabel(diff, prevLabel, (d) => `${d.toFixed(1)}M`),
    trend: diff >= 0 ? "up" : "down",
    glow: "blue",
  };
}

function buildReerKpi(series: SbpSeries): Kpi {
  const diff = series.previousValue !== null ? series.latestValue - series.previousValue : 0;
  const prevLabel = series.previousDate ? formatMonthLabel(series.previousDate) : null;
  return {
    title: "REER",
    value: series.latestValue.toFixed(1),
    unit: "Index",
    change: changeLabel(diff, prevLabel, (d) => d.toFixed(1)),
    trend: diff >= 0 ? "up" : "down",
    glow: "purple",
  };
}

function buildLsmKpi(series: SbpSeries): Kpi {
  // EasyData LSM series (LSM000160000) returns a quantum index (base FY2015-16=100),
  // not YoY growth. Compute deterministic YoY: (current / same_month_prior_year − 1) × 100.
  // Matches the methodology used by syncLsmYoYFromEasyData.ts and PBS official releases.
  const latestDate    = series.latestDate;
  const latestYear    = parseInt(latestDate.slice(0, 4), 10);
  const latestMonth   = latestDate.slice(5, 7);
  const priorYrPrefix = `${latestYear - 1}-${latestMonth}`;
  const priorYrPoint  = series.history.find((p) => p.date.startsWith(priorYrPrefix));

  if (!priorYrPoint || priorYrPoint.value === 0) {
    // No prior-year observation available — show raw quantum index with honest label.
    const rawDiff  = series.previousValue !== null ? series.latestValue - series.previousValue : 0;
    const prevLabel = series.previousDate ? formatMonthLabel(series.previousDate) : null;
    return {
      title: "LSM Growth",
      value: series.latestValue.toFixed(1),
      unit:  "Index (base FY16)",
      change: changeLabel(rawDiff, prevLabel, (d) => d.toFixed(1)),
      trend: rawDiff >= 0 ? "up" : "down",
      glow: "blue",
    };
  }

  const yoyPct = ((series.latestValue / priorYrPoint.value) - 1) * 100;

  // Change label = this month's YoY − previous month's YoY (pp difference).
  let change = "no prior data";
  if (series.previousDate && series.previousValue !== null) {
    const prevYear    = parseInt(series.previousDate.slice(0, 4), 10);
    const prevMonth   = series.previousDate.slice(5, 7);
    const prevPriorPfx = `${prevYear - 1}-${prevMonth}`;
    const prevPriorPt  = series.history.find((p) => p.date.startsWith(prevPriorPfx));
    if (prevPriorPt && prevPriorPt.value !== 0) {
      const prevYoY = ((series.previousValue / prevPriorPt.value) - 1) * 100;
      const diff    = yoyPct - prevYoY;
      change        = changeLabel(diff, formatMonthLabel(series.previousDate), (d) => `${d.toFixed(1)} pp`);
    }
  }

  return {
    title: "LSM Growth",
    value: yoyPct.toFixed(1),
    unit:  "% YoY",
    change,
    trend: yoyPct >= 0 ? "up" : "down",
    glow: "blue",
  };
}

function buildPrivateCreditGrowthKpi(series: SbpSeries): Kpi {
  const diff = series.previousValue !== null ? series.latestValue - series.previousValue : 0;
  const prevLabel = series.previousDate ? formatDayMonthLabel(series.previousDate) : null;
  return {
    title: "Private Credit Growth",
    value: series.latestValue.toFixed(1),
    unit: "% YoY",
    change: changeLabel(diff, prevLabel, (d) => `${d.toFixed(1)} pp`),
    trend: diff >= 0 ? "up" : "down",
    glow: "purple",
  };
}

function buildFiscalBalanceKpi(series: SbpSeries): Kpi {
  const latestT = series.latestValue / 1e6;
  const diffT = series.previousValue !== null ? (series.latestValue - series.previousValue) / 1e6 : 0;
  const prevLabel = series.previousDate ? formatMonthLabel(series.previousDate) : null;
  return {
    title: "Fiscal Balance",
    value: latestT.toFixed(2),
    unit: "T PKR",
    change: changeLabel(diffT, prevLabel, (d) => `${d.toFixed(2)}T`),
    trend: diffT >= 0 ? "up" : "down",
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
    revalidate: REVALIDATE_MONTHLY,
    frequency: "Monthly",
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

async function buildIndicatorResult(key: SbpIndicatorKey, config: IndicatorConfig, noCache = false): Promise<SbpIndicatorResult> {
  const series = await fetchSbpSeries(config.seriesKey, config.revalidate, sbpCacheTag(key), noCache);
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

// Maps from SbpIndicatorKey to the economic_event_series slug in Supabase.
// Only the 4 PBS-primary indicators appear here; all others skip the
// canonical check immediately (fast path in applyCanonicalOverride).
const CANONICAL_SERIES_SLUGS: Partial<Record<SbpIndicatorKey, string>> = {
  cpiInflation:  "cpi-inflation-release",
  coreInflation: "core-inflation-release",
  lsm:           "large-scale-manufacturing-lsm-growth",
  tradeBalance:  "trade-balance",
};

/**
 * Overlays a confirmed PBS observation from economic_events onto an SBP
 * EasyData result when the canonical observation covers a newer reference
 * period than SBP has published yet.
 *
 * Only the 4 PBS-primary indicators activate this path (CPI, Core, LSM,
 * Trade Balance). All others return sbpResult unchanged immediately.
 *
 * The canonical value comes from syncCpiFromPbs / syncLsmFromPbs /
 * syncTradeBalanceFromPbs, which all run within 15 min of PBS publishing.
 * SBP EasyData typically lags PBS by 2–5 days for CPI, 5–10 days for
 * LSM and Trade Balance.
 *
 * On any failure (Supabase unreachable, parse error, stale canonical) the
 * original sbpResult is returned unchanged — this is best-effort enrichment.
 *
 * The SBP trend/sparkline is always preserved unchanged regardless of the
 * canonical override, since PBS does not publish long time-series.
 */
async function applyCanonicalOverride(
  key: SbpIndicatorKey,
  sbpResult: SbpIndicatorResult,
): Promise<SbpIndicatorResult> {
  const seriesSlug = CANONICAL_SERIES_SLUGS[key];
  if (!seriesSlug) return sbpResult;

  try {
    const canonical = await getLatestCanonicalObservation(seriesSlug);
    if (!canonical) return sbpResult;

    // Only override when canonical covers a newer reference period than SBP.
    // Lexicographic comparison is valid for ISO dates: "2026-06-30" > "2026-05-31".
    if (canonical.observationDate <= sbpResult.meta.observationDate) {
      return sbpResult;
    }

    const prevLabel      = formatMonthLabel(sbpResult.meta.observationDate);
    const sbpLatestValue = parseFloat(sbpResult.kpi.value);

    let change: string;
    let trend: "up" | "down";
    if (key === "tradeBalance") {
      // PBS (customs-basis) and SBP (BPM6) use different methodologies.
      // A cross-method diff label would be misleading; explain the status instead.
      change = "PBS advance release — SBP BPM6 confirmation pending";
      trend  = canonical.value >= 0 ? "up" : "down";
    } else {
      // CPI, Core, LSM are all % YoY — pp diff vs SBP's last period is valid.
      const diff = canonical.value - sbpLatestValue;
      change = changeLabel(diff, prevLabel, (d) => `${d.toFixed(1)} pp`);
      trend  = diff >= 0 ? "up" : "down";
    }

    console.log(
      `[SBP] ${INDICATOR_LABELS[key]} — canonical-override — ` +
      `PBS obs=${canonical.observationDate} > SBP obs=${sbpResult.meta.observationDate} ` +
      `— value PBS=${canonical.value} SBP-prev=${sbpLatestValue} (${canonical.sourceName})`,
    );

    return {
      ...sbpResult,
      kpi: {
        ...sbpResult.kpi,
        value:        key === "tradeBalance"
                        ? canonical.value.toFixed(2)
                        : canonical.value.toFixed(1),
        unit:         key === "lsm" ? "% YoY" : sbpResult.kpi.unit,
        change,
        trend,
        source:       canonical.sourceName,
        latestDate:   canonical.observationDate,
        sourceStatus: "live" as const,
        snapshotDate: undefined,
      },
      meta: {
        ...sbpResult.meta,
        observationDate: canonical.observationDate,
        sourceStatus:    "live" as const,
      },
    };
  } catch (err) {
    console.error(
      `[SBP] ${INDICATOR_LABELS[key]} canonical override check failed: ` +
      (err instanceof Error ? err.message : String(err)),
    );
    return sbpResult;
  }
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
 *  2. A live upstream fetch (buildIndicatorResult -> fetchSbpSeries),
 *     subject to the existing L2 Next.js fetch-cache revalidate window.
 *  3. On any failure: the last-known-good L1 value regardless of age
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
    return applyCanonicalOverride(key, withSourceStatus(l1.data, "cache-fresh"));
  }

  return dedupeInFlight(cacheKey, async () => {
    try {
      const result = await buildIndicatorResult(key, config);
      setCache(cacheKey, result);
      logSbp(key, "live", `fetched OK, observation=${result.meta.observationDate}`);
      return applyCanonicalOverride(key, withSourceStatus(result, "live"));
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      const stale = getStale<SbpIndicatorResult>(cacheKey);
      if (stale) {
        logSbpError(key, reason, "cache-stale");
        return applyCanonicalOverride(key, withSourceStatus(stale.data, "cache-stale"));
      }
      logSbpError(key, reason, "fallback");
      const fb = config.fallback;
      return applyCanonicalOverride(
        key,
        withSourceStatus(
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
        ),
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
    const result = await fetchSbpIndicatorHistoryUncached(key);
    setCache(cacheKey, result);
    return result;
  });
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

async function fetchSbpIndicatorHistoryUncached(key: SbpIndicatorKey): Promise<SbpIndicatorHistory> {
  const config = CONFIGS[key];
  try {
    const series = await fetchSbpSeries(config.seriesKey, config.revalidate, sbpCacheTag(key));
    return {
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
  } catch (err) {
    logSbpError(key, err instanceof Error ? err.message : String(err), "fallback");
    const fb = config.fallback;
    return {
      points: fb.trend.map((p) => ({ date: parseFallbackMonthLabel(p.month), value: p.value })),
      meta: { ...fb.meta, source: "SBP EasyData", sourceStatus: "fallback" },
    };
  }
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

/** Urban Food CPI, year-over-year %. Returns null on failure rather than a static fallback — there's no pre-vetted snapshot for this series. */
export async function getFoodInflationUrbanHistory(): Promise<FoodInflationUrbanResult | null> {
  const cacheKey = "sbp-food-inflation-urban-history";
  const cached = getFresh<FoodInflationUrbanResult>(cacheKey, REVALIDATE_MONTHLY * 1000);
  if (cached) return cached.data;

  try {
    return await dedupeInFlight(cacheKey, async () => {
      const series = await fetchSbpSeries(FOOD_INFLATION_URBAN_SERIES_KEY, REVALIDATE_MONTHLY, "sbp-food-inflation-urban");
      const result: FoodInflationUrbanResult = {
        points: series.history.map((p) => ({ date: p.date, value: p.value })),
        source: "SBP EasyData",
      };
      setCache(cacheKey, result);
      return result;
    });
  } catch (err) {
    console.error(
      `[SBP] Urban Food Inflation fetch failed\nReason: ${err instanceof Error ? err.message : String(err)}\nServing: none (no fallback snapshot exists for this series)\nTimestamp: ${new Date().toISOString()}`,
    );
    return null;
  }
}
