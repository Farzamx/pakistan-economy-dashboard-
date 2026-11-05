// PEIC redesign Phase 3 — tests for the homepage's pure presentation logic.
// Everything tested here is display/selection logic over values the data
// layer already produced; no economic figure is computed in these modules,
// so these tests pin exactly the rules a reader depends on: that a past
// event never appears as upcoming, that missing data never reads as zero,
// and that a change string's direction is taken from the change itself.

import { describe, it, expect } from "vitest";
import { selectDisplayableReleases, formatReleaseDate, type UpcomingRow } from "./UpcomingReleases";
import { matchesQuery, sortRows, toNumericValue, type IndicatorRow } from "./indicatorRows";
import { changeTone } from "./valueDisplay";

// ── Upcoming releases: the date boundary ──────────────────────────────────
describe("selectDisplayableReleases", () => {
  const TODAY = "2026-10-29";
  const rows: UpcomingRow[] = [
    { date: "2026-07-27", title: "SBP Monetary Policy Committee Meeting" }, // long past
    { date: "2026-10-28", title: "Yesterday's release" },
    { date: "2026-10-29", title: "Today's release" },
    { date: "2026-10-30", title: "Tomorrow's release" },
    { date: "2026-12-14", title: "December MPC" },
  ];

  it("never presents a past event as upcoming", () => {
    const out = selectDisplayableReleases(rows, TODAY);
    expect(out.map((r) => r.date)).toEqual(["2026-10-29", "2026-10-30", "2026-12-14"]);
    expect(out.some((r) => r.date < TODAY)).toBe(false);
  });

  it("an event dated today IS upcoming (the boundary is inclusive)", () => {
    expect(selectDisplayableReleases(rows, TODAY).map((r) => r.title)).toContain("Today's release");
  });

  it("an event dated yesterday is excluded (the boundary is exact, not fuzzy)", () => {
    expect(selectDisplayableReleases(rows, TODAY).map((r) => r.title)).not.toContain("Yesterday's release");
  });

  it("orders chronologically regardless of input order", () => {
    const shuffled = [rows[4], rows[2], rows[3], rows[0]];
    expect(selectDisplayableReleases(shuffled, TODAY).map((r) => r.date)).toEqual(["2026-10-29", "2026-10-30", "2026-12-14"]);
  });

  it("drops rows with a missing or malformed date rather than guessing one", () => {
    const bad = [
      { date: "", title: "no date" },
      { date: "soon", title: "not a date" },
      { date: "2026-13-45", title: "impossible but well-shaped" },
      { date: undefined as unknown as string, title: "undefined date" },
      { date: "2026-11-01", title: "valid" },
    ];
    const out = selectDisplayableReleases(bad, TODAY);
    // The impossible-but-well-shaped date sorts as a string; what matters is
    // that nothing undated or unparseable is presented as a real release.
    expect(out.map((r) => r.title)).not.toContain("no date");
    expect(out.map((r) => r.title)).not.toContain("not a date");
    expect(out.map((r) => r.title)).not.toContain("undefined date");
    expect(out.map((r) => r.title)).toContain("valid");
  });

  it("returns an empty list rather than back-filling when nothing is upcoming", () => {
    expect(selectDisplayableReleases(rows, "2027-01-01")).toEqual([]);
    expect(selectDisplayableReleases([], TODAY)).toEqual([]);
  });

  it("does not mutate its input", () => {
    const input = [...rows];
    selectDisplayableReleases(input, TODAY);
    expect(input.map((r) => r.date)).toEqual(rows.map((r) => r.date));
  });

  it("formatReleaseDate reads a date-only string without a timezone shift", () => {
    // A naive new Date("2026-10-30") is UTC midnight and can render as the
    // 29th west of UTC; this must always say the 30th.
    expect(formatReleaseDate("2026-10-30")).toMatch(/30 Oct/);
    expect(formatReleaseDate("2026-01-01")).toMatch(/1 Jan/);
  });
});

// ── Indicators table: sorting, filtering, missing data ────────────────────
describe("indicators table logic", () => {
  const row = (over: Partial<IndicatorRow> & { id: string }): IndicatorRow => ({
    slug: "s",
    name: "Name",
    group: "Prices",
    value: "1",
    unit: "%",
    numericValue: 1,
    change: null,
    period: "Sep 2026",
    observationDate: "2026-09-30",
    source: "SBP EasyData",
    freshnessLabel: "Current",
    freshnessSeverity: "healthy",
    ...over,
  });

  describe("toNumericValue", () => {
    it("parses formatted numbers, including thousands separators and negatives", () => {
      expect(toNumericValue("10.3")).toBe(10.3);
      expect(toNumericValue("1,234.5")).toBe(1234.5);
      expect(toNumericValue("-445")).toBe(-445);
    });
    it("returns null for values that are not plain numbers — never 0", () => {
      expect(toNumericValue("—")).toBeNull();
      expect(toNumericValue("")).toBeNull();
      expect(toNumericValue("n/a")).toBeNull();
    });
  });

  describe("sortRows", () => {
    const rows = [
      row({ id: "b", name: "Beta", numericValue: 5, observationDate: "2026-01-31", freshnessSeverity: "problem" }),
      row({ id: "a", name: "Alpha", numericValue: 10, observationDate: "2026-09-30", freshnessSeverity: "healthy" }),
      row({ id: "c", name: "Gamma", numericValue: null, observationDate: null, freshnessSeverity: "caution" }),
    ];

    it("sorts by name in both directions", () => {
      expect(sortRows(rows, "name", "asc").map((r) => r.id)).toEqual(["a", "b", "c"]);
      expect(sortRows(rows, "name", "desc").map((r) => r.id)).toEqual(["c", "b", "a"]);
    });

    it("sorts numerically by value, not lexically", () => {
      expect(sortRows(rows, "value", "asc").map((r) => r.numericValue)).toEqual([5, 10, null]);
    });

    it("missing values sort LAST in both directions — never treated as zero", () => {
      expect(sortRows(rows, "value", "asc").at(-1)!.id).toBe("c");
      expect(sortRows(rows, "value", "desc").at(-1)!.id).toBe("c");
      expect(sortRows(rows, "period", "asc").at(-1)!.id).toBe("c");
      expect(sortRows(rows, "period", "desc").at(-1)!.id).toBe("c");
    });

    it("sorts by observation date, oldest first ascending", () => {
      expect(sortRows(rows, "period", "asc").map((r) => r.id)).toEqual(["b", "a", "c"]);
    });

    it("sorts by freshness severity, healthiest first ascending", () => {
      expect(sortRows(rows, "freshness", "asc").map((r) => r.freshnessSeverity)).toEqual(["healthy", "caution", "problem"]);
    });

    it("does not mutate the input array", () => {
      const input = [...rows];
      sortRows(input, "value", "desc");
      expect(input.map((r) => r.id)).toEqual(rows.map((r) => r.id));
    });

    it("is stable: equal rows keep their incoming order", () => {
      const equal = [row({ id: "x", name: "Same" }), row({ id: "y", name: "Same" }), row({ id: "z", name: "Same" })];
      expect(sortRows(equal, "name", "asc").map((r) => r.id)).toEqual(["x", "y", "z"]);
    });
  });

  describe("matchesQuery", () => {
    const r = row({ id: "r", name: "CPI Inflation", group: "Prices", source: "SBP EasyData", unit: "%" });
    it("matches name, group, source and unit, case-insensitively", () => {
      for (const q of ["cpi", "INFLATION", "prices", "easydata", "%"]) expect(matchesQuery(r, q), q).toBe(true);
    });
    it("an empty or whitespace query matches everything", () => {
      expect(matchesQuery(r, "")).toBe(true);
      expect(matchesQuery(r, "   ")).toBe(true);
    });
    it("does not match unrelated text", () => {
      expect(matchesQuery(r, "remittances")).toBe(false);
    });
  });
});

// ── Change direction ──────────────────────────────────────────────────────
describe("changeTone", () => {
  it("takes direction from the change string's own sign", () => {
    expect(changeTone("+0.5 pp vs Aug 2026")).toBe("up");
    expect(changeTone("-0.8 pp vs Aug 2026")).toBe("down");
    expect(changeTone("0.0 vs last week")).toBe("flat");
  });

  it("an unsigned number reads as a rise, matching the existing ticker convention", () => {
    expect(changeTone("1.2 vs last month")).toBe("up");
  });

  it("returns null when there is no leading number, so no arrow is invented", () => {
    expect(changeTone("YoY change")).toBeNull();
    expect(changeTone("No prior period")).toBeNull();
    expect(changeTone(undefined)).toBeNull();
    expect(changeTone("")).toBeNull();
  });

  it("ignores a number that is not at the start (e.g. a date in the label)", () => {
    expect(changeTone("vs Aug 2026")).toBeNull();
  });
});
