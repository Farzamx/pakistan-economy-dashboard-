// Download Datasets route: frequency, format and date-range handling, end to end through the real route handler with the loader mocked.
// Each request below is one a visitor can make from the page.

import { describe, expect, it, vi } from "vitest";
import * as XLSX from "xlsx";
import { NextRequest } from "next/server";
import type { DatasetDefinition } from "./datasetRegistry";
import type { LoadedDataset } from "./datasetLoader";

const FIXTURES: Record<string, Pick<LoadedDataset, "rows" | "unit" | "source" | "frequency" | "extraColumns">> = {
  "sbp-cpi-inflation": {
    rows: Array.from({ length: 36 }, (_, i) => {
      const y = 2022 + Math.floor(i / 12);
      const m = (i % 12) + 1;
      return { period: `${y}-${String(m).padStart(2, "0")}-${new Date(Date.UTC(y, m, 0)).getUTCDate()}`, value: 10 + i / 10 };
    }),
    unit: "Percent", source: "SBP EasyData", frequency: "Monthly", extraColumns: [],
  },
  "worldbank-gdp-growth-pak": { rows: ["2019", "2020", "2021", "2022", "2023"].map((p, i) => ({ period: p, value: i + 1 })), unit: "Percent", source: "World Bank", frequency: "Annual", extraColumns: [] },
  "sbp-fiscal-balance": { rows: ["FY2022", "FY2023", "FY2024"].map((p, i) => ({ period: p, value: -i - 1 })), unit: "Trillion PKR", source: "SBP EasyData", frequency: "Annual", extraColumns: [] },
  "sbp-quarterly-gdp-growth": {
    rows: [{ period: "2016-09-30", value: 5.1, label: "Q1 FY17" }, { period: "2016-12-31", value: 5.8, label: "Q2 FY17" }, { period: "2017-03-31", value: 5.6, label: "Q3 FY17" }],
    unit: "Percent (YoY)", source: "SBP / PBS (QGDP.xlsx)", frequency: "Quarterly", extraColumns: [],
  },
};

vi.mock("./datasetLoader", () => ({
  loadDataset: async (definition: DatasetDefinition): Promise<LoadedDataset> => {
    const f = FIXTURES[definition.id];
    return f ? { definition, ...f } : { definition, rows: [], unit: "—", source: "—", frequency: "—", extraColumns: [], error: "no fixture" };
  },
}));

import { GET } from "@/app/api/datasets/[id]/route";

const call = (id: string, qs = "") => GET(new NextRequest(`http://localhost/api/datasets/${id}${qs ? `?${qs}` : ""}`), { params: Promise.resolve({ id }) });
const csv = async (res: Response) => (await res.text()).trimEnd().split("\r\n").map((l) => l.split(","));
const sheetRows = (buf: ArrayBuffer, sheet?: string) => {
  const wb = XLSX.read(buf, { type: "array" });
  return { wb, rows: XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheet ?? wb.SheetNames[0]], { header: 1 }) as unknown[][] };
};

describe("single dataset", () => {
  it("defaults to the workbook, exactly as before (no parameters)", async () => {
    const res = await call("sbp-cpi-inflation");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("spreadsheetml");
    expect(res.headers.get("content-disposition")).toMatch(/peic-sbp-cpi-inflation-\d{4}-\d{2}-\d{2}\.xlsx/);
    const { rows } = sheetRows(await res.arrayBuffer());
    expect(rows.filter((r) => /^\d{4}-/.test(String(r[0])))).toHaveLength(36);
  });

  it("CSV: only the selected dataset's observations, in order, with no duplicates", async () => {
    const res = await call("sbp-cpi-inflation", "format=csv");
    expect(res.headers.get("content-type")).toContain("text/csv");
    expect(res.headers.get("content-disposition")).toMatch(/\.csv"/);
    const rows = await csv(res);
    const periods = rows.slice(1).map((r) => r[2]);
    expect(periods).toHaveLength(36);
    expect(new Set(periods).size).toBe(36);
    expect(periods).toEqual([...periods].sort());
  });

  it("Excel and CSV carry the same observations for the same selection", async () => {
    const qs = "frequency=monthly&from=2023-01&to=2023-12";
    const x = sheetRows(await (await call("sbp-cpi-inflation", `${qs}&format=xlsx`)).arrayBuffer()).rows.filter((r) => /^2023-/.test(String(r[0]))).map((r) => [r[0], r[1]]);
    const c = (await csv(await call("sbp-cpi-inflation", `${qs}&format=csv`))).slice(1).map((r) => [r[2], Number(r[5])]);
    expect(c).toHaveLength(12);
    expect(x).toEqual(c);
  });

  it("a date range returns only the observations inside it, never more", async () => {
    const rows = (await csv(await call("sbp-cpi-inflation", "format=csv&from=2023-03&to=2023-08"))).slice(1);
    expect(rows.map((r) => r[2])).toEqual(["2023-03-31", "2023-04-30", "2023-05-31", "2023-06-30", "2023-07-31", "2023-08-31"]);
  });

  it("yearly: the range is by label year, and fiscal years stay FY-labelled in the file", async () => {
    const rows = (await csv(await call("sbp-fiscal-balance", "format=csv&frequency=yearly&to=2023"))).slice(1);
    expect(rows.map((r) => r.slice(2, 4))).toEqual([["FY2022", "fiscal_year_july_june"], ["FY2023", "fiscal_year_july_june"]]);
  });

  it("quarterly: keeps the quarter-end date and the source's own label", async () => {
    const rows = (await csv(await call("sbp-quarterly-gdp-growth", "format=csv&frequency=quarterly&from=2016-12"))).slice(1);
    expect(rows.map((r) => r.slice(2, 5))).toEqual([["2016-12-31", "fiscal_quarter_end_date", "Q2 FY17"], ["2017-03-31", "fiscal_quarter_end_date", "Q3 FY17"]]);
  });

  it("REFUSES a frequency the series does not have, and offers no conversion", async () => {
    const res = await call("worldbank-gdp-growth-pak", "frequency=monthly&format=csv");
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toBe("Monthly observations are not currently available for this indicator. Please select another frequency.");
    expect(body.availableFrequency).toBe("yearly");
    const quarterlyOfAnnual = await call("sbp-cpi-inflation", "frequency=quarterly");
    expect(quarterlyOfAnnual.status).toBe(422);
    expect((await quarterlyOfAnnual.json()).availableFrequency).toBe("monthly");
  });

  it("accepts the frequency the series genuinely has", async () => {
    expect((await call("worldbank-gdp-growth-pak", "frequency=yearly")).status).toBe(200);
    expect((await call("sbp-cpi-inflation", "frequency=monthly")).status).toBe(200);
  });

  it("an empty selection is reported, with the series' real coverage, instead of an empty file", async () => {
    const res = await call("worldbank-gdp-growth-pak", "from=2030&format=csv");
    expect(res.status).toBe(422);
    expect((await res.json()).error).toMatch(/No observations fall inside the selected date range.*2019 to 2023/);
  });

  it("rejects malformed parameters", async () => {
    expect((await call("sbp-cpi-inflation", "format=pdf")).status).toBe(400);
    expect((await call("sbp-cpi-inflation", "frequency=daily")).status).toBe(400);
    expect((await call("sbp-cpi-inflation", "from=20")).status).toBe(400);
    expect((await call("sbp-cpi-inflation", "from=2025&to=2020")).status).toBe(400);
    expect((await call("sbp-cpi-inflation", "to=2020-13")).status).toBe(400);
  });

  it("unknown datasets are 404, and a path-traversal id never reaches the loader", async () => {
    expect((await call("nope")).status).toBe(404);
    expect((await call("../../etc/passwd")).status).toBe(404);
  });

  it("a series that could not be read is an error for CSV (no empty file) but an explained workbook for Excel", async () => {
    expect((await call("sbp-usd-pkr", "format=csv")).status).toBe(503);
    const x = await call("sbp-usd-pkr");
    expect(x.status).toBe(200);
    expect(sheetRows(await x.arrayBuffer()).rows.some((r) => String(r[0]) === "Note")).toBe(true);
  });
});

describe("all datasets", () => {
  it("without a frequency: the workbook, with each sheet keeping its own frequency", async () => {
    const res = await call("all");
    expect(res.status).toBe(200);
    const { wb, rows } = sheetRows(await res.arrayBuffer(), "Contents");
    expect(wb.SheetNames).toContain("CPI Inflation");
    expect(rows.some((r) => /^Mixed: each sheet keeps/.test(String(r[1])))).toBe(true);
  });

  it("without a frequency a single CSV is refused: it would mix frequencies", async () => {
    const res = await call("all", "format=csv");
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/cannot hold series of different frequencies/);
  });

  it("yearly CSV contains only yearly series", async () => {
    const rows = await csv(await call("all", "frequency=yearly&format=csv"));
    const head = rows[0];
    const freq = new Set(rows.slice(1).map((r) => r[head.indexOf("frequency")]));
    expect(freq).toEqual(new Set(["Annual"]));
    const ids = new Set(rows.slice(1).map((r) => r[1]));
    expect(ids).toEqual(new Set(["worldbank-gdp-growth-pak", "sbp-fiscal-balance"]));
    expect(rows.slice(1).some((r) => r[1] === "sbp-cpi-inflation")).toBe(false);
  });

  it("monthly CSV contains only monthly series and every observation exactly once", async () => {
    const rows = (await csv(await call("all", "frequency=monthly&format=csv"))).slice(1);
    expect(new Set(rows.map((r) => r[1]))).toEqual(new Set(["sbp-cpi-inflation"]));
    expect(rows).toHaveLength(36);
    expect(new Set(rows.map((r) => r[2])).size).toBe(36);
  });

  it("quarterly CSV contains only quarterly series, with their labels", async () => {
    const rows = (await csv(await call("all", "frequency=quarterly&format=csv"))).slice(1);
    expect(rows.map((r) => r[4])).toEqual(["Q1 FY17", "Q2 FY17", "Q3 FY17"]);
  });

  it("the frequency-specific workbook lists only that frequency's sheets and says so", async () => {
    const { wb, rows } = sheetRows(await (await call("all", "frequency=yearly&from=2021")).arrayBuffer(), "Contents");
    expect(wb.SheetNames).toContain("Real GDP Growth — Pakistan");
    expect(wb.SheetNames).not.toContain("CPI Inflation");
    expect(rows.some((r) => /^Yearly only/.test(String(r[1])))).toBe(true);
    expect(rows.some((r) => r[0] === "Date filter" && r[1] === "2021 to latest available")).toBe(true);
  });

  it("a date range that excludes everything is reported", async () => {
    const res = await call("all", "frequency=yearly&from=2040&format=csv");
    expect(res.status).toBe(422);
  });

  it("filenames name the frequency", async () => {
    expect((await call("all", "frequency=monthly&format=csv")).headers.get("content-disposition")).toMatch(/peic-all-monthly-datasets-\d{4}-\d{2}-\d{2}\.csv/);
  });
});
