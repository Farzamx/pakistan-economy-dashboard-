import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";
import ToolBreadcrumb from "@/components/decisionSupportLab/ToolBreadcrumb";
import InvestmentScenarioSimulatorHero from "@/components/investmentScenarioSimulator/InvestmentScenarioSimulatorHero";
import InvestmentScenarioSimulatorCalculator from "@/components/investmentScenarioSimulator/InvestmentScenarioSimulatorCalculator";
import { getLatestCpiCategoryBreakdown } from "@/lib/data/cpiCategoryBreakdown";
import { getLiveAssetData } from "@/lib/decisionSupportLab/liveAssetData";
import { SITE_URL, SITE_NAME } from "@/lib/seoConfig";

const PAGE_URL = `${SITE_URL}/decision-support-lab/investment-scenario-simulator`;
const TITLE = "Investment Scenario Simulator | PEIC Decision Support Lab";
const DESCRIPTION = "Test your portfolio against higher inflation, a market crash, interest rate increases and currency depreciation.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export const revalidate = 3600;

export default async function InvestmentScenarioSimulatorPage() {
  const [breakdown, liveData] = await Promise.all([getLatestCpiCategoryBreakdown(), getLiveAssetData()]);

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <main className="min-w-0 flex-1 px-6 py-8 sm:px-10 lg:px-16">
        <div className="flex flex-col gap-10">
          <ToolBreadcrumb toolId="investment-scenario-simulator" />

          <InvestmentScenarioSimulatorHero />

          <InvestmentScenarioSimulatorCalculator breakdown={breakdown} liveData={liveData} />
        </div>
      </main>
    </div>
  );
}
