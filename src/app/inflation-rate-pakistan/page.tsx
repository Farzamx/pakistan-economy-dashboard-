import type { Metadata } from "next";
import Link from "next/link";
import Section from "@/components/shell/Section";
import OverviewSection from "@/components/inflation/OverviewSection";
import HistorySection from "@/components/inflation/HistorySection";
import MeasuresSection from "@/components/inflation/MeasuresSection";
import FoodRestSection from "@/components/inflation/FoodRestSection";
import UrbanRuralSection from "@/components/inflation/UrbanRuralSection";
import GroupsSnapshotSection from "@/components/inflation/GroupsSnapshotSection";
import GroupsTimeSection from "@/components/inflation/GroupsTimeSection";
import PatternsSection from "@/components/inflation/PatternsSection";
import ComparisonLab from "@/components/inflation/ComparisonLab";
import DistributionSection from "@/components/inflation/DistributionSection";
import InternationalSection from "@/components/inflation/InternationalSection";
import PolicySection from "@/components/inflation/PolicySection";
import FindingsSection from "@/components/inflation/FindingsSection";
import MethodologySection from "@/components/inflation/MethodologySection";
import { GroupSourceStrip } from "@/components/inflation/DataSourceStatus";
import { loadInflationPageData } from "@/lib/data/inflationPageData";
import { indicatorJsonLd, serializeJsonLd } from "@/lib/seoStructuredData";
import { SITE_URL, SITE_NAME, getRelatedLinks } from "@/lib/seoConfig";

// Pakistan Inflation Rate — the indicator page, upgraded in place.
//
// Same URL, title, description, canonical, Open Graph / Twitter metadata, FAQ and
// JSON-LD as before; what changed is that the page below the headline figure is
// now an analytical workspace (history, headline vs core vs food, CPI groups and
// their contributions, seasonality, international and monetary-policy context).
//
// Every figure comes from the existing providers (see inflationPageData.ts); the
// headline and core KPI cards are the existing canonical KPIs, unchanged. Anything
// the data cannot support is omitted or labelled as a limitation, never filled in.

const SLUG = "inflation-rate-pakistan";
const PAGE_URL = `${SITE_URL}/${SLUG}`;
const TITLE = "Pakistan Inflation Rate (CPI) — Live Data & Analysis";
const DESCRIPTION =
  "Pakistan's current CPI inflation rate, 24-month trend chart, and a plain-English explanation of what drives inflation and why it matters for households and policy.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

// Until this upgrade the route was prerendered once per deploy with no revalidation,
// so a new monthly CPI release (and the freshness badge's verdict) stayed frozen
// at the last deploy's values. Every source here changes at most monthly, so an
// hour keeps the page current without re-fetching on every request.
export const revalidate = 3600;

const NAV = [
  ["overview", "Overview"],
  ["history", "History"],
  ["measures", "Headline, core, food"],
  ["food-rest", "Food vs the rest"],
  ["urban-rural", "Urban vs rural"],
  ["groups", "CPI groups"],
  ["groups-time", "Groups over time"],
  ["patterns", "Seasonality"],
  ["compare", "Compare periods"],
  ["distribution", "Distribution"],
  ["international", "International"],
  ["policy", "Policy rate"],
  ["findings", "Findings"],
  ["methodology", "Methodology"],
  ["faq", "FAQ"],
];

// The page’s original explanatory copy, kept verbatim.
const EXPLANATION = [
  "Inflation is the rate at which the general price level of goods and services rises over time, measured in Pakistan by the Consumer Price Index (CPI) — a basket of everyday items weighted by how much an average household spends on each.",
  "Pakistan's CPI is published monthly by the Pakistan Bureau of Statistics. Food typically carries the largest weight in the basket, which is why food price swings move the headline inflation number significantly.",
  "5-7% is generally considered a healthy range (close to SBP's target), 7-12% is elevated, and above 15% is crisis-level. Pakistan's inflation peaked near 38% in May 2023 during a severe currency and energy price shock.",
];

const WHY_IT_MATTERS = [
  "High inflation erodes purchasing power, making everyday life more expensive — especially for lower-income households who spend a larger share of their income on food and energy.",
  "Inflation is the primary input into the State Bank of Pakistan's interest rate decisions: rising inflation typically pushes SBP to raise its policy rate to cool demand, while falling inflation opens room for rate cuts.",
];

export default async function InflationRatePage() {
  const { headlineKpi, coreKpi, model } = await loadInflationPageData();
  const cpi = headlineKpi.kpi;

  const faq = [
    {
      question: "What is Pakistan's current inflation rate?",
      answer: `Pakistan's most recently reported CPI inflation rate is ${cpi.value}% year-over-year, based on Pakistan Bureau of Statistics data. This page updates automatically as new official data is released.`,
    },
    {
      question: "What causes inflation in Pakistan?",
      answer: "Pakistan's inflation is driven by a mix of factors: currency depreciation raising import costs (especially energy), domestic demand, administered price adjustments (electricity/gas tariffs), and global commodity prices.",
    },
    {
      question: "What is core inflation and how is it different from CPI?",
      answer: "Core inflation (Urban NFNE in Pakistan) strips out volatile food and energy prices to show the underlying, more persistent price trend — it's the figure the State Bank watches most closely before changing interest rates.",
    },
    {
      question: "How often is Pakistan's inflation data released?",
      answer: "Pakistan's CPI inflation data is released monthly by the Pakistan Bureau of Statistics, typically within the first few days of the following month.",
    },
  ];

  return (
    <div className="min-h-screen w-full bg-pe-bg">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(indicatorJsonLd({ title: "Pakistan Inflation Rate", canonicalPath: `/${SLUG}`, faq })) }}
      />
      <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-3 py-4 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/overview"
            aria-label={`Back to ${SITE_NAME}`}
            className="-ms-1.5 inline-flex items-center gap-1.5 rounded-[var(--pe-radius)] px-1.5 py-2 text-[13px] font-medium text-pe-text-2 transition-colors hover:bg-pe-surface-2 hover:text-pe-text"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
              <path d="M13 8H3M3 8L7.5 3.5M3 8L7.5 12.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {SITE_NAME}
          </Link>
          <span className="min-w-0 shrink truncate text-end font-mono text-[11px] text-pe-text-3">pakeconintel.com/{SLUG}</span>
        </div>

        <header className="border-b border-pe-border pb-4">
          <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.01em] text-pe-text [text-wrap:balance] sm:text-[28px]">Pakistan Inflation Rate</h1>
          <p className="mt-1.5 max-w-3xl text-[14px] leading-relaxed text-pe-text-2">
            The year-over-year change in consumer prices (CPI) for everyday items — food, rent, transport, and medicine.
          </p>
          <nav aria-label="On this page" className="mt-3">
            <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-[13px]">
              {NAV.map(([id, label]) => (
                <li key={id}>
                  <a href={`#${id}`} className="text-pe-accent hover:underline">{label}</a>
                </li>
              ))}
            </ul>
          </nav>
        </header>

        <Section id="overview" title="Inflation overview" description="The latest readings, what each one measures, and how fresh it is.">
          <OverviewSection headlineKpi={headlineKpi} coreKpi={coreKpi} model={model} />
        </Section>

        <Section id="history" title="Historical inflation performance" description="How the rate has moved month by month, and whether it is speeding up or slowing down.">
          <HistorySection headline={model.headline} mom={model.mom} core={model.core} food={model.food} />
        </Section>

        <Section id="measures" title="Headline vs core vs food inflation" description="Three views of the same prices: everything, the underlying trend, and food.">
          <MeasuresSection headline={model.headline} core={model.core} food={model.food} />
        </Section>

        <Section id="food-rest" title="Food and the rest of the basket" description="PBS publishes no non-food series; this splits the national basket into food and everything else from PBS&rsquo;s own group data.">
          <div className="flex flex-col gap-4">
            <GroupSourceStrip source={model.groupSource} />
            <FoodRestSection groups={model.groups} />
          </div>
        </Section>

        <Section id="urban-rural" title="Urban vs rural inflation" description="A comparison PEIC cannot yet make — and why.">
          <UrbanRuralSection />
        </Section>

        <Section id="groups" title="CPI expenditure groups: what is driving inflation" description="Twelve PBS groups, three different numbers each — rate, basket weight and contribution — kept apart.">
          <div className="flex flex-col gap-4">
            <GroupSourceStrip source={model.groupSource} />
            <GroupsSnapshotSection groups={model.groups} snapshot={model.snapshot} />
          </div>
        </Section>

        <Section id="groups-time" title="CPI groups over time" description="Heatmap, contributions and trends for every group.">
          <div className="flex flex-col gap-4">
            <GroupSourceStrip source={model.groupSource} />
            <GroupsTimeSection groups={model.groups} />
          </div>
        </Section>

        <Section id="patterns" title="Inflation heatmap: month by year" description="Which months and years stand out, at a glance.">
          <PatternsSection headline={model.headline} mom={model.mom} />
        </Section>

        <Section id="compare" title="Compare any two months" description="Pick two dates and see how each measure moved between them.">
          <ComparisonLab headline={model.headline} core={model.core} food={model.food} groups={model.groups} />
        </Section>

        <Section id="distribution" title="Distribution and volatility" description="How often inflation has been at each level, and which groups swing the most.">
          <DistributionSection headline={model.headline} core={model.core} food={model.food} groups={model.groups} />
        </Section>

        <Section id="international" title="Pakistan and regional peers" description="Annual consumer-price inflation: Pakistan, India, Bangladesh and Sri Lanka, one World Bank indicator.">
          <InternationalSection intl={model.intl} monthlyHeadline={model.headline} />
        </Section>

        <Section id="policy" title="Inflation and the SBP policy rate" description="The two series on one time axis — shown together, not linked.">
          <PolicySection headline={model.headline} core={model.core} policy={model.policy} horizon={model.horizon} />
        </Section>

        <Section id="findings" title="What the data shows" description="Facts from the figures above, each with its period and source.">
          <FindingsSection model={model} />
        </Section>

        <Section id="meaning" title="What this means, and why it matters">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-2">
              <h3 className="text-[13px] font-semibold text-pe-text">What this means</h3>
              {EXPLANATION.map((t, i) => (
                <p key={i} className="text-[14px] leading-relaxed text-pe-text-2">{t}</p>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-[13px] font-semibold text-pe-text">Why it matters</h3>
              {WHY_IT_MATTERS.map((t, i) => (
                <p key={i} className="text-[14px] leading-relaxed text-pe-text-2">{t}</p>
              ))}
            </div>
          </div>
        </Section>

        <Section id="methodology" title="Methodology and data limitations" description="Definitions, formulas, what the data covers and what it cannot show.">
          <MethodologySection model={model} relatedLinks={getRelatedLinks(SLUG)} />
        </Section>

        <Section id="faq" title="Frequently asked questions" flush>
          <dl className="divide-y divide-pe-border">
            {faq.map((item, i) => (
              <div key={i} className="px-4 py-3">
                <dt className="text-[14px] font-medium text-pe-text">{item.question}</dt>
                <dd className="mt-1 text-[14px] leading-relaxed text-pe-text-2">{item.answer}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <div className="my-4 flex justify-center">
          <Link href="/overview" className="inline-flex items-center gap-2 rounded-[var(--pe-radius)] border border-pe-border bg-pe-surface px-4 py-2 text-[13px] font-medium text-pe-accent transition-colors hover:bg-pe-surface-2">
            Open the full dashboard →
          </Link>
        </div>
      </div>
    </div>
  );
}
