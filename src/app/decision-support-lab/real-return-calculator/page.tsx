import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";
import ToolBreadcrumb from "@/components/decisionSupportLab/ToolBreadcrumb";
import RealReturnCalculatorHero from "@/components/realReturnCalculator/RealReturnCalculatorHero";
import RealReturnCalculatorCalculator from "@/components/realReturnCalculator/RealReturnCalculatorCalculator";
import { getLatestCpiCategoryBreakdown } from "@/lib/data/cpiCategoryBreakdown";
import { getCpiMonthlyIndexSeries } from "@/lib/data/cpiMonthlyIndex";
import { SITE_URL, SITE_NAME } from "@/lib/seoConfig";

const PAGE_URL = `${SITE_URL}/decision-support-lab/real-return-calculator`;
const TITLE = "Real Return Calculator — What Did You Actually Earn? | PEIC Decision Support Lab";
const DESCRIPTION = "See what your investment actually earned after inflation, not just the nominal return your statement shows.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export const revalidate = 3600;

export default async function RealReturnCalculatorPage() {
  const [breakdown, cpiSeries] = await Promise.all([getLatestCpiCategoryBreakdown(), getCpiMonthlyIndexSeries()]);

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <main className="min-w-0 flex-1 px-6 py-8 sm:px-10 lg:px-16">
        <div className="flex flex-col gap-10">
          <ToolBreadcrumb toolId="real-return-calculator" />

          <RealReturnCalculatorHero />

          <RealReturnCalculatorCalculator breakdown={breakdown} cpiSeries={cpiSeries} />
        </div>
      </main>
    </div>
  );
}
