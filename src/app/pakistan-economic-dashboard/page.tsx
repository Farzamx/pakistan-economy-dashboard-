import type { Metadata } from "next";
import { getSbpIndicator } from "@/lib/data/sbp";
import { getGdpKpi } from "@/lib/data/worldBank";
import SeoPageLayout from "@/components/seo/SeoPageLayout";
import { SITE_URL, SITE_NAME, relatedSeoLinks } from "@/lib/seoConfig";

const SLUG = "pakistan-economic-dashboard";
const PAGE_URL = `${SITE_URL}/${SLUG}`;
const TITLE = "Pakistan Economic Dashboard — Live Indicators & AI Analysis";
const DESCRIPTION =
  "A free, real-time Pakistan economic dashboard tracking GDP, inflation, exchange rates, reserves, and 50+ indicators, with AI-generated analysis and risk models.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default async function PakistanEconomicDashboardPage() {
  const [gdpKpi, cpiInflation] = await Promise.all([
    getGdpKpi(),
    getSbpIndicator("cpiInflation"),
  ]);

  return (
    <SeoPageLayout
      canonicalPath={`/${SLUG}`}
      title="Pakistan Economic Dashboard"
      subtitle={`${SITE_NAME} is a free, real-time dashboard tracking Pakistan's economy — GDP, inflation, exchange rates, reserves, remittances, financial markets, and monetary policy, all in one place.`}
      kpiLabel="CPI Inflation (YoY) — Live Preview"
      kpiValue={`${cpiInflation.kpi.value}%`}
      kpiSourceNote="One of 50+ indicators tracked live on the full dashboard."
      chartTitle="CPI Inflation — 24-Month Trend (Preview)"
      chartData={cpiInflation.trend}
      chartColor="#a855f7"
      chartUnit="%"
      chartGradientId="seoDashboardGradient"
      chartCaption="This is a preview chart. The full dashboard includes 15+ live charts covering every major indicator."
      secondaryStats={[{ label: "GDP Growth (Annual)", value: `${gdpKpi.value}%` }]}
      explanation={[
        `${SITE_NAME} combines live data from the State Bank of Pakistan, the Pakistan Bureau of Statistics, the World Bank, FRED, and Yahoo Finance into a single, continuously updated dashboard.`,
        "Beyond raw indicators, the dashboard includes an AI-generated Economic Health Score, deterministic (non-AI) recession and sovereign default probability models, tagged news intelligence with sentiment analysis, and an AI assistant that can answer questions about Pakistan's economy using live dashboard data and web search.",
        "Every quantitative figure — probabilities, KPI values, chart data — is computed deterministically from live data. AI is used only to generate plain-English explanations of what the numbers mean, never to invent the numbers themselves.",
      ]}
      whyItMatters={[
        "Pakistan's economy moves quickly and data is often scattered across many official sources — this dashboard consolidates it into one place, updated automatically, so you don't have to track a dozen government websites separately.",
        "Whether you're an investor, student, journalist, or policymaker, having live, accurate, and clearly-sourced economic data in one place makes it much easier to understand what's actually happening in Pakistan's economy right now.",
      ]}
      faq={[
        {
          question: "Is this Pakistan economic dashboard free to use?",
          answer: "Yes, the full dashboard is free to access, with no signup required, at pakeconintel.com.",
        },
        {
          question: "What data sources does this dashboard use?",
          answer: "The dashboard pulls live data from the State Bank of Pakistan (SBP EasyData), the Pakistan Bureau of Statistics, the World Bank, FRED (Federal Reserve Economic Data), and Yahoo Finance, with AI used only to explain — never generate — the underlying numbers.",
        },
        {
          question: "How often is the dashboard updated?",
          answer: "Update frequency varies by indicator: SBP monthly series refresh roughly every 24 hours, exchange rates and global market data update hourly, and AI-generated narrative analysis refreshes every few hours.",
        },
        {
          question: "Does the dashboard include an AI assistant?",
          answer: "Yes — a built-in AI assistant can answer questions about Pakistan's economy, combining live dashboard data, a local knowledge base of common economics questions, and web search for current events, with transparent source citations.",
        },
      ]}
      relatedLinks={relatedSeoLinks(SLUG, [
        "pakistan-economic-indicators",
        "gdp-growth-pakistan",
        "inflation-rate-pakistan",
        "usd-pkr-exchange-rate",
      ])}
    />
  );
}
