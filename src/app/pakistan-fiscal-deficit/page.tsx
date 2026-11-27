import type { Metadata } from "next";
import { getSbpIndicator } from "@/lib/data/sbpServer";
import SeoPageLayout from "@/components/seo/SeoPageLayout";
import { trendAnalysis } from "@/lib/seoAnalysis";
import { SITE_URL, SITE_NAME, getRelatedLinks } from "@/lib/seoConfig";

const SLUG = "pakistan-fiscal-deficit";
const PAGE_URL = `${SITE_URL}/${SLUG}`;
const TITLE = "Pakistan Fiscal Deficit — Live Data & Analysis";
const DESCRIPTION =
  "Pakistan's consolidated fiscal balance, the annual trend chart, and a plain-English explanation of why Pakistan runs a persistent budget deficit.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default async function FiscalDeficitPage() {
  const fiscalBalance = await getSbpIndicator("fiscalBalance");
  const isDeficit = parseFloat(fiscalBalance.kpi.value) < 0;

  return (
    <SeoPageLayout
      canonicalPath={`/${SLUG}`}
      title="Pakistan Fiscal Deficit"
      subtitle="The gap between what the government spends and what it collects in revenue, for the full fiscal year."
      kpiLabel={`Consolidated Fiscal Balance (Annual) — ${isDeficit ? "Deficit" : "Surplus"}`}
      kpiValue={`${fiscalBalance.kpi.value} ${fiscalBalance.kpi.unit}`}
      kpiChange={fiscalBalance.kpi.change}
      kpiTrend={fiscalBalance.kpi.trend}
      kpiSourceNote={`Source: ${fiscalBalance.kpi.source ?? "State Bank of Pakistan"}${fiscalBalance.kpi.latestDate ? ` · FY ${fiscalBalance.kpi.latestDate}` : ""}`}
      kpiQuality={fiscalBalance.kpi}
      chartTitle="Consolidated Fiscal Balance — Annual Trend"
      chartData={fiscalBalance.trend}
      chartColor="#38bdf8"
      chartUnit="T"
      chartGradientId="seoFiscalBalanceGradient"
      /* Annual-cadence context (Phase D.2). Grounded in seriesRegistry.ts:
         SBP EasyData reports no release date for any series
         (expectsReleaseDate = false), so PEIC holds no verified publication
         date for this one, and the annual freshness tolerance is a generous
         window rather than a schedule. Stated here so a Stale badge on a
         once-a-year series is not read as a provider failure or as a claim
         about the figure itself. The freshness verdict is unchanged. */
      chartCaption="Source: SBP EasyData, annual fiscal year, consolidated federal and provincial government balance. This series updates only once a year, so the latest observation is normally many months old. PEIC has no verified SBP publication date for it, so freshness is judged against a generous annual tolerance — a “Stale” label means that window has passed, not that the data is wrong or that the provider has failed."
      explanation={[
        "The fiscal balance is the difference between total government revenue (taxes, non-tax receipts) and total government spending (current expenditure, development spending, debt servicing) over a fiscal year (July to June in Pakistan).",
        "A negative number is a fiscal deficit — the government spent more than it collected, and the gap must be financed through domestic or external borrowing.",
        "Pakistan has run a fiscal deficit in nearly every year for decades, driven mainly by a narrow tax base, high debt-servicing costs, and large recurring current expenditure relative to revenue collection.",
      ]}
      whyItMatters={[
        "Persistent fiscal deficits force the government to borrow continuously, growing public debt and the interest burden — debt servicing is now one of the largest single items in Pakistan's federal budget.",
        "The fiscal deficit is one of the core conditions IMF programs target directly, since unsustainable deficits financed by central bank money creation or excessive borrowing feed into inflation and currency pressure.",
      ]}
      faq={[
        {
          question: "Does Pakistan currently have a fiscal deficit?",
          answer: `Pakistan's most recent consolidated fiscal balance is ${fiscalBalance.kpi.value} ${fiscalBalance.kpi.unit} for the fiscal year, which is a ${isDeficit ? "deficit" : "surplus"}.`,
        },
        {
          question: "Why does Pakistan run a fiscal deficit?",
          answer: "Pakistan's fiscal deficit is driven by a narrow tax base relative to the size of its economy, high and rising debt-servicing costs, and government spending commitments that have historically grown faster than revenue collection.",
        },
        {
          question: "How is Pakistan's fiscal deficit financed?",
          answer: "The deficit is financed through a mix of domestic borrowing (Treasury Bills, Pakistan Investment Bonds) and external borrowing (multilateral lenders like the IMF and World Bank, bilateral loans, and Eurobonds).",
        },
        {
          question: "What's the difference between the fiscal deficit and the current account deficit?",
          answer: "The fiscal deficit measures the government's own spending versus revenue gap. The current account deficit measures the whole country's international transactions. The two are related — a large fiscal deficit can spill over into a wider current account deficit — but they are measured and financed differently.",
        },
      ]}
      dataNotes={[
        { label: "Unit", value: "Pakistani rupees, trillions, for the fiscal year (July to June); a negative balance is a deficit" },
        { label: "Coverage", value: "Consolidated federal and provincial governments" },
      ]}
      methodology={[
        "The figure is the consolidated overall fiscal balance (revenue minus expenditure, including interest) as published by SBP from the Ministry of Finance's fiscal operations data. It is a full-year total, so it changes once a year.",
      ]}
      limitations={[
        "Annual data only: the latest value is normally many months old, and in-year (quarterly) fiscal operations are not shown here.",
        "Shown in rupees, not as a share of GDP; a larger rupee deficit can be a smaller share of a larger economy. The deficit is financed by borrowing, which adds to government debt.",
      ]}
      analysis={trendAnalysis(fiscalBalance.trend, { format: (v) => `Rs ${v.toFixed(2)} trillion`, subject: "the consolidated fiscal balance" })}
      relatedLinks={getRelatedLinks(SLUG)}
    />
  );
}
