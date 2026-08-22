// Phase 8.10B — tests for the previously-untested Forex_Arch.xlsx parser
// (parseFxReservesSheetHistory / findReservesSheetRows). Written now
// because src/lib/providers/netLiquidReservesAdapter.ts newly depends on
// this exact, unmodified parsing logic for canonicalization — these tests
// exercise the REAL functions, not a reimplementation, satisfying "do not
// duplicate its parsing rules" by construction. Every fixture is a
// programmatically-built XLSX.WorkBook object (via XLSX.utils), matching
// the documented real sheet layout; no network, no real SBP file.

import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { parseFxReservesSheetHistory } from "./syncFxReservesFromSbpExcel";

/** Builds a WorkBook matching Forex_Arch.xlsx's real documented layout: sheet "Week-end", a header row (with some padding rows above it, like the real file's title rows), then data rows. */
function buildWorkbook(dataRows: (string | number | null)[][], opts: { sheetName?: string; headerRow?: string[]; padRows?: number } = {}): XLSX.WorkBook {
  const sheetName = opts.sheetName ?? "Week-end";
  const header = opts.headerRow ?? ["END PERIOD", "NET RESERVES WITH SBP", "NET RESERVES WITH BANKS", "TOTAL LIQUID FX RESERVES"];
  const padRows = opts.padRows ?? 4;
  const aoa: (string | number | null)[][] = [
    ...Array.from({ length: padRows }, () => ["Pakistan's Foreign Exchange Reserves", null, null, null]),
    header,
    ...dataRows,
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return wb;
}

// Excel serial for 2026-07-31 (Friday) and neighboring weeks, computed the
// same way excelSerialToDate() in the module under test does (days since
// 1899-12-30).
function serialFor(dateIso: string): number {
  const ms = Date.UTC(...(dateIso.split("-").map(Number) as [number, number, number]).map((v, i) => (i === 1 ? v - 1 : v)) as [number, number, number]);
  const excelEpoch = Date.UTC(1899, 11, 30);
  return Math.round((ms - excelEpoch) / 86_400_000);
}

describe("1/2/3. valid parsing, week-ending dates, NET RESERVES WITH SBP column selection", () => {
  it("parses a valid workbook into chronological FxReservesWeeklyRow[]", () => {
    const wb = buildWorkbook([
      [serialFor("2026-07-17"), 11000, 500, 11500],
      [serialFor("2026-07-24"), 11050, 510, 11560],
      [serialFor("2026-07-31"), 11123.4, 520, 11643.4],
    ]);
    const history = parseFxReservesSheetHistory(wb);
    expect(history).toHaveLength(3);
    expect(history.map((r) => r.weekEndingDate)).toEqual(["2026-07-17", "2026-07-24", "2026-07-31"]);
    expect(history[2].netSbpReservesM).toBe(11123.4);
    expect(history[2].netBankReservesM).toBe(520);
    expect(history[2].totalLiquidReservesM).toBe(11643.4);
  });

  it("also parses SBP's string date format (DD-Mon-YY)", () => {
    const wb = buildWorkbook([
      ["17-Jul-26", 11000, 500, 11500],
      ["31-Jul-26", 11123, 520, 11643],
    ]);
    const history = parseFxReservesSheetHistory(wb);
    expect(history.map((r) => r.weekEndingDate)).toEqual(["2026-07-17", "2026-07-31"]);
  });

  it("handles the Phase 6A footnote-concatenation bug correctly (2-digit year only)", () => {
    // "29-Oct-2010/" is 29 Oct '20 plus a "10/" footnote reference -- the
    // exact real, previously-confirmed bug this file's own header documents.
    const wb = buildWorkbook([["29-Oct-2010/", 11000, 500, 11500]]);
    const history = parseFxReservesSheetHistory(wb);
    expect(history).toHaveLength(1);
    expect(history[0].weekEndingDate).toBe("2020-10-29");
  });
});

describe("4. malformed workbook rejection", () => {
  it("throws when the sheet has no recognizable header row within the scanned range", () => {
    const wb = buildWorkbook([[serialFor("2026-07-31"), 11123, 520, 11643]], { headerRow: ["SOMETHING", "ELSE", "ENTIRELY", "HERE"] });
    expect(() => parseFxReservesSheetHistory(wb)).toThrow(/could not find a sheet/i);
  });
});

describe("5. missing sheet rejection", () => {
  it("throws when no sheet in the workbook contains the expected header at all", () => {
    const ws = XLSX.utils.aoa_to_sheet([["nothing", "useful", "here"]]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Unrelated");
    expect(() => parseFxReservesSheetHistory(wb)).toThrow(/could not find a sheet/i);
  });
});

describe("6. missing target column rejection", () => {
  it("throws when the header row is present but no valid numeric data rows follow", () => {
    const wb = buildWorkbook([]); // header only, zero data rows
    expect(() => parseFxReservesSheetHistory(wb)).toThrow(/no valid, plausible numeric data rows/i);
  });
});

describe("7. invalid date rejection", () => {
  it("skips a row with an unparseable date rather than throwing on it individually", () => {
    const wb = buildWorkbook([
      ["not-a-real-date", 11000, 500, 11500], // skipped
      [serialFor("2026-07-31"), 11123, 520, 11643], // kept
    ]);
    const history = parseFxReservesSheetHistory(wb);
    expect(history).toHaveLength(1);
    expect(history[0].weekEndingDate).toBe("2026-07-31");
  });
});

describe("8. implausible value rejection", () => {
  it("rejects a value far outside the plausible reserves range ($0.5B-$100B)", () => {
    const wb = buildWorkbook([
      [serialFor("2026-07-17"), 5, 500, 505], // $5M -- implausibly low, rejected
      [serialFor("2026-07-24"), 11050, 510, 11560], // kept
    ]);
    const history = parseFxReservesSheetHistory(wb);
    expect(history).toHaveLength(1);
    expect(history[0].weekEndingDate).toBe("2026-07-24");
  });

  it("rejects a chronologically-inconsistent row (a jump >45 days) as a backstop", () => {
    // Rows are sorted ascending before the backstop runs, then walked
    // oldest -> newest: the first row is always kept (no predecessor), and
    // any later row that jumps more than 45 days past the last KEPT row is
    // dropped rather than accepted into the trend.
    const wb = buildWorkbook([
      [serialFor("2026-06-19"), 11000, 500, 11500], // kept -- first row
      [serialFor("2026-07-31"), 11123, 520, 11643], // ~42 days later -- kept, within backstop
      [serialFor("2027-03-01"), 10500, 500, 11000], // >45 days past the last kept row -- dropped
    ]);
    const history = parseFxReservesSheetHistory(wb);
    expect(history.map((r) => r.weekEndingDate)).toEqual(["2026-06-19", "2026-07-31"]);
  });
});
