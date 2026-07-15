import type { Metadata } from "next";
import { getSbpIndicator } from "@/lib/data/sbpServer";
import SeoPageLayout from "@/components/seo/SeoPageLayout";
import { SITE_URL, SITE_NAME, getRelatedLinks } from "@/lib/seoConfig";

const SLUG = "pakistan-imports";
const PAGE_URL = `${SITE_URL}/${SLUG}`;
const TITLE = "Pakistan Imports — Live Data & Trend";
const DESCRIPTION =
  "Pakistan's monthly goods imports (FOB, BPM6 basis) — live, with a 24-month trend and a plain-English explanation of why the import bill drives so much of Pakistan's external pressure.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default async function ImportsPage() {
  const imports_ = await getSbpIndicator("imports");

  return (
    <SeoPageLayout
      canonicalPath={`/${SLUG}`}
      title="Pakistan Imports"
      subtitle="Monthly goods imports (free-on-board value, balance-of-payments basis) — what Pakistan spends on goods bought from abroad, from crude oil to machinery to edible oil."
      kpiLabel="Goods Imports (Monthly, FOB)"
      kpiValue={`$${imports_.kpi.value}B`}
      kpiChange={imports_.kpi.change}
      kpiTrend={imports_.kpi.trend}
      kpiQuality={imports_.kpi}
      chartTitle="Imports — 24-Month Trend"
      chartData={imports_.trend}
      chartColor="#a855f7"
      chartUnit="B"
      chartGradientId="seoImportsGradient"
      chartCaption="Source: SBP EasyData (BPM6 basis) / Pakistan Bureau of Statistics advance release, monthly."
      explanation={[
        "Pakistan's import bill is dominated by energy (crude oil, petroleum products, and LNG), machinery and industrial equipment, and raw materials for the textile industry, alongside edible oil and other food staples.",
        "This figure is reported on a free-on-board (FOB) and balance-of-payments (BPM6) basis, matching Pakistan's official current account methodology — the same basis Trade Balance and Exports on this dashboard use.",
        "Because energy makes up such a large share of the bill, Pakistan's import spending is highly sensitive to global oil and gas prices — a global energy price spike raises the import bill even if the physical volume of oil imported doesn't change.",
      ]}
      whyItMatters={[
        "Pakistan's import bill, measured against export earnings and remittances, is the core arithmetic behind the trade deficit and current account deficit — a persistently large gap forces the country to draw down foreign reserves or borrow to make up the difference.",
        "Because energy and industrial inputs dominate imports, the import bill is also a channel through which global commodity price swings and Rupee depreciation directly raise domestic costs — imported inflation is a real and recurring feature of Pakistan's price dynamics.",
      ]}
      faq={[
        {
          question: "How much does Pakistan currently import?",
          answer: `Pakistan's most recent monthly goods imports were $${imports_.kpi.value} billion (FOB, BPM6 basis), according to SBP EasyData / Pakistan Bureau of Statistics.`,
        },
        {
          question: "What does Pakistan import the most?",
          answer: "Energy (crude oil, refined petroleum products, and LNG) is typically the largest single category, followed by machinery and industrial equipment, raw materials for textile manufacturing, and edible oil and other food staples.",
        },
        {
          question: "Why do oil price swings affect Pakistan's import bill so much?",
          answer: "Energy imports make up a large share of Pakistan's total import spending, so a rise in global oil and gas prices raises the Dollar cost of the import bill directly, even without any change in the physical quantity being imported — a key driver of current account pressure during global energy price spikes.",
        },
      ]}
      relatedLinks={[
        ...getRelatedLinks(SLUG),
        { href: "/comparisons/exports-vs-imports", label: "Exports vs Imports" },
      ]}
    />
  );
}
