import type { Metadata } from "next";
import { getFxRates } from "@/lib/data/fxRates";
import SeoPageLayout from "@/components/seo/SeoPageLayout";
import { SITE_URL, SITE_NAME, getRelatedLinks } from "@/lib/seoConfig";

const SLUG = "sar-to-pkr-exchange-rate";
const PAGE_URL = `${SITE_URL}/${SLUG}`;
const TITLE = "SAR to PKR Exchange Rate Today — Live Rate";
const DESCRIPTION =
  "Today's Saudi Riyal to Pakistani Rupee exchange rate, refreshed intraday, plus a plain-English explanation of why this rate matters for Pakistan's large Gulf-based expat community.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default async function SarPkrPage() {
  const fxRates = await getFxRates();

  return (
    <SeoPageLayout
      canonicalPath={`/${SLUG}`}
      title="SAR to PKR Exchange Rate"
      subtitle="How many Pakistani Rupees it takes to buy one Saudi Riyal — a closely watched rate for Pakistan's large Saudi-based expatriate community."
      kpiLabel="SAR / PKR (Intraday)"
      kpiValue={fxRates.sarPkr.value}
      kpiChange={fxRates.sarPkr.change}
      kpiTrend={fxRates.sarPkr.trend}
      kpiSourceNote={`Source: ${fxRates.sarPkr.source ?? "Yahoo Finance"} — interbank market rate, refreshed intraday`}
      kpiQuality={fxRates.sarPkr}
      chartTitle="SAR / PKR — Historical Trend (Not Available)"
      chartData={null}
      chartUnavailableNote="No historical SAR/PKR trend chart is available — SBP does not publish a dedicated SAR/PKR historical series; only the live cross-rate above is available. SAR/PKR moves are driven almost entirely by USD/PKR, since the Saudi Riyal has been pegged to the US Dollar since 1986."
      chartColor="#38bdf8"
      chartUnit=""
      chartGradientId="seoSarPkrGradient"
      chartCaption="Live rate only — no historical SAR/PKR series is published by SBP."
      secondaryStats={[
        { label: "USD / PKR", value: fxRates.usdPkr.value },
        { label: "EUR / PKR", value: fxRates.eurPkr.value },
        { label: "GBP / PKR", value: fxRates.gbpPkr.value },
      ]}
      explanation={[
        "The SAR/PKR rate shows how many Pakistani Rupees are needed to buy one Saudi Riyal. It's computed from live USD cross-rates, since SAR and PKR are both quoted against the US Dollar internationally.",
        "The Saudi Riyal has been pegged to the US Dollar at a fixed rate of 3.75 SAR per USD since 1986 — Saudi Arabia's central bank (SAMA) maintains this peg directly. That means SAR/PKR movements are driven almost entirely by changes in the USD/PKR rate, not by any independent movement of the Riyal itself.",
        "Saudi Arabia hosts one of the largest populations of overseas Pakistani workers, making this one of the most economically significant exchange rates for remittance flows into Pakistan.",
      ]}
      whyItMatters={[
        "Saudi Arabia is consistently among the top sources of remittances to Pakistan — the SAR/PKR rate directly determines how much Pakistani Rupees a Riyal-denominated remittance converts to for families back home.",
        "Because the Riyal is pegged to the Dollar, anyone tracking SAR/PKR for remittance planning is, in effect, tracking USD/PKR — a depreciating Rupee against the Dollar means more Rupees per Riyal sent home, all else equal.",
      ]}
      faq={[
        {
          question: "What is the SAR to PKR exchange rate today?",
          answer: `The most recently published SAR/PKR interbank rate is approximately ${fxRates.sarPkr.value}, refreshed intraday (typically every 10-30 minutes during active trading) from Yahoo Finance market data.`,
        },
        {
          question: "Why is there no historical SAR/PKR chart on this page?",
          answer: "The State Bank of Pakistan does not publish a dedicated historical SAR/PKR series — only a live computed cross-rate is available. Because the Saudi Riyal is pegged to the US Dollar, Pakistan's published USD/PKR historical trend (see the USD/PKR page) is a close proxy for how SAR/PKR has moved over time.",
        },
        {
          question: "Why is the Saudi Riyal pegged to the US Dollar?",
          answer: "Saudi Arabia's central bank (SAMA) has maintained a fixed exchange rate of 3.75 SAR per USD since 1986 as part of its monetary policy framework, common among Gulf oil-exporting economies whose revenues are largely Dollar-denominated.",
        },
        {
          question: "Does the SAR/PKR rate affect remittances from Saudi Arabia?",
          answer: "Yes — Saudi Arabia is one of the largest sources of remittances to Pakistan. A weaker Rupee against the Dollar (and therefore against the pegged Riyal) means each Riyal sent home converts to more Rupees for the receiving family.",
        },
      ]}
      relatedLinks={getRelatedLinks(SLUG)}
    />
  );
}
