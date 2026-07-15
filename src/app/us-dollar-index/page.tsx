import type { Metadata } from "next";
import { getDxyKpi } from "@/lib/data/metals";
import { getDxyHistory } from "@/lib/data/yfinance";
import SeoPageLayout from "@/components/seo/SeoPageLayout";
import type { TrendPoint } from "@/components/charts/TrendLineChart";
import { SITE_URL, SITE_NAME, getRelatedLinks } from "@/lib/seoConfig";
import { formatMonthLabel } from "@/lib/formatMonthLabel";

const SLUG = "us-dollar-index";
const PAGE_URL = `${SITE_URL}/${SLUG}`;
const TITLE = "US Dollar Index (DXY) — Live Rate & Trend, Pakistan Context";
const DESCRIPTION =
  "The US Dollar Index (DXY) — the Dollar's value against a basket of major currencies — live, with a 10-year historical trend and a plain-English explanation of why it matters for Pakistan's Rupee and reserves.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default async function DxyPage() {
  const [dxyKpi, dxyHistory] = await Promise.all([
    getDxyKpi(),
    getDxyHistory(),
  ]);

  const chartData: TrendPoint[] | null = dxyHistory
    ? dxyHistory.map((p) => ({ month: formatMonthLabel(p.date), value: p.close }))
    : null;

  return (
    <SeoPageLayout
      canonicalPath={`/${SLUG}`}
      title="US Dollar Index (DXY)"
      subtitle="A measure of the US Dollar's value against a basket of six major currencies (Euro, Yen, Pound, Canadian Dollar, Swedish Krona, Swiss Franc) — the standard global gauge of overall Dollar strength."
      kpiLabel="US Dollar Index (DXY)"
      kpiValue={dxyKpi.value}
      kpiChange={dxyKpi.change}
      kpiTrend={dxyKpi.trend}
      kpiSourceNote={`Source: ${dxyKpi.source ?? "Twelve Data / Yahoo Finance"}${dxyKpi.latestDate ? ` · ${dxyKpi.latestDate}` : ""}`}
      kpiQuality={dxyKpi}
      chartTitle="US Dollar Index — 10-Year Historical Trend"
      chartData={chartData}
      chartUnavailableNote="Historical chart data is currently unavailable."
      chartColor="#38bdf8"
      chartUnit=""
      chartGradientId="seoDxyGradient"
      chartCaption="Source: Yahoo Finance, ICE US Dollar Index futures (DX-Y.NYB), monthly closes."
      explanation={[
        "The US Dollar Index (DXY) tracks the Dollar's value against a fixed basket of six major currencies, heavily weighted toward the Euro. A rising DXY means the Dollar is strengthening broadly against major currencies; a falling DXY means it's weakening.",
        "DXY doesn't include the Pakistani Rupee or most emerging-market currencies directly — it's a gauge of the Dollar's strength against other major developed-market currencies, not a direct measure of USD/PKR. But because nearly all emerging-market currencies (including the Rupee) trade against the Dollar, a broadly strengthening Dollar tends to put depreciation pressure on the Rupee too, even without any change specific to Pakistan.",
        "Global commodities including oil and gold are priced in Dollars, so DXY moves also affect their prices indirectly: a stronger Dollar often (though not always) coincides with softer Dollar-denominated commodity prices, since it takes fewer Dollars to represent the same real value.",
      ]}
      whyItMatters={[
        "A broadly strengthening Dollar (rising DXY) is one of the external, Pakistan-independent forces that can add depreciation pressure on the Rupee, alongside domestic factors like the current account deficit and reserve levels.",
        "DXY is also a rough proxy for global risk appetite and US interest rate expectations — a stronger Dollar often coincides with tighter global financial conditions, which can raise the cost and difficulty of external borrowing for emerging markets like Pakistan.",
      ]}
      faq={[
        {
          question: "What is the US Dollar Index (DXY) right now?",
          answer: `The US Dollar Index currently stands at ${dxyKpi.value}, according to ${dxyKpi.source ?? "Yahoo Finance"}.`,
        },
        {
          question: "Does DXY include the Pakistani Rupee?",
          answer: "No. DXY tracks the Dollar against six major developed-market currencies (the Euro carries the largest weight), not emerging-market currencies like the Rupee. It's a gauge of overall Dollar strength, not a direct USD/PKR measure.",
        },
        {
          question: "Why does a rising DXY put pressure on the Rupee if the Rupee isn't even in the index?",
          answer: "Because the Rupee, like nearly every emerging-market currency, trades against the Dollar. When the Dollar strengthens broadly against major currencies, that strength typically extends to emerging-market pairs too, adding external depreciation pressure on the Rupee independent of any Pakistan-specific factor.",
        },
        {
          question: "How does DXY relate to gold and oil prices?",
          answer: "Gold and oil are priced internationally in Dollars, so a stronger Dollar (rising DXY) often coincides with softer Dollar prices for both commodities, and vice versa — though the relationship isn't perfectly mechanical, since commodity-specific supply and demand factors matter too.",
        },
      ]}
      relatedLinks={[
        ...getRelatedLinks(SLUG),
        { href: "/comparisons/gold-vs-usd-pkr", label: "Gold vs USD/PKR" },
      ]}
    />
  );
}
