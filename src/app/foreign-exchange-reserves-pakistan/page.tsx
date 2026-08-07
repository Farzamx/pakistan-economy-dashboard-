import type { Metadata } from "next";
import { getSbpIndicator } from "@/lib/data/sbpServer";
import { getNetLiquidReserves, getFxReservesWeeklySnapshot } from "@/lib/data/fxReserves";
import SeoPageLayout from "@/components/seo/SeoPageLayout";
import { SITE_URL, SITE_NAME, getRelatedLinks } from "@/lib/seoConfig";

const SLUG = "foreign-exchange-reserves-pakistan";
const PAGE_URL = `${SITE_URL}/${SLUG}`;
const TITLE = "Pakistan Foreign Exchange Reserves — Live Data & Analysis";
const DESCRIPTION =
  "Pakistan's current SBP foreign exchange reserves, import cover, weekly trend chart, and a plain-English explanation of why reserves matter.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

// Two distinct, both-official SBP reserve measures (Phase 6A) — never
// summed or blended together:
//   - Net Liquid SBP Reserves (weekly, Forex_Arch.xlsx): the figure
//     financial media/markets mean by "Pakistan's foreign reserves," and
//     the same figure the Economic Calendar's release alert tracks.
//   - Total SBP Reserves (monthly, EasyData Z00020): a broader IMF-template
//     figure that includes gold/SDR/IMF reserve position beyond pure
//     liquid FX — shown here as an explicitly separate reference figure.
export default async function ForeignReservesPage() {
  const [netLiquid, weekly, totalSbpReserves] = await Promise.all([
    getNetLiquidReserves(),
    getFxReservesWeeklySnapshot(),
    getSbpIndicator("foreignReserves"),
  ]);

  const netLiquidB = parseFloat(netLiquid.kpi.value);
  const totalSbpB = parseFloat(totalSbpReserves.kpi.value);

  return (
    <SeoPageLayout
      canonicalPath={`/${SLUG}`}
      title="Pakistan Foreign Exchange Reserves"
      subtitle="The hard currency (mainly US Dollars) held by the State Bank of Pakistan and commercial banks to pay for imports and foreign debt."
      kpiLabel="Net Liquid SBP Reserves"
      kpiValue={`$${netLiquidB.toFixed(1)}B`}
      kpiChange={netLiquid.kpi.change}
      kpiTrend={netLiquid.kpi.trend}
      kpiSourceNote={`Source: ${netLiquid.kpi.source ?? "State Bank of Pakistan"}${netLiquid.kpi.latestDate ? ` · ${netLiquid.kpi.latestDate}` : ""}`}
      kpiQuality={netLiquid.kpi}
      chartTitle="Net Liquid SBP Reserves — 24-Week Trend"
      chartData={netLiquid.trend}
      chartColor="#38bdf8"
      chartUnit="B"
      chartGradientId="seoReservesGradient"
      chartCaption="Source: SBP Forex_Arch.xlsx, weekly. Net liquid reserves held by SBP only — excludes commercial bank holdings. Never mixed with the monthly Total SBP Reserves series below."
      secondaryStats={[
        { label: "Commercial Bank Reserves (weekly)", value: `$${weekly.netBanksB.toFixed(1)}B` },
        { label: "Total Liquid Reserves (weekly)", value: `$${weekly.totalLiquidB.toFixed(1)}B` },
        { label: "Total SBP Reserves (monthly, incl. gold/SDR)", value: `$${totalSbpB.toFixed(1)}B` },
      ]}
      explanation={[
        "Foreign exchange reserves are the foreign currency (mainly US Dollars) and gold a central bank holds to pay for imports, service foreign debt, and stabilize the currency during periods of stress.",
        "SBP actually publishes two distinct, both-official reserve figures, and this page deliberately never blends them. 'Net Liquid SBP Reserves' is a weekly figure (published every Thursday/Friday in Forex_Arch.xlsx) and is the number financial media and markets mean by \"Pakistan's foreign reserves.\" 'Total SBP Reserves' is a broader monthly figure (EasyData, the IMF reporting template) that additionally includes gold holdings and Pakistan's SDR/IMF reserve position — it is normally somewhat higher than the net liquid figure.",
        "Pakistan's total liquid reserves combine SBP's own net liquid holdings with commercial bank foreign currency reserves. The net liquid SBP figure is the one most closely watched week-to-week by the IMF and international markets.",
        "A common way to judge reserve adequacy is 'import cover' — how many months of imports the reserves can pay for. The IMF generally considers 3 months the minimum adequate level; Pakistan briefly fell below 1 month in early 2023.",
      ]}
      whyItMatters={[
        "Reserves are Pakistan's financial safety net. When they fall too low, the country struggles to pay for essential imports (like fuel) and service its foreign debt, often triggering a currency crisis and the need for IMF support.",
        "Reserve levels above $12 billion are generally viewed as comfortable; below $8 billion is considered vulnerable, and below $4 billion has historically signaled crisis territory for Pakistan.",
      ]}
      faq={[
        {
          question: "What are Pakistan's current foreign exchange reserves?",
          answer: `Pakistan's net liquid SBP reserves currently stand at approximately $${netLiquidB.toFixed(1)} billion (weekly figure), with total liquid reserves (including commercial banks) at approximately $${weekly.totalLiquidB.toFixed(1)} billion. SBP's broader monthly reporting figure, which also includes gold and Pakistan's SDR/IMF position, is approximately $${totalSbpB.toFixed(1)} billion.`,
        },
        {
          question: "Why does this page show two different reserve figures?",
          answer: "SBP itself publishes two official measures on different schedules: a weekly net-liquid figure (the one usually reported in the news) and a broader monthly figure that also counts gold and Pakistan's IMF/SDR position. They're both correct — they just measure slightly different things — so this page shows each one clearly labeled rather than picking one or adding them together.",
        },
        {
          question: "What is import cover and why does it matter?",
          answer: "Import cover measures how many months of imports a country's reserves can pay for. The IMF's standard minimum is 3 months — Pakistan has at times fallen well below this during balance-of-payments crises.",
        },
        {
          question: "How does Pakistan build up its reserves?",
          answer: "Pakistan's reserves are supported by IMF disbursements, bilateral deposits from allies like Saudi Arabia, China, and the UAE, multilateral loans, and net export/remittance inflows.",
        },
        {
          question: "What happens when reserves run critically low?",
          answer: "Low reserves limit the central bank's ability to defend the currency and pay for essential imports, often forcing import restrictions, sharp currency depreciation, and an IMF program to secure bridge financing.",
        },
      ]}
      relatedLinks={getRelatedLinks(SLUG)}
    />
  );
}
