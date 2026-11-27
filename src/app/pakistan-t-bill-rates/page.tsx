import type { Metadata } from "next";
import Link from "next/link";
import { DataPageShell, ShellSection } from "@/components/seo/DataPageShell";
import TbillHistoryChart from "@/components/interestRates/TbillHistoryChart";
import { AuctionSpreads } from "@/components/interestRates/GovSecurities";
import { tbillFacts } from "@/lib/interestRates/marketPages";
import { buildDashboard, r4 } from "@/lib/interestRates/viewModel";
import { PROVENANCE, SBP_TBILL_FROM, tbillSeries, type TbillTenor } from "@/lib/interestRates/dataset";
import { formatDate } from "@/lib/policyRate/format";
import { SITE_URL, SITE_NAME, getRelatedLinks } from "@/lib/seoConfig";

// Pakistan T-Bill Rates: a public data page built on the validated interest-rate dataset (SBP's auction file tb.xlsx from July 2014, SBP EasyData before;
// scripts/buildInterestRates.ts). Cut-off and weighted-average yields are separate series throughout.

const SLUG = "pakistan-t-bill-rates";
const PAGE_URL = `${SITE_URL}/${SLUG}`;
const TITLE = "Pakistan T-Bill Rates — Latest Auction Yields & History";
const DESCRIPTION =
  "Latest Pakistan Market Treasury Bill auction results: cut-off and weighted-average yields for 1, 3, 6 and 12 months, compared with the SBP policy rate, with every auction since 2004.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export const revalidate = 3600;

const TENOR_WORDS: Record<string, string> = { "1M": "1 month", "3M": "3 months", "6M": "6 months", "12M": "12 months" };
const pct = (v: number | null) => (v === null ? "—" : `${v.toFixed(2)}%`);
// Signed percentage points; a change that rounds to zero is written "0.00 pp", never "−0.00".
const pp = (v: number) => {
  const r = Math.round(v * 100) / 100;
  return r === 0 ? "0.00 pp" : `${r > 0 ? "+" : "−"}${Math.abs(r).toFixed(2)} pp`;
};

function historyData() {
  const by = (kind: "cutoff" | "wa") =>
    Object.fromEntries((["1M", "3M", "6M", "12M"] as TbillTenor[]).map((t) => [t, tbillSeries(t, kind).map((p) => ({ date: p.date, value: r4(p.value), note: p.source }))]));
  const cutoff = by("cutoff");
  return { cutoff, wa: by("wa"), to: cutoff["3M"].at(-1)!.date, sbpFrom: SBP_TBILL_FROM };
}

export default function TbillPage() {
  const f = tbillFacts();
  // The spread chart needs only the derived spreads, not every auction record.
  const { policyMinusTbill, termSpread, sbpTbillFrom, sbpPibFrom } = buildDashboard().auctions;
  const spreads = { tbills: [], pibs: [], policyMinusTbill, termSpread, sbpTbillFrom, sbpPibFrom };
  const retrievedOn = PROVENANCE.govSec.sources.find((s) => s.path === "sbp/tb.xlsx")!.retrievedOn;
  const three = f.rows.find((r) => r.tenor === "3M")!;
  const twelve = f.rows.find((r) => r.tenor === "12M")!;

  const faq = [
    {
      question: "What are the latest T-bill rates in Pakistan?",
      answer: `At the auction of ${formatDate(f.auctionDate)}, the cut-off yields were ${f.rows.map((r) => `${pct(r.cutoff)} for ${TENOR_WORDS[r.tenor]}`).join(", ")}. The SBP policy rate in force that day was ${pct(f.policy)}.`,
    },
    {
      question: "How do T-bill auctions work in Pakistan?",
      answer: "The State Bank of Pakistan holds Market Treasury Bill auctions for the government roughly every two weeks, against a pre-announced target for each tenor. Banks and other primary dealers bid the amount they want and the yield they will accept; the government accepts bids from the lowest yield upward. The highest yield it accepts is the cut-off yield, and the average of the accepted bids, weighted by amount, is the weighted-average yield. It can also reject all bids for a tenor.",
    },
    {
      question: "What is the difference between the cut-off and the weighted-average yield?",
      answer: `The cut-off is the highest accepted yield, so it is always at or above the weighted average. At the latest auction the 3-month cut-off was ${pct(three.cutoff)} and the weighted average ${pct(three.wa)}. News reports usually quote the cut-off. The two are kept as separate series on this page and never mixed.`,
    },
    {
      question: "Why do T-bill yields move with the policy rate?",
      answer: "T-bills are short-term government borrowing, so investors compare them with what they can earn elsewhere over the same period, and the policy rate anchors those short-term rates. Yields above the policy rate usually mean investors expect rates to rise or demand a premium; yields below it usually mean cuts are expected.",
    },
    {
      question: "Are these the same as secondary-market T-bill yields?",
      answer: "No. These are primary-market auction results: what the government accepted on the auction day. Treasury bills then trade between investors at secondary-market yields that change every day; those are not official SBP data and are not shown here.",
    },
  ];

  return (
    <DataPageShell
      path={`/${SLUG}`}
      title="Pakistan T-Bill Rates"
      lead={
        <>
          Market Treasury Bills (T-bills) are the Government of Pakistan&rsquo;s short-term borrowing: 1, 3, 6 and 12 months, sold at auctions run by the
          State Bank. Their yields are the government&rsquo;s cost of short-term money and a benchmark for other rates. For longer maturities see{" "}
          <Link href="/pakistan-bond-yields" className="text-pe-accent hover:underline">PIB bond yields</Link>.
        </>
      }
      tiles={[
        { label: "3-month cut-off yield", value: pct(three.cutoff), date: `auction of ${formatDate(f.auctionDate)}`, note: three.prevCutoff && three.cutoff !== null ? `${pp(three.cutoff - three.prevCutoff.value)} vs ${formatDate(three.prevCutoff.date)}` : undefined },
        { label: "12-month cut-off yield", value: pct(twelve.cutoff), date: `auction of ${formatDate(f.auctionDate)}`, note: twelve.yearAgoCutoff && twelve.cutoff !== null ? `${pp(twelve.cutoff - twelve.yearAgoCutoff.value)} vs ${formatDate(twelve.yearAgoCutoff.date)}` : undefined },
        { label: "SBP policy rate", value: pct(f.policy), date: `in force on ${formatDate(f.auctionDate)}` },
        { label: "Policy rate − 3M cut-off", value: three.cutoff === null ? "—" : pp(f.policy - three.cutoff), date: formatDate(f.auctionDate), note: "Below zero: the bill yielded more than the policy rate" },
      ]}
      facts={[
        { label: "Source", value: `State Bank of Pakistan: auction results file tb.xlsx (detailed format, from ${formatDate(SBP_TBILL_FROM)}); SBP EasyData TS_GP_BAM_SIRTBIL_AH for earlier auctions` },
        { label: "Unit and frequency", value: "Percent per annum; per auction (about every two weeks)" },
        { label: "Coverage", value: `${formatDate(f.first)} to ${formatDate(f.auctionDate)}, ${f.auctions.toLocaleString("en-US")} auctions with a 3-month yield` },
        { label: "Latest auction", value: `${formatDate(f.auctionDate)} (settled ${formatDate(f.settlementDate)})` },
        { label: "Data retrieved", value: formatDate(retrievedOn) },
        { label: "Type", value: "Observed (primary-market auction results); spreads are derived" },
      ]}
      methodology={[
        `From ${formatDate(SBP_TBILL_FROM)} the yields come from SBP's own auction file, which carries every tenor at four-decimal precision; earlier auctions come from SBP EasyData. Where both exist they were compared auction by auction; EasyData often prints two decimals, and its remaining differences are listed in the interest-rate validation report.`,
        "Each value is shown on its auction date. A tenor that was not offered, or whose bids were all rejected, has no yield for that auction; nothing is filled in.",
      ]}
      limitations={[
        "Auction yields are not daily market yields: between auctions there is no official T-bill yield, and the secondary-market (PKRV) curve is not used.",
        "The 1-month bill has been auctioned only since March 2025. Very early EasyData auctions (2004–2014) include a few values SBP marks as missing; they are not used.",
        "The SBP policy rate before 25 May 2015 was the reverse repo rate (the top of the corridor), so the gap between T-bill yields and the policy rate is not comparable across that date.",
      ]}
      faq={faq}
      related={[...getRelatedLinks(SLUG), { href: "/pakistan-interest-rate#auction-curve", label: "Auction yield curve" }]}
      dataset={{
        name: "Pakistan Market Treasury Bill auction yields",
        description: "Cut-off and weighted-average yields of Pakistan's Market Treasury Bill auctions (1, 3, 6 and 12 months), as published by the State Bank of Pakistan.",
        temporalCoverage: `${f.first}/${f.auctionDate}`,
        sourceName: "State Bank of Pakistan",
        sourceUrl: "https://www.sbp.org.pk/assets/document/tb.xlsx",
        variables: ["T-bill cut-off yield", "T-bill weighted-average yield"],
      }}
    >
      <ShellSection id="latest" title={`Auction of ${formatDate(f.auctionDate)}`} description="Yields by tenor, with the change against the previous auction and a year earlier (cut-off yields).">
        <div className="overflow-x-auto rounded-[var(--pe-radius)] border border-pe-border" tabIndex={0} role="region" aria-label="Latest T-bill auction (scrolls)">
          <table className="w-full min-w-[620px] border-collapse text-[14px] tabular-nums">
            <caption className="sr-only">Pakistan T-bill auction of {formatDate(f.auctionDate)}</caption>
            <thead className="bg-pe-surface-2 text-[13px] text-pe-text-2">
              <tr>
                <th scope="col" className="px-3 py-2 text-left font-medium">Tenor</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Cut-off yield</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Weighted average</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">vs previous auction</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">vs a year earlier</th>
              </tr>
            </thead>
            <tbody>
              {f.rows.map((r) => (
                <tr key={r.tenor} className="border-t border-pe-border">
                  <th scope="row" className="px-3 py-1.5 text-left font-normal text-pe-text-2">{r.tenor}</th>
                  <td className="px-3 py-1.5 text-right font-medium text-pe-text">{r.cutoff === null ? <span className="font-normal text-pe-text-3">{r.outcome}</span> : pct(r.cutoff)}</td>
                  <td className="px-3 py-1.5 text-right text-pe-text-2">{pct(r.wa)}</td>
                  {[r.prevCutoff, r.yearAgoCutoff].map((o, i) => (
                    <td key={i} className="px-3 py-1.5 text-right text-pe-text-2">
                      {o && r.cutoff !== null ? (
                        <>
                          {pp(r.cutoff - o.value)}
                          <span className="block text-[11px] text-pe-text-3">{formatDate(o.date)}</span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 max-w-3xl text-[14px] leading-relaxed text-pe-text-2">
          Across {f.auctions.toLocaleString("en-US")} auctions since {formatDate(f.first)}, the 3-month cut-off yield ranged from {pct(f.low3m.value)} (
          {formatDate(f.low3m.date)}) to {pct(f.high3m.value)} ({formatDate(f.high3m.date)}), when the policy rate was at its 22% peak.
        </p>
      </ShellSection>

      <ShellSection id="history" title="T-bill yields since 2004" description="Cut-off or weighted-average yields by tenor, at every auction.">
        <TbillHistoryChart data={historyData()} retrievedOn={retrievedOn} />
      </ShellSection>

      <ShellSection id="spread" title="T-bill yields and the policy rate" description="The policy rate minus the 3-month cut-off, at each auction; and the 10-year PIB minus the 3-month bill.">
        <AuctionSpreads data={spreads} retrievedOn={retrievedOn} />
      </ShellSection>
    </DataPageShell>
  );
}
