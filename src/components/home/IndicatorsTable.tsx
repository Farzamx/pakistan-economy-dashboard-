"use client";

// Pakistan indicators for the Overview: category chips, a text filter, a sortable table on desktop and a row list on mobile.
//
// Client component for the interaction only: every row is computed on the server and passed in as props, so filtering and sorting never trigger a
// request, and the full default view is in the server-rendered HTML.
//
// Sorting and matching logic lives in indicatorRows.ts so it can be tested without rendering.

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChangeValue, StatusPill, type StatusTone } from "./valueDisplay";
import { matchesQuery, sortRows, type IndicatorRow, type SortDirection, type SortKey } from "./indicatorRows";

/** How many rows show before "Show all". The total in that control always comes from the data. */
const DEFAULT_VISIBLE = 9;

/** A cross-section for the collapsed view, so it is not just the first group. Rows not listed here appear after "Show all". */
const FEATURED: readonly string[] = ["cpiInflation", "coreInflation", "wpiInflation", "policyRate", "tbillYield3m", "moneySupplyM2", "currentAccount", "tradeBalance", "lsm"];

const CHIP_LABEL: Record<string, string> = { "External sector": "External" };

// "Change" and "Next release" are not sortable: change strings mix units (percentage points, USD billions), and next-release is a label.
const COLUMNS: { key: SortKey | null; label: string; align: "start" | "end" }[] = [
  { key: "name", label: "Indicator", align: "start" },
  { key: "value", label: "Latest", align: "end" },
  { key: null, label: "Change", align: "start" },
  { key: "period", label: "Period", align: "start" },
  { key: null, label: "Next release", align: "start" },
  { key: "freshness", label: "Status", align: "start" },
];

function rowStatus(row: IndicatorRow): { tone: StatusTone; label: string } {
  if (row.status) return row.status;
  // Rows built without the page's status (older callers, tests): name the freshness verdict they carry.
  return { tone: row.freshnessSeverity === "healthy" ? "current" : row.freshnessSeverity === "caution" ? "delayed" : "stale", label: row.freshnessLabel };
}

function IndicatorName({ row, className }: { row: IndicatorRow; className: string }) {
  return row.slug ? (
    <Link href={`/${row.slug}`} className={`${className} hover:text-pe-accent hover:underline`}>{row.name}</Link>
  ) : (
    <span className={className}>{row.name}</span>
  );
}

export default function IndicatorsTable({ rows }: { rows: IndicatorRow[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection } | null>(null);
  const [expanded, setExpanded] = useState(false);

  const categories = useMemo(() => [...new Set(rows.map((r) => r.group))], [rows]);

  const filtering = query.trim() !== "" || category !== null || sort !== null;
  const visible = useMemo(() => {
    const filtered = rows.filter((r) => (category === null || r.group === category) && matchesQuery(r, query));
    const ordered = sort ? sortRows(filtered, sort.key, sort.direction) : filtered;
    if (filtering || expanded || ordered.length <= DEFAULT_VISIBLE) return ordered;
    const featured = ordered.filter((r) => FEATURED.includes(r.id));
    return (featured.length >= Math.min(DEFAULT_VISIBLE, ordered.length) ? featured : ordered).slice(0, DEFAULT_VISIBLE);
  }, [rows, query, category, sort, filtering, expanded]);

  const canExpand = !filtering && rows.length > DEFAULT_VISIBLE;

  function toggleSort(key: SortKey) {
    setSort((prev) => (prev?.key === key ? { key, direction: prev.direction === "asc" ? "desc" : "asc" } : { key, direction: "asc" }));
  }

  const chip = (label: string, value: string | null) => {
    const active = category === value;
    return (
      <button
        key={label}
        type="button"
        aria-pressed={active}
        onClick={() => setCategory(value)}
        className={`min-h-11 shrink-0 whitespace-nowrap rounded-full border px-4 text-[14px] font-medium lg:min-h-9 ${
          active ? "border-pe-accent bg-pe-surface-2 text-pe-text" : "border-pe-border text-pe-text-2 hover:border-pe-border-strong hover:text-pe-text"
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <div>
      <div className="flex flex-col gap-3 px-4 pb-3 lg:flex-row lg:items-center lg:justify-between lg:px-5">
        {/* Scrolls sideways inside the card on a phone; the page itself never scrolls horizontally. */}
        <div role="group" aria-label="Filter by category" className="-mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0">
          {chip("All", null)}
          {categories.map((c) => chip(CHIP_LABEL[c] ?? c, c))}
        </div>
        <label className="flex shrink-0 items-center">
          <span className="sr-only">Filter indicators by name</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter indicators…"
            className="min-h-11 w-full rounded-[var(--pe-radius)] border border-pe-border-strong bg-pe-surface px-3 text-[15px] text-pe-text outline-none placeholder:text-pe-text-3 focus:border-pe-accent lg:min-h-9 lg:w-52 lg:text-[14px]"
          />
        </label>
      </div>
      <p aria-live="polite" className="sr-only">
        Showing {visible.length} of {rows.length} indicators
      </p>

      {visible.length === 0 ? (
        <p className="border-t border-pe-border px-5 py-8 text-center text-[14px] text-pe-text-3">
          {rows.length === 0 ? "Indicator data is unavailable right now." : "No indicators match this filter."}
        </p>
      ) : (
        <>
          {/* Desktop: a real table. */}
          <table className="hidden w-full border-collapse text-[15px] lg:table">
            <caption className="sr-only">Pakistan economic indicators with latest value, change, observation period, next release and data status.</caption>
            <thead>
              <tr className="border-y border-pe-border font-mono text-[12px] uppercase tracking-[0.1em] text-pe-text-3">
                {COLUMNS.map((col, i) => {
                  const key = col.key;
                  const active = key !== null && sort?.key === key;
                  return (
                    <th
                      key={col.label}
                      scope="col"
                      aria-sort={key === null ? undefined : active ? (sort!.direction === "asc" ? "ascending" : "descending") : "none"}
                      className={`whitespace-nowrap py-2.5 font-medium ${col.align === "end" ? "text-end" : "text-start"} ${i === 0 ? "ps-5" : "ps-4"} pe-4`}
                    >
                      {key === null ? (
                        col.label
                      ) : (
                        <button type="button" onClick={() => toggleSort(key)} className="inline-flex items-center gap-1 uppercase tracking-[0.1em] hover:text-pe-text">
                          {col.label}
                          {active && <span aria-hidden="true" className="text-pe-accent">{sort!.direction === "asc" ? "▲" : "▼"}</span>}
                        </button>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => {
                const status = rowStatus(row);
                return (
                  <tr key={row.id} className="border-b border-pe-border hover:bg-pe-surface-2">
                    <th scope="row" className="py-2.5 pe-4 ps-5 text-start font-normal">
                      <IndicatorName row={row} className="font-medium text-pe-text" />
                      <span className="block text-[13px] text-pe-text-3">{row.group}</span>
                    </th>
                    <td className="whitespace-nowrap py-2.5 pe-4 ps-4 text-end font-semibold tabular-nums text-pe-text">
                      {row.value}
                      {row.unit && <span className="ms-1">{row.unit}</span>}
                    </td>
                    <td className="whitespace-nowrap py-2.5 pe-4 ps-4">
                      {row.change ? <ChangeValue change={row.change} className="text-[14px]" /> : <span className="text-pe-text-3">—</span>}
                    </td>
                    <td className="whitespace-nowrap py-2.5 pe-4 ps-4 tabular-nums text-pe-text-2">{row.period}</td>
                    <td className={`whitespace-nowrap py-2.5 pe-4 ps-4 ${row.nextRelease ? "text-pe-text" : "text-pe-text-3"}`}>{row.nextRelease ?? "Not scheduled"}</td>
                    <td className="py-2.5 pe-5 ps-4">
                      <StatusPill tone={status.tone} label={status.label} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Mobile: no table. Name and status on the left, value and change on the right. */}
          <ul className="divide-y divide-pe-border border-t border-pe-border lg:hidden">
            {visible.map((row) => {
              const status = rowStatus(row);
              return (
                <li key={row.id} className="flex min-h-11 items-center justify-between gap-4 px-4 py-3">
                  <span className="min-w-0">
                    <IndicatorName row={row} className="block text-[15px] font-medium leading-snug text-pe-text" />
                    <span className={`block text-[13px] ${status.tone === "current" ? "text-pe-text-3" : status.tone === "due" ? "text-pe-accent" : "text-[var(--pe-warn-text)]"}`}>
                      {row.period} · {status.label}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end">
                    <span className="whitespace-nowrap text-[16px] font-semibold tabular-nums text-pe-text">
                      {row.value}
                      {row.unit && <span className="ms-1">{row.unit}</span>}
                    </span>
                    {row.change && <ChangeValue change={row.change.replace(/\s+vs\s.*$/i, "")} className="text-[13px]" />}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {canExpand && (
        <div className="flex justify-center border-t border-pe-border p-2 max-lg:p-3">
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
            className="min-h-11 w-full rounded-[var(--pe-radius)] px-4 text-[15px] font-medium text-pe-accent hover:underline max-lg:border max-lg:border-pe-border lg:w-auto"
          >
            {expanded ? `Show fewer indicators` : `Show all ${rows.length} indicators →`}
          </button>
        </div>
      )}
    </div>
  );
}
