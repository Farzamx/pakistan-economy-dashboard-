// Shared test data for the Inflation page's failure-policy tests: real PBS data
// (a trimmed slice of the live file, see pbsCpiSample.xml), plus deliberately
// broken variants of it and World Bank responses. Test-only.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { WB_INFLATION_INDICATOR } from "@/lib/data/worldBankInflation";

/** The real PBS slice: 17 months, 2025-06 .. 2026-10, every series, unmodified. */
export const PBS_XML = readFileSync(join(__dirname, "pbsCpiSample.xml"), "utf-8");

/** Same file with one group's index nudged +5 in one month: internally inconsistent (the Laspeyres identity fails). */
export function tamperedPbsXml(): string {
  return PBS_XML.replace(/(<Series [^>]*INDICATOR="PCPI_CP_04_IX"[^>]*>)([\s\S]*?)(<\/Series>)/, (_m, open: string, body: string, close: string) => {
    const next = body.replace(/<Obs TIME_PERIOD="2026-01" OBS_VALUE="([^"]+)"\/>/, (_o, v: string) => `<Obs TIME_PERIOD="2026-01" OBS_VALUE="${Number(v) + 5}"/>`);
    return `${open}${next}${close}`;
  });
}

/** Same file cut to 2025-06 .. 2026-03 (10 months): consistent, but too short for any year-on-year decomposition. */
export function truncatedPbsXml(): string {
  return PBS_XML.replace(/<Obs TIME_PERIOD="(\d{4}-\d{2})" OBS_VALUE="[^"]*"\/>/g, (whole, period: string) => (period > "2026-03" ? "" : whole));
}

const WB_VALUES: Record<string, Record<number, number>> = {
  PAK: { 2022: 19.87, 2023: 30.77, 2024: 12.63, 2025: 3.55 },
  IND: { 2022: 6.7, 2023: 5.65, 2024: 4.95, 2025: 2.4 },
  BGD: { 2022: 7.7, 2023: 9.88, 2024: 10.47, 2025: 8.77 },
  LKA: { 2022: 49.72, 2023: 16.54, 2024: -0.43, 2025: -4.76 },
};

/** A World Bank API response. `omit` drops whole countries, as a partial response would. */
export function wbBody(omit: readonly string[] = []): unknown {
  const rows = Object.entries(WB_VALUES)
    .filter(([code]) => !omit.includes(code))
    .flatMap(([code, years]) => Object.entries(years).map(([year, value]) => ({ indicator: { id: WB_INFLATION_INDICATOR }, countryiso3code: code, date: year, value })));
  return [{ page: 1, pages: 1, per_page: 500, total: rows.length, lastupdated: "2026-10-08" }, rows];
}

/** Monthly observation dates, 2025-06 .. 2026-10, with the given values. */
export function monthlyPoints(values: number[]): { date: string; value: number }[] {
  return values.map((value, i) => {
    const t = 2025 * 12 + 5 + i;
    return { date: `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}-28`, value };
  });
}

export const HEADLINE_YOY = monthlyPoints([4.0, 3.2, 4.1, 3.0, 4.0, 5.6, 6.0, 7.3, 8.0, 9.0, 10.2, 11.7, 11.1, 9.2, 11.1, 10.3, 9.6]);
export const CORE_YOY = monthlyPoints([5.5, 5.1, 6.0, 6.2, 6.2, 6.1, 6.0, 6.5, 7.0, 7.4, 8.0, 8.4, 8.7, 8.6, 8.8, 8.6, 7.8]);
export const FOOD_YOY = monthlyPoints([2.0, 1.5, 3.5, 3.0, 2.5, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 8.2, 9.6, 12.1, 8.1, 7.8]);
export const POLICY = [
  { date: "2026-04-28", value: 11.5 },
  { date: "2026-10-26", value: 12 },
];
