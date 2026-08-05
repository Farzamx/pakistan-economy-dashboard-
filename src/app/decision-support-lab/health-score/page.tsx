import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";
import ToolBreadcrumb from "@/components/decisionSupportLab/ToolBreadcrumb";
import HealthScoreHero from "@/components/healthScore/HealthScoreHero";
import HealthScoreCalculator from "@/components/healthScore/HealthScoreCalculator";
import { getLatestCpiCategoryBreakdown } from "@/lib/data/cpiCategoryBreakdown";
import { getCpiMonthlyIndexSeries } from "@/lib/data/cpiMonthlyIndex";
import { SITE_URL, SITE_NAME } from "@/lib/seoConfig";

const PAGE_URL = `${SITE_URL}/decision-support-lab/health-score`;
const TITLE = "Personal Economic Health Score | PEIC Decision Support Lab";
const DESCRIPTION = "One composite score across your inflation exposure, budget balance, salary growth and savings — built from the Decision Support Lab tools you've already used.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export const revalidate = 3600;

export default async function HealthScorePage() {
  const [breakdown, series] = await Promise.all([getLatestCpiCategoryBreakdown(), getCpiMonthlyIndexSeries()]);

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <main className="min-w-0 flex-1 px-6 py-8 sm:px-10 lg:px-16">
        <div className="flex flex-col gap-10">
          <ToolBreadcrumb toolId="health-score" />

          <HealthScoreHero />

          <HealthScoreCalculator breakdown={breakdown} series={series} />
        </div>
      </main>
    </div>
  );
}
