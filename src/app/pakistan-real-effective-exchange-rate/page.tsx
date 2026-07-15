import type { Metadata } from "next";
import { getSbpIndicator } from "@/lib/data/sbpServer";
import SeoPageLayout from "@/components/seo/SeoPageLayout";
import { SITE_URL, SITE_NAME, getRelatedLinks } from "@/lib/seoConfig";

const SLUG = "pakistan-real-effective-exchange-rate";
const PAGE_URL = `${SITE_URL}/${SLUG}`;
const TITLE = "Pakistan Real Effective Exchange Rate (REER) — Live Index & Trend";
const DESCRIPTION =
  "Pakistan's Real Effective Exchange Rate (REER) index — the inflation-adjusted measure of the Rupee's competitiveness against its trading partners — live, with a 24-month trend and an explanation of why it matters.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default async function ReerPage() {
  const reer = await getSbpIndicator("reer");

  return (
    <SeoPageLayout
      canonicalPath={`/${SLUG}`}
      title="Pakistan Real Effective Exchange Rate (REER)"
      subtitle="An index measuring the Rupee's value against a trade-weighted basket of trading-partner currencies, adjusted for relative inflation — the standard gauge of whether the Rupee is overvalued or undervalued."
      kpiLabel="REER Index (Base 2010 = 100)"
      kpiValue={reer.kpi.value}
      kpiChange={reer.kpi.change}
      kpiTrend={reer.kpi.trend}
      kpiQuality={reer.kpi}
      chartTitle="REER Index — 24-Month Trend"
      chartData={reer.trend}
      chartColor="#38bdf8"
      chartUnit=""
      chartGradientId="seoReerGradient"
      chartCaption="Source: SBP EasyData, monthly, Real Effective Exchange Rate index, base year 2010 = 100."
      explanation={[
        "The Real Effective Exchange Rate (REER) adjusts Pakistan's nominal exchange rate against a basket of trading-partner currencies for differences in relative inflation rates, producing a single index number that reflects the Rupee's actual purchasing-power competitiveness — not just its face-value exchange rate.",
        "The index is set to 100 in a chosen base year (2010, in SBP's series). A reading above 100 generally indicates the Rupee is overvalued in real terms relative to that base period — Pakistani exports are comparatively more expensive and imports comparatively cheaper than the base year's equilibrium would suggest. A reading below 100 indicates the opposite.",
        "Because REER factors in inflation differentials, a country with persistently higher inflation than its trading partners can see its REER rise (indicating growing overvaluation) even while its nominal exchange rate stays flat or depreciates only modestly — nominal depreciation alone doesn't guarantee competitiveness is preserved.",
      ]}
      whyItMatters={[
        "The IMF and SBP both monitor REER as a key signal of currency misalignment — a persistently overvalued REER has historically preceded balance-of-payments pressure in Pakistan, as an uncompetitive Rupee discourages exports and encourages imports, widening the trade deficit.",
        "REER is one of the analytical anchors used to judge whether a given nominal USD/PKR rate reflects genuine market value or whether further currency adjustment may be needed to restore external competitiveness — a recurring theme in Pakistan's IMF program discussions.",
      ]}
      faq={[
        {
          question: "What is Pakistan's current REER index level?",
          answer: `Pakistan's Real Effective Exchange Rate index currently stands at ${reer.kpi.value} (base year 2010 = 100), according to SBP EasyData.`,
        },
        {
          question: "What does a REER above 100 mean?",
          answer: "A REER reading above 100 generally signals the Rupee is overvalued in real, inflation-adjusted terms relative to the 2010 base period — meaning Pakistani goods are comparatively more expensive for foreign buyers than the base year's equilibrium would suggest, which can weigh on export competitiveness.",
        },
        {
          question: "How is REER different from the USD/PKR exchange rate?",
          answer: "USD/PKR is a single nominal bilateral rate against the US Dollar. REER is a broader, trade-weighted index against multiple trading-partner currencies, adjusted for relative inflation — a more complete measure of the Rupee's real purchasing-power competitiveness than any single bilateral rate can show.",
        },
        {
          question: "Why does the IMF pay attention to Pakistan's REER?",
          answer: "REER is a standard tool for assessing currency misalignment. A persistently overvalued REER is treated as a warning sign of building external-sector pressure, since it can discourage exports and encourage imports — feeding the same current account and reserve pressures Pakistan has repeatedly faced.",
        },
      ]}
      relatedLinks={getRelatedLinks(SLUG)}
    />
  );
}
