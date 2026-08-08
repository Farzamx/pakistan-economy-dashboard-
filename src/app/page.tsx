import type { Metadata } from "next";
import LandingPage from "@/components/marketing/LandingPage";
import { SITE_URL, SITE_NAME } from "@/lib/seoConfig";

// Leads with "PEIC —" so the abbreviation survives tab truncation even when
// the rest of the title (starting with the long SITE_NAME) gets cut off.
const TITLE = `PEIC — ${SITE_NAME} | Pakistan's Economy, In Numbers You Can Act On`;
const DESCRIPTION =
  "Inflation, reserves, the rupee, PSX and federal and provincial budgets — tracked from source data, with the analysis that comes after it. Free to use.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: SITE_URL },
  openGraph: { title: SITE_NAME, description: DESCRIPTION, url: SITE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: SITE_NAME, description: DESCRIPTION },
};

export default function MarketingLandingPage() {
  return <LandingPage />;
}
