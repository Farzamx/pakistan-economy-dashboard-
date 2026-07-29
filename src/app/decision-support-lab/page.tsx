import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";
import DecisionSupportHero from "@/components/decisionSupportLab/DecisionSupportHero";
import EconomicIdentityPanel from "@/components/decisionSupportLab/EconomicIdentityPanel";
import ToolGrid from "@/components/decisionSupportLab/ToolGrid";
import { SITE_URL, SITE_NAME } from "@/lib/seoConfig";

const PAGE_URL = `${SITE_URL}/decision-support-lab`;
const TITLE = "Decision Support Lab — Personal Finance Tools Powered by Official Data | PEIC";
const DESCRIPTION =
  "Understand how inflation, interest rates and economic conditions affect your personal finances through interactive decision-support tools powered by official PBS/SBP data.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

// Same ISR cadence as the rest of the Lab's static shell — the tool
// registry and landing copy change on a release cadence, not per-request.
export const revalidate = 3600;

export default function DecisionSupportLabPage() {
  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <main className="min-w-0 flex-1 px-6 py-8 sm:px-10 lg:px-16">
        <div className="flex flex-col gap-10">
          <DecisionSupportHero />
          <EconomicIdentityPanel />
          <ToolGrid />
        </div>
      </main>
    </div>
  );
}
