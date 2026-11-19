// Download Datasets loader: the quarterly series, and chronological ordering. The data functions are mocked; nothing here touches a network or a database.

import { beforeEach, describe, expect, it, vi } from "vitest";

const quarterly = vi.fn();
const gdpGrowth = vi.fn();
const sbpHistory = vi.fn();
vi.mock("@/lib/data/quarterlyGdp", () => ({ getQuarterlyGdpKpi: () => quarterly() }));
vi.mock("@/lib/data/worldBank", () => ({ getGdpGrowthHistory: (c: string) => gdpGrowth(c) }));
vi.mock("@/lib/data/sbpServer", () => ({ getSbpIndicatorHistory: (k: string) => sbpHistory(k) }));
vi.mock("@/lib/data/spi", () => ({ getSpiHistory: vi.fn() }));
vi.mock("@/lib/data/fred", () => ({ getFedFundsHistory: vi.fn(), getUs10yHistory: vi.fn(), getUsCpiInflationHistory: vi.fn() }));

import { loadDataset } from "./datasetLoader";
import { getDataset } from "./datasetRegistry";

beforeEach(() => {
  quarterly.mockReset();
  gdpGrowth.mockReset();
  sbpHistory.mockReset();
});

describe("quarterly GDP growth", () => {
  it("turns the source's own quarter labels into quarter-end dates and keeps the labels", async () => {
    quarterly.mockResolvedValue({
      trend: [{ month: "Q1 FY17", value: 5.1 }, { month: "Q2 FY17", value: 5.8 }, { month: "Q3 FY17", value: 5.6 }, { month: "Q4 FY17", value: 6.1 }],
      isFallback: false,
    });
    const ds = await loadDataset(getDataset("sbp-quarterly-gdp-growth")!);
    expect(ds.rows).toEqual([
      { period: "2016-09-30", value: 5.1, label: "Q1 FY17" },
      { period: "2016-12-31", value: 5.8, label: "Q2 FY17" },
      { period: "2017-03-31", value: 5.6, label: "Q3 FY17" },
      { period: "2017-06-30", value: 6.1, label: "Q4 FY17" },
    ]);
    expect(ds.frequency).toBe("Quarterly");
    expect(ds.freshnessState).toBeUndefined();
    expect(ds.error).toBeUndefined();
  });
  it("does not pass a stored snapshot off as live data", async () => {
    quarterly.mockResolvedValue({ trend: [{ month: "Q1 FY22", value: 6.4 }], isFallback: true });
    const ds = await loadDataset(getDataset("sbp-quarterly-gdp-growth")!);
    expect(ds.freshnessState).toMatch(/snapshot/i);
    expect(ds.rows).toHaveLength(1);
  });
  it("creates no observation from a label it cannot read", async () => {
    quarterly.mockResolvedValue({ trend: [{ month: "Q9 FY22", value: 1 }, { month: "garbage", value: 2 }], isFallback: false });
    const ds = await loadDataset(getDataset("sbp-quarterly-gdp-growth")!);
    expect(ds.rows).toEqual([]);
    expect(ds.error).toBeTruthy();
  });
  it("one row per quarter: no duplicates", async () => {
    quarterly.mockResolvedValue({ trend: ["Q1 FY18", "Q2 FY18", "Q3 FY18", "Q4 FY18"].map((month, i) => ({ month, value: i })), isFallback: false });
    const ds = await loadDataset(getDataset("sbp-quarterly-gdp-growth")!);
    expect(new Set(ds.rows.map((r) => r.period)).size).toBe(ds.rows.length);
  });
});

describe("chronological order", () => {
  it("a feed delivered newest-first is returned oldest-first, with periods and values untouched", async () => {
    gdpGrowth.mockResolvedValue({ history: [{ month: "2023", value: 2.4 }, { month: "2021", value: 6.5 }, { month: "2022", value: 4.8 }] });
    const ds = await loadDataset(getDataset("worldbank-gdp-growth-pak")!);
    expect(ds.rows).toEqual([{ period: "2021", value: 6.5 }, { period: "2022", value: 4.8 }, { period: "2023", value: 2.4 }]);
  });
  it("a series that cannot be read still returns cleanly, with no rows", async () => {
    gdpGrowth.mockResolvedValue(null);
    const ds = await loadDataset(getDataset("worldbank-gdp-growth-pak")!);
    expect(ds.rows).toEqual([]);
    expect(ds.error).toBeTruthy();
  });
});

describe("a declared frequency the observation dates contradict", () => {
  const monthEnds = (n: number) => Array.from({ length: n }, (_, i) => {
    const y = 2024 + Math.floor((i + 3) / 12);
    const m = ((i + 3) % 12) + 1;
    return `${y}-${String(m).padStart(2, "0")}-${new Date(Date.UTC(y, m, 0)).getUTCDate()}`;
  });
  const history = (frequency: string, dates: string[]) => ({
    points: dates.map((date, i) => ({ date, value: i })),
    displayUnit: "Trillion PKR",
    meta: { source: "SBP EasyData (fallback)", frequency, freshness: { state: "current" } },
  });

  it("a series declared weekly that holds one point a month is filed and labelled monthly, with the reason", async () => {
    sbpHistory.mockResolvedValue(history("Weekly", monthEnds(24)));
    const ds = await loadDataset(getDataset("sbp-money-supply-m2")!);
    expect(ds.frequency).toBe("Monthly");
    expect(ds.frequencyNote).toMatch(/declares this series as weekly.*spaced monthly/);
    expect(ds.rows).toHaveLength(24); // every observation kept, none added
  });
  it("leaves a series alone when its dates agree with the declaration", async () => {
    sbpHistory.mockResolvedValue(history("Monthly", monthEnds(24)));
    const ds = await loadDataset(getDataset("sbp-cpi-inflation")!);
    expect(ds.frequency).toBe("Monthly");
    expect(ds.frequencyNote).toBeUndefined();
  });
  it("never overrides an as-announced series", async () => {
    sbpHistory.mockResolvedValue(history("As-Needed", monthEnds(24)));
    const ds = await loadDataset(getDataset("sbp-policy-rate")!);
    expect(ds.frequency).toBe("As-Needed");
    expect(ds.frequencyNote).toBeUndefined();
  });
});
