import type { Metadata } from "next";
import { getSilverKpi } from "@/lib/data/metals";
import { getSilverHistory } from "@/lib/data/yfinance";
import { getSbpIndicator } from "@/lib/data/sbpServer";
import SeoPageLayout from "@/components/seo/SeoPageLayout";
import type { TrendPoint } from "@/components/charts/TrendLineChart";
import { SITE_URL, SITE_NAME, getRelatedLinks } from "@/lib/seoConfig";
import { formatMonthLabel } from "@/lib/formatMonthLabel";

const SLUG = "silver-price-pakistan";
const PAGE_URL = `${SITE_URL}/${SLUG}`;
const TITLE = "Silver Price in Pakistan — Live Rate & Trend";
const DESCRIPTION =
  "Today's live international silver price converted to Pakistani Rupees, the 10-year historical trend, and a plain-English explanation of silver's dual role as both a precious metal and an industrial commodity.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const TROY_OUNCE_IN_GRAMS = 31.1034768;

export default async function SilverPricePage() {
  const [silverKpi, silverHistory, usdPkr] = await Promise.all([
    getSilverKpi(),
    getSilverHistory(),
    getSbpIndicator("usdPkr"),
  ]);

  const silverUsdPerOz = parseFloat(silverKpi.value);
  const usdPkrRate = parseFloat(usdPkr.kpi.value);
  const pkrPerGram = (silverUsdPerOz / TROY_OUNCE_IN_GRAMS) * usdPkrRate;
  const pkrPerTola = pkrPerGram * 11.6638;

  const chartData: TrendPoint[] | null = silverHistory
    ? silverHistory.map((p) => ({ month: formatMonthLabel(p.date), value: p.close }))
    : null;

  return (
    <SeoPageLayout
      canonicalPath={`/${SLUG}`}
      title="Silver Price in Pakistan"
      subtitle="The international silver price, converted to Pakistani Rupees at the live USD/PKR rate — a metal held both as a lower-cost precious-metal hedge and, industrially, as a key input in electronics and solar panels."
      kpiLabel="Silver (Live, International Spot Price)"
      kpiValue={`$${silverKpi.value}/oz`}
      kpiChange={silverKpi.change}
      kpiTrend={silverKpi.trend}
      kpiSourceNote={`Source: ${silverKpi.source ?? "Twelve Data / Yahoo Finance"}${silverKpi.latestDate ? ` · ${silverKpi.latestDate}` : ""} — global spot price, not a local Sarafa Bazaar quote`}
      kpiQuality={silverKpi}
      chartTitle="Silver (USD/oz) — 10-Year Historical Trend"
      chartData={chartData}
      chartUnavailableNote="Historical chart data is currently unavailable."
      chartColor="#94a3b8"
      chartUnit=""
      chartGradientId="seoSilverGradient"
      chartCaption="Source: Yahoo Finance, COMEX silver futures (SI=F), monthly closes."
      secondaryStats={[
        { label: "PKR per Gram (computed)", value: `₨${pkrPerGram.toLocaleString("en-PK", { maximumFractionDigits: 0 })}` },
        { label: "PKR per Tola (computed)", value: `₨${pkrPerTola.toLocaleString("en-PK", { maximumFractionDigits: 0 })}` },
        { label: "USD / PKR Used", value: `${usdPkr.kpi.value}` },
      ]}
      explanation={[
        "Like gold, silver is priced internationally in US Dollars per troy ounce, and the PKR-per-gram and PKR-per-tola figures above are computed directly from that international price and the live USD/PKR exchange rate — not a local Sarafa Bazaar retail quote, which adds its own premiums and making charges.",
        "Silver differs from gold in one important way: alongside its role as a store of value, it's a genuine industrial metal, used heavily in electronics, solar panels, and other manufacturing — so its price responds to industrial demand cycles as well as to the same safe-haven and currency-hedge dynamics that drive gold.",
        "Because of this dual role, silver is typically more volatile than gold — its price swings tend to be larger in percentage terms in both directions, a pattern often summarized as silver having a higher 'beta' to gold.",
      ]}
      whyItMatters={[
        "Silver is a lower-cost entry point than gold for Pakistani households looking for a precious-metal hedge against inflation and Rupee depreciation, while carrying meaningfully higher price volatility.",
        "Because a real share of global silver demand comes from electronics and solar panel manufacturing, its price is also a rough proxy for global industrial and green-energy demand trends, not purely a monetary or currency-hedge story the way gold mostly is.",
      ]}
      faq={[
        {
          question: "What is the silver price in Pakistan today?",
          answer: `The international silver spot price is currently $${silverKpi.value} per troy ounce, which converts to approximately ₨${pkrPerGram.toLocaleString("en-PK", { maximumFractionDigits: 0 })} per gram or ₨${pkrPerTola.toLocaleString("en-PK", { maximumFractionDigits: 0 })} per tola at the live USD/PKR rate. This is a computed conversion of the international price, not a local Sarafa Bazaar retail quote.`,
        },
        {
          question: "Why is silver more volatile than gold?",
          answer: "Silver has meaningful industrial demand (electronics, solar panels) on top of its precious-metal/hedge role, which gold largely lacks. That dual demand source, combined with a smaller overall market size than gold, tends to make silver's price swing more sharply in both directions.",
        },
        {
          question: "Why does the local silver price in Pakistani markets differ from this figure?",
          answer: "As with gold, local jewelers add making charges, import duties, and dealer premiums on top of the raw international silver value, and rates can vary slightly by city. This page shows the underlying international price converted at the live exchange rate.",
        },
      ]}
      relatedLinks={[
        ...getRelatedLinks(SLUG),
        { href: "/comparisons/gold-vs-usd-pkr", label: "Gold vs USD/PKR" },
      ]}
    />
  );
}
