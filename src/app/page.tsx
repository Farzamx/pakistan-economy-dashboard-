import DashboardSection from "@/components/DashboardSection";
import DataSourcesModal from "@/components/DataSourcesModal";
import FloatingAssistant from "@/components/assistant/FloatingAssistant";
import type { DashboardSnapshot } from "@/lib/assistantContext";
import HealthScoreCard from "@/components/HealthScoreCard";
import Hero from "@/components/Hero";
import InfoTooltip from "@/components/InfoTooltip";
import KpiGrid from "@/components/KpiGrid";
import MarketTicker, { type TickerItem } from "@/components/MarketTicker";
import NewsIntelligenceSection from "@/components/NewsIntelligenceSection";
import ProvincialQuickAccess from "@/components/ProvincialQuickAccess";
import PopularInsights from "@/components/PopularInsights";
import HideableSection from "@/components/preferences/HideableSection";
import PinnedIndicatorsRow from "@/components/preferences/PinnedIndicatorsRow";
import RiskIntelligenceSection from "@/components/RiskIntelligenceSection";
import Sidebar from "@/components/Sidebar";
import HashScrollRestore from "@/components/HashScrollRestore";
import ViewportFadeIn from "@/components/ViewportFadeIn";
import TrendLineChart from "@/components/charts/TrendLineChart";
import { sectionData } from "@/data/sectionData";
import { getFreshnessStatus } from "@/lib/dataFreshness";
import { getDataQuality } from "@/lib/dataQuality";
import { getMostRecentEvent, valueMatchesEventOutcome } from "@/lib/economicCalendar/economicCalendarData";
import { getAllScheduledEvents, getHistoricalEvents, toEconomicEvent } from "@/lib/economicCalendar/economicEventsRepo";
import type { AiEconomicAnalysis } from "@/lib/data/aiEconomicAnalysis";
import type { AiRiskIntelligence } from "@/lib/data/aiRiskIntelligence";
import { getLatestWeeklyIntelligenceSnapshot } from "@/lib/data/weeklyIntelligence";
import { getAllSbpIndicators } from "@/lib/data/sbp";
import { getGdpKpi } from "@/lib/data/worldBank";
import { getQuarterlyGdpKpi } from "@/lib/data/quarterlyGdp";
import {
  getBrentKpi,
  getFedFundsKpi,
  getNaturalGasKpi,
  getUs10yKpi,
  getWtiKpi,
} from "@/lib/data/fred";
import { getFxRates } from "@/lib/data/fxRates";
import { getTaggedNews, NEWS_DISPLAY_LIMIT } from "@/lib/data/intelligence";
import { getDxyKpi, getGoldKpi, getSilverKpi } from "@/lib/data/metals";
import { getNews } from "@/lib/data/news";
import { getPakEtfKpi } from "@/lib/data/yfinance";
import { getSpiHistory } from "@/lib/data/spi";
import {
  computeDataConfidence,
  type IndicatorStatus,
  type RiskModelResult,
} from "@/lib/riskModels";
import { getHealthStatus, healthLabelToRiskLevel, type HealthModelResult } from "@/lib/economicHealth";
import type { Kpi } from "@/data/kpiData";

function makeTickerItem(
  kpi: Kpi,
  label: string,
  unit: string,
  termKey: string,
): TickerItem {
  const m = kpi.change.match(/^([+-]?\d+\.?\d*)/);
  const changeDisplay = m
    ? parseFloat(m[1]) >= 0
      ? `+${m[1]}`
      : m[1]
    : null;
  const quality = getDataQuality({
    sourceStatus: kpi.sourceStatus ?? "live",
    latestDate: kpi.latestDate,
    frequency: kpi.frequency,
    marketType: kpi.marketType,
    expectedReleaseDate: kpi.expectedReleaseDate,
    releaseAlreadyReflected: kpi.releaseAlreadyReflected,
    snapshotDate: kpi.snapshotDate,
  }).state;
  return { label, value: kpi.value, unit, changeDisplay, trend: kpi.trend, termKey, quality };
}

/** "17 Jun · 18:00 PKT" — used for the Weekly Intelligence Engine's "computed"/"next update" framing. */
function formatPktDate(d: Date): string {
  const opts: Intl.DateTimeFormatOptions = { timeZone: "Asia/Karachi", hour12: false };
  const day = d.toLocaleString("en-GB", { ...opts, day: "numeric" });
  const month = d.toLocaleString("en-GB", { ...opts, month: "short" });
  const time = d.toLocaleString("en-GB", { ...opts, hour: "2-digit", minute: "2-digit" });
  return `${day} ${month} · ${time} PKT`;
}

function getSection(id: string) {
  const section = sectionData.find((item) => item.id === id);
  if (!section) {
    throw new Error(`Missing section data for "${id}"`);
  }
  return section;
}

export default async function Home() {
  const [gdpKpi, sbp, goldKpi, silverKpi, brentKpi, wtiKpi, naturalGasKpi, dxyKpi, us10yKpi, fedFundsKpi, newsItems, fxRates, pakEtfKpi, quarterlyGdp, spi, scheduledCalendarEvents, historicalCalendarEvents] =
    await Promise.all([
      getGdpKpi(),
      getAllSbpIndicators(),
      getGoldKpi(),
      getSilverKpi(),
      getBrentKpi(),
      getWtiKpi(),
      getNaturalGasKpi(),
      getDxyKpi(),
      getUs10yKpi(),
      getFedFundsKpi(),
      getNews(),
      getFxRates(),
      getPakEtfKpi(),
      getQuarterlyGdpKpi(),
      getSpiHistory(),
      getAllScheduledEvents(),
      getHistoricalEvents(),
    ]);

  // Weekly SPI has no static fallback (see spi.ts) — the card simply
  // doesn't render if the live fetch/parse fails, same as the PAK ETF card.
  //
  // The KPI shows the YoY inflation RATE (%) as its primary value, not the
  // raw index level — consistent with every other inflation card on this
  // dashboard (CPI, core inflation) showing a % figure as the headline
  // number. The raw index still exists (spi.ts, the /spi-index-pakistan
  // page) for users who specifically want the index level.
  const spiPoints = spi?.points ?? [];
  const spiLatest = spiPoints[spiPoints.length - 1] ?? null;
  const spiPrevious = spiPoints[spiPoints.length - 2] ?? null;
  const spiYoyPpChange = spiLatest && spiPrevious ? spiLatest.yoyPct - spiPrevious.yoyPct : null;
  const spiKpi: Kpi | null = spiLatest
    ? {
        title: "Weekly Inflation (SPI)",
        value: spiLatest.yoyPct.toFixed(2),
        unit: "%",
        change:
          spiYoyPpChange !== null
            ? `${spiYoyPpChange >= 0 ? "+" : ""}${spiYoyPpChange.toFixed(2)} pp vs last week`
            : "YoY change",
        trend: (spiYoyPpChange ?? spiLatest.yoyPct) >= 0 ? "up" : "down",
        glow: "purple",
        source: "PBS",
        seriesId: "SPI Combined, YoY Inflation",
        latestDate: spiLatest.date,
        frequency: "Weekly",
      }
    : null;

  const SPI_MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const spiYoyTrend = spiPoints.map((p) => {
    const [, month, day] = p.date.split("-");
    return { month: `${Number(day)} ${SPI_MONTH_NAMES[Number(month) - 1]}`, value: p.yoyPct };
  });

  // ── Data Confidence ───────────────────────────────────────────────────────
  // Returns days since an observation date string ("YYYY-MM-DD" or "YYYY").
  function daysSince(dateStr: string): number {
    const d = dateStr.length === 4 ? new Date(`${dateStr}-07-01`) : new Date(dateStr);
    return (Date.now() - d.getTime()) / 86_400_000;
  }
  function isFallback(meta: { source: string }): boolean {
    return meta.source.includes("fallback");
  }
  function isStale(meta: { observationDate: string; frequency: string }, isFb: boolean): boolean {
    if (isFb) return false; // already counted as fallback
    const days = daysSince(meta.observationDate);
    if (meta.frequency === "Annual") return days > 730;
    if (meta.frequency === "As-Needed") return days > 45;
    return days > 50; // Monthly / Weekly
  }

  const pktTimestamp = (() => {
    const d = new Date();
    const opts: Intl.DateTimeFormatOptions = { timeZone: "Asia/Karachi", hour12: false };
    const day = d.toLocaleString("en-GB", { ...opts, day: "numeric" });
    const month = d.toLocaleString("en-GB", { ...opts, month: "short" });
    const year = d.toLocaleString("en-GB", { ...opts, year: "numeric" });
    const time = d.toLocaleString("en-GB", { ...opts, hour: "2-digit", minute: "2-digit" });
    return `${day} ${month} ${year} · ${time} PKT`;
  })();

  // Recession model — 11 raw data inputs (quarterly GDP added)
  const recessionIndicators: IndicatorStatus[] = [
    { label: "GDP Growth (Annual)",   isFallback: false,                             isStale: daysSince(gdpKpi.latestDate ?? "2024") > 730 },
    { label: "GDP Growth (Quarterly)",isFallback: quarterlyGdp.isFallback,           isStale: !quarterlyGdp.isFallback && daysSince(quarterlyGdp.kpi.latestDate ?? "2026-03-31") > 130 },
    { label: "CPI Inflation",     isFallback: isFallback(sbp.cpiInflation.meta),  isStale: isStale(sbp.cpiInflation.meta,  isFallback(sbp.cpiInflation.meta))  },
    { label: "Policy Rate",       isFallback: isFallback(sbp.policyRate.meta),    isStale: isStale(sbp.policyRate.meta,    isFallback(sbp.policyRate.meta))    },
    { label: "SBP Reserves",      isFallback: isFallback(sbp.foreignReserves.meta), isStale: isStale(sbp.foreignReserves.meta, isFallback(sbp.foreignReserves.meta)) },
    { label: "Bank Reserves",     isFallback: isFallback(sbp.netBankReserves.meta), isStale: isStale(sbp.netBankReserves.meta, isFallback(sbp.netBankReserves.meta)) },
    { label: "Monthly Imports",   isFallback: isFallback(sbp.imports.meta),       isStale: isStale(sbp.imports.meta,       isFallback(sbp.imports.meta))       },
    { label: "Current Account",   isFallback: isFallback(sbp.currentAccount.meta),isStale: isStale(sbp.currentAccount.meta,isFallback(sbp.currentAccount.meta)) },
    { label: "USD/PKR Rate",      isFallback: isFallback(sbp.usdPkr.meta),        isStale: isStale(sbp.usdPkr.meta,        isFallback(sbp.usdPkr.meta))        },
    { label: "LSM Output",        isFallback: isFallback(sbp.lsm.meta),                    isStale: isStale(sbp.lsm.meta,                    isFallback(sbp.lsm.meta))                    },
    { label: "Private Credit",    isFallback: isFallback(sbp.privateCreditGrowth.meta),    isStale: isStale(sbp.privateCreditGrowth.meta,    isFallback(sbp.privateCreditGrowth.meta))    },
  ];

  // Default model — 7 raw data inputs
  const defaultIndicators: IndicatorStatus[] = [
    { label: "SBP Reserves",      isFallback: isFallback(sbp.foreignReserves.meta), isStale: isStale(sbp.foreignReserves.meta, isFallback(sbp.foreignReserves.meta)) },
    { label: "Bank Reserves",     isFallback: isFallback(sbp.netBankReserves.meta), isStale: isStale(sbp.netBankReserves.meta, isFallback(sbp.netBankReserves.meta)) },
    { label: "Monthly Imports",   isFallback: isFallback(sbp.imports.meta),       isStale: isStale(sbp.imports.meta,       isFallback(sbp.imports.meta))       },
    { label: "Fiscal Balance",    isFallback: isFallback(sbp.fiscalBalance.meta), isStale: isStale(sbp.fiscalBalance.meta, isFallback(sbp.fiscalBalance.meta)) },
    { label: "Current Account",   isFallback: isFallback(sbp.currentAccount.meta),isStale: isStale(sbp.currentAccount.meta,isFallback(sbp.currentAccount.meta)) },
    { label: "USD/PKR Rate",      isFallback: isFallback(sbp.usdPkr.meta),        isStale: isStale(sbp.usdPkr.meta,        isFallback(sbp.usdPkr.meta))        },
    { label: "Policy Rate",       isFallback: isFallback(sbp.policyRate.meta),    isStale: isStale(sbp.policyRate.meta,    isFallback(sbp.policyRate.meta))    },
  ];

  const recessionConfidence = computeDataConfidence(recessionIndicators, pktTimestamp);
  const defaultConfidence   = computeDataConfidence(defaultIndicators,   pktTimestamp);
  // ─────────────────────────────────────────────────────────────────────────

  const tickerItems: TickerItem[] = [
    makeTickerItem(fxRates.usdPkr,         "USD/PKR",   "",    "USD / PKR"),
    // KSE-100 itself requires a commercial PSX data license (see
    // yfinance.ts) — pakEtfKpi (Global X MSCI Pakistan ETF) is the same
    // real, free proxy already used elsewhere on this dashboard for
    // Pakistani-equity exposure, labeled honestly rather than as "KSE100".
    makeTickerItem(pakEtfKpi,              "KSE-100 Proxy", "", "Pakistan ETF (NYSE: PAK)"),
    makeTickerItem(fxRates.eurPkr,         "EUR/PKR",   "",    "EUR / PKR"),
    makeTickerItem(fxRates.gbpPkr,         "GBP/PKR",   "",    "GBP / PKR"),
    makeTickerItem(fxRates.sarPkr,         "SAR/PKR",   "",    "SAR / PKR"),
    makeTickerItem(goldKpi,                "Gold",      "",    "Gold"),
    makeTickerItem(silverKpi,              "Silver",    "",    "Silver"),
    makeTickerItem(wtiKpi,                 "WTI",       "",    "WTI Crude"),
    makeTickerItem(brentKpi,               "Brent",     "",    "Brent Crude"),
    makeTickerItem(naturalGasKpi,          "Nat Gas",   "",    "Natural Gas"),
    makeTickerItem(dxyKpi,                 "DXY",       "",    "US Dollar Index"),
    makeTickerItem(us10yKpi,               "US 10Y",    "%",   "US 10Y Treasury"),
    makeTickerItem(fedFundsKpi,            "Fed Funds", "%",   "Fed Funds Rate"),
    makeTickerItem(sbp.foreignReserves.kpi,"Reserves",  "B",   "Foreign Reserves"),
    makeTickerItem(sbp.policyRate.kpi,     "SBP Rate",  "%",   "Policy Rate"),
  ];

  // ── Layer 1: Risk Engine — 6h cache ──────────────────────────────────────
  // Cache key is time-bucketed (changes every 6h) so the result is stable
  // for the full window regardless of small indicator fluctuations.
  // This decouples cache lifetime from prompt content and prevents the
  // "new body → cache miss → OpenRouter call" problem that made the 1h
  // next.revalidate setting ineffective.
  //
  // Weekly Intelligence Engine (Production Audit Part 2): Health Score and
  // Recession/Default no longer compute on page load or on a 6h AI cache —
  // they read the latest snapshot a Monday cron
  // (/api/cron/weekly-intelligence) already computed and stored. See
  // weeklyIntelligenceCompute.ts for where calculateEconomicHealth/
  // calculateRecessionRisk/calculateDefaultRisk + AI narration now run.
  // `weeklySnapshot` is null only before the very first cron run.
  const weeklySnapshot = await getLatestWeeklyIntelligenceSnapshot();

  const health: HealthModelResult | null = weeklySnapshot
    ? (() => {
        const factors = weeklySnapshot.health.factors;
        const sorted = [...factors].sort((a, b) => b.score - a.score);
        return {
          score: weeklySnapshot.health.score,
          status: getHealthStatus(weeklySnapshot.health.score),
          factors,
          topStrengthFactors: sorted.slice(0, 3),
          topWeaknessFactors: sorted.slice(-3).reverse(),
        };
      })()
    : null;
  const recessionResult: RiskModelResult | null = weeklySnapshot
    ? {
        probability: weeklySnapshot.recession.probability,
        modelScore: weeklySnapshot.recession.modelScore,
        riskCategory: weeklySnapshot.recession.category,
        topRiskFactors: weeklySnapshot.recession.factors.topRiskFactors,
        topCushionFactors: weeklySnapshot.recession.factors.topCushionFactors,
      }
    : null;
  const defaultResult: RiskModelResult | null = weeklySnapshot
    ? {
        probability: weeklySnapshot.default.probability,
        modelScore: weeklySnapshot.default.modelScore,
        riskCategory: weeklySnapshot.default.category,
        topRiskFactors: weeklySnapshot.default.factors.topRiskFactors,
        topCushionFactors: weeklySnapshot.default.factors.topCushionFactors,
      }
    : null;
  const aiAnalysis: AiEconomicAnalysis | null = weeklySnapshot
    ? {
        sentiment: weeklySnapshot.ai.sentiment,
        summary: weeklySnapshot.ai.summary,
        topDrivers: weeklySnapshot.ai.topDrivers,
        modelUsed: weeklySnapshot.ai.modelUsed,
        modelDisplayName: weeklySnapshot.ai.modelDisplayName,
      }
    : null;
  const aiRisk: AiRiskIntelligence | null = weeklySnapshot
    ? {
        recession: weeklySnapshot.ai.recessionExplanation,
        default: weeklySnapshot.ai.defaultExplanation,
        modelUsed: weeklySnapshot.ai.modelUsed,
        modelDisplayName: weeklySnapshot.ai.modelDisplayName,
      }
    : null;

  // "Computed"/"next update" framing replaces the old 6h AI-cache-window
  // copy — this is now a weekly cadence, not a rolling cache.
  const intelligenceComputedAt = weeklySnapshot ? formatPktDate(new Date(weeklySnapshot.computedAt)) : null;
  const intelligenceNextUpdateAt = weeklySnapshot
    ? formatPktDate(new Date(new Date(weeklySnapshot.computedAt).getTime() + 7 * 24 * 60 * 60 * 1000))
    : null;

  // ── Layer 2: News Intelligence — tiered cache (news.ts: 10-25 min by
  // source; AI tagging via getTaggedNews: 30 min) — see news.ts/
  // intelligence.ts for the full breakdown from the News & Intelligence audit.
  const newsSourceCount = new Set(newsItems.map((n) => n.source)).size;
  const taggedNewsResult = await getTaggedNews(newsItems);

  // ── Dashboard Snapshot for Floating AI Assistant ─────────────────────────
  const dashboardSnapshot: DashboardSnapshot = {
    economicHealthScore: health?.score ?? 0,
    sentiment: aiAnalysis?.sentiment ?? "Neutral",
    riskLevel: health ? healthLabelToRiskLevel(health.status.label) : "Moderate",
    summary: aiAnalysis?.summary ?? "Weekly intelligence snapshot not yet available.",
    topDrivers: aiAnalysis?.topDrivers ?? [],
    recessionProbability: recessionResult?.probability ?? 0,
    recessionCategory: recessionResult?.riskCategory ?? "Elevated",
    recessionModelScore: recessionResult?.modelScore ?? 0,
    defaultProbability: defaultResult?.probability ?? 0,
    defaultCategory: defaultResult?.riskCategory ?? "Elevated",
    defaultModelScore: defaultResult?.modelScore ?? 0,
    gdpGrowth: `${gdpKpi.value}${gdpKpi.unit} (${gdpKpi.change})`,
    quarterlyGdpGrowth: `${quarterlyGdp.kpi.value}${quarterlyGdp.kpi.unit} YoY (${quarterlyGdp.kpi.change}), as of ${quarterlyGdp.kpi.latestDate}`,
    cpiInflation: `${sbp.cpiInflation.kpi.value}${sbp.cpiInflation.kpi.unit} (${sbp.cpiInflation.kpi.change})`,
    policyRate: `${sbp.policyRate.kpi.value}${sbp.policyRate.kpi.unit} (${sbp.policyRate.kpi.change})`,
    foreignReserves: `$${sbp.foreignReserves.kpi.value}B (${sbp.foreignReserves.kpi.change})`,
    usdPkr: `${sbp.usdPkr.kpi.value} PKR (${sbp.usdPkr.kpi.change})`,
    tradeBalance: `${sbp.tradeBalance.kpi.value}${sbp.tradeBalance.kpi.unit} (${sbp.tradeBalance.kpi.change})`,
    currentAccount: `${sbp.currentAccount.kpi.value}${sbp.currentAccount.kpi.unit} (${sbp.currentAccount.kpi.change})`,
    remittances: `$${sbp.remittances.kpi.value}B (${sbp.remittances.kpi.change})`,
    exports: `$${sbp.exports.kpi.value}B (${sbp.exports.kpi.change})`,
    imports: `$${sbp.imports.kpi.value}B (${sbp.imports.kpi.change})`,
    fiscalBalance: `${sbp.fiscalBalance.kpi.value}${sbp.fiscalBalance.kpi.unit} (${sbp.fiscalBalance.kpi.change})`,
    lsm: `${sbp.lsm.kpi.value}${sbp.lsm.kpi.unit} (${sbp.lsm.kpi.change})`,
    privateCreditGrowth: `${sbp.privateCreditGrowth.kpi.value}${sbp.privateCreditGrowth.kpi.unit} (${sbp.privateCreditGrowth.kpi.change})`,
    brentOil: `$${brentKpi.value}/bbl (${brentKpi.change})`,
    gold: `$${goldKpi.value}/oz (${goldKpi.change})`,
    dxy: `${dxyKpi.value} (${dxyKpi.change})`,
    us10y: `${us10yKpi.value}% (${us10yKpi.change})`,
    fedFunds: `${fedFundsKpi.value}% (${fedFundsKpi.change})`,
    recentHeadlines: newsItems.slice(0, 5).map((n) => n.title),
    asOf: new Date().toISOString().split("T")[0],
  };
  // ─────────────────────────────────────────────────────────────────────────

  // Economic-Calendar-aware freshness — every indicator below tracks the
  // exact same release as a recurring Economic Calendar series, so the
  // calendar's known due dates let dataFreshness.ts flag a real delay
  // sooner than each indicator's generic per-frequency threshold would,
  // without misreading a not-yet-due release as late. Originally applied
  // only to Policy Rate/T-Bill 3M/PIB; Production Audit Part 4/Part 2
  // (data lineage) traced the SPI staleness incident to exactly this gap
  // for every *other* eligible indicator, and confirmed the calendar's
  // actual_value for FX Reserves/Current Account/Trade Balance/Remittances/
  // CPI/Core/LSM is synced from this exact same SBP EasyData call
  // (syncFromSbpEasyData.ts's SYNC_TARGETS) — not a different vintage as an
  // earlier version of this comment assumed — so cross-referencing them is
  // safe, not riskier than not doing so.
  //
  // releaseAlreadyReflected matters most for Policy Rate (a "hold" produces
  // no new SBP EasyData observation at all, so an old latestDate isn't
  // actually wrong), but is applied uniformly since it's a no-op safety
  // check for series that don't have a "hold" concept.
  //
  // Treasury Bill Auction title-prefix bug fix: the Rolling Calendar
  // refactor split T-Bill into 3M/6M/12M series, all auctioned on the same
  // date under titles "Treasury Bill Auction (3M)"/"(6M)"/"(12M)" — the
  // generic "Treasury Bill Auction" prefix used to match all three
  // indiscriminately, risking pairing the wrong tenor's actual value
  // against sbp.tbillYield3m specifically. Now matches "(3M)" exactly.
  const todayForCalendar = new Date();
  const allCalendarEvents = [...scheduledCalendarEvents, ...historicalCalendarEvents].map(toEconomicEvent);
  const policyRateEvent = getMostRecentEvent(allCalendarEvents, "SBP Monetary Policy Committee Meeting", todayForCalendar);
  const tbillEvent = getMostRecentEvent(allCalendarEvents, "Treasury Bill Auction (3M)", todayForCalendar);
  const pibEvent = getMostRecentEvent(allCalendarEvents, "PIB Auction", todayForCalendar);
  const cpiEvent = getMostRecentEvent(allCalendarEvents, "CPI Inflation Release", todayForCalendar);
  const coreInflationEvent = getMostRecentEvent(allCalendarEvents, "Core Inflation Release", todayForCalendar);
  const fxReservesEvent = getMostRecentEvent(allCalendarEvents, "SBP Foreign Exchange Reserves", todayForCalendar);
  const currentAccountEvent = getMostRecentEvent(allCalendarEvents, "Current Account Balance", todayForCalendar);
  const tradeBalanceEvent = getMostRecentEvent(allCalendarEvents, "Trade Balance", todayForCalendar);
  const remittancesEvent = getMostRecentEvent(allCalendarEvents, "Worker Remittances", todayForCalendar);
  const lsmEvent = getMostRecentEvent(allCalendarEvents, "Large Scale Manufacturing", todayForCalendar);
  const spiEvent = getMostRecentEvent(allCalendarEvents, "SPI Weekly Inflation Release", todayForCalendar);

  function withCalendarFreshness(kpi: Kpi, event: typeof policyRateEvent) {
    if (!event) return kpi;
    return {
      ...kpi,
      expectedReleaseDate: event.date,
      releaseAlreadyReflected: valueMatchesEventOutcome(kpi.value, event.actual),
    };
  }

  // SPI's weekly % takes USD/PKR's old headline slot — USD/PKR is still
  // fully visible (Live FX section, market ticker), while SPI's faster,
  // weekly-updating inflation read is more strategically useful as one of
  // the 6 top-line figures. If the live SPI fetch fails, headlineKpis
  // simply has 5 cards that render (3-col grid) rather than a gap.
  // Sparklines reuse each card's own already-fetched trend series (last 12
  // points) — never a separate fetch or fabricated data. gdpKpi (annual,
  // World Bank) has no trend array in scope here, so it simply renders
  // without one rather than inventing a shape.
  const headlineKpis = [
    gdpKpi,
    { ...quarterlyGdp.kpi, sparkline: quarterlyGdp.trend.slice(-12).map((p) => p.value) },
    withCalendarFreshness({ ...sbp.cpiInflation.kpi, sparkline: sbp.cpiInflation.trend.slice(-12).map((p) => p.value) }, cpiEvent),
    withCalendarFreshness({ ...sbp.foreignReserves.kpi, sparkline: sbp.foreignReserves.trend.slice(-12).map((p) => p.value) }, fxReservesEvent),
    withCalendarFreshness({ ...sbp.remittances.kpi, sparkline: sbp.remittances.trend.slice(-12).map((p) => p.value) }, remittancesEvent),
    ...(spiKpi ? [withCalendarFreshness(spiKpi, spiEvent)] : []),
  ];

  const secondaryKpis = [
    withCalendarFreshness(sbp.policyRate.kpi, policyRateEvent),
    withCalendarFreshness(sbp.coreInflation.kpi, coreInflationEvent),
    sbp.wpiInflation.kpi,
    sbp.usdPkr.kpi,
    withCalendarFreshness(sbp.tbillYield3m.kpi, tbillEvent),
    withCalendarFreshness(sbp.pibYield3y.kpi, pibEvent),
    withCalendarFreshness(sbp.currentAccount.kpi, currentAccountEvent),
    withCalendarFreshness(sbp.tradeBalance.kpi, tradeBalanceEvent),
    sbp.moneySupplyM2.kpi,
  ];

  const globalMarketsKpis = [
    goldKpi,
    silverKpi,
    brentKpi,
    wtiKpi,
    naturalGasKpi,
    dxyKpi,
    us10yKpi,
    fedFundsKpi,
  ];

  // fxRates.usdPkr is a live intraday spot quote with no history of its own
  // in scope — sbp.usdPkr.trend (the same underlying pair, SBP's monthly-
  // average series already fetched above for the 24-month chart) is real
  // data for the same metric, just reused rather than re-fetched.
  const liveFxKpis = [
    { ...fxRates.usdPkr, sparkline: sbp.usdPkr.trend.slice(-12).map((p) => p.value) },
    fxRates.eurPkr,
    fxRates.gbpPkr,
    fxRates.sarPkr,
  ];

  const realEconomyKpis = [
    sbp.exports.kpi,
    sbp.imports.kpi,
    sbp.fdiInflows.kpi,
    sbp.reer.kpi,
    withCalendarFreshness(sbp.lsm.kpi, lsmEvent),
    sbp.privateCreditGrowth.kpi,
    sbp.fiscalBalance.kpi,
  ];

  // Build-time data freshness audit — printed to server/build console
  console.log("\n=== Global Markets & Live FX Freshness Audit ===");
  console.log("Indicator            | Source          | latestDate   | status");
  console.log("---------------------|-----------------|--------------|--------");
  for (const kpi of [...globalMarketsKpis, ...liveFxKpis]) {
    const status = getFreshnessStatus(kpi.latestDate, kpi.frequency, { marketType: kpi.marketType, expectedReleaseDate: kpi.expectedReleaseDate, releaseAlreadyReflected: kpi.releaseAlreadyReflected });
    const indicator = kpi.title.padEnd(20);
    const src = (kpi.source ?? "—").padEnd(15);
    const date = (kpi.latestDate ?? "—").padEnd(12);
    console.log(`${indicator} | ${src} | ${date} | ${status}`);
  }
  console.log("======================================\n");

  // All Kpi objects — passed to DataSourcesModal for the audit table
  const allKpis = [
    ...headlineKpis,
    ...secondaryKpis,
    ...globalMarketsKpis,
    pakEtfKpi,
    ...liveFxKpis,
    ...realEconomyKpis,
    sbp.netBankReserves.kpi,
  ];

  // Market Status pass — the page's own render time, in Pakistan Standard
  // Time (the dashboard's primary audience), not a client-side clock that
  // would drift from when this data was actually fetched.
  const marketStatusUpdatedAt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Karachi",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());

  return (
    <div className="flex min-h-screen w-full">
      <HashScrollRestore />
      <Sidebar />
      <main id="overview" className="flex-1 scroll-mt-8 px-6 py-8 sm:px-10 lg:px-16">
        <Hero rightSlot={<DataSourcesModal kpis={allKpis} />} />

        <ProvincialQuickAccess />

        <PopularInsights />

        <PinnedIndicatorsRow />

        <p className="mt-6 text-xs text-white/35 light:text-slate-400" suppressHydrationWarning>
          <span className="font-medium text-white/50 light:text-slate-600">Market Status</span> &middot; Updated {marketStatusUpdatedAt} PKT
        </p>
        <MarketTicker items={tickerItems} />

        <KpiGrid items={headlineKpis} cols={3} />

        {health && aiAnalysis && recessionResult && defaultResult && aiRisk && intelligenceComputedAt && intelligenceNextUpdateAt ? (
          <>
            <HealthScoreCard health={health} ai={aiAnalysis} />

            <HideableSection id="risk-intelligence">
              <RiskIntelligenceSection
                recession={recessionResult}
                defaultRisk={defaultResult}
                ai={aiRisk}
                recessionConfidence={recessionConfidence}
                defaultConfidence={defaultConfidence}
                computedAt={intelligenceComputedAt}
                nextUpdateAt={intelligenceNextUpdateAt}
              />
            </HideableSection>
          </>
        ) : (
          <div className="glass-card mt-8 p-6 text-center sm:p-8">
            <p className="text-sm text-white/50 light:text-slate-500">
              Weekly intelligence snapshot not yet available. The Economic Health Score and Risk Intelligence update every Monday — check back after the next scheduled run.
            </p>
          </div>
        )}

        <HideableSection id="gdp">
        <DashboardSection {...getSection("gdp")}>
          <div className="mt-6 rounded-xl border border-white/5 light:border-slate-200 bg-white/[0.02] light:bg-white p-4">
            <div className="mb-2 flex items-center gap-1.5">
              <p className="text-xs font-medium text-white/40 light:text-slate-500">
                Quarterly GDP Growth &mdash; Real GVA
                <span className="text-white/25 light:text-slate-400"> &middot; SBP EasyData, quarterly</span>
              </p>
              <InfoTooltip termKey="Quarterly GDP Growth (YoY)" size="xs" />
            </div>
            <TrendLineChart
              data={quarterlyGdp.trend}
              color="#38bdf8"
              unit="%"
              gradientId="quarterlyGdpGradient"
              xAxisInterval={3}
            />
          </div>
        </DashboardSection>
        </HideableSection>

        <HideableSection id="inflation">
        <DashboardSection {...getSection("inflation")}>
          <div className="mt-6 rounded-xl border border-white/5 light:border-slate-200 bg-white/[0.02] light:bg-white p-4">
            <p className="mb-2 text-xs font-medium text-white/40 light:text-slate-500">
              24-Month Trend <span className="text-white/25 light:text-slate-400">· SBP EasyData, monthly</span>
            </p>
            <TrendLineChart
              data={sbp.cpiInflation.trend}
              color="#a855f7"
              unit="%"
              gradientId="cpiInflationGradient"
            />
          </div>

          {spiYoyTrend.length > 0 && (
            <div className="mt-6 rounded-xl border border-white/5 light:border-slate-200 bg-white/[0.02] light:bg-white p-4">
              <div className="mb-2 flex items-center gap-1.5">
                <p className="text-xs font-medium text-white/40 light:text-slate-500">
                  Weekly Inflation (SPI) — YoY %
                  <span className="text-white/25 light:text-slate-400"> &middot; Pakistan Bureau of Statistics, weekly</span>
                </p>
                <InfoTooltip termKey="Weekly Inflation (SPI)" size="xs" />
              </div>
              <TrendLineChart
                data={spiYoyTrend}
                color="#c084fc"
                unit="%"
                gradientId="spiYoyGradient"
              />
            </div>
          )}
        </DashboardSection>
        </HideableSection>

        <HideableSection id="price-indices">
        <DashboardSection {...getSection("price-indices")}>
          <div className="mt-6 rounded-xl border border-white/5 light:border-slate-200 bg-white/[0.02] light:bg-white p-4">
            <p className="mb-2 text-xs font-medium text-white/40 light:text-slate-500">
              24-Month Trend <span className="text-white/25 light:text-slate-400">· SBP EasyData, monthly</span>
            </p>
            <TrendLineChart
              data={sbp.coreInflation.trend}
              color="#2dd4bf"
              unit="%"
              gradientId="coreInflationGradient"
            />
          </div>
        </DashboardSection>
        </HideableSection>

        <HideableSection id="monetary-policy">
        <DashboardSection {...getSection("monetary-policy")}>
          <div className="mt-6 rounded-xl border border-white/5 light:border-slate-200 bg-white/[0.02] light:bg-white p-4">
            <p className="mb-2 text-xs font-medium text-white/40 light:text-slate-500">
              Recent Trend <span className="text-white/25 light:text-slate-400">· SBP EasyData, as-needed</span>
            </p>
            <TrendLineChart
              data={sbp.policyRate.trend}
              color="#fbbf24"
              unit="%"
              gradientId="policyRateGradient"
            />
          </div>
        </DashboardSection>

        <ViewportFadeIn>
          <h2 className="mt-12 text-xl font-semibold text-white light:text-slate-900 sm:text-2xl">
            Monetary &amp; External Indicators
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-white/60 light:text-slate-500">
            Policy rate, money market yields, core and wholesale prices, and the
            external accounts that shape Pakistan&apos;s financing needs.
          </p>
        </ViewportFadeIn>
        <KpiGrid items={secondaryKpis} />
        </HideableSection>

        <HideableSection id="global-markets">
        <div id="global-markets" className="scroll-mt-8">
          <ViewportFadeIn>
            <h2 className="mt-12 text-xl font-semibold text-white light:text-slate-900 sm:text-2xl">
              Global Markets
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-white/60 light:text-slate-500">
              Precious metals, energy benchmarks, and US rates that drive
              global risk appetite and Pakistan&apos;s import bill.
            </p>
          </ViewportFadeIn>
          <KpiGrid items={globalMarketsKpis} />
        </div>
        </HideableSection>

        <HideableSection id="real-economy">
        <div id="real-economy" className="scroll-mt-8">
          <ViewportFadeIn>
            <h2 className="mt-12 text-xl font-semibold text-white light:text-slate-900 sm:text-2xl">
              Real Economy &amp; Fiscal
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-white/60 light:text-slate-500">
              Trade flows, investment, competitiveness, industrial output, credit
              expansion, and Pakistan&apos;s fiscal position.
            </p>
          </ViewportFadeIn>
          <KpiGrid items={realEconomyKpis} />
        </div>
        </HideableSection>

        <HideableSection id="reserves">
        <DashboardSection
          {...getSection("reserves")}
          stats={(() => {
            const sbpB = parseFloat(sbp.foreignReserves.kpi.value);
            const bankB = parseFloat(sbp.netBankReserves.kpi.value);
            const totalB = sbpB + bankB;
            const monthlyImportsB = parseFloat(sbp.imports.kpi.value);
            const importCoverMonths = monthlyImportsB > 0 ? totalB / monthlyImportsB : 0;
            const obsDate = sbp.foreignReserves.meta.observationDate.slice(0, 7);
            return [
              { label: "SBP Reserves", value: `$${sbpB.toFixed(1)}B` },
              { label: "Commercial Banks", value: `$${bankB.toFixed(1)}B` },
              { label: "Total Reserves", value: `$${totalB.toFixed(1)}B` },
              { label: "Import Cover", value: `${importCoverMonths.toFixed(1)} months · ${obsDate}` },
            ];
          })()}
        >
          <div className="mt-6 rounded-xl border border-white/5 light:border-slate-200 bg-white/[0.02] light:bg-white p-4">
            <p className="mb-2 text-xs font-medium text-white/40 light:text-slate-500">
              24-Month Trend <span className="text-white/25 light:text-slate-400">· SBP EasyData, monthly</span>
            </p>
            <TrendLineChart
              data={sbp.foreignReserves.trend}
              color="#38bdf8"
              unit="B"
              gradientId="reservesGradient"
            />
          </div>
        </DashboardSection>
        </HideableSection>

        <HideableSection id="live-fx">
        <div id="live-fx" className="scroll-mt-8">
          <ViewportFadeIn>
            <h2 className="mt-12 text-xl font-semibold text-white light:text-slate-900 sm:text-2xl">
              Live Exchange Rates
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-white/60 light:text-slate-500">
              Current interbank market rates for PKR cross-pairs, refreshed
              intraday from Yahoo Finance market data. Distinct from the SBP monthly-average series
              shown in the historical trend below.
            </p>
          </ViewportFadeIn>
          <KpiGrid items={liveFxKpis} />
        </div>
        </HideableSection>

        <HideableSection id="exchange-rate">
        <DashboardSection
          {...getSection("exchange-rate")}
          stats={[
            { label: "USD / PKR", value: `${sbp.usdPkr.kpi.value} PKR` },
          ]}
          statsCaption={
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/35 light:text-slate-500">
                Previous Close / Monthly Average
              </span>
              <InfoTooltip termKey="Previous Close / Monthly Average" size="xs" />
            </div>
          }
        >
          <div className="mt-6 rounded-xl border border-white/5 light:border-slate-200 bg-white/[0.02] light:bg-white p-4">
            <p className="mb-2 text-xs font-medium text-white/40 light:text-slate-500">
              24-Month Trend <span className="text-white/25 light:text-slate-400">· SBP EasyData — Monthly Average Interbank Rate</span>
            </p>
            <TrendLineChart
              data={sbp.usdPkr.trend}
              color="#f472b6"
              unit=""
              gradientId="usdPkrGradient"
            />
          </div>
        </DashboardSection>
        </HideableSection>

        <HideableSection id="remittances">
        <DashboardSection {...getSection("remittances")}>
          <div className="mt-6 rounded-xl border border-white/5 light:border-slate-200 bg-white/[0.02] light:bg-white p-4">
            <p className="mb-2 text-xs font-medium text-white/40 light:text-slate-500">
              24-Month Trend <span className="text-white/25 light:text-slate-400">· SBP EasyData, monthly</span>
            </p>
            <TrendLineChart
              data={sbp.remittances.trend}
              color="#34d399"
              unit="B"
              gradientId="remittancesGradient"
            />
          </div>
        </DashboardSection>
        </HideableSection>

        <HideableSection id="external-sector">
        <DashboardSection {...getSection("external-sector")}>
          <div className="mt-6 rounded-xl border border-white/5 light:border-slate-200 bg-white/[0.02] light:bg-white p-4">
            <p className="mb-2 text-xs font-medium text-white/40 light:text-slate-500">
              24-Month Trend <span className="text-white/25 light:text-slate-400">· SBP EasyData, monthly</span>
            </p>
            <TrendLineChart
              data={sbp.tradeBalance.trend}
              color="#fb7185"
              unit="B"
              gradientId="tradeBalanceGradient"
            />
          </div>
        </DashboardSection>
        </HideableSection>

        <HideableSection id="news-intelligence">
        <NewsIntelligenceSection
          items={taggedNewsResult.items.slice(0, NEWS_DISPLAY_LIMIT)}
          modelDisplayName={taggedNewsResult.modelDisplayName}
          newsRefreshedAt={pktTimestamp}
          sourceCount={newsSourceCount}
        />
        </HideableSection>
      </main>
      <FloatingAssistant context={dashboardSnapshot} />
    </div>
  );
}
