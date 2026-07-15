import type { Metadata } from "next";
import { getSbpIndicator } from "@/lib/data/sbpServer";
import SeoPageLayout from "@/components/seo/SeoPageLayout";
import { SITE_URL, SITE_NAME, getRelatedLinks } from "@/lib/seoConfig";

const SLUG = "pakistan-bank-reserves";
const PAGE_URL = `${SITE_URL}/${SLUG}`;
const TITLE = "Pakistan Commercial Bank FX Reserves — Live Data & Trend";
const DESCRIPTION =
  "Foreign exchange reserves held by Pakistan's commercial banks — separate from the State Bank's own reserves — live, with a 24-month trend and an explanation of how the two together make up total national reserves.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default async function BankReservesPage() {
  const bankReserves = await getSbpIndicator("netBankReserves");

  return (
    <SeoPageLayout
      canonicalPath={`/${SLUG}`}
      title="Pakistan Commercial Bank Reserves"
      subtitle="Net foreign exchange reserves held by Pakistan's commercial banks — the second of the two components (alongside the State Bank's own reserves) that make up the country's total liquid FX reserves."
      kpiLabel="Net Reserves with Banks"
      kpiValue={`$${bankReserves.kpi.value}B`}
      kpiChange={bankReserves.kpi.change}
      kpiTrend={bankReserves.kpi.trend}
      kpiQuality={bankReserves.kpi}
      chartTitle="Bank Reserves — 24-Month Trend"
      chartData={bankReserves.trend}
      chartColor="#a855f7"
      chartUnit="B"
      chartGradientId="seoBankReservesGradient"
      chartCaption="Source: SBP EasyData, monthly, net foreign exchange reserves held with commercial banks."
      explanation={[
        "Pakistan's total liquid foreign exchange reserves are reported in two parts: reserves held directly by the State Bank of Pakistan (SBP), and reserves held by the country's commercial banks on their own books. This page covers the second, smaller component.",
        "Commercial bank reserves are typically held to meet the banks' own foreign currency obligations — trade financing, foreign currency deposit withdrawals, and interbank settlement — rather than as a national policy buffer the way SBP's own reserves are.",
        "Combined, SBP reserves and bank reserves make up Pakistan's total liquid reserves figure, the number most commonly cited (and watched by the IMF) when assessing import cover and external buffer strength.",
      ]}
      whyItMatters={[
        "Commercial bank reserves matter for the health and stability of the banking sector's own foreign currency operations — a shortfall here can strain banks' ability to process trade payments or meet foreign currency deposit demand, independent of what SBP itself holds.",
        "Because this figure is smaller and more volatile than SBP's own reserves, tracking it separately gives a clearer read on where reserve pressure (or relief) is actually concentrated within the financial system.",
      ]}
      faq={[
        {
          question: "How much in foreign reserves do Pakistan's commercial banks hold?",
          answer: `Pakistan's commercial banks currently hold $${bankReserves.kpi.value} billion in net foreign exchange reserves, according to SBP EasyData.`,
        },
        {
          question: "What's the difference between bank reserves and SBP's foreign reserves?",
          answer: "SBP's own reserves are the central bank's national policy buffer, used to defend the currency and cover imports at a sovereign level. Bank reserves are held directly by commercial banks for their own operational foreign currency needs — trade financing and deposit obligations. Total liquid reserves combine both.",
        },
        {
          question: "Why does Pakistan report bank reserves separately from SBP reserves?",
          answer: "Separating the two gives a clearer picture of where reserve strength or stress actually sits — within the central bank's policy buffer, or within the commercial banking system's own foreign currency liquidity.",
        },
      ]}
      relatedLinks={getRelatedLinks(SLUG)}
    />
  );
}
