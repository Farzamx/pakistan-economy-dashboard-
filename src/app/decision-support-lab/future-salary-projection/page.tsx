import type { Metadata } from "next";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { T } from "@/components/T";
import FutureSalaryProjectionHero from "@/components/futureSalaryProjection/FutureSalaryProjectionHero";
import FutureSalaryProjectionCalculator from "@/components/futureSalaryProjection/FutureSalaryProjectionCalculator";
import { getLatestCpiCategoryBreakdown } from "@/lib/data/cpiCategoryBreakdown";
import { SITE_URL, SITE_NAME } from "@/lib/seoConfig";

const PAGE_URL = `${SITE_URL}/decision-support-lab/future-salary-projection`;
const TITLE = "Future Salary Projection Calculator | PEIC Decision Support Lab";
const DESCRIPTION = "Project your nominal and real salary forward against your expected raises and inflation, using official PBS inflation data.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export const revalidate = 3600;

export default async function FutureSalaryProjectionPage() {
  const breakdown = await getLatestCpiCategoryBreakdown();

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <main className="min-w-0 flex-1 px-6 py-8 sm:px-10 lg:px-16">
        <div className="flex flex-col gap-10">
          <Link href="/decision-support-lab" className="w-fit text-xs font-medium text-white/40 hover:text-neon-blue light:text-slate-400">
            ← <T tKey="decisionSupportLab.title" />
          </Link>

          <FutureSalaryProjectionHero />

          <FutureSalaryProjectionCalculator breakdown={breakdown} />
        </div>
      </main>
    </div>
  );
}
