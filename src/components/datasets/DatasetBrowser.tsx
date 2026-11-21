"use client";

// Searchable, filterable dataset list (Download Datasets): frequency, date range, search, category, per-series previews and Excel / CSV downloads.
//
// Client-side only for the filtering: every row, with every observation, is computed on the server and passed in, so the full catalogue renders before
// hydration and no request is made while filtering or previewing. Downloads are plain <a> links to the export route, so they work without JavaScript
// and get native browser download behaviour; the selected frequency and date range travel in the link.
//
// A frequency is a FILTER on the catalogue. Nothing here converts, aggregates or repeats observations from one frequency into another; a frequency
// that no series has says so (see datasetFrequency.ts for the rules, which are unit-tested).
//
// LAYOUT. One bordered container, hairline-separated zones: filters, search and category, results. Each series is one aligned row (name, frequency,
// latest period, observations, source, downloads) that stacks on narrow screens. Detail and preview are collapsed by default.

import { useMemo, useState } from "react";
// Categories and the frequency rules come from client-safe modules, never from the server-side catalogue: that one reaches sbp.ts for the indicator
// keys, which transitively pulls the server-only curl transport (node:child_process) into the browser bundle and fails the Turbopack build. Rows
// themselves are server-rendered and passed in as props.
import { DATASET_CATEGORIES, type DatasetCategory } from "@/lib/datasets/datasetCategories";
import {
  FREQUENCY_LABEL, availableRange, bulkHref, countByFrequency, datasetsForFrequency, downloadHref, offeredFrequencies, selectDatasets, unavailableFrequencyMessage,
  validateRange, type FrequencyId, type PeriodKind, type SelectableDataset,
} from "@/lib/datasets/datasetFrequency";
import { LeadMore } from "@/components/shell/Disclosure";

export interface DatasetRowView extends SelectableDataset {
  category: DatasetCategory;
  /** The frequency as the source words it ("Monthly", "As-Needed"), for display. */
  frequency: string;
  /** "2016-01-31 to 2026-09-30", or null when the series is unavailable. */
  coverage: string | null;
  observations: number;
  /** How the periods are written: a fiscal year, a calendar year, a dated observation, or a fiscal-quarter end. */
  periodKind: PeriodKind;
  /** Set when the declared frequency was corrected to the cadence the observations actually have. */
  frequencyNote?: string;
  /** Publication context shown before download — e.g. why history is short, or how an annual cadence reads. */
  coverageNote?: string;
  /** Indicator page with fuller context, linked from the note. */
  contextHref?: string;
  /** Existing freshness verdict, where the source carries one. */
  status?: string;
}

const LIMITED_HISTORY_THRESHOLD = 12;
const PREVIEW_ROW_LIMIT = 500;
// The preview rounds for readability only; the downloaded files keep every digit the source published. A fixed locale keeps server and browser identical.
const PREVIEW_NUMBER = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 4, useGrouping: false });
const hasMoreThanFourDecimals = (n: number) => Math.abs(n * 1e4 - Math.round(n * 1e4)) > 1e-6;

/** How a period is written, in words. Dated observations need no label. */
const BASIS_LABEL: Record<PeriodKind, string | null> = {
  fiscalYear: "Fiscal year (Jul–Jun)",
  year: "Calendar year",
  date: null,
  quarter: "Fiscal quarters",
};
const BASIS_DETAIL: Record<PeriodKind, string> = {
  fiscalYear: "Fiscal year (1 July – 30 June), labelled by the year it ends",
  year: "Calendar year (1 January – 31 December)",
  date: "Observation dates, as published",
  quarter: "Fiscal-year quarters (Q1 = July–September); the date shown is the quarter end",
};

type BoundInput = "year" | "month" | "date";

/** What a date box asks for: whole years for yearly (and for the mixed view), months for monthly and quarterly, exact dates for weekly and as-announced. */
function boundInputFor(frequency: FrequencyId | "all"): BoundInput {
  if (frequency === "monthly" || frequency === "quarterly") return "month";
  if (frequency === "weekly" || frequency === "as-announced") return "date";
  return "year";
}

const BOUND_HINT: Record<BoundInput, string> = { year: "year, e.g. 2020", month: "month", date: "date" };

const ROW_GRID = "lg:grid lg:grid-cols-[minmax(0,2.6fr)_7.5rem_7.5rem_5.5rem_minmax(0,1.3fr)_auto] lg:items-center lg:gap-x-4";

const inputClass =
  "h-9 rounded-[var(--pe-radius)] border border-pe-border-strong bg-pe-surface px-2.5 text-[14px] text-pe-text outline-none placeholder:text-pe-text-3 focus:border-pe-accent";
const downloadBase =
  "inline-flex h-9 min-w-[4.5rem] items-center justify-center rounded-[var(--pe-radius)] border px-3 text-[14px] font-medium transition-colors max-sm:h-10";
const excelButton = `${downloadBase} border-pe-accent text-pe-accent hover:bg-pe-surface-2`;
const csvButton = `${downloadBase} border-pe-border-strong text-pe-text hover:bg-pe-surface-2`;
const toggleButton = "inline-flex min-h-7 items-center gap-1 text-[13px] font-medium text-pe-text-2 hover:text-pe-text";

function Chevron({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 10 10" aria-hidden="true" className={`h-2.5 w-2.5 transition-transform ${open ? "rotate-90" : ""}`}><path d="M3 1.5 7 5 3 8.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
  );
}

export default function DatasetBrowser({ rows }: { rows: DatasetRowView[] }) {
  const [frequency, setFrequency] = useState<FrequencyId | "all">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<DatasetCategory | "All">("All");
  // One panel open at a time, across the whole list, so the page stays short.
  const [panel, setPanel] = useState<{ id: string; kind: "details" | "preview" } | null>(null);

  const counts = useMemo(() => countByFrequency(rows), [rows]);
  const offered = useMemo(() => offeredFrequencies(counts), [counts]);
  const inFrequency = useMemo(() => datasetsForFrequency(rows, frequency), [rows, frequency]);
  const available = useMemo(() => availableRange(inFrequency), [inFrequency]);

  const range = validateRange(from, to);
  const selected = useMemo(
    // A reversed or malformed range is reported rather than applied.
    () => selectDatasets(rows, { frequency, from: range.ok ? from : "", to: range.ok ? to : "", query, category }),
    [rows, frequency, from, to, query, category, range.ok],
  );
  const withData = selected.filter((s) => s.inRange.length > 0);
  const inputKind = boundInputFor(frequency);

  const categories: (DatasetCategory | "All")[] = ["All", ...DATASET_CATEGORIES.filter((c) => rows.some((r) => r.category === c))];
  const opts = { from, to, frequency } as const;
  const rangeApplied = range.ok && (from.trim() !== "" || to.trim() !== "");
  const togglePanel = (id: string, kind: "details" | "preview") => setPanel(panel?.id === id && panel.kind === kind ? null : { id, kind });

  function chooseFrequency(next: FrequencyId | "all") {
    // The date boxes change kind with the frequency (years, months, dates), so a bound typed for one would not mean the same thing in another.
    setFrequency(next);
    setFrom("");
    setTo("");
    setPanel(null);
  }

  const boundField = (label: string, value: string, set: (v: string) => void) => (
    <label className="flex items-center gap-1.5 text-[13px] font-medium text-pe-text-2">
      <span>{label}</span>
      <input
        type={inputKind === "year" ? "text" : inputKind}
        inputMode={inputKind === "year" ? "numeric" : undefined}
        maxLength={inputKind === "year" ? 4 : undefined}
        value={value}
        onChange={(e) => set(e.target.value)}
        placeholder={inputKind === "year" ? "e.g. 2020" : undefined}
        aria-label={`${label} (${BOUND_HINT[inputKind]})`}
        className={`${inputClass} ${inputKind === "year" ? "w-24" : "w-40"}`}
      />
    </label>
  );

  return (
    <div className="overflow-hidden rounded-[var(--pe-radius)] border border-pe-border bg-pe-surface">
      {/* ── Zone 1: frequency and date range ────────────────────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 bg-pe-surface-2/40 px-4 py-3.5">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span id="frequency-label" className="text-[14px] font-semibold text-pe-text">
              Select data frequency
            </span>
            <div role="group" aria-labelledby="frequency-label" className="flex flex-wrap gap-1.5">
              {(["all", ...offered] as const).map((f) => {
                const active = frequency === f;
                const n = f === "all" ? rows.length : counts[f];
                return (
                  <button
                    key={f}
                    type="button"
                    aria-pressed={active}
                    onClick={() => chooseFrequency(f)}
                    className={`inline-flex min-h-9 items-center gap-1.5 rounded-[var(--pe-radius)] border px-3 text-[14px] transition-colors max-sm:min-h-10 ${
                      active
                        ? "border-pe-text bg-pe-text font-semibold text-pe-surface"
                        : "border-pe-border-strong bg-pe-surface text-pe-text hover:bg-pe-surface-2"
                    }`}
                  >
                    {f === "all" ? "All" : FREQUENCY_LABEL[f]}
                    <span className={`text-[12px] tabular-nums ${active ? "opacity-80" : "text-pe-text-3"}`}>{n}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <p className="text-[13px] text-pe-text-3">Only observations published at the selected frequency are shown. No data is converted or interpolated.</p>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {boundField("From", from, setFrom)}
          {boundField("To", to, setTo)}
          {(from || to) && (
            <button type="button" onClick={() => { setFrom(""); setTo(""); }} className="text-[13px] font-medium text-pe-accent underline underline-offset-2">
              Clear dates
            </button>
          )}
          <p className="text-[13px] text-pe-text-3">
            {frequency === "all"
              ? "Filtered by the year each observation is labelled with."
              : available
                ? `Available range: ${available.first} to ${available.last}`
                : "No observations to filter."}
          </p>
        </div>
        {!range.ok && (
          <p role="alert" className="text-[13px] text-[var(--pe-crit-text)]">
            {range.error}
          </p>
        )}
      </div>

      {/* ── Zone 2: search and category ──────────────────────────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-pe-border px-4 py-2.5">
        <label className="flex items-center">
          <span className="sr-only">Search datasets</span>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search datasets…" className={`${inputClass} w-full min-w-0 sm:w-60`} />
        </label>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Filter by category">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
              className={`min-h-8 rounded-[var(--pe-radius)] border px-2.5 text-[13px] transition-colors ${
                category === c
                  ? "border-pe-accent bg-pe-surface-2 font-medium text-pe-accent"
                  : "border-pe-border text-pe-text-2 hover:bg-pe-surface-2 hover:text-pe-text"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* ── Zone 3: results ──────────────────────────────────────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-t border-pe-border px-4 py-2">
        <p aria-live="polite" className="text-[13px] text-pe-text-2">
          {selected.length} of {frequency === "all" ? rows.length : inFrequency.length} datasets
          {frequency !== "all" ? ` · ${FREQUENCY_LABEL[frequency].toLowerCase()}` : ""}
        </p>
        {frequency !== "all" && withData.length > 0 && (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-pe-text-2">
            <span>
              All {withData.length} {FREQUENCY_LABEL[frequency].toLowerCase()} dataset{withData.length === 1 ? "" : "s"}
              {rangeApplied ? " in this range" : ""}:
            </span>
            <a href={bulkHref({ format: "xlsx", ...opts })} download className="font-medium text-pe-accent underline underline-offset-2 hover:no-underline">
              Excel (.xlsx)
            </a>
            <a href={bulkHref({ format: "csv", ...opts })} download className="font-medium text-pe-accent underline underline-offset-2 hover:no-underline">
              CSV (.csv)
            </a>
          </p>
        )}
      </div>

      {frequency !== "all" && inFrequency.length === 0 ? (
        <p role="status" className="border-t border-pe-border px-4 py-8 text-center text-[14px] text-pe-text-2">
          {unavailableFrequencyMessage(frequency)}
        </p>
      ) : selected.length === 0 ? (
        <p role="status" className="border-t border-pe-border px-4 py-8 text-center text-[14px] text-pe-text-3">
          No datasets match {query ? `“${query}”` : "this filter"}.
        </p>
      ) : (
        <>
          {rangeApplied && withData.length === 0 && (
            <p role="status" className="border-t border-pe-border px-4 py-3 text-[14px] text-pe-text-2">
              No observations fall inside the selected date range
              {frequency !== "all" && available ? ` for ${FREQUENCY_LABEL[frequency].toLowerCase()} data (available ${available.first} to ${available.last})` : ""}. Clear
              or widen the dates to download.
            </p>
          )}

          {/* Column headings: desktop only. On narrower screens each row labels its own figures. */}
          <div aria-hidden="true" className={`hidden border-t border-pe-border bg-pe-surface-2/40 px-4 py-1.5 text-[12px] font-medium uppercase tracking-[0.05em] text-pe-text-3 ${ROW_GRID}`}>
            <span>Indicator</span>
            <span>Frequency</span>
            <span>Latest</span>
            <span>Obs.</span>
            <span>Source</span>
            <span className="w-[10.25rem] text-end">Download</span>
          </div>

          <ul className="divide-y divide-pe-border border-t border-pe-border">
            {selected.map(({ dataset, inRange }) => {
              const r = dataset as DatasetRowView;
              const unavailable = Boolean(r.error) || r.observations === 0;
              const empty = !unavailable && inRange.length === 0;
              const limited = !unavailable && r.observations < LIMITED_HISTORY_THRESHOLD;
              const last = inRange.length > 0 ? inRange[inRange.length - 1] : null;
              const basis = BASIS_LABEL[r.periodKind];
              const isDetails = panel?.id === r.id && panel.kind === "details";
              const isPreview = panel?.id === r.id && panel.kind === "preview";
              const detailsId = `details-${r.id}`;
              const previewId = `preview-${r.id}`;
              const hasLabels = inRange.some((p) => p[2]);
              const rounded = inRange.some((p) => hasMoreThanFourDecimals(p[1]));
              return (
                <li key={r.id} data-dataset-row={r.id} className="px-4 py-3">
                  <div className={`flex flex-col gap-2 ${ROW_GRID}`}>
                    {/* Indicator */}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span data-dataset-name className="text-[15px] font-semibold leading-snug text-pe-text">
                          {r.name}
                        </span>
                        <span className="text-[13px] text-pe-text-3">{r.category}</span>
                        {unavailable && (
                          <span className="rounded-full border border-[var(--pe-crit-border)] bg-[var(--pe-crit-bg)] px-1.5 py-px text-[12px] font-medium text-[var(--pe-crit-text)]">
                            Unavailable
                          </span>
                        )}
                        {limited && (
                          <span
                            className="rounded-full border border-[var(--pe-warn-border)] bg-[var(--pe-warn-bg)] px-1.5 py-px text-[12px] font-medium text-[var(--pe-warn-text)]"
                            title={
                              r.coverageNote ??
                              `This series offers ${r.observations} observation${r.observations === 1 ? "" : "s"} — fewer than most datasets here. See Details for why.`
                            }
                          >
                            Limited history
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap gap-x-3">
                        <button type="button" aria-expanded={isDetails} aria-controls={detailsId} onClick={() => togglePanel(r.id, "details")} className={toggleButton}>
                          <Chevron open={isDetails} />
                          Details
                        </button>
                        {inRange.length > 0 && (
                          <button type="button" aria-expanded={isPreview} aria-controls={previewId} onClick={() => togglePanel(r.id, "preview")} className={toggleButton}>
                            <Chevron open={isPreview} />
                            Preview
                            <span className="sr-only"> {inRange.length} observations</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Frequency, latest period, observations, source: one line on narrow screens, aligned columns on desktop. */}
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[13px] text-pe-text-2 lg:contents lg:text-[14px]">
                      <span>
                        {r.frequencyId ? FREQUENCY_LABEL[r.frequencyId] : r.frequency}
                        {basis && (
                          <>
                            <span className="lg:hidden"> · </span>
                            <span className="text-pe-text-3 lg:block lg:text-[12px]">{basis}</span>
                          </>
                        )}
                      </span>
                      <span className="tabular-nums">
                        <span className="text-pe-text-3 lg:hidden">Latest </span>
                        <span className="font-mono text-pe-text">{last ? last[0] : "—"}</span>
                        {last?.[2] && (
                          <>
                            <span className="lg:hidden"> · </span>
                            <span className="text-pe-text-3 lg:block lg:text-[12px]">{last[2]}</span>
                          </>
                        )}
                      </span>
                      <span className="tabular-nums">
                        {rangeApplied ? `${inRange.length} of ${r.observations}` : r.observations}
                        <span className="text-pe-text-3 lg:hidden"> observations</span>
                      </span>
                      <span className="min-w-0 lg:truncate" title={r.source}>
                        <span className="text-pe-text-3 lg:hidden">Source: </span>
                        {r.source}
                      </span>
                    </div>

                    {/* Downloads */}
                    {unavailable || empty || !range.ok ? (
                      <span className="text-[13px] text-pe-text-3 lg:w-[10.25rem] lg:text-end">
                        {unavailable ? "No data to download" : empty ? "Nothing in this range" : "Fix the date range"}
                      </span>
                    ) : (
                      <div className="flex gap-2 lg:w-[10.25rem] lg:justify-end">
                        <a href={downloadHref(r.id, { format: "xlsx", ...opts })} download className={excelButton}>
                          Excel
                          <span className="sr-only"> — {r.name}, .xlsx</span>
                        </a>
                        <a href={downloadHref(r.id, { format: "csv", ...opts })} download className={csvButton}>
                          CSV
                          <span className="sr-only"> — {r.name}, .csv</span>
                        </a>
                      </div>
                    )}
                  </div>

                  {r.error && <p className="mt-1 text-[13px] text-[var(--pe-crit-text)]">{r.error}</p>}
                  {empty && <p className="mt-1 text-[13px] text-pe-text-3">No observations fall inside the selected date range. This series covers {r.coverage}.</p>}

                  {/* Details (collapsed by default): everything that is not needed to choose and download. */}
                  {isDetails && (
                    <div id={detailsId} className="mt-2.5 rounded-[var(--pe-radius)] bg-pe-surface-2/50 px-3.5 py-3">
                      <dl className="grid grid-cols-1 gap-x-8 gap-y-2 text-[13px] sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <dt className="text-pe-text-3">About</dt>
                          <dd className="text-pe-text-2">{r.description}</dd>
                        </div>
                        <div>
                          <dt className="text-pe-text-3">Unit</dt>
                          <dd className="text-pe-text">{r.unit}</dd>
                        </div>
                        <div>
                          <dt className="text-pe-text-3">Source</dt>
                          <dd className="text-pe-text">{r.source}</dd>
                        </div>
                        <div>
                          <dt className="text-pe-text-3">Full coverage</dt>
                          <dd className="font-mono text-pe-text">
                            {r.coverage ?? "—"}
                            {r.observations > 0 ? ` · ${r.observations} observations` : ""}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-pe-text-3">Period basis</dt>
                          <dd className="text-pe-text">{BASIS_DETAIL[r.periodKind]}</dd>
                        </div>
                        <div>
                          <dt className="text-pe-text-3">Frequency (as published)</dt>
                          <dd className="text-pe-text">{r.frequency}</dd>
                        </div>
                        {r.status && !unavailable && (
                          <div>
                            <dt className="text-pe-text-3">Data status</dt>
                            <dd className={/snapshot/i.test(r.status) ? "text-[var(--pe-warn-text)]" : "text-pe-text"}>{r.status}</dd>
                          </div>
                        )}
                      </dl>
                      {r.frequencyNote && <p className="mt-2 text-[13px] text-pe-text-2">{r.frequencyNote}</p>}
                      {r.coverageNote && (
                        <div className="mt-2 border-s-2 border-pe-border ps-2">
                          <LeadMore leadClassName="text-[13px] leading-relaxed text-pe-text-2">{r.coverageNote}</LeadMore>
                        </div>
                      )}
                      {r.contextHref && (
                        <p className="mt-2 text-[13px]">
                          <a href={r.contextHref} className="text-pe-accent underline underline-offset-2">
                            More on this indicator
                          </a>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Preview (collapsed by default): a compact table, in chronological order. */}
                  {isPreview && inRange.length > 0 && (
                    <div id={previewId} className="mt-2.5 max-h-64 max-w-xl overflow-auto rounded-[var(--pe-radius)] border border-pe-border">
                      <table className="w-full border-collapse text-[13px]">
                        <caption className="sr-only">
                          {r.name}: {inRange.length} observations, {r.frequency.toLowerCase()}
                        </caption>
                        <thead className="sticky top-0 bg-pe-surface-2 text-pe-text-2">
                          <tr>
                            <th scope="col" className="px-2.5 py-1.5 text-start font-medium">{r.periodKind === "quarter" ? "Quarter end" : "Period"}</th>
                            {hasLabels && <th scope="col" className="px-2.5 py-1.5 text-start font-medium">Source label</th>}
                            <th scope="col" className="px-2.5 py-1.5 text-end font-medium">Value</th>
                            <th scope="col" className="px-2.5 py-1.5 text-start font-medium">Unit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-pe-border">
                          {inRange.slice(0, PREVIEW_ROW_LIMIT).map((p) => (
                            <tr key={p[0]}>
                              <td className="whitespace-nowrap px-2.5 py-1 font-mono text-pe-text">{p[0]}</td>
                              {hasLabels && <td className="whitespace-nowrap px-2.5 py-1 text-pe-text-2">{p[2] ?? ""}</td>}
                              <td className="px-2.5 py-1 text-end font-mono tabular-nums text-pe-text">{PREVIEW_NUMBER.format(p[1])}</td>
                              <td className="px-2.5 py-1 text-pe-text-3">{r.unit}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {(inRange.length > PREVIEW_ROW_LIMIT || rounded) && (
                        <p className="border-t border-pe-border px-2.5 py-1.5 text-pe-text-3">
                          {inRange.length > PREVIEW_ROW_LIMIT ? `First ${PREVIEW_ROW_LIMIT} of ${inRange.length} shown; the download has all. ` : ""}
                          {rounded ? "Rounded to 4 decimals here; files keep full precision." : ""}
                        </p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
