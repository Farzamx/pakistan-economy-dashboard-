// Download Datasets: the "Research Datasets" section.
//
// Curated, finished files published exactly as prepared (see researchDatasets.ts). Separate from the live catalogue and its frequency selector: a
// research dataset is annual, offered only as the files themselves, and nothing here filters, converts or regenerates it.
//
// Layout: the essentials and the four main downloads are always visible; the derived-variables CSV is a small optional link; the technical notes
// (fiscal years, missing values, source differences, limitations) sit in a collapsible "Dataset notes". Nothing is removed, only disclosed on request.
// A dataset with a `guide` (researchDatasets.ts) gets the guided card instead: the four measures explained in plain language as the main focus, what the data can
// help investigate, a short "about the data" block, the downloads, and the technical coverage notes in a collapsible. Same files, same links, same numbers.
// Server component: no client state, every link is a plain <a download> to a static file, and <details> works without JavaScript.

import { RESEARCH_DATASETS, formatFileSize, researchFileHref, type ResearchCompleteness, type ResearchDataset, type ResearchFile, type VariableGuide } from "@/lib/datasets/researchDatasets";

const buttonBase =
  "inline-flex min-h-9 max-w-full items-center justify-center gap-1.5 rounded-[var(--pe-radius)] border px-3.5 py-1.5 text-center text-[14px] font-medium transition-colors";
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
    <dl aria-label="Coverage at a glance" className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 text-[13px] leading-relaxed">
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
    <dl aria-label="Coverage by variable" className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 text-[13px] leading-relaxed">
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

/** Small line icons for the four measures: decorative (the title says it all), drawn with currentColor so they follow the theme. */
const ICON_PATHS: Record<VariableGuide["icon"], React.ReactNode> = {
  money: (
    <>
      <rect x="3" y="6.5" width="18" height="11" rx="2" />
      <circle cx="12" cy="12" r="2.6" />
      <path d="M6.5 9.5v.01M17.5 14.5v.01" />
    </>
  ),
  rate: (
    <>
      <path d="M3 10 12 4l9 6" />
      <path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18" />
    </>
  ),
  prices: (
    <>
      <path d="M3 12.2V4.5A1.5 1.5 0 0 1 4.5 3h7.7a1.5 1.5 0 0 1 1.06.44l7.3 7.3a1.5 1.5 0 0 1 0 2.12l-7.7 7.7a1.5 1.5 0 0 1-2.12 0l-7.3-7.3A1.5 1.5 0 0 1 3 12.2Z" />
      <circle cx="8" cy="8" r="1.2" />
    </>
  ),
  real: (
    <>
      <path d="M12 4v16M7 20h10M5 8h14" />
      <path d="m5 8-2.5 6a3 3 0 0 0 5 0L5 8ZM19 8l-2.5 6a3 3 0 0 0 5 0L19 8Z" />
    </>
  ),
};

function MeasureIcon({ icon }: { icon: VariableGuide["icon"] }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {ICON_PATHS[icon]}
    </svg>
  );
}

const sectionHeading = "text-[15px] font-semibold text-pe-text";

/** Keeps every financial-year label (FY2019-20) on one line: a browser may otherwise break after the hyphen, leaving "FY2019-" and "20" apart. */
function NoBreak({ text }: { text: string }) {
  return (
    <>
      {text.split(/(FY\d{4}-\d{2})/).map((part, i) =>
        /^FY\d{4}-\d{2}$/.test(part) ? (
          <span key={i} className="whitespace-nowrap">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}

/**
 * The guided card: written for a student or beginner researcher. The four measures are the focus; everything technical (coverage per variable, completeness, methodology)
 * is one click away in "Data coverage and technical notes". All figures come from the dataset metadata, which the tests recompute from the published files.
 */
function GuidedCard({ d }: { d: ResearchDataset }) {
  const guide = d.guide!;
  const s = summaryOf(d);
  const main = d.files.filter((f) => !f.optional && f.kind !== "csv-variable");
  const perVariable = d.files.filter((f) => f.kind === "csv-variable");
  const downloadsId = `${d.id}-downloads`;
  return (
    <li key={d.id} data-research-dataset={d.id} data-guided-card className="rounded-[var(--pe-radius)] border border-pe-border bg-pe-surface p-5 sm:p-6">
      <h3 className="text-[16px] font-semibold leading-snug text-pe-text">{d.title}</h3>
      <p className="mt-0.5 text-[13px] text-pe-text-3" data-research-version>
        {d.frequencyLabel} data · {s.version}
      </p>
      <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-pe-text-2">{d.description}</p>
      <a href={`#${downloadsId}`} className="mt-1.5 inline-flex min-h-9 items-center text-[14px] font-medium text-pe-accent hover:underline">
        Go to the downloads ↓
      </a>

      <h4 className={`mt-4 ${sectionHeading}`}>The four measures</h4>
      <p className="mt-0.5 text-[13px] text-pe-text-2">Each one is a yearly figure, shown in percent.</p>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="The four measures">
        {guide.variables.map((v) => {
          const cov = d.variableCoverage?.find((c) => c.variable === v.variable);
          return (
            <li key={v.variable} data-variable-card={v.variable} className="flex flex-col rounded-[var(--pe-radius)] bg-pe-surface-2 p-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pe-surface text-pe-accent">
                  <MeasureIcon icon={v.icon} />
                </span>
                <h5 className="text-[14px] font-semibold leading-snug text-pe-text">{v.title}</h5>
              </div>
              <p className="mt-2.5 text-[14px] leading-relaxed text-pe-text-2">{v.plain}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-pe-text-2">
                <span className="font-medium text-pe-text">Example: </span>
                {v.example}
              </p>
              {cov && (
                <p className="mt-auto pt-3 text-[12px] text-pe-text-3" data-years-available>
                  {cov.observations} of {d.observations} years available
                  {cov.missing.length > 0 && (
                    <>
                      {" (missing "}
                      <NoBreak text={cov.missing.join(", ")} />
                      {")"}
                    </>
                  )}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <h4 className={`mt-6 ${sectionHeading}`}>What can you learn from this dataset?</h4>
      <p className="mt-0.5 max-w-3xl text-[13px] leading-relaxed text-pe-text-2" data-learn-intro>
        {guide.learnIntro}
      </p>
      <ul className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2" aria-label="Research questions the data can help investigate">
        {guide.questions.map((q) => (
          <li key={q} className="flex gap-2.5 text-[14px] leading-relaxed text-pe-text">
            <span aria-hidden="true" className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-pe-accent" />
            {q}
          </li>
        ))}
      </ul>

      <h4 className={`mt-6 ${sectionHeading}`}>About the data</h4>
      <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-3 lg:grid-cols-4" aria-label="About the data">
        {[
          ["Time period", d.coverage],
          ["Frequency", d.frequencyLabel],
          ["Variables", String(d.variables)],
          ["Available values", `${s.available} out of ${s.cells} possible`],
        ].map(([label, value]) => (
          <div key={label} className={label === "Time period" || label === "Available values" ? "col-span-2 lg:col-span-1" : undefined}>
            <dt className="text-[12px] text-pe-text-3">{label}</dt>
            <dd className="mt-0.5 text-[14px] font-medium text-pe-text">
              <NoBreak text={value} />
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 max-w-3xl text-[13px] leading-relaxed text-pe-text-2">
        <NoBreak text={guide.frequencyPlain} />
      </p>
      {d.missingDataNote && (
        <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-pe-text-2" data-missing-data-note>
          <span className="font-medium text-pe-text">One value is missing. </span>
          <NoBreak text={d.missingDataNote} />
        </p>
      )}
      <p className="mt-2 text-[13px] text-pe-text-3">
        Sources: <span className="text-pe-text-2">{d.sources.join(", ")}</span>
      </p>

      <h4 id={downloadsId} className={`mt-6 scroll-mt-20 ${sectionHeading}`}>
        Download the data
      </h4>
      <p className="mt-0.5 max-w-3xl text-[13px] leading-relaxed text-pe-text-2">{guide.downloadHint}</p>
      <h5 className="mt-3 text-[13px] font-semibold text-pe-text" data-research-group="main">
        Main downloads
      </h5>
      <div className="mt-1.5 flex flex-wrap items-center gap-2" role="group" aria-label={`Download ${d.title}`}>
        {main.map((f, i) => (
          <FileButton key={f.kind} dataset={d} file={f} className={i < 2 ? primary : secondary} />
        ))}
      </div>
      <h5 className="mt-3 text-[13px] font-semibold text-pe-text" data-research-group="individual">
        Individual variable downloads
      </h5>
      <div className="mt-1.5 flex flex-wrap items-center gap-2" role="group" aria-label={`Download one variable of ${d.title} as CSV`} data-research-individual-files>
        {perVariable.map((f) => (
          <FileButton key={f.filename} dataset={d} file={f} className={secondary} />
        ))}
      </div>

      <details className="group mt-5 border-t border-pe-border pt-3">
        <summary className="flex min-h-9 cursor-pointer list-none items-center gap-1.5 text-[14px] font-medium text-pe-text-2 hover:text-pe-text [&::-webkit-details-marker]:hidden">
          <svg viewBox="0 0 10 10" aria-hidden="true" className="h-2.5 w-2.5 transition-transform group-open:rotate-90"><path d="M3 1.5 7 5 3 8.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Data coverage and technical notes
        </summary>
        <h5 className="mt-2 text-[13px] font-semibold text-pe-text">Coverage by variable</h5>
        <p className="mt-1 text-[13px] text-pe-text-2">
          {s.complete} of {d.variables} variables have a value for every year; {s.available} of {s.cells} variable-years are available.
        </p>
        <VariableCoverageList d={d} />
        <ul className="mt-3 flex list-disc flex-col gap-1.5 ps-5 text-[13px] leading-relaxed text-pe-text-2">
          {d.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </details>
    </li>
  );
}

export default function ResearchDatasets() {
  return (
    <section id="research-datasets" aria-labelledby="research-datasets-heading">
      <div className="mb-3">
        <h2 id="research-datasets-heading" className="text-[17px] font-semibold text-pe-text">
          Research Datasets
        </h2>
        <p className="mt-0.5 text-[14px] text-pe-text-2">Explore curated historical economic datasets prepared for academic research, statistical analysis and economic studies.</p>
      </div>

      <ul className="flex flex-col gap-4">
        {RESEARCH_DATASETS.map((d) => {
          if (d.guide) return <GuidedCard key={d.id} d={d} />;
          const main = d.files.filter((f) => !f.optional && f.kind !== "csv-variable");
          const perVariable = d.files.filter((f) => f.kind === "csv-variable");
          const extras = d.files.filter((f) => f.optional);
          const s = summaryOf(d);
          return (
            <li key={d.id} data-research-dataset={d.id} className="rounded-[var(--pe-radius)] border border-pe-border bg-pe-surface p-5">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <h3 className="text-[16px] font-semibold leading-snug text-pe-text">{d.title}</h3>
                <span className="rounded-full border border-pe-border bg-pe-surface-2 px-2 py-px text-[12px] font-medium text-pe-text-2">{d.frequencyLabel}</span>
                <span className="rounded-full border border-pe-border bg-pe-surface-2 px-2 py-px text-[12px] font-medium text-pe-text-2" data-research-version>
                  {s.version}
                </span>
              </div>
              <p className="mt-1.5 max-w-3xl text-[14px] leading-relaxed text-pe-text-2">{d.description}</p>

              {/* The essentials, as one quiet line rather than a grid of labelled boxes. */}
              <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[14px] font-medium text-pe-text" aria-label="Dataset summary">
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
                <ul className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-pe-text-2" aria-label="Observations by variable" data-observations-by-variable>
                  {d.variableCoverage.map((v) => (
                    <li key={v.variable} className="whitespace-nowrap">
                      {v.label}: <span className="font-medium tabular-nums text-pe-text">{v.observations} of {d.observations}</span>
                    </li>
                  ))}
                </ul>
              )}
              {d.missingDataNote && (
                <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-pe-text-2" data-missing-data-note>
                  <span className="font-medium text-pe-text">Missing data: </span>
                  {d.missingDataNote}
                </p>
              )}

              {perVariable.length > 0 && (
                <h4 className="mt-4 text-[13px] font-semibold text-pe-text" data-research-group="main">
                  Main downloads
                </h4>
              )}
              <div className={`${perVariable.length > 0 ? "mt-1.5" : "mt-4"} flex flex-wrap items-center gap-2`} role="group" aria-label={`Download ${d.title}`}>
                {main.map((f, i) => (
                  <FileButton key={f.kind} dataset={d} file={f} className={i < 2 ? primary : secondary} />
                ))}
              </div>
              {perVariable.length > 0 && (
                <>
                  <h4 className="mt-4 text-[13px] font-semibold text-pe-text" data-research-group="individual">
                    Individual variable downloads
                  </h4>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2" role="group" aria-label={`Download one variable of ${d.title} as CSV`} data-research-individual-files>
                    {perVariable.map((f) => (
                      <FileButton key={f.filename} dataset={d} file={f} className={secondary} />
                    ))}
                  </div>
                </>
              )}
              {extras.length > 0 && (
                <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[13px] text-pe-text-3">
                  Also available:
                  {extras.map((f) => (
                    <FileButton key={f.kind} dataset={d} file={f} className="inline-flex min-h-9 items-center text-pe-accent underline underline-offset-2 hover:no-underline" />
                  ))}
                </p>
              )}

              <details className="group mt-4 border-t border-pe-border pt-3">
                <summary className="flex min-h-9 cursor-pointer list-none items-center gap-1.5 text-[14px] font-medium text-pe-text-2 hover:text-pe-text [&::-webkit-details-marker]:hidden">
                  <svg viewBox="0 0 10 10" aria-hidden="true" className="h-2.5 w-2.5 transition-transform group-open:rotate-90"><path d="M3 1.5 7 5 3 8.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  Dataset notes
                </summary>
                {d.completeness ? (
                  <>
                    <h4 className="mt-2 text-[13px] font-semibold text-pe-text">Coverage at a glance</h4>
                    <CoverageGlance d={d} c={d.completeness} />
                  </>
                ) : (
                  <>
                    <h4 className="mt-2 text-[13px] font-semibold text-pe-text">Coverage by variable</h4>
                    <VariableCoverageList d={d} />
                  </>
                )}
                <ul className="mt-3 flex list-disc flex-col gap-1.5 ps-5 text-[13px] leading-relaxed text-pe-text-2">
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
