import type { Metadata } from "next";
import { getSbpIndicator } from "@/lib/data/sbpServer";
import SeoPageLayout from "@/components/seo/SeoPageLayout";
import { SITE_URL, SITE_NAME, getRelatedLinks } from "@/lib/seoConfig";

const SLUG = "pakistan-core-inflation";
const PAGE_URL = `${SITE_URL}/${SLUG}`;
const TITLE = "Pakistan Core Inflation (NFNE) — Live Rate & Trend";
const DESCRIPTION =
  "Pakistan's urban Non-Food Non-Energy (NFNE) core inflation rate — the measure the State Bank actually targets — live, with a 24-month trend and a plain-English explanation of why it matters more than headline CPI.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default async function CoreInflationPage() {
  const core = await getSbpIndicator("coreInflation");

  return (
    <SeoPageLayout
      canonicalPath={`/${SLUG}`}
      title="Pakistan Core Inflation"
      subtitle="Urban Non-Food Non-Energy (NFNE) inflation — the underlying price trend left once volatile food and energy swings are stripped out, and the measure the State Bank actually watches for policy decisions."
      kpiLabel="Core Inflation (Urban NFNE, YoY)"
      kpiValue={`${core.kpi.value}%`}
      kpiChange={core.kpi.change}
      kpiTrend={core.kpi.trend}
      kpiQuality={core.kpi}
      chartTitle="Core Inflation (NFNE) — 24-Month Trend"
      chartData={core.trend}
      chartColor="#38bdf8"
      chartUnit="%"
      chartGradientId="seoCoreInflationGradient"
      chartCaption="Source: SBP EasyData, monthly, urban Non-Food Non-Energy CPI, year-over-year."
      explanation={[
        "Core inflation strips out food and energy prices from the headline CPI basket, because those two categories swing sharply from one month to the next for reasons that have little to do with underlying monetary conditions — a poor wheat harvest or a global oil price spike, for instance — and can obscure the real trend.",
        "Pakistan's official core measure is Non-Food Non-Energy (NFNE) inflation for urban consumers, published monthly by the Pakistan Bureau of Statistics alongside headline CPI and tracked by SBP EasyData.",
        "Because it excludes the most volatile components, core inflation moves more slowly and smoothly than headline CPI, making it a better gauge of demand-side, persistent price pressure — the kind monetary policy can actually influence.",
      ]}
      whyItMatters={[
        "The State Bank of Pakistan's Monetary Policy Committee explicitly weighs core inflation, not just headline CPI, when setting the policy rate — a headline CPI spike driven entirely by a one-off food price shock doesn't call for the same policy response as a broad-based rise in core prices.",
        "A persistent gap between core and headline inflation tells you where the pressure is actually coming from: if headline is running well above core, food/energy shocks are the main driver; if the two move together, price pressure is broad-based and harder to reverse without tighter policy.",
      ]}
      faq={[
        {
          question: "What is Pakistan's current core inflation rate?",
          answer: `Pakistan's urban Non-Food Non-Energy (NFNE) core inflation rate is currently ${core.kpi.value}% year-over-year, according to SBP EasyData / Pakistan Bureau of Statistics.`,
        },
        {
          question: "What's the difference between core inflation and CPI?",
          answer: "Headline CPI covers the full consumer basket, including food and energy — the two most volatile categories. Core (NFNE) inflation excludes both, leaving a smoother read on the underlying, demand-driven price trend that's less distorted by one-off harvest or global commodity swings.",
        },
        {
          question: "Why does the State Bank of Pakistan care about core inflation?",
          answer: "SBP's Monetary Policy Committee uses core inflation as a key input because it better reflects the kind of persistent, broad-based price pressure that interest rate policy can actually address — as opposed to a temporary food or fuel price spike that policy can't fix and shouldn't overreact to.",
        },
        {
          question: "Is core inflation usually higher or lower than headline CPI in Pakistan?",
          answer: "It varies by period. When food or energy prices are spiking (a common pattern in Pakistan given its exposure to global fuel import costs and domestic harvest volatility), headline CPI typically runs above core. When those pressures ease, the gap narrows or can reverse.",
        },
      ]}
      relatedLinks={[
        ...getRelatedLinks(SLUG),
        { href: "/comparisons/inflation-vs-core-inflation", label: "Headline vs Core Inflation" },
      ]}
    />
  );
}
