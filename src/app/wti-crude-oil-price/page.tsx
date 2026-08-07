import type { Metadata } from "next";
import { getWtiKpi } from "@/lib/data/fred";
import { getWtiHistory } from "@/lib/data/yfinance";
import SeoPageLayout from "@/components/seo/SeoPageLayout";
import type { TrendPoint } from "@/components/charts/TrendLineChart";
import { SITE_URL, SITE_NAME, getRelatedLinks } from "@/lib/seoConfig";
import { formatMonthLabel } from "@/lib/formatMonthLabel";

const SLUG = "wti-crude-oil-price";
const PAGE_URL = `${SITE_URL}/${SLUG}`;
const TITLE = "WTI Crude Oil Price — Live Rate & Trend, Pakistan Context";
const DESCRIPTION =
  "West Texas Intermediate (WTI) crude oil price — live, with a 10-year historical trend and a plain-English explanation of why global oil prices matter directly for Pakistan's import bill and inflation.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default async function WtiPage() {
  const [wtiKpi, wtiHistory] = await Promise.all([
    getWtiKpi(),
    getWtiHistory(),
  ]);

  const chartData: TrendPoint[] | null = wtiHistory
    ? wtiHistory.map((p) => ({ month: formatMonthLabel(p.date), value: p.close }))
    : null;

  return (
    <SeoPageLayout
      canonicalPath={`/${SLUG}`}
      title="WTI Crude Oil Price"
      subtitle="West Texas Intermediate — the US benchmark crude oil price, and one of the two global oil benchmarks (alongside Brent) that shape the landed cost of the petroleum Pakistan imports."
      kpiLabel="WTI Crude Oil (Live)"
      kpiValue={`$${wtiKpi.value}/bbl`}
      kpiChange={wtiKpi.change}
      kpiTrend={wtiKpi.trend}
      kpiSourceNote={`Source: ${wtiKpi.source ?? "Yahoo Finance / FRED"}${wtiKpi.latestDate ? ` · ${wtiKpi.latestDate}` : ""}`}
      kpiQuality={wtiKpi}
      chartTitle="WTI Crude Oil (USD/bbl) — 10-Year Historical Trend"
      chartData={chartData}
      chartUnavailableNote="Historical chart data is currently unavailable."
      chartColor="#38bdf8"
      chartUnit=""
      chartGradientId="seoWtiGradient"
      chartCaption="Source: Yahoo Finance, WTI crude oil futures (CL=F), monthly closes."
      explanation={[
        "West Texas Intermediate (WTI) is a light, sweet crude oil grade produced in the United States, and its futures price is one of the two global benchmarks used to price crude oil worldwide — the other being Brent, sourced from the North Sea.",
        "Pakistan doesn't produce enough crude domestically to meet demand and imports the majority of its oil needs, so global benchmark prices like WTI (and more directly, Brent, since Pakistan's import cargoes are typically priced closer to Brent) feed almost directly into the country's energy import bill.",
        "WTI and Brent typically move together, since both reflect the same underlying global supply and demand balance, though a persistent gap (the WTI-Brent spread) can open up due to regional supply/transport factors specific to each benchmark's location.",
      ]}
      whyItMatters={[
        "Energy imports make up one of the largest single categories in Pakistan's import bill, so a sustained rise in global crude prices directly widens the trade and current account deficit, adding pressure on foreign reserves and the Rupee.",
        "Fuel costs feed through to domestic transport and electricity prices, making global oil prices one of the more direct external channels of imported inflation into Pakistan's CPI and WPI baskets.",
      ]}
      faq={[
        {
          question: "What is the WTI crude oil price right now?",
          answer: `WTI crude oil is currently trading at $${wtiKpi.value} per barrel, according to ${wtiKpi.source ?? "Yahoo Finance"}.`,
        },
        {
          question: "Why might the chart below not match the live price at the top?",
          answer: "The price at the top refreshes live throughout the day. The historical chart plots monthly closing prices from Yahoo Finance futures data, so its most recent point can be up to several weeks old — it's built for viewing the long-term trend, not for reading today's price.",
        },
        {
          question: "What's the difference between WTI and Brent crude?",
          answer: "WTI is a US-produced benchmark grade; Brent is sourced from the North Sea and is the more widely used pricing reference for oil traded internationally, including cargoes imported into South Asia. The two typically move together but can diverge due to regional supply and transport factors.",
        },
        {
          question: "Why does the oil price matter so much for Pakistan specifically?",
          answer: "Pakistan imports the large majority of its crude oil and refined petroleum needs, so global benchmark oil prices flow almost directly into the country's energy import bill — a major driver of the trade deficit, current account pressure, and domestic fuel-price inflation.",
        },
      ]}
      relatedLinks={getRelatedLinks(SLUG)}
    />
  );
}
