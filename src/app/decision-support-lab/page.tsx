import type { Metadata } from "next";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import DecisionSupportHero from "@/components/decisionSupportLab/DecisionSupportHero";
import DecisionSupportGuestBanner from "@/components/decisionSupportLab/DecisionSupportGuestBanner";
import EconomicIdentityGuestPrompt from "@/components/decisionSupportLab/EconomicIdentityGuestPrompt";
import EconomicDashboardGate from "@/components/decisionSupportLab/EconomicDashboardGate";
import ToolGrid from "@/components/decisionSupportLab/ToolGrid";
import { createClient } from "@/lib/supabase/server";
import { getLatestCpiCategoryBreakdown } from "@/lib/data/cpiCategoryBreakdown";
import { getLiveAssetData } from "@/lib/decisionSupportLab/liveAssetData";
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

// No `revalidate`/ISR export here (Phase 3): this page now reads the
// visitor's own session via createClient() -> cookies(), a Dynamic API
// that Next.js renders per-request regardless of any cache config — the
// landing page's content (locked vs. unlocked tool cards, the guest
// banner, Economic Identity vs. its guest prompt) genuinely differs per
// visitor, so it must not be served from a shared static cache.

export default async function DecisionSupportLabPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAuthenticated = Boolean(user);

  // Fetched here (once, server-side) and passed down rather than each
  // Dashboard mini-card re-fetching — same pattern every individual tool
  // page already uses for its own breakdown/liveData props.
  const [breakdown, liveData] = isAuthenticated ? await Promise.all([getLatestCpiCategoryBreakdown(), getLiveAssetData()]) : [null, null];

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <main className="min-w-0 flex-1 px-6 py-8 sm:px-10 lg:px-16">
        <div className="flex flex-col gap-10">
          <DecisionSupportHero />
          {isAuthenticated && (
            <Link href="/decision-support-lab/snapshot" className="w-fit text-xs font-medium text-white/50 underline decoration-dotted underline-offset-2 hover:text-neon-blue light:text-slate-500">
              View my snapshot →
            </Link>
          )}
          {!isAuthenticated && <DecisionSupportGuestBanner />}
          {isAuthenticated ? <EconomicDashboardGate breakdown={breakdown} liveData={liveData} /> : <EconomicIdentityGuestPrompt />}
          <ToolGrid isAuthenticated={isAuthenticated} />
        </div>
      </main>
    </div>
  );
}
