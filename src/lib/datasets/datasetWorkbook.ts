// Workbook construction for Download Datasets.
//
// Pure: takes already-loaded rows and returns sheet data / a Buffer. No I/O
// and no data access, so the mapping rules below are unit-testable.
//
// PERIOD HANDLING — the rule that matters most here.
// Periods are written as TEXT, exactly as the source expresses them:
// "2026-09-30" for a dated observation, "2025" for a calendar year,
// "FY2025" for a fiscal year. They are deliberately NOT converted into
// Excel date serials. A fiscal year is not a day, and coercing "FY2025" or
// "2025" into a date would invent a precision the source never published
// and would render as a misleading calendar date (e.g. 1 Jan 2025) in
// Excel. Values stay numeric so they remain chartable and summable.

import * as XLSX from "xlsx";
import type { LoadedDataset } from "./datasetLoader";

/** Excel's own limit is 31 characters, and []:*?/\ are not permitted. */
export function toSheetName(name: string, taken: Set<string> = new Set()): string {
  const cleaned = name.replace(/[[\]:*?/\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 31) || "Sheet";
  if (!taken.has(cleaned)) return cleaned;
  // Disambiguate with a numeric suffix, still within 31 chars.
  for (let i = 2; i < 100; i++) {
    const suffix = ` (${i})`;
    const candidate = cleaned.slice(0, 31 - suffix.length) + suffix;
    if (!taken.has(candidate)) return candidate;
  }
  return cleaned.slice(0, 28) + "~99";
}

/** Download filename stem: lowercase, hyphenated, no path characters. */
export function toFileName(id: string, extension: string, today: string): string {
  const safe = id.replace(/[^a-z0-9-]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase();
  return `peic-${safe}-${today}.${extension}`;
}

export interface SheetBuildResult {
  /** Rows of cells, ready for XLSX.utils.aoa_to_sheet. */
  aoa: (string | number)[][];
  /** Index of the header row within `aoa`, for column sizing. */
  headerRowIndex: number;
}

/**
 * One dataset as a sheet: a provenance block, then the observations.
 *
 * The provenance block states the observation period basis and the moment
 * the file was generated as two clearly different things, so a reader can
 * never mistake "downloaded today" for "data as of today".
 */
const PERIOD_HEADER: Record<LoadedDataset["definition"]["periodKind"], string> = {
  fiscalYear: "Fiscal year",
  year: "Year",
  date: "Observation date",
  quarter: "Quarter end",
};

/** What a period IS, in words, so fiscal and calendar years (and fiscal quarters) can never be mistaken for one another. */
const REPORTING_BASIS: Record<LoadedDataset["definition"]["periodKind"], string> = {
  fiscalYear: "Fiscal year (1 July - 30 June), labelled by the year it ends, e.g. FY2025 = July 2024 to June 2025",
  year: "Calendar year (1 January - 31 December)",
  date: "Observation date, as published by the source",
  quarter: "Fiscal-year quarter (Q1 = July-September, Q4 = April-June); the date shown is the quarter END",
};

export function buildSheetData(ds: LoadedDataset, generatedAtIso: string): SheetBuildResult {
  const def = ds.definition;
  const periodHeader = PERIOD_HEADER[def.periodKind];
  // A column for the source's own period wording appears only when the series has one (a quarterly series: "Q3 FY26").
  const hasLabels = ds.rows.some((r) => r.label);

  const aoa: (string | number)[][] = [
    ["PEIC — Pakistan Economic Intelligence Center"],
    ["Indicator", def.name],
    ["Description", def.description],
    ["Unit", ds.unit],
    ["Frequency", ds.frequency],
    ...(ds.frequencyNote ? [["Frequency note", ds.frequencyNote]] : []),
    ["Source", ds.source],
    ["Observations", ds.rows.length],
    [
      "Coverage",
      ds.rows.length > 0 ? `${ds.rows[0].period} to ${ds.rows[ds.rows.length - 1].period}` : "No observations available",
    ],
    // Present only when a date range was applied: says this file is a slice, and what the whole series holds.
    ...(ds.selection
      ? [
          ["Date filter", `${ds.selection.from ?? "earliest available"} to ${ds.selection.to ?? "latest available"}`],
          ["Full series coverage", ds.selection.fullCoverage ? `${ds.selection.fullCoverage} (${ds.selection.fullObservations} observations)` : "No observations available"],
        ]
      : []),
    ["Reporting basis", REPORTING_BASIS[def.periodKind]],
    ...(ds.freshnessState ? [["Data status", ds.freshnessState]] : []),
    // Travels with the file so the context is not lost once the workbook
    // leaves the page — a short coverage window or an annual cadence is
    // otherwise easy to misread as a failed fetch.
    ...(def.coverageNote ? [["Publication context", def.coverageNote]] : []),
    // The two timestamps a reader must not conflate.
    ["Period basis", `Each row's ${periodHeader.toLowerCase()} is the period the figure reports on, as published by the source.`],
    ["File generated", `${generatedAtIso} (download time — NOT an observation date)`],
    ...(ds.error ? [["Note", ds.error]] : []),
    [],
    hasLabels ? [periodHeader, "Reporting period (source label)", "Value", "Unit", ...ds.extraColumns] : [periodHeader, "Value", "Unit", ...ds.extraColumns],
  ];
  const headerRowIndex = aoa.length - 1;

  for (const row of ds.rows) {
    aoa.push(
      hasLabels
        ? [row.period, row.label ?? "", row.value, ds.unit, ...ds.extraColumns.map((c) => row.extra?.[c] ?? "")]
        : [row.period, row.value, ds.unit, ...ds.extraColumns.map((c) => row.extra?.[c] ?? "")],
    );
  }
  if (ds.rows.length === 0) {
    aoa.push([ds.selection ? "No observations fall inside the selected date range." : "No observations available for this series."]);
  }
  return { aoa, headerRowIndex };
}

function sheetFromData(ds: LoadedDataset, generatedAtIso: string): XLSX.WorkSheet {
  const { aoa } = buildSheetData(ds, generatedAtIso);
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  const labelled = ds.rows.some((r) => r.label);
  sheet["!cols"] = [{ wch: 22 }, ...(labelled ? [{ wch: 30 }] : []), { wch: 16 }, { wch: 18 }, ...ds.extraColumns.map(() => ({ wch: 12 }))];
  return sheet;
}

/** A single-dataset workbook, as an .xlsx Buffer. */
export function buildSingleWorkbook(ds: LoadedDataset, generatedAtIso: string): Buffer {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheetFromData(ds, generatedAtIso), toSheetName(ds.definition.name));
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

/**
 * All datasets in ONE workbook, one sheet each, plus a contents sheet.
 *
 * One workbook rather than a ZIP of many: it needs no extra dependency
 * (the project already has `xlsx`, and has no archiver), it is a single
 * file a spreadsheet user can open directly, and at this data volume
 * (~30 series, a few hundred rows each) it builds well within a serverless
 * request. The contents sheet lists every dataset INCLUDING any that failed
 * to load, so nothing is silently dropped from the bulk file.
 */
export interface BulkOptions {
  /** A single frequency every included dataset shares (e.g. "Monthly"). Omitted for the mixed-frequency workbook, where each sheet keeps its OWN frequency. */
  frequency?: string;
  from?: string;
  to?: string;
}

export function buildBulkWorkbook(datasets: LoadedDataset[], generatedAtIso: string, options: BulkOptions = {}): Buffer {
  const wb = XLSX.utils.book_new();

  const contents: (string | number)[][] = [
    ["PEIC — Pakistan Economic Intelligence Center"],
    [options.frequency ? `All available ${options.frequency.toLowerCase()} datasets` : "All available datasets"],
    ["File generated", `${generatedAtIso} (download time — NOT an observation date)`],
    ["Datasets included", datasets.length],
    ...(options.frequency
      ? [["Frequency", `${options.frequency} only: every sheet in this workbook has ${options.frequency.toLowerCase()} observations; no other frequency is included or derived.`]]
      : [["Frequency", "Mixed: each sheet keeps the frequency its source publishes (see the Frequency column). Observations are never converted between frequencies."]]),
    ...(options.from || options.to ? [["Date filter", `${options.from ?? "earliest available"} to ${options.to ?? "latest available"}`]] : []),
    [],
    ["Indicator", "Category", "Unit", "Frequency", "Source", "Observations", "Coverage", "Status"],
  ];
  for (const ds of datasets) {
    contents.push([
      ds.definition.name,
      ds.definition.category,
      ds.unit,
      ds.frequency,
      ds.source,
      ds.rows.length,
      ds.rows.length > 0 ? `${ds.rows[0].period} to ${ds.rows[ds.rows.length - 1].period}` : "—",
      ds.error ? `Unavailable: ${ds.error}` : (ds.freshnessState ?? "ok"),
    ]);
  }
  const contentsSheet = XLSX.utils.aoa_to_sheet(contents);
  contentsSheet["!cols"] = [{ wch: 34 }, { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 30 }, { wch: 13 }, { wch: 26 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, contentsSheet, "Contents");

  const taken = new Set<string>(["Contents"]);
  for (const ds of datasets) {
    const name = toSheetName(ds.definition.name, taken);
    taken.add(name);
    XLSX.utils.book_append_sheet(wb, sheetFromData(ds, generatedAtIso), name);
  }
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
