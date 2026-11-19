// Download Datasets: the "Research Datasets" section.
//
// Curated, finished files published exactly as prepared (see researchDatasets.ts). This section is deliberately separate from the live catalogue and its
// frequency selector: a research dataset is annual, offered only as the files themselves, and nothing here filters, converts or regenerates it.
// Server component: no client state, and every link is a plain <a download> to a static file, so it works without JavaScript.

import Section from "@/components/shell/Section";
import { RESEARCH_DATASETS, formatFileSize, researchFileHref, type ResearchDataset, type ResearchFile } from "@/lib/datasets/researchDatasets";

const primaryButton =
  "inline-flex flex-col rounded-[var(--pe-radius)] border border-pe-accent bg-pe-surface px-3.5 py-2 text-[13px] font-semibold text-pe-accent transition-colors hover:bg-pe-surface-2";
const optionalButton =
  "inline-flex flex-col rounded-[var(--pe-radius)] border border-pe-border bg-pe-surface px-3.5 py-2 text-[13px] font-medium text-pe-text-2 transition-colors hover:bg-pe-surface-2 hover:text-pe-text";

function FileLink({ dataset, file }: { dataset: ResearchDataset; file: ResearchFile }) {
  return (
    <a href={researchFileHref(dataset, file)} download={file.filename} title={file.description} className={file.optional ? optionalButton : primaryButton} data-research-file={file.kind}>
      <span>
        {file.label}
        <span className="sr-only"> — {dataset.title}</span>
      </span>
      <span className="mt-0.5 font-mono text-[11px] font-normal text-pe-text-3">{formatFileSize(file.bytes)}</span>
    </a>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-[0.05em] text-pe-text-3">{label}</dt>
      <dd className="mt-0.5 text-[13px] text-pe-text">{children}</dd>
    </div>
  );
}

export default function ResearchDatasets() {
  return (
    <Section
      id="research-datasets"
      title="Research Datasets"
      description="Explore curated historical economic datasets prepared for academic research, statistical analysis and economic studies."
    >
      <ul className="flex flex-col gap-4">
        {RESEARCH_DATASETS.map((d) => {
          const main = d.files.filter((f) => !f.optional);
          const extras = d.files.filter((f) => f.optional);
          return (
            <li key={d.id} data-research-dataset={d.id} className="rounded-[var(--pe-radius)] border border-pe-border bg-pe-surface-2/30 p-4">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <h3 className="text-[15px] font-semibold text-pe-text">{d.title}</h3>
                <span className="rounded-full border border-pe-border bg-pe-surface-2 px-1.5 py-px text-[11px] text-pe-text-3">{d.frequencyLabel}</span>
                <span className="rounded-full border border-pe-border bg-pe-surface-2 px-1.5 py-px text-[11px] text-pe-text-3">Fiscal years (Jul–Jun)</span>
              </div>
              <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-pe-text-2">{d.description}</p>

              <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
                <Fact label="Coverage">{d.coverage}</Fact>
                <Fact label="Frequency">{d.frequencyLabel}</Fact>
                <Fact label="Variables">{d.variables}</Fact>
                <Fact label="Observations">{d.observations} fiscal years</Fact>
                <Fact label="Source institutions">{d.sources.join(", ")}</Fact>
              </dl>

              <div className="mt-4 flex flex-wrap items-stretch gap-2" role="group" aria-label={`Download ${d.title}`}>
                {main.map((f) => (
                  <FileLink key={f.kind} dataset={d} file={f} />
                ))}
              </div>
              {extras.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-[12px] text-pe-text-3">Optional:</span>
                  {extras.map((f) => (
                    <FileLink key={f.kind} dataset={d} file={f} />
                  ))}
                </div>
              )}

              <ul className="mt-4 flex list-disc flex-col gap-1.5 border-t border-pe-border ps-5 pt-3 text-[12px] leading-relaxed text-pe-text-3">
                {d.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
