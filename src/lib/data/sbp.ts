import type { TrendPoint } from "@/components/charts/TrendLineChart";
import type { Kpi } from "@/data/kpiData";
import {
  fallbackCoreInflation,
  fallbackCpiInflation,
  fallbackCurrentAccount,
  fallbackForeignReserves,
  fallbackMoneySupplyM2,
  fallbackPibYield3y,
  fallbackPolicyRate,
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

type Frequency = "Monthly" | "As-Needed";

// Series keys discovered via the SBP EasyData /meta endpoints. Each key is
// "{dataset_code}.{series_code}".
const SERIES_KEYS = {
  foreignReserves: "TS_GP_EXT_PAKRES_M.Z00020", // Total SBP Reserves
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
async function fetchSbpSeries(seriesKey: string, revalidateSeconds: number): Promise<SbpSeries> {
  const apiKey = process.env.SBP_EASYDATA_API_KEY;
  if (!apiKey) {
    throw new Error("SBP_EASYDATA_API_KEY is not set");
  }

  const params = new URLSearchParams({
    api_key: apiKey,
    start_date: HISTORY_START_DATE,
    format: "json",
  });

  const response = await fetch(`${SBP_API_BASE}/${seriesKey}/data?${params.toString()}`, {
    next: { revalidate: revalidateSeconds },
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
};

async function buildIndicatorResult(config: IndicatorConfig): Promise<SbpIndicatorResult> {
  const series = await fetchSbpSeries(config.seriesKey, config.revalidate);
  const formatLabel = config.frequency === "Monthly" ? formatMonthLabel : formatDayMonthLabel;

  return {
    kpi: config.buildKpi(series),
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
 * Fetches a single SBP indicator (KPI + trend + source metadata), falling
 * back to the last-known snapshot in src/data/sbpFallbackData.ts if the API
 * key is missing, the request fails, or the response is unusable.
 */
export async function getSbpIndicator(key: SbpIndicatorKey): Promise<SbpIndicatorResult> {
  const config = CONFIGS[key];
  try {
    return await buildIndicatorResult(config);
  } catch {
    return config.fallback;
  }
}

/**
 * Fetches all 12 SBP indicators in parallel. Each indicator falls back
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
