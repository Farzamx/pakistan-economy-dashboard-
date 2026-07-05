import type { Metadata } from "next";
import { getSpiHistory } from "@/lib/data/spi";
import { getSbpIndicator } from "@/lib/data/sbpServer";
import SeoPageLayout from "@/components/seo/SeoPageLayout";
import type { TrendPoint } from "@/components/charts/TrendLineChart";
import { SITE_URL, SITE_NAME, getRelatedLinks } from "@/lib/seoConfig";

const SLUG = "weekly-inflation-pakistan";
const PAGE_URL = `${SITE_URL}/${SLUG}`;
const TITLE = "Pakistan Weekly Inflation Rate (SPI) — Live YoY % & Trend";
const DESCRIPTION =
  "Pakistan's weekly inflation rate from the Sensitive Price Indicator (SPI) — the year-over-year % change, week-over-week move, historical trend, and how it compares to monthly CPI inflation.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
function formatDateLabel(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${Number(day)} ${MONTH_NAMES[Number(month) - 1]} '${year.slice(2)}`;
}

export default async function WeeklyInflationPage() {
  const [spi, cpi] = await Promise.all([
    getSpiHistory(),
    getSbpIndicator("cpiInflation"),
  ]);

  const points = spi?.points ?? [];
  const latest = points[points.length - 1] ?? null;

  // Primary chart is the YoY inflation RATE over time, not the raw index
  // level — the index itself has its own dedicated page (see relatedLinks).
  const chartData: TrendPoint[] | null = points.length > 0
    ? points.map((p) => ({ month: formatDateLabel(p.date), value: p.yoyPct }))
    : null;

  return (
    <SeoPageLayout
      canonicalPath={`/${SLUG}`}
      title="Pakistan Weekly Inflation Rate (SPI)"
      subtitle="The year-over-year inflation rate from PBS's Sensitive Price Indicator — the fastest-updating inflation signal published in Pakistan, well ahead of monthly CPI."
      kpiLabel="SPI Inflation — Combined Group, YoY"
      kpiValue={latest ? `${latest.yoyPct >= 0 ? "+" : ""}${latest.yoyPct.toFixed(2)}%` : "Unavailable"}
      kpiSourceNote={
        latest
          ? `Source: Pakistan Bureau of Statistics — published weekly, every Friday — week ended ${formatDateLabel(latest.date)}`
          : "Live data is temporarily unavailable — please check back shortly."
      }
      chartTitle="Weekly SPI Inflation Rate (YoY %) — Historical Trend"
      chartData={chartData}
      chartUnavailableNote="Historical chart data is currently unavailable."
      chartColor="#c084fc"
      chartUnit="%"
      chartGradientId="seoSpiYoyGradient"
      chartCaption="Source: Pakistan Bureau of Statistics, weekly. PBS embeds roughly the trailing 10 weeks in each release — there is no separate multi-year weekly archive file, so this chart shows the real, rolling recent history rather than an estimated longer series."
      secondaryStats={
        latest
          ? [
              { label: "Week-over-Week (Index)", value: `${latest.wowPct >= 0 ? "+" : ""}${latest.wowPct.toFixed(2)}%` },
              { label: "SPI Index Level", value: latest.value.toFixed(2) },
              { label: "CPI Inflation (Monthly, YoY)", value: `${cpi.kpi.value}%` },
            ]
          : undefined
      }
      explanation={[
        "The Sensitive Price Indicator (SPI) is a weekly price survey covering 51 essential consumer items — food staples, fuel, and household necessities — collected from 50 markets across 17 cities. The figure on this page is the year-over-year % change in that index for the 'Combined' group, which blends all income-quintile baskets into one national inflation rate.",
        "SPI's biggest advantage over CPI is speed: it's published every Friday, while headline CPI inflation comes out only once a month. That makes SPI the earliest real-time signal of price pressure building up — particularly useful for tracking volatile items like vegetables, fuel, and utilities between CPI releases.",
        latest
          ? `As of the week ended ${formatDateLabel(latest.date)}, weekly SPI inflation is running at ${latest.yoyPct >= 0 ? "+" : ""}${latest.yoyPct.toFixed(1)}% year-over-year, compared to monthly CPI inflation of ${cpi.kpi.value}%. The two measures track each other closely over time but can diverge week-to-week and month-to-month because SPI's basket is narrower (51 essential items vs. CPI's much broader consumption basket) and far more exposed to short-term swings in perishables and fuel.`
          : "SPI and CPI track similar underlying price trends over time, but SPI's narrower, more volatile basket (51 essential items, dominated by food and fuel) means it can diverge from the broader monthly CPI figure week to week.",
        "Methodologically, SPI is a Laspeyres-type fixed-basket index, recalculated weekly from freshly collected retail prices — it does not extrapolate or estimate; every weekly reading is a fresh, independent survey result from PBS field staff. The underlying index level (rather than the inflation rate shown here) has its own dedicated page — see Related Pages below.",
      ]}
      whyItMatters={[
        "Because food and fuel dominate the SPI basket, it disproportionately reflects the cost pressure felt by lower-income households — the same households CPI's 'lowest quintile' sub-index is designed to track, but available a full month sooner.",
        "Policymakers and markets watch SPI between CPI releases as an early-warning gauge — a sustained run of weekly increases often foreshadows the next monthly CPI print, before that data becomes available.",
      ]}
      faq={[
        {
          question: "What is Pakistan's current weekly inflation rate?",
          answer: latest
            ? `Pakistan's weekly SPI inflation rate (Combined group, year-over-year) is ${latest.yoyPct >= 0 ? "+" : ""}${latest.yoyPct.toFixed(2)}% for the week ended ${formatDateLabel(latest.date)}, compared to monthly CPI inflation of ${cpi.kpi.value}%.`
            : "Live SPI data is temporarily unavailable — please check back shortly.",
        },
        {
          question: "What's the difference between SPI and CPI inflation?",
          answer: "SPI is a weekly survey of 51 essential items, published every Friday by PBS. CPI is the broader, official monthly inflation measure covering the full consumption basket. SPI is faster but narrower; CPI is the standard headline inflation figure used for policy decisions.",
        },
        {
          question: "What's the difference between this page and the SPI Index page?",
          answer: "This page shows the SPI year-over-year inflation RATE (%) — how fast prices are rising. The separate SPI Index page shows the raw index level itself (base 2015-16=100), which is the underlying number the inflation rate is calculated from.",
        },
        {
          question: "Where does this data come from?",
          answer: "Every figure on this page comes directly from the Pakistan Bureau of Statistics' official weekly SPI report (an Excel file PBS publishes every Friday), discovered automatically via PBS's own public WordPress API — nothing here is estimated or scraped from page text.",
        },
      ]}
      relatedLinks={[
        ...getRelatedLinks(SLUG),
        { href: "/comparisons/inflation-vs-urban-food-inflation", label: "CPI vs Urban Food Inflation Comparison" },
      ]}
    />
  );
}
