import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";
import ToolBreadcrumb from "@/components/decisionSupportLab/ToolBreadcrumb";
import FormulaExplorerHero from "@/components/formulaExplorer/FormulaExplorerHero";
import FormulaExplorerContent from "@/components/formulaExplorer/FormulaExplorerContent";
import { SITE_URL, SITE_NAME } from "@/lib/seoConfig";

const PAGE_URL = `${SITE_URL}/decision-support-lab/formula-explorer`;
const TITLE = "Financial Formula Explorer — Time Value of Money Reference | PEIC Decision Support Lab";
const DESCRIPTION = "Every formula behind the Time Value of Money tools — variables, economic interpretation, assumptions, limitations, and a live worked example for each.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export const revalidate = 3600;

export default function FormulaExplorerPage() {
  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <main className="min-w-0 flex-1 px-6 py-8 sm:px-10 lg:px-16">
        <div className="flex flex-col gap-10">
          <ToolBreadcrumb toolId="formula-explorer" />

          <FormulaExplorerHero />

          <FormulaExplorerContent />
        </div>
      </main>
    </div>
  );
}
