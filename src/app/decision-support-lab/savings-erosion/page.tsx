import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";
import ToolBreadcrumb from "@/components/decisionSupportLab/ToolBreadcrumb";
import SavingsErosionHero from "@/components/savingsErosion/SavingsErosionHero";
import SavingsErosionCalculator from "@/components/savingsErosion/SavingsErosionCalculator";
import { getLatestCpiCategoryBreakdown } from "@/lib/data/cpiCategoryBreakdown";
import { SITE_URL, SITE_NAME } from "@/lib/seoConfig";

const PAGE_URL = `${SITE_URL}/decision-support-lab/savings-erosion`;
const TITLE = "Savings Inflation Erosion Calculator | PEIC Decision Support Lab";
const DESCRIPTION = "See how inflation erodes the real value of idle savings over time, using official PBS inflation data.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export const revalidate = 3600;

export default async function SavingsErosionPage() {
  const breakdown = await getLatestCpiCategoryBreakdown();

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <main className="min-w-0 flex-1 px-6 py-8 sm:px-10 lg:px-16">
        <div className="flex flex-col gap-10">
          <ToolBreadcrumb toolId="savings-erosion" />

          <SavingsErosionHero />

          <SavingsErosionCalculator breakdown={breakdown} />
        </div>
      </main>
    </div>
  );
}
