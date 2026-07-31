import type { Metadata } from "next";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { T } from "@/components/T";
import AssetComparisonLabHero from "@/components/assetComparisonLab/AssetComparisonLabHero";
import AssetComparisonLabCalculator from "@/components/assetComparisonLab/AssetComparisonLabCalculator";
import { getLatestCpiCategoryBreakdown } from "@/lib/data/cpiCategoryBreakdown";
import { getLiveAssetData } from "@/lib/decisionSupportLab/liveAssetData";
import { SITE_URL, SITE_NAME } from "@/lib/seoConfig";

const PAGE_URL = `${SITE_URL}/decision-support-lab/asset-comparison-lab`;
const TITLE = "Asset Comparison Lab — Nominal vs. Real Return | PEIC Decision Support Lab";
const DESCRIPTION = "Compare gold, USD, savings, treasury bills, PIBs, PSX and more on nominal return, real return and risk — ranked by what actually preserved your purchasing power.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export const revalidate = 3600;

export default async function AssetComparisonLabPage() {
  const [breakdown, liveData] = await Promise.all([getLatestCpiCategoryBreakdown(), getLiveAssetData()]);

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <main className="min-w-0 flex-1 px-6 py-8 sm:px-10 lg:px-16">
        <div className="flex flex-col gap-10">
          <Link href="/decision-support-lab" className="w-fit text-xs font-medium text-white/40 hover:text-neon-blue light:text-slate-400">
            ← <T tKey="decisionSupportLab.title" />
          </Link>

          <AssetComparisonLabHero />

          <AssetComparisonLabCalculator breakdown={breakdown} liveData={liveData} />
        </div>
      </main>
    </div>
  );
}
