import type { Metadata } from "next";
import { getSbpIndicator } from "@/lib/data/sbpServer";
import SeoPageLayout from "@/components/seo/SeoPageLayout";
import { SITE_URL, SITE_NAME, getRelatedLinks } from "@/lib/seoConfig";

const SLUG = "pakistan-exports";
const PAGE_URL = `${SITE_URL}/${SLUG}`;
const TITLE = "Pakistan Exports — Live Data & Trend";
const DESCRIPTION =
  "Pakistan's monthly goods exports (FOB, BPM6 basis) — live, with a 24-month trend and a plain-English explanation of why export earnings are central to Pakistan's balance-of-payments story.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default async function ExportsPage() {
  const exports_ = await getSbpIndicator("exports");

  return (
    <SeoPageLayout
      canonicalPath={`/${SLUG}`}
      title="Pakistan Exports"
      subtitle="Monthly goods exports (free-on-board value, balance-of-payments basis) — the Dollar earnings Pakistan brings in from selling goods abroad."
      kpiLabel="Goods Exports (Monthly, FOB)"
      kpiValue={`$${exports_.kpi.value}B`}
      kpiChange={exports_.kpi.change}
      kpiTrend={exports_.kpi.trend}
      kpiQuality={exports_.kpi}
      chartTitle="Exports — 24-Month Trend"
      chartData={exports_.trend}
      chartColor="#38bdf8"
      chartUnit="B"
      chartGradientId="seoExportsGradient"
      chartCaption="Source: SBP EasyData (BPM6 basis) / Pakistan Bureau of Statistics advance release, monthly."
      explanation={[
        "Pakistan's exports are dominated by textiles and apparel, which together typically account for well over half of total goods exports, followed by food (rice, in particular), leather goods, and surgical/sporting goods.",
        "This figure is reported on a free-on-board (FOB) and balance-of-payments (BPM6) basis, matching the methodology used in Pakistan's official current account statistics — the same basis Trade Balance and Current Account on this dashboard use.",
        "Pakistan's export base has historically been narrow and slow-growing relative to regional peers like Bangladesh or Vietnam, a persistent structural concern given how directly export earnings fund the country's import bill.",
      ]}
      whyItMatters={[
        "Export earnings are one of the two main sources of foreign currency inflow (alongside remittances) that Pakistan relies on to pay for its imports and service external debt — a widening gap between exports and imports (the trade deficit) is a direct driver of current account and reserve pressure.",
        "Because textiles dominate the export base, Pakistan's export earnings are unusually exposed to global cotton prices, energy costs (which feed into textile production costs), and demand conditions in key markets like the US and EU.",
      ]}
      faq={[
        {
          question: "How much does Pakistan currently export?",
          answer: `Pakistan's most recent monthly goods exports were $${exports_.kpi.value} billion (FOB, BPM6 basis), according to SBP EasyData / Pakistan Bureau of Statistics.`,
        },
        {
          question: "What does Pakistan export the most?",
          answer: "Textiles and apparel dominate Pakistan's export base, typically accounting for more than half of total goods exports, followed by food products (especially rice), leather goods, and surgical and sporting goods.",
        },
        {
          question: "Why are Pakistan's exports considered narrow compared to other countries?",
          answer: "Pakistan's export base is heavily concentrated in a small number of product categories and destination markets, historically growing more slowly than regional competitors like Bangladesh and Vietnam — a structural weakness frequently cited in discussions of the country's recurring balance-of-payments pressure.",
        },
      ]}
      relatedLinks={[
        ...getRelatedLinks(SLUG),
        { href: "/comparisons/exports-vs-imports", label: "Exports vs Imports" },
      ]}
    />
  );
}
