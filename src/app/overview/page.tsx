import type { Metadata } from "next";
import { SITE_URL, SITE_NAME } from "@/lib/seoConfig";
import DataSourcesModal from "@/components/DataSourcesModal";
import FloatingAssistant from "@/components/assistant/FloatingAssistant";
import type { DashboardSnapshot } from "@/lib/assistantContext";
import { buildMacroIntelligenceReport } from "@/lib/intelligence/macroIntelligence";
import Sidebar from "@/components/Sidebar";
import HashScrollRestore from "@/components/HashScrollRestore";
// Overview sections: presentation components over data this page already fetches.
import { KeyFigureTiles, MacroSummaryCard, MarketsStrip, OverviewHeader, SecondaryStrip, type KeyFigure, type MarketCell, type SecondaryFigure } from "@/components/home/OverviewSummary";
import { OverviewHeadlines, ReleaseCalendar } from "@/components/home/OverviewFeeds";
import { ExplorePlatform, OverviewFooter } from "@/components/home/ExplorePlatform";
import IndicatorsTable from "@/components/home/IndicatorsTable";
import { buildIndicatorRows, INDICATOR_CALENDAR_SERIES, slugForKpi } from "@/components/home/buildHomeData";
import { toNumericValue } from "@/components/home/indicatorRows";
import { buildMacroSummary } from "@/components/home/macroSummary";
import { cleanSourceName, dropInterbank, formatLongDate, formatObservation, pktDateIso } from "@/components/home/overviewFormat";
import { buildReleaseRows, groupReleaseRows, nextReleaseBySeries } from "@/components/home/releaseGroups";
import { statusFor } from "@/components/home/valueDisplay";
import { getFreshnessStatus } from "@/lib/dataFreshness";
import { getTrendDirection } from "@/lib/trendDirection";
import { getMostRecentEvent, valueMatchesEventOutcome } from "@/lib/economicCalendar/economicCalendarData";
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
import { getDxyKpi, getGoldKpi, getSilverKpi } from "@/lib/data/metals";
import { getNews } from "@/lib/data/news";
import { selectFreshHeadlines } from "@/lib/headlineSelection";
import { getPakEtfKpi } from "@/lib/data/yfinance";
import { getSpiHistory } from "@/lib/data/spi";
import { type RiskModelResult } from "@/lib/riskModels";
import { getHealthStatus, healthLabelToRiskLevel, type HealthModelResult } from "@/lib/economicHealth";
import type { Kpi } from "@/data/kpiData";
import type { SbpIndicatorKey, SbpIndicatorResult } from "@/lib/data/sbp";
import type { FreshnessResult } from "@/lib/freshness/freshnessEngine";

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

  // ── Headlines: the news feeds' tiered cache (news.ts: 10-25 min by source). The Overview no longer runs the AI sentiment tagger
  // (getTaggedNews): nothing on the page shows its output, so the call was dropped rather than paid for silently.

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

  // ── Overview view-models ─────────────────────────────────────────────────
  // Every value below is derived from data already fetched in this function. No fetch, no cache entry, no recomputation of an economic figure.
  // Each section's model is built inside its own guard: if one fails, that section renders its error state and the rest of the page still renders.

  const todayIso = pktDateIso(todayForCalendar);
  const dateLine = formatLongDate(todayIso);

  const sparkOf = (trend: { value: number }[]) => trend.slice(-12).map((p) => p.value);
  const tileFor = (
    id: string,
    label: string,
    entry: { kpi: Kpi; trend: { value: number }[]; meta: { source: string; frequency: string; observationDate: string; freshness: { state: FreshnessResult["state"] } } },
    nextDate: string | undefined,
    extra: Partial<KeyFigure> = {},
  ): KeyFigure | null => {
    const slug = slugForKpi(entry.kpi.title);
    const period = entry.meta.observationDate || entry.kpi.latestDate || null;
    return {
      id,
      label,
      value: entry.kpi.value,
      unit: entry.kpi.unit,
      change: entry.kpi.change,
      period: formatObservation(period, entry.meta.frequency),
      source: cleanSourceName(entry.meta.source),
      sparkline: sparkOf(entry.trend),
      href: slug ? `/${slug}` : "",
      status: statusFor(entry.meta.freshness.state, nextDate === todayIso),
      ...extra,
    };
  };

  const nextBySeries = guard(() => nextReleaseBySeries(scheduledCalendarEvents, todayIso), "calendar") ?? new Map<string, string>();
  const next = (slug: string) => nextBySeries.get(slug);
  // One status per SBP series, from the same freshness result and the same calendar map the indicators table uses, so the macro card can never
  // call a series stale that the table and strip show as current (or the reverse).
  const statusOfKey = (key: SbpIndicatorKey) => {
    const slug = INDICATOR_CALENDAR_SERIES[key];
    return statusFor(sbp[key].meta.freshness.state, slug !== undefined && next(slug) === todayIso);
  };

  // 2b. Key figures. USD/PKR shows the live market quote; its sparkline is SBP's monthly average, the only history in scope for this pair.
  const keyFigures: KeyFigure[] = guard(
    () =>
      [
        tileFor("cpi", "CPI inflation, YoY", sbp.cpiInflation, next("cpi-inflation-release")),
        // The policy rate moves in discrete steps at MPC decisions: drawn as a step line, not a slope between meetings.
        tileFor("policy-rate", "SBP policy rate", sbp.policyRate, next("sbp-monetary-policy-committee-meeting"), { stepped: true }),
        slugForKpi("USD / PKR")
          ? {
              id: "usd-pkr",
              label: "USD/PKR, market quote",
              value: fxRates.usdPkr.value,
              unit: fxRates.usdPkr.unit,
              // The provider's change string names the rate "interbank"; this tile is the market quote, so the word is dropped here.
              change: dropInterbank(fxRates.usdPkr.change),
              period: formatObservation(fxRates.usdPkr.latestDate, "Daily"),
              source: cleanSourceName(fxRates.usdPkr.source),
              footnote: "trend: SBP monthly average",
              sparkline: sparkOf(sbp.usdPkr.trend),
              href: `/${slugForKpi("USD / PKR")}`,
            }
          : null,
        tileFor("reserves", "Foreign reserves, SBP", netLiquidReserves, next("sbp-foreign-exchange-reserves")),
      ].filter((t): t is KeyFigure => t !== null),
    "key figures",
  ) ?? [];

  // 2a. Macro Intelligence card: the engine's own classifications, with the figure each rests on (the same values shown in the tiles and strip).
  const realPolicyRate = (() => {
    const policy = toNumericValue(sbp.policyRate.kpi.value);
    const cpi = toNumericValue(sbp.cpiInflation.kpi.value);
    if (policy === null || cpi === null) return null;
    const diff = policy - cpi;
    return `${diff >= 0 ? "+" : "−"}${Math.abs(diff).toFixed(1)}`;
  })();
  const gdpSignal = macroIntelligenceReport.signals.find((s) => s.id === "growth");
  const gdpEvidence = gdpSignal?.evidence.find((e) => e.seriesId === "worldbank:gdpGrowthPak") ?? null;
  const macroSummary = guard(
    () =>
      buildMacroSummary(
        macroIntelligenceReport.signals,
        {
          // Each row names one series and carries THAT series' page status (statusOfKey), the same one its tile, strip cell or table row shows.
          inflation: { text: `CPI ${sbp.cpiInflation.kpi.value}% · ${formatObservation(sbp.cpiInflation.meta.observationDate, "Monthly")}`, status: statusOfKey("cpiInflation") },
          "monetary-policy": { text: `Policy rate ${sbp.policyRate.kpi.value}% · ${formatObservation(sbp.policyRate.meta.observationDate, "Daily")}`, status: statusOfKey("policyRate") },
          "external-sector": { text: `Remittances ${sbp.remittances.kpi.value}${sbp.remittances.kpi.unit} · ${formatObservation(sbp.remittances.meta.observationDate, "Monthly")}`, status: statusOfKey("remittances") },
          "liquidity-credit": { text: `M2 ${sbp.moneySupplyM2.kpi.value}${sbp.moneySupplyM2.kpi.unit} · ${formatObservation(sbp.moneySupplyM2.meta.observationDate, "Monthly")}`, status: statusOfKey("moneySupplyM2") },
          "fiscal-conditions": { text: `Fiscal balance ${sbp.fiscalBalance.kpi.value}${sbp.fiscalBalance.kpi.unit} · ${formatObservation(sbp.fiscalBalance.meta.observationDate, "Annual")}`, status: statusOfKey("fiscalBalance") },
          // The classifier reads World Bank annual GDP growth only (not LSM). Marked as annual so it is not read as a current monthly signal.
          growth: gdpEvidence && gdpEvidence.value !== null
            ? { text: `GDP growth ${gdpEvidence.value.toFixed(1)}% · ${formatObservation(gdpEvidence.observationPeriod, "Monthly").replace(/^[A-Z][a-z]{2} /, "")}`, note: "annual data" }
            : { text: `GDP growth (World Bank) · ${gdpKpi.latestDate ?? ""}`.trim(), note: "annual data" },
          // Market stress is classified from gold and the SBP MONTHLY-AVERAGE USD/PKR (macroIntelligence.ts), not the daily market quote in the tile,
          // so the row names that series, with the status the table's "USD/PKR, SBP monthly average" row shows.
          "market-stress": { text: `USD/PKR monthly avg ${sbp.usdPkr.kpi.value} · ${formatObservation(sbp.usdPkr.meta.observationDate, "Monthly")}`, status: statusOfKey("usdPkr") },
        },
        {
          cpi: { value: sbp.cpiInflation.kpi.value, period: formatObservation(sbp.cpiInflation.meta.observationDate, "Monthly") },
          policyRate: { value: sbp.policyRate.kpi.value },
          realRate: realPolicyRate ?? undefined,
          remittances: { value: sbp.remittances.kpi.value, unit: sbp.remittances.kpi.unit, period: formatObservation(sbp.remittances.meta.observationDate, "Monthly") },
        },
      ),
    "macro summary",
  );

  // 3. Secondary figures. The real policy rate is derived here (policy rate minus CPI YoY) and labelled as such.
  const secondaryFor = (id: string, label: string, entry: SbpIndicatorResult, nextSlug?: string, extra: Partial<SecondaryFigure> = {}): SecondaryFigure => {
    const slug = slugForKpi(entry.kpi.title);
    const period = formatObservation(entry.meta.observationDate, entry.meta.frequency);
    const status = statusFor(entry.meta.freshness.state, nextSlug !== undefined && next(nextSlug) === todayIso);
    const plain = status.tone === "current";
    return {
      id,
      label,
      value: entry.kpi.value,
      unit: entry.kpi.unit,
      change: plain ? entry.kpi.change : null,
      note: plain ? period : `${period} · ${status.label.toLowerCase()}`,
      noteTone: plain ? undefined : status.tone === "due" ? "due" : "warn",
      href: slug ? `/${slug}` : undefined,
      ...extra,
    };
  };
  const secondaryFigures: SecondaryFigure[] = guard(
    () => [
      secondaryFor("core", "Core inflation", sbp.coreInflation, "core-inflation-release"),
      ...(realPolicyRate !== null
        ? [{ id: "real-rate", label: "Real policy rate", value: realPolicyRate, unit: "pp", note: "Policy rate minus CPI", href: `/${slugForKpi("Policy Rate")}` }]
        : []),
      secondaryFor("remittances", "Remittances", sbp.remittances, "worker-remittances"),
      secondaryFor("current-account", "Current account", sbp.currentAccount, "current-account-balance"),
      secondaryFor("fiscal", "Fiscal balance", sbp.fiscalBalance),
      secondaryFor("lsm", "LSM growth", sbp.lsm, "large-scale-manufacturing-lsm-growth"),
    ],
    "secondary figures",
  ) ?? [];

  // Markets: a slim strip of five instruments, the same data as before (no new fetch). The full set lives on each instrument's page.
  const marketCell = (label: string, kpi: Kpi, frequency: string): MarketCell => {
    const slug = slugForKpi(kpi.title);
    return { label, value: kpi.value, unit: kpi.unit, change: kpi.change, period: formatObservation(kpi.latestDate, frequency), href: slug ? `/${slug}` : undefined };
  };
  const marketCells: MarketCell[] = guard(
    () => [
      marketCell("KSE-100 proxy (PAK ETF)", pakEtfKpi, "Daily"),
      marketCell("Gold", goldKpi, "Daily"),
      marketCell("Brent crude", brentKpi, "Daily"),
      // Yahoo market quotes like USD/PKR (EURPKR=X, GBPPKR=X), not interbank rates: the template's "interbank" is dropped here too.
      { ...marketCell("EUR/PKR", fxRates.eurPkr, "Daily"), change: dropInterbank(fxRates.eurPkr.change) },
      { ...marketCell("GBP/PKR", fxRates.gbpPkr, "Daily"), change: dropInterbank(fxRates.gbpPkr.change) },
    ],
    "markets",
  ) ?? [];

  // 4. Release calendar and headlines.
  const releaseGroups = guard(() => groupReleaseRows(buildReleaseRows(scheduledCalendarEvents, todayIso), todayIso), "release calendar");
  const dueTodayLabels = releaseGroups?.today.map((r) => r.pillLabel) ?? [];
  const newsSourceCount = new Set(newsItems.map((n) => n.source)).size;
  const headlineItems = guard(() => selectFreshHeadlines(newsItems, todayForCalendar.getTime(), { limit: 6 }).items, "headlines") ?? [];

  // 5. Indicators table. The next-release column and "Due today" status come from the calendar; the count in "Show all" comes from the rows.
  const homeIndicatorRows = guard(() => buildIndicatorRows(sbp, { todayIso, nextBySeries }), "indicators") ?? [];

  // Every KPI, for the Data Sources audit table in the footer.
  const allKpis = [...headlineKpis, ...secondaryKpis, ...globalMarketsKpis, pakEtfKpi, ...liveFxKpis, ...realEconomyKpis, sbp.netBankReserves.kpi];

  return (
    <div className="flex min-h-screen w-full">
      <HashScrollRestore />
      <Sidebar />
      <main id="overview" className="min-w-0 flex-1 scroll-mt-[60px] sm:scroll-mt-[120px]">
        {/* Bottom padding keeps the floating assistant button clear of the last section on both layouts. */}
        <div id="main-content" tabIndex={-1} className="mx-auto flex max-w-[1280px] flex-col gap-4 px-4 pb-28 pt-6 focus:outline-none lg:gap-5 lg:px-6 lg:pb-32 lg:pt-8">
          <OverviewHeader dateLine={dateLine} dueToday={dueTodayLabels} />

          {/* Summary row: the two columns stretch to one height. */}
          <div id="home-snapshot" className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-stretch">
            <MacroSummaryCard id="home-macro-brief" summary={macroSummary} />
            <section aria-labelledby="home-key-figures-heading" className="flex flex-col gap-3">
              {/* The tiles carry their own labels; on a phone they sit under the macro card, so a heading says what the block is. */}
              <h2 id="home-key-figures-heading" className="text-[17px] font-semibold text-pe-text lg:sr-only">Key figures</h2>
              <KeyFigureTiles tiles={keyFigures} />
            </section>
          </div>

          <SecondaryStrip cells={secondaryFigures} />

          <MarketsStrip id="home-markets" cells={marketCells} allHref="/pakistan-stock-market" />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-stretch">
            <ReleaseCalendar id="home-releases" groups={releaseGroups} todayIso={todayIso} />
            <OverviewHeadlines id="home-headlines" items={headlineItems} todayIso={todayIso} sourceCount={newsSourceCount} />
          </div>

          <section id="home-indicators" aria-labelledby="home-indicators-heading" className="rounded-[var(--pe-radius)] border border-pe-border bg-pe-surface">
            <div className="px-4 pb-3 pt-4 lg:px-5 lg:pt-5">
              <h2 id="home-indicators-heading" className="text-[17px] font-semibold text-pe-text">Indicators</h2>
              <p className="text-[13px] text-pe-text-2">{homeIndicatorRows.length} series. Every row opens its full history.</p>
            </div>
            <IndicatorsTable rows={homeIndicatorRows} />
          </section>

          <ExplorePlatform />

          <OverviewFooter sources={<DataSourcesModal kpis={allKpis} appearance="footer" />} />
        </div>
      </main>
      <FloatingAssistant context={dashboardSnapshot} />
    </div>
  );
}

/** Builds one section's view-model; on failure logs it and returns null so that section shows its own error state. */
function guard<T>(build: () => T, section: string): T | null {
  try {
    return build();
  } catch (err) {
    console.error(`[overview] ${section} failed to build: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}