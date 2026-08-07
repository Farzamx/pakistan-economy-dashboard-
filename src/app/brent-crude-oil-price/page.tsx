import type { Metadata } from "next";
import { getBrentKpi } from "@/lib/data/fred";
import { getBrentHistory } from "@/lib/data/yfinance";
import SeoPageLayout from "@/components/seo/SeoPageLayout";
import type { TrendPoint } from "@/components/charts/TrendLineChart";
import { SITE_URL, SITE_NAME, getRelatedLinks } from "@/lib/seoConfig";
import { formatMonthLabel } from "@/lib/formatMonthLabel";

const SLUG = "brent-crude-oil-price";
const PAGE_URL = `${SITE_URL}/${SLUG}`;
const TITLE = "Brent Crude Oil Price — Live Rate & Trend, Pakistan Context";
const DESCRIPTION =
  "Brent crude oil price — the international benchmark most directly relevant to Pakistan's oil import cargoes — live, with a 10-year historical trend and an explanation of why it matters for Pakistan's import bill.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default async function BrentPage() {
  const [brentKpi, brentHistory] = await Promise.all([
    getBrentKpi(),
    getBrentHistory(),
  ]);

  const chartData: TrendPoint[] | null = brentHistory
    ? brentHistory.map((p) => ({ month: formatMonthLabel(p.date), value: p.close }))
    : null;

  return (
    <SeoPageLayout
      canonicalPath={`/${SLUG}`}
      title="Brent Crude Oil Price"
      subtitle="The North Sea-sourced international oil benchmark — the pricing reference most directly relevant to the crude cargoes Pakistan actually imports from the Gulf and beyond."
      kpiLabel="Brent Crude Oil (Live)"
      kpiValue={`$${brentKpi.value}/bbl`}
      kpiChange={brentKpi.change}
      kpiTrend={brentKpi.trend}
      kpiSourceNote={`Source: ${brentKpi.source ?? "Yahoo Finance / FRED"}${brentKpi.latestDate ? ` · ${brentKpi.latestDate}` : ""}`}
      kpiQuality={brentKpi}
      chartTitle="Brent Crude Oil (USD/bbl) — 10-Year Historical Trend"
      chartData={chartData}
      chartUnavailableNote="Historical chart data is currently unavailable."
      chartColor="#38bdf8"
      chartUnit=""
      chartGradientId="seoBrentGradient"
      chartCaption="Source: Yahoo Finance, Brent crude oil futures (BZ=F), monthly closes."
      explanation={[
        "Brent crude, sourced from North Sea oil fields, is the most widely used international oil pricing benchmark — the large majority of internationally traded crude, including cargoes shipped to South Asia, is priced with reference to Brent rather than WTI.",
        "Because Pakistan sources much of its crude and refined product imports from Gulf suppliers whose pricing formulas typically reference Brent, its price is generally the more directly relevant benchmark for Pakistan's actual energy import costs, even though WTI is more widely quoted in US financial media.",
        "Brent and WTI usually move together, tracking the same global supply and demand balance, but the spread between them can widen or narrow based on region-specific factors like US shale production levels, pipeline capacity, and Middle East supply dynamics.",
      ]}
      whyItMatters={[
        "As the benchmark most relevant to Pakistan's actual oil import pricing, sustained Brent price increases translate fairly directly into a larger energy import bill, adding pressure to the trade deficit, current account, and foreign reserves.",
        "Brent price swings feed through to domestic fuel prices and, from there, into transport costs and the broader CPI/WPI baskets — one of the most direct external channels of imported inflation into the Pakistani economy.",
      ]}
      faq={[
        {
          question: "What is the Brent crude oil price right now?",
          answer: `Brent crude oil is currently trading at $${brentKpi.value} per barrel, according to ${brentKpi.source ?? "Yahoo Finance"}.`,
        },
        {
          question: "Why might the chart below not match the live price at the top?",
          answer: "The price at the top refreshes live throughout the day. The historical chart plots monthly closing prices from Yahoo Finance futures data, so its most recent point can be up to several weeks old — it's built for viewing the long-term trend, not for reading today's price.",
        },
        {
          question: "Why is Brent more relevant to Pakistan than WTI?",
          answer: "Pakistan's crude and refined product imports, largely sourced from the Gulf, are typically priced using formulas that reference Brent rather than WTI, making Brent the more directly applicable benchmark for the country's actual energy import costs.",
        },
        {
          question: "How does the Brent price affect ordinary Pakistanis?",
          answer: "Higher Brent prices raise Pakistan's energy import bill, which feeds through into domestic petrol, diesel, and electricity prices (given oil and gas-fired generation), directly affecting transport costs and, from there, broader consumer inflation.",
        },
      ]}
      relatedLinks={getRelatedLinks(SLUG)}
    />
  );
}
