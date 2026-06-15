import DashboardSection from "@/components/DashboardSection";
import HealthScoreCard from "@/components/HealthScoreCard";
import Hero from "@/components/Hero";
import KpiGrid from "@/components/KpiGrid";
import Sidebar from "@/components/Sidebar";
import TrendLineChart from "@/components/charts/TrendLineChart";
import { healthFactors, healthScoreExplanation } from "@/data/healthScoreData";
import { sectionData } from "@/data/sectionData";
import { calculateHealthScore } from "@/lib/economicHealth";
import { getAllSbpIndicators } from "@/lib/data/sbp";
import { getGdpKpi } from "@/lib/data/worldBank";

function getSection(id: string) {
  const section = sectionData.find((item) => item.id === id);
  if (!section) {
    throw new Error(`Missing section data for "${id}"`);
  }
  return section;
}

export default async function Home() {
  const [gdpKpi, sbp] = await Promise.all([getGdpKpi(), getAllSbpIndicators()]);

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

  const healthScore = calculateHealthScore(healthFactors);

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <main id="overview" className="flex-1 scroll-mt-8 px-6 py-8 sm:px-10 lg:px-16">
        <Hero />

        <KpiGrid items={headlineKpis} />

        <HealthScoreCard score={healthScore} explanation={healthScoreExplanation} />

        <h2 className="mt-12 text-xl font-semibold text-white sm:text-2xl">
          Monetary &amp; External Indicators
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-white/60">
          Policy rate, money market yields, core and wholesale prices, and the
          external accounts that shape Pakistan&apos;s financing needs.
        </p>
        <KpiGrid items={secondaryKpis} />

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

        <DashboardSection {...getSection("reserves")}>
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
      </main>
    </div>
  );
}
