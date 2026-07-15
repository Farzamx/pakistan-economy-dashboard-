import type { Metadata } from "next";
import { getSbpIndicator } from "@/lib/data/sbpServer";
import SeoPageLayout from "@/components/seo/SeoPageLayout";
import { SITE_URL, SITE_NAME, getRelatedLinks } from "@/lib/seoConfig";

const SLUG = "pakistan-private-credit-growth";
const PAGE_URL = `${SITE_URL}/${SLUG}`;
const TITLE = "Pakistan Private Sector Credit Growth — Live Data & Trend";
const DESCRIPTION =
  "Growth in bank lending to Pakistan's private sector — a leading indicator of business investment and consumer activity — live, with a 24-month trend and a plain-English explanation of why interest rates drive it.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default async function PrivateCreditGrowthPage() {
  const credit = await getSbpIndicator("privateCreditGrowth");

  return (
    <SeoPageLayout
      canonicalPath={`/${SLUG}`}
      title="Pakistan Private Sector Credit Growth"
      subtitle="Year-over-year growth in bank lending to private businesses and consumers — a direct read on how willing (and able) Pakistan's private sector is to borrow, invest, and spend."
      kpiLabel="Private Sector Credit Growth (YoY)"
      kpiValue={`${credit.kpi.value}%`}
      kpiChange={credit.kpi.change}
      kpiTrend={credit.kpi.trend}
      kpiQuality={credit.kpi}
      chartTitle="Private Sector Credit Growth — 24-Month Trend"
      chartData={credit.trend}
      chartColor="#a855f7"
      chartUnit="%"
      chartGradientId="seoPrivateCreditGradient"
      chartCaption="Source: SBP EasyData, weekly, credit to private sector, year-over-year growth."
      explanation={[
        "Private sector credit measures bank lending to private businesses and households — working capital loans, fixed investment financing, consumer loans, and mortgages — as distinct from government borrowing, which draws on the same banking system's balance sheet.",
        "Credit growth reflects both sides of a lending relationship: how much businesses and consumers want to borrow (demand, driven partly by growth expectations and the cost of borrowing), and how willing banks are to lend it (supply, shaped by their own balance sheet health and perceived risk).",
        "Pakistan's policy rate is one of the single biggest levers on this number — private credit growth has historically slowed sharply during high-interest-rate periods and picked back up once the State Bank begins cutting.",
      ]}
      whyItMatters={[
        "Private credit growth is a leading indicator of real investment and consumption activity — businesses expanding capacity and households financing large purchases both show up here well before the effect reaches GDP or LSM figures.",
        "A common concern in Pakistan's banking sector is 'crowding out': when government borrowing needs are large, banks can find it more attractive and less risky to lend to the government (via T-Bills and PIBs) than to private businesses, which can suppress private credit growth even when banks have ample funds to lend.",
      ]}
      faq={[
        {
          question: "What is Pakistan's current private sector credit growth rate?",
          answer: `Pakistan's private sector credit is currently growing at ${credit.kpi.value}% year-over-year, according to SBP EasyData.`,
        },
        {
          question: "Why does the policy rate affect private credit growth so much?",
          answer: "A higher policy rate raises the cost of borrowing across the economy, discouraging businesses and consumers from taking on new loans, while also making government securities (T-Bills, PIBs) a more attractive, lower-risk option for banks than private lending — both effects slow private credit growth.",
        },
        {
          question: "What is 'crowding out' and how does it relate to private credit?",
          answer: "Crowding out describes a situation where heavy government borrowing from the banking system (via T-Bill and PIB auctions) absorbs funds and bank attention that might otherwise go to private-sector lending, potentially suppressing private credit growth even when the sector wants to borrow.",
        },
      ]}
      relatedLinks={getRelatedLinks(SLUG)}
    />
  );
}
