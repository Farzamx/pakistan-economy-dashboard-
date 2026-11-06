// Phase D.2 — dataset coverage and publication context.
//
// WHAT THESE TESTS PROTECT
// Two source realities were previously invisible on the Download Datasets
// listing, where a reader decides whether to trust a file:
//   * PBS embeds only a short run of recent weeks in each SPI report and
//     publishes no multi-year archive, so a 10-row SPI download is the
//     source's limit, not a failed fetch.
//   * Fiscal Balance is an annual July–June series whose latest observation
//     is normally many months old, so a "Stale" badge reflects an elapsed
//     tolerance window rather than a provider failure or a wrong figure.
//
// The assertions below test MEANING, not exact sentences: they check that
// the note exists, is attached to the right dataset, makes the required
// distinctions, reaches the workbook, and — importantly — never claims a
// publication date PEIC has not verified or a fixed coverage length the
// source does not guarantee.

import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { DATASETS, getDataset } from "./datasetRegistry";
import { buildBulkWorkbook, buildSheetData, buildSingleWorkbook } from "./datasetWorkbook";
import type { LoadedDataset } from "./datasetLoader";

const GENERATED = "2026-11-05 16:30 UTC";

const SPI = getDataset("pbs-spi-weekly")!;
const FISCAL = getDataset("sbp-fiscal-balance")!;

function loaded(def: typeof SPI, rows: { period: string; value: number }[], over: Partial<LoadedDataset> = {}): LoadedDataset {
  return {
    definition: def,
    rows,
    unit: "Index (2015-16=100)",
    source: "PBS",
    frequency: "Weekly",
    extraColumns: [],
    freshnessState: "current",
    ...over,
  } as LoadedDataset;
}

// ── SPI coverage disclosure ──────────────────────────────────────────────

describe("SPI coverage limitation is disclosed before download", () => {
  it("the SPI dataset carries a coverage note", () => {
    expect(SPI.coverageNote, "pbs-spi-weekly has no coverageNote").toBeTruthy();
  });

  it("attributes the short history to the published source, not a failure", () => {
    const note = SPI.coverageNote!;
    expect(note).toMatch(/PBS/);
    // It must say this is a source limit and explicitly deny a failed fetch.
    expect(note).toMatch(/not a failed fetch|limit of the published source/i);
    expect(note).toMatch(/archive/i);
  });

  it("does not promise a fixed coverage length", () => {
    const note = SPI.coverageNote!;
    // "roughly 10 weeks" is an observation about today's report, not a
    // guarantee — the note must not harden it into a fixed period.
    expect(note).not.toMatch(/\b(10|ten)\s+weeks?\b/i);
    expect(note).not.toMatch(/always|guaranteed|fixed/i);
  });

  it("points at the live figures rather than restating a count", () => {
    expect(SPI.coverageNote!).toMatch(/live figures|observation count/i);
  });

  it("links to the SPI indicator page for fuller context", () => {
    expect(SPI.contextHref).toBe("/weekly-inflation-pakistan");
  });

  it("does not fabricate observations — the row count is whatever the source gave", () => {
    // Three rows in, three rows out: nothing is padded to reach a target.
    const rows = [
      { period: "2026-10-15", value: 372.1 },
      { period: "2026-10-22", value: 374.8 },
      { period: "2026-10-29", value: 373.51 },
    ];
    const { aoa, headerRowIndex } = buildSheetData(loaded(SPI, rows), GENERATED);
    const data = aoa.slice(headerRowIndex + 1).filter((r) => r.length > 1);
    expect(data).toHaveLength(3);
    expect(data.map((r) => r[0])).toEqual(["2026-10-15", "2026-10-22", "2026-10-29"]);
    const flat = aoa.map((r) => r.join("|")).join("\n");
    expect(flat).toMatch(/Observations\|3/);
  });

  it("reports the observation count dynamically, not a hardcoded one", () => {
    const five = Array.from({ length: 5 }, (_, i) => ({ period: `2026-10-0${i + 1}`, value: 370 + i }));
    const flat = buildSheetData(loaded(SPI, five), GENERATED).aoa.map((r) => r.join("|")).join("\n");
    expect(flat).toMatch(/Observations\|5/);
    expect(flat).not.toMatch(/Observations\|10/);
  });
});

// ── Fiscal balance publication context ───────────────────────────────────

describe("fiscal balance annual publication context", () => {
  it("the fiscal dataset carries a coverage note", () => {
    expect(FISCAL.coverageNote, "sbp-fiscal-balance has no coverageNote").toBeTruthy();
  });

  it("states that it is an annual series, distinct from weekly/monthly ones", () => {
    const note = FISCAL.coverageNote!;
    expect(note).toMatch(/annual/i);
    expect(note).toMatch(/once per year|once a year/i);
  });

  it("separates observation age from a verified release date", () => {
    const note = FISCAL.coverageNote!;
    // The whole point: PEIC has NO verified publication date.
    expect(note).toMatch(/no verified/i);
    expect(note).toMatch(/publication date|release date/i);
  });

  it("explains a stale label without weakening or suppressing it", () => {
    const note = FISCAL.coverageNote!;
    expect(note).toMatch(/stale/i);
    // It must deny provider failure AND deny that the figure is wrong.
    expect(note).toMatch(/not that the provider has failed|provider has failed/i);
    expect(note).toMatch(/not that the figure is wrong|figure is wrong/i);
  });

  it("does not invent an SBP release schedule", () => {
    const note = FISCAL.coverageNote!;
    // No month names, no day-of-month, no "published in/by <date>".
    expect(note).not.toMatch(/\b(January|February|March|April|May|June|July 1|August|September|October|November|December)\b\s+\d/i);
    expect(note).not.toMatch(/published (on|in|by)\s+\w+\s+\d/i);
    expect(note).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it("keeps the fiscal-year framing", () => {
    expect(FISCAL.coverageNote!).toMatch(/July|fiscal.year/i);
  });
});

// ── Notes reach the exported workbook ────────────────────────────────────

describe("publication context travels with the download", () => {
  const spiFile = loaded(SPI, [{ period: "2026-10-29", value: 373.51 }]);
  const fiscalFile = loaded(FISCAL, [{ period: "FY2025", value: -6.168 }], {
    unit: "T PKR",
    source: "SBP EasyData",
    frequency: "Annual",
    freshnessState: "stale",
  });

  it("writes the SPI note into the provenance block", () => {
    const flat = buildSheetData(spiFile, GENERATED).aoa.map((r) => r.join("|")).join("\n");
    expect(flat).toMatch(/Publication context\|/);
    expect(flat).toMatch(/archive/i);
  });

  it("writes the fiscal note into the provenance block alongside the status", () => {
    const flat = buildSheetData(fiscalFile, GENERATED).aoa.map((r) => r.join("|")).join("\n");
    expect(flat).toMatch(/Data status\|stale/);
    expect(flat).toMatch(/Publication context\|/);
    expect(flat).toMatch(/no verified/i);
  });

  it("survives the real single workbook", () => {
    const wb = XLSX.read(buildSingleWorkbook(fiscalFile, GENERATED), { type: "buffer" });
    const csv = XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]);
    expect(csv).toMatch(/Publication context/);
  });

  it("survives the bulk workbook", () => {
    const wb = XLSX.read(buildBulkWorkbook([spiFile, fiscalFile], GENERATED), { type: "buffer" });
    const all = wb.SheetNames.map((n) => XLSX.utils.sheet_to_csv(wb.Sheets[n])).join("\n");
    expect(all).toMatch(/Publication context/);
  });

  it("datasets without a limitation carry no note — no blanket warnings", () => {
    const cpi = getDataset("sbp-cpi-inflation")!;
    expect(cpi.coverageNote).toBeUndefined();
    const flat = buildSheetData(
      loaded(cpi, [{ period: "2026-10-31", value: 9.6 }], { unit: "%", source: "SBP EasyData", frequency: "Monthly" }),
      GENERATED,
    ).aoa.map((r) => r.join("|")).join("\n");
    expect(flat).not.toMatch(/Publication context/);
  });

  it("only the two datasets with evidenced limitations carry notes", () => {
    const withNotes = DATASETS.filter((d) => d.coverageNote).map((d) => d.id).sort();
    expect(withNotes).toEqual(["pbs-spi-weekly", "sbp-fiscal-balance"]);
  });
});

// ── D.1 must remain intact ───────────────────────────────────────────────

describe("D.1 unit labelling is unaffected by D.2", () => {
  it("a scaled series still exports its converted unit", () => {
    const fiscalFile = loaded(FISCAL, [{ period: "FY2025", value: -6.168 }], {
      unit: "T PKR",
      source: "SBP EasyData",
      frequency: "Annual",
      freshnessState: "stale",
    });
    const flat = buildSheetData(fiscalFile, GENERATED).aoa.map((r) => r.join("|")).join("\n");
    expect(flat).toMatch(/Unit\|T PKR/);
    expect(flat).not.toMatch(/Million PKR/);
  });

  it("fiscal-year labels are still not rewritten as calendar dates", () => {
    const fiscalFile = loaded(FISCAL, [{ period: "FY2025", value: -6.168 }], {
      unit: "T PKR",
      source: "SBP EasyData",
      frequency: "Annual",
    });
    const { aoa, headerRowIndex } = buildSheetData(fiscalFile, GENERATED);
    const data = aoa.slice(headerRowIndex + 1).filter((r) => r.length > 1);
    expect(data[0][0]).toBe("FY2025");
    expect(aoa.map((r) => r.join("|")).join("\n")).not.toMatch(/2025-06-30/);
  });
});
