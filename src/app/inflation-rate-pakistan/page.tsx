import type { Metadata } from "next";
import { getSbpIndicator } from "@/lib/data/sbpServer";
import SeoPageLayout from "@/components/seo/SeoPageLayout";
import { SITE_URL, SITE_NAME, getRelatedLinks } from "@/lib/seoConfig";

const SLUG = "inflation-rate-pakistan";
const PAGE_URL = `${SITE_URL}/${SLUG}`;
const TITLE = "Pakistan Inflation Rate (CPI) — Live Data & Analysis";
const DESCRIPTION =
  "Pakistan's current CPI inflation rate, 24-month trend chart, and a plain-English explanation of what drives inflation and why it matters for households and policy.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default async function InflationRatePage() {
  const cpiInflation = await getSbpIndicator("cpiInflation");

  return (
    <SeoPageLayout
      canonicalPath={`/${SLUG}`}
      title="Pakistan Inflation Rate"
      subtitle="The year-over-year change in consumer prices (CPI) for everyday items — food, rent, transport, and medicine."
      kpiLabel="CPI Inflation (YoY)"
      kpiValue={`${cpiInflation.kpi.value}%`}
      kpiChange={cpiInflation.kpi.change}
      kpiTrend={cpiInflation.kpi.trend}
      kpiSourceNote={`Source: ${cpiInflation.kpi.source ?? "Pakistan Bureau of Statistics"}${cpiInflation.kpi.latestDate ? ` · ${cpiInflation.kpi.latestDate}` : ""}`}
      kpiQuality={cpiInflation.kpi}
      chartTitle="CPI Inflation — 24-Month Trend"
      chartData={cpiInflation.trend}
      chartColor="#38bdf8"
      chartUnit="%"
      chartGradientId="seoInflationGradient"
      chartCaption="Source: SBP EasyData, monthly national CPI, year-over-year."
      explanation={[
        "Inflation is the rate at which the general price level of goods and services rises over time, measured in Pakistan by the Consumer Price Index (CPI) — a basket of everyday items weighted by how much an average household spends on each.",
        "Pakistan's CPI is published monthly by the Pakistan Bureau of Statistics. Food typically carries the largest weight in the basket, which is why food price swings move the headline inflation number significantly.",
        "5-7% is generally considered a healthy range (close to SBP's target), 7-12% is elevated, and above 15% is crisis-level. Pakistan's inflation peaked near 38% in May 2023 during a severe currency and energy price shock.",
      ]}
      whyItMatters={[
        "High inflation erodes purchasing power, making everyday life more expensive — especially for lower-income households who spend a larger share of their income on food and energy.",
        "Inflation is the primary input into the State Bank of Pakistan's interest rate decisions: rising inflation typically pushes SBP to raise its policy rate to cool demand, while falling inflation opens room for rate cuts.",
      ]}
      faq={[
        {
          question: "What is Pakistan's current inflation rate?",
          answer: `Pakistan's most recently reported CPI inflation rate is ${cpiInflation.kpi.value}% year-over-year, based on Pakistan Bureau of Statistics data. This page updates automatically as new official data is released.`,
        },
        {
          question: "What causes inflation in Pakistan?",
          answer: "Pakistan's inflation is driven by a mix of factors: currency depreciation raising import costs (especially energy), domestic demand, administered price adjustments (electricity/gas tariffs), and global commodity prices.",
        },
        {
          question: "What is core inflation and how is it different from CPI?",
          answer: "Core inflation (Urban NFNE in Pakistan) strips out volatile food and energy prices to show the underlying, more persistent price trend — it's the figure the State Bank watches most closely before changing interest rates.",
        },
        {
          question: "How often is Pakistan's inflation data released?",
          answer: "Pakistan's CPI inflation data is released monthly by the Pakistan Bureau of Statistics, typically within the first few days of the following month.",
        },
      ]}
      relatedLinks={getRelatedLinks(SLUG)}
    />
  );
}
