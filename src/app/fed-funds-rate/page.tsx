import type { Metadata } from "next";
import { getFedFundsKpi, getFedFundsHistory } from "@/lib/data/fred";
import SeoPageLayout from "@/components/seo/SeoPageLayout";
import type { TrendPoint } from "@/components/charts/TrendLineChart";
import { SITE_URL, SITE_NAME, getRelatedLinks } from "@/lib/seoConfig";
import { formatMonthLabel } from "@/lib/formatMonthLabel";

const SLUG = "fed-funds-rate";
const PAGE_URL = `${SITE_URL}/${SLUG}`;
const TITLE = "US Fed Funds Rate — Live Rate & Trend, Pakistan Context";
const DESCRIPTION =
  "The US Federal Funds effective rate — the interest rate that anchors global dollar borrowing costs — live, with a 10-year historical trend and an explanation of why Fed policy shapes Pakistan's own financial conditions.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default async function FedFundsPage() {
  const [fedFundsKpi, fedFundsHistory] = await Promise.all([
    getFedFundsKpi(),
    getFedFundsHistory(),
  ]);

  const chartData: TrendPoint[] | null = fedFundsHistory
    ? fedFundsHistory.map((p) => ({ month: formatMonthLabel(p.date), value: p.value }))
    : null;

  return (
    <SeoPageLayout
      canonicalPath={`/${SLUG}`}
      title="US Federal Funds Rate"
      subtitle="The interest rate the US Federal Reserve targets for overnight bank lending — the anchor rate for the entire global Dollar financial system, set eight times a year by the FOMC."
      kpiLabel="Fed Funds Effective Rate"
      kpiValue={`${fedFundsKpi.value}%`}
      kpiChange={fedFundsKpi.change}
      kpiTrend={fedFundsKpi.trend}
      kpiSourceNote={`Source: ${fedFundsKpi.source ?? "FRED"}${fedFundsKpi.latestDate ? ` · ${fedFundsKpi.latestDate}` : ""}`}
      kpiQuality={fedFundsKpi}
      chartTitle="Fed Funds Effective Rate — 10-Year Historical Trend"
      chartData={chartData}
      chartUnavailableNote="Historical chart data is currently unavailable."
      chartColor="#38bdf8"
      chartUnit=""
      chartGradientId="seoFedFundsGradient"
      chartCaption="Source: FRED (Federal Reserve Economic Data), DFF, Federal Funds effective rate, monthly."
      explanation={[
        "The Federal Funds Rate is the interest rate the US Federal Reserve targets for overnight lending between banks, set by the Federal Open Market Committee (FOMC) at eight scheduled meetings per year. It's the foundational policy rate that ripples through virtually every other Dollar-denominated interest rate globally.",
        "Because the US Dollar remains the dominant currency for global trade invoicing, reserves, and cross-border lending, Fed policy shifts affect financial conditions far beyond US borders — a tightening cycle in Washington raises the cost of Dollar borrowing for governments and companies worldwide, Pakistan included.",
        "The Fed Funds Rate and the US 10-Year Treasury yield are closely related but distinct: the Fed Funds Rate is the short-term policy rate the Fed directly controls, while the 10-year yield reflects market expectations for the average path of that rate (and inflation) over the coming decade.",
      ]}
      whyItMatters={[
        "A higher Fed Funds Rate tends to strengthen the Dollar and tighten global Dollar liquidity, both of which add pressure on emerging-market currencies like the Rupee and raise the cost of external borrowing for countries like Pakistan.",
        "Fed rate decisions are one of the most closely watched inputs for SBP's own Monetary Policy Committee — a wide gap between Pakistan's policy rate and the Fed Funds Rate affects the relative attractiveness of holding Rupee-denominated assets versus Dollar assets, with implications for capital flows and currency stability.",
      ]}
      faq={[
        {
          question: "What is the current US Fed Funds Rate?",
          answer: `The US Federal Funds effective rate currently stands at ${fedFundsKpi.value}%, according to ${fedFundsKpi.source ?? "FRED"}.`,
        },
        {
          question: "How does the Fed Funds Rate affect Pakistan?",
          answer: "As the anchor rate for global Dollar borrowing costs, a rising Fed Funds Rate tends to strengthen the Dollar and tighten global liquidity — both of which add depreciation pressure on the Rupee and raise the cost of external, Dollar-denominated borrowing for Pakistan.",
        },
        {
          question: "How often does the Fed change this rate?",
          answer: "The Federal Open Market Committee (FOMC) meets eight times per year on a pre-scheduled calendar and can adjust the target range at any of those meetings, based on incoming US inflation and employment data.",
        },
        {
          question: "What's the difference between the Fed Funds Rate and the US 10-Year Treasury yield?",
          answer: "The Fed Funds Rate is the short-term overnight rate the Federal Reserve directly sets. The 10-year Treasury yield is a market-determined rate reflecting investor expectations for the average Fed Funds Rate (and inflation) over the next decade — related, but not the same number.",
        },
      ]}
      relatedLinks={getRelatedLinks(SLUG)}
    />
  );
}
