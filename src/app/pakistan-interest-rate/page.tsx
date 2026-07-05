import type { Metadata } from "next";
import { getSbpIndicator } from "@/lib/data/sbpServer";
import SeoPageLayout from "@/components/seo/SeoPageLayout";
import { SITE_URL, SITE_NAME, getRelatedLinks } from "@/lib/seoConfig";

const SLUG = "pakistan-interest-rate";
const PAGE_URL = `${SITE_URL}/${SLUG}`;
const TITLE = "Pakistan Interest Rate (SBP Policy Rate) — Live Data";
const DESCRIPTION =
  "The State Bank of Pakistan's current policy interest rate, historical trend, and a plain-English explanation of how it affects loans, savings, and the economy.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default async function InterestRatePage() {
  const policyRate = await getSbpIndicator("policyRate");

  return (
    <SeoPageLayout
      canonicalPath={`/${SLUG}`}
      title="Pakistan Interest Rate"
      subtitle="The State Bank of Pakistan's (SBP) policy interest rate — the benchmark that all bank lending and deposit rates in Pakistan follow."
      kpiLabel="SBP Policy Rate"
      kpiValue={`${policyRate.kpi.value}%`}
      kpiSourceNote={`Source: ${policyRate.kpi.source ?? "State Bank of Pakistan"}${policyRate.kpi.latestDate ? ` · ${policyRate.kpi.latestDate}` : ""}`}
      kpiQuality={policyRate.kpi}
      chartTitle="SBP Policy Rate — Recent Trend"
      chartData={policyRate.trend}
      chartColor="#fbbf24"
      chartUnit="%"
      chartGradientId="seoPolicyRateGradient"
      chartCaption="Source: SBP EasyData — updated as-needed, following each Monetary Policy Committee decision."
      explanation={[
        "Pakistan's interest rate is set by the State Bank of Pakistan's (SBP) Monetary Policy Committee, which meets roughly every two months to decide whether to raise, cut, or hold the policy rate.",
        "The policy rate is the benchmark for all lending and deposit rates in Pakistan — from KIBOR (the interbank lending rate) to mortgage rates and savings account returns.",
        "SBP raises rates to fight inflation (making borrowing more expensive cools spending) and cuts rates to stimulate growth when inflation is under control.",
      ]}
      whyItMatters={[
        "The interest rate directly affects how much it costs Pakistani businesses and households to borrow money, and how much savers earn on deposits — it ripples through nearly every part of the economy.",
        "Higher rates can also help defend the Rupee by attracting foreign capital seeking better returns, which is why SBP often raises rates during periods of currency pressure, even if growth suffers in the short term.",
      ]}
      faq={[
        {
          question: "What is Pakistan's current interest rate?",
          answer: `The State Bank of Pakistan's current policy interest rate is ${policyRate.kpi.value}%. This page updates automatically whenever SBP's Monetary Policy Committee announces a new decision.`,
        },
        {
          question: "How often does SBP change the interest rate?",
          answer: "SBP's Monetary Policy Committee meets on a pre-announced schedule roughly every two months to review and potentially adjust the policy rate, though it can also call emergency meetings during periods of economic stress.",
        },
        {
          question: "What is KIBOR and how does it relate to the policy rate?",
          answer: "KIBOR (Karachi Interbank Offered Rate) is the rate at which banks lend to each other, and it normally trades very close to the SBP policy rate. Most variable-rate bank loans in Pakistan are priced as KIBOR plus a spread.",
        },
        {
          question: "What was Pakistan's highest-ever interest rate?",
          answer: "Pakistan's policy rate peaked at 22% in 2023 during a severe inflation and balance-of-payments crisis, one of the highest levels in the country's history.",
        },
      ]}
      relatedLinks={getRelatedLinks(SLUG)}
    />
  );
}
