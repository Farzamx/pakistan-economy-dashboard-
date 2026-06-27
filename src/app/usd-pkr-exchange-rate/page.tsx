import type { Metadata } from "next";
import { getFxRates } from "@/lib/data/fxRates";
import { getSbpIndicator } from "@/lib/data/sbp";
import SeoPageLayout from "@/components/seo/SeoPageLayout";
import { SITE_URL, SITE_NAME, relatedSeoLinks } from "@/lib/seoConfig";

const SLUG = "usd-pkr-exchange-rate";
const PAGE_URL = `${SITE_URL}/${SLUG}`;
const TITLE = "USD to PKR Exchange Rate Today — Live Rate & Trend";
const DESCRIPTION =
  "Today's live USD to PKR interbank exchange rate, the historical monthly-average trend, and a plain-English explanation of what moves the Rupee.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default async function UsdPkrPage() {
  const [fxRates, usdPkrHistory] = await Promise.all([getFxRates(), getSbpIndicator("usdPkr")]);

  return (
    <SeoPageLayout
      canonicalPath={`/${SLUG}`}
      title="USD to PKR Exchange Rate"
      subtitle="How many Pakistani Rupees it takes to buy one US Dollar — the most-watched financial indicator in Pakistan."
      kpiLabel="USD / PKR (Intraday)"
      kpiValue={fxRates.usdPkr.value}
      kpiSourceNote={`Source: ${fxRates.usdPkr.source ?? "Yahoo Finance"} — interbank market rate, refreshed intraday`}
      chartTitle="USD / PKR — 24-Month Historical Trend"
      chartData={usdPkrHistory.trend}
      chartColor="#f472b6"
      chartUnit=""
      chartGradientId="seoUsdPkrGradient"
      chartCaption="Historical chart source: SBP EasyData — Monthly Average Interbank Rate. This is a separate, slower-moving series from the live rate above — it lags and smooths out same-day market moves."
      secondaryStats={[
        { label: "EUR / PKR", value: fxRates.eurPkr.value },
        { label: "GBP / PKR", value: fxRates.gbpPkr.value },
        { label: "SAR / PKR", value: fxRates.sarPkr.value },
      ]}
      explanation={[
        "The USD/PKR exchange rate shows how many Rupees are needed to buy one US Dollar. Pakistan operates a market-determined (floating) exchange rate, meaning the rate moves based on supply and demand for foreign currency.",
        "This page shows two distinct figures: the interbank rate (refreshed intraday from Yahoo Finance market data) at the top, and a separate historical trend chart from the State Bank of Pakistan, which publishes a monthly average — useful for analyzing long-term trends, not for live trading decisions.",
        "A weaker Rupee (rising USD/PKR) makes imports more expensive and inflates the cost of foreign debt repayments. A stronger Rupee (falling USD/PKR) makes imports cheaper but can hurt export competitiveness.",
      ]}
      whyItMatters={[
        "The exchange rate affects inflation directly — Pakistan imports a large share of its energy and raw materials in US Dollars, so Rupee depreciation quickly feeds into domestic prices.",
        "It's also central to Pakistan's debt sustainability: a weaker Rupee increases the local-currency cost of servicing Pakistan's foreign-currency-denominated debt, which is a major fiscal concern.",
      ]}
      faq={[
        {
          question: "What is the current USD to PKR exchange rate?",
          answer: `The most recently published USD/PKR interbank rate is approximately ${fxRates.usdPkr.value}, refreshed intraday (typically every 10-30 minutes during active trading) from Yahoo Finance market data. This is distinct from SBP's monthly average historical series shown in the chart on this page.`,
        },
        {
          question: "Why is there a difference between this rate and the SBP historical chart?",
          answer: "This rate is an intraday market quote, refreshed throughout the day. SBP's published historical series is a monthly average, which lags and smooths out day-to-day market movements — it's meant for trend analysis, not for tracking today's rate.",
        },
        {
          question: "Is this exchange rate updated in real time?",
          answer: "It's updated intraday, not tick-by-tick continuously — Yahoo Finance's PKR cross-rate quote typically refreshes every 10-30 minutes during active trading hours, verified directly rather than assumed. That's a much tighter window than once-daily sources, though not literally millisecond-by-millisecond.",
        },
        {
          question: "What causes the Rupee to weaken or strengthen?",
          answer: "The Rupee's value is driven by Pakistan's trade balance, foreign reserves, remittance inflows, interest rate differentials with the US, IMF program developments, and overall market sentiment toward Pakistan's economy.",
        },
        {
          question: "Does the State Bank of Pakistan control the exchange rate?",
          answer: "SBP officially operates a market-determined exchange rate regime, though it can intervene periodically to smooth excessive volatility using its foreign reserves.",
        },
      ]}
      relatedLinks={relatedSeoLinks(SLUG, [
        "foreign-exchange-reserves-pakistan",
        "current-account-deficit-pakistan",
        "sar-to-pkr-exchange-rate",
        "pakistan-economic-indicators",
      ])}
    />
  );
}
