// Download Datasets: date-range selection and CSV export. Pure (no I/O): takes already-loaded series and returns series / text.
//
// A selection only ever REMOVES observations from what the source published. Nothing is added, repeated, converted between frequencies, or re-dated.

import type { DatasetRow, LoadedDataset } from "./datasetLoader";
import { describeRange, filterRowsByRange, frequencyFromDeclared, parseBound, resolveFrequency, type FrequencyId } from "./datasetFrequency";

/**
 * The series restricted to a date range, with a record of the range and of what the series holds in full so a file can say "this is a slice".
 * Returns the series unchanged when no valid bound is given.
 */
export function applyDateRange(ds: LoadedDataset, from?: string | null, to?: string | null): LoadedDataset {
  const f = parseBound(from, "from") ? (from ?? "").trim() : undefined;
  const t = parseBound(to, "to") ? (to ?? "").trim() : undefined;
  if (!f && !t) return ds;
  return {
    ...ds,
    rows: filterRowsByRange(ds.rows, f, t),
    selection: { from: f, to: t, fullCoverage: describeRange(ds.rows), fullObservations: ds.rows.length },
  };
}

// ── CSV ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = typeof value === "number" ? formatNumber(value) : value;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** A plain decimal number, never scientific notation (SPSS and Excel both read it unambiguously). Non-finite values become an empty cell, not zero. */
export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return "";
  const text = String(n);
  if (!/e/i.test(text)) return text;
  // toFixed() itself switches to exponent form from 1e21, so very large values go through BigInt; very small ones are written to 10 decimals.
  if (Math.abs(n) >= 1e21) return BigInt(Math.round(n)).toString();
  return n.toFixed(10).replace(/0+$/, "").replace(/\.$/, "") || "0";
}

export function toCsv(rows: ReadonlyArray<ReadonlyArray<string | number | null | undefined>>): string {
  return rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

const BASIS: Record<LoadedDataset["definition"]["periodKind"], string> = {
  date: "observation_date",
  year: "calendar_year",
  fiscalYear: "fiscal_year_july_june",
  quarter: "fiscal_quarter_end_date",
};

const FIXED_HEAD = ["indicator", "dataset_id", "period", "period_basis", "period_label"] as const;

function dataRow(ds: LoadedDataset, row: DatasetRow, extraColumns: readonly string[]): (string | number | null)[] {
  return [
    ds.definition.name,
    ds.definition.id,
    row.period,
    BASIS[ds.definition.periodKind],
    row.label ?? "",
    row.value,
    ds.unit,
    ...extraColumns.map((c) => row.extra?.[c] ?? null),
    ds.frequency,
    ds.source,
  ];
}

/** One series as a CSV: one observation per row, with the indicator, basis, unit, frequency and source carried on every row. No preamble lines. */
export function buildSingleCsv(ds: LoadedDataset): string {
  const head = [...FIXED_HEAD, "value", "unit", ...ds.extraColumns, "frequency", "source"];
  return toCsv([head, ...ds.rows.map((r) => dataRow(ds, r, ds.extraColumns))]);
}

/**
 * Several series in one CSV (long format, one observation per row). Only series that share ONE frequency may be combined: a table that mixed
 * annual, monthly and weekly observations would be misleading, so this throws instead. Extra published columns (SPI's WoW % / YoY %) become
 * columns that are blank for series without them.
 */
export function buildBulkCsv(datasets: readonly LoadedDataset[]): string {
  const frequencies = new Set(datasets.map((d) => frequencyFromDeclared(d.frequency) ?? `unknown:${d.frequency}`));
  if (frequencies.size > 1) {
    throw new Error(`Cannot combine datasets of different frequencies in one table (${[...frequencies].join(", ")}).`);
  }
  const extras: string[] = [];
  for (const d of datasets) for (const c of d.extraColumns) if (!extras.includes(c)) extras.push(c);
  const head = [...FIXED_HEAD, "value", "unit", ...extras, "frequency", "source"];
  const body = datasets.flatMap((d) => d.rows.map((r) => dataRow(d, r, extras)));
  return toCsv([head, ...body]);
}

/**
 * The frequency a LOADED series is filed under: what the source declares, unless the observation dates clearly show another cadence (see
 * resolveFrequency). Falls back to the catalogue's declared frequency when the series could not be read.
 */
export function frequencyOfLoaded(ds: LoadedDataset): FrequencyId {
  return resolveFrequency(ds.frequency, ds.rows.map((r) => r.period)).id ?? ds.definition.frequency;
}
