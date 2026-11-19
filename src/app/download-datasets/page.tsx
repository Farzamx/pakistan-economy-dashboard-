import type { Metadata } from "next";
import DatasetBrowser, { type DatasetRowView } from "@/components/datasets/DatasetBrowser";
import ResearchDatasets from "@/components/datasets/ResearchDatasets";
import { HowDownloadsWork, UnavailableSeries } from "@/components/datasets/DatasetPageSections";
import { DATASETS } from "@/lib/datasets/datasetRegistry";
import { loadDataset } from "@/lib/datasets/datasetLoader";
import { resolveFrequency } from "@/lib/datasets/datasetFrequency";
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
  "Download Pakistan economic indicators as Excel or CSV files — inflation, policy rate, reserves, trade, money supply and more, by yearly, quarterly or monthly frequency, each with observation periods, units and source attribution.";

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

  const rows: DatasetRowView[] = loaded.map((ds) => {
    // loadDataset has already corrected a declared frequency that the observation dates contradict; this reads the corrected one.
    const resolved = resolveFrequency(ds.frequency, ds.rows.map((r) => r.period));
    return {
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
    periodKind: ds.definition.periodKind,
    frequencyNote: ds.frequencyNote,
    frequencyId: resolved.id ?? ds.definition.frequency,
    // Every observation, exactly as the source published it (period, value and, for quarters, the source's own label): the browser filters these in
    // place, so the preview and the date range never need a second request and can never disagree with the catalogue.
    points: ds.rows.map((r) => (r.label ? ([r.period, r.value, r.label] as const) : ([r.period, r.value] as const))),
    };
  });

  const downloadable = rows.filter((r) => r.observations > 0).length;

  return (
    <div className="min-h-screen w-full bg-pe-bg">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-3 py-6 sm:px-4 lg:gap-10 lg:px-6">
        <header className="flex flex-col gap-4 border-b border-pe-border pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-pe-text-3">Data</p>
            <h1 className="mt-1 text-[24px] font-semibold leading-tight tracking-[-0.01em] text-pe-text [text-wrap:balance] sm:text-[28px]">
              Download Datasets
            </h1>
            <p className="mt-1.5 max-w-3xl text-[14px] leading-relaxed text-pe-text-2 [text-wrap:pretty]">
              Download historical Pakistani economic indicators in Excel and CSV formats. Filter by frequency and date range.
            </p>
          </div>
          {/* Secondary on purpose: the page is for choosing a series; this is the shortcut for everything at once. */}
          <a
            href="/api/datasets/all"
            download
            title="One workbook, one sheet per indicator, every observation"
            className="inline-flex h-9 shrink-0 items-center justify-center self-start rounded-[var(--pe-radius)] border border-pe-border-strong px-3.5 text-[13px] font-medium text-pe-text transition-colors hover:bg-pe-surface-2 sm:self-auto"
          >
            Download all {downloadable} datasets (.xlsx)
          </a>
        </header>

        {/* Curated research files: a separate section, outside the live catalogue and its frequency selector. */}
        <ResearchDatasets />

        <section id="dataset-list" aria-labelledby="dataset-list-heading">
          <div className="mb-3">
            <h2 id="dataset-list-heading" className="text-[17px] font-semibold text-pe-text">
              Available datasets
            </h2>
            <p className="mt-0.5 text-[13px] text-pe-text-2">Live indicators. Pick a frequency and date range, then preview or download any series.</p>
          </div>
          <DatasetBrowser rows={rows} />
        </section>

        <HowDownloadsWork />

        <UnavailableSeries />
      </div>
    </div>
  );
}
