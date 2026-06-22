import type { Metadata } from "next";
import { getFxRates } from "@/lib/data/fxRates";
import SeoPageLayout from "@/components/seo/SeoPageLayout";
import { SITE_URL, SITE_NAME, relatedSeoLinks } from "@/lib/seoConfig";

const SLUG = "gbp-to-pkr-exchange-rate";
const PAGE_URL = `${SITE_URL}/${SLUG}`;
const TITLE = "GBP to PKR Exchange Rate Today — Live Rate";
const DESCRIPTION =
  "Today's British Pound to Pakistani Rupee exchange rate, refreshed intraday, plus a plain-English explanation of what drives the GBP/PKR rate.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default async function GbpPkrPage() {
  const fxRates = await getFxRates();

  return (
    <SeoPageLayout
      canonicalPath={`/${SLUG}`}
      title="GBP to PKR Exchange Rate"
      subtitle="How many Pakistani Rupees it takes to buy one British Pound — relevant for one of Pakistan's largest overseas diaspora communities."
      kpiLabel="GBP / PKR (Intraday)"
      kpiValue={fxRates.gbpPkr.value}
      kpiSourceNote={`Source: ${fxRates.gbpPkr.source ?? "Yahoo Finance"} — interbank market rate, refreshed intraday`}
      chartTitle="GBP / PKR — Historical Trend"
      chartData={null}
      chartUnavailableNote="No historical GBP/PKR trend chart is available — SBP does not publish a dedicated GBP/PKR historical series; only the live cross-rate above is available."
      chartColor="#fb7185"
      chartUnit=""
      chartGradientId="seoGbpPkrGradient"
      chartCaption="Live rate only — no historical GBP/PKR series is published by SBP."
      secondaryStats={[
        { label: "USD / PKR", value: fxRates.usdPkr.value },
        { label: "EUR / PKR", value: fxRates.eurPkr.value },
        { label: "SAR / PKR", value: fxRates.sarPkr.value },
      ]}
      explanation={[
        "The GBP/PKR rate shows how many Pakistani Rupees are needed to buy one British Pound. It's computed from live cross-rates against the US Dollar, since both the Pound and the Rupee are quoted internationally against the Dollar.",
        "Like the Euro, the British Pound floats freely against the Dollar, so GBP/PKR reflects two independently moving exchange rates: USD/PKR and GBP/USD.",
        "The United Kingdom hosts one of the largest and most established overseas Pakistani communities in the world, making this exchange rate especially relevant for remittance flows and UK-Pakistan trade.",
      ]}
      whyItMatters={[
        "The UK is a major source of remittances to Pakistan — GBP/PKR movements directly affect how many Rupees a Pound-denominated remittance converts to for families back home.",
        "A weaker Pound against the Dollar (independent of any Rupee move) can reduce the Rupee value of UK remittances even if USD/PKR itself is unchanged, since the conversion runs through both currencies' Dollar cross-rates.",
      ]}
      faq={[
        {
          question: "What is the GBP to PKR exchange rate today?",
          answer: `The most recently published GBP/PKR interbank rate is approximately ${fxRates.gbpPkr.value}, refreshed intraday (typically every 10-30 minutes during active trading) from Yahoo Finance market data.`,
        },
        {
          question: "Why is there no historical GBP/PKR chart on this page?",
          answer: "The State Bank of Pakistan does not publish a dedicated historical GBP/PKR series — only a live computed cross-rate is available. SBP's historical exchange rate series specifically tracks USD/PKR (see that page for a 24-month trend).",
        },
        {
          question: "Why does the UK matter for Pakistan's remittances?",
          answer: "The United Kingdom is home to one of the largest and longest-established Pakistani diaspora communities globally, making it a consistently significant source of remittance inflows alongside Gulf countries and the US.",
        },
        {
          question: "Why can GBP/PKR move even if USD/PKR doesn't?",
          answer: "GBP/PKR is a combination of two separate exchange rates — USD/PKR and GBP/USD. If the Pound strengthens or weakens against the Dollar globally, GBP/PKR will move even on a day when the Rupee itself is flat against the Dollar.",
        },
      ]}
      relatedLinks={relatedSeoLinks(SLUG, [
        "usd-pkr-exchange-rate",
        "eur-to-pkr-exchange-rate",
        "pakistan-remittances",
      ])}
    />
  );
}
