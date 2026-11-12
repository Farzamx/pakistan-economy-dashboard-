import type { Metadata } from "next";
import Link from "next/link";
import BondFindings from "@/components/bonds/BondFindings";
import BondMethodology from "@/components/bonds/BondMethodology";
import BondWorkshop from "@/components/bonds/BondWorkshop";
import { FaqAccordion } from "@/components/shell/Disclosure";
import Section from "@/components/shell/Section";
import { getSbpIndicatorHistory } from "@/lib/data/sbpServer";
import { buildBondInsights, buildMethodFacts, buildSnapshot, dataFreshness } from "@/lib/bonds/snapshot";
import { getExcludedRows, getPibAuctions, getProvenance, getTBillAuctions } from "@/lib/bonds/dataset";
import { shapeRegimes, slopeSeries } from "@/lib/bonds/analytics";
import type { DatedPoint } from "@/lib/policyRate/dateSeries";
import { formatDate } from "@/lib/policyRate/format";
import { indicatorJsonLd, serializeJsonLd } from "@/lib/seoStructuredData";
import { SITE_URL, SITE_NAME, getRelatedLinks } from "@/lib/seoConfig";

// Pakistan Bond Yields: the indicator page, upgraded in place into an analytical workshop.
//
// Same URL and canonical as before. The data is SBP's own auction archives (src/data/govSecAuctions.ts, built by scripts/buildGovSecAuctions.ts), which carry
// every tenor, the cut-off and weighted-average yields and the offered and accepted amounts: what the ledger's two series (3-month T-bill, 3-year PIB) cannot.
// The policy rate, for the comparison, is read from the existing ledger path. Nothing here writes to a database or calls an ingestion script.

const SLUG = "pakistan-bond-yields";
const PAGE_URL = `${SITE_URL}/${SLUG}`;
const TITLE = "Pakistan Government Bond Yields: T-Bills and PIBs";
const DESCRIPTION =
  "Pakistan T-bill and PIB auction yields since 2014: an interactive yield curve explorer, how the curve's shape has changed, auction demand and the SBP policy rate. From the State Bank of Pakistan's auction archives.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

// Auctions are fortnightly and the archive is refreshed by hand, so an hour keeps the freshness verdict current without re-reading anything on every request.
export const revalidate = 3600;

const NAV = [
  ["latest", "Latest"],
  ["curve", "Curve explorer"],
  ["history", "History"],
  ["term", "Curve shape"],
  ["auctions", "Auctions"],
  ["findings", "Findings"],
  ["sources", "Sources"],
  ["faq", "FAQ"],
] as const;

/** SBP policy-rate history (one point per change), or null if the ledger cannot supply it. A static snapshot standing in for the ledger counts as unavailable. */
async function loadPolicy(): Promise<DatedPoint[] | null> {
  try {
    const h = await getSbpIndicatorHistory("policyRate");
    if (h.meta.sourceStatus === "fallback" || h.points.length === 0) return null;
    return h.points.map((p) => ({ date: p.date, value: p.value }));
  } catch (err) {
    console.error(`[BondYieldsPage] policy-rate history failed: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

export default async function BondYieldsPage() {
  const tbills = getTBillAuctions();
  const pibs = getPibAuctions();
  const policy = await loadPolicy();
  const provenance = getProvenance();
  const now = new Date().toISOString().slice(0, 10);

  const snapshot = {
    cutoff: buildSnapshot({ tbills, pibs, policy, def: "cutoff" }),
    wa: buildSnapshot({ tbills, pibs, policy, def: "wa" }),
  };
  const insights = buildBondInsights({ tbills, pibs, policy, def: "cutoff" });
  const facts = buildMethodFacts(tbills, pibs);
  const freshness = dataFreshness(provenance.retrievedOn, now, tbills, pibs);
  const three = snapshot.cutoff.find((t) => t.key === "t3m");
  const slopes = slopeSeries(tbills, "cutoff");
  const invertedCount = slopes.filter((s) => s.shape === "inverted").length;
  const longestInverted = shapeRegimes(slopes).filter((r) => r.shape === "inverted").sort((a, b) => b.auctions - a.auctions)[0];

  const faq = [
    {
      question: "What is Pakistan's current 3-month T-bill yield?",
      answer: three ? `The 3-month T-bill cleared at a cut-off yield of ${three.value} at SBP's auction on ${three.period.replace("Auction ", "")}. This page shows auction results, so it changes every two weeks, when SBP holds a T-bill auction.` : "The auction data could not be loaded.",
    },
    {
      question: "What is the difference between a T-bill and a PIB?",
      answer: "T-bills are short-term government debt (1, 3, 6 or 12 months) sold at a discount to face value. Pakistan Investment Bonds (PIBs) are longer-term fixed-coupon bonds (2 to 15 years in the auctions shown here) that pay interest every six months.",
    },
    {
      question: "What does an inverted yield curve mean?",
      answer: `It means shorter-term securities yielded more than longer-term ones at that auction. In this archive the T-bill curve (12-month against 3-month) was inverted at ${invertedCount} of ${slopes.length} auctions with a slope${longestInverted ? `, most persistently for ${longestInverted.auctions} auctions from ${formatDate(longestInverted.from)} to ${formatDate(longestInverted.to)}` : ""}. It describes the auction results; it is not a forecast.`,
    },
    {
      question: "Are these market yields?",
      answer: "They are primary-market auction results: the yields at which SBP accepted bids on the auction day. They are not secondary-market quotes and not the PKRV curve, which are different series.",
    },
    {
      question: "Who sets the yield at an auction?",
      answer: "Banks and other bidders submit competitive bids; SBP accepts bids up to its target and the highest accepted yield is the cut-off yield. Non-competitive bids, including those of provincial governments, are accepted at the resulting price.",
    },
  ];

  const related = getRelatedLinks(SLUG).slice(0, 3).map((l) => ({ href: l.href, label: l.label }));

  return (
    <div className="min-h-screen w-full bg-pe-bg">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(indicatorJsonLd({ title: "Pakistan Bond Yields", canonicalPath: `/${SLUG}`, faq })) }} />
      <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-3 py-4 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/overview"
            aria-label={`Back to ${SITE_NAME}`}
            className="-ms-1.5 inline-flex items-center gap-1.5 rounded-[var(--pe-radius)] px-1.5 py-2 text-[13px] font-medium text-pe-text-2 transition-colors hover:bg-pe-surface-2 hover:text-pe-text"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
              <path d="M13 8H3M3 8L7.5 3.5M3 8L7.5 12.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {SITE_NAME}
          </Link>
          <span className="min-w-0 shrink truncate text-end font-mono text-[11px] text-pe-text-3">pakeconintel.com/{SLUG}</span>
        </div>

        <header className="border-b border-pe-border pb-4">
          <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.01em] text-pe-text [text-wrap:balance] sm:text-[28px]">Pakistan Bond Yields</h1>
          <p className="mt-1.5 max-w-3xl text-[14px] leading-relaxed text-pe-text-2">What the government pays to borrow, from SBP&rsquo;s T-bill and PIB auctions.</p>
          <nav aria-label="On this page" className="mt-3">
            <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-[13px]">
              {NAV.map(([id, label]) => (
                <li key={id}>
                  <a href={`#${id}`} className="text-pe-accent hover:underline">{label}</a>
                </li>
              ))}
            </ul>
          </nav>
        </header>

        <BondWorkshop tbills={tbills} pibs={pibs} policy={policy} snapshot={snapshot} freshness={freshness} />

        <Section id="findings" title="What the auctions show" description="Computed from the data above. Open a finding for its figures.">
          <BondFindings insights={insights} />
        </Section>

        {facts && (
          <Section id="sources" title="Sources and method">
            <BondMethodology facts={facts} retrievedOn={provenance.retrievedOn} sources={provenance.sources} excluded={getExcludedRows()} related={related} />
          </Section>
        )}

        <Section id="faq" title="Questions" flush>
          <FaqAccordion items={faq} />
        </Section>

        <div className="my-4 flex justify-center">
          <Link href="/overview" className="inline-flex items-center gap-2 rounded-[var(--pe-radius)] border border-pe-border bg-pe-surface px-4 py-2 text-[13px] font-medium text-pe-text transition-colors hover:bg-pe-surface-2">
            Open the full dashboard →
          </Link>
        </div>
      </div>
    </div>
  );
}
