// Download Datasets: the "Research Datasets" section.
//
// Curated, finished files published exactly as prepared (see researchDatasets.ts). Separate from the live catalogue and its frequency selector: a
// research dataset is annual, offered only as the files themselves, and nothing here filters, converts or regenerates it.
//
// Layout: the essentials and the four main downloads are always visible; the derived-variables CSV is a small optional link; the technical notes
// (fiscal years, missing values, source differences, limitations) sit in a collapsible "Dataset notes". Nothing is removed, only disclosed on request.
// Server component: no client state, every link is a plain <a download> to a static file, and <details> works without JavaScript.

import { RESEARCH_DATASETS, formatFileSize, researchFileHref, type ResearchDataset, type ResearchFile } from "@/lib/datasets/researchDatasets";

const buttonBase =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-[var(--pe-radius)] border px-3.5 text-[13px] font-medium transition-colors";
const primary = `${buttonBase} border-pe-accent text-pe-accent hover:bg-pe-surface-2`;
const secondary = `${buttonBase} border-pe-border-strong text-pe-text hover:bg-pe-surface-2`;

/** Short button text: the format, not the file name. */
const SHORT_LABEL: Record<ResearchFile["kind"], string> = {
  xlsx: "Excel",
  csv: "CSV",
  pdf: "Codebook",
  sps: "SPSS syntax",
  "csv-derived": "Derived variables (.csv)",
};

function FileButton({ dataset, file, className }: { dataset: ResearchDataset; file: ResearchFile; className: string }) {
  return (
    <a href={researchFileHref(dataset, file)} download={file.filename} title={`${file.description} (${formatFileSize(file.bytes)})`} className={className} data-research-file={file.kind}>
      {SHORT_LABEL[file.kind]}
      <span className="sr-only">
        {" "}
        — {dataset.title}, {file.label}, {formatFileSize(file.bytes)}
      </span>
    </a>
  );
}

function Stat({ children, wrap }: { children: React.ReactNode; wrap?: boolean }) {
  return <li className={wrap ? "min-w-0" : "whitespace-nowrap"}>{children}</li>;
}

export default function ResearchDatasets() {
  return (
    <section id="research-datasets" aria-labelledby="research-datasets-heading">
      <div className="mb-3">
        <h2 id="research-datasets-heading" className="text-[17px] font-semibold text-pe-text">
          Research Datasets
        </h2>
        <p className="mt-0.5 text-[13px] text-pe-text-2">Explore curated historical economic datasets prepared for academic research, statistical analysis and economic studies.</p>
      </div>

      <ul className="flex flex-col gap-4">
        {RESEARCH_DATASETS.map((d) => {
          const main = d.files.filter((f) => !f.optional);
          const extras = d.files.filter((f) => f.optional);
          return (
            <li key={d.id} data-research-dataset={d.id} className="rounded-[var(--pe-radius)] border border-pe-border bg-pe-surface p-5">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <h3 className="text-[16px] font-semibold leading-snug text-pe-text">{d.title}</h3>
                <span className="rounded-full border border-pe-border bg-pe-surface-2 px-2 py-px text-[11px] font-medium text-pe-text-2">{d.frequencyLabel}</span>
              </div>
              <p className="mt-1.5 max-w-3xl text-[13px] leading-relaxed text-pe-text-2">{d.description}</p>

              {/* The essentials, as one quiet line rather than a grid of labelled boxes. */}
              <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[13px] font-medium text-pe-text" aria-label="Dataset summary">
                <Stat>{d.coverage}</Stat>
                <Stat>{d.variables} variables</Stat>
                <Stat>
                  {d.observations} {d.frequencyLabel.toLowerCase()} observations
                </Stat>
                <Stat wrap>
                  <span className="font-normal text-pe-text-2">Sources: </span>
                  {d.sources.join(", ")}
                </Stat>
              </ul>

              <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label={`Download ${d.title}`}>
                {main.map((f, i) => (
                  <FileButton key={f.kind} dataset={d} file={f} className={i < 2 ? primary : secondary} />
                ))}
              </div>
              {extras.length > 0 && (
                <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[12px] text-pe-text-3">
                  Also available:
                  {extras.map((f) => (
                    <FileButton key={f.kind} dataset={d} file={f} className="inline-flex min-h-9 items-center text-pe-accent underline underline-offset-2 hover:no-underline" />
                  ))}
                </p>
              )}

              <details className="group mt-4 border-t border-pe-border pt-3">
                <summary className="flex min-h-9 cursor-pointer list-none items-center gap-1.5 text-[13px] font-medium text-pe-text-2 hover:text-pe-text [&::-webkit-details-marker]:hidden">
                  <svg viewBox="0 0 10 10" aria-hidden="true" className="h-2.5 w-2.5 transition-transform group-open:rotate-90"><path d="M3 1.5 7 5 3 8.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  Dataset notes
                </summary>
                <ul className="mt-2 flex list-disc flex-col gap-1.5 ps-5 text-[12px] leading-relaxed text-pe-text-2">
                  {d.notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </details>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
