import type { Metadata } from "next";
import { getFxRates } from "@/lib/data/fxRates";
import SeoPageLayout from "@/components/seo/SeoPageLayout";
import { SITE_URL, SITE_NAME, getRelatedLinks } from "@/lib/seoConfig";

const SLUG = "eur-to-pkr-exchange-rate";
const PAGE_URL = `${SITE_URL}/${SLUG}`;
const TITLE = "EUR to PKR Exchange Rate Today — Live Rate";
const DESCRIPTION =
  "Today's Euro to Pakistani Rupee exchange rate, refreshed intraday, plus a plain-English explanation of what drives the EUR/PKR rate.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default async function EurPkrPage() {
  const fxRates = await getFxRates();

  return (
    <SeoPageLayout
      canonicalPath={`/${SLUG}`}
      title="EUR to PKR Exchange Rate"
      subtitle="How many Pakistani Rupees it takes to buy one Euro — relevant for trade with the EU, Pakistan's largest export destination bloc, and the European Pakistani diaspora."
      kpiLabel="EUR / PKR (Intraday)"
      kpiValue={fxRates.eurPkr.value}
      kpiSourceNote={`Source: ${fxRates.eurPkr.source ?? "Yahoo Finance"} — interbank market rate, refreshed intraday`}
      kpiQuality={fxRates.eurPkr}
      chartTitle="EUR / PKR — Historical Trend"
      chartData={null}
      chartUnavailableNote="No historical EUR/PKR trend chart is available — SBP does not publish a dedicated EUR/PKR historical series; only the live cross-rate above is available."
      chartColor="#38bdf8"
      chartUnit=""
      chartGradientId="seoEurPkrGradient"
      chartCaption="Live rate only — no historical EUR/PKR series is published by SBP."
      secondaryStats={[
        { label: "USD / PKR", value: fxRates.usdPkr.value },
        { label: "GBP / PKR", value: fxRates.gbpPkr.value },
        { label: "SAR / PKR", value: fxRates.sarPkr.value },
      ]}
      explanation={[
        "The EUR/PKR rate shows how many Pakistani Rupees are needed to buy one Euro. It's computed from live cross-rates against the US Dollar, since both the Euro and the Rupee are quoted internationally against the Dollar.",
        "Unlike the Saudi Riyal, the Euro floats freely against the Dollar, so EUR/PKR reflects two independently moving exchange rates: USD/PKR and EUR/USD.",
        "The European Union is collectively one of Pakistan's largest export markets, particularly for textiles under the GSP+ trade preference scheme, making this rate relevant for exporters pricing contracts in Euros.",
      ]}
      whyItMatters={[
        "Pakistani exporters who invoice in Euros — common in textile trade with EU buyers — see their Rupee revenue affected by both the Rupee's own moves and the Euro's moves against the Dollar.",
        "The European Pakistani diaspora is a meaningful source of remittances, so this rate also matters for the Rupee value of money sent home from EU countries.",
      ]}
      faq={[
        {
          question: "What is the EUR to PKR exchange rate today?",
          answer: `The most recently published EUR/PKR interbank rate is approximately ${fxRates.eurPkr.value}, refreshed intraday (typically every 10-30 minutes during active trading) from Yahoo Finance market data.`,
        },
        {
          question: "Why is there no historical EUR/PKR chart on this page?",
          answer: "The State Bank of Pakistan does not publish a dedicated historical EUR/PKR series — only a live computed cross-rate is available. SBP's historical exchange rate series specifically tracks USD/PKR (see that page for a 24-month trend).",
        },
        {
          question: "Why does the EU matter for Pakistan's exchange rate?",
          answer: "The European Union is one of Pakistan's largest export destinations, especially for textiles exported under the GSP+ preferential trade scheme — EUR/PKR movements directly affect the Rupee value exporters receive on Euro-denominated contracts.",
        },
        {
          question: "Is EUR/PKR more volatile than USD/PKR?",
          answer: "EUR/PKR reflects two moving exchange rates layered together — USD/PKR and EUR/USD — so it can show more day-to-day movement than USD/PKR alone, which only reflects the Rupee's own moves against a single currency.",
        },
      ]}
      relatedLinks={getRelatedLinks(SLUG)}
    />
  );
}
