import * as XLSX from "xlsx";

// Pakistan's External Debt and Liabilities — Outstanding, quarterly stock.
// Downloaded directly from SBP's ecodata directory (same free, no-API-key
// pattern as quarterlyGdp.ts's QGDP.xlsx — not the EasyData REST API, which
// has no series key for the *outstanding stock* of external debt; SBP
// publishes this specific series only as a maintained Excel workbook).
//
// Verified directly (not assumed) before writing this parser:
// - URL returns HTTP 200, a real .xls workbook.
// - Sheet "New Archive" row 1 reads literally "Pakistan's External Debt and
//   Liabilities - Outstanding (Archive)", unit "(Million US$)".
// - The "Total external debt and liabilities (A+B+C+D+E)" row's values
//   ($73.9B in Jun 2016 rising to $138.0B in Dec 2025) match Pakistan's
//   independently known/reported total external debt figures.
// - Quarterly coverage: 2016-06-30 to 2025-12-31 (24 points) — in line with
//   every other series in this project's HISTORY_START_DATE convention.
const SBP_EXTERNAL_DEBT_URL = "https://www.sbp.org.pk/ecodata/pakdebt_Arch.xls";
const SHEET_NAME = "New Archive";
const TOTAL_ROW_LABEL = "Total external debt and liabilities";

// SBP updates this workbook quarterly; daily revalidation is more than enough.
const REVALIDATE_SECONDS = 60 * 60 * 24;

// XLSX.SSF.format is not reliably exposed through this library's ESM
// namespace import (works fine via CJS require(), which is how this was
// verified during development — confirmed live, this gave `undefined` for
// `XLSX.SSF` here and threw). Excel's date serial epoch (with the
// historical 1900 leap-year bug) is 1899-12-30; 25569 is the day count
// between that epoch and the Unix epoch (1970-01-01) — a standard, well-
// known conversion, verified against this exact workbook's known dates
// (serial 42551 -> 2016-06-30, serial 46022 -> 2025-12-31).
function excelSerialToIsoDate(serial: number): string {
  return new Date(Math.round((serial - 25569) * 86400 * 1000)).toISOString().slice(0, 10);
}

export interface ExternalDebtPoint {
  /** "YYYY-MM-DD", quarter-end. */
  date: string;
  /** Billion USD. */
  value: number;
}

export interface ExternalDebtResult {
  points: ExternalDebtPoint[];
  source: "SBP";
}

function parseWorkbook(buf: ArrayBuffer): ExternalDebtResult {
  const wb = XLSX.read(new Uint8Array(buf), { type: "array" });
  const sheet = wb.Sheets[SHEET_NAME];
  if (!sheet) throw new Error(`Sheet "${SHEET_NAME}" not found in pakdebt_Arch.xls`);

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 }) as unknown[][];

  const dateRowIdx = rows.findIndex((row) => String(row[0] ?? "").trim() === "ITEM");
  if (dateRowIdx === -1) throw new Error('Date row (col[0]="ITEM") not found in "New Archive"');

  const totalRowIdx = rows.findIndex((row) =>
    String(row[0] ?? "").trim().startsWith(TOTAL_ROW_LABEL),
  );
  if (totalRowIdx === -1) throw new Error(`"${TOTAL_ROW_LABEL}" row not found in "New Archive"`);

  const dateRow = rows[dateRowIdx];
  const totalRow = rows[totalRowIdx];

  const points: ExternalDebtPoint[] = [];
  for (let col = 1; col < dateRow.length; col++) {
    const serial = dateRow[col];
    const raw = totalRow[col];
    if (typeof serial !== "number" || raw === undefined || raw === null || raw === "") continue;
    const value = typeof raw === "number" ? raw : parseFloat(String(raw));
    if (!Number.isFinite(value)) continue;
    points.push({
      date: excelSerialToIsoDate(serial),
      value: Number((value / 1000).toFixed(3)), // Million USD -> Billion USD
    });
  }

  if (points.length === 0) throw new Error("No external debt data points extracted from pakdebt_Arch.xls");
  return { points, source: "SBP" };
}

/**
 * Total external debt and liabilities (Billion USD), quarterly. Returns
 * null on failure — no static fallback snapshot for this series.
 */
export async function getExternalDebtHistory(): Promise<ExternalDebtResult | null> {
  try {
    const res = await fetch(SBP_EXTERNAL_DEBT_URL, { next: { revalidate: REVALIDATE_SECONDS } });
    if (!res.ok) throw new Error(`SBP external debt fetch returned ${res.status}`);
    const buf = await res.arrayBuffer();
    return parseWorkbook(buf);
  } catch {
    return null;
  }
}
