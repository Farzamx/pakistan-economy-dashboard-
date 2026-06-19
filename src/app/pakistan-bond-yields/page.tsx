import type { Metadata } from "next";
import { getSbpIndicator } from "@/lib/data/sbp";
import SeoPageLayout from "@/components/seo/SeoPageLayout";
import { SITE_URL, SITE_NAME, relatedSeoLinks } from "@/lib/seoConfig";

const SLUG = "pakistan-bond-yields";
const PAGE_URL = `${SITE_URL}/${SLUG}`;
const TITLE = "Pakistan Bond Yields — T-Bills & PIBs Live Data";
const DESCRIPTION =
  "Pakistan's current 3-month T-Bill and 3-year PIB government bond yields, trend charts, and a plain-English explanation of what bond yields signal about the economy.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default async function BondYieldsPage() {
  const [tbill, pib] = await Promise.all([
    getSbpIndicator("tbillYield3m"),
    getSbpIndicator("pibYield3y"),
  ]);
  const spread = (parseFloat(pib.kpi.value) - parseFloat(tbill.kpi.value)).toFixed(2);

  return (
    <SeoPageLayout
      canonicalPath={`/${SLUG}`}
      title="Pakistan Bond Yields"
      subtitle="The interest rates the Pakistani government pays to borrow money via Treasury Bills (short-term) and Pakistan Investment Bonds (long-term)."
      kpiLabel="3-Month T-Bill Yield"
      kpiValue={`${tbill.kpi.value}%`}
      kpiSourceNote={`Source: ${tbill.kpi.source ?? "State Bank of Pakistan"}${tbill.kpi.latestDate ? ` · ${tbill.kpi.latestDate}` : ""}`}
      chartTitle="3-Month T-Bill Yield — 24-Month Trend"
      chartData={tbill.trend}
      chartColor="#38bdf8"
      chartUnit="%"
      chartGradientId="seoTbillGradient"
      chartCaption="Source: SBP EasyData, weighted average yield from periodic T-Bill auctions."
      secondaryStats={[
        { label: "3-Year PIB Yield", value: `${pib.kpi.value}%` },
        { label: "3Y − 3M Spread", value: `${spread} pp` },
      ]}
      explanation={[
        "Treasury Bills (T-Bills) are short-term government debt instruments maturing in 3, 6, or 12 months, sold at a discount and redeemed at face value. PIBs (Pakistan Investment Bonds) are longer-term, ranging from 3 to 30 years.",
        "The 3-month T-Bill yield is Pakistan's key short-term benchmark rate, closely tracking the SBP policy rate. The spread between long and short-term yields (the yield curve) reflects what markets expect for future interest rates.",
        "When PIB yields are below T-Bill yields, the curve is 'inverted' — markets expect rate cuts ahead. When PIB yields are higher, it's a 'normal' curve reflecting a stable outlook.",
      ]}
      whyItMatters={[
        "Bond yields directly affect the government's debt servicing costs — Pakistan's banking sector also holds large amounts of these securities, so yield movements significantly impact bank profitability.",
        "The yield curve shape (the 3Y-3M spread) is a useful, market-based signal of where investors expect interest rates and inflation to head over the next few years.",
      ]}
      faq={[
        {
          question: "What is Pakistan's current 3-month T-Bill yield?",
          answer: `Pakistan's 3-month T-Bill yield is currently ${tbill.kpi.value}%, based on the most recent SBP auction data.`,
        },
        {
          question: "What is the difference between a T-Bill and a PIB?",
          answer: "T-Bills are short-term (up to 12 months) government debt sold at a discount to face value. PIBs are medium-to-long-term bonds (3-30 years) that pay periodic coupon interest.",
        },
        {
          question: "What does the yield curve tell us about the economy?",
          answer: "An inverted yield curve (short-term yields above long-term yields) typically signals that markets expect interest rate cuts ahead, often associated with an economic slowdown. A normal upward-sloping curve suggests a stable outlook.",
        },
        {
          question: "Who buys Pakistani government bonds?",
          answer: "T-Bills and PIBs are primarily bought by commercial banks, though individuals can invest through Investor Portfolio Securities (IPS) accounts, and foreign investors can participate via Special Convertible Rupee Accounts.",
        },
      ]}
      relatedLinks={relatedSeoLinks(SLUG, [
        "pakistan-interest-rate",
        "pakistan-stock-market",
        "pakistan-economic-indicators",
      ])}
    />
  );
}
