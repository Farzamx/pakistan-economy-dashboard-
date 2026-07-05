import type { Metadata } from "next";
import { getGoldKpi } from "@/lib/data/metals";
import { getGoldHistory } from "@/lib/data/yfinance";
import { getSbpIndicator } from "@/lib/data/sbpServer";
import SeoPageLayout from "@/components/seo/SeoPageLayout";
import type { TrendPoint } from "@/components/charts/TrendLineChart";
import { SITE_URL, SITE_NAME, getRelatedLinks } from "@/lib/seoConfig";

const SLUG = "gold-price-pakistan";
const PAGE_URL = `${SITE_URL}/${SLUG}`;
const TITLE = "Gold Price in Pakistan — Live Rate & Trend";
const DESCRIPTION =
  "Today's live international gold price converted to Pakistani Rupees, the 10-year historical trend, and a plain-English explanation of why gold is a popular hedge for Pakistani savers.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const TROY_OUNCE_IN_GRAMS = 31.1034768;

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
function formatMonthLabel(dateStr: string): string {
  const [year, month] = dateStr.split("-");
  return `${MONTH_NAMES[Number(month) - 1]} ${year}`;
}

export default async function GoldPricePage() {
  const [goldKpi, goldHistory, usdPkr] = await Promise.all([
    getGoldKpi(),
    getGoldHistory(),
    getSbpIndicator("usdPkr"),
  ]);

  const goldUsdPerOz = parseFloat(goldKpi.value);
  const usdPkrRate = parseFloat(usdPkr.kpi.value);
  const pkrPerGram = (goldUsdPerOz / TROY_OUNCE_IN_GRAMS) * usdPkrRate;
  const pkrPerTola = pkrPerGram * 11.6638; // 1 tola = 11.6638 grams — Pakistan's traditional gold trading unit

  const chartData: TrendPoint[] | null = goldHistory
    ? goldHistory.map((p) => ({ month: formatMonthLabel(p.date), value: p.close }))
    : null;

  return (
    <SeoPageLayout
      canonicalPath={`/${SLUG}`}
      title="Gold Price in Pakistan"
      subtitle="The international gold price, converted to Pakistani Rupees at the live USD/PKR rate — a common hedge against inflation and Rupee depreciation."
      kpiLabel="Gold (Live, International Spot Price)"
      kpiValue={`$${goldKpi.value}/oz`}
      kpiSourceNote={`Source: ${goldKpi.source ?? "Twelve Data / Yahoo Finance"}${goldKpi.latestDate ? ` · ${goldKpi.latestDate}` : ""} — global spot price, not a local Sarafa Bazaar quote`}
      kpiQuality={goldKpi}
      chartTitle="Gold (USD/oz) — 10-Year Historical Trend"
      chartData={chartData}
      chartUnavailableNote="Historical chart data is currently unavailable."
      chartColor="#fbbf24"
      chartUnit=""
      chartGradientId="seoGoldGradient"
      chartCaption="Source: Yahoo Finance, COMEX gold futures (GC=F), monthly closes."
      secondaryStats={[
        { label: "PKR per Gram (computed)", value: `₨${pkrPerGram.toLocaleString("en-PK", { maximumFractionDigits: 0 })}` },
        { label: "PKR per Tola (computed)", value: `₨${pkrPerTola.toLocaleString("en-PK", { maximumFractionDigits: 0 })}` },
        { label: "USD / PKR Used", value: `${usdPkr.kpi.value}` },
      ]}
      explanation={[
        "Gold is priced internationally in US Dollars per troy ounce. The PKR-per-gram and PKR-per-tola figures above are computed directly from that international price and the live USD/PKR exchange rate — they are not a quote from Pakistan's local Sarafa Bazaar (jewelers' market), which adds its own premiums, duties, and making charges on top of the raw metal value.",
        "Pakistan traditionally trades gold in tola (a unit equal to 11.6638 grams) alongside the metric gram and ounce, especially for jewelry and savings purposes.",
        "Because gold is Dollar-priced, a Pakistani holder's PKR-denominated gold value moves for two separate reasons: the international Dollar gold price itself, and the USD/PKR exchange rate — a depreciating Rupee mechanically raises the PKR value of gold even if the Dollar price is flat.",
      ]}
      whyItMatters={[
        "Gold is one of the most common inflation and currency hedges held by Pakistani households, alongside US Dollars and real estate — its PKR value has historically risen during periods of sharp Rupee depreciation.",
        "Because gold has no yield (unlike a bank deposit or government security), its attractiveness as an investment depends partly on how high domestic interest rates are — when Treasury Bill yields are very high, the opportunity cost of holding non-yielding gold rises.",
      ]}
      faq={[
        {
          question: "What is the gold price in Pakistan today?",
          answer: `The international gold spot price is currently $${goldKpi.value} per troy ounce, which converts to approximately ₨${pkrPerGram.toLocaleString("en-PK", { maximumFractionDigits: 0 })} per gram or ₨${pkrPerTola.toLocaleString("en-PK", { maximumFractionDigits: 0 })} per tola at the live USD/PKR rate. This is a computed conversion of the international price, not a local Sarafa Bazaar retail quote, which typically includes additional premiums.`,
        },
        {
          question: "Why does the local gold price in Pakistani markets differ from this figure?",
          answer: "Local jewelers (Sarafa Bazaar) add making charges, import duties, and dealer premiums on top of the raw international gold value, and rates can vary slightly by city. This page shows the underlying international price converted at the live exchange rate, which is the baseline that local prices are built on top of.",
        },
        {
          question: "Why do Pakistanis buy gold as an investment?",
          answer: "Gold is widely held as a hedge against both inflation and Rupee depreciation — since it's priced in Dollars, its Rupee value tends to rise when the Rupee weakens, even if the Dollar price doesn't move.",
        },
        {
          question: "How many grams are in a tola?",
          answer: "One tola equals 11.6638 grams. It's the traditional unit used for gold trading and jewelry pricing across Pakistan, India, and the broader South Asian region.",
        },
      ]}
      relatedLinks={[
        ...getRelatedLinks(SLUG),
        { href: "/comparisons/gold-vs-usd-pkr", label: "Gold vs USD/PKR" },
        { href: "/comparisons/gold-vs-treasury-bills", label: "Gold vs Treasury Bills" },
      ]}
    />
  );
}
