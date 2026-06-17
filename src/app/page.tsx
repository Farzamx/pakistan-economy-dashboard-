import DashboardSection from "@/components/DashboardSection";
import DataSourcesModal from "@/components/DataSourcesModal";
import HealthScoreCard from "@/components/HealthScoreCard";
import Hero from "@/components/Hero";
import InfoTooltip from "@/components/InfoTooltip";
import KpiGrid from "@/components/KpiGrid";
import MarketTicker, { type TickerItem } from "@/components/MarketTicker";
import NewsIntelligenceSection from "@/components/NewsIntelligenceSection";
import RiskIntelligenceSection from "@/components/RiskIntelligenceSection";
import Sidebar from "@/components/Sidebar";
import ViewportFadeIn from "@/components/ViewportFadeIn";
import TrendLineChart from "@/components/charts/TrendLineChart";
import { fallbackPakEtfKpi } from "@/data/globalMarketsFallbackData";
import { sectionData } from "@/data/sectionData";
import { getFreshnessStatus } from "@/lib/dataFreshness";
import { getAiEconomicAnalysis } from "@/lib/data/aiEconomicAnalysis";
import { getAiRiskIntelligence } from "@/lib/data/aiRiskIntelligence";
import { getAllSbpIndicators } from "@/lib/data/sbp";
import { getGdpKpi } from "@/lib/data/worldBank";
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
import { getPakEtfKpi } from "@/lib/data/yfinance";
import {
  calculateRecessionRisk,
  calculateDefaultRisk,
  computeDataConfidence,
  type IndicatorStatus,
} from "@/lib/riskModels";
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
  return { label, value: kpi.value, unit, changeDisplay, trend: kpi.trend, termKey };
}

function getSection(id: string) {
  const section = sectionData.find((item) => item.id === id);
  if (!section) {
    throw new Error(`Missing section data for "${id}"`);
  }
  return section;
}

export default async function Home() {
  const [gdpKpi, sbp, goldKpi, silverKpi, brentKpi, wtiKpi, naturalGasKpi, dxyKpi, us10yKpi, fedFundsKpi, newsItems, fxRates, pakEtfKpiRaw] =
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
    ]);

  const pakEtfKpi = pakEtfKpiRaw ?? fallbackPakEtfKpi;

  // ── Quantitative risk model inputs ────────────────────────────────────────
  // Compute USD/PKR YoY change from the 24-month trend array (index −13 = 12mo ago)
  const usdPkrTrend = sbp.usdPkr.trend;
  const currentUsdPkr = parseFloat(sbp.usdPkr.kpi.value);
  const yearAgoUsdPkr =
    usdPkrTrend[Math.max(0, usdPkrTrend.length - 13)]?.value ?? currentUsdPkr;
  const usdPkrYoyPct =
    yearAgoUsdPkr > 0 ? ((currentUsdPkr - yearAgoUsdPkr) / yearAgoUsdPkr) * 100 : 0;

  // Import cover = total reserves (SBP + banks) / monthly imports
  const sbpReservesB = parseFloat(sbp.foreignReserves.kpi.value);
  const bankReservesB = parseFloat(sbp.netBankReserves.kpi.value);
  const monthlyImportsB = parseFloat(sbp.imports.kpi.value);
  const importCoverMonths =
    monthlyImportsB > 0 ? (sbpReservesB + bankReservesB) / monthlyImportsB : 3.0;

  // Private credit growth YoY % — weekly SBP series; replaces PAK ETF day % (too noisy)
  const privateCreditGrowthPct = parseFloat(sbp.privateCreditGrowth.kpi.value);

  // LSM MoM index points change (change string: "-6.8 vs Feb 2026")
  const lsmMatch = sbp.lsm.kpi.change.match(/^([+-]?\d+\.?\d*)/);
  const lsmMomPoints = lsmMatch ? parseFloat(lsmMatch[1]) : 0;

  const recessionResult = calculateRecessionRisk({
    gdpGrowthPct: parseFloat(gdpKpi.value),
    cpiInflationPct: parseFloat(sbp.cpiInflation.kpi.value),
    policyRatePct: parseFloat(sbp.policyRate.kpi.value),
    importCoverMonths,
    currentAccountMonthlyB: parseFloat(sbp.currentAccount.kpi.value),
    usdPkrYoyChangePct: usdPkrYoyPct,
    privateCreditGrowthPct,
    lsmMomPoints,
  });

  // SBP Reserves removed from DefaultModelInputs — it was the numerator of importCoverMonths,
  // causing double-counting at a combined 0.45 effective weight.
  const defaultResult = calculateDefaultRisk({
    importCoverMonths,
    fiscalBalanceTrn: parseFloat(sbp.fiscalBalance.kpi.value),
    currentAccountMonthlyB: parseFloat(sbp.currentAccount.kpi.value),
    usdPkrYoyChangePct: usdPkrYoyPct,
    policyRatePct: parseFloat(sbp.policyRate.kpi.value),
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

  // Recession model — 10 raw data inputs
  const recessionIndicators: IndicatorStatus[] = [
    { label: "GDP Growth",        isFallback: false,                               isStale: daysSince(gdpKpi.latestDate ?? "2024") > 730 },
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

  const [taggedNewsResult, aiAnalysis, aiRisk] = await Promise.all([
    getTaggedNews(newsItems),
    getAiEconomicAnalysis(
    {
      gdpGrowth:       `${gdpKpi.value}${gdpKpi.unit} (${gdpKpi.change})`,
      cpiInflation:    `${sbp.cpiInflation.kpi.value}${sbp.cpiInflation.kpi.unit} (${sbp.cpiInflation.kpi.change})`,
      coreInflation:   `${sbp.coreInflation.kpi.value}${sbp.coreInflation.kpi.unit} (${sbp.coreInflation.kpi.change})`,
      policyRate:      `${sbp.policyRate.kpi.value}${sbp.policyRate.kpi.unit} (${sbp.policyRate.kpi.change})`,
      foreignReserves: `$${sbp.foreignReserves.kpi.value}B (${sbp.foreignReserves.kpi.change})`,
      tradeBalance:    `${sbp.tradeBalance.kpi.value}${sbp.tradeBalance.kpi.unit} (${sbp.tradeBalance.kpi.change})`,
      currentAccount:  `${sbp.currentAccount.kpi.value}${sbp.currentAccount.kpi.unit} (${sbp.currentAccount.kpi.change})`,
      remittances:     `$${sbp.remittances.kpi.value}B (${sbp.remittances.kpi.change})`,
      usdPkr:          `${sbp.usdPkr.kpi.value} PKR (${sbp.usdPkr.kpi.change})`,
      kse100:          `${pakEtfKpi.value} (${pakEtfKpi.change})`,
      brentOil:        `$${brentKpi.value}/bbl (${brentKpi.change})`,
      wtiOil:          `$${wtiKpi.value}/bbl (${wtiKpi.change})`,
      gold:            `$${goldKpi.value}/oz (${goldKpi.change})`,
      dxy:             `${dxyKpi.value} (${dxyKpi.change})`,
      us10y:           `${us10yKpi.value}% (${us10yKpi.change})`,
      fedFunds:        `${fedFundsKpi.value}% (${fedFundsKpi.change})`,
    },
    newsItems,
  ),
    getAiRiskIntelligence(recessionResult, defaultResult),
  ]);

  const headlineKpis = [
    gdpKpi,
    sbp.cpiInflation.kpi,
    sbp.foreignReserves.kpi,
    sbp.usdPkr.kpi,
    sbp.remittances.kpi,
  ];

  const secondaryKpis = [
    sbp.policyRate.kpi,
    sbp.coreInflation.kpi,
    sbp.wpiInflation.kpi,
    sbp.tbillYield3m.kpi,
    sbp.pibYield3y.kpi,
    sbp.currentAccount.kpi,
    sbp.tradeBalance.kpi,
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

  const liveFxKpis = [
    fxRates.usdPkr,
    fxRates.eurPkr,
    fxRates.gbpPkr,
    fxRates.sarPkr,
  ];

  const realEconomyKpis = [
    sbp.exports.kpi,
    sbp.imports.kpi,
    sbp.fdiInflows.kpi,
    sbp.reer.kpi,
    sbp.lsm.kpi,
    sbp.privateCreditGrowth.kpi,
    sbp.fiscalBalance.kpi,
  ];

  // Build-time data freshness audit — printed to server/build console
  console.log("\n=== Global Markets Freshness Audit ===");
  console.log("Indicator            | Source          | latestDate   | status");
  console.log("---------------------|-----------------|--------------|--------");
  for (const kpi of globalMarketsKpis) {
    const status = getFreshnessStatus(kpi.latestDate, kpi.frequency);
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
    ...(pakEtfKpiRaw !== null ? [pakEtfKpiRaw] : [pakEtfKpi]),
    ...liveFxKpis,
    ...realEconomyKpis,
    sbp.netBankReserves.kpi,
  ];

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <main id="overview" className="flex-1 scroll-mt-8 px-6 py-8 sm:px-10 lg:px-16">
        <Hero />

        <MarketTicker items={tickerItems} />

        <KpiGrid items={headlineKpis} />

        <HealthScoreCard {...aiAnalysis} />

        <RiskIntelligenceSection
          recession={recessionResult}
          defaultRisk={defaultResult}
          ai={aiRisk}
          recessionConfidence={recessionConfidence}
          defaultConfidence={defaultConfidence}
        />

        <ViewportFadeIn>
          <h2 className="mt-12 text-xl font-semibold text-white sm:text-2xl">
            Monetary &amp; External Indicators
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-white/60">
            Policy rate, money market yields, core and wholesale prices, and the
            external accounts that shape Pakistan&apos;s financing needs.
          </p>
        </ViewportFadeIn>
        <KpiGrid items={secondaryKpis} />

        <div id="global-markets" className="scroll-mt-8">
          <ViewportFadeIn>
            <h2 className="mt-12 text-xl font-semibold text-white sm:text-2xl">
              Global Markets
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-white/60">
              Precious metals, energy benchmarks, and US rates that drive
              global risk appetite and Pakistan&apos;s import bill.
            </p>
          </ViewportFadeIn>
          <KpiGrid items={globalMarketsKpis} />
        </div>

        <div id="financial-markets" className="scroll-mt-8">
          <ViewportFadeIn>
            <h2 className="mt-12 text-xl font-semibold text-white sm:text-2xl">
              Financial Markets
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-white/60">
              Pakistan equity market proxy and bond market yields. Live data via
              Yahoo Finance and SBP EasyData.
            </p>
          </ViewportFadeIn>

          {/* PAK ETF — equity market proxy card (only if data is fresh) */}
          {pakEtfKpiRaw !== null && <KpiGrid items={[pakEtfKpiRaw]} />}

          {/* KSE-100 data availability notice */}
          <div className="mt-6 rounded-xl border border-white/5 bg-white/[0.02] px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-white/40">
              KSE-100 Live Chart — Data Unavailable
            </p>
            <p className="mt-2 text-sm text-white/50">
              Pakistan Stock Exchange (PSX) real-time index data requires a commercial
              data license from PSX. This restriction applies to all free-tier providers
              including TradingView and Yahoo Finance.
              {pakEtfKpiRaw !== null
                ? " The PAK ETF above (Global X MSCI Pakistan ETF, NYSE) tracks the MSCI Pakistan Index and correlates with KSE-100 performance."
                : " The Global X MSCI Pakistan ETF (NYSE: PAK), a US-listed proxy that previously tracked the MSCI Pakistan Index, is currently unavailable or delisted."}
            </p>
            <div className="mt-3 flex gap-6">
              <a
                href="https://www.psx.com.pk"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-neon-blue/70 underline underline-offset-2 hover:text-neon-blue"
              >
                psx.com.pk ↗
              </a>
              <a
                href="https://www.tradingview.com/chart/?symbol=PSX%3AKSE100"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-neon-blue/70 underline underline-offset-2 hover:text-neon-blue"
              >
                KSE-100 on TradingView ↗
              </a>
            </div>
          </div>

          {/* Pakistan Bond Market — T-Bill 3M yield trend (24-month SBP data) */}
          <div className="mt-6 rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <div className="mb-2 flex items-center gap-1.5">
              <p className="text-xs font-medium text-white/40">
                Pakistan Bond Market &mdash; T-Bill 3M Yield
                <span className="text-white/25"> &middot; SBP EasyData, monthly</span>
              </p>
              <InfoTooltip termKey="3M T-Bill Yield" size="xs" />
            </div>
            <TrendLineChart
              data={sbp.tbillYield3m.trend}
              color="#38bdf8"
              unit="%"
              gradientId="tbillFinancialMarkets"
            />
          </div>
        </div>

        <div id="real-economy" className="scroll-mt-8">
          <ViewportFadeIn>
            <h2 className="mt-12 text-xl font-semibold text-white sm:text-2xl">
              Real Economy &amp; Fiscal
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-white/60">
              Trade flows, investment, competitiveness, industrial output, credit
              expansion, and Pakistan&apos;s fiscal position.
            </p>
          </ViewportFadeIn>
          <KpiGrid items={realEconomyKpis} />
        </div>

        <DashboardSection {...getSection("gdp")} />

        <DashboardSection {...getSection("inflation")}>
          <div className="mt-6 rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <p className="mb-2 text-xs font-medium text-white/40">
              24-Month Trend <span className="text-white/25">· SBP EasyData, monthly</span>
            </p>
            <TrendLineChart
              data={sbp.cpiInflation.trend}
              color="#a855f7"
              unit="%"
              gradientId="cpiInflationGradient"
            />
          </div>
        </DashboardSection>

        <DashboardSection {...getSection("price-indices")}>
          <div className="mt-6 rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <p className="mb-2 text-xs font-medium text-white/40">
              24-Month Trend <span className="text-white/25">· SBP EasyData, monthly</span>
            </p>
            <TrendLineChart
              data={sbp.coreInflation.trend}
              color="#2dd4bf"
              unit="%"
              gradientId="coreInflationGradient"
            />
          </div>
        </DashboardSection>

        <DashboardSection {...getSection("monetary-policy")}>
          <div className="mt-6 rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <p className="mb-2 text-xs font-medium text-white/40">
              Recent Trend <span className="text-white/25">· SBP EasyData, as-needed</span>
            </p>
            <TrendLineChart
              data={sbp.policyRate.trend}
              color="#fbbf24"
              unit="%"
              gradientId="policyRateGradient"
            />
          </div>
        </DashboardSection>

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
          <div className="mt-6 rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <p className="mb-2 text-xs font-medium text-white/40">
              24-Month Trend <span className="text-white/25">· SBP EasyData, monthly</span>
            </p>
            <TrendLineChart
              data={sbp.foreignReserves.trend}
              color="#38bdf8"
              unit="B"
              gradientId="reservesGradient"
            />
          </div>
        </DashboardSection>

        <div id="live-fx" className="scroll-mt-8">
          <ViewportFadeIn>
            <h2 className="mt-12 text-xl font-semibold text-white sm:text-2xl">
              Live Exchange Rates
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-white/60">
              Current interbank market rates for PKR cross-pairs, updated hourly
              from ExchangeRate-API. Distinct from the SBP monthly-average series
              shown in the historical trend below.
            </p>
          </ViewportFadeIn>
          <KpiGrid items={liveFxKpis} />
        </div>

        <DashboardSection {...getSection("exchange-rate")}>
          <div className="mt-6 rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <p className="mb-2 text-xs font-medium text-white/40">
              24-Month Trend <span className="text-white/25">· SBP EasyData, monthly</span>
            </p>
            <TrendLineChart
              data={sbp.usdPkr.trend}
              color="#f472b6"
              unit=""
              gradientId="usdPkrGradient"
            />
          </div>
        </DashboardSection>

        <DashboardSection {...getSection("remittances")}>
          <div className="mt-6 rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <p className="mb-2 text-xs font-medium text-white/40">
              24-Month Trend <span className="text-white/25">· SBP EasyData, monthly</span>
            </p>
            <TrendLineChart
              data={sbp.remittances.trend}
              color="#34d399"
              unit="B"
              gradientId="remittancesGradient"
            />
          </div>
        </DashboardSection>

        <DashboardSection {...getSection("external-sector")}>
          <div className="mt-6 rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <p className="mb-2 text-xs font-medium text-white/40">
              24-Month Trend <span className="text-white/25">· SBP EasyData, monthly</span>
            </p>
            <TrendLineChart
              data={sbp.tradeBalance.trend}
              color="#fb7185"
              unit="B"
              gradientId="tradeBalanceGradient"
            />
          </div>
        </DashboardSection>

        <NewsIntelligenceSection
          items={taggedNewsResult.items.slice(0, 5)}
          modelDisplayName={taggedNewsResult.modelDisplayName}
        />
      </main>
      <DataSourcesModal kpis={allKpis} />
    </div>
  );
}
