import type { Metadata } from "next";
import { getSbpIndicator } from "@/lib/data/sbpServer";
import SeoPageLayout from "@/components/seo/SeoPageLayout";
import { SITE_URL, SITE_NAME, getRelatedLinks } from "@/lib/seoConfig";

const SLUG = "pakistan-money-supply";
const PAGE_URL = `${SITE_URL}/${SLUG}`;
const TITLE = "Pakistan Money Supply (M2) — Live Data & Trend";
const DESCRIPTION =
  "Pakistan's broad money supply (M2) — currency in circulation plus bank deposits — live, with a 24-month trend and a plain-English explanation of the classic link between money supply growth and inflation.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default async function MoneySupplyPage() {
  const m2 = await getSbpIndicator("moneySupplyM2");

  return (
    <SeoPageLayout
      canonicalPath={`/${SLUG}`}
      title="Pakistan Money Supply (M2)"
      subtitle="Broad money — currency in circulation plus demand and time deposits held at banks — the total stock of money circulating through Pakistan's economy."
      kpiLabel="Broad Money Supply (M2)"
      kpiValue={`₨${m2.kpi.value}T`}
      kpiChange={m2.kpi.change}
      kpiTrend={m2.kpi.trend}
      kpiQuality={m2.kpi}
      chartTitle="Money Supply (M2) — 24-Week Trend"
      chartData={m2.trend}
      chartColor="#38bdf8"
      chartUnit="T"
      chartGradientId="seoM2Gradient"
      chartCaption="Source: SBP EasyData, weekly, broad money (M2) stock level in trillion Rupees."
      explanation={[
        "M2, or broad money, is the total stock of money available in the economy: physical currency in circulation, plus the deposits households and businesses hold in bank accounts — both demand deposits (checking-style, spendable on demand) and time deposits (fixed-term savings).",
        "M2 grows through two main channels: the State Bank of Pakistan expanding the monetary base, and commercial banks creating new deposits as they extend credit — meaning private-sector lending growth is itself one of the drivers of M2 growth, not a separate story.",
        "SBP reports M2 on a weekly basis, making it one of the more frequently updated indicators in the monetary dataset, alongside the policy rate and T-Bill/PIB auction yields.",
      ]}
      whyItMatters={[
        "Money supply growth is one of the oldest and most closely watched inflation drivers in economics — when M2 grows persistently faster than the real economy, the classic monetarist expectation is that the excess ends up as higher prices rather than higher output.",
        "SBP's Monetary Policy Committee monitors M2 growth alongside inflation and credit data when calibrating the policy rate — sustained excess money growth is one signal that policy may need to tighten.",
      ]}
      faq={[
        {
          question: "What is Pakistan's current money supply (M2)?",
          answer: `Pakistan's broad money supply (M2) currently stands at ₨${m2.kpi.value} trillion, according to SBP EasyData.`,
        },
        {
          question: "What's included in M2 but not in narrower measures of money?",
          answer: "M2 (broad money) includes currency in circulation plus both demand deposits and time/savings deposits at banks — a wider measure than M1 (currency plus only demand deposits), capturing savings held in less immediately spendable form.",
        },
        {
          question: "Does faster money supply growth always cause inflation in Pakistan?",
          answer: "Not mechanically or immediately — the relationship depends on how much of that money growth is absorbed by real economic growth versus how much shows up as price increases, and the lag between the two can be long and variable. But sustained, above-trend M2 growth is one of the classic early-warning signals economists and SBP watch for future inflation pressure.",
        },
        {
          question: "How often is Pakistan's money supply data updated?",
          answer: "SBP EasyData publishes M2 on a weekly basis, making it one of the most frequently updated indicators in Pakistan's monetary dataset.",
        },
      ]}
      relatedLinks={[
        ...getRelatedLinks(SLUG),
        { href: "/comparisons/inflation-vs-money-supply", label: "Inflation vs Money Supply" },
      ]}
    />
  );
}
