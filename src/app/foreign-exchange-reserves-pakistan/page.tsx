import type { Metadata } from "next";
import { getSbpIndicator } from "@/lib/data/sbp";
import SeoPageLayout from "@/components/seo/SeoPageLayout";
import { SITE_URL, SITE_NAME, relatedSeoLinks } from "@/lib/seoConfig";

const SLUG = "foreign-exchange-reserves-pakistan";
const PAGE_URL = `${SITE_URL}/${SLUG}`;
const TITLE = "Pakistan Foreign Exchange Reserves — Live Data & Analysis";
const DESCRIPTION =
  "Pakistan's current SBP foreign exchange reserves, import cover, 24-month trend chart, and a plain-English explanation of why reserves matter.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default async function ForeignReservesPage() {
  const [sbpReserves, bankReserves] = await Promise.all([
    getSbpIndicator("foreignReserves"),
    getSbpIndicator("netBankReserves"),
  ]);

  const sbpB = parseFloat(sbpReserves.kpi.value);
  const bankB = parseFloat(bankReserves.kpi.value);
  const totalB = sbpB + bankB;

  return (
    <SeoPageLayout
      canonicalPath={`/${SLUG}`}
      title="Pakistan Foreign Exchange Reserves"
      subtitle="The hard currency (mainly US Dollars) held by the State Bank of Pakistan and commercial banks to pay for imports and foreign debt."
      kpiLabel="SBP Foreign Reserves"
      kpiValue={`$${sbpB.toFixed(1)}B`}
      kpiSourceNote={`Source: ${sbpReserves.kpi.source ?? "State Bank of Pakistan"}${sbpReserves.kpi.latestDate ? ` · ${sbpReserves.kpi.latestDate}` : ""}`}
      chartTitle="SBP Foreign Reserves — 24-Month Trend"
      chartData={sbpReserves.trend}
      chartColor="#38bdf8"
      chartUnit="B"
      chartGradientId="seoReservesGradient"
      chartCaption="Source: SBP EasyData, monthly. Shows SBP-held reserves only — excludes commercial bank holdings."
      secondaryStats={[
        { label: "Commercial Bank Reserves", value: `$${bankB.toFixed(1)}B` },
        { label: "Total Liquid Reserves", value: `$${totalB.toFixed(1)}B` },
      ]}
      explanation={[
        "Foreign exchange reserves are the foreign currency (mainly US Dollars) and gold a central bank holds to pay for imports, service foreign debt, and stabilize the currency during periods of stress.",
        "Pakistan's total liquid reserves combine SBP's own holdings with commercial bank foreign currency reserves. SBP's figure is the one most closely watched by the IMF and international markets.",
        "A common way to judge reserve adequacy is 'import cover' — how many months of imports the reserves can pay for. The IMF generally considers 3 months the minimum adequate level; Pakistan briefly fell below 1 month in early 2023.",
      ]}
      whyItMatters={[
        "Reserves are Pakistan's financial safety net. When they fall too low, the country struggles to pay for essential imports (like fuel) and service its foreign debt, often triggering a currency crisis and the need for IMF support.",
        "Reserve levels above $12 billion are generally viewed as comfortable; below $8 billion is considered vulnerable, and below $4 billion has historically signaled crisis territory for Pakistan.",
      ]}
      faq={[
        {
          question: "What are Pakistan's current foreign exchange reserves?",
          answer: `Pakistan's SBP-held foreign reserves currently stand at approximately $${sbpB.toFixed(1)} billion, with total liquid reserves (including commercial banks) at approximately $${totalB.toFixed(1)} billion.`,
        },
        {
          question: "What is import cover and why does it matter?",
          answer: "Import cover measures how many months of imports a country's reserves can pay for. The IMF's standard minimum is 3 months — Pakistan has at times fallen well below this during balance-of-payments crises.",
        },
        {
          question: "How does Pakistan build up its reserves?",
          answer: "Pakistan's reserves are supported by IMF disbursements, bilateral deposits from allies like Saudi Arabia, China, and the UAE, multilateral loans, and net export/remittance inflows.",
        },
        {
          question: "What happens when reserves run critically low?",
          answer: "Low reserves limit the central bank's ability to defend the currency and pay for essential imports, often forcing import restrictions, sharp currency depreciation, and an IMF program to secure bridge financing.",
        },
      ]}
      relatedLinks={relatedSeoLinks(SLUG, [
        "usd-pkr-exchange-rate",
        "current-account-deficit-pakistan",
        "pakistan-economic-indicators",
      ])}
    />
  );
}
