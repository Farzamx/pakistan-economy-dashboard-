"use client";

// Searchable, filterable dataset list (Download Datasets).
//
// Client-side only for the filtering: every row is computed on the server
// and passed in, so the full catalogue renders before hydration and no
// request is made while searching. Downloads are plain <a> links to the
// export route, so they work without JavaScript and get native browser
// download behaviour, progress and resumption.

import { useMemo, useState } from "react";
// Categories come from the client-safe module, never from the server-side
// catalogue: that one reaches sbp.ts for the indicator keys, which
// transitively pulls the server-only curl transport (node:child_process)
// into the browser bundle and fails the Turbopack build. Rows themselves
// are server-rendered and passed in as props.
import { DATASET_CATEGORIES, type DatasetCategory } from "@/lib/datasets/datasetCategories";

export interface DatasetRowView {
  id: string;
  name: string;
  category: DatasetCategory;
  description: string;
  unit: string;
  source: string;
  frequency: string;
  /** "2016-01-31 to 2026-09-30", or null when the series is unavailable. */
  coverage: string | null;
  observations: number;
  /** Publication context shown before download — e.g. why history is short, or how an annual cadence reads. */
  coverageNote?: string;
  /** Indicator page with fuller context, linked from the note. */
  contextHref?: string;
  /** Set when the series could not be read; the row is shown as unavailable. */
  error?: string;
  /** Existing freshness verdict, where the source carries one. */
  status?: string;
}

const LIMITED_HISTORY_THRESHOLD = 12;

export default function DatasetBrowser({ rows }: { rows: DatasetRowView[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<DatasetCategory | "All">("All");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (category !== "All" && r.category !== category) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.source.toLowerCase().includes(q) ||
        r.unit.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
      );
    });
  }, [rows, query, category]);

  const categories: (DatasetCategory | "All")[] = ["All", ...DATASET_CATEGORIES.filter((c) => rows.some((r) => r.category === c))];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-pe-border px-4 py-2.5">
        <label className="flex items-center gap-2">
          <span className="sr-only">Search datasets</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search datasets…"
            className="w-56 rounded-[var(--pe-radius)] border border-pe-border-strong bg-pe-surface px-2.5 py-1.5 text-[13px] text-pe-text outline-none placeholder:text-pe-text-3 focus:border-pe-accent"
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
          {visible.length} of {rows.length} datasets
        </p>
      </div>

      {visible.length === 0 ? (
        <p className="px-4 py-8 text-center text-[13px] text-pe-text-3">
          No datasets match {query ? `“${query}”` : "this filter"}.
        </p>
      ) : (
        <ul className="divide-y divide-pe-border">
          {visible.map((r) => {
            const unavailable = Boolean(r.error) || r.observations === 0;
            const limited = !unavailable && r.observations < LIMITED_HISTORY_THRESHOLD;
            return (
              <li key={r.id} className="flex flex-wrap items-start gap-x-4 gap-y-2 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="text-[14px] font-medium text-pe-text">{r.name}</span>
                    <span className="rounded-full border border-pe-border bg-pe-surface-2 px-1.5 py-px text-[11px] text-pe-text-3">{r.category}</span>
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
                    {r.coverage ? ` · ${r.coverage}` : ""}
                    {r.observations > 0 ? ` · ${r.observations} observations` : ""}
                  </p>
                  {/* Shown before the download link, so a source limitation
                      or an annual cadence is understood rather than read as
                      a failed fetch or an economic signal. */}
                  {r.coverageNote && (
                    <p className="mt-1.5 border-s-2 border-pe-border ps-2 text-[12px] leading-relaxed text-pe-text-3">
                      {r.coverageNote}
                      {r.contextHref && (
                        <>
                          {" "}
                          <a href={r.contextHref} className="text-pe-accent underline underline-offset-2">
                            More on this indicator
                          </a>
                          .
                        </>
                      )}
                    </p>
                  )}
                  {r.error && <p className="mt-1 text-[12px] text-[var(--pe-crit-text)]">{r.error}</p>}
                </div>

                {unavailable ? (
                  <span className="shrink-0 rounded-[var(--pe-radius)] border border-pe-border px-3 py-1.5 text-[13px] text-pe-text-3">
                    No data to download
                  </span>
                ) : (
                  <a
                    href={`/api/datasets/${r.id}`}
                    download
                    className="shrink-0 rounded-[var(--pe-radius)] border border-pe-border bg-pe-surface px-3 py-1.5 text-[13px] font-medium text-pe-accent transition-colors hover:bg-pe-surface-2"
                  >
                    Download Excel
                    <span className="sr-only"> — {r.name}, .xlsx</span>
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
