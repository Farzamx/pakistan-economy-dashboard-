import type { Metadata } from "next";
import { getSbpIndicator } from "@/lib/data/sbpServer";
import SeoPageLayout from "@/components/seo/SeoPageLayout";
import { SITE_URL, SITE_NAME, getRelatedLinks } from "@/lib/seoConfig";

const SLUG = "pakistan-wholesale-inflation";
const PAGE_URL = `${SITE_URL}/${SLUG}`;
const TITLE = "Pakistan Wholesale Price Index (WPI) Inflation — Live Rate & Trend";
const DESCRIPTION =
  "Pakistan's Wholesale Price Index (WPI) inflation rate — a leading indicator for future retail price changes — live, with a 24-month trend and a plain-English explanation of why producers' costs matter to everyone.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default async function WpiInflationPage() {
  const wpi = await getSbpIndicator("wpiInflation");

  return (
    <SeoPageLayout
      canonicalPath={`/${SLUG}`}
      title="Pakistan Wholesale Price Index (WPI)"
      subtitle="Year-over-year change in prices at the wholesale/producer level — what it costs businesses to buy goods before they ever reach a retail shelf, and a leading signal for where retail (CPI) inflation is headed."
      kpiLabel="WPI Inflation (YoY)"
      kpiValue={`${wpi.kpi.value}%`}
      kpiChange={wpi.kpi.change}
      kpiTrend={wpi.kpi.trend}
      kpiQuality={wpi.kpi}
      chartTitle="WPI Inflation — 24-Month Trend"
      chartData={wpi.trend}
      chartColor="#a855f7"
      chartUnit="%"
      chartGradientId="seoWpiGradient"
      chartCaption="Source: SBP EasyData / Pakistan Bureau of Statistics, monthly, year-over-year."
      explanation={[
        "The Wholesale Price Index tracks price changes at the wholesale and producer level — the cost of goods as they move between producers, importers, and wholesalers — rather than what a consumer pays at a retail shop, which is what CPI measures.",
        "Because WPI captures raw material, fuel, and imported input costs earlier in the supply chain, it tends to move ahead of CPI: a rise in wholesale prices today often shows up as higher retail prices a month or two later, once businesses pass the added cost through.",
        "Pakistan's WPI basket is weighted heavily toward industrial inputs, imported raw materials, and fuel — making it especially sensitive to Rupee depreciation and global commodity price swings, since a large share of the underlying goods are either imported directly or made from imported inputs.",
      ]}
      whyItMatters={[
        "WPI is one of the earliest available signals of building retail inflation pressure — a sustained rise here, before it shows up in CPI, gives businesses, policymakers, and consumers a preview of what's coming.",
        "Because WPI is so exposed to imported input costs, it's a direct barometer of exchange rate pass-through: when the Rupee weakens or global fuel/commodity prices spike, WPI typically reacts faster and more sharply than the broader CPI basket.",
      ]}
      faq={[
        {
          question: "What is Pakistan's current WPI inflation rate?",
          answer: `Pakistan's Wholesale Price Index inflation rate is currently ${wpi.kpi.value}% year-over-year, according to SBP EasyData / Pakistan Bureau of Statistics.`,
        },
        {
          question: "What's the difference between WPI and CPI?",
          answer: "CPI measures what consumers pay at retail for a fixed basket of household goods and services. WPI measures prices earlier in the supply chain — at the wholesale and producer level — and is more heavily weighted toward industrial inputs, raw materials, and imported goods.",
        },
        {
          question: "Why does WPI matter if consumers don't buy at wholesale prices?",
          answer: "WPI changes tend to feed through into retail prices with a lag, as businesses pass higher (or lower) input costs on to consumers. A rising WPI is often an early warning sign for future CPI inflation.",
        },
        {
          question: "Why is Pakistan's WPI so sensitive to the exchange rate?",
          answer: "A large share of the goods in Pakistan's WPI basket are imported outright or manufactured using imported raw materials and fuel, so a weaker Rupee raises wholesale costs directly and quickly, well before that pressure is fully visible in retail CPI.",
        },
      ]}
      relatedLinks={getRelatedLinks(SLUG)}
    />
  );
}
