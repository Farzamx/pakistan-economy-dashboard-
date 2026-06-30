import type { Metadata } from "next";
import { getSbpIndicator } from "@/lib/data/sbp";
import SeoPageLayout from "@/components/seo/SeoPageLayout";
import { SITE_URL, SITE_NAME, relatedSeoLinks } from "@/lib/seoConfig";

const SLUG = "fdi-in-pakistan";
const PAGE_URL = `${SITE_URL}/${SLUG}`;
const TITLE = "FDI in Pakistan — Foreign Direct Investment Live Data";
const DESCRIPTION =
  "Pakistan's monthly net foreign direct investment (FDI) inflows, the 24-month trend chart, and a plain-English explanation of why FDI matters for the economy.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default async function FdiPage() {
  const fdi = await getSbpIndicator("fdiInflows");

  return (
    <SeoPageLayout
      canonicalPath={`/${SLUG}`}
      title="FDI in Pakistan"
      subtitle="Net foreign direct investment flowing into Pakistan — money invested by foreign companies in local businesses, factories, and infrastructure."
      kpiLabel="Net FDI Inflows (Monthly)"
      kpiValue={`$${fdi.kpi.value}M`}
      kpiSourceNote={`Source: ${fdi.kpi.source ?? "State Bank of Pakistan"}${fdi.kpi.latestDate ? ` · ${fdi.kpi.latestDate}` : ""}`}
      kpiQuality={fdi.kpi}
      chartTitle="Net FDI Inflows — 24-Month Trend"
      chartData={fdi.trend}
      chartColor="#38bdf8"
      chartUnit="M"
      chartGradientId="seoFdiGradient"
      chartCaption="Source: SBP EasyData, monthly, net foreign direct investment in Pakistan."
      explanation={[
        "Foreign Direct Investment (FDI) is money foreign companies and investors put directly into Pakistani businesses — building factories, buying significant equity stakes, or expanding operations — as opposed to short-term portfolio investment in stocks and bonds.",
        "Pakistan's FDI has historically been concentrated in a handful of sectors: power generation, oil and gas exploration, telecommunications, and financial services, with China historically among the largest single sources in recent years.",
        "Unlike debt, FDI doesn't have to be repaid with interest, which makes it a comparatively 'cheaper' and more stable way to finance the current account deficit than external borrowing.",
      ]}
      whyItMatters={[
        "FDI inflows bring in foreign currency without creating new debt obligations, helping finance Pakistan's chronic current account deficit and supporting the Rupee.",
        "Pakistan's FDI levels relative to GDP have historically lagged regional peers like Bangladesh and Vietnam, often cited as a symptom of policy inconsistency, security concerns, and a difficult business environment — sustained low FDI limits the technology transfer and job creation foreign investment typically brings.",
      ]}
      faq={[
        {
          question: "How much FDI does Pakistan currently receive?",
          answer: `Pakistan's most recent monthly net FDI inflow was $${fdi.kpi.value} million, according to SBP EasyData.`,
        },
        {
          question: "Which countries invest the most in Pakistan?",
          answer: "China has been among the largest sources of FDI into Pakistan in recent years, largely tied to CPEC-related energy and infrastructure projects, alongside investment from the Gulf states, the US, and the UK.",
        },
        {
          question: "Which sectors attract the most FDI in Pakistan?",
          answer: "Power generation, oil and gas exploration, financial services, and telecommunications have historically attracted the largest shares of FDI into Pakistan.",
        },
        {
          question: "Why is Pakistan's FDI relatively low compared to other countries?",
          answer: "Pakistan's FDI as a share of GDP has lagged regional peers, commonly attributed to policy inconsistency, security perceptions, energy shortages, and a challenging ease-of-doing-business environment relative to competitors like Bangladesh and Vietnam.",
        },
      ]}
      relatedLinks={relatedSeoLinks(SLUG, [
        "pakistan-trade-deficit",
        "current-account-deficit-pakistan",
        "pakistan-economic-indicators",
      ])}
    />
  );
}
