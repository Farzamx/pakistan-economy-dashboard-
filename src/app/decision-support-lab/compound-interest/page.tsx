import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";
import ToolBreadcrumb from "@/components/decisionSupportLab/ToolBreadcrumb";
import CompoundInterestHero from "@/components/compoundInterest/CompoundInterestHero";
import CompoundInterestCalculator from "@/components/compoundInterest/CompoundInterestCalculator";
import { SITE_URL, SITE_NAME } from "@/lib/seoConfig";

const PAGE_URL = `${SITE_URL}/decision-support-lab/compound-interest`;
const TITLE = "Compound Interest Calculator | PEIC Decision Support Lab";
const DESCRIPTION = "See how interest earned on interest accelerates your money's growth, across monthly, quarterly, semiannual, annual, daily or continuous compounding.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export const revalidate = 3600;

export default function CompoundInterestPage() {
  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <main className="min-w-0 flex-1 px-6 py-8 sm:px-10 lg:px-16">
        <div className="flex flex-col gap-10">
          <ToolBreadcrumb toolId="compound-interest" />

          <CompoundInterestHero />

          <CompoundInterestCalculator />
        </div>
      </main>
    </div>
  );
}
