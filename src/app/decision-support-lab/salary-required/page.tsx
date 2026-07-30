import type { Metadata } from "next";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { T } from "@/components/T";
import SalaryRequiredHero from "@/components/salaryRequired/SalaryRequiredHero";
import SalaryRequiredCalculator from "@/components/salaryRequired/SalaryRequiredCalculator";
import { getLatestCpiCategoryBreakdown } from "@/lib/data/cpiCategoryBreakdown";
import { SITE_URL, SITE_NAME } from "@/lib/seoConfig";

const PAGE_URL = `${SITE_URL}/decision-support-lab/salary-required`;
const TITLE = "Salary Required Calculator — What Do You Need Next Year? | PEIC Decision Support Lab";
const DESCRIPTION = "See what salary you'd need next year to maintain your current lifestyle, using your personal inflation rate when available.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export const revalidate = 3600;

export default async function SalaryRequiredPage() {
  const breakdown = await getLatestCpiCategoryBreakdown();

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <main className="min-w-0 flex-1 px-6 py-8 sm:px-10 lg:px-16">
        <div className="flex flex-col gap-10">
          <Link href="/decision-support-lab" className="w-fit text-xs font-medium text-white/40 hover:text-neon-blue light:text-slate-400">
            ← <T tKey="decisionSupportLab.title" />
          </Link>

          <SalaryRequiredHero />

          <SalaryRequiredCalculator breakdown={breakdown} />
        </div>
      </main>
    </div>
  );
}
