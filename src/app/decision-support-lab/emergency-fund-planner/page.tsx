import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";
import ToolBreadcrumb from "@/components/decisionSupportLab/ToolBreadcrumb";
import EmergencyFundPlannerHero from "@/components/emergencyFundPlanner/EmergencyFundPlannerHero";
import EmergencyFundPlannerCalculator from "@/components/emergencyFundPlanner/EmergencyFundPlannerCalculator";
import { getLatestCpiCategoryBreakdown } from "@/lib/data/cpiCategoryBreakdown";
import { SITE_URL, SITE_NAME } from "@/lib/seoConfig";

const PAGE_URL = `${SITE_URL}/decision-support-lab/emergency-fund-planner`;
const TITLE = "Emergency Fund Planner | PEIC Decision Support Lab";
const DESCRIPTION = "Plan an inflation-adjusted emergency fund with funding-gap analysis, Monte Carlo probability of success, sensitivity analysis, and scenario comparison.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export const revalidate = 3600;

export default async function EmergencyFundPlannerPage() {
  const breakdown = await getLatestCpiCategoryBreakdown();

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <main className="min-w-0 flex-1 px-6 py-8 sm:px-10 lg:px-16">
        <div className="flex flex-col gap-10">
          <ToolBreadcrumb toolId="emergency-fund-planner" />

          <EmergencyFundPlannerHero />

          <EmergencyFundPlannerCalculator breakdown={breakdown} />
        </div>
      </main>
    </div>
  );
}
