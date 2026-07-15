import type { Metadata } from "next";
import { getUs10yKpi, getUs10yHistory } from "@/lib/data/fred";
import SeoPageLayout from "@/components/seo/SeoPageLayout";
import type { TrendPoint } from "@/components/charts/TrendLineChart";
import { SITE_URL, SITE_NAME, getRelatedLinks } from "@/lib/seoConfig";
import { formatMonthLabel } from "@/lib/formatMonthLabel";

const SLUG = "us-10-year-treasury-yield";
const PAGE_URL = `${SITE_URL}/${SLUG}`;
const TITLE = "US 10-Year Treasury Yield — Live Rate & Trend, Pakistan Context";
const DESCRIPTION =
  "The US 10-Year Treasury yield — the world's benchmark 'risk-free' interest rate — live, with a 10-year historical trend and an explanation of why it matters for Pakistan's borrowing costs and capital flows.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default async function Us10yPage() {
  const [us10yKpi, us10yHistory] = await Promise.all([
    getUs10yKpi(),
    getUs10yHistory(),
  ]);

  const chartData: TrendPoint[] | null = us10yHistory
    ? us10yHistory.map((p) => ({ month: formatMonthLabel(p.date), value: p.value }))
    : null;

  return (
    <SeoPageLayout
      canonicalPath={`/${SLUG}`}
      title="US 10-Year Treasury Yield"
      subtitle="The yield on 10-year US government debt — the world's reference 'risk-free' rate, against which the return investors demand for holding emerging-market assets like Pakistani bonds is ultimately measured."
      kpiLabel="US 10-Year Treasury Yield"
      kpiValue={`${us10yKpi.value}%`}
      kpiChange={us10yKpi.change}
      kpiTrend={us10yKpi.trend}
      kpiSourceNote={`Source: ${us10yKpi.source ?? "FRED / Yahoo Finance"}${us10yKpi.latestDate ? ` · ${us10yKpi.latestDate}` : ""}`}
      kpiQuality={us10yKpi}
      chartTitle="US 10-Year Treasury Yield — 10-Year Historical Trend"
      chartData={chartData}
      chartUnavailableNote="Historical chart data is currently unavailable."
      chartColor="#38bdf8"
      chartUnit=""
      chartGradientId="seoUs10yGradient"
      chartCaption="Source: FRED (Federal Reserve Economic Data), DGS10, market yield on 10-year US Treasury securities, monthly."
      explanation={[
        "The 10-year US Treasury yield is the interest rate the US government pays to borrow money for a decade, and because US government debt is considered the closest thing to a 'risk-free' asset globally, this yield serves as the baseline against which virtually every other long-term interest rate in the world is priced.",
        "When the 10-year yield rises, global investors have a more attractive, safer alternative to holding riskier assets — including emerging-market government bonds like Pakistan's own T-Bills and PIBs — which raises the yield emerging-market borrowers must offer to remain competitive for the same capital.",
        "The yield moves primarily on expectations for US Federal Reserve policy, US inflation, and US growth — largely independent of anything happening in Pakistan specifically, making it a genuinely external factor shaping Pakistan's own borrowing environment.",
      ]}
      whyItMatters={[
        "A higher US 10-year yield raises the cost of external borrowing for Pakistan, whether through Eurobond issuance or general investor appetite for emerging-market debt — a factor entirely outside Pakistan's own policy control but directly relevant to its financing costs.",
        "Rising US yields can also trigger capital outflows from emerging markets generally, as investors shift money toward the now more attractive (and safer) US Treasury market — a headwind for the Rupee and portfolio flows into Pakistan's own bond and equity markets during periods of sharp US yield increases.",
      ]}
      faq={[
        {
          question: "What is the US 10-year Treasury yield right now?",
          answer: `The US 10-Year Treasury yield currently stands at ${us10yKpi.value}%, according to ${us10yKpi.source ?? "FRED"}.`,
        },
        {
          question: "Why does a US interest rate matter for Pakistan?",
          answer: "The US 10-year yield is the global benchmark 'risk-free' rate. When it rises, international investors can earn more from the safest possible asset, raising the yield emerging-market borrowers like Pakistan must offer on their own debt to remain competitive, and often triggering capital outflows from emerging markets generally.",
        },
        {
          question: "What moves the US 10-year Treasury yield?",
          answer: "Primarily expectations for Federal Reserve policy, US inflation data, and US economic growth — factors driven by the US economy and monetary policy, largely independent of conditions in Pakistan or other emerging markets.",
        },
      ]}
      relatedLinks={getRelatedLinks(SLUG)}
    />
  );
}
