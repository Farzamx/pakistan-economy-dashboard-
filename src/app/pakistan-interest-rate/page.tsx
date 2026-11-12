import type { Metadata } from "next";
import Link from "next/link";
import { Disclosure, FaqAccordion } from "@/components/shell/Disclosure";
import Section from "@/components/shell/Section";
import OverviewSection from "@/components/policyRate/OverviewSection";
import HistorySection from "@/components/policyRate/HistorySection";
import DecisionsSection from "@/components/policyRate/DecisionsSection";
import CyclesSection from "@/components/policyRate/CyclesSection";
import RealRateSection from "@/components/policyRate/RealRateSection";
import InflationCompareSection from "@/components/policyRate/InflationCompareSection";
import MarketRatesSection from "@/components/policyRate/MarketRatesSection";
import InternationalSection from "@/components/policyRate/InternationalSection";
import FindingsSection from "@/components/policyRate/FindingsSection";
import MethodologySection from "@/components/policyRate/MethodologySection";
import { loadPolicyRatePageData } from "@/lib/data/policyRatePageData";
import { monthLabel } from "@/lib/inflation/periods";
import { formatDate, pct } from "@/lib/policyRate/format";
import { indicatorJsonLd, serializeJsonLd } from "@/lib/seoStructuredData";
import { SITE_URL, SITE_NAME, getRelatedLinks } from "@/lib/seoConfig";

// Pakistan Interest Rate: the indicator page, upgraded in place.
//
// Same URL, title, description, canonical and Open Graph / Twitter metadata as before; what changed is that the page below the headline
// figure is now an analytical workspace (rate history and every change, tightening and easing cycles, the real policy rate, inflation,
// market yields and the US policy rate), built the way the Inflation page is: a pure view-model builder, one loader, shared chart
// components, the canonical ledger as the source, and a stated limit wherever the data cannot support a chart.
//
// Every figure comes from the existing providers (see policyRatePageData.ts); the headline KPI is the existing canonical KPI, unchanged.

const SLUG = "pakistan-interest-rate";
const PAGE_URL = `${SITE_URL}/${SLUG}`;
const TITLE = "Pakistan Interest Rate (SBP Policy Rate) — Live Data";
const DESCRIPTION =
  "The State Bank of Pakistan's current policy interest rate, historical trend, and a plain-English explanation of how it affects loans, savings, and the economy.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

// The policy rate changes only on decision dates, but the page also shows monthly inflation and auction yields, so an hour keeps every
// figure and the freshness verdict current without re-fetching on every request.
export const revalidate = 3600;

const NAV = [
  ["overview", "Overview"],
  ["history", "History"],
  ["changes", "Rate changes"],
  ["cycles", "Cycles"],
  ["real", "Real rate"],
  ["inflation", "Inflation"],
  ["market", "Market yields"],
  ["international", "US comparison"],
  ["findings", "Findings"],
  ["methodology", "Methodology"],
  ["faq", "FAQ"],
];

// The page's original explanatory copy, kept (the meeting-frequency wording is made general: the series cannot show how many meetings held).
const EXPLANATION = [
  "Pakistan's interest rate is set by the State Bank of Pakistan's (SBP) Monetary Policy Committee, which meets on a pre-announced schedule several times a year to decide whether to raise, cut, or hold the policy rate.",
  "The policy rate is the benchmark for all lending and deposit rates in Pakistan — from KIBOR (the interbank lending rate) to mortgage rates and savings account returns.",
  "SBP raises rates to fight inflation (making borrowing more expensive cools spending) and cuts rates to stimulate growth when inflation is under control.",
];

const WHY_IT_MATTERS = [
  "The interest rate directly affects how much it costs Pakistani businesses and households to borrow money, and how much savers earn on deposits — it ripples through nearly every part of the economy.",
  "Higher rates can also help defend the Rupee by attracting foreign capital seeking better returns, which is why SBP often raises rates during periods of currency pressure, even if growth suffers in the short term.",
];

export default async function InterestRatePage() {
  const { kpi, model, generatedAt } = await loadPolicyRatePageData();
  const k = kpi.kpi;
  const s = model.stats;
  const real = model.realHeadline[model.realHeadline.length - 1] ?? null;

  const faq = [
    {
      question: "What is Pakistan's current interest rate?",
      answer: s
        ? `The State Bank of Pakistan's current policy interest rate is ${pct(s.current.value)}, in effect since ${formatDate(s.current.since)}${s.previous ? ` (it was ${pct(s.previous.value)} before that)` : ""}. This page updates automatically whenever SBP's Monetary Policy Committee announces a new decision.`
        : `The State Bank of Pakistan's current policy interest rate is ${k.value}%. This page updates automatically whenever SBP's Monetary Policy Committee announces a new decision.`,
    },
    {
      question: "How often does SBP change the interest rate?",
      answer: s
        ? `SBP's Monetary Policy Committee meets on a pre-announced schedule to review the policy rate and can also meet in an emergency. Meetings that leave the rate unchanged are not recorded in SBP's series, so the number of meetings cannot be counted here. The series records ${s.changeCount} changes between ${formatDate(s.firstDate)} and ${formatDate(s.current.since)}, in ${model.cycles.length} runs of increases or cuts.`
        : "SBP's Monetary Policy Committee meets on a pre-announced schedule to review and potentially adjust the policy rate, and can also meet in an emergency.",
    },
    {
      question: "What is KIBOR and how does it relate to the policy rate?",
      answer: "KIBOR (Karachi Interbank Offered Rate) is the rate at which banks lend to each other, and it normally trades very close to the SBP policy rate. Most variable-rate bank loans in Pakistan are priced as KIBOR plus a spread.",
    },
    {
      question: "What was Pakistan's highest-ever interest rate?",
      answer: s
        ? `In SBP's policy-rate series, which PEIC holds from ${formatDate(s.firstDate)}, the highest rate is ${pct(s.highest.value)}, from ${formatDate(s.highest.from)}${s.highest.until ? ` until ${formatDate(s.highest.until)}` : " to the present"}. The series does not cover earlier years.`
        : "The policy-rate history could not be loaded on this page load, so the highest rate in the series cannot be stated.",
    },
    {
      question: "What is the real policy rate?",
      answer: real
        ? `The real policy rate is the policy rate set against inflation that has already happened. Using headline inflation of ${pct(real.inflation, 1)} for ${monthLabel(real.month)}, it is ${pct(real.real)}. It is a backward-looking measure, not a market rate and not an expectation.`
        : "The real policy rate is the policy rate set against inflation that has already happened. It is a backward-looking measure, not a market rate and not an expectation.",
    },
  ];

  return (
    <div className="min-h-screen w-full bg-pe-bg">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(indicatorJsonLd({ title: "Pakistan Interest Rate", canonicalPath: `/${SLUG}`, faq })) }} />
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
          <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.01em] text-pe-text [text-wrap:balance] sm:text-[28px]">Pakistan Interest Rate</h1>
          <p className="mt-1.5 max-w-3xl text-[14px] leading-relaxed text-pe-text-2">
            The State Bank of Pakistan&rsquo;s (SBP) policy interest rate — the benchmark that all bank lending and deposit rates in Pakistan follow.
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

        <Section id="overview" title="Policy rate overview" description="The current rate, the latest change, the real rate and a market yield, each labelled for what it is.">
          <OverviewSection kpi={kpi} model={model} />
        </Section>

        <Section id="history" title="Historical policy-rate trend" description="Where the rate has been, and how large each move was.">
          <HistorySection model={model} />
        </Section>

        <Section id="changes" title="Rate-change history" description="Every date on which SBP's series records a new rate. Meetings that held the rate are not in the series.">
          <DecisionsSection model={model} />
        </Section>

        <Section id="cycles" title="Tightening and easing cycles" description="Runs of increases and runs of cuts, and the highest, lowest and average rate.">
          <CyclesSection model={model} />
        </Section>

        <Section id="real" title="Nominal and real policy rate" description="The policy rate set against inflation that has already happened. Ex-post, not a market or expected real rate.">
          <RealRateSection model={model} />
        </Section>

        <Section id="inflation" title="Policy rate and inflation" description="The two on one time axis, and what inflation was around each cycle — shown together, not linked.">
          <InflationCompareSection model={model} />
        </Section>

        <Section id="market" title="Policy rate and market yields" description="The policy rate beside T-bill and PIB auction yields: different instruments, kept apart.">
          <MarketRatesSection model={model} />
        </Section>

        <Section id="international" title="Pakistan and the United States" description="The one comparable policy rate PEIC holds: the US effective federal funds rate.">
          <InternationalSection model={model} />
        </Section>

        <Section id="findings" title="What the data shows" description="Facts from the figures above, each with its period and source.">
          <FindingsSection model={model} />
        </Section>

        <Section id="meaning" title="What this means, and why it matters">
          <p className="max-w-3xl text-[14px] leading-relaxed text-pe-text-2">{EXPLANATION[0]}</p>
          <Disclosure summary="How the rate is used, and why it matters" className="mt-1">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="flex flex-col gap-2">
                <h3 className="text-[13px] font-semibold text-pe-text">What this means</h3>
                {EXPLANATION.slice(1).map((t, i) => (
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
          </Disclosure>
        </Section>

        <Section id="methodology" title="Methodology and data limitations" description="Definitions, formulas, what the data covers and what it cannot show.">
          <MethodologySection model={model} generatedAt={generatedAt} relatedLinks={getRelatedLinks(SLUG)} />
        </Section>

        <Section id="faq" title="Frequently asked questions" flush>
          <FaqAccordion items={faq} />
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
