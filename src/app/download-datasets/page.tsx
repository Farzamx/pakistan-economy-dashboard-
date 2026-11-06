import type { Metadata } from "next";
import Link from "next/link";
import Section from "@/components/shell/Section";
import DatasetBrowser, { type DatasetRowView } from "@/components/datasets/DatasetBrowser";
import { DATASETS, EXCLUDED_DATASETS } from "@/lib/datasets/datasetRegistry";
import { loadDataset } from "@/lib/datasets/datasetLoader";
import { SITE_URL, SITE_NAME } from "@/lib/seoConfig";

// Download Datasets.
//
// Lists every series PEIC can export, each with its real unit, frequency,
// source and date coverage, read through the project's existing canonical
// data functions. The catalogue is derived from the indicator registries
// (see datasetRegistry.ts), not a second hand-maintained list.
//
// Coverage is measured on the server at render time so a visitor can see
// what they are getting BEFORE downloading — including when a series has
// only a short history or cannot be read at all.

const PAGE_URL = `${SITE_URL}/download-datasets`;
const TITLE = "Download Pakistan Economic Datasets";
const DESCRIPTION =
  "Download Pakistan economic indicators as Excel workbooks — inflation, policy rate, reserves, trade, money supply and more, each with observation periods, units and source attribution.";

export const metadata: Metadata = {
  title: `${TITLE} — ${SITE_NAME}`,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

/** Matches the download route's own window; the underlying series have their own caches. */
export const revalidate = 3600;

export default async function DownloadDatasetsPage() {
  const loaded = await Promise.all(DATASETS.map(loadDataset));

  const rows: DatasetRowView[] = loaded.map((ds) => ({
    id: ds.definition.id,
    name: ds.definition.name,
    category: ds.definition.category,
    description: ds.definition.description,
    unit: ds.unit,
    source: ds.source,
    frequency: ds.frequency,
    coverage: ds.rows.length > 0 ? `${ds.rows[0].period} to ${ds.rows[ds.rows.length - 1].period}` : null,
    observations: ds.rows.length,
    coverageNote: ds.definition.coverageNote,
    contextHref: ds.definition.contextHref,
    error: ds.error,
    status: ds.freshnessState,
  }));

  const downloadable = rows.filter((r) => r.observations > 0).length;
  const totalObservations = rows.reduce((n, r) => n + r.observations, 0);

  return (
    <div className="min-h-screen w-full bg-pe-bg">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-3 py-4 sm:px-4 lg:px-6">
        <header className="border-b border-pe-border pb-4">
          <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-pe-text-3">Data</p>
          <h1 className="mt-1 text-[24px] font-semibold leading-tight tracking-[-0.01em] text-pe-text [text-wrap:balance] sm:text-[28px]">
            Download datasets
          </h1>
          <p className="mt-1.5 max-w-3xl text-[14px] leading-relaxed text-pe-text-2">
            Every indicator PEIC tracks with a full history, as an Excel workbook. Each file carries the observation
            period, the value in its original unit, and the source — the same figures shown on the indicator pages, not a
            separate copy.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <a
              href="/api/datasets/all"
              download
              className="inline-flex items-center rounded-[var(--pe-radius)] border border-pe-accent bg-pe-surface px-3.5 py-2 text-[13px] font-semibold text-pe-accent transition-colors hover:bg-pe-surface-2"
            >
              Download all {downloadable} datasets (.xlsx)
            </a>
            <span className="font-mono text-[11px] text-pe-text-3">
              one workbook · one sheet per indicator · {totalObservations.toLocaleString("en-GB")} observations
            </span>
          </div>
        </header>

        <Section
          id="dataset-list"
          title="Available datasets"
          description="Search or filter, then download any series individually."
          flush
        >
          <DatasetBrowser rows={rows} />
        </Section>

        <Section id="dataset-notes" title="What's in each file" description="And what these files deliberately do not do.">
          <ul className="flex list-disc flex-col gap-1.5 ps-5 text-[13px] leading-relaxed text-pe-text-2">
            <li>
              A header block naming the indicator, unit, frequency, source, observation count and coverage, then one row
              per observation.
            </li>
            <li>
              <strong className="font-medium text-pe-text">Observation periods are kept as the source publishes them.</strong>{" "}
              Dated observations stay as dates, calendar years stay as years, and fiscal years stay as{" "}
              <code className="font-mono text-[12px]">FY2025</code> — they are never converted into calendar dates, which
              would invent a precision the source never published.
            </li>
            <li>
              Every file separates the <strong className="font-medium text-pe-text">observation period</strong> from the{" "}
              <strong className="font-medium text-pe-text">download time</strong>, so a freshly downloaded file is never
              mistaken for freshly published data.
            </li>
            <li>Values are numeric cells in their original units — nothing is rescaled, interpolated or gap-filled.</li>
          </ul>
        </Section>

        <Section
          id="dataset-exclusions"
          title="Series that cannot be downloaded"
          description="Shown here rather than quietly left out of the list."
        >
          <dl className="flex flex-col gap-2.5">
            {EXCLUDED_DATASETS.map((x) => (
              <div key={x.name}>
                <dt className="text-[13px] font-medium text-pe-text">{x.name}</dt>
                <dd className="mt-0.5 text-[13px] leading-relaxed text-pe-text-2">{x.reason}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 border-t border-pe-border pt-3 text-[13px] text-pe-text-2">
            Looking for a specific indicator?{" "}
            <Link href="/pakistan-economic-indicators" className="text-pe-accent hover:underline">
              Browse all indicators
            </Link>
            .
          </p>
        </Section>
      </div>
    </div>
  );
}
