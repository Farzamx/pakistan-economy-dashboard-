// PEIC redesign Phase 4C — fiscal-year period labelling.
//
// The defect this pins, seen on the homepage on 2026-10-29: the fiscal
// balance card read "-6.17 T PKR · +1.04T vs Jun 2024" with an observation
// date of 2025. The canonical series holds consecutive ANNUAL observations
// stamped at each fiscal year's 30 June end date (verified against
// sbp:fiscalBalance: 2025-06-30 = -6,168,015M PKR, 2024-06-30 =
// -7,206,908M PKR). The values and the +1.04T difference were correct; only
// the label was wrong, because an annual series was formatted with a
// month formatter.

import { describe, it, expect } from "vitest";
import { formatMonthLabel, formatFiscalYearLabel } from "./formatMonthLabel";

describe("formatMonthLabel", () => {
  it("formats a date as its month and year", () => {
    expect(formatMonthLabel("2026-09-30")).toBe("Sep 2026");
    expect(formatMonthLabel("2026-01-15")).toBe("Jan 2026");
  });
});

describe("formatFiscalYearLabel", () => {
  it("regression: a 30 June year-end is a fiscal YEAR, not the month of June", () => {
    expect(formatFiscalYearLabel("2025-06-30")).toBe("FY2025");
    expect(formatFiscalYearLabel("2024-06-30")).toBe("FY2024");
    // The exact string that made the card look like a month-on-month comparison.
    expect(formatFiscalYearLabel("2024-06-30")).not.toBe("Jun 2024");
  });

  it("labels every observation in the real canonical series as a fiscal year", () => {
    const realPeriods = ["2025-06-30", "2024-06-30", "2023-06-30", "2022-06-30", "2021-06-30", "2020-06-30"];
    expect(realPeriods.map(formatFiscalYearLabel)).toEqual(["FY2025", "FY2024", "FY2023", "FY2022", "FY2021", "FY2020"]);
  });

  it("falls back to the month label for any non-June date, rather than mislabelling it a fiscal year", () => {
    expect(formatFiscalYearLabel("2026-09-30")).toBe("Sep 2026");
    expect(formatFiscalYearLabel("2026-12-31")).toBe("Dec 2026");
  });
});
