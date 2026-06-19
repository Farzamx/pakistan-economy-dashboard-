import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";
import ComparisonWorkspace from "@/components/comparisons/ComparisonWorkspace";
import { COMPARISONS } from "@/lib/comparisons/comparisonRegistry";
import { getComparisonBundle } from "@/lib/comparisons/comparisonData";
import { getGdpSectorComposition } from "@/lib/data/worldBank";
import { getGoldHistory } from "@/lib/data/yfinance";
import { getSbpIndicatorHistory } from "@/lib/data/sbp";
import { buildAssetTimeline } from "@/lib/comparisons/performanceCalculator";
import { SITE_URL, SITE_NAME } from "@/lib/seoConfig";

const PAGE_URL = `${SITE_URL}/comparisons`;
const TITLE = "Comparisons — Pakistan Economy vs Markets, Assets & Peers";
const DESCRIPTION =
  "Live, source-attributed comparisons between Pakistan's key economic indicators, international peers, and investable assets — exchange rates, inflation, GDP growth, gold, and more.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default async function ComparisonsPage() {
  const [bundles, sectorComposition, goldHistory, usdPkrHistory, tbillHistory] = await Promise.all([
    Promise.all(COMPARISONS.map((def) => getComparisonBundle(def))),
    getGdpSectorComposition(),
    getGoldHistory(),
    getSbpIndicatorHistory("usdPkr"),
    getSbpIndicatorHistory("tbillYield3m"),
  ]);

  const sectorPoints = sectorComposition
    ? sectorComposition.agriculture.history.map((point, i) => ({
        year: point.month,
        agriculture: point.value,
        industry: sectorComposition.industry.history[i]?.value ?? null,
        services: sectorComposition.services.history[i]?.value ?? null,
      }))
    : null;

  const performanceTimeline =
    goldHistory && usdPkrHistory.points.length > 0 && tbillHistory.points.length > 0
      ? buildAssetTimeline(
          goldHistory.map((p) => ({ date: p.date, value: p.close })),
          usdPkrHistory.points,
          tbillHistory.points,
        )
      : null;

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <main className="flex-1 px-6 py-8 sm:px-10 lg:px-16">
        <ComparisonWorkspace
          bundles={bundles}
          sectorComposition={sectorPoints}
          performanceTimeline={performanceTimeline}
        />
      </main>
    </div>
  );
}
