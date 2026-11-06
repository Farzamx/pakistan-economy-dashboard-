import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL, SITE_NAME } from "@/lib/seoConfig";
import DataSourcesModal from "@/components/DataSourcesModal";
import FloatingAssistant from "@/components/assistant/FloatingAssistant";
import type { DashboardSnapshot } from "@/lib/assistantContext";
import { buildMacroIntelligenceReport } from "@/lib/intelligence/macroIntelligence";
import ProvincialQuickAccess from "@/components/ProvincialQuickAccess";
import PopularInsights from "@/components/PopularInsights";
import Sidebar from "@/components/Sidebar";
import HashScrollRestore from "@/components/HashScrollRestore";
// Phase 3 homepage — presentation components over data this page already fetches.
import Section from "@/components/shell/Section";
import MarketsPanel, { type MarketRow } from "@/components/home/MarketsPanel";
import PakistanSnapshot from "@/components/home/PakistanSnapshot";
import HeadlinesList from "@/components/home/HeadlinesList";
import LatestNewsBody from "@/components/home/LatestNewsBody";
import UpcomingReleases, { type UpcomingRow } from "@/components/home/UpcomingReleases";
import MacroBrief from "@/components/home/MacroBrief";
import IndicatorsTable from "@/components/home/IndicatorsTable";
import ExploreLinks from "@/components/home/ExploreLinks";
import { buildIndicatorRows, buildSnapshotTiles, slugForKpi } from "@/components/home/buildHomeData";
import { getFreshnessStatus } from "@/lib/dataFreshness";
import { getTrendDirection } from "@/lib/trendDirection";
import { getMostRecentEvent, selectUpcomingByDate, valueMatchesEventOutcome } from "@/lib/economicCalendar/economicCalendarData";
import { getAllScheduledEvents, getHistoricalEvents, toEconomicEvent } from "@/lib/economicCalendar/economicEventsRepo";
import type { AiEconomicAnalysis } from "@/lib/data/aiEconomicAnalysis";
import { getLatestWeeklyIntelligenceSnapshot } from "@/lib/data/weeklyIntelligence";
import { getAllSbpIndicators } from "@/lib/data/sbpServer";
import { getNetLiquidReserves } from "@/lib/data/fxReserves";
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
import { getTaggedNews } from "@/lib/data/intelligence";
import { getDxyKpi, getGoldKpi, getSilverKpi } from "@/lib/data/metals";
import { getNews } from "@/lib/data/news";
import { LATEST_NEWS_MAX_AGE_HOURS, selectFreshHeadlines } from "@/lib/headlineSelection";
import { getPakEtfKpi } from "@/lib/data/yfinance";
import { getSpiHistory } from "@/lib/data/spi";
import { type RiskModelResult } from "@/lib/riskModels";
import { getHealthStatus, healthLabelToRiskLevel, type HealthModelResult } from "@/lib/economicHealth";
import type { Kpi } from "@/data/kpiData";

const OVERVIEW_URL = `${SITE_URL}/overview`;
// Was the root layout's site-wide default metadata when this page was
// served at "/" — moved here verbatim (canonical URL updated) now that the
// marketing landing page occupies "/" and this dashboard lives at
// /overview, so this route's SEO stays identical regardless of whatever
// the root layout's own defaults become for the marketing routes.
const OVERVIEW_TITLE = `${SITE_NAME} | Live Pakistan Economy Dashboard`;
const OVERVIEW_DESCRIPTION =
  "Real-time dashboard tracking Pakistan GDP, inflation, exchange rates, reserves, remittances, financial markets, monetary policy, and economic indicators in one place.";
const OVERVIEW_SOCIAL_DESCRIPTION = "Real-time dashboard tracking Pakistan's key economic indicators.";

// ISR window: DECLARED 900s, EFFECTIVE 300s (5 minutes).
//
// These two numbers differ, and the effective one is what `next build` reports
// for this route ("5m"). Next.js takes the LOWEST revalidate across the
// route-segment config and every nested fetch / unstable_cache signal in the
// render tree, so the value below is a ceiling, not an override: the bundled
// docs (caching-without-cache-components.md, "Route segment config
// revalidate") say it "does not override the revalidate value set by
// individual fetch requests" and that a lower nested value raises the route's
// refresh frequency. The signals in this route's tree, as measured by
// controlled builds in Phase E.1.1:
//
//   300s   src/lib/economicCalendar/economicEventsRepo.ts REVALIDATE_SECONDS
//          (unstable_cache; getAllScheduledEvents / getHistoricalEvents)
//          <- the lowest, so this is what sets the effective 5 minutes
//   600s   src/lib/data/news.ts REVALIDATE_BREAKING (Pakistan/IMF/Fed Google
//          News queries and PBS releases) <- would be the floor if the 300s
//          signal were lifted
//   900s   src/lib/data/fxRates.ts L2_REVALIDATE_SECONDS, and the line below
//   1500s  src/lib/data/news.ts REVALIDATE_GENERAL (broad business RSS feeds)
//
// Measured: lifting only the 300s signal to 900 makes the route 10m; lifting
// the 600s news signal as well makes it 15m. Raising the number below alone
// changes nothing while those two signals stay where they are.
//
// HISTORY, CORRECTED: an earlier version of this comment (Phase 8.13B) said
// 900 replaced the accidental 5-minute window with a deliberate 15 and
// "loosened" regeneration. It did not — the effective window was 5 minutes
// before that change and still is. The Phase 8.13A finding that the route
// takes the minimum of every cache signal was right; the conclusion drawn from
// it was not.
//
// DECISION (Phase E.1.1): keep the effective 5 minutes. The declared 900 is
// left as it is, and neither the calendar nor the breaking-news interval is
// raised. Getting a real 15 minutes would mean raising BOTH signals, which
// would also move /macro-intelligence and the /economic-calendar pages from 5m
// to 15m and make breaking headlines up to 5 minutes staler.
export const revalidate = 900;

export const metadata: Metadata = {
  title: OVERVIEW_TITLE,
  description: OVERVIEW_DESCRIPTION,
  keywords: [
    "Pakistan economy",
    "Pakistan economic dashboard",
    "Pakistan inflation",
    "Pakistan GDP",
    "Pakistan exchange rate",
    "USD PKR",
    "SBP policy rate",
    "Pakistan reserves",
    "Pakistan remittances",
    "Pakistan financial markets",
    "economic indicators Pakistan",
  ],
  alternates: { canonical: OVERVIEW_URL },
  openGraph: { title: SITE_NAME, description: OVERVIEW_SOCIAL_DESCRIPTION, url: OVERVIEW_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: SITE_NAME, description: OVERVIEW_SOCIAL_DESCRIPTION },
};

/** "17 Jun · 18:00 PKT" — used for the Weekly Intelligence Engine's "computed"/"next update" framing. */
function formatPktDate(d: Date): string {
  const opts: Intl.DateTimeFormatOptions = { timeZone: "Asia/Karachi", hour12: false };
  const day = d.toLocaleString("en-GB", { ...opts, day: "numeric" });
  const month = d.toLocaleString("en-GB", { ...opts, month: "short" });
  const time = d.toLocaleString("en-GB", { ...opts, hour: "2-digit", minute: "2-digit" });
  return `${day} ${month} · ${time} PKT`;
}

export default async function Home() {
  const [gdpKpi, sbp, netLiquidReserves, goldKpi, silverKpi, brentKpi, wtiKpi, naturalGasKpi, dxyKpi, us10yKpi, fedFundsKpi, newsItems, fxRates, pakEtfKpi, quarterlyGdp, spi, scheduledCalendarEvents, historicalCalendarEvents, macroIntelligenceReport] =
    await Promise.all([
      getGdpKpi(),
      getAllSbpIndicators(),
      getNetLiquidReserves(),
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
      // These two close a real gap found in the final density audit: the
      // "gdp" and "inflation" sections' sector/category breakdown stats
      // were still the original "Phase 1.5" mock data from sectionData.ts
      // (its own header comment says so) — never live-wired the way
      // reserves/exchange-rate/external-sector already were. Both reuse
      // existing, already-built fetchers (getGdpSectorComposition backs
      // the Comparisons feature; getLatestCpiCategoryBreakdown backs the
      // Personal Inflation Calculator) rather than adding a new pipeline.
      // Phase 9.1 Macro Intelligence Engine (Phase 9.5 production
      // integration) — runs concurrently with every other read-model call
      // above rather than sequentially after them, so its own 15 internal
      // read-model calls (several of which target the SAME SBP/reserves
      // indicators getAllSbpIndicators()/getNetLiquidReserves() above
      // already fetch) land inside the same in-flight dedupe/10-minute L1
      // cache window (see sbp.ts's getSbpIndicator) instead of triggering a
      // second round of canonical-DB reads. `now` is supplied explicitly —
      // the engine itself never calls Date.now(), preserving its
      // determinism (see macroIntelligence.ts's own header).
      buildMacroIntelligenceReport(new Date()),
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


  const pktTimestamp = (() => {
    const d = new Date();
    const opts: Intl.DateTimeFormatOptions = { timeZone: "Asia/Karachi", hour12: false };
    const day = d.toLocaleString("en-GB", { ...opts, day: "numeric" });
    const month = d.toLocaleString("en-GB", { ...opts, month: "short" });
    const year = d.toLocaleString("en-GB", { ...opts, year: "numeric" });
    const time = d.toLocaleString("en-GB", { ...opts, hour: "2-digit", minute: "2-digit" });
    return `${day} ${month} ${year} · ${time} PKT`;
  })();

  // The recession/default data-confidence inputs that lived here moved to
  // /macro-intelligence with the HealthScoreCard and RiskIntelligenceSection
  // they fed (Phase 4 relocation). The models themselves are unchanged.

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

  // "Computed"/"next update" framing replaces the old 6h AI-cache-window
  // copy — this is now a weekly cadence, not a rolling cache.

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
    foreignReserves: `$${netLiquidReserves.kpi.value}B (${netLiquidReserves.kpi.change})`,
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
  // actual_value for Current Account/Trade Balance/Remittances/CPI/Core/LSM
  // is synced from this exact same SBP EasyData call (syncFromSbpEasyData.ts's
  // SYNC_TARGETS) — not a different vintage as an earlier version of this
  // comment assumed — so cross-referencing them is safe, not riskier than
  // not doing so. FX Reserves is the one exception: it's deliberately
  // excluded from SYNC_TARGETS (measure/frequency mismatch — see that
  // file's own comment) and synced instead by syncFxReservesFromSbpExcel.ts,
  // the same weekly Forex_Arch.xlsx source netLiquidReserves itself reads,
  // so the cross-reference below is still same-source, just a different function.
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

  // released event across every series, derived from the same
  // historicalCalendarEvents this page already fetches for the calendar
  // sections below (no new query).

  // sorted soonest-first, but it selects purely on `status = 'scheduled'`
  // with no date predicate, so an event whose outcome was never recorded
  // upstream stays in that set indefinitely and the ascending sort puts the
  // OLDEST such rows first. Slicing without a date filter therefore showed
  // 27 Jul / 5 Aug / 7 Aug 2026 as "upcoming" on 13 Sep 2026. Filtering to
  // today-or-later here (not inside the repo function) keeps the calendar
  // page and .ics feed on their existing semantics — see
  // selectUpcomingByDate's own comment. No new query.

  // calendar facts) plus a few KPI trend blurbs built only from each
  // indicator's own already-computed trend/change string, never a new
  // characterization invented here.
  // "increased"/"decreased" comes from the *change* string's own sign, not
  // kpi.trend — trend means "level is positive/negative" for growth-rate
  // indicators like LSM (e.g. trend="up" while change="-5.1 pp vs last
  // month", a deceleration that's still a positive growth level). change
  // is always a delta vs. the previous period (sbp.ts's changeLabel()),
  // so its leading sign is the reliable signal for "moved up or down."

  // upstream provider actually used on this page (SBP EasyData, PBS, World
  // Bank), reusing the same isFallback()/isStale() signals already computed
  // above rather than a new freshness calculation. SPI has no fallback by
  // design (see spi.ts) — a null result means the live fetch failed, not
  // that a snapshot was substituted.

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
    withCalendarFreshness({ ...netLiquidReserves.kpi, sparkline: netLiquidReserves.trend.slice(-12).map((p) => p.value) }, fxReservesEvent),
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

  // the same headline figures already computed above for headlineKpis
  // (reused by reference, not refetched); Tier 2 is a slimmer summary of
  // the external-sector/fiscal Kpis already fetched for the sections
  // further down the page. No new data anywhere in either tier.

  // indicator's own meta.observationDate — never the fetch/cache time),
  // formatted "Jul 2026". Phase 9.2 freshness audit: this tier previously
  // showed no period at all, making Exports/Imports (and every other driver
  // here) impossible to date at a glance — a genuinely stale value and a
  // freshly-released one were visually identical. Applied to every driver
  // in this tier, not just Exports/Imports, since they all share the exact
  // same ambiguity and singling out two would be its own inconsistency.

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

  // ── Phase 3 homepage view-models ─────────────────────────────────────────
  // Every value below is derived from data already fetched in this function.
  // No fetch, no cache entry, no recomputation of any economic figure.

  // Markets: the instruments the brief names, each linked to its own existing
  // detail page via the KPI_SEO_SLUG registry (never a hand-typed route).
  const homeMarketRows: MarketRow[] = (
    [
      ["USD/PKR", fxRates.usdPkr],
      ["EUR/PKR", fxRates.eurPkr],
      ["GBP/PKR", fxRates.gbpPkr],
      ["SAR/PKR", fxRates.sarPkr],
      ["Gold", goldKpi],
      ["Silver", silverKpi],
      ["Brent", brentKpi],
      ["WTI", wtiKpi],
      // Phase 4A: natural gas, Fed funds and the two Pakistani yields were
      // only ever on the removed ticker. They are carried over here so the
      // ticker's removal costs no instrument.
      ["Nat gas", naturalGasKpi],
      ["US 10Y", us10yKpi],
      ["Fed funds", fedFundsKpi],
      ["DXY", dxyKpi],
      ["3M T-bill", sbp.tbillYield3m.kpi],
      ["3Y PIB", sbp.pibYield3y.kpi],
      // KSE-100 itself requires a commercial PSX data licence (see
      // yfinance.ts) — this is the Global X MSCI Pakistan ETF, the same real,
      // free proxy used elsewhere on this dashboard, labelled honestly.
      ["KSE-100 proxy", pakEtfKpi],
    ] as const
  ).map(([label, kpi]) => {
    const slug = slugForKpi(kpi.title);
    return { label, kpi, href: slug ? `/${slug}` : undefined };
  });

  const homeSnapshotTiles = buildSnapshotTiles({ sbp, netLiquidReserves, usdPkrLive: fxRates.usdPkr });
  const homeIndicatorRows = buildIndicatorRows(sbp);

  // Headlines: the same AI-tagged articles the News & Intelligence section
  // below renders, just the top few, surfaced near the top of the page.
  const homeHeadlines = taggedNewsResult.items.slice(0, 7);

  // Latest News beside Markets (Phase E.1): the SAME already-fetched,
  // already-ranked, already-deduped article list — a second pass over one
  // in-memory array, never a second fetch. getNews() sorts by relevance
  // (relevanceEngine.ts scores Pakistan-economy stories highest) then by
  // publication time, and that order is kept. What is added is a freshness
  // guard: relevance ignores article age, so without it an old article that
  // ties on score could sit under a "Latest News" heading. See
  // headlineSelection.ts for why, and for the 48h window being a stated
  // presentation policy rather than a fact about the feeds.
  // Uses the page's single render-time clock reading (todayForCalendar) so
  // the 48h window and the Upcoming releases panel agree on what "now" is.
  const marketsSideNews = selectFreshHeadlines(taggedNewsResult.items, todayForCalendar.getTime());

  // Upcoming releases: the same already-filtered, today-or-later selection
  // the Hero uses (selectUpcomingByDate), widened to 8 rows for this panel.
  const todayIsoForHome = todayForCalendar.toISOString().slice(0, 10);
  const homeUpcomingRows: UpcomingRow[] = selectUpcomingByDate(scheduledCalendarEvents, todayIsoForHome, 8).map((e) => ({
    date: e.eventDate,
    title: e.title,
    importance: e.importance,
  }));

  // The engine's own calculatedAt — the moment the classification was
  // computed, which is distinct from any observation date it rests on.
  const macroBriefAsOf = formatPktDate(new Date(macroIntelligenceReport.calculatedAt));

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
        {/* Phase 4A: the sticky MarketTicker that used to sit here has been
            removed. It showed the same instruments as the Markets panel
            immediately below (USD/PKR, EUR/PKR, GBP/PKR, SAR/PKR, gold,
            silver, WTI, Brent, DXY, US 10Y, KSE-100 proxy) and cost the
            first screen ~56px without adding a figure. The panel below
            shows each quote WITH its observation date, which the scrolling
            ribbon could not.
            MarketTicker itself is untouched and still exported for other
            surfaces; only this one usage is gone. */}
        {/* ── Phase 3: economic-data homepage ──────────────────────────────
            Everything in this block renders from values already fetched
            above — buildSnapshotTiles/buildIndicatorRows are pure functions
            over the same `sbp`, `netLiquidReserves`, `fxRates`,
            `taggedNewsResult`, `scheduledCalendarEvents` and
            `macroIntelligenceReport` the rest of the page uses. No new
            query, no new cache entry, so the route's ISR window and every
            indicator's freshness semantics are unchanged. */}
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-3 py-4 sm:px-4 lg:px-6">
          {/* The page's own heading. Visually compact — the data below it is
              the point — but it is the document's single <h1>, which the
              briefing panel further down no longer has to supply. */}
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-pe-text">Pakistan economic dashboard</h1>
            <p className="font-mono text-[11px] text-pe-text-3">Page data checked {pktTimestamp}</p>
          </div>

          {/* Markets + Latest News (Phase E.1).
              Two columns from lg (~70/30), stacked below it so the market
              cards keep the full width they need on tablet and phone. Both
              panels start at the same grid row, so their headers align.
              `items-start` stops the news panel stretching to match a taller
              Markets grid and leaving dead space under the last article. */}
          <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)] lg:items-stretch">
            <Section id="home-markets" title="Markets" flush>
              <MarketsPanel rows={homeMarketRows} />
            </Section>

            {/* From lg the news section is a two-row grid (heading, then the
                list) with `h-0 min-h-full`: it adds nothing to the row's
                height, so Markets alone decides how tall the row is, yet it
                stretches to exactly that height. The list scrolls inside the
                remaining space, so the two panels' bottom edges line up with
                no dead space and no arbitrary pixel cap. Below lg it is a
                normal block stacked under Markets. */}
            <Section
              id="home-latest-news"
              className="lg:grid lg:h-0 lg:min-h-full lg:grid-rows-[auto_minmax(0,1fr)]"
              title="Latest News"
              actions={
                // No /news route exists yet, so this follows appNav.ts's own
                // convention of pointing "News" at the full Headlines
                // section further down this page rather than a dead link.
                // The padding/negative-margin pair enlarges the tap area to
                // a comfortable size without moving the header layout.
                <a href="#home-headlines" className="-my-3 inline-block py-3 text-pe-accent hover:underline">
                  All headlines →
                </a>
              }
              flush
            >
              {/* The panel's position, width and height are unchanged: it is
                  still the right-hand cell of the grid above, still stretched
                  to Markets' height. Only what is INSIDE it changed — the
                  scrolling list (and its scrollbar) became a ticker that
                  never scrolls the panel. Beside Markets (lg+) the ticker
                  fills the height Markets sets; below lg the panel is stacked
                  and the ticker sizes itself. See LatestNewsTicker.tsx. */}
              <div className="lg:h-full">
                <LatestNewsBody items={marketsSideNews.items} windowHours={LATEST_NEWS_MAX_AGE_HOURS} />
              </div>
            </Section>
          </div>

          <Section
            id="home-snapshot"
            title="Pakistan snapshot"
            description="Headline indicators, each with the period it reports on and its source."
            actions={<Link href="/pakistan-economic-indicators" className="text-pe-accent hover:underline">All indicators →</Link>}
            flush
          >
            <PakistanSnapshot tiles={homeSnapshotTiles} />
          </Section>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.35fr_1fr]">
            <Section
              id="home-headlines"
              title="Headlines"
              description={`${newsSourceCount} sources · tagged by ${taggedNewsResult.modelDisplayName}`}
              flush
            >
              <HeadlinesList items={homeHeadlines} />
            </Section>

            <div className="flex flex-col gap-3">
              <Section
                id="home-releases"
                title="Upcoming releases"
                actions={<Link href="/economic-calendar" className="text-pe-accent hover:underline">Calendar →</Link>}
                flush
              >
                <UpcomingReleases rows={homeUpcomingRows} todayIso={todayIsoForHome} />
              </Section>

              <Section
                id="home-macro-brief"
                title="Macro intelligence"
                description="How each dimension is currently classified."
              >
                <MacroBrief signals={macroIntelligenceReport.signals} asOf={macroBriefAsOf} />
              </Section>
            </div>
          </div>

          <Section
            id="home-indicators"
            title="Pakistan indicators"
            description="Search or sort. Every row links to that indicator's full history."
            flush
          >
            <IndicatorsTable rows={homeIndicatorRows} />
          </Section>

          <Section id="home-explore" title="Explore" flush>
            <ExploreLinks />
          </Section>

          {/* Kept from the retired legacy block: these have no other home.
              Provincial shortcuts and Popular Insights are navigation into
              existing pages; the Data Sources modal is this page's full
              per-indicator provenance audit, reachable from the one place
              that renders every KPI. */}
          <Section id="home-provincial" title="Provincial budgets" flush>
            <ProvincialQuickAccess />
          </Section>

          <PopularInsights />

          <div className="flex justify-center py-1">
            <DataSourcesModal kpis={allKpis} />
          </div>
        </div>

      </main>
      <FloatingAssistant context={dashboardSnapshot} />
    </div>
  );
}
