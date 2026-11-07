// Annual consumer-price inflation for Pakistan and its regional peers, from the
// World Bank — for the Inflation page's international comparison.
//
// ONE INDICATOR, ONE SOURCE, FOR EVERY COUNTRY
// FP.CPI.TOTL.ZG, "Inflation, consumer prices (annual %)": the annual average
// of the CPI, as a % change on the previous year's average, on calendar years.
// Pakistan's figure is taken from the SAME World Bank series as the peers', not
// from PEIC's own monthly series, because the two measure different things:
// PEIC's monthly series is the YoY change of a single month, while this is the
// year-average rate. Mixing them in one chart would compare unlike quantities
// (the two differ by up to ~1.2 points in some years — see the page's
// methodology note).
//
// It uses the same keyless World Bank API and the same fetch-with-revalidate
// pattern as worldBank.ts (sector composition, population). It is deliberately a
// separate module: worldBank.ts's country type is the three-country GDP set, and
// widening it would touch the GDP canonical-store plumbing for no benefit here.
// Nothing is written to the database.

import "server-only";
import type { AnnualPoint } from "@/lib/inflation/analytics";

export const WB_INFLATION_INDICATOR = "FP.CPI.TOTL.ZG";

export interface InflationCountry {
  /** ISO 3166-1 alpha-3, as the World Bank uses it. */
  code: "PAK" | "IND" | "BGD" | "LKA";
  name: string;
}

export const INFLATION_COUNTRIES: readonly InflationCountry[] = [
  { code: "PAK", name: "Pakistan" },
  { code: "IND", name: "India" },
  { code: "BGD", name: "Bangladesh" },
  { code: "LKA", name: "Sri Lanka" },
];

const BASE = "https://api.worldbank.org/v2/country";
/** World Bank annual data refreshes a few times a year; an hour is well inside that. */
const REVALIDATE_SECONDS = 3600;
const FETCH_TIMEOUT_MS = 10_000;
/** Most recent annual values requested per country (nulls for unpublished years included). */
const MOST_RECENT_VALUES = 21;

export interface WorldBankInflation {
  /** Country code -> annual points, ascending, nulls kept for years inside the observed range. */
  series: Record<string, AnnualPoint[]>;
  /** The World Bank's own "last updated" stamp for the dataset, if present. */
  lastUpdated: string | null;
}

interface Row {
  indicator?: { id?: string };
  countryiso3code?: string;
  date?: string;
  value?: number | null;
}

export function parseWorldBankInflation(json: unknown): WorldBankInflation | null {
  if (!Array.isArray(json) || json.length < 2 || !Array.isArray(json[1])) return null;
  const meta = json[0] as { lastupdated?: string } | null;
  const allowed = new Set<string>(INFLATION_COUNTRIES.map((c) => c.code));
  const byCountry = new Map<string, Map<number, number | null>>();

  for (const row of json[1] as Row[]) {
    const code = row.countryiso3code;
    const year = Number(row.date);
    if (row.indicator?.id !== WB_INFLATION_INDICATOR) continue; // a different indicator must never slip in
    if (!code || !allowed.has(code) || !Number.isInteger(year)) continue;
    const value = typeof row.value === "number" && Number.isFinite(row.value) ? row.value : null;
    if (!byCountry.has(code)) byCountry.set(code, new Map());
    byCountry.get(code)!.set(year, value);
  }

  // Years inside the observed range keep their nulls (a real gap); years after
  // the newest published value anywhere are "not yet published", not gaps.
  let newest = -Infinity;
  for (const years of byCountry.values()) for (const [y, v] of years) if (v !== null) newest = Math.max(newest, y);
  if (!Number.isFinite(newest)) return null;

  const series: Record<string, AnnualPoint[]> = {};
  for (const { code } of INFLATION_COUNTRIES) {
    const years = byCountry.get(code);
    if (!years) continue;
    series[code] = [...years.entries()]
      .filter(([y]) => y <= newest)
      .sort((a, b) => a[0] - b[0])
      .map(([year, value]) => ({ year, value }));
  }
  if (Object.keys(series).length === 0) return null;
  return { series, lastUpdated: meta?.lastupdated ?? null };
}

export async function getWorldBankInflation(fetchImpl: typeof fetch = fetch): Promise<WorldBankInflation | null> {
  try {
    const codes = INFLATION_COUNTRIES.map((c) => c.code).join(";");
    const url = `${BASE}/${codes}/indicator/${WB_INFLATION_INDICATOR}?format=json&per_page=500&mrv=${MOST_RECENT_VALUES}`;
    const res = await fetchImpl(url, { next: { revalidate: REVALIDATE_SECONDS }, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) return null;
    return parseWorldBankInflation(await res.json());
  } catch {
    return null;
  }
}
