import type { Metadata } from "next";
import { getSbpIndicator } from "@/lib/data/sbpServer";
import SeoPageLayout from "@/components/seo/SeoPageLayout";
import { SITE_URL, SITE_NAME, getRelatedLinks } from "@/lib/seoConfig";

const SLUG = "pakistan-lsm-growth";
const PAGE_URL = `${SITE_URL}/${SLUG}`;
const TITLE = "Pakistan LSM Growth (Large Scale Manufacturing) — Live Data & Trend";
const DESCRIPTION =
  "Pakistan's Large Scale Manufacturing (LSM) growth rate — the most timely monthly gauge of industrial output — live, with a 24-month trend and a plain-English explanation of why it's watched as a GDP preview.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default async function LsmGrowthPage() {
  const lsm = await getSbpIndicator("lsm");

  return (
    <SeoPageLayout
      canonicalPath={`/${SLUG}`}
      title="Pakistan LSM Growth"
      subtitle="Large Scale Manufacturing output growth — an index tracking production across roughly three dozen major industrial subsectors, published monthly as Pakistan's most timely read on real economic activity."
      kpiLabel="LSM Growth (YoY)"
      kpiValue={`${lsm.kpi.value} ${lsm.kpi.unit}`}
      kpiChange={lsm.kpi.change}
      kpiTrend={lsm.kpi.trend}
      kpiQuality={lsm.kpi}
      chartTitle="LSM Growth — 24-Month Trend"
      chartData={lsm.trend}
      chartColor="#38bdf8"
      chartUnit=""
      chartGradientId="seoLsmGradient"
      chartCaption="Source: Pakistan Bureau of Statistics / SBP EasyData, monthly, LSM Quantum Index (base FY2015-16 = 100), year-over-year growth."
      explanation={[
        "Large Scale Manufacturing (LSM) is a quantum index tracking physical production volumes across roughly three dozen major industrial subsectors — textiles, food processing, automobiles, steel, cement, fertilizers, pharmaceuticals, and more — weighted by each sector's share of manufacturing value added.",
        "LSM excludes small-scale and informal manufacturing (a large part of Pakistan's real economy that's much harder to measure), so it's best read as a proxy for the formal, large-scale industrial sector specifically, not the entire manufacturing economy.",
        "Because it's published monthly — far more frequently than Pakistan's quarterly or annual GDP figures — LSM is the earliest hard data point analysts get each month on how the industrial side of the real economy is actually performing.",
      ]}
      whyItMatters={[
        "LSM feeds directly into the industrial component of GDP, making it one of the best early previews of how a coming GDP release is likely to look, well before that official figure is available.",
        "Because LSM covers export-oriented sectors like textiles alongside domestically-focused ones like cement and fertilizer, its sector-level breakdown (not just the headline number) can reveal whether growth is being driven by external demand, domestic construction activity, or a mix of both.",
      ]}
      faq={[
        {
          question: "What is Pakistan's current LSM growth rate?",
          answer: `Pakistan's Large Scale Manufacturing output is currently at ${lsm.kpi.value} ${lsm.kpi.unit}, according to Pakistan Bureau of Statistics / SBP EasyData.`,
        },
        {
          question: "What sectors does the LSM index cover?",
          answer: "LSM covers roughly three dozen major industrial subsectors, including textiles, food processing, automobiles, steel, cement, fertilizers, and pharmaceuticals, weighted by their share of manufacturing value added.",
        },
        {
          question: "Why is LSM watched more closely than GDP itself?",
          answer: "LSM is published monthly, while Pakistan's GDP is only reported quarterly (with the full annual figure finalized well after the fiscal year ends) — so LSM gives analysts and policymakers a much more timely, if partial, read on real economic activity between GDP releases.",
        },
        {
          question: "Does LSM cover Pakistan's entire manufacturing sector?",
          answer: "No — LSM specifically tracks large-scale, formal manufacturing. It excludes small-scale and informal manufacturing, which makes up a meaningful share of Pakistan's real economy but is much harder to measure on a timely basis.",
        },
      ]}
      relatedLinks={getRelatedLinks(SLUG)}
    />
  );
}
