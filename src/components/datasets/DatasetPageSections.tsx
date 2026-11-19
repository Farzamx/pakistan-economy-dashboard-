// Download Datasets: the two supporting sections below the catalogue. Server components; native <details> so they work without JavaScript.
//
// Both replace long always-visible lists. Nothing is removed: the short version is visible, and the full rules / full explanations open on request.

import Link from "next/link";
import { EXCLUDED_DATASETS } from "@/lib/datasets/datasetRegistry";

function Disclosure({ summary, children }: { summary: string; children: React.ReactNode }) {
  return (
    <details className="group">
      <summary className="flex min-h-9 cursor-pointer list-none items-center gap-1.5 text-[13px] font-medium text-pe-text-2 hover:text-pe-text [&::-webkit-details-marker]:hidden">
        <svg viewBox="0 0 10 10" aria-hidden="true" className="h-2.5 w-2.5 transition-transform group-open:rotate-90"><path d="M3 1.5 7 5 3 8.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        {summary}
      </summary>
      {children}
    </details>
  );
}

/** What every downloaded file promises, in one line, with the full rules behind a disclosure. */
export function HowDownloadsWork() {
  return (
    <section id="dataset-notes" aria-labelledby="dataset-notes-heading" className="rounded-[var(--pe-radius)] border border-pe-border bg-pe-surface px-5 py-4">
      <h2 id="dataset-notes-heading" className="text-[15px] font-semibold text-pe-text">
        What&rsquo;s in each file
      </h2>
      <p className="mt-1 text-[13px] leading-relaxed text-pe-text-2">
        Observation periods, units and sources exactly as published. Nothing is converted, interpolated or gap-filled.
      </p>
      <div className="mt-2 border-t border-pe-border pt-1">
        <Disclosure summary="How downloads work">
          <ul className="mt-1 flex list-disc flex-col gap-1.5 pb-1 ps-5 text-[13px] leading-relaxed text-pe-text-2">
            <li>
              Each file has the indicator, unit, frequency, source and coverage, then one row per observation. Excel adds a header block; CSV carries the same
              details on every row.
            </li>
            <li>
              <strong className="font-medium text-pe-text">Original observation periods are kept.</strong> Dated observations stay dates, calendar years stay
              years, and fiscal years stay <code className="font-mono text-[12px]">FY2025</code> (July 2024 to June 2025), never converted into calendar dates.
              Quarterly figures are fiscal-year quarters (Q1 = July–September) and show the quarter-end date beside the source&rsquo;s own label.
            </li>
            <li>
              <strong className="font-medium text-pe-text">Values are never interpolated or gap-filled.</strong> They are numeric cells in their original
              units, and a file always separates the observation period from the download time.
            </li>
            <li>
              <strong className="font-medium text-pe-text">Frequency selection filters; it never converts.</strong> Annual figures are not spread across
              quarters or months, and monthly figures are not averaged into quarters or years.
            </li>
            <li>A date range only removes observations, and a file made with one says so in its header, beside the series&rsquo; full range.</li>
            <li>Combined CSV files never mix frequencies; the combined workbook keeps one sheet per series.</li>
          </ul>
        </Disclosure>
      </div>
    </section>
  );
}

/** Series PEIC shows but cannot export, each with one short reason; the full explanations are one click away. */
export function UnavailableSeries() {
  return (
    <section id="dataset-exclusions" aria-labelledby="dataset-exclusions-heading" className="rounded-[var(--pe-radius)] border border-pe-border bg-pe-surface-2/40 px-5 py-4">
      <h2 id="dataset-exclusions-heading" className="text-[15px] font-semibold text-pe-text">
        Not available for download
      </h2>
      <dl className="mt-2 divide-y divide-pe-border">
        {EXCLUDED_DATASETS.map((x) => (
          <div key={x.name} className="flex flex-col gap-0.5 py-2 sm:flex-row sm:items-baseline sm:gap-4">
            <dt className="text-[13px] font-medium text-pe-text sm:w-[22rem] sm:shrink-0">{x.name}</dt>
            <dd className="text-[13px] text-pe-text-2">{x.shortReason}</dd>
          </div>
        ))}
      </dl>
      <div className="border-t border-pe-border pt-1">
        <Disclosure summary="Why these can’t be downloaded">
          <dl className="mt-1 flex flex-col gap-2.5 pb-1 ps-5">
            {EXCLUDED_DATASETS.map((x) => (
              <div key={x.name}>
                <dt className="text-[12px] font-medium text-pe-text">{x.name}</dt>
                <dd className="mt-0.5 text-[12px] leading-relaxed text-pe-text-2">{x.reason}</dd>
              </div>
            ))}
          </dl>
        </Disclosure>
      </div>
      <p className="mt-1 text-[13px] text-pe-text-2">
        Looking for a specific indicator?{" "}
        <Link href="/pakistan-economic-indicators" className="text-pe-accent hover:underline">
          Browse all indicators
        </Link>
        .
      </p>
    </section>
  );
}
