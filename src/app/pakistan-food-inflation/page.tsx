import type { Metadata } from "next";
import { getFoodInflationUrbanHistory, getSbpIndicator } from "@/lib/data/sbpServer";
import SeoPageLayout from "@/components/seo/SeoPageLayout";
import type { TrendPoint } from "@/components/charts/TrendLineChart";
import { SITE_URL, SITE_NAME, getRelatedLinks } from "@/lib/seoConfig";

const SLUG = "pakistan-food-inflation";
const PAGE_URL = `${SITE_URL}/${SLUG}`;
const TITLE = "Pakistan Food Inflation — Live Data & Analysis";
const DESCRIPTION =
  "Pakistan's urban food price inflation rate, the historical trend chart, and a plain-English explanation of why food prices matter for households and the headline inflation number.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
function formatMonthLabel(dateStr: string): string {
  const [year, month] = dateStr.split("-");
  return `${MONTH_NAMES[Number(month) - 1]} ${year}`;
}

export default async function FoodInflationPage() {
  const [foodInflation, headlineCpi] = await Promise.all([
    getFoodInflationUrbanHistory(),
    getSbpIndicator("cpiInflation"),
  ]);

  const points = foodInflation?.points ?? [];
  const latest = points[points.length - 1] ?? null;
  const previous = points[points.length - 2] ?? null;
  const diff = latest && previous ? latest.value - previous.value : null;

  const chartData: TrendPoint[] | null = points.length > 0
    ? points.map((p) => ({ month: formatMonthLabel(p.date), value: p.value }))
    : null;

  return (
    <SeoPageLayout
      canonicalPath={`/${SLUG}`}
      title="Pakistan Food Inflation"
      subtitle="How fast urban food prices are rising year-over-year — the component of inflation that hits household budgets most directly."
      kpiLabel="Urban Food CPI Inflation (YoY)"
      kpiValue={latest ? `${latest.value.toFixed(1)}%` : "Unavailable"}
      kpiSourceNote={
        latest
          ? `Source: SBP EasyData — monthly, as of ${formatMonthLabel(latest.date)}${diff !== null ? ` (${diff >= 0 ? "+" : ""}${diff.toFixed(1)} pp vs previous month)` : ""}`
          : "Live data is temporarily unavailable — please check back shortly."
      }
      chartTitle="Urban Food Inflation — Historical Trend"
      chartData={chartData}
      chartUnavailableNote="Historical chart data is currently unavailable."
      chartColor="#34d399"
      chartUnit="%"
      chartGradientId="seoFoodInflationGradient"
      chartCaption="Source: SBP EasyData, monthly, Urban Food CPI year-over-year. SBP publishes Urban and Rural food CPI separately — there is no single National Food CPI series."
      secondaryStats={[
        { label: "Headline CPI Inflation", value: `${headlineCpi.kpi.value}%` },
      ]}
      explanation={[
        "Food inflation measures how fast the prices of food items — wheat, rice, vegetables, meat, cooking oil, and other staples — are rising compared to a year earlier, specifically in urban areas.",
        "SBP's EasyData platform publishes food CPI inflation separately for urban and rural areas; there is no single national food CPI series, so this page uses the verified Urban series rather than estimating a blended national figure.",
        "Food typically carries a heavy weight in Pakistan's overall CPI basket, especially for lower-income households, which means swings in food prices can move the headline inflation number significantly even when other categories are stable.",
      ]}
      whyItMatters={[
        "Food inflation disproportionately affects lower-income households, who spend a much larger share of their budget on food than wealthier households — making it a key driver of the cost-of-living burden and a politically sensitive indicator.",
        "When food inflation runs well above core inflation, it signals that supply shocks (poor harvests, supply chain disruption, fuel costs feeding into transport) are driving price pressure, rather than broad-based demand — a distinction that matters for how the State Bank responds with interest rates.",
      ]}
      faq={[
        {
          question: "What is Pakistan's current food inflation rate?",
          answer: latest
            ? `Pakistan's urban food CPI inflation rate is ${latest.value.toFixed(1)}% year-over-year as of ${formatMonthLabel(latest.date)}, compared to headline CPI inflation of ${headlineCpi.kpi.value}%.`
            : "Live food inflation data is temporarily unavailable — please check back shortly.",
        },
        {
          question: "Why does this page show 'Urban' food inflation specifically?",
          answer: "SBP's EasyData platform publishes food CPI inflation separately for urban and rural areas only — there is no single national food CPI series. This page uses the verified Urban series rather than estimating a blended national figure.",
        },
        {
          question: "Why is food inflation often different from headline inflation?",
          answer: "Headline CPI inflation covers the full consumption basket — housing, transport, utilities, and more — while food inflation isolates just food and beverage prices, which can move sharply due to harvest conditions, global commodity prices, and supply disruptions independent of the rest of the economy.",
        },
        {
          question: "What drives food inflation in Pakistan?",
          answer: "Key drivers include domestic harvest yields (especially wheat and other staples), global commodity prices for imported items like edible oil, fuel costs that feed into transport and farming input prices, and exchange rate movements that affect the cost of imported food.",
        },
      ]}
      relatedLinks={getRelatedLinks(SLUG)}
    />
  );
}
