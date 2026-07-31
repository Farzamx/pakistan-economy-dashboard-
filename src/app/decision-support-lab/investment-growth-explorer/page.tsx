import type { Metadata } from "next";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { T } from "@/components/T";
import InvestmentGrowthExplorerHero from "@/components/investmentGrowthExplorer/InvestmentGrowthExplorerHero";
import InvestmentGrowthExplorerCalculator from "@/components/investmentGrowthExplorer/InvestmentGrowthExplorerCalculator";
import { getLatestCpiCategoryBreakdown } from "@/lib/data/cpiCategoryBreakdown";
import { SITE_URL, SITE_NAME } from "@/lib/seoConfig";

const PAGE_URL = `${SITE_URL}/decision-support-lab/investment-growth-explorer`;
const TITLE = "Investment Growth Explorer | PEIC Decision Support Lab";
const DESCRIPTION = "Compare how multiple investments grow over time, both nominal and inflation-adjusted, on one interactive timeline.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export const revalidate = 3600;

export default async function InvestmentGrowthExplorerPage() {
  const breakdown = await getLatestCpiCategoryBreakdown();

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <main className="min-w-0 flex-1 px-6 py-8 sm:px-10 lg:px-16">
        <div className="flex flex-col gap-10">
          <Link href="/decision-support-lab" className="w-fit text-xs font-medium text-white/40 hover:text-neon-blue light:text-slate-400">
            ← <T tKey="decisionSupportLab.title" />
          </Link>

          <InvestmentGrowthExplorerHero />

          <InvestmentGrowthExplorerCalculator breakdown={breakdown} />
        </div>
      </main>
    </div>
  );
}
