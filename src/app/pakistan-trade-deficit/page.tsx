import type { Metadata } from "next";
import { getSbpIndicator } from "@/lib/data/sbp";
import SeoPageLayout from "@/components/seo/SeoPageLayout";
import { SITE_URL, SITE_NAME, relatedSeoLinks } from "@/lib/seoConfig";

const SLUG = "pakistan-trade-deficit";
const PAGE_URL = `${SITE_URL}/${SLUG}`;
const TITLE = "Pakistan Trade Deficit — Live Data & Analysis";
const DESCRIPTION =
  "Pakistan's monthly trade balance (exports minus imports), the 24-month trend chart, and a plain-English explanation of why Pakistan runs a persistent trade deficit.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default async function TradeDeficitPage() {
  const [tradeBalance, exports, imports] = await Promise.all([
    getSbpIndicator("tradeBalance"),
    getSbpIndicator("exports"),
    getSbpIndicator("imports"),
  ]);
  const isDeficit = parseFloat(tradeBalance.kpi.value) < 0;

  return (
    <SeoPageLayout
      canonicalPath={`/${SLUG}`}
      title="Pakistan Trade Deficit"
      subtitle="The gap between what Pakistan sells to and buys from the rest of the world in goods — exports minus imports."
      kpiLabel={`Trade Balance (Monthly) — ${isDeficit ? "Deficit" : "Surplus"}`}
      kpiValue={`${tradeBalance.kpi.value} ${tradeBalance.kpi.unit}`}
      kpiSourceNote={`Source: ${tradeBalance.kpi.source ?? "State Bank of Pakistan"}${tradeBalance.kpi.latestDate ? ` · ${tradeBalance.kpi.latestDate}` : ""}`}
      chartTitle="Trade Balance — 24-Month Trend"
      chartData={tradeBalance.trend}
      chartColor="#fb7185"
      chartUnit="B"
      chartGradientId="seoTradeBalanceGradient"
      chartCaption="Source: SBP EasyData, monthly, BPM6 balance on trade in goods."
      secondaryStats={[
        { label: "Exports", value: `$${exports.kpi.value}B` },
        { label: "Imports", value: `$${imports.kpi.value}B` },
      ]}
      explanation={[
        "The trade balance is the difference between the value of goods Pakistan exports and the value of goods it imports in a given month. A negative number is a trade deficit; a positive number is a trade surplus.",
        "Pakistan has run a trade deficit in almost every month for decades. Its export base is concentrated in textiles and apparel, while its import bill is driven by energy (oil and gas), machinery, and raw materials needed for industry.",
        "This is a narrower measure than the current account, which also includes services, income flows, and transfers like remittances — remittances in particular help offset a large share of the goods trade deficit.",
      ]}
      whyItMatters={[
        "A widening trade deficit increases demand for foreign currency to pay for imports, which has historically coincided with periods of faster Rupee depreciation and lower foreign reserves.",
        "Because Pakistan's import bill is so heavily weighted toward energy, the trade deficit is highly sensitive to global oil prices — a spike in oil prices can widen the deficit even if export volumes stay flat.",
      ]}
      faq={[
        {
          question: "Does Pakistan currently have a trade deficit?",
          answer: `Pakistan's most recent monthly trade balance is ${tradeBalance.kpi.value} ${tradeBalance.kpi.unit}, which is a ${isDeficit ? "deficit" : "surplus"} — exports were $${exports.kpi.value}B and imports were $${imports.kpi.value}B.`,
        },
        {
          question: "Why does Pakistan import more than it exports?",
          answer: "Pakistan's export base is concentrated in textiles, while its imports span energy, machinery, and raw materials for industry — a structural mismatch that has persisted for decades and isn't easily fixed by exchange rate moves alone.",
        },
        {
          question: "What's the difference between the trade deficit and the current account deficit?",
          answer: "The trade deficit only covers goods. The current account deficit is broader — it also includes services trade, income flows, and transfers like remittances, which typically offset a large share of the goods trade deficit.",
        },
        {
          question: "How does the trade deficit affect the Rupee?",
          answer: "A wider trade deficit means more demand for US Dollars to pay for imports, which puts depreciation pressure on the Rupee unless offset by inflows like remittances, foreign investment, or borrowing.",
        },
      ]}
      relatedLinks={relatedSeoLinks(SLUG, [
        "current-account-deficit-pakistan",
        "pakistan-remittances",
        "usd-pkr-exchange-rate",
      ])}
    />
  );
}
