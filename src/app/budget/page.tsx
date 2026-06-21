import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";
import BudgetWorkspace from "@/components/budget/BudgetWorkspace";
import { BUDGET_HISTORICAL } from "@/data/budgetHistorical";
import { SITE_URL, SITE_NAME } from "@/lib/seoConfig";

const PAGE_URL = `${SITE_URL}/budget`;
const TITLE = "Budget Workshop — Pakistan Federal Budget, FY2010-11 to FY2026-27";
const DESCRIPTION =
  "Explore Pakistan's federal budget across 17 fiscal years — debt servicing, defence, PSDP, subsidies, provincial transfers, and the fiscal deficit, every figure sourced from the official Budget in Brief.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default function BudgetPage() {
  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <main className="flex-1 px-6 py-8 sm:px-10 lg:px-16">
        <BudgetWorkspace years={BUDGET_HISTORICAL.years} />
      </main>
    </div>
  );
}
