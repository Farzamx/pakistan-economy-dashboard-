import type { Metadata } from "next";
import { getExternalDebtHistory } from "@/lib/data/externalDebt";
import { getSbpIndicator } from "@/lib/data/sbpServer";
import SeoPageLayout from "@/components/seo/SeoPageLayout";
import type { TrendPoint } from "@/components/charts/TrendLineChart";
import { SITE_URL, SITE_NAME, getRelatedLinks } from "@/lib/seoConfig";
import { getTrendDirection } from "@/lib/trendDirection";

const SLUG = "pakistan-external-debt";
const PAGE_URL = `${SITE_URL}/${SLUG}`;
const TITLE = "Pakistan External Debt — Live Data & Analysis";
const DESCRIPTION =
  "Pakistan's total external debt and liabilities, the quarterly trend chart since 2016, and a plain-English explanation of what external debt means for the economy.";

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

export default async function ExternalDebtPage() {
  const [debt, reserves] = await Promise.all([
    getExternalDebtHistory(),
    getSbpIndicator("foreignReserves"),
  ]);

  const points = debt?.points ?? [];
  const latest = points[points.length - 1] ?? null;
  const previous = points[points.length - 2] ?? null;
  const diff = latest && previous ? latest.value - previous.value : null;

  const chartData: TrendPoint[] | null = points.length > 0
    ? points.map((p) => ({ month: formatMonthLabel(p.date), value: p.value }))
    : null;

  const reservesB = parseFloat(reserves.kpi.value);
  const coverageRatio = latest && reservesB > 0 ? latest.value / reservesB : null;

  return (
    <SeoPageLayout
      canonicalPath={`/${SLUG}`}
      title="Pakistan External Debt"
      subtitle="Total outstanding external debt and liabilities owed by Pakistan's public and private sectors to foreign creditors."
      kpiLabel="Total External Debt & Liabilities (Quarterly)"
      kpiValue={latest ? `$${latest.value.toFixed(1)}B` : "Unavailable"}
      kpiChange={diff !== null ? `${diff >= 0 ? "+" : ""}$${diff.toFixed(1)}B vs previous quarter` : undefined}
      kpiTrend={latest ? getTrendDirection(diff) : undefined}
      kpiSourceNote={
        latest
          ? `Source: SBP — quarterly, as of ${formatMonthLabel(latest.date)}${diff !== null ? ` (${diff >= 0 ? "+" : ""}$${diff.toFixed(1)}B vs previous quarter)` : ""}`
          : "Live data is temporarily unavailable — please check back shortly."
      }
      chartTitle="Total External Debt & Liabilities — Quarterly Trend"
      chartData={chartData}
      chartUnavailableNote="Historical chart data is currently unavailable."
      chartColor="#f59e0b"
      chartUnit="B"
      chartGradientId="seoExternalDebtGradient"
      chartCaption="Source: SBP, 'External Debt and Liabilities — Outstanding' (pakdebt_Arch.xls), quarterly, total of categories A through E."
      secondaryStats={
        latest && coverageRatio !== null
          ? [
              { label: "Foreign Exchange Reserves", value: `$${reservesB.toFixed(1)}B` },
              { label: "Debt-to-Reserves Ratio", value: `${coverageRatio.toFixed(1)}x` },
            ]
          : undefined
      }
      explanation={[
        "Pakistan's total external debt and liabilities figure combines everything the country's public sector (government and SBP), public sector enterprises, and private sector owe to foreign creditors — multilateral lenders like the IMF and World Bank, bilateral government loans, commercial banks, Eurobonds, and foreign direct investment-related liabilities.",
        "This is the debt stock — the total amount outstanding at a point in time — not the annual debt servicing cost (principal and interest repayments due in a given year), which is a separate, smaller figure.",
        "Pakistan's external debt has grown substantially since 2016, driven by a combination of persistent current account deficits requiring external financing, currency depreciation (which raises the Rupee value of Dollar-denominated debt), and continued borrowing to meet financing gaps.",
      ]}
      whyItMatters={[
        "A rising debt stock against flat or falling foreign exchange reserves signals growing repayment pressure relative to the buffer available to meet it — one of the most closely watched solvency signals for an emerging-market economy like Pakistan's.",
        "External debt sustainability is central to Pakistan's recurring IMF program negotiations — a debt level seen as unsustainable relative to GDP or export earnings raises the risk of a credit rating downgrade or a balance-of-payments crisis.",
      ]}
      faq={[
        {
          question: "How much external debt does Pakistan have?",
          answer: latest
            ? `Pakistan's total external debt and liabilities stood at approximately $${latest.value.toFixed(1)} billion as of ${formatMonthLabel(latest.date)}, according to the State Bank of Pakistan.`
            : "Live external debt data is temporarily unavailable — please check back shortly.",
        },
        {
          question: "What's included in Pakistan's external debt figure?",
          answer: "It includes public and government debt, debt from public sector enterprises, debt owed to the IMF, foreign exchange liabilities, public sector and banks' guaranteed debt, and private sector non-guaranteed debt — the full set of categories SBP tracks as 'external debt and liabilities.'",
        },
        {
          question: "Is external debt the same as the fiscal deficit?",
          answer: "No. The fiscal deficit measures the government's annual revenue-versus-spending gap in Rupees. External debt is the cumulative stock of money owed to foreign creditors in foreign currency, built up over many years of financing both fiscal and current account deficits.",
        },
        {
          question: "Why does a weaker Rupee increase Pakistan's external debt burden?",
          answer: "Most of Pakistan's external debt is denominated in US Dollars or other foreign currencies. When the Rupee depreciates, the same foreign-currency debt costs more in Rupee terms to service, increasing the effective domestic burden even if the Dollar amount owed hasn't changed.",
        },
      ]}
      relatedLinks={getRelatedLinks(SLUG)}
    />
  );
}
