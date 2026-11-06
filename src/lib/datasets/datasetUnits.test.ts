// Phase D.1 — exported unit / value coherence.
//
// THE DEFECT THESE TESTS EXIST TO CATCH
// SbpIndicatorHistory.points are already unit-converted by the indicator's
// own `toTrendValue` (Million USD -> B USD, Million PKR -> T PKR), but the
// export layer used to label them with `meta.unit`, which is the UNCONVERTED
// SOURCE unit SBP reports. Nine series were therefore exported understating
// themselves by 1000x or 1,000,000x: a current-account value of -0.356 was
// labelled "Million USD", reading as -$356 thousand rather than -$356
// million; M2's 44.6373 was labelled "Million PKR" rather than 44.64
// trillion PKR.
//
// WHY THESE ASSERTIONS ARE WRITTEN THIS WAY
// Asserting merely that a unit string is non-empty would have passed
// throughout the defect. Every assertion below ties the unit to the actual
// MAGNITUDE of the value it labels, and the scaled catalogue is enumerated
// from configuration (getSbpIndicatorScaleFactor) rather than a hand-written
// list, so a newly added scaling rule cannot escape coverage.

import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import {
  getAllSbpIndicatorKeys,
  getSbpIndicatorDisplayUnit,
  getSbpIndicatorScaleFactor,
  type SbpIndicatorKey,
} from "@/lib/data/sbp";
import { DATASETS } from "./datasetRegistry";
import { buildBulkWorkbook, buildSheetData, buildSingleWorkbook } from "./datasetWorkbook";
import type { LoadedDataset } from "./datasetLoader";

const GENERATED = "2026-11-05 16:30 UTC";

/** The nine series the audit confirmed as scaled, with their true factors. */
const EXPECTED_SCALED: Record<string, { factor: number; unit: string }> = {
  foreignReserves: { factor: 1_000, unit: "B USD" },
  netBankReserves: { factor: 1_000, unit: "B USD" },
  remittances: { factor: 1_000, unit: "B USD" },
  currentAccount: { factor: 1_000, unit: "B USD" },
  tradeBalance: { factor: 1_000, unit: "B USD" },
  exports: { factor: 1_000, unit: "B USD" },
  imports: { factor: 1_000, unit: "B USD" },
  moneySupplyM2: { factor: 1_000_000, unit: "T PKR" },
  fiscalBalance: { factor: 1_000_000, unit: "T PKR" },
};

/** Control series that must stay unscaled — proof the fix is targeted. */
const EXPECTED_UNSCALED: Record<string, string> = {
  cpiInflation: "%",
  coreInflation: "%",
  wpiInflation: "%",
  policyRate: "%",
  tbillYield3m: "%",
  pibYield3y: "%",
  usdPkr: "PKR",
  fdiInflows: "M USD",
  reer: "Index",
  lsm: "Index",
  privateCreditGrowth: "% YoY",
};

// ── The configured catalogue is the source of truth ──────────────────────

describe("scaled-series catalogue is derived from configuration", () => {
  const keys = getAllSbpIndicatorKeys();

  it("covers every registered SBP indicator between the two expectation tables", () => {
    // If a new indicator is added, this fails until it is classified as
    // scaled or unscaled — it cannot silently skip the unit assertions.
    for (const key of keys) {
      const known = key in EXPECTED_SCALED || key in EXPECTED_UNSCALED;
      expect(known, `${key} is not classified in datasetUnits.test.ts`).toBe(true);
    }
  });

  it("finds exactly the nine scaled series the audit confirmed", () => {
    const scaled = keys.filter((k) => getSbpIndicatorScaleFactor(k) !== 1).sort();
    expect(scaled).toEqual(Object.keys(EXPECTED_SCALED).sort());
  });

  it.each(Object.entries(EXPECTED_SCALED))("%s is scaled by its documented factor", (key, { factor }) => {
    expect(getSbpIndicatorScaleFactor(key as SbpIndicatorKey)).toBe(factor);
  });

  it.each(Object.keys(EXPECTED_UNSCALED))("%s applies no scaling", (key) => {
    expect(getSbpIndicatorScaleFactor(key as SbpIndicatorKey)).toBe(1);
  });
});

// ── The display unit must describe the converted magnitude ───────────────

describe("display unit describes the converted magnitude, not the source unit", () => {
  it.each(Object.entries(EXPECTED_SCALED))("%s reports the post-conversion unit", (key, { unit }) => {
    expect(getSbpIndicatorDisplayUnit(key as SbpIndicatorKey)).toBe(unit);
  });

  it.each(Object.entries(EXPECTED_UNSCALED))("%s keeps its own unit", (key, unit) => {
    expect(getSbpIndicatorDisplayUnit(key as SbpIndicatorKey)).toBe(unit);
  });

  it("never labels a divided-by-1000 series as a Million unit", () => {
    // The exact shape of the original defect.
    for (const key of getAllSbpIndicatorKeys()) {
      if (getSbpIndicatorScaleFactor(key) === 1) continue;
      expect(getSbpIndicatorDisplayUnit(key), key).not.toMatch(/^Million /i);
    }
  });

  it("a scaled USD series is denominated in billions, a scaled PKR series in trillions", () => {
    for (const [key, { factor, unit }] of Object.entries(EXPECTED_SCALED)) {
      const display = getSbpIndicatorDisplayUnit(key as SbpIndicatorKey);
      if (factor === 1_000) expect(display, key).toMatch(/^B /);
      if (factor === 1_000_000) expect(display, key).toMatch(/^T /);
      expect(display).toBe(unit);
    }
  });
});

// ── Propagation into the workbook ────────────────────────────────────────

function loaded(id: string, unit: string, rows: { period: string; value: number }[]): LoadedDataset {
  return {
    definition: DATASETS.find((d) => d.id === id)!,
    rows,
    unit,
    source: "SBP EasyData",
    frequency: "Monthly",
    extraColumns: [],
    freshnessState: "current",
  } as LoadedDataset;
}

describe("the display unit reaches the generated workbook", () => {
  // Realistic magnitudes: the real Sep-2026 current account and Oct-2026 M2.
  const CA = loaded("sbp-current-account", "B USD", [
    { period: "2026-08-31", value: -0.288 },
    { period: "2026-09-30", value: -0.356 },
  ]);
  const M2 = loaded("sbp-money-supply-m2", "T PKR", [
    { period: "2026-10-09", value: 44.28 },
    { period: "2026-10-16", value: 44.6373 },
  ]);

  it("writes the display unit in the provenance block, not the source unit", () => {
    const flat = buildSheetData(CA, GENERATED).aoa.map((r) => r.join("|")).join("\n");
    expect(flat).toMatch(/Unit\|B USD/);
    expect(flat).not.toMatch(/Million USD/);
  });

  it("writes the display unit on every data row", () => {
    const { aoa, headerRowIndex } = buildSheetData(CA, GENERATED);
    const data = aoa.slice(headerRowIndex + 1).filter((r) => r.length > 1);
    expect(data.length).toBeGreaterThan(0);
    for (const r of data) expect(r[2]).toBe("B USD");
  });

  it("a trillion-scale series is never labelled in millions", () => {
    const flat = buildSheetData(M2, GENERATED).aoa.map((r) => r.join("|")).join("\n");
    expect(flat).toMatch(/Unit\|T PKR/);
    expect(flat).not.toMatch(/Million PKR/);
  });

  it("the individual workbook carries the corrected unit", () => {
    const wb = XLSX.read(buildSingleWorkbook(CA, GENERATED), { type: "buffer" });
    const csv = XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]);
    expect(csv).toContain("B USD");
    expect(csv).not.toContain("Million USD");
  });

  it("the bulk workbook agrees with the individual workbook", () => {
    const bulk = XLSX.read(buildBulkWorkbook([CA, M2], GENERATED), { type: "buffer" });
    const all = bulk.SheetNames.map((n) => XLSX.utils.sheet_to_csv(bulk.Sheets[n])).join("\n");
    expect(all).toContain("B USD");
    expect(all).toContain("T PKR");
    expect(all).not.toContain("Million USD");
    expect(all).not.toContain("Million PKR");
  });
});

// ── The fix must not have moved any number or date ───────────────────────

describe("the unit correction changes labels only", () => {
  const CA = loaded("sbp-current-account", "B USD", [
    { period: "2026-08-31", value: -0.288 },
    { period: "2026-09-30", value: -0.356 },
  ]);

  it("preserves the numeric values exactly", () => {
    const { aoa, headerRowIndex } = buildSheetData(CA, GENERATED);
    const values = aoa.slice(headerRowIndex + 1).filter((r) => r.length > 1).map((r) => r[1]);
    expect(values).toEqual([-0.288, -0.356]);
  });

  it("preserves observation dates", () => {
    const { aoa, headerRowIndex } = buildSheetData(CA, GENERATED);
    const periods = aoa.slice(headerRowIndex + 1).filter((r) => r.length > 1).map((r) => r[0]);
    expect(periods).toEqual(["2026-08-31", "2026-09-30"]);
  });

  it("preserves fiscal-year labels on an annual fiscal series", () => {
    const fiscal = loaded("sbp-fiscal-balance", "T PKR", [
      { period: "FY2024", value: -7.21 },
      { period: "FY2025", value: -6.168 },
    ]);
    const flat = buildSheetData(fiscal, GENERATED).aoa.map((r) => r.join("|")).join("\n");
    expect(flat).toMatch(/FY2025/);
    // A fiscal label must never be rewritten as a calendar date.
    expect(flat).not.toMatch(/2025-06-30/);
    expect(flat).toMatch(/Unit\|T PKR/);
  });

  it("still separates the download time from observation dates", () => {
    const flat = buildSheetData(CA, GENERATED).aoa.map((r) => r.join("|")).join("\n");
    expect(flat).toMatch(/NOT an observation date/i);
  });
});
