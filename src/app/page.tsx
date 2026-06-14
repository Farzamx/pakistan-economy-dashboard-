import DashboardSection from "@/components/DashboardSection";
import HealthScoreCard from "@/components/HealthScoreCard";
import Hero from "@/components/Hero";
import KpiGrid from "@/components/KpiGrid";
import Sidebar from "@/components/Sidebar";
import TrendLineChart from "@/components/charts/TrendLineChart";
import { healthFactors, healthScoreExplanation } from "@/data/healthScoreData";
import { sectionData } from "@/data/sectionData";
import { calculateHealthScore } from "@/lib/economicHealth";
import { getInflationTrend, getKpiData, getReservesTrend } from "@/lib/data/worldBank";

function getSection(id: string) {
  const section = sectionData.find((item) => item.id === id);
  if (!section) {
    throw new Error(`Missing section data for "${id}"`);
  }
  return section;
}

export default async function Home() {
  const [kpiData, inflationTrend, reservesTrend] = await Promise.all([
    getKpiData(),
    getInflationTrend(),
    getReservesTrend(),
  ]);

  const healthScore = calculateHealthScore(healthFactors);

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <main id="overview" className="flex-1 scroll-mt-8 px-6 py-8 sm:px-10 lg:px-16">
        <Hero />

        <KpiGrid items={kpiData} />

        <HealthScoreCard score={healthScore} explanation={healthScoreExplanation} />

        <DashboardSection {...getSection("gdp")} />

        <DashboardSection {...getSection("inflation")}>
          <div className="mt-6 rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <p className="mb-2 text-xs font-medium text-white/40">
              10-Year Trend <span className="text-white/25">· World Bank, annual</span>
            </p>
            <TrendLineChart
              data={inflationTrend}
              color="#a855f7"
              unit="%"
              gradientId="inflationGradient"
            />
          </div>
        </DashboardSection>

        <DashboardSection {...getSection("reserves")}>
          <div className="mt-6 rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <p className="mb-2 text-xs font-medium text-white/40">
              10-Year Trend <span className="text-white/25">· World Bank, annual</span>
            </p>
            <TrendLineChart
              data={reservesTrend}
              color="#38bdf8"
              unit="B"
              gradientId="reservesGradient"
            />
          </div>
        </DashboardSection>

        <DashboardSection {...getSection("exchange-rate")} />
        <DashboardSection {...getSection("remittances")} />
      </main>
    </div>
  );
}
