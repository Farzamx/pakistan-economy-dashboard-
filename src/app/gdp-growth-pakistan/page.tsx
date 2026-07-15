import type { Metadata } from "next";
import { getGdpKpi } from "@/lib/data/worldBank";
import { getQuarterlyGdpKpi } from "@/lib/data/quarterlyGdp";
import SeoPageLayout from "@/components/seo/SeoPageLayout";
import { SITE_URL, SITE_NAME, getRelatedLinks } from "@/lib/seoConfig";

const SLUG = "gdp-growth-pakistan";
const PAGE_URL = `${SITE_URL}/${SLUG}`;
const TITLE = "Pakistan GDP Growth Rate — Live Data & Analysis";
const DESCRIPTION =
  "Pakistan's current GDP growth rate, quarterly trend chart, and a plain-English explanation of what GDP growth means and why it matters for the economy.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: PAGE_URL,
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default async function GdpGrowthPage() {
  const [gdpKpi, quarterlyGdp] = await Promise.all([getGdpKpi(), getQuarterlyGdpKpi()]);

  return (
    <SeoPageLayout
      canonicalPath={`/${SLUG}`}
      title="Pakistan GDP Growth Rate"
      subtitle="The annual and quarterly growth rate of Pakistan's total economic output — agriculture, industry, and services combined."
      kpiLabel="Annual GDP Growth (Latest)"
      kpiValue={`${gdpKpi.value}%`}
      kpiChange={gdpKpi.change}
      kpiTrend={gdpKpi.trend}
      kpiSourceNote={`Source: ${gdpKpi.source ?? "World Bank"}${gdpKpi.latestDate ? ` · ${gdpKpi.latestDate}` : ""}`}
      kpiQuality={gdpKpi}
      chartTitle="Quarterly GDP Growth (YoY)"
      chartData={quarterlyGdp.trend}
      chartColor="#38bdf8"
      chartUnit="%"
      chartGradientId="seoGdpGradient"
      chartCaption="Source: Pakistan Bureau of Statistics (PBS), real GVA growth, year-over-year — updated roughly six weeks after each quarter ends."
      secondaryStats={[
        { label: "Latest Quarter", value: `${quarterlyGdp.kpi.value}%` },
        { label: "Data Status", value: quarterlyGdp.isFallback ? "Fallback estimate" : "Live" },
      ]}
      explanation={[
        "GDP (Gross Domestic Product) growth measures how fast the total value of goods and services produced in Pakistan is increasing compared to a year earlier. It's calculated across three sectors: agriculture, industry, and services.",
        "Pakistan's GDP growth is published annually by the Ministry of Finance and the Pakistan Bureau of Statistics, with a more granular quarterly figure (real GVA growth) released roughly six weeks after each quarter ends.",
        "Growth above 5% is generally considered strong for Pakistan, 2-5% is moderate, and below 2% signals a weak economy. Negative growth means the economy is shrinking — a recession.",
      ]}
      whyItMatters={[
        "GDP growth is the headline number used to judge whether Pakistan's economy is creating jobs, raising incomes, and reducing poverty. Pakistan generally needs growth above 5% to meaningfully outpace its fast-growing population and reduce poverty over time.",
        "Slower growth typically means fewer new jobs, weaker tax revenue for the government, and less room for businesses to expand — which is why GDP growth is watched closely by investors, policymakers, and international lenders like the IMF.",
      ]}
      faq={[
        {
          question: "What is Pakistan's current GDP growth rate?",
          answer: `Pakistan's most recently reported annual GDP growth rate is ${gdpKpi.value}%, based on ${gdpKpi.source ?? "World Bank"} data. This dashboard updates the figure automatically as new official data is released.`,
        },
        {
          question: "Who calculates Pakistan's GDP?",
          answer: "Pakistan's GDP is calculated and published by the Pakistan Bureau of Statistics (PBS), in coordination with the Ministry of Finance, covering agriculture, industry, and services output.",
        },
        {
          question: "What is considered a good GDP growth rate for Pakistan?",
          answer: "Growth above 5% is generally considered strong for Pakistan, 2-5% is moderate, and below 2% is considered weak. Negative growth indicates a recession.",
        },
        {
          question: "What's the difference between annual and quarterly GDP growth?",
          answer: "Annual GDP growth covers a full fiscal year (July-June in Pakistan). Quarterly GDP growth (YoY) compares a single quarter to the same quarter a year earlier, revealing momentum faster than the annual figure.",
        },
      ]}
      relatedLinks={getRelatedLinks(SLUG)}
    />
  );
}
