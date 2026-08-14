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

// Phase 8.13B: explicit ISR window, replacing what was previously an
// undeclared/frozen-at-build route (confirmed via `next build`'s own route
// table showing no Revalidate/Expire columns for "/" prior to this change —
// see Phase 8.13A). 900s (15 min) reuses src/lib/data/fxRates.ts's own
// already-justified L2_REVALIDATE_SECONDS constant verbatim — that file's
// header documents this as the measured real-world update cadence of the
// Yahoo Finance PKR cross-rate quotes LandingPage renders (toUsdPkrTapeCell),
// not a number invented for this route. Macro SBP data (remittances, CPI,
// policy rate — also rendered here) changes far slower than 15 minutes, so
// this window is a ceiling driven by the live-FX display, not by macro
// cadence; refreshing macro data more often than strictly necessary is
// harmless (sbp.ts's own 10-min in-memory L1 cache already absorbs repeat
// calls within this window). This value does not make USD/PKR "real-time" —
// it only bounds how often this page's Server Component re-renders; freshness
// within that window still depends on fxRates.ts's own L1/L2 cache state.
export const revalidate = 900;

export default function MarketingLandingPage() {
  return <LandingPage />;
}
