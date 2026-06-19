import type { Metadata } from "next";
import { getAllSbpIndicators } from "@/lib/data/sbp";
import { getGdpKpi } from "@/lib/data/worldBank";
import SeoPageLayout from "@/components/seo/SeoPageLayout";
import { SITE_URL, SITE_NAME, relatedSeoLinks } from "@/lib/seoConfig";

const SLUG = "pakistan-economic-indicators";
const PAGE_URL = `${SITE_URL}/${SLUG}`;
const TITLE = "Pakistan Economic Indicators — Live Dashboard Overview";
const DESCRIPTION =
  "A live snapshot of Pakistan's key economic indicators — GDP growth, inflation, interest rate, foreign reserves, exchange rate, and current account — in one place.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default async function EconomicIndicatorsPage() {
  const [sbp, gdpKpi] = await Promise.all([getAllSbpIndicators(), getGdpKpi()]);

  return (
    <SeoPageLayout
      canonicalPath={`/${SLUG}`}
      title="Pakistan Economic Indicators"
      subtitle="A live, at-a-glance snapshot of the indicators that matter most for understanding Pakistan's economy right now."
      kpiLabel="CPI Inflation (YoY)"
      kpiValue={`${sbp.cpiInflation.kpi.value}%`}
      kpiSourceNote="Headline indicator shown here — see the full live dashboard for all 50+ tracked indicators."
      chartTitle="CPI Inflation — 24-Month Trend"
      chartData={sbp.cpiInflation.trend}
      chartColor="#a855f7"
      chartUnit="%"
      chartGradientId="seoIndicatorsGradient"
      chartCaption="Source: SBP EasyData, monthly national CPI, year-over-year."
      secondaryStats={[
        { label: "GDP Growth (Annual)", value: `${gdpKpi.value}%` },
        { label: "SBP Policy Rate", value: `${sbp.policyRate.kpi.value}%` },
        { label: "USD / PKR", value: sbp.usdPkr.kpi.value },
        { label: "Foreign Reserves (SBP)", value: `$${parseFloat(sbp.foreignReserves.kpi.value).toFixed(1)}B` },
        { label: "Current Account", value: `${sbp.currentAccount.kpi.value} ${sbp.currentAccount.kpi.unit}` },
        { label: "Remittances", value: `${sbp.remittances.kpi.value} ${sbp.remittances.kpi.unit}` },
      ]}
      explanation={[
        "Pakistan's economy is best understood through a handful of key indicators tracked together: GDP growth (how fast the economy is expanding), inflation (how fast prices are rising), the interest rate (the cost of borrowing), foreign reserves (the country's financial buffer), the exchange rate (the Rupee's value), and the current account (money flowing in versus out internationally).",
        "These indicators interact closely — for example, high inflation typically pushes the State Bank to raise interest rates, which can support the Rupee but slow GDP growth, while low reserves limit the central bank's room to maneuver.",
      ]}
      whyItMatters={[
        "Watching these indicators together — rather than any single one in isolation — gives a much clearer picture of whether Pakistan's economy is stabilizing, stressed, or improving.",
        "These same indicators feed into the deterministic recession and sovereign default probability models on the full live dashboard, alongside AI-generated plain-English analysis updated regularly.",
      ]}
      faq={[
        {
          question: "What are the most important economic indicators for Pakistan?",
          answer: "The most closely watched indicators are GDP growth, CPI inflation, the SBP policy rate, foreign exchange reserves, the USD/PKR exchange rate, the current account balance, and remittance inflows.",
        },
        {
          question: "Where can I see all of Pakistan's economic indicators in one place?",
          answer: "This dashboard (pakeconintel.com) tracks 50+ live Pakistani economic indicators in one place, including deterministic recession and default risk models, AI-generated analysis, and tagged news intelligence.",
        },
        {
          question: "How often is this economic data updated?",
          answer: "Update frequency varies by indicator — SBP monthly series refresh roughly every 24 hours, exchange rates update hourly, and AI-generated analysis refreshes every few hours, always computed from live underlying data.",
        },
        {
          question: "Is Pakistan's economy currently improving or declining?",
          answer: "This depends on the specific time period and indicator — check the full live dashboard's Economic Health Score and Risk Intelligence sections for an up-to-date, data-driven assessment.",
        },
      ]}
      relatedLinks={relatedSeoLinks(SLUG, [
        "gdp-growth-pakistan",
        "inflation-rate-pakistan",
        "pakistan-interest-rate",
        "foreign-exchange-reserves-pakistan",
        "pakistan-economic-dashboard",
      ])}
    />
  );
}
