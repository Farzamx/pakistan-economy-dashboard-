"use client";

// Searchable, filterable dataset list (Download Datasets), with a frequency selector, a date range, a preview and Excel / CSV downloads.
//
// Client-side only for the filtering: every row, with every observation, is computed on the server and passed in, so the full catalogue renders before
// hydration and no request is made while filtering or previewing. Downloads are plain <a> links to the export route, so they work without JavaScript
// and get native browser download behaviour; the selected frequency and date range travel in the link.
//
// A frequency is a FILTER on the catalogue. Nothing here converts, aggregates or repeats observations from one frequency into another; a frequency
// that no series has says so (see datasetFrequency.ts for the rules, which are unit-tested).

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

const BASIS_LABEL: Record<PeriodKind, string> = {
  fiscalYear: "Fiscal year (Jul–Jun)",
  year: "Calendar year",
  date: "Dated observations",
  quarter: "Fiscal quarters (end date)",
};

type BoundInput = "year" | "month" | "date";

/** What a date box asks for: whole years for yearly (and for the mixed view), months for monthly and quarterly, exact dates for weekly and as-announced. */
function boundInputFor(frequency: FrequencyId | "all"): BoundInput {
  if (frequency === "monthly" || frequency === "quarterly") return "month";
  if (frequency === "weekly" || frequency === "as-announced") return "date";
  return "year";
}

const BOUND_HINT: Record<BoundInput, string> = { year: "year, e.g. 2020", month: "month", date: "date" };

const pillClass = "rounded-full border border-pe-border bg-pe-surface-2 px-1.5 py-px text-[11px] text-pe-text-3";
const linkButton =
  "shrink-0 rounded-[var(--pe-radius)] border border-pe-border bg-pe-surface px-3 py-1.5 text-[13px] font-medium text-pe-accent transition-colors hover:bg-pe-surface-2";
const inputClass =
  "rounded-[var(--pe-radius)] border border-pe-border-strong bg-pe-surface px-2.5 py-1.5 text-[13px] text-pe-text outline-none placeholder:text-pe-text-3 focus:border-pe-accent";

export default function DatasetBrowser({ rows }: { rows: DatasetRowView[] }) {
  const [frequency, setFrequency] = useState<FrequencyId | "all">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<DatasetCategory | "All">("All");
  const [open, setOpen] = useState<string | null>(null);

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

  function chooseFrequency(next: FrequencyId | "all") {
    // The date boxes change kind with the frequency (years, months, dates), so a bound typed for one would not mean the same thing in another.
    setFrequency(next);
    setFrom("");
    setTo("");
    setOpen(null);
  }

  const boundField = (label: string, value: string, set: (v: string) => void) => (
    <label className="flex items-center gap-1.5 text-[12px] text-pe-text-2">
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
    <div>
      {/* ── Frequency ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 border-b border-pe-border px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span id="frequency-label" className="text-[13px] font-semibold text-pe-text">
            Select data frequency
          </span>
          <div role="group" aria-labelledby="frequency-label" className="inline-flex flex-wrap overflow-hidden rounded-[var(--pe-radius)] border border-pe-border-strong">
            {(["all", ...offered] as const).map((f) => {
              const active = frequency === f;
              const n = f === "all" ? rows.length : counts[f];
              return (
                <button
                  key={f}
                  type="button"
                  aria-pressed={active}
                  onClick={() => chooseFrequency(f)}
                  className={`border-s border-pe-border px-3 py-1.5 text-[13px] transition-colors first:border-s-0 ${
                    active ? "bg-pe-surface-2 font-semibold text-pe-accent" : "bg-pe-surface text-pe-text-2 hover:bg-pe-surface-2 hover:text-pe-text"
                  }`}
                >
                  {f === "all" ? "All frequencies" : FREQUENCY_LABEL[f]}
                  <span className={`ms-1.5 text-[11px] tabular-nums ${active ? "text-pe-accent" : "text-pe-text-3"}`}>{n}</span>
                </button>
              );
            })}
          </div>
        </div>
        <p className="text-[12px] leading-relaxed text-pe-text-3">
          Shows only series the source publishes at that frequency. Annual figures are never spread across quarters or months, and monthly figures are never
          averaged into quarters or years.
        </p>

        {/* ── Date range, which changes kind with the frequency ─────────────────────────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {boundField("From", from, setFrom)}
          {boundField("To", to, setTo)}
          {(from || to) && (
            <button type="button" onClick={() => { setFrom(""); setTo(""); }} className="text-[12px] text-pe-accent underline underline-offset-2">
              Clear dates
            </button>
          )}
          <p className="text-[12px] text-pe-text-3">
            {frequency === "all"
              ? "Each series is filtered by the year its observations are labelled with."
              : available
                ? `Available range: ${available.first} to ${available.last}`
                : "No observations to filter."}
          </p>
        </div>
        {!range.ok && (
          <p role="alert" className="text-[12px] text-[var(--pe-crit-text)]">
            {range.error}
          </p>
        )}
      </div>

      {/* ── Search and category (unchanged) ────────────────────────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-pe-border px-4 py-2.5">
        <label className="flex items-center gap-2">
          <span className="sr-only">Search datasets</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search datasets…"
            className={`${inputClass} w-56`}
          />
        </label>

        <div className="flex flex-wrap gap-1" role="group" aria-label="Filter by category">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
              className={`rounded-[var(--pe-radius)] border px-2.5 py-1 text-[12px] transition-colors ${
                category === c
                  ? "border-pe-accent bg-pe-surface-2 font-medium text-pe-accent"
                  : "border-pe-border text-pe-text-2 hover:bg-pe-surface-2 hover:text-pe-text"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <p aria-live="polite" className="ms-auto text-[12px] text-pe-text-3">
          {selected.length} of {frequency === "all" ? rows.length : inFrequency.length} datasets
          {frequency !== "all" ? ` · ${FREQUENCY_LABEL[frequency].toLowerCase()}` : ""}
        </p>
      </div>

      {/* ── Combined download for the selection ────────────────────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-pe-border bg-pe-surface-2/40 px-4 py-2.5">
        {frequency === "all" ? (
          <>
            <a href={bulkHref({ format: "xlsx", ...opts })} download className={linkButton}>
              Download all datasets (.xlsx)
            </a>
            <span className="text-[12px] text-pe-text-3">
              One workbook, one sheet per indicator, each at its own frequency. Choose a frequency to download one CSV of series that share it.
            </span>
          </>
        ) : withData.length > 0 ? (
          <>
            <span className="text-[13px] font-medium text-pe-text">
              All {withData.length} {FREQUENCY_LABEL[frequency].toLowerCase()} dataset{withData.length === 1 ? "" : "s"}
              {rangeApplied ? " in this range" : ""}:
            </span>
            <a href={bulkHref({ format: "xlsx", ...opts })} download className={linkButton}>
              Excel (.xlsx)
            </a>
            <a href={bulkHref({ format: "csv", ...opts })} download className={linkButton}>
              CSV (.csv)
            </a>
            <span className="text-[12px] text-pe-text-3">Only {FREQUENCY_LABEL[frequency].toLowerCase()} observations, nothing converted.</span>
          </>
        ) : (
          <span className="text-[12px] text-pe-text-3">No combined download: nothing is selected.</span>
        )}
      </div>

      {/* ── The list ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */}
      {frequency !== "all" && inFrequency.length === 0 ? (
        <p role="status" className="px-4 py-8 text-center text-[13px] text-pe-text-2">
          {unavailableFrequencyMessage(frequency)}
        </p>
      ) : selected.length === 0 ? (
        <p role="status" className="px-4 py-8 text-center text-[13px] text-pe-text-3">
          No datasets match {query ? `“${query}”` : "this filter"}.
        </p>
      ) : (
        <>
          {rangeApplied && withData.length === 0 && (
            <p role="status" className="border-b border-pe-border px-4 py-3 text-[13px] text-pe-text-2">
              No observations fall inside the selected date range
              {frequency !== "all" && available ? ` for ${FREQUENCY_LABEL[frequency].toLowerCase()} data (available ${available.first} to ${available.last})` : ""}. Clear
              or widen the dates to download.
            </p>
          )}
          <ul className="divide-y divide-pe-border">
            {selected.map(({ dataset, inRange }) => {
              const r = dataset as DatasetRowView;
              const unavailable = Boolean(r.error) || r.observations === 0;
              const empty = !unavailable && inRange.length === 0;
              const limited = !unavailable && r.observations < LIMITED_HISTORY_THRESHOLD;
              const rangeText = inRange.length > 0 ? `${inRange[0][0]} to ${inRange[inRange.length - 1][0]}` : null;
              const isOpen = open === r.id;
              const previewId = `preview-${r.id}`;
              const hasLabels = inRange.some((p) => p[2]);
              return (
                <li key={r.id} className="flex flex-wrap items-start gap-x-4 gap-y-2 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="text-[14px] font-medium text-pe-text">{r.name}</span>
                      <span className={pillClass}>{r.category}</span>
                      {r.frequencyId && <span className={pillClass}>{FREQUENCY_LABEL[r.frequencyId]}</span>}
                      <span className={pillClass}>{BASIS_LABEL[r.periodKind]}</span>
                      {unavailable && (
                        <span className="rounded-full border border-[var(--pe-crit-border)] bg-[var(--pe-crit-bg)] px-1.5 py-px text-[11px] font-medium text-[var(--pe-crit-text)]">
                          Unavailable
                        </span>
                      )}
                      {limited && (
                        <span
                          className="rounded-full border border-[var(--pe-warn-border)] bg-[var(--pe-warn-bg)] px-1.5 py-px text-[11px] font-medium text-[var(--pe-warn-text)]"
                          title={
                            r.coverageNote ??
                            `This series offers ${r.observations} observation${r.observations === 1 ? "" : "s"} — fewer than most datasets here. See the source note for why.`
                          }
                        >
                          Limited history
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[13px] leading-snug text-pe-text-2">{r.description}</p>
                    <p className="mt-1 font-mono text-[11px] text-pe-text-3">
                      {r.unit} · {r.frequency} · {r.source}
                      {rangeText ? ` · ${rangeText}` : r.coverage ? ` · ${r.coverage}` : ""}
                      {r.observations > 0
                        ? rangeApplied
                          ? ` · ${inRange.length} of ${r.observations} observations in range`
                          : ` · ${r.observations} observations`
                        : ""}
                    </p>
                    {/* Shown before the download link, so a source limitation
                        or an annual cadence is understood rather than read as
                        a failed fetch or an economic signal. */}
                    {r.coverageNote && (
                      <div className="mt-1.5 border-s-2 border-pe-border ps-2">
                        <LeadMore leadClassName="text-[12px] leading-relaxed text-pe-text-3">{r.coverageNote}</LeadMore>
                        {r.contextHref && (
                          <p className="text-[12px] leading-relaxed text-pe-text-3">
                            <a href={r.contextHref} className="text-pe-accent underline underline-offset-2">
                              More on this indicator
                            </a>
                          </p>
                        )}
                      </div>
                    )}
                    {r.frequencyNote && <p className="mt-1 text-[12px] text-pe-text-3">{r.frequencyNote}</p>}
                    {r.status && !unavailable && /snapshot/i.test(r.status) && (
                      <p className="mt-1 text-[12px] text-[var(--pe-warn-text)]">{r.status}</p>
                    )}
                    {r.error && <p className="mt-1 text-[12px] text-[var(--pe-crit-text)]">{r.error}</p>}
                    {empty && (
                      <p className="mt-1 text-[12px] text-pe-text-3">No observations fall inside the selected date range. This series covers {r.coverage}.</p>
                    )}

                    {inRange.length > 0 && (
                      <div className="mt-1.5">
                        <button
                          type="button"
                          aria-expanded={isOpen}
                          aria-controls={previewId}
                          onClick={() => setOpen(isOpen ? null : r.id)}
                          className="text-[12px] text-pe-accent underline underline-offset-2"
                        >
                          {isOpen ? "Hide preview" : `Preview ${inRange.length} observation${inRange.length === 1 ? "" : "s"}`}
                        </button>
                        {isOpen && (
                          <div id={previewId} className="mt-1.5 max-h-64 max-w-xl overflow-auto rounded-[var(--pe-radius)] border border-pe-border">
                            <table className="w-full border-collapse text-[12px]">
                              <caption className="sr-only">
                                {r.name}: {inRange.length} observations, {r.frequency.toLowerCase()}
                              </caption>
                              <thead className="sticky top-0 bg-pe-surface-2 text-start text-pe-text-2">
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
                            <p className="border-t border-pe-border px-2.5 py-1.5 text-pe-text-3">
                              {inRange.length > PREVIEW_ROW_LIMIT ? `Showing the first ${PREVIEW_ROW_LIMIT} of ${inRange.length}; the download has all of them. ` : ""}
                              Values are rounded to 4 decimals here; the files keep full precision.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {unavailable || empty || !range.ok ? (
                    <span className="shrink-0 rounded-[var(--pe-radius)] border border-pe-border px-3 py-1.5 text-[13px] text-pe-text-3">
                      {unavailable ? "No data to download" : empty ? "Nothing in this range" : "Fix the date range"}
                    </span>
                  ) : (
                    <div className="flex shrink-0 gap-2">
                      <a href={downloadHref(r.id, { format: "xlsx", ...opts })} download className={linkButton}>
                        Excel
                        <span className="sr-only"> — {r.name}, .xlsx</span>
                      </a>
                      <a href={downloadHref(r.id, { format: "csv", ...opts })} download className={linkButton}>
                        CSV
                        <span className="sr-only"> — {r.name}, .csv</span>
                      </a>
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
