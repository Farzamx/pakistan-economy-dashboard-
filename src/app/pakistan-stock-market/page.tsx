import type { Metadata } from "next";
import { getPakEtfKpi } from "@/lib/data/yfinance";
import SeoPageLayout from "@/components/seo/SeoPageLayout";
import { SITE_URL, SITE_NAME, relatedSeoLinks } from "@/lib/seoConfig";

const SLUG = "pakistan-stock-market";
const PAGE_URL = `${SITE_URL}/${SLUG}`;
const TITLE = "Pakistan Stock Market (PSX, KSE-100) — Overview & Analysis";
const DESCRIPTION =
  "An overview of the Pakistan Stock Exchange (PSX) and the KSE-100 index — what they are, how they work, and why live index data requires a commercial license.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default async function PakistanStockMarketPage() {
  const pakEtf = await getPakEtfKpi();

  return (
    <SeoPageLayout
      canonicalPath={`/${SLUG}`}
      title="Pakistan Stock Market"
      subtitle="PSX (Pakistan Stock Exchange) is Pakistan's sole stock exchange, home to the benchmark KSE-100 index and the Shariah-compliant KMI-30."
      kpiLabel={pakEtf ? "Pakistan ETF Proxy (NYSE: PAK)" : "KSE-100 Index"}
      kpiValue={pakEtf ? `$${pakEtf.value}` : "Data Unavailable"}
      kpiSourceNote={
        pakEtf
          ? `Source: Yahoo Finance — a US-listed proxy correlated with Pakistani equity performance, not the KSE-100 itself.`
          : "Live KSE-100 index data requires a commercial data license from PSX."
      }
      kpiQuality={pakEtf ?? undefined}
      chartTitle="KSE-100 Index — Live Chart"
      chartData={null}
      chartUnavailableNote="Real-time KSE-100 index data requires a commercial data license directly from PSX. This restriction applies to all free-tier financial data providers, including Yahoo Finance and TradingView — no dashboard or news site can legitimately display a live KSE-100 chart without that license. We show this honestly rather than displaying an inaccurate or stale number."
      chartColor="#38bdf8"
      chartUnit=""
      chartGradientId="seoPsxGradient"
      chartCaption="For live KSE-100 levels, visit psx.com.pk or a licensed market data terminal."
      explanation={[
        "PSX (Pakistan Stock Exchange) is Pakistan's sole stock exchange, formed in 2016 from the merger of the Karachi, Lahore, and Islamabad stock exchanges, with roots tracing back to 1947.",
        "The KSE-100 is PSX's benchmark index, tracking the 100 largest and most liquid listed companies by free-float market capitalization. Other key indices include the KSE-All Share (every listed company) and KMI-30 (Shariah-compliant, screened for Islamic finance eligibility).",
        "Banking, oil & gas exploration, cement, fertilizer, and power generation are among the most heavily weighted sectors on PSX, reflecting Pakistan's industrial structure.",
      ]}
      whyItMatters={[
        "The KSE-100 is widely used as a barometer of investor sentiment toward Pakistan's economy and is often forward-looking — rallying on rate-cut expectations or IMF program progress before economic data confirms an improvement.",
        "Investing in PSX requires opening a brokerage account with a SECP-licensed broker and a CDC (Central Depository Company) account — individuals, mutual funds, and foreign investors (via Special Convertible Rupee Accounts) all participate.",
      ]}
      faq={[
        {
          question: "Why doesn't this page show a live KSE-100 chart?",
          answer: "Real-time KSE-100 index data requires a commercial data license directly from PSX. This restriction applies to all free-tier financial data providers — we show this transparently rather than displaying an inaccurate or stale number.",
        },
        {
          question: "What is the KSE-100 index?",
          answer: "The KSE-100 is PSX's benchmark index, tracking the performance of the 100 largest and most liquid companies listed on the exchange, weighted by free-float market capitalization.",
        },
        {
          question: "What is the difference between KSE-100 and KMI-30?",
          answer: "KSE-100 includes companies regardless of Shariah compliance. KMI-30 only includes the 30 largest companies that pass Islamic finance screening, excluding conventional banks and interest-based businesses.",
        },
        {
          question: "How can I check the live KSE-100 value?",
          answer: "For live, accurate KSE-100 levels, visit the official PSX website (psx.com.pk) or a licensed financial data terminal — this is the only way to guarantee an accurate, real-time figure.",
        },
      ]}
      relatedLinks={relatedSeoLinks(SLUG, [
        "pakistan-bond-yields",
        "pakistan-economic-indicators",
        "pakistan-economic-dashboard",
      ])}
    />
  );
}
