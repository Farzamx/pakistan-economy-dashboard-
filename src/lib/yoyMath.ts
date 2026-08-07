// Canonical "find the same calendar month one year prior" lookup and YoY%
// calculation — shared by every YoY-from-history computation in this
// codebase. Before this (Phase 6A.2 consistency audit), the identical
// "find same-month index value one year earlier, apply
// ((current/prior)-1)*100" logic was hand-written independently in up to
// four places (src/lib/data/sbp.ts's buildLsmKpi, lsmSync.ts's
// computeLsmYoY — which already documented itself as meant to be the one
// shared implementation, but nothing else actually called it —
// sourceChain.ts's LSM adapter, and a fragile fixed-array-index version in
// weeklyIntelligenceCompute.ts for USD/PKR/M2). A future correction to the
// matching rule now only has to change one place.

export interface DatedPoint {
  date: string; // "YYYY-MM-DD"
  value: number;
}

/**
 * Finds the observation whose date falls in the same calendar month, one
 * year before `referenceDate`. Matches by "YYYY-MM" prefix rather than an
 * exact day or a fixed array offset — monthly SBP/PBS series don't always
 * publish on the same day of the month year to year, and a fixed offset
 * (e.g. "13 points back") silently breaks the moment a series' cadence
 * changes (this already happened once for Money Supply M2 when it moved
 * from monthly to weekly — see sbp.ts's own SERIES_KEYS.moneySupplyM2 comment).
 */
export function findSamePeriodPriorYear<T extends DatedPoint>(
  history: readonly T[],
  referenceDate: string,
): T | undefined {
  const year = parseInt(referenceDate.slice(0, 4), 10);
  const month = referenceDate.slice(5, 7);
  const priorYearPrefix = `${year - 1}-${month}`;
  return history.find((p) => p.date.startsWith(priorYearPrefix));
}

/**
 * Standard YoY%: (current / same-period-prior-year - 1) * 100.
 * Returns null if no prior-year point exists in `history`, or its value is
 * 0 (division undefined) — callers decide how to degrade (e.g. show the
 * raw level instead, or omit the stat) rather than this throwing.
 */
export function computeYoYPercent(
  history: readonly DatedPoint[],
  referenceDate: string,
  currentValue: number,
): number | null {
  const priorYearPoint = findSamePeriodPriorYear(history, referenceDate);
  if (!priorYearPoint || priorYearPoint.value === 0) return null;
  return (currentValue / priorYearPoint.value - 1) * 100;
}
