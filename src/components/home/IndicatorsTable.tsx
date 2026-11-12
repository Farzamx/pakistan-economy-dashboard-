"use client";

// Searchable, sortable Pakistan indicators table for the homepage
// (PEIC redesign Phase 3).
//
// Client component for the interaction only: every row is computed on the
// server and passed in as props, so searching and sorting never trigger a
// request and the table works (unsorted, unfiltered) before hydration.
//
// Sorting/filtering logic lives in indicatorRows.ts so it can be tested
// without rendering.

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { ChangeValue, FreshnessPill } from "./valueDisplay";
import { matchesQuery, sortRows, type IndicatorRow, type SortDirection, type SortKey } from "./indicatorRows";

// Sortable columns, in display order. "Change" is rendered between Latest
// and Period but is NOT in this list and is not sortable: change strings mix
// units (percentage points, USD billions, index points), so ordering by them
// across indicators would compare incomparable quantities.
const COLUMNS: { key: SortKey; label: string; align: "start" | "end" }[] = [
  { key: "name", label: "Indicator", align: "start" },
  { key: "value", label: "Latest", align: "end" },
  { key: "period", label: "Period", align: "start" },
  { key: "source", label: "Source", align: "start" },
  { key: "freshness", label: "Status", align: "start" },
];

export default function IndicatorsTable({ rows }: { rows: IndicatorRow[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection } | null>(null);

  const visible = useMemo(() => {
    const filtered = rows.filter((r) => matchesQuery(r, query));
    return sort ? sortRows(filtered, sort.key, sort.direction) : filtered;
  }, [rows, query, sort]);

  function toggleSort(key: SortKey) {
    setSort((prev) => (prev?.key === key ? { key, direction: prev.direction === "asc" ? "desc" : "asc" } : { key, direction: "asc" }));
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-pe-border px-4 py-2">
        <label className="flex items-center gap-2 text-[13px] text-pe-text-2">
          <span className="sr-only">Filter indicators</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter indicators…"
            className="w-56 rounded-[var(--pe-radius)] border border-pe-border-strong bg-pe-surface px-2.5 py-1.5 text-[13px] text-pe-text outline-none placeholder:text-pe-text-3 focus:border-pe-accent"
          />
        </label>
        <p aria-live="polite" className="text-[12px] text-pe-text-3">
          {visible.length} of {rows.length} indicators
        </p>
      </div>

      {/* Focusable, labelled scroll container so the off-screen columns are
          reachable by keyboard on narrow viewports. */}
      <div className="overflow-x-auto" tabIndex={0} role="group" aria-label="Pakistan indicators — scroll horizontally for more columns">
        <table className="w-full min-w-[720px] border-collapse text-[13px]">
          <caption className="sr-only">
            Pakistan economic indicators with their latest value, change, observation period, source and data status.
          </caption>
          <thead>
            <tr className="border-b border-pe-border text-[11px] uppercase tracking-[0.05em] text-pe-text-3">
              {COLUMNS.map((col, i) => {
                const active = sort?.key === col.key;
                const header = (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={active ? (sort!.direction === "asc" ? "ascending" : "descending") : "none"}
                    className={`whitespace-nowrap py-1.5 font-medium ${col.align === "end" ? "text-end" : "text-start"} ${i === 0 ? "ps-4" : "ps-3"} pe-3`}
                  >
                    <button type="button" onClick={() => toggleSort(col.key)} className="inline-flex items-center gap-1 hover:text-pe-text">
                      {col.label}
                      <span aria-hidden="true" className={active ? "text-pe-accent" : "text-pe-text-3"}>
                        {active ? (sort!.direction === "asc" ? "▲" : "▼") : "↕"}
                      </span>
                    </button>
                  </th>
                );
                // Non-sortable Change column, in its display position.
                return col.key === "value" ? (
                  <Fragment key={col.key}>
                    {header}
                    <th scope="col" className="whitespace-nowrap py-1.5 pe-3 ps-3 text-start font-medium">
                      Change
                    </th>
                  </Fragment>
                ) : (
                  header
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-[13px] text-pe-text-3">
                  No indicators match “{query}”.
                </td>
              </tr>
            ) : (
              visible.map((row) => (
                <tr key={row.id} className="border-b border-pe-border last:border-0 hover:bg-pe-surface-2">
                  <th scope="row" className="py-1.5 pe-3 ps-4 text-start font-normal">
                    {row.slug ? (
                      <Link href={`/${row.slug}`} className="text-pe-text hover:text-pe-accent hover:underline">
                        {row.name}
                      </Link>
                    ) : (
                      <span className="text-pe-text">{row.name}</span>
                    )}
                    <span className="block text-[11px] text-pe-text-3">{row.group}</span>
                  </th>
                  <td className="whitespace-nowrap py-1.5 pe-3 ps-3 text-end tabular-nums text-pe-text">
                    {row.value}
                    {row.unit && <span className="ms-1 text-[11px] text-pe-text-3">{row.unit}</span>}
                  </td>
                  <td className="whitespace-nowrap py-1.5 pe-3 ps-3">
                    {row.change ? <ChangeValue change={row.change} className="text-[12px]" /> : <span className="text-[12px] text-pe-text-3">—</span>}
                  </td>
                  <td className="whitespace-nowrap py-1.5 pe-3 ps-3 font-mono text-[11px] text-pe-text-3">{row.period}</td>
                  <td className="whitespace-nowrap py-1.5 pe-3 ps-3 text-pe-text-2">{row.source}</td>
                  <td className="py-1.5 pe-3 ps-3">
                    <FreshnessPill severity={row.freshnessSeverity} label={row.freshnessLabel} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
