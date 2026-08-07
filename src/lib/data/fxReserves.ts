// Net Liquid SBP Foreign Reserves — the weekly, net-liquid figure SBP itself
// publishes in Forex_Arch.xlsx and the one financial media/markets actually
// mean by "Pakistan's foreign reserves." Distinct from sbp.ts's
// `foreignReserves` (EasyData series Z00020, "Total SBP Reserves" — a
// broader, monthly IMF-template figure that includes gold/SDR/IMF reserve
// position beyond pure liquid FX). Both are real, official SBP measures;
// this module intentionally never sums or blends them with the EasyData
// series, so every trend/chart backed by this module is single-series,
// single-frequency history (never a monthly point spliced next to weekly
// ones).
//
// This is the SAME underlying file and parser family the Economic
// Calendar's weekly release alert already uses (see
// syncFxReservesFromSbpExcel.ts) — reusing it here (rather than a second,
// independent implementation) is what makes the dashboard KPI and the
// calendar's release value structurally guaranteed to agree, closing the
// cross-page mismatch and the permanently-false `releaseAlreadyReflected`
// bug this was built to fix (see src/app/page.tsx's withCalendarFreshness
// call site).
import "server-only";
import type { TrendPoint } from "@/components/charts/TrendLineChart";
import type { Kpi } from "@/data/kpiData";
import type { SbpIndicatorResult, SbpMeta } from "@/lib/data/sbp";
import type { SourceStatus } from "@/lib/dataQuality";
import { getTrendDirection } from "@/lib/trendDirection";
import { dedupeInFlight, getFresh, getStale, setCache } from "@/lib/memoryCache";
import {
  fetchFxReservesHistoryFresh,
  type FxReservesWeeklyRow,
} from "@/lib/economicCalendar/automation/syncFxReservesFromSbpExcel";
import { fallbackNetLiquidReserves } from "@/data/sbpFallbackData";

// SBP publishes a new week-ending observation on Thursdays/Fridays — matches
// the revalidate window sbp.ts uses for its own weekly/as-needed series
// (moneySupplyM2, privateCreditGrowth) so a new Friday observation is picked
// up same-day. Also required for /foreign-exchange-reserves-pakistan and the
// homepage to stay statically/ISR-generated — a cache:"no-store" fetch here
// would force both pages fully dynamic (confirmed via a real build).
const REVALIDATE_SECONDS = 60 * 60 * 6;
const L1_TTL_MS = 10 * 60 * 1000; // 10 min, same as sbp.ts's getSbpIndicator L1
const HISTORY_DISPLAY_POINTS = 24; // ~6 months of weekly data, same display convention as every other trend chart in the app
const CACHE_KEY = "fx-reserves-weekly-history";

function logFx(status: SourceStatus, detail: string): void {
  console.log(`[FxReserves] Net Liquid SBP Reserves — ${status} — ${detail} — ${new Date().toISOString()}`);
}

function logFxError(reason: string, servedFrom: SourceStatus): void {
  console.error(`[FxReserves] Net Liquid SBP Reserves fetch failed\nReason: ${reason}\nServing: ${servedFrom}\nTimestamp: ${new Date().toISOString()}`);
}

/** "2026-07-31" -> "31 Jul '26" — same short day-month convention sbp.ts uses for its own Weekly/As-Needed series. */
function formatWeekLabel(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${Number(day)} ${MONTH_NAMES[Number(month) - 1]} '${year.slice(2)}`;
}

async function fetchHistoryThroughCache(noCache = false): Promise<{ history: FxReservesWeeklyRow[]; sourceStatus: SourceStatus }> {
  if (!noCache) {
    const l1 = getFresh<FxReservesWeeklyRow[]>(CACHE_KEY, L1_TTL_MS);
    if (l1) {
      logFx("cache-fresh", `L1 hit, ${Math.round(l1.ageMs / 1000)}s old`);
      return { history: l1.data, sourceStatus: "cache-fresh" };
    }
  }

  return dedupeInFlight(CACHE_KEY, async () => {
    try {
      // null (cache:"no-store") only for the explicit noCache path
      // (getNetLiquidReservesFresh, sync/audit use) — the normal dashboard
      // path needs a cacheable, ISR-compatible fetch or Next.js forces the
      // whole page dynamic (see downloadForexArch's docstring).
      const history = await fetchFxReservesHistoryFresh(noCache ? null : REVALIDATE_SECONDS);

      // Final gate before this ever reaches the cache or a chart (Phase 6A
      // hotfix): the parser already rejects individually implausible/
      // non-chronological rows, but a wrong-sheet or truncated-file read
      // could still produce a "clean" history whose LATEST point is stale
      // relative to today — e.g. if SBP's file structure changes again and
      // the parser silently locks onto an old archived sheet. 45 days
      // covers the normal ~7-day cadence plus a generous allowance for a
      // missed update; beyond that, treat the fetch as failed rather than
      // caching/displaying a result that only LOOKS successful.
      const latest = history[history.length - 1];
      const ageDays = (Date.now() - new Date(latest.weekEndingDate).getTime()) / 86_400_000;
      if (ageDays > 45) {
        throw new Error(`Parsed history's latest observation (${latest.weekEndingDate}) is ${Math.round(ageDays)} days old — treating as a failed fetch rather than caching a stale-looking result.`);
      }

      setCache(CACHE_KEY, history);
      logFx("live", `fetched OK, ${history.length} weekly points, latest=${latest.weekEndingDate}`);
      return { history, sourceStatus: "live" as SourceStatus };
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      const stale = getStale<FxReservesWeeklyRow[]>(CACHE_KEY);
      if (stale) {
        logFxError(reason, "cache-stale");
        return { history: stale.data, sourceStatus: "cache-stale" as SourceStatus };
      }
      logFxError(reason, "fallback");
      throw err;
    }
  });
}

// Mirrors sbp.ts's buildIndicatorResult()+withSourceStatus() convention:
// source/seriesId/latestDate/frequency/sourceStatus/snapshotDate all live on
// the KPI itself (not just meta), since DataQualityBadge/KpiCard read them
// from there (see SeoPageLayout's BadgeKpi = Pick<Kpi, ...>).
function buildKpi(history: FxReservesWeeklyRow[], sourceStatus: SourceStatus): Kpi {
  const latest = history[history.length - 1];
  const previous = history.length > 1 ? history[history.length - 2] : null;
  const latestB = latest.netSbpReservesM / 1000;
  const diffB = previous ? (latest.netSbpReservesM - previous.netSbpReservesM) / 1000 : null;
  const change = previous
    ? `${diffB !== null && diffB >= 0 ? "+" : ""}${diffB?.toFixed(1)}B vs ${formatWeekLabel(previous.weekEndingDate)}`
    : "no prior data";
  const isFallback = sourceStatus === "fallback";
  return {
    title: "Foreign Reserves",
    value: latestB.toFixed(1),
    unit: "B USD",
    change,
    trend: getTrendDirection(diffB),
    glow: "blue",
    source: isFallback ? "SBP Forex_Arch.xlsx (fallback)" : "SBP Forex_Arch.xlsx",
    seriesId: "Forex_Arch.xlsx:NET RESERVES WITH SBP",
    latestDate: latest.weekEndingDate,
    frequency: "Weekly",
    sourceStatus,
    snapshotDate: isFallback ? latest.weekEndingDate : undefined,
  };
}

function buildMeta(history: FxReservesWeeklyRow[], sourceStatus: SourceStatus): SbpMeta {
  const latest = history[history.length - 1];
  const isFallback = sourceStatus === "fallback";
  return {
    source: isFallback ? "SBP Forex_Arch.xlsx (fallback)" : "SBP Forex_Arch.xlsx",
    seriesKey: "Forex_Arch.xlsx:NET RESERVES WITH SBP",
    seriesName: "Net Liquid SBP Reserves",
    unit: "Million USD",
    frequency: "Weekly",
    observationDate: latest.weekEndingDate,
    lastUpdated: new Date().toISOString(),
    sourceStatus,
  };
}

function buildTrend(history: FxReservesWeeklyRow[]): TrendPoint[] {
  return history.slice(-HISTORY_DISPLAY_POINTS).map((point) => ({
    month: formatWeekLabel(point.weekEndingDate),
    value: Number((point.netSbpReservesM / 1000).toFixed(2)),
  }));
}

/**
 * The dashboard's primary "Foreign Reserves" KPI + 24-week trend — same
 * three-tier resolution as getSbpIndicator() (L1 cache -> live fetch ->
 * last-known-good stale cache -> static fallback), same SbpIndicatorResult
 * shape so every existing KpiCard/SeoPageLayout/DataQualityBadge consumer
 * works unchanged.
 */
export async function getNetLiquidReserves(): Promise<SbpIndicatorResult> {
  try {
    const { history, sourceStatus } = await fetchHistoryThroughCache();
    return { kpi: buildKpi(history, sourceStatus), trend: buildTrend(history), meta: buildMeta(history, sourceStatus) };
  } catch {
    return fallbackNetLiquidReserves;
  }
}

/** For the sync/freshness-audit pipelines only — bypasses the L1 cache. Mirrors getSbpIndicatorHistoryFresh()'s role in sbp.ts. */
export async function getNetLiquidReservesFresh(): Promise<SbpIndicatorResult> {
  try {
    const { history, sourceStatus } = await fetchHistoryThroughCache(true);
    return { kpi: buildKpi(history, sourceStatus), trend: buildTrend(history), meta: buildMeta(history, sourceStatus) };
  } catch {
    return fallbackNetLiquidReserves;
  }
}

export interface FxReservesWeeklySnapshot {
  netSbpB: number;
  netBanksB: number;
  totalLiquidB: number;
  observationDate: string;
  sourceStatus: SourceStatus;
}

/**
 * The Foreign Reserves detail page's three secondary stats — Commercial
 * Bank Reserves and Total Liquid Reserves, computed from Forex_Arch's OWN
 * Total column rather than summed from a separately-fetched, different-
 * frequency EasyData series, so the figure is single-source and
 * single-frequency (never a weekly SBP number added to a monthly bank
 * number). Shares the same cached history fetch as getNetLiquidReserves()
 * — no extra network cost for the detail page's richer view.
 */
export async function getFxReservesWeeklySnapshot(): Promise<FxReservesWeeklySnapshot> {
  try {
    const { history, sourceStatus } = await fetchHistoryThroughCache();
    const latest = history[history.length - 1];
    return {
      netSbpB: latest.netSbpReservesM / 1000,
      netBanksB: latest.netBankReservesM / 1000,
      totalLiquidB: latest.totalLiquidReservesM / 1000,
      observationDate: latest.weekEndingDate,
      sourceStatus,
    };
  } catch {
    const fb = fallbackNetLiquidReserves;
    return {
      netSbpB: Number(fb.kpi.value),
      netBanksB: 0,
      totalLiquidB: Number(fb.kpi.value),
      observationDate: fb.meta.observationDate,
      sourceStatus: "fallback",
    };
  }
}
