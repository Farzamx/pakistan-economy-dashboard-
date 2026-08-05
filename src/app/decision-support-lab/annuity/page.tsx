import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";
import ToolBreadcrumb from "@/components/decisionSupportLab/ToolBreadcrumb";
import AnnuityHero from "@/components/annuity/AnnuityHero";
import AnnuityCalculator from "@/components/annuity/AnnuityCalculator";
import { SITE_URL, SITE_NAME } from "@/lib/seoConfig";

const PAGE_URL = `${SITE_URL}/decision-support-lab/annuity`;
const TITLE = "Annuity Calculator | PEIC Decision Support Lab";
const DESCRIPTION = "Value a stream of equal payments — ordinary annuity or annuity due — or find the contribution needed to hit a target future value.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export const revalidate = 3600;

export default function AnnuityPage() {
  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <main className="min-w-0 flex-1 px-6 py-8 sm:px-10 lg:px-16">
        <div className="flex flex-col gap-10">
          <ToolBreadcrumb toolId="annuity" />

          <AnnuityHero />

          <AnnuityCalculator />
        </div>
      </main>
    </div>
  );
}
