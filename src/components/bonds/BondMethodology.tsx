import { Disclosure } from "@/components/shell/Disclosure";
import type { MethodFacts } from "@/lib/bonds/snapshot";
import { formatDate } from "@/lib/policyRate/format";

interface Source {
  instrument: string;
  url: string;
  sheet: string;
  sha256: string;
  lastModified: string | null;
}

interface BondMethodologyProps {
  facts: MethodFacts;
  retrievedOn: string;
  sources: readonly Source[];
  excluded: readonly { instrument: string; auctionDate: string; tenorLabel: string }[];
  /** Related workshop links, e.g. the Interest Rate page. */
  related?: { href: string; label: string }[];
}

const fmtFailed = (m: Record<string, number>) => Object.entries(m).map(([t, n]) => `${t} ${n}`).join(", ");

/**
 * Compact on purpose: three always-visible lines carry what a reader must know (source, what the yields are, coverage); definitions, data limits and the
 * source files sit behind labelled disclosures. Nothing here is hidden from the page: it is all in the HTML. Server-compatible.
 */
export default function BondMethodology({ facts, retrievedOn, sources, excluded, related }: BondMethodologyProps) {
  return (
    <div className="flex flex-col gap-3" data-testid="bond-methodology">
      <ul className="flex flex-col gap-1 text-[13px] text-pe-text-2">
        <li>
          <span className="font-medium text-pe-text">Source.</span> State Bank of Pakistan auction archives, read on {formatDate(retrievedOn)}.
        </li>
        <li>
          <span className="font-medium text-pe-text">What the yields are.</span> Primary-market auction results: what the government paid at each auction. They are not secondary-market quotes and not the PKRV curve. Nominal, percent per annum.
        </li>
        <li>
          <span className="font-medium text-pe-text">Coverage.</span> T-bills: {facts.tbillAuctions} auctions, {formatDate(facts.tbillFirst)} to {formatDate(facts.tbillLast)}. PIBs: {facts.pibAuctions} auctions, {formatDate(facts.pibFirst)} to {formatDate(facts.pibLast)}.
        </li>
      </ul>

      <Disclosure summary="Definitions">
        <ul className="flex flex-col gap-1.5">
          <li><span className="font-medium text-pe-text">Cut-off yield</span>: the highest yield SBP accepted at an auction (its headline figure). <span className="font-medium text-pe-text">Weighted-average yield</span>: the average over all accepted bids, weighted by amount. They are never mixed in one line.</li>
          <li><span className="font-medium text-pe-text">Auction date</span> is the day bids are taken; the <span className="font-medium text-pe-text">settlement date</span> is when the securities are issued and paid for (T-bills 0 to 8 days later, PIBs 1 to 4). Charts use the auction date.</li>
          <li><span className="font-medium text-pe-text">T-bills</span> (1, 3, 6, 12 months) are sold at a discount and mature at face value. <span className="font-medium text-pe-text">PIBs</span> (2, 3, 5, 10, 15 years) are fixed-coupon bonds; only fixed-rate PIBs are included.</li>
          <li><span className="font-medium text-pe-text">A curve</span> is the tenors of one auction. T-bills and PIBs are auctioned on different days, so in the combined view each T-bill auction is shown with the nearest PIB auction within 14 days and the gap is stated. It is not a simultaneous curve, and no tenor is interpolated.</li>
          <li><span className="font-medium text-pe-text">Slope</span>: T-bills 12-month minus 3-month; PIBs 10-year minus 3-year. Inverted: at least 10 bp below zero; flat: within 10 bp; upward: at least 10 bp above. A change of at least 10 bp in the slope between two curves is called steepening or flattening.</li>
          <li><span className="font-medium text-pe-text">Offered</span> is competitive bids received; <span className="font-medium text-pe-text">accepted</span> adds competitive and non-competitive bids (and short sales for PIBs), at face value. The target is per tenor from September 2019; before that SBP published only a combined target.</li>
        </ul>
      </Disclosure>

      <Disclosure summary="Data limits">
        <ul className="flex list-disc flex-col gap-1.5 ps-5">
          <li>A tenor that attracted no accepted bid has no yield. T-bills, tenors without a yield: {fmtFailed(facts.failedTBill)} auctions. PIBs: {fmtFailed(facts.failedPib)}. These are gaps in the charts, never zeros, and the line is not joined across them.</li>
          <li>Only {facts.slopeAuctions} of {facts.tbillAuctions} T-bill auctions have a slope, because both the 3-month and 12-month tenors must have a yield.</li>
          <li>PIB detail (cut-off yield, offered and accepted amounts) starts in {formatDate(facts.pibFirst)}, where SBP&apos;s detailed archive begins. The 1-month bill exists from March 2025.</li>
          <li>{excluded.length > 0 ? `${excluded.length} row${excluded.length === 1 ? " was" : "s were"} left out because ${excluded.length === 1 ? "it is" : "they are"} not on the standard tenor grid: ${excluded.map((e) => `the ${e.tenorLabel} bill of ${formatDate(e.auctionDate)}`).join(", ")}.` : "No rows were excluded."}</li>
          <li>For {facts.acceptedWithoutNonCompetitive} accepted tenors SBP&apos;s file has no non-competitive figure, so their total accepted amount covers competitive bids only.</li>
          <li>The archive is read by hand-run script, not live: the page says when it was last read and warns when that is more than three weeks ago. The policy rate comes from the PEIC ledger (SBP EasyData). Real (inflation-adjusted) yields are not shown: they need an inflation figure dated to the same auction.</li>
          <li>SBP&apos;s EasyData weighted-average series for the 3-month bill differs from the archive in places (it rounds to two decimals, lacks some auctions, and dates a few values a day or more after the auction), so the archive is used here.</li>
        </ul>
      </Disclosure>

      <Disclosure summary="Source files and checks">
        <ul className="flex flex-col gap-1.5">
          {sources.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-pe-accent hover:underline">{s.url.replace("https://www.", "")}</a> · sheet &ldquo;{s.sheet}&rdquo;{s.lastModified ? ` · modified ${s.lastModified}` : ""}
              <span className="block break-all font-mono text-[11px] text-pe-text-3">sha256 {s.sha256}</span>
            </li>
          ))}
          <li>The latest T-bill and PIB auctions were checked line by line against SBP&apos;s published auction-result PDFs, and the 3-month series against SBP EasyData. The update procedure is in the repository (docs/bond-yields-workshop.md).</li>
          {related && related.length > 0 && (
            <li>
              Related: {related.map((r, i) => (
                <span key={r.href}>
                  {i > 0 ? " · " : ""}
                  <a href={r.href} className="text-pe-accent hover:underline">{r.label}</a>
                </span>
              ))}
            </li>
          )}
        </ul>
      </Disclosure>
    </div>
  );
}
