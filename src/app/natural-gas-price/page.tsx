import type { Metadata } from "next";
import { getNaturalGasKpi } from "@/lib/data/fred";
import { getNaturalGasHistory } from "@/lib/data/yfinance";
import SeoPageLayout from "@/components/seo/SeoPageLayout";
import type { TrendPoint } from "@/components/charts/TrendLineChart";
import { SITE_URL, SITE_NAME, getRelatedLinks } from "@/lib/seoConfig";
import { formatMonthLabel } from "@/lib/formatMonthLabel";

const SLUG = "natural-gas-price";
const PAGE_URL = `${SITE_URL}/${SLUG}`;
const TITLE = "Natural Gas Price (Henry Hub) — Live Rate & Trend, Pakistan Context";
const DESCRIPTION =
  "Henry Hub natural gas price — a global benchmark that shapes the cost of the LNG Pakistan imports — live, with a 10-year historical trend and an explanation of why it matters for Pakistan's energy bill.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default async function NaturalGasPage() {
  const [natGasKpi, natGasHistory] = await Promise.all([
    getNaturalGasKpi(),
    getNaturalGasHistory(),
  ]);

  const chartData: TrendPoint[] | null = natGasHistory
    ? natGasHistory.map((p) => ({ month: formatMonthLabel(p.date), value: p.close }))
    : null;

  return (
    <SeoPageLayout
      canonicalPath={`/${SLUG}`}
      title="Natural Gas Price"
      subtitle="Henry Hub natural gas futures — the US benchmark price, and a widely used reference point for the global LNG market Pakistan increasingly relies on to meet its own gas shortfall."
      kpiLabel="Natural Gas (Henry Hub, Live)"
      kpiValue={`$${natGasKpi.value}/MMBtu`}
      kpiChange={natGasKpi.change}
      kpiTrend={natGasKpi.trend}
      kpiSourceNote={`Source: ${natGasKpi.source ?? "Yahoo Finance / FRED"}${natGasKpi.latestDate ? ` · ${natGasKpi.latestDate}` : ""}`}
      kpiQuality={natGasKpi}
      chartTitle="Natural Gas (USD/MMBtu) — 10-Year Historical Trend"
      chartData={chartData}
      chartUnavailableNote="Historical chart data is currently unavailable."
      chartColor="#38bdf8"
      chartUnit=""
      chartGradientId="seoNatGasGradient"
      chartCaption="Source: Yahoo Finance, Henry Hub natural gas futures (NG=F), monthly closes."
      explanation={[
        "Henry Hub, located in Louisiana, is the pricing point that underlies the main US natural gas futures contract and one of the most widely referenced global gas benchmarks, alongside European (TTF) and Asian LNG spot prices.",
        "Pakistan's domestic natural gas fields have been in structural decline for years, forcing a growing reliance on imported Liquefied Natural Gas (LNG) to meet electricity generation, industrial, and household demand — a shortfall that has widened noticeably over the past decade.",
        "LNG cargo pricing in Asia is typically referenced against regional Asian spot benchmarks rather than Henry Hub directly, but Henry Hub remains a widely watched global gas-price signal and a rough directional indicator of broader global gas market conditions that also influence Asian LNG pricing.",
      ]}
      whyItMatters={[
        "As domestic gas production declines, Pakistan's exposure to global LNG prices grows — a sustained rise in global gas prices raises the cost of imported LNG, adding to the energy import bill alongside crude oil.",
        "Natural gas and LNG are key inputs for domestic electricity generation and fertilizer production, so global gas price swings feed through into Pakistan's power tariffs and, from there, into broader industrial costs and consumer inflation.",
      ]}
      faq={[
        {
          question: "What is the natural gas price right now?",
          answer: `Henry Hub natural gas is currently trading at $${natGasKpi.value} per MMBtu, according to ${natGasKpi.source ?? "Yahoo Finance"}.`,
        },
        {
          question: "Why does Pakistan care about a US gas benchmark like Henry Hub?",
          answer: "While Pakistan's imported LNG is typically priced against Asian regional benchmarks rather than Henry Hub directly, Henry Hub remains one of the most widely watched global natural gas price signals and correlates with broader global gas market conditions that also shape Asian LNG pricing.",
        },
        {
          question: "Why does Pakistan import so much LNG now?",
          answer: "Pakistan's domestic natural gas fields have been in structural decline for years, while demand from power generation, industry, and households has kept growing — forcing a rising reliance on imported LNG to close the gap.",
        },
      ]}
      relatedLinks={getRelatedLinks(SLUG)}
    />
  );
}
