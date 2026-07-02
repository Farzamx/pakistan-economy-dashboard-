import type { Metadata } from "next";
import { getSbpIndicator } from "@/lib/data/sbpServer";
import SeoPageLayout from "@/components/seo/SeoPageLayout";
import { SITE_URL, SITE_NAME, relatedSeoLinks } from "@/lib/seoConfig";

const SLUG = "pakistan-remittances";
const PAGE_URL = `${SITE_URL}/${SLUG}`;
const TITLE = "Pakistan Remittances — Live Data & Analysis";
const DESCRIPTION =
  "Pakistan's monthly workers' remittance inflows, the 24-month trend chart, and a plain-English explanation of why remittances matter for the Rupee and the economy.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default async function RemittancesPage() {
  const remittances = await getSbpIndicator("remittances");

  return (
    <SeoPageLayout
      canonicalPath={`/${SLUG}`}
      title="Pakistan Remittances"
      subtitle="Money sent home by overseas Pakistani workers — one of the largest, steadiest sources of foreign currency for the economy."
      kpiLabel="Workers' Remittances (Monthly)"
      kpiValue={`$${remittances.kpi.value}B`}
      kpiSourceNote={`Source: ${remittances.kpi.source ?? "State Bank of Pakistan"}${remittances.kpi.latestDate ? ` · ${remittances.kpi.latestDate}` : ""}`}
      kpiQuality={remittances.kpi}
      chartTitle="Remittances — 24-Month Trend"
      chartData={remittances.trend}
      chartColor="#34d399"
      chartUnit="B"
      chartGradientId="seoRemittancesGradient"
      chartCaption="Source: SBP EasyData, monthly, workers' remittance inflows (Balance of Payments)."
      explanation={[
        "Remittances are funds sent home by Pakistanis working abroad — mainly in Saudi Arabia, the UAE, the UK, and the US — to family members in Pakistan.",
        "These inflows arrive through official banking channels and are recorded by the State Bank of Pakistan as part of the current account's secondary income.",
        "Remittances are typically Pakistan's single largest source of foreign currency inflow, often exceeding export earnings in some months, and a key offset to the country's persistent goods trade deficit.",
      ]}
      whyItMatters={[
        "Remittances directly support household consumption for millions of families and are a major, relatively stable source of US Dollar supply that helps fund Pakistan's import bill and ease pressure on the Rupee.",
        "A sustained drop in remittance inflows — from a slowdown in Gulf labor markets, a stronger informal ('hundi/hawala') channel, or exchange rate distortions pushing flows out of official channels — has historically been an early warning sign for external-sector stress.",
      ]}
      faq={[
        {
          question: "How much money does Pakistan receive in remittances?",
          answer: `Pakistan's most recent monthly workers' remittance inflow was $${remittances.kpi.value} billion, according to SBP EasyData.`,
        },
        {
          question: "Which countries send the most remittances to Pakistan?",
          answer: "Saudi Arabia and the United Arab Emirates are historically the largest sources, followed by the United Kingdom and the United States — reflecting the size of Pakistan's overseas labor force in the Gulf.",
        },
        {
          question: "Why do remittances matter for the Pakistani Rupee?",
          answer: "Remittances are a major source of US Dollar supply into Pakistan's banking system, helping finance the country's trade deficit and easing depreciation pressure on the Rupee — without them, the deficit would have to be financed entirely through debt or reserve drawdowns.",
        },
        {
          question: "Are remittances counted in Pakistan's GDP?",
          answer: "Remittances are not counted in GDP (which measures domestic production), but they are a major contributor to Gross National Income (GNI) and household consumption, and they directly affect the current account balance.",
        },
      ]}
      relatedLinks={relatedSeoLinks(SLUG, [
        "current-account-deficit-pakistan",
        "usd-pkr-exchange-rate",
        "foreign-exchange-reserves-pakistan",
      ])}
    />
  );
}
