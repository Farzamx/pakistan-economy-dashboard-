// Download Datasets — tests for the catalogue and the export mapping.
//
// These pin what a downloaded file is allowed to claim: that it covers every
// indicator the project registers, that periods are never silently converted
// into calendar dates, that units and sources travel with the values, and
// that the observation period is never confused with the download time.

import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import fs from "node:fs";
import path from "node:path";
import { DATASETS, DATASET_CATEGORIES, EXCLUDED_DATASETS, getDataset } from "./datasetRegistry";
import { buildBulkWorkbook, buildSheetData, buildSingleWorkbook, toFileName, toSheetName } from "./datasetWorkbook";
import type { LoadedDataset } from "./datasetLoader";
import { getAllSbpIndicatorKeys } from "@/lib/data/sbp";

const GENERATED = "2026-11-05 16:30 UTC";

function makeLoaded(over: Partial<LoadedDataset> = {}): LoadedDataset {
  return {
    definition: DATASETS.find((d) => d.id === "sbp-cpi-inflation")!,
    rows: [
      { period: "2026-08-31", value: 11.1 },
      { period: "2026-09-30", value: 10.3 },
    ],
    unit: "Percent",
    source: "SBP EasyData",
    frequency: "Monthly",
    extraColumns: [],
    freshnessState: "current",
    ...over,
  };
}

describe("registry coverage", () => {
  it("includes every SBP indicator the project registers — no silent omissions", () => {
    const sbpIds = DATASETS.filter((d) => d.kind === "sbp").map((d) => d.sourceKey).sort();
    expect(sbpIds).toEqual([...getAllSbpIndicatorKeys()].sort());
  });

  it("ids are unique and URL-safe", () => {
    const ids = DATASETS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id, id).toMatch(/^[a-z0-9-]+$/);
  });

  it("every dataset declares a known category", () => {
    for (const d of DATASETS) expect(DATASET_CATEGORIES, d.id).toContain(d.category);
  });

  it("getDataset resolves a real id and rejects an unknown one", () => {
    expect(getDataset("sbp-cpi-inflation")?.name).toBe("CPI Inflation");
    expect(getDataset("not-a-dataset")).toBeUndefined();
    // Guards against path traversal reaching the loader.
    expect(getDataset("../../etc/passwd")).toBeUndefined();
  });

  it("covers the non-SBP series the audit confirmed have history", () => {
    const kinds = DATASETS.map((d) => d.kind);
    expect(kinds).toContain("spi");
    expect(kinds.filter((k) => k === "worldbank-gdp")).toHaveLength(3);
    expect(kinds.filter((k) => k === "fred")).toHaveLength(3);
  });

  it("names the excluded series with a reason, rather than omitting them", () => {
    expect(EXCLUDED_DATASETS.length).toBeGreaterThan(0);
    for (const x of EXCLUDED_DATASETS) {
      expect(x.name.length).toBeGreaterThan(0);
      expect(x.reason.length).toBeGreaterThan(20);
    }
    const text = EXCLUDED_DATASETS.map((x) => `${x.name} ${x.reason}`).join(" ").toLowerCase();
    for (const quoteOnly of ["gold", "kse-100", "cross-rate"]) expect(text, quoteOnly).toContain(quoteOnly);
  });

  it("fiscal-year handling is declared only for the annual fiscal series", () => {
    expect(getDataset("sbp-fiscal-balance")?.periodKind).toBe("fiscalYear");
    expect(getDataset("sbp-cpi-inflation")?.periodKind).toBe("date");
    expect(getDataset("worldbank-gdp-growth-pak")?.periodKind).toBe("year");
  });
});

describe("sheet mapping", () => {
  it("carries indicator, unit, frequency, source and coverage into the header block", () => {
    const { aoa } = buildSheetData(makeLoaded(), GENERATED);
    const flat = aoa.map((r) => r.join("|"));
    expect(flat.some((r) => r.startsWith("Indicator|CPI Inflation"))).toBe(true);
    expect(flat.some((r) => r === "Unit|Percent")).toBe(true);
    expect(flat.some((r) => r === "Frequency|Monthly")).toBe(true);
    expect(flat.some((r) => r === "Source|SBP EasyData")).toBe(true);
    expect(flat.some((r) => r.startsWith("Coverage|2026-08-31 to 2026-09-30"))).toBe(true);
    expect(flat.some((r) => r === "Observations|2")).toBe(true);
  });

  it("distinguishes the observation period from the download time", () => {
    const { aoa } = buildSheetData(makeLoaded(), GENERATED);
    const generated = aoa.find((r) => r[0] === "File generated");
    expect(String(generated?.[1])).toContain(GENERATED);
    expect(String(generated?.[1])).toMatch(/NOT an observation date/i);
    expect(aoa.find((r) => r[0] === "Period basis")).toBeTruthy();
  });

  it("writes values as numbers and periods as text, in the source's own units", () => {
    const { aoa, headerRowIndex } = buildSheetData(makeLoaded(), GENERATED);
    expect(aoa[headerRowIndex]).toEqual(["Observation date", "Value", "Unit"]);
    const first = aoa[headerRowIndex + 1];
    expect(first[0]).toBe("2026-08-31");
    expect(first[1]).toBe(11.1);
    expect(typeof first[1]).toBe("number");
    expect(first[2]).toBe("Percent");
  });

  it("regression: a fiscal year stays FY-labelled and is never written as a calendar date", () => {
    const ds = makeLoaded({
      definition: getDataset("sbp-fiscal-balance")!,
      rows: [{ period: "FY2024", value: -7206908 }, { period: "FY2025", value: -6168015 }],
      unit: "Million PKR",
      frequency: "Annual",
    });
    const { aoa, headerRowIndex } = buildSheetData(ds, GENERATED);
    expect(aoa[headerRowIndex][0]).toBe("Fiscal year");
    const row = aoa[headerRowIndex + 1];
    expect(row[0]).toBe("FY2024");
    expect(typeof row[0]).toBe("string");
    // Must not have become a date or a bare number.
    expect(row[0]).not.toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(row[1]).toBe(-7206908);
  });

  it("a calendar-year series is labelled Year and keeps its year string", () => {
    const ds = makeLoaded({
      definition: getDataset("worldbank-gdp-growth-pak")!,
      rows: [{ period: "2025", value: 3.7 }],
      unit: "Percent",
      frequency: "Annual",
      source: "World Bank (NY.GDP.MKTP.KD.ZG)",
    });
    const { aoa, headerRowIndex } = buildSheetData(ds, GENERATED);
    expect(aoa[headerRowIndex][0]).toBe("Year");
    expect(aoa[headerRowIndex + 1][0]).toBe("2025");
  });

  it("keeps the source's own extra published columns (SPI week-on-week / year-on-year)", () => {
    const ds = makeLoaded({
      definition: getDataset("pbs-spi-weekly")!,
      rows: [{ period: "2026-10-29", value: 320.1, extra: { "WoW %": 0.42, "YoY %": 2.89 } }],
      unit: "Index (2015-16=100)",
      source: "PBS",
      frequency: "Weekly",
      extraColumns: ["WoW %", "YoY %"],
    });
    const { aoa, headerRowIndex } = buildSheetData(ds, GENERATED);
    expect(aoa[headerRowIndex]).toEqual(["Observation date", "Value", "Unit", "WoW %", "YoY %"]);
    expect(aoa[headerRowIndex + 1]).toEqual(["2026-10-29", 320.1, "Index (2015-16=100)", 0.42, 2.89]);
  });

  it("an empty series says so instead of producing a silently blank sheet", () => {
    const { aoa } = buildSheetData(makeLoaded({ rows: [], error: "Upstream fetch failed" }), GENERATED);
    const flat = aoa.map((r) => r.join("|"));
    expect(flat.some((r) => r.includes("No observations available"))).toBe(true);
    expect(flat.some((r) => r.startsWith("Note|Upstream fetch failed"))).toBe(true);
    expect(flat.some((r) => r === "Observations|0")).toBe(true);
  });

  it("never invents an observation: row count equals the input exactly", () => {
    const rows = Array.from({ length: 37 }, (_, i) => ({ period: `2026-01-${String(i + 1).padStart(2, "0")}`, value: i }));
    const { aoa, headerRowIndex } = buildSheetData(makeLoaded({ rows }), GENERATED);
    expect(aoa.length - headerRowIndex - 1).toBe(37);
  });
});

describe("workbook generation", () => {
  it("produces a valid single-dataset .xlsx that reads back with its values", () => {
    const buf = buildSingleWorkbook(makeLoaded(), GENERATED);
    expect(buf.length).toBeGreaterThan(0);
    const wb = XLSX.read(buf, { type: "buffer" });
    expect(wb.SheetNames).toEqual(["CPI Inflation"]);
    const text = XLSX.utils.sheet_to_csv(wb.Sheets["CPI Inflation"]);
    expect(text).toContain("10.3");
    expect(text).toContain("SBP EasyData");
    expect(text).toContain("2026-09-30");
  });

  it("bulk workbook has a Contents sheet plus one sheet per dataset, including failed ones", () => {
    const ok = makeLoaded();
    const failed = makeLoaded({
      definition: getDataset("pbs-spi-weekly")!,
      rows: [],
      error: "PBS release unreadable",
    });
    const wb = XLSX.read(buildBulkWorkbook([ok, failed], GENERATED), { type: "buffer" });
    expect(wb.SheetNames[0]).toBe("Contents");
    expect(wb.SheetNames).toHaveLength(3);
    const contents = XLSX.utils.sheet_to_csv(wb.Sheets["Contents"]);
    // The failed dataset is listed with its reason, not dropped.
    expect(contents).toContain("Weekly Inflation (SPI)");
    expect(contents).toContain("Unavailable: PBS release unreadable");
    expect(contents).toContain("Datasets included,2");
  });

  it("sheet names stay within Excel's limits and stay unique", () => {
    expect(toSheetName("A".repeat(60)).length).toBeLessThanOrEqual(31);
    expect(toSheetName("Trade [Balance]: 3M/6M")).not.toMatch(/[[\]:*?/\\]/);
    const taken = new Set(["Real GDP Growth — Pakistan"]);
    const second = toSheetName("Real GDP Growth — Pakistan", taken);
    expect(second).not.toBe("Real GDP Growth — Pakistan");
    expect(second.length).toBeLessThanOrEqual(31);
  });

  it("every catalogue name produces a legal, unique sheet name", () => {
    const taken = new Set<string>(["Contents"]);
    for (const d of DATASETS) {
      const n = toSheetName(d.name, taken);
      expect(n.length, d.name).toBeLessThanOrEqual(31);
      expect(taken.has(n), `duplicate for ${d.name}`).toBe(false);
      taken.add(n);
    }
  });

  it("filenames are meaningful, dated and path-safe", () => {
    expect(toFileName("sbp-cpi-inflation", "xlsx", "2026-11-05")).toBe("peic-sbp-cpi-inflation-2026-11-05.xlsx");
    expect(toFileName("all-datasets", "xlsx", "2026-11-05")).toBe("peic-all-datasets-2026-11-05.xlsx");
    expect(toFileName("../../evil", "xlsx", "2026-11-05")).not.toContain("..");
    expect(toFileName("../../evil", "xlsx", "2026-11-05")).not.toContain("/");
  });
});

describe("client/server boundary", () => {
  // datasetRegistry reaches sbp.ts for the indicator keys, which transitively
  // imports the curl transport (node:child_process). A client component that
  // imports it fails the Turbopack build outright, so the browser-facing
  // component must take its categories from the client-safe module.
  it("the client browser component does not import the server-only registry", () => {
    const client = fs.readFileSync(path.resolve(__dirname, "../../components/datasets/DatasetBrowser.tsx"), "utf8");
    expect(client).toContain('"use client"');
    expect(client).toContain("datasetCategories");
    expect(client).not.toContain("datasetRegistry");
    expect(client).not.toContain("datasetLoader");
  });

  it("the category list has exactly one definition, re-exported by the registry", async () => {
    const shared = await import("./datasetCategories");
    expect(DATASET_CATEGORIES).toBe(shared.DATASET_CATEGORIES);
  });

  it("every dataset's category is one the client component can render", async () => {
    const { DATASET_CATEGORIES: clientSide } = await import("./datasetCategories");
    for (const d of DATASETS) expect(clientSide, d.id).toContain(d.category);
  });
});

describe("no fabricated or hardcoded data", () => {
  it("the loader reads only existing canonical functions — no new provider", () => {
    const loader = fs.readFileSync(path.resolve(__dirname, "./datasetLoader.ts"), "utf8");
    for (const fn of ["getSbpIndicatorHistory", "getSpiHistory", "getGdpGrowthHistory", "getFedFundsHistory"]) {
      expect(loader, fn).toContain(fn);
    }
    // No direct HTTP, no new endpoint, no credential use.
    for (const banned of ["fetch(", "axios", "api.worldbank.org", "process.env", "apiKey"]) {
      expect(loader, banned).not.toContain(banned);
    }
  });

  it("the registry hardcodes no economic observation", () => {
    const reg = fs.readFileSync(path.resolve(__dirname, "./datasetRegistry.ts"), "utf8");
    // Real values seen in the audit must not appear as literals.
    for (const literal of ["10.3", "11.89", "-6168015", "44.64"]) {
      expect(reg, literal).not.toContain(literal);
    }
  });

  it("the workbook builder performs no arithmetic on observations", () => {
    const wbSrc = fs.readFileSync(path.resolve(__dirname, "./datasetWorkbook.ts"), "utf8");
    // Values are passed through; any rescaling would show up as arithmetic on row.value.
    expect(wbSrc).not.toMatch(/row\.value\s*[*/+-]/);
  });
});
