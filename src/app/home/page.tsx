import type { Metadata } from "next";
import LandingPage from "@/components/marketing/LandingPage";
import { SITE_URL, SITE_NAME } from "@/lib/seoConfig";

// /home renders the identical landing page as "/" — the one URL that never
// redirects a returning visitor away (see the returning-visitor routing in
// src/proxy.ts, which only ever redirects "/" itself). Canonical points
// back to SITE_URL ("/") so the two URLs don't compete for the same content
// in search results; "/" stays the indexed, authoritative address.
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

// Phase 8.13B: same explicit ISR window as "/" (see that file's comment for
// the full rationale) — required here too because Next.js route-segment
// config is per-route, not inherited from the shared <LandingPage/> component
// the two routes render. Without this, "/" refreshing would not imply "/home"
// does; both must declare it independently for the fix to cover both URLs.
export const revalidate = 900;

export default function HomePage() {
  return <LandingPage />;
}
