import type { Metadata } from "next";
import { getSpiHistory } from "@/lib/data/spi";
import SeoPageLayout from "@/components/seo/SeoPageLayout";
import type { TrendPoint } from "@/components/charts/TrendLineChart";
import { SITE_URL, SITE_NAME, relatedSeoLinks } from "@/lib/seoConfig";

const SLUG = "spi-index-pakistan";
const PAGE_URL = `${SITE_URL}/${SLUG}`;
const TITLE = "Pakistan SPI Index — Live Sensitive Price Indicator Level";
const DESCRIPTION =
  "Pakistan's raw Sensitive Price Indicator (SPI) level from the Bureau of Statistics, base 2015-16=100 — the underlying index level, week-over-week and year-over-year change, and historical trend.";

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

export default async function SpiIndexPage() {
  const spi = await getSpiHistory();

  const points = spi?.points ?? [];
  const latest = points[points.length - 1] ?? null;
  const previous = points[points.length - 2] ?? null;
  const indexDiff = latest && previous ? latest.value - previous.value : null;

  // This page is the raw index LEVEL — the companion
  // /weekly-inflation-pakistan page shows the YoY % inflation rate
  // computed from this same index.
  const chartData: TrendPoint[] | null = points.length > 0
    ? points.map((p) => ({ month: formatDateLabel(p.date), value: p.value }))
    : null;

  return (
    <SeoPageLayout
      canonicalPath={`/${SLUG}`}
      title="Pakistan SPI Index"
      subtitle="The raw level of PBS's weekly Sensitive Price Indicator — base 2015-16=100 — the underlying index that the SPI inflation rate is calculated from."
      kpiLabel="SPI Index — Combined Group (Base 2015-16=100)"
      kpiValue={latest ? latest.value.toFixed(2) : "Unavailable"}
      kpiSourceNote={
        latest
          ? `Source: Pakistan Bureau of Statistics — published weekly, every Friday — week ended ${formatDateLabel(latest.date)}${indexDiff !== null ? ` (${indexDiff >= 0 ? "+" : ""}${indexDiff.toFixed(2)} vs previous week)` : ""}`
          : "Live data is temporarily unavailable — please check back shortly."
      }
      chartTitle="SPI Index Level — Historical Trend"
      chartData={chartData}
      chartUnavailableNote="Historical chart data is currently unavailable."
      chartColor="#a855f7"
      chartUnit=""
      chartGradientId="seoSpiIndexGradient"
      chartCaption="Source: Pakistan Bureau of Statistics, weekly. PBS embeds roughly the trailing 10 weeks in each release — there is no separate multi-year weekly archive file, so this chart shows the real, rolling recent history rather than an estimated longer series."
      secondaryStats={
        latest
          ? [
              { label: "Week-over-Week", value: `${latest.wowPct >= 0 ? "+" : ""}${latest.wowPct.toFixed(2)}%` },
              { label: "Year-over-Year", value: `${latest.yoyPct >= 0 ? "+" : ""}${latest.yoyPct.toFixed(2)}%` },
            ]
          : undefined
      }
      explanation={[
        "The SPI index is a fixed-basket price index — base 2015-16=100 — tracking the cost of 51 essential items across 17 cities. A reading of, say, 357 means that basket of goods now costs 3.57 times what it cost in the 2015-16 base period.",
        "The index level itself isn't very meaningful in isolation; what matters is how it changes — week-over-week for short-term moves, or year-over-year for the inflation rate. That inflation rate has its own dedicated page (see Related Pages below) since it's the figure most people actually want.",
        "PBS recalculates this index every week from freshly collected retail prices across 50 markets — it is not estimated, interpolated, or projected between releases.",
      ]}
      whyItMatters={[
        "The raw index is the base every other SPI figure is derived from — the week-over-week and year-over-year % changes shown elsewhere on this dashboard are both computed directly from this index level.",
        "Tracking the index itself (rather than just the inflation rate) lets you see exactly how far prices have risen in absolute index terms since the 2015-16 base period, not just the most recent rate of change.",
      ]}
      faq={[
        {
          question: "What is Pakistan's current SPI index level?",
          answer: latest
            ? `Pakistan's most recent Weekly Sensitive Price Indicator (Combined group) is ${latest.value.toFixed(2)} (base 2015-16=100), for the week ended ${formatDateLabel(latest.date)}.`
            : "Live SPI index data is temporarily unavailable — please check back shortly.",
        },
        {
          question: "What does the SPI index base of 2015-16=100 mean?",
          answer: "PBS sets the average price level during the 2015-16 base period equal to 100. An index value of 357, for example, means prices for the SPI basket have risen roughly 257% since that base period.",
        },
        {
          question: "What's the difference between this page and the Weekly Inflation Rate page?",
          answer: "This page shows the raw SPI index level itself. The separate Weekly Inflation Rate (SPI) page shows the year-over-year % change in this same index — the actual inflation rate most people are looking for.",
        },
        {
          question: "Where does this data come from?",
          answer: "Every figure on this page comes directly from the Pakistan Bureau of Statistics' official weekly SPI report (an Excel file PBS publishes every Friday), discovered automatically via PBS's own public WordPress API — nothing here is estimated or scraped from page text.",
        },
      ]}
      relatedLinks={[
        { href: "/weekly-inflation-pakistan", label: "Weekly Inflation Rate (SPI %)" },
        ...relatedSeoLinks(SLUG, ["inflation-rate-pakistan", "pakistan-food-inflation"]),
      ]}
    />
  );
}
