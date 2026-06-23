// Provincial population — Pakistan Bureau of Statistics 7th Population &
// Housing Census 2023 ("The Digital Census"), approved by the Council of
// Common Interests on 5 August 2023. Figures verified via PBS's own site
// (pbs.gov.pk) plus independent corroboration (Wikipedia's 2023 Pakistani
// census page, Business Recorder, ProPakistani) during the Provincial
// Budget Workshop's source audit — the PBS provincial breakdown PDF itself
// exceeded this session's fetch-size limit, so the exact PBS table URL and
// the 2017 census comparison figures still need one direct follow-up fetch
// before this file is treated as fully sourced; flagged here rather than
// silently assumed.
//
// Pakistan's fiscal years don't align with census years, so for any FY
// other than 2023-24, population is a documented linear estimate, not a
// second live source: interpolated between census points where a
// historical 2017 figure exists, or extrapolated forward from 2023 using a
// fixed annual growth rate where it doesn't (until that 2017 figure is
// confirmed). This is plain arithmetic, not a data source — never present
// an estimated year's population as if it were itself census-sourced.

import type { ProvinceId } from "./provincialBudgetHistorical";

export interface CensusPoint {
  year: number;
  population: number;
}

export interface ProvincePopulationRecord {
  /** 7th Population & Housing Census 2023 — verified, see file header. */
  census2023: CensusPoint;
  /**
   * Approximate annual growth rate implied by Census 2023 vs. Pakistan's
   * widely-cited ~2.55% national intercensal rate — used only to
   * extrapolate years outside the census point itself. Province-specific
   * 2017 figures are not yet independently confirmed (see file header), so
   * this is a placeholder rate, not a province-verified one.
   */
  approxAnnualGrowthRate: number;
}

export const PROVINCIAL_POPULATION: Record<ProvinceId, ProvincePopulationRecord> = {
  punjab: { census2023: { year: 2023, population: 127_680_000 }, approxAnnualGrowthRate: 0.024 },
  sindh: { census2023: { year: 2023, population: 55_690_000 }, approxAnnualGrowthRate: 0.027 },
  kp: { census2023: { year: 2023, population: 40_850_000 }, approxAnnualGrowthRate: 0.029 },
  balochistan: { census2023: { year: 2023, population: 14_890_000 }, approxAnnualGrowthRate: 0.031 },
};

/**
 * A fiscal year like "2026-27" is treated as the calendar year its second
 * half falls in (July 2026-June 2027 → 2027) for population-estimate
 * purposes, since that's closer to the midpoint of the fiscal year than its
 * starting calendar year.
 */
function fiscalYearToCalendarYear(fiscalYear: string): number {
  const startYear = parseInt(fiscalYear.split("-")[0], 10);
  return startYear + 1;
}

/** Estimated population for a fiscal year, extrapolated from Census 2023 — see file header for methodology and its current limitations. Never call this a census figure in UI copy; always label it "estimated". */
export function getEstimatedPopulation(province: ProvinceId, fiscalYear: string): number {
  const record = PROVINCIAL_POPULATION[province];
  const targetYear = fiscalYearToCalendarYear(fiscalYear);
  const yearsSinceCensus = targetYear - record.census2023.year;
  return Math.round(record.census2023.population * Math.pow(1 + record.approxAnnualGrowthRate, yearsSinceCensus));
}
