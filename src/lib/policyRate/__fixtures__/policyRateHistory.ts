// Test fixtures for the Pakistan Interest Rate page. Test-only.
//
// REAL_POLICY_RATE is the SBP policy (target) rate series (SBP EasyData SBPOL0030) exactly as the canonical ledger held it on 2026-11-07:
// 38 observations, 23 May 2016 – 26 Oct 2026. It is public SBP data, captured by a read-only query, and is used so the calculations are pinned
// against the real history (including its two repeated-value rows) and not only against tidy invented numbers. Nothing here is a forecast.

import type { MonthlyPoint } from "@/lib/inflation/periods";

export const REAL_POLICY_RATE: { date: string; value: number }[] = [
  { date: "2016-05-23", value: 5.75 },
  { date: "2018-01-29", value: 6 },
  { date: "2018-05-28", value: 6.5 },
  { date: "2018-07-16", value: 7.5 },
  { date: "2018-10-01", value: 8.5 },
  { date: "2018-12-03", value: 10 },
  { date: "2019-02-01", value: 10.25 },
  { date: "2019-04-01", value: 10.75 },
  { date: "2019-05-21", value: 12.25 },
  { date: "2019-07-17", value: 13.25 },
  { date: "2020-03-18", value: 12.5 },
  { date: "2020-03-25", value: 11 },
  { date: "2020-04-16", value: 9 },
  { date: "2020-04-17", value: 9 }, // repeats the previous value: SBP's series records the same rate on two dates
  { date: "2020-05-16", value: 8 },
  { date: "2020-05-18", value: 8 }, // repeat
  { date: "2020-06-26", value: 7 },
  { date: "2021-09-21", value: 7.25 },
  { date: "2021-11-22", value: 8.75 },
  { date: "2021-12-15", value: 9.75 },
  { date: "2022-04-08", value: 12.25 },
  { date: "2022-05-24", value: 13.75 },
  { date: "2022-07-13", value: 15 },
  { date: "2022-11-28", value: 16 },
  { date: "2023-01-24", value: 17 },
  { date: "2023-03-03", value: 20 },
  { date: "2023-04-05", value: 21 },
  { date: "2023-06-27", value: 22 },
  { date: "2024-06-11", value: 20.5 },
  { date: "2024-07-30", value: 19.5 },
  { date: "2024-09-13", value: 17.5 },
  { date: "2024-11-05", value: 15 },
  { date: "2024-12-17", value: 13 },
  { date: "2025-01-28", value: 12 },
  { date: "2025-05-06", value: 11 },
  { date: "2025-12-16", value: 10.5 },
  { date: "2026-04-28", value: 11.5 },
  { date: "2026-10-26", value: 12 },
];

/** Monthly points from a list of values starting at `start` ("YYYY-MM"), consecutive months. */
export function monthly(start: string, values: number[]): MonthlyPoint[] {
  const [y, m] = start.split("-").map(Number);
  return values.map((value, i) => {
    const idx = y * 12 + (m - 1) + i;
    return { month: `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, "0")}`, value };
  });
}

/** Raw {date,value} month-end points (as the SBP history loader returns them) from a list of values. */
export function monthEndRaw(start: string, values: number[]): { date: string; value: number }[] {
  return monthly(start, values).map((p) => {
    const [y, m] = p.month.split("-").map(Number);
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return { date: `${p.month}-${String(last).padStart(2, "0")}`, value: p.value };
  });
}

/**
 * Headline CPI inflation (% YoY) for Jan – Oct 2026. ILLUSTRATIVE except the last two values: September (10.3) and October (9.6) match the
 * published series; January to August are invented round numbers used only to exercise the calculations. Nothing asserts they are real.
 */
export const HEADLINE_2026 = monthly("2026-01", [5.9, 6.4, 7.0, 8.0, 9.1, 9.4, 9.0, 10.0, 10.3, 9.6]);
