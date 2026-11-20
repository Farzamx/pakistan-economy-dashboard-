// Download Datasets: the "Research Datasets" section.
//
// Curated, finished files published exactly as prepared (see researchDatasets.ts). Separate from the live catalogue and its frequency selector: a
// research dataset is annual, offered only as the files themselves, and nothing here filters, converts or regenerates it.
//
// Layout: the essentials and the four main downloads are always visible; the derived-variables CSV is a small optional link; the technical notes
// (fiscal years, missing values, source differences, limitations) sit in a collapsible "Dataset notes". Nothing is removed, only disclosed on request.
// Server component: no client state, every link is a plain <a download> to a static file, and <details> works without JavaScript.

import { RESEARCH_DATASETS, formatFileSize, researchFileHref, type ResearchCompleteness, type ResearchDataset, type ResearchFile } from "@/lib/datasets/researchDatasets";

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
  "csv-variable": "CSV",
};

function FileButton({ dataset, file, className }: { dataset: ResearchDataset; file: ResearchFile; className: string }) {
  return (
    <a href={researchFileHref(dataset, file)} download={file.filename} title={`${file.description} (${formatFileSize(file.bytes)})`} className={className} data-research-file={file.kind}>
      {file.shortLabel ?? SHORT_LABEL[file.kind]}
      <span className="sr-only">
        {" "}
        — {dataset.title}, {file.label}, {formatFileSize(file.bytes)}
      </span>
    </a>
  );
}

const fmtInt = (n: number) => n.toLocaleString("en-US");

/** The "Coverage at a glance" table: what is complete, what is partial, and why every blank cell is blank. All figures come from the dataset's completeness block. */
function CoverageGlance({ d, c }: { d: ResearchDataset; c: ResearchCompleteness }) {
  const m = c.missingBy;
  const structural = m.beforeSeriesExists + m.otherCpiBaseColumn + m.noSurvey;
  const stops = m.sourceStopped + m.notYetPublished;
  const unresolved = m.needsReconciliation + m.unverified + m.tbillTooFewMonths;
  const rows: { label: string; value: string; detail: string; indent?: boolean }[] = [
    { label: "Complete historical coverage", value: `${c.completeVariables} variables`, detail: `observed in all ${d.observations} fiscal years` },
    { label: "Partial historical coverage", value: `${c.partialVariables} variables`, detail: "observed in some, not all, of the 30 years" },
    { label: "Blank cells", value: fmtInt(c.missing), detail: `of ${fmtInt(c.cells)} variable-year cells; ${fmtInt(c.observationsAvailable)} hold an observation` },
    { label: "Structural", value: fmtInt(structural), detail: `not data loss, never filled: before the series exists (${m.beforeSeriesExists}), outside a CPI base-year block (${m.otherCpiBaseColumn}), no household survey that year (${m.noSurvey})`, indent: true },
    { label: "Companion column", value: fmtInt(m.companionColumn), detail: "covered by the other classification of the same indicator (Ministry of Finance primary, SBP alternative); not spliced", indent: true },
    { label: "Source stops or not yet published", value: fmtInt(stops), detail: `series ended at its source (${m.sourceStopped}) or year not yet published (${m.notYetPublished})`, indent: true },
    { label: "Unresolved gaps", value: fmtInt(unresolved), detail: `would need a reconciliation not yet made (${m.needsReconciliation}), candidate values not verifiable (${m.unverified}), T-bill 2018 with only 6 of 12 months (${m.tbillTooFewMonths})`, indent: true },
  ];
  return (
    <dl aria-label="Coverage at a glance" className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 text-[12px] leading-relaxed">
      {rows.map((r) => (
        <div key={r.label} className={`col-span-2 grid grid-cols-subgrid gap-x-4 border-t border-pe-border py-1.5 first:border-t-0 ${r.indent ? "ps-4" : ""}`}>
          <dt className="min-w-0">
            <span className={r.indent ? "text-pe-text" : "font-medium text-pe-text"}>{r.label}</span>
            <span className="block text-pe-text-3">{r.detail}</span>
          </dt>
          <dd className="text-end font-medium tabular-nums text-pe-text">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The headline completeness figures: from the completeness block when the dataset has one, otherwise counted from its per-variable coverage. */
function summaryOf(d: ResearchDataset) {
  if (d.completeness) {
    const c = d.completeness;
    return { version: c.version, complete: c.completeVariables, available: c.observationsAvailable, cells: c.cells };
  }
  const vc = d.variableCoverage ?? [];
  return { version: d.version ?? "", complete: vc.filter((v) => v.observations === d.observations).length, available: vc.reduce((n, v) => n + v.observations, 0), cells: d.variables * d.observations };
}

/** Coverage by variable, for a dataset small enough to list every variable: how many years each has, its span, and which years are blank. */
function VariableCoverageList({ d }: { d: ResearchDataset }) {
  return (
    <dl aria-label="Coverage by variable" className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 text-[12px] leading-relaxed">
      {(d.variableCoverage ?? []).map((v) => (
        <div key={v.variable} className="col-span-2 grid grid-cols-subgrid gap-x-4 border-t border-pe-border py-1.5 first:border-t-0">
          <dt className="min-w-0">
            <span className="font-medium text-pe-text">{v.label}</span>
            <span className="block text-pe-text-3">
              {v.first} to {v.last}; {v.missing.length === 0 ? "no blank years" : `blank: ${v.missing.join(", ")}`}
            </span>
          </dt>
          <dd className="text-end font-medium tabular-nums text-pe-text">
            {v.observations} of {d.observations}
          </dd>
        </div>
      ))}
    </dl>
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
          const main = d.files.filter((f) => !f.optional && f.kind !== "csv-variable");
          const perVariable = d.files.filter((f) => f.kind === "csv-variable");
          const extras = d.files.filter((f) => f.optional);
          const s = summaryOf(d);
          return (
            <li key={d.id} data-research-dataset={d.id} className="rounded-[var(--pe-radius)] border border-pe-border bg-pe-surface p-5">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <h3 className="text-[16px] font-semibold leading-snug text-pe-text">{d.title}</h3>
                <span className="rounded-full border border-pe-border bg-pe-surface-2 px-2 py-px text-[11px] font-medium text-pe-text-2">{d.frequencyLabel}</span>
                <span className="rounded-full border border-pe-border bg-pe-surface-2 px-2 py-px text-[11px] font-medium text-pe-text-2" data-research-version>
                  {s.version}
                </span>
              </div>
              <p className="mt-1.5 max-w-3xl text-[13px] leading-relaxed text-pe-text-2">{d.description}</p>

              {/* The essentials, as one quiet line rather than a grid of labelled boxes. */}
              <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[13px] font-medium text-pe-text" aria-label="Dataset summary">
                <Stat>{d.coverage}</Stat>
                <Stat>{d.variables} variables</Stat>
                <Stat>
                  {d.observations} {d.frequencyLabel.toLowerCase()} observations
                </Stat>
                <Stat>{`${s.complete} of ${d.variables} variables complete`}</Stat>
                <Stat>{`${fmtInt(s.available)} of ${fmtInt(s.cells)} variable-years available`}</Stat>
                <Stat wrap>
                  <span className="font-normal text-pe-text-2">Sources: </span>
                  {d.sources.join(", ")}
                </Stat>
              </ul>
              {d.variableCoverage && (
                <ul className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-pe-text-2" aria-label="Observations by variable" data-observations-by-variable>
                  {d.variableCoverage.map((v) => (
                    <li key={v.variable} className="whitespace-nowrap">
                      {v.label}: <span className="font-medium tabular-nums text-pe-text">{v.observations} of {d.observations}</span>
                    </li>
                  ))}
                </ul>
              )}
              {d.missingDataNote && (
                <p className="mt-2 max-w-3xl text-[12px] leading-relaxed text-pe-text-2" data-missing-data-note>
                  <span className="font-medium text-pe-text">Missing data: </span>
                  {d.missingDataNote}
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label={`Download ${d.title}`}>
                {main.map((f, i) => (
                  <FileButton key={f.kind} dataset={d} file={f} className={i < 2 ? primary : secondary} />
                ))}
              </div>
              {perVariable.length > 0 && (
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0 text-[12px] text-pe-text-3" data-research-individual-files>
                  Individual variables:
                  {perVariable.map((f) => (
                    <FileButton key={f.filename} dataset={d} file={f} className="inline-flex min-h-9 items-center text-pe-accent underline underline-offset-2 hover:no-underline" />
                  ))}
                </p>
              )}
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
                {d.completeness ? (
                  <>
                    <h4 className="mt-2 text-[12px] font-semibold text-pe-text">Coverage at a glance</h4>
                    <CoverageGlance d={d} c={d.completeness} />
                  </>
                ) : (
                  <>
                    <h4 className="mt-2 text-[12px] font-semibold text-pe-text">Coverage by variable</h4>
                    <VariableCoverageList d={d} />
                  </>
                )}
                <ul className="mt-3 flex list-disc flex-col gap-1.5 ps-5 text-[12px] leading-relaxed text-pe-text-2">
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
