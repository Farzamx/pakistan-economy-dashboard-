"use client";

// "Download CSV" for one chart's numbers. The file starts with comment lines naming the source, the retrieval date and how the values were derived, so a
// downloaded file is never separated from its provenance. Cells that a spreadsheet could read as a formula are prefixed with an apostrophe.

import { track } from "@/lib/analytics/events";

export interface CsvSpec {
  filename: string;
  head: string[];
  rows: (string | number | null)[][];
  /** Lines written above the header (source, retrieval date, definitions). */
  notes: string[];
}

export function csvText({ head, rows, notes }: Omit<CsvSpec, "filename">): string {
  const cell = (v: string | number | null) => {
    if (v === null) return "";
    let s = String(v);
    if (/^[=+\-@\t\r]/.test(s) && !/^-?\d/.test(s)) s = `'${s}`;
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [...notes.map((n) => `# ${n}`), head.map(cell).join(","), ...rows.map((r) => r.map(cell).join(","))].join("\r\n") + "\r\n";
}

export function CsvButton({ spec, label = "Download CSV" }: { spec: CsvSpec; label?: string }) {
  const download = () => {
    track("csv_download", { file: spec.filename, page_path: window.location.pathname });
    const blob = new Blob(["﻿" + csvText(spec)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = spec.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <button
      type="button"
      onClick={download}
      className="inline-flex items-center gap-1.5 rounded-[var(--pe-radius)] border border-pe-border-strong bg-pe-surface px-2.5 py-1 text-[13px] font-medium text-pe-accent transition-colors hover:bg-pe-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pe-focus)]"
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M8 2v8m0 0L4.5 6.5M8 10l3.5-3.5M3 13h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
      <span className="sr-only"> ({spec.filename})</span>
    </button>
  );
}
