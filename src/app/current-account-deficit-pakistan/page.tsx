import type { Metadata } from "next";
import { getSbpIndicator } from "@/lib/data/sbpServer";
import SeoPageLayout from "@/components/seo/SeoPageLayout";
import { SITE_URL, SITE_NAME, getRelatedLinks } from "@/lib/seoConfig";

const SLUG = "current-account-deficit-pakistan";
const PAGE_URL = `${SITE_URL}/${SLUG}`;
const TITLE = "Pakistan Current Account Deficit — Live Data & Analysis";
const DESCRIPTION =
  "Pakistan's current account balance, 24-month trend chart, and a plain-English explanation of what the current account deficit means for the economy.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default async function CurrentAccountPage() {
  const currentAccount = await getSbpIndicator("currentAccount");
  const isDeficit = parseFloat(currentAccount.kpi.value) < 0;

  return (
    <SeoPageLayout
      canonicalPath={`/${SLUG}`}
      title="Pakistan Current Account Deficit"
      subtitle="The gap between all money flowing into and out of Pakistan internationally — exports, imports, remittances, and transfers."
      kpiLabel={`Current Account (Monthly) — ${isDeficit ? "Deficit" : "Surplus"}`}
      kpiValue={`${currentAccount.kpi.value} ${currentAccount.kpi.unit}`}
      kpiSourceNote={`Source: ${currentAccount.kpi.source ?? "State Bank of Pakistan"}${currentAccount.kpi.latestDate ? ` · ${currentAccount.kpi.latestDate}` : ""}`}
      kpiQuality={currentAccount.kpi}
      chartTitle="Current Account — 24-Month Trend"
      chartData={currentAccount.trend}
      chartColor="#fb7185"
      chartUnit="B"
      chartGradientId="seoCurrentAccountGradient"
      chartCaption="Source: SBP EasyData, monthly, BPM6 methodology."
      explanation={[
        "The current account records Pakistan's transactions with the rest of the world — combining the trade balance (exports minus imports), income flows, and transfers like remittances.",
        "A current account deficit (CAD) means Pakistan is spending more on foreign goods, services, and obligations than it earns from abroad, requiring borrowing or investment inflows to cover the gap.",
        "Pakistan's deficits are driven mainly by a large goods trade deficit (energy and machinery imports against a narrower textile-dominated export base), partially offset by remittance inflows.",
      ]}
      whyItMatters={[
        "Pakistan's recurring current account deficits are the root cause of its repeated need for IMF programs and foreign borrowing — the deficit must be financed somehow, through debt, reserves, or investment.",
        "A deficit below roughly 1-2% of GDP is generally considered manageable; deficits above 4% of GDP carry significant crisis risk, especially given Pakistan's historically thin foreign reserves.",
      ]}
      faq={[
        {
          question: "Does Pakistan currently have a current account deficit or surplus?",
          answer: `Pakistan's most recent current account balance is ${currentAccount.kpi.value} ${currentAccount.kpi.unit}, which is a ${isDeficit ? "deficit" : "surplus"}.`,
        },
        {
          question: "What causes Pakistan's current account deficit?",
          answer: "Pakistan's current account deficit is driven mainly by a large trade deficit in goods — heavy oil, machinery, and food imports against a narrower, textile-dominated export base — partially offset by strong remittance inflows.",
        },
        {
          question: "How is the current account deficit financed?",
          answer: "A current account deficit is financed through the capital and financial account — foreign loans, foreign direct investment, portfolio inflows, or by drawing down foreign reserves.",
        },
        {
          question: "What is the difference between trade balance and current account?",
          answer: "Trade balance only covers goods and services. The current account is broader, also including income flows (like profit repatriation) and transfers (like remittances and foreign grants).",
        },
      ]}
      relatedLinks={getRelatedLinks(SLUG)}
    />
  );
}
