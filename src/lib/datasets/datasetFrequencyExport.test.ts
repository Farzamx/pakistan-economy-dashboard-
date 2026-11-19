// Download Datasets: date ranges and CSV export. A selection only ever removes observations; a CSV carries exactly what the workbook carries; and series of
// different frequencies are never combined into one table.

import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { DATASETS, getDataset } from "./datasetRegistry";
import type { DatasetRow, LoadedDataset } from "./datasetLoader";
import { applyDateRange, buildBulkCsv, buildSingleCsv, formatNumber, frequencyOfLoaded, toCsv } from "./datasetExport";
import { buildBulkWorkbook, buildSheetData, buildSingleWorkbook } from "./datasetWorkbook";

const GENERATED = "2026-11-19 10:00 UTC";
const def = (id: string) => getDataset(id)!;

function monthlyRows(n: number, startYear = 2022): DatasetRow[] {
  return Array.from({ length: n }, (_, i) => {
    const y = startYear + Math.floor(i / 12);
    const m = (i % 12) + 1;
    return { period: `${y}-${String(m).padStart(2, "0")}-${new Date(Date.UTC(y, m, 0)).getUTCDate()}`, value: 10 + i / 10 };
  });
}

const cpi = (over: Partial<LoadedDataset> = {}): LoadedDataset => ({
  definition: def("sbp-cpi-inflation"), rows: monthlyRows(36), unit: "Percent", source: "SBP EasyData", frequency: "Monthly", extraColumns: [], ...over,
});
const gdp = (over: Partial<LoadedDataset> = {}): LoadedDataset => ({
  definition: def("worldbank-gdp-growth-pak"), rows: ["2019", "2020", "2021", "2022"].map((p, i) => ({ period: p, value: i + 1 })), unit: "Percent", source: "World Bank", frequency: "Annual", extraColumns: [], ...over,
});
const qgdp = (over: Partial<LoadedDataset> = {}): LoadedDataset => ({
  definition: def("sbp-quarterly-gdp-growth"),
  rows: [{ period: "2016-09-30", value: 5.1, label: "Q1 FY17" }, { period: "2016-12-31", value: 5.8, label: "Q2 FY17" }, { period: "2017-03-31", value: 5.6, label: "Q3 FY17" }],
  unit: "Percent (YoY)", source: "SBP / PBS (QGDP.xlsx)", frequency: "Quarterly", extraColumns: [], ...over,
});
const spi = (): LoadedDataset => ({
  definition: def("pbs-spi-weekly"), rows: [{ period: "2026-10-02", value: 300, extra: { "WoW %": 0.4, "YoY %": 3.1 } }, { period: "2026-10-09", value: 301, extra: { "WoW %": 0.3, "YoY %": 3.0 } }],
  unit: "Index (2015-16=100)", source: "PBS", frequency: "Weekly", extraColumns: ["WoW %", "YoY %"],
});

const parseCsv = (text: string) => text.trimEnd().split("\r\n").map((l) => l.split(","));

describe("catalogue: every series declares the frequency its source publishes", () => {
  it("each definition has a known frequency", () => {
    for (const d of DATASETS) expect(["yearly", "quarterly", "monthly", "weekly", "as-announced"], d.id).toContain(d.frequency);
  });
  it("annual series are the fiscal-balance and the three World Bank series; the only quarterly series is the quarterly GDP growth", () => {
    expect(DATASETS.filter((d) => d.frequency === "yearly").map((d) => d.id).sort()).toEqual(
      ["sbp-fiscal-balance", "worldbank-gdp-growth-bgd", "worldbank-gdp-growth-ind", "worldbank-gdp-growth-pak"].sort(),
    );
    expect(DATASETS.filter((d) => d.frequency === "quarterly").map((d) => d.id)).toEqual(["sbp-quarterly-gdp-growth"]);
  });
  it("the policy rate and auction yields are 'as announced', and the SPI is weekly", () => {
    expect(def("sbp-policy-rate").frequency).toBe("as-announced");
    expect(def("pbs-spi-weekly").frequency).toBe("weekly");
  });
  it("the declared frequency agrees with each loader's own frequency wording", () => {
    // Loader wording per kind (see datasetLoader.ts): worldbank "Annual", fred "Monthly", spi "Weekly", qgdp "Quarterly".
    expect(def("worldbank-gdp-growth-pak").frequency).toBe("yearly");
    expect(def("fred-fed-funds").frequency).toBe("monthly");
  });
});

describe("applyDateRange only ever removes observations", () => {
  it("returns the same series when no valid bound is given", () => {
    const ds = cpi();
    expect(applyDateRange(ds)).toBe(ds);
    expect(applyDateRange(ds, "", "")).toBe(ds);
    expect(applyDateRange(ds, "20", "abc")).toBe(ds);
  });
  it("keeps the rows inside the range, untouched, and records what the full series held", () => {
    const ds = cpi();
    const out = applyDateRange(ds, "2023-01", "2023-12");
    expect(out.rows).toHaveLength(12);
    for (const r of out.rows) expect(ds.rows).toContain(r);
    expect(out.selection).toEqual({ from: "2023-01", to: "2023-12", fullCoverage: "2022-01-31 to 2024-12-31", fullObservations: 36 });
    expect(ds.rows).toHaveLength(36); // the original is not mutated
  });
  it("yearly fiscal series: a year range is by label year", () => {
    const fiscal: LoadedDataset = { ...gdp(), definition: def("sbp-fiscal-balance"), rows: ["FY2021", "FY2022", "FY2023"].map((p) => ({ period: p, value: -1 })), frequency: "Annual" };
    expect(applyDateRange(fiscal, undefined, "2022").rows.map((r) => r.period)).toEqual(["FY2021", "FY2022"]);
  });
  it("can produce an empty selection (the route reports it rather than writing an empty file)", () => {
    expect(applyDateRange(gdp(), "2030").rows).toEqual([]);
  });
});

describe("frequencyOfLoaded checks the declaration against the data", () => {
  it("agrees for a normal monthly series", () => expect(frequencyOfLoaded(cpi())).toBe("monthly"));
  it("uses the observed cadence when the data contradicts the wording", () => {
    expect(frequencyOfLoaded(cpi({ rows: gdp().rows, frequency: "Monthly" }))).toBe("yearly");
  });
  it("falls back to the catalogue's frequency for a series that could not be read", () => {
    expect(frequencyOfLoaded(cpi({ rows: [], frequency: "—", error: "boom" }))).toBe("monthly");
  });
});

describe("CSV: a clean table with the same observations as the workbook", () => {
  it("has a header, one row per observation, and carries indicator, basis, unit, frequency and source on each row", () => {
    const rows = parseCsv(buildSingleCsv(cpi()));
    expect(rows[0]).toEqual(["indicator", "dataset_id", "period", "period_basis", "period_label", "value", "unit", "frequency", "source"]);
    expect(rows).toHaveLength(37);
    expect(rows[1]).toEqual(["CPI Inflation", "sbp-cpi-inflation", "2022-01-31", "observation_date", "", "10", "Percent", "Monthly", "SBP EasyData"]);
  });
  it("matches the workbook: same periods, same values, same order", () => {
    const ds = applyDateRange(cpi(), "2023-03", "2023-09");
    const csvRows = parseCsv(buildSingleCsv(ds)).slice(1).map((r) => [r[2], Number(r[5])]);
    const { aoa, headerRowIndex } = buildSheetData(ds, GENERATED);
    const xlsxRows = aoa.slice(headerRowIndex + 1).map((r) => [r[0], r[1]]);
    expect(csvRows).toEqual(xlsxRows);
    const wb = XLSX.read(buildSingleWorkbook(ds, GENERATED), { type: "buffer" });
    expect(wb.SheetNames).toHaveLength(1);
  });
  it("writes a fiscal year as FY2025 with a fiscal basis, and a calendar year as 2025 with a calendar basis (never converted)", () => {
    const fiscal: LoadedDataset = { ...gdp(), definition: def("sbp-fiscal-balance"), rows: [{ period: "FY2025", value: -6168015 }], frequency: "Annual" };
    expect(parseCsv(buildSingleCsv(fiscal))[1].slice(2, 4)).toEqual(["FY2025", "fiscal_year_july_june"]);
    expect(parseCsv(buildSingleCsv(gdp()))[1].slice(2, 4)).toEqual(["2019", "calendar_year"]);
  });
  it("a quarterly series carries the quarter-END date plus the source's own label", () => {
    const rows = parseCsv(buildSingleCsv(qgdp()));
    expect(rows[1].slice(2, 6)).toEqual(["2016-09-30", "fiscal_quarter_end_date", "Q1 FY17", "5.1"]);
  });
  it("keeps extra published columns (SPI week-on-week / year-on-year) and leaves a missing figure blank, not zero", () => {
    const withGap: LoadedDataset = { ...spi(), rows: [{ period: "2026-10-02", value: 300, extra: { "WoW %": 0.4 } }] };
    const rows = parseCsv(buildSingleCsv(withGap));
    expect(rows[0]).toContain("WoW %");
    expect(rows[1][rows[0].indexOf("YoY %")]).toBe("");
  });
  it("quotes cells that contain commas or quotes", () => {
    expect(toCsv([['He said "hi", twice', 1]])).toBe('"He said ""hi"", twice",1\r\n');
  });
  it("writes plain decimals, never scientific notation, and non-finite values as empty cells", () => {
    expect(formatNumber(1e21)).not.toMatch(/e/i);
    expect(formatNumber(-6168015)).toBe("-6168015");
    expect(formatNumber(Number.NaN)).toBe("");
    expect(formatNumber(Number.POSITIVE_INFINITY)).toBe("");
  });
});

describe("combined downloads never mix frequencies", () => {
  it("the bulk CSV accepts series of ONE frequency and keeps every row", () => {
    const text = buildBulkCsv([cpi(), cpi({ definition: def("sbp-wpi-inflation"), rows: monthlyRows(12) })]);
    const rows = parseCsv(text);
    expect(rows).toHaveLength(1 + 36 + 12);
    expect(new Set(rows.slice(1).map((r) => r[rows[0].indexOf("frequency")]))).toEqual(new Set(["Monthly"]));
  });
  it("refuses to combine different frequencies in one table", () => {
    expect(() => buildBulkCsv([cpi(), gdp()])).toThrow(/different frequencies/);
    expect(() => buildBulkCsv([cpi(), qgdp()])).toThrow(/different frequencies/);
    expect(() => buildBulkCsv([qgdp(), spi()])).toThrow(/different frequencies/);
  });
  it("unions the extra columns across series that share a frequency", () => {
    const rows = parseCsv(buildBulkCsv([spi()]));
    expect(rows[0]).toEqual(expect.arrayContaining(["WoW %", "YoY %"]));
  });
  it("the frequency-specific workbook says so, and lists only that frequency's sheets", () => {
    const wb = XLSX.read(buildBulkWorkbook([cpi(), cpi({ definition: def("sbp-wpi-inflation"), rows: monthlyRows(12) })], GENERATED, { frequency: "Monthly", from: "2022", to: "2024" }), { type: "buffer" });
    expect(wb.SheetNames).toEqual(["Contents", "CPI Inflation", "Wholesale Price Inflation (WPI)"]);
    const flat = XLSX.utils.sheet_to_json<string[]>(wb.Sheets["Contents"], { header: 1 }).map((r) => r.join("|"));
    expect(flat.some((r) => r.startsWith("Frequency|Monthly only"))).toBe(true);
    expect(flat.some((r) => r === "Date filter|2022 to 2024")).toBe(true);
  });
  it("the mixed workbook says each sheet keeps its own frequency and that nothing is converted", () => {
    const wb = XLSX.read(buildBulkWorkbook([cpi(), gdp()], GENERATED), { type: "buffer" });
    const flat = XLSX.utils.sheet_to_json<string[]>(wb.Sheets["Contents"], { header: 1 }).map((r) => r.join("|"));
    expect(flat.some((r) => /^Frequency\|Mixed.*never converted between frequencies/.test(r))).toBe(true);
  });
});

describe("the workbook for a filtered series says it is a slice", () => {
  it("adds the date filter and the full coverage, and still separates download time from observation dates", () => {
    const { aoa } = buildSheetData(applyDateRange(cpi(), "2023-01", "2023-06"), GENERATED);
    const flat = aoa.map((r) => r.join("|"));
    expect(flat).toContain("Date filter|2023-01 to 2023-06");
    expect(flat.some((r) => r.startsWith("Full series coverage|2022-01-31 to 2024-12-31 (36 observations)"))).toBe(true);
    expect(flat.some((r) => r.startsWith("Coverage|2023-01-31 to 2023-06-30"))).toBe(true);
    expect(aoa.find((r) => r[0] === "File generated")).toBeTruthy();
  });
  it("an unfiltered series has no filter lines (existing output is unchanged)", () => {
    const flat = buildSheetData(cpi(), GENERATED).aoa.map((r) => r.join("|"));
    expect(flat.some((r) => r.startsWith("Date filter"))).toBe(false);
    expect(flat.some((r) => r.startsWith("Full series coverage"))).toBe(false);
  });
  it("states the reporting basis in words: fiscal year vs calendar year vs fiscal quarter", () => {
    const basis = (ds: LoadedDataset) => String(buildSheetData(ds, GENERATED).aoa.find((r) => r[0] === "Reporting basis")?.[1]);
    expect(basis({ ...gdp(), definition: def("sbp-fiscal-balance") })).toMatch(/Fiscal year \(1 July - 30 June\)/);
    expect(basis(gdp())).toMatch(/Calendar year/);
    expect(basis(qgdp())).toMatch(/Fiscal-year quarter .*quarter END/);
  });
  it("a quarterly sheet gets a quarter-end header and a column for the source's own label", () => {
    const { aoa, headerRowIndex } = buildSheetData(qgdp(), GENERATED);
    expect(aoa[headerRowIndex]).toEqual(["Quarter end", "Reporting period (source label)", "Value", "Unit"]);
    expect(aoa[headerRowIndex + 1]).toEqual(["2016-09-30", "Q1 FY17", 5.1, "Percent (YoY)"]);
  });
  it("an empty selection says so in the sheet", () => {
    const { aoa } = buildSheetData(applyDateRange(gdp(), "2030"), GENERATED);
    expect(aoa[aoa.length - 1][0]).toBe("No observations fall inside the selected date range.");
  });
});
