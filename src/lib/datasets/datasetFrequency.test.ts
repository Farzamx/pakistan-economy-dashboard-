// Download Datasets: frequency selection and date filtering. These pin the integrity rules: a frequency is a FILTER on genuine series, never a conversion;
// original periods are never rewritten; fiscal and calendar years stay distinct; and a date range means what a reader expects it to mean.

import { describe, expect, it } from "vitest";
import {
  availableRange, bulkHref, countByFrequency, datasetsForFrequency, describeRange, downloadHref, filterRowsByRange, frequencyFromDeclared, isFrequencyId, observedCadence,
  offeredFrequencies, parseBound, periodInRange, periodSpan, quarterLabelToEndDate, resolveFrequency, selectDatasets, sortChronologically, unavailableFrequencyMessage,
  validateRange, type SelectableDataset,
} from "./datasetFrequency";

const monthly = (n: number, startYear = 2020) =>
  Array.from({ length: n }, (_, i) => {
    const y = startYear + Math.floor(i / 12);
    const m = (i % 12) + 1;
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return `${y}-${String(m).padStart(2, "0")}-${last}`;
  });

const ds = (over: Partial<SelectableDataset> & { id: string }): SelectableDataset => ({
  name: over.id,
  category: "Prices",
  description: "",
  unit: "Percent",
  source: "SBP",
  frequencyId: "monthly",
  points: [],
  ...over,
});

describe("frequency vocabulary", () => {
  it("maps every wording the sources use onto a catalogue frequency", () => {
    expect(frequencyFromDeclared("Monthly")).toBe("monthly");
    expect(frequencyFromDeclared("Annual")).toBe("yearly");
    expect(frequencyFromDeclared("Quarterly")).toBe("quarterly");
    expect(frequencyFromDeclared("Weekly")).toBe("weekly");
    expect(frequencyFromDeclared("As-Needed")).toBe("as-announced");
    expect(frequencyFromDeclared("as needed")).toBe("as-announced");
  });
  it("does not guess at wording it does not know", () => {
    expect(frequencyFromDeclared("Fortnightly")).toBeNull();
    expect(frequencyFromDeclared("")).toBeNull();
    expect(frequencyFromDeclared(undefined)).toBeNull();
  });
  it("only accepts known ids (the route validates its query parameter with this)", () => {
    expect(isFrequencyId("monthly")).toBe(true);
    expect(isFrequencyId("daily")).toBe(false);
    expect(isFrequencyId("")).toBe(false);
    expect(isFrequencyId(null)).toBe(false);
  });
  it("the unavailable message never suggests converting from another frequency", () => {
    expect(unavailableFrequencyMessage("monthly", "indicator")).toBe("Monthly observations are not currently available for this indicator. Please select another frequency.");
    expect(unavailableFrequencyMessage("quarterly")).toMatch(/not currently available for any indicator/);
    expect(unavailableFrequencyMessage("quarterly").toLowerCase()).not.toMatch(/convert|aggregate|estimate|interpolat/);
  });
});

describe("periods are read exactly as published", () => {
  it("dates, calendar years and fiscal years each span what they cover", () => {
    expect(periodSpan("2026-09-30")).toEqual({ start: "2026-09-30", end: "2026-09-30", labelYear: 2026 });
    expect(periodSpan("2025")).toEqual({ start: "2025-01-01", end: "2025-12-31", labelYear: 2025 });
    expect(periodSpan("FY2025")).toEqual({ start: "2024-07-01", end: "2025-06-30", labelYear: 2025 });
  });
  it("fiscal and calendar years are different periods (FY2025 is not calendar 2025)", () => {
    expect(periodSpan("FY2025")).not.toEqual(periodSpan("2025"));
  });
  it("rejects impossible or unknown periods rather than guessing", () => {
    expect(periodSpan("2026-02-30")).toBeNull();
    expect(periodSpan("2026-13-01")).toBeNull();
    expect(periodSpan("Q1 FY26")).toBeNull();
    expect(periodSpan("soon")).toBeNull();
  });
  it("quarter labels become the quarter-END date of the Pakistani fiscal year", () => {
    expect(quarterLabelToEndDate("Q1 FY17")).toBe("2016-09-30");
    expect(quarterLabelToEndDate("Q2 FY17")).toBe("2016-12-31");
    expect(quarterLabelToEndDate("Q3 FY17")).toBe("2017-03-31");
    expect(quarterLabelToEndDate("Q4 FY17")).toBe("2017-06-30");
    expect(quarterLabelToEndDate("Q3 FY2026")).toBe("2026-03-31");
    expect(quarterLabelToEndDate("Q5 FY17")).toBeNull();
    expect(quarterLabelToEndDate("FY17")).toBeNull();
  });
});

describe("chronological order is preserved", () => {
  it("sorts a descending feed ascending without changing any value", () => {
    const rows = [{ period: "2025-03-31", value: 3 }, { period: "2025-01-31", value: 1 }, { period: "2025-02-28", value: 2 }];
    const sorted = sortChronologically(rows);
    expect(sorted.map((r) => r.period)).toEqual(["2025-01-31", "2025-02-28", "2025-03-31"]);
    expect(sorted.map((r) => r.value)).toEqual([1, 2, 3]);
    expect(rows[0].period).toBe("2025-03-31"); // input untouched
  });
  it("orders fiscal years and leaves unreadable periods at the end in their original order", () => {
    const sorted = sortChronologically([{ period: "FY2025" }, { period: "odd-b" }, { period: "FY2023" }, { period: "odd-a" }]);
    expect(sorted.map((r) => r.period)).toEqual(["FY2023", "FY2025", "odd-b", "odd-a"]);
  });
  it("is stable for equal periods", () => {
    const sorted = sortChronologically([{ period: "2025-01-31", id: "a" }, { period: "2025-01-31", id: "b" }]);
    expect(sorted.map((r) => r.id)).toEqual(["a", "b"]);
  });
});

describe("date bounds", () => {
  it("reads year, month and day bounds, and says which day a coarse bound means", () => {
    expect(parseBound("2020", "from")).toMatchObject({ precision: "year", year: 2020, iso: "2020-01-01" });
    expect(parseBound("2020", "to")).toMatchObject({ precision: "year", iso: "2020-12-31" });
    expect(parseBound("2024-02", "from")?.iso).toBe("2024-02-01");
    expect(parseBound("2024-02", "to")?.iso).toBe("2024-02-29"); // leap year
    expect(parseBound("2023-02", "to")?.iso).toBe("2023-02-28");
    expect(parseBound("2024-03-15", "from")).toMatchObject({ precision: "day", iso: "2024-03-15" });
  });
  it("treats an incomplete or invalid bound as no bound, never as a guess", () => {
    for (const bad of ["", "20", "2020-1", "2020-13", "2020-02-31", "abc", "2020/01"]) expect(parseBound(bad, "from"), bad).toBeNull();
    expect(parseBound(undefined, "to")).toBeNull();
  });
  it("validateRange reports a malformed or reversed range", () => {
    expect(validateRange("2020", "2024")).toEqual({ ok: true });
    expect(validateRange("", "")).toEqual({ ok: true });
    expect(validateRange("20", "")).toMatchObject({ ok: false });
    expect(validateRange("", "2020-13")).toMatchObject({ ok: false });
    expect(validateRange("2025", "2020")).toEqual({ ok: false, error: "The start date is after the end date." });
  });
});

describe("date filtering by frequency", () => {
  it("monthly: a month range keeps exactly the months inside it", () => {
    const rows = monthly(36).map((period) => ({ period }));
    const out = filterRowsByRange(rows, "2021-03", "2021-08");
    expect(out.map((r) => r.period)).toEqual(["2021-03-31", "2021-04-30", "2021-05-31", "2021-06-30", "2021-07-31", "2021-08-31"]);
  });
  it("monthly: a day bound includes a month-end observation on that day and excludes the day before", () => {
    const rows = [{ period: "2021-03-30" }, { period: "2021-03-31" }, { period: "2021-04-30" }];
    expect(filterRowsByRange(rows, "2021-03-31", "2021-04-29").map((r) => r.period)).toEqual(["2021-03-31"]);
  });
  it("yearly: a year range compares the LABEL year, so 'to 2020' excludes FY2021 and 'from 2020' includes FY2020", () => {
    const rows = ["FY2019", "FY2020", "FY2021", "FY2022"].map((period) => ({ period }));
    expect(filterRowsByRange(rows, undefined, "2020").map((r) => r.period)).toEqual(["FY2019", "FY2020"]);
    expect(filterRowsByRange(rows, "2020", undefined).map((r) => r.period)).toEqual(["FY2020", "FY2021", "FY2022"]);
    expect(filterRowsByRange(rows, "2020", "2021").map((r) => r.period)).toEqual(["FY2020", "FY2021"]);
  });
  it("yearly calendar years filter the same way", () => {
    const rows = ["2018", "2019", "2020", "2021"].map((period) => ({ period }));
    expect(filterRowsByRange(rows, "2019", "2020").map((r) => r.period)).toEqual(["2019", "2020"]);
  });
  it("quarterly (quarter-end dates): a month range selects whole quarters by their end date", () => {
    const rows = ["2016-09-30", "2016-12-31", "2017-03-31", "2017-06-30"].map((period) => ({ period }));
    expect(filterRowsByRange(rows, "2016-10", "2017-03").map((r) => r.period)).toEqual(["2016-12-31", "2017-03-31"]);
    expect(filterRowsByRange(rows, "2016", "2016").map((r) => r.period)).toEqual(["2016-09-30", "2016-12-31"]);
  });
  it("weekly: a day range works", () => {
    const rows = ["2026-10-02", "2026-10-09", "2026-10-16", "2026-10-23"].map((period) => ({ period }));
    expect(filterRowsByRange(rows, "2026-10-09", "2026-10-16").map((r) => r.period)).toEqual(["2026-10-09", "2026-10-16"]);
  });
  it("no bounds returns everything; an unreadable period is excluded once a bound is set, never silently included", () => {
    const rows = [{ period: "2026-01-31" }, { period: "odd" }];
    expect(filterRowsByRange(rows)).toHaveLength(2);
    expect(filterRowsByRange(rows, "2020", null).map((r) => r.period)).toEqual(["2026-01-31"]);
  });
  it("filtering returns the original rows: nothing is copied, merged or generated", () => {
    const rows = monthly(24).map((period, i) => ({ period, value: i }));
    const out = filterRowsByRange(rows, "2020-06", "2021-06");
    for (const r of out) expect(rows).toContain(r);
    expect(new Set(out.map((r) => r.period)).size).toBe(out.length);
  });
  it("periodInRange matches filterRowsByRange", () => {
    expect(periodInRange("FY2021", parseBound("2020", "from"), parseBound("2020", "to"))).toBe(false);
    expect(periodInRange("FY2020", parseBound("2020", "from"), parseBound("2020", "to"))).toBe(true);
  });
});

describe("the declared frequency is checked against the observation dates", () => {
  it("recognises each cadence from the spacing, even with missing observations", () => {
    expect(observedCadence(monthly(24))).toBe("monthly");
    expect(observedCadence(monthly(24).filter((_, i) => i !== 5 && i !== 6))).toBe("monthly");
    expect(observedCadence(["2016-09-30", "2016-12-31", "2017-03-31", "2017-06-30", "2017-09-30"])).toBe("quarterly");
    expect(observedCadence(["FY2020", "FY2021", "FY2022", "FY2023"])).toBe("yearly");
    expect(observedCadence(["2020", "2021", "2022", "2023"])).toBe("yearly");
    expect(observedCadence(["2026-09-04", "2026-09-11", "2026-09-18", "2026-09-25"])).toBe("weekly");
  });
  it("reports nothing for irregular or too-short series (as-announced series are irregular by nature)", () => {
    expect(observedCadence(["2024-06-10", "2024-07-29", "2024-09-12", "2024-11-04", "2025-01-27"])).toBeNull();
    expect(observedCadence(["2024-01-31", "2024-02-29"])).toBeNull();
  });
  it("keeps the declared frequency when the data agrees", () => {
    expect(resolveFrequency("Monthly", monthly(24))).toEqual({ id: "monthly", declared: "monthly", observed: "monthly", mismatch: false });
  });
  it("uses the OBSERVED cadence when the data clearly contradicts the declaration", () => {
    const r = resolveFrequency("Monthly", ["FY2020", "FY2021", "FY2022", "FY2023"]);
    expect(r).toMatchObject({ id: "yearly", declared: "monthly", observed: "yearly", mismatch: true });
  });
  it("never overrides an as-announced series, however its dates happen to fall", () => {
    expect(resolveFrequency("As-Needed", monthly(24)).id).toBe("as-announced");
  });
  it("falls back to the declaration when the data is too short to judge", () => {
    expect(resolveFrequency("Annual", ["FY2024", "FY2025"])).toMatchObject({ id: "yearly", mismatch: false });
    expect(resolveFrequency("Fortnightly", monthly(24)).id).toBeNull();
  });
});

describe("catalogue selection", () => {
  const all: SelectableDataset[] = [
    ds({ id: "cpi", name: "CPI Inflation", frequencyId: "monthly", points: monthly(36).map((p, i) => [p, i] as const) }),
    ds({ id: "reserves", name: "Reserves", category: "External sector", frequencyId: "monthly", points: monthly(12, 2022).map((p, i) => [p, i] as const) }),
    ds({ id: "gdp", name: "GDP growth", category: "Real economy", frequencyId: "yearly", points: [["2019", 1], ["2020", 2], ["2021", 3]] as const }),
    ds({ id: "qgdp", name: "Quarterly GDP", category: "Real economy", frequencyId: "quarterly", points: [["2016-09-30", 5, "Q1 FY17"], ["2016-12-31", 6, "Q2 FY17"]] as const }),
    ds({ id: "policy", name: "Policy rate", category: "Money & rates", frequencyId: "as-announced", points: [["2024-06-10", 20.5], ["2024-07-29", 19.5]] as const }),
  ];
  const sel = (over: Partial<Parameters<typeof selectDatasets>[1]> = {}) => ({ frequency: "all" as const, from: "", to: "", query: "", category: "All", ...over });

  it("a frequency selects only series that genuinely have it", () => {
    expect(selectDatasets(all, sel({ frequency: "monthly" })).map((s) => s.dataset.id)).toEqual(["cpi", "reserves"]);
    expect(selectDatasets(all, sel({ frequency: "yearly" })).map((s) => s.dataset.id)).toEqual(["gdp"]);
    expect(selectDatasets(all, sel({ frequency: "quarterly" })).map((s) => s.dataset.id)).toEqual(["qgdp"]);
    expect(selectDatasets(all, sel({ frequency: "all" }))).toHaveLength(5);
  });
  it("a frequency nothing has returns nothing: it is never filled in from another frequency", () => {
    expect(selectDatasets(all.filter((d) => d.frequencyId !== "quarterly"), sel({ frequency: "quarterly" }))).toEqual([]);
    expect(datasetsForFrequency([], "monthly")).toEqual([]);
  });
  it("the date range trims observations but never adds any", () => {
    const [cpi] = selectDatasets(all, sel({ frequency: "monthly", from: "2021-01", to: "2021-12" }));
    expect(cpi.inRange).toHaveLength(12);
    expect(cpi.inRange.every(([p]) => p.startsWith("2021-"))).toBe(true);
    expect(cpi.dataset.points).toHaveLength(36); // the underlying series is untouched
  });
  it("a range with no observations leaves the dataset listed with an empty selection (the UI says so)", () => {
    const [gdp] = selectDatasets(all, sel({ frequency: "yearly", from: "2030" }));
    expect(gdp.inRange).toEqual([]);
  });
  it("search and category still narrow the list within a frequency", () => {
    expect(selectDatasets(all, sel({ frequency: "monthly", query: "reserve" })).map((s) => s.dataset.id)).toEqual(["reserves"]);
    expect(selectDatasets(all, sel({ category: "Real economy" })).map((s) => s.dataset.id)).toEqual(["gdp", "qgdp"]);
  });
  it("counts and offered buttons: the three standard frequencies always, others only when present", () => {
    const counts = countByFrequency(all);
    expect(counts).toEqual({ yearly: 1, quarterly: 1, monthly: 2, weekly: 0, "as-announced": 1 });
    expect(offeredFrequencies(counts)).toEqual(["yearly", "quarterly", "monthly", "as-announced"]);
    expect(offeredFrequencies({ yearly: 0, quarterly: 0, monthly: 0, weekly: 0, "as-announced": 0 })).toEqual(["yearly", "quarterly", "monthly"]);
  });
  it("the available range spans the earliest to the latest observation as published", () => {
    expect(availableRange(all.filter((d) => d.frequencyId === "yearly"))).toEqual({ first: "2019", last: "2021" });
    expect(availableRange(all.filter((d) => d.frequencyId === "quarterly"))).toEqual({ first: "2016-09-30", last: "2016-12-31" });
    expect(availableRange([ds({ id: "empty" })])).toBeNull();
    expect(describeRange([{ period: "2019" }, { period: "2021" }])).toBe("2019 to 2021");
    expect(describeRange([])).toBeNull();
  });
});

describe("download links carry the selection (and only a valid one)", () => {
  it("includes format, frequency and valid bounds", () => {
    expect(downloadHref("sbp-cpi-inflation", { format: "csv", frequency: "monthly", from: "2021-01", to: "2021-12" })).toBe(
      "/api/datasets/sbp-cpi-inflation?format=csv&frequency=monthly&from=2021-01&to=2021-12",
    );
  });
  it("omits the frequency for 'all', and drops a half-typed bound instead of sending it", () => {
    expect(downloadHref("sbp-cpi-inflation", { format: "xlsx", frequency: "all", from: "20" })).toBe("/api/datasets/sbp-cpi-inflation?format=xlsx");
  });
  it("builds the bulk link for one frequency", () => {
    expect(bulkHref({ format: "csv", frequency: "yearly", from: "2015" })).toBe("/api/datasets/all?format=csv&frequency=yearly&from=2015");
  });
});
