import DashboardSection from "@/components/DashboardSection";
import { T } from "@/components/T";
import DataSourcesModal from "@/components/DataSourcesModal";
import FloatingAssistant from "@/components/assistant/FloatingAssistant";
import type { DashboardSnapshot } from "@/lib/assistantContext";
import HealthScoreCard from "@/components/HealthScoreCard";
import Hero from "@/components/Hero";
import IntelligenceFeed, { type IntelligenceFeedItem } from "@/components/IntelligenceFeed";
import WeekCalendarPanel from "@/components/WeekCalendarPanel";
import ResearchTeaser from "@/components/ResearchTeaser";
import IndicatorTable from "@/components/IndicatorTable";
import InfoTooltip from "@/components/InfoTooltip";
import MacroSnapshot from "@/components/MacroSnapshot";
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
import { getTrendDirection } from "@/lib/trendDirection";
import { getMostRecentEvent, valueMatchesEventOutcome } from "@/lib/economicCalendar/economicCalendarData";
import { getAllScheduledEvents, getHistoricalEvents, toEconomicEvent } from "@/lib/economicCalendar/economicEventsRepo";
import type { AiEconomicAnalysis } from "@/lib/data/aiEconomicAnalysis";
import type { AiRiskIntelligence } from "@/lib/data/aiRiskIntelligence";
import { getLatestWeeklyIntelligenceSnapshot } from "@/lib/data/weeklyIntelligence";
import { getAllSbpIndicators } from "@/lib/data/sbpServer";
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
  type DataConfidence,
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
        trend: getTrendDirection(spiYoyPpChange),
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
  // Hero briefing's single "Confidence Level" tile — the worse (lower-score)
  // of the two existing confidence readings above, same worst-case-surfacing
  // convention Hero.tsx already applies to combine recession/default into one
  // "Risk Status" line. Not a new calculation, just a selection between two
  // already-computed values.
  const heroDataConfidence: DataConfidence = recessionConfidence.score <= defaultConfidence.score ? recessionConfidence : defaultConfidence;
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
    makeTickerItem(sbp.pibYield3y.kpi,     "PK Bond 3Y","%",   "3Y PIB Yield"),
    makeTickerItem(sbp.tbillYield3m.kpi,   "T-Bill 3M", "%",   "3M T-Bill Yield"),
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

  // Hero briefing's "Latest Release" tile — the single most recently
  // released event across every series, derived from the same
  // historicalCalendarEvents this page already fetches for the calendar
  // sections below (no new query).
  const recentReleasedEvents = [...historicalCalendarEvents]
    .map(toEconomicEvent)
    .filter((e) => e.status === "released")
    .sort((a, b) => b.date.localeCompare(a.date));
  const latestRelease = recentReleasedEvents[0] ?? null;

  // Hero briefing's "Upcoming Calendar" tile — getAllScheduledEvents() is
  // already sorted soonest-first, so this is a plain slice/map, no new query.
  const heroUpcomingEvents = scheduledCalendarEvents
    .slice(0, 5)
    .map((e) => ({ title: e.title, date: e.eventDate, importance: e.importance }));

  // Intelligence Feed — a "what changed" line per recent release (real
  // calendar facts) plus a few KPI trend blurbs built only from each
  // indicator's own already-computed trend/change string, never a new
  // characterization invented here.
  // "increased"/"decreased" comes from the *change* string's own sign, not
  // kpi.trend — trend means "level is positive/negative" for growth-rate
  // indicators like LSM (e.g. trend="up" while change="-5.1 pp vs last
  // month", a deceleration that's still a positive growth level). change
  // is always a delta vs. the previous period (sbp.ts's changeLabel()),
  // so its leading sign is the reliable signal for "moved up or down."
  function deltaDirection(change: string): "increased" | "decreased" {
    return change.trim().startsWith("-") ? "decreased" : "increased";
  }

  // Hero briefing's "Key Risk Signals" — same deltaDirection sign already
  // used above, just paired with a plain-language label per indicator
  // instead of the raw KPI title (a rising fiscal balance means the deficit
  // is narrowing, a rising current account means the external position is
  // improving, etc.) — no new figures, only real signs already computed.
  const heroRiskSignals: string[] = [
    { kpi: sbp.cpiInflation.kpi,   rising: "Inflation accelerating",              falling: "Inflation easing" },
    { kpi: sbp.fiscalBalance.kpi,  rising: "Fiscal deficit narrowing",            falling: "Fiscal deficit widening" },
    { kpi: sbp.currentAccount.kpi, rising: "External account improving",          falling: "External account weakening" },
    { kpi: sbp.foreignReserves.kpi,rising: "FX reserves increasing",              falling: "FX reserves declining" },
    { kpi: sbp.lsm.kpi,            rising: "Manufacturing output expanding",      falling: "Manufacturing output weakening" },
  ].map((s) => (deltaDirection(s.kpi.change) === "increased" ? s.rising : s.falling));

  // Hero briefing's "Data Status" — one representative live indicator per
  // upstream provider actually used on this page (SBP EasyData, PBS, World
  // Bank), reusing the same isFallback()/isStale() signals already computed
  // above rather than a new freshness calculation. SPI has no fallback by
  // design (see spi.ts) — a null result means the live fetch failed, not
  // that a snapshot was substituted.
  const heroDataStatus: { name: string; label: string; live: boolean }[] = [
    { name: "SBP EasyData", live: !isFallback(sbp.foreignReserves.meta), label: !isFallback(sbp.foreignReserves.meta) ? "Live" : "Fallback" },
    { name: "PBS",          live: spi !== null,                          label: spi !== null ? "Latest Release" : "Unavailable" },
    { name: "World Bank",   live: gdpKpi.sourceStatus !== "fallback",    label: gdpKpi.sourceStatus !== "fallback" ? "Verified" : "Fallback" },
  ];

  const intelligenceFeedItems: IntelligenceFeedItem[] = [
    ...recentReleasedEvents.slice(0, 5).map((e): IntelligenceFeedItem => ({
      kind: "release",
      date: e.date,
      text: e.actual ? `${e.title} released — ${e.actual}` : `${e.title} released`,
    })),
    ...[
      sbp.foreignReserves.kpi,
      sbp.tradeBalance.kpi,
      sbp.moneySupplyM2.kpi,
      sbp.lsm.kpi,
    ].map((kpi): IntelligenceFeedItem => ({
      kind: "signal",
      text: `${kpi.title} ${deltaDirection(kpi.change)} — ${kpi.change}`,
    })),
  ];
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
  //
  // SPI freshness: the homepage KPI shows YoY% but the calendar event
  // stores WoW% as actual_value, so valueMatchesEventOutcome() would always
  // return false (comparing 2.89 YoY against 0.42 WoW). Instead, compare
  // latestDate directly — if the PBS data's week-end date is >= the most
  // recent calendar event's date, the homepage is already reflecting the
  // latest release.
  const spiReleaseReflected = spiKpi && spiEvent
    ? (spiKpi.latestDate ?? "") >= spiEvent.date
    : false;

  const headlineKpis = [
    gdpKpi,
    { ...quarterlyGdp.kpi, sparkline: quarterlyGdp.trend.slice(-12).map((p) => p.value) },
    withCalendarFreshness({ ...sbp.cpiInflation.kpi, sparkline: sbp.cpiInflation.trend.slice(-12).map((p) => p.value) }, cpiEvent),
    withCalendarFreshness({ ...sbp.foreignReserves.kpi, sparkline: sbp.foreignReserves.trend.slice(-12).map((p) => p.value) }, fxReservesEvent),
    withCalendarFreshness({ ...sbp.remittances.kpi, sparkline: sbp.remittances.trend.slice(-12).map((p) => p.value) }, remittancesEvent),
    ...(spiKpi
      ? [{
          ...spiKpi,
          sparkline: spiYoyTrend.slice(-12).map((p) => p.value),
          expectedReleaseDate: spiEvent?.date,
          releaseAlreadyReflected: spiReleaseReflected,
        }]
      : []),
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

  // Tiered institutional KPI hierarchy (PEIC v3 IA restructure) — Tier 1 is
  // the same headline figures already computed above for headlineKpis
  // (reused by reference, not refetched); Tier 2 is a slimmer summary of
  // the external-sector/fiscal Kpis already fetched for the sections
  // further down the page. No new data anywhere in either tier.
  const macroTier1: Kpi[] = [
    gdpKpi,
    headlineKpis[2],
    withCalendarFreshness({ ...sbp.policyRate.kpi, sparkline: sbp.policyRate.trend.slice(-12).map((p) => p.value) }, policyRateEvent),
    headlineKpis[3],
  ];

  const macroTier2 = [
    { label: "Current Account", value: sbp.currentAccount.kpi.value, unit: sbp.currentAccount.kpi.unit, change: sbp.currentAccount.kpi.change, trend: sbp.currentAccount.kpi.trend },
    { label: "Trade Balance", value: sbp.tradeBalance.kpi.value, unit: sbp.tradeBalance.kpi.unit, change: sbp.tradeBalance.kpi.change, trend: sbp.tradeBalance.kpi.trend },
    { label: "Remittances", value: sbp.remittances.kpi.value, unit: sbp.remittances.kpi.unit, change: sbp.remittances.kpi.change, trend: sbp.remittances.kpi.trend },
    { label: "Exports", value: sbp.exports.kpi.value, unit: sbp.exports.kpi.unit, change: sbp.exports.kpi.change, trend: sbp.exports.kpi.trend },
    { label: "Imports", value: sbp.imports.kpi.value, unit: sbp.imports.kpi.unit, change: sbp.imports.kpi.change, trend: sbp.imports.kpi.trend },
    { label: "Fiscal Balance", value: sbp.fiscalBalance.kpi.value, unit: sbp.fiscalBalance.kpi.unit, change: sbp.fiscalBalance.kpi.change, trend: sbp.fiscalBalance.kpi.trend },
    { label: "Money Supply (M2)", value: sbp.moneySupplyM2.kpi.value, unit: sbp.moneySupplyM2.kpi.unit, change: sbp.moneySupplyM2.kpi.change, trend: sbp.moneySupplyM2.kpi.trend },
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


  return (
    <div className="flex min-h-screen w-full">
      <HashScrollRestore />
      <Sidebar />
      <main id="overview" className="min-w-0 flex-1 scroll-mt-[60px] sm:scroll-mt-[120px]">
        {/* Sticky market ribbon — pinned directly below TopNav (top-16) once
            TopNav is actually visible (min-[800px], matching TopNav's own
            threshold — see TopNav.tsx), otherwise flush at top-0 since
            MobileNav's hamburger button doesn't occupy a full-width header
            row the way TopNav does. Visible throughout the scroll rather
            than living inside the scrolling panel below. Same tickerItems
            used by every other surface on this page, no new fetch. */}
        <div className="sticky top-0 z-20 border-b border-[var(--border-subtle)] bg-[var(--background)]/95 backdrop-blur-xl min-[800px]:top-16">
          <MarketTicker items={tickerItems} bare />
        </div>

        <div className="px-6 py-8 sm:px-10 lg:px-16">
        {/* Research Briefing panel — one continuous institutional panel
            (hairline dividers between zones, not separate floating cards)
            matching the reference design's flow: briefing -> tiered KPI
            section -> feed+calendar -> research teaser. Everything after it
            continues the existing homepage exactly as before. */}
        <div className="glass-panel-deep overflow-hidden">
          <Hero
            rightSlot={<DataSourcesModal kpis={allKpis} />}
            health={health}
            aiAnalysis={aiAnalysis}
            recessionResult={recessionResult}
            defaultResult={defaultResult}
            aiRisk={aiRisk}
            dataConfidence={heroDataConfidence}
            riskSignals={heroRiskSignals}
            dataStatus={heroDataStatus}
            latestRelease={latestRelease ? { title: latestRelease.title, date: latestRelease.date, actual: latestRelease.actual ?? null } : null}
            upcomingEvents={heroUpcomingEvents}
            pktTimestamp={pktTimestamp}
          />

          <div id="macro-snapshot" className="section-divider scroll-mt-[60px] px-5 py-6 sm:scroll-mt-[120px] sm:px-8 sm:py-8">
            <MacroSnapshot updatedAt={pktTimestamp} tier1={macroTier1} tier2={macroTier2} />
          </div>

          <div id="intelligence-feed" className="section-divider grid scroll-mt-[60px] grid-cols-1 gap-8 px-5 py-6 sm:scroll-mt-[120px] sm:px-8 sm:py-8 lg:grid-cols-[1.4fr_1fr]">
            <IntelligenceFeed items={intelligenceFeedItems} />
            <div id="upcoming-calendar" className="scroll-mt-[60px] sm:scroll-mt-[120px]">
              <WeekCalendarPanel events={heroUpcomingEvents} />
            </div>
          </div>

          <div id="research" className="section-divider scroll-mt-[60px] px-5 py-6 sm:scroll-mt-[120px] sm:px-8 sm:py-8">
            <ResearchTeaser />
          </div>
        </div>

        <PinnedIndicatorsRow />

        {health && aiAnalysis && recessionResult && defaultResult && aiRisk && intelligenceComputedAt && intelligenceNextUpdateAt ? (
          <>
            <div id="health-score" className="scroll-mt-[60px] sm:scroll-mt-[120px]">
            <HealthScoreCard
              health={health}
              ai={aiAnalysis}
              computedAt={intelligenceComputedAt}
              nextUpdateAt={intelligenceNextUpdateAt}
            />
            </div>

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
              <T tKey="dashboard.healthScoreFallback" />
            </p>
          </div>
        )}

        <HideableSection id="gdp">
        <DashboardSection {...getSection("gdp")}>
          <div className="mt-6 glass-card-raised p-4">
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
            />
          </div>
        </DashboardSection>
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
              { label: "SBP Reserves", value: `$${sbpB.toFixed(1)}B`, kpiTitle: "Foreign Reserves" },
              { label: "Commercial Banks", value: `$${bankB.toFixed(1)}B`, kpiTitle: "Bank Reserves" },
              { label: "Total Reserves", value: `$${totalB.toFixed(1)}B` },
              { label: "Import Cover", value: `${importCoverMonths.toFixed(1)} months · ${obsDate}` }, // stat labels are translated by KpiCard via InfoTooltip termKey lookup
            ];
          })()}
        >
          <div className="mt-6 glass-card-raised p-4">
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

        {/* Live FX merged into Exchange Rate (v2.1) — these were two
            adjacent sections about the same subject (PKR exchange rates),
            split only because one was SBP's monthly average and the other
            live intraday spot quotes. One panel, two registers: the chart
            for the official monthly series, a watchlist row for the live
            spot rates, both about literally the same question. */}
        <HideableSection id="exchange-rate">
        <DashboardSection
          {...getSection("exchange-rate")}
          stats={[
            { label: "USD / PKR", value: `${sbp.usdPkr.kpi.value} PKR` },
          ]}
          statsCaption={
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/35 light:text-slate-500">
                <T tKey="dashboard.previousClose" />
              </span>
              <InfoTooltip termKey="Previous Close / Monthly Average" size="xs" />
            </div>
          }
        >
          <div className="mt-6 glass-card-raised p-4">
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
          <div id="live-fx" className="mt-4 scroll-mt-[60px] sm:scroll-mt-[120px]">
            <p className="mb-2 text-xs font-medium text-white/40 light:text-slate-500">
              <T tKey="dashboard.liveExchangeRates" /> <span className="text-white/25 light:text-slate-400">· <T tKey="dashboard.liveExchangeRatesDesc" /></span>
            </p>
            <IndicatorTable items={liveFxKpis} />
          </div>
        </DashboardSection>
        </HideableSection>

        <HideableSection id="remittances">
        <DashboardSection {...getSection("remittances")}>
          <div className="mt-6 glass-card-raised p-4">
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
        <DashboardSection
          {...getSection("external-sector")}
          stats={(() => {
            // Was static "Phase 1.5" mock data (frozen at the old monthly M2
            // series' snapshot, e.g. "Rs 44.04T") that visibly contradicted
            // the live KPI cards for these same four metrics shown earlier
            // on this same page — a Phase 19 production-audit finding.
            // Live-wired here the same way "reserves" and "exchange-rate"
            // already override their placeholder stats above.
            const formatSignedB = (value: string) => {
              const n = parseFloat(value);
              return n < 0 ? `-$${Math.abs(n).toFixed(2)}B` : `$${n.toFixed(2)}B`;
            };
            return [
              { label: "Current Account", value: formatSignedB(sbp.currentAccount.kpi.value) },
              { label: "Trade Balance (Goods)", value: formatSignedB(sbp.tradeBalance.kpi.value), kpiTitle: "Trade Balance" },
              { label: "Foreign Reserves (SBP)", value: `$${sbp.foreignReserves.kpi.value}B`, kpiTitle: "Foreign Reserves" },
              { label: "Money Supply (M2)", value: `Rs ${sbp.moneySupplyM2.kpi.value}T` },
            ];
          })()}
        >
          <div className="mt-6 glass-card-raised p-4">
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

        <HideableSection id="inflation">
        <DashboardSection {...getSection("inflation")}>
          <div className="mt-6 glass-card-raised p-4">
            <p className="mb-2 text-xs font-medium text-white/40 light:text-slate-500">
              24-Month Trend <span className="text-white/25 light:text-slate-400">· SBP EasyData, monthly</span>
            </p>
            <TrendLineChart
              data={sbp.cpiInflation.trend}
              color="#fb923c"
              unit="%"
              gradientId="cpiInflationGradient"
            />
          </div>

          {spiYoyTrend.length > 0 && (
            <div className="mt-6 glass-card-raised p-4">
              <div className="mb-2 flex items-center gap-1.5">
                <p className="text-xs font-medium text-white/40 light:text-slate-500">
                  Weekly Inflation (SPI) — YoY %
                  <span className="text-white/25 light:text-slate-400"> &middot; Pakistan Bureau of Statistics, weekly</span>
                </p>
                <InfoTooltip termKey="Weekly Inflation (SPI)" size="xs" />
              </div>
              <TrendLineChart
                data={spiYoyTrend}
                color="#fdba74"
                unit="%"
                gradientId="spiYoyGradient"
              />
            </div>
          )}
        </DashboardSection>
        </HideableSection>

        <HideableSection id="price-indices">
        <DashboardSection {...getSection("price-indices")}>
          <div className="mt-6 glass-card-raised p-4">
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
          <div className="mt-6 glass-card-raised p-4">
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
          <h2 className="text-headline mt-10 text-white light:text-slate-900">
            <T tKey="dashboard.monetaryExternal" />
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-white/60 light:text-slate-500">
            <T tKey="dashboard.monetaryExternalDesc" />
          </p>
        </ViewportFadeIn>
        <div className="mt-5">
          <IndicatorTable items={secondaryKpis} />
        </div>
        </HideableSection>

        <HideableSection id="global-markets">
        <div id="global-markets" className="scroll-mt-[60px] sm:scroll-mt-[120px]">
          <ViewportFadeIn>
            <h2 className="text-headline mt-10 text-white light:text-slate-900">
              <T tKey="dashboard.globalMarkets" />
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-white/60 light:text-slate-500">
              <T tKey="dashboard.globalMarketsDesc" />
            </p>
          </ViewportFadeIn>
          <div className="mt-5">
            <IndicatorTable items={globalMarketsKpis} />
          </div>
        </div>
        </HideableSection>

        <HideableSection id="real-economy">
        <div id="real-economy" className="scroll-mt-[60px] sm:scroll-mt-[120px]">
          <ViewportFadeIn>
            <h2 className="text-headline mt-10 text-white light:text-slate-900">
              <T tKey="dashboard.realEconomyFiscal" />
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-white/60 light:text-slate-500">
              <T tKey="dashboard.realEconomyFiscalDesc" />
            </p>
          </ViewportFadeIn>
          <div className="mt-5">
            <IndicatorTable items={realEconomyKpis} />
          </div>
        </div>
        </HideableSection>

        <HideableSection id="news-intelligence">
        <NewsIntelligenceSection
          items={taggedNewsResult.items.slice(0, NEWS_DISPLAY_LIMIT)}
          modelDisplayName={taggedNewsResult.modelDisplayName}
          newsRefreshedAt={pktTimestamp}
          sourceCount={newsSourceCount}
        />
        </HideableSection>

        <ProvincialQuickAccess />

        <PopularInsights />
        </div>
      </main>
      <FloatingAssistant context={dashboardSnapshot} />
    </div>
  );
}
