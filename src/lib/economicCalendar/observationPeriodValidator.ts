// Observation-Period Validation — source-agnostic guard used by every
// scheduled-indicator sync path before any database write.
//
// Problem it solves: a sync function fetches the latest observation from
// a data source (SBP EasyData, PBS, World Bank, etc.) and tries to write
// it to the calendar event whose date has most recently passed. Without
// this check, a source that is several weeks behind will silently stamp
// last month's figure onto this month's calendar slot — confirmed live:
// SPI wrote 2026-06-18's +0.46% WoW to the 2026-06-26 slot (fixed in the
// SPI path); the same defect existed in all SBP EasyData paths (fixed
// here for all of them at once).
//
// How it works: given the observation's date, the calendar event's date,
// and the series cadence, it computes the expected observation period for
// that event and compares. A mismatch is a hard skip — no write, no cache
// bust, no corruption.
//
// Extension path: any future sync provider (PDF scraper, World Bank,
// official CSV, etc.) calls the same function with the same config. No
// bespoke per-source logic needed — cadence + lag is enough.

export type SyncCadence = "monthly" | "weekly" | "as-needed";

export interface PeriodValidationConfig {
  cadence: SyncCadence;
  /**
   * Monthly only — months between the observation period-end and the
   * release event date.
   *   CPI/Core/WPI released ~10th of month N+1 → lagMonths=1
   *   (May obs → June 10 release → lagMonths=1)
   *   LSM released ~18th of month N+2 → lagMonths=2
   *   (April obs → June 18 release → lagMonths=2)
   */
  lagMonths?: number;
  /**
   * As-needed only — maximum calendar-day gap between obsDate and
   * eventDate. SBP auction dates in EasyData sometimes differ by 1–2
   * days from the official release date; 3 days covers all known cases.
   */
  maxDaysVariance?: number;
}

export interface PeriodValidationResult {
  valid: boolean;
  reason: string;
  /** Human-readable description of what the validator expected ("May 2026"). */
  expectedPeriod?: string;
  /** Human-readable description of what the source actually provided ("Apr 2026"). */
  actualPeriod?: string;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

function monthLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

/**
 * Validates that a data source's observation period aligns with what the
 * calendar event represents before any write is permitted.
 *
 * @param obsDate   "YYYY-MM-DD" — observation date returned by the data source.
 * @param eventDate "YYYY-MM-DD" — the calendar event's release date.
 * @param config    Cadence and lag/variance settings for this series.
 *
 * Returns `{ valid: true }` when the observation belongs to the right
 * period; `{ valid: false, reason }` with a human-readable explanation
 * when it does not. Callers must treat `valid: false` as a hard skip —
 * no write, no cache invalidation, event stays `scheduled`.
 */
export function validateObservationPeriod(
  obsDate: string,
  eventDate: string,
  config: PeriodValidationConfig,
): PeriodValidationResult {
  const obs = new Date(obsDate + "T00:00:00Z");
  const evt = new Date(eventDate + "T00:00:00Z");

  // ── Weekly (e.g. SPI) ───────────────────────────────────────────────────
  // The observation must be for exactly the same date as the calendar slot.
  // PBS's SPI report carries the week-ended date in the .xlsx itself; the
  // sync already matches on that exact date field (see syncSpiFromPbs).
  if (config.cadence === "weekly") {
    if (obsDate === eventDate) {
      return { valid: true, reason: `weekly exact match: obsDate ${obsDate} === eventDate ${eventDate}` };
    }
    return {
      valid: false,
      reason: `Weekly cadence requires obsDate (${obsDate}) === eventDate (${eventDate}) — no exact match; source may not have published this week yet`,
      expectedPeriod: eventDate,
      actualPeriod: obsDate,
    };
  }

  // ── As-needed (auctions, MPC decisions) ────────────────────────────────
  // The observation date IS the auction/meeting date. The calendar event
  // date should be within a small tolerance window (SBP sometimes records
  // an auction result 1 day after the event_date in the official calendar).
  if (config.cadence === "as-needed") {
    const maxDays = config.maxDaysVariance ?? 3;
    const diffDays = Math.abs((obs.getTime() - evt.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= maxDays) {
      return {
        valid: true,
        reason: `as-needed: obsDate ${obsDate} is ${Math.round(diffDays)} day(s) from eventDate ${eventDate} (tolerance ${maxDays}d)`,
      };
    }
    return {
      valid: false,
      reason: `As-needed cadence: obsDate (${obsDate}) is ${Math.round(diffDays)} days from eventDate (${eventDate}), exceeds ${maxDays}-day tolerance — source has not yet published the result for this event`,
      expectedPeriod: eventDate,
      actualPeriod: obsDate,
    };
  }

  // ── Monthly ─────────────────────────────────────────────────────────────
  // Expected: obsDate's month must equal (eventDate's month − lagMonths).
  // We compare month-of-year only (not the exact day), because SBP returns
  // the last calendar day of the observed month (2026-05-31 for May),
  // which may differ from the theoretical month-end by zero to one day
  // depending on the month length.
  const lagMonths = config.lagMonths ?? 1;
  const obsYear  = obs.getUTCFullYear();
  const obsMonth = obs.getUTCMonth() + 1; // 1-based
  const evtYear  = evt.getUTCFullYear();
  const evtMonth = evt.getUTCMonth() + 1; // 1-based

  // expectedMonth = evtMonth - lagMonths, wrapping into prior year if needed
  let expectedMonth = evtMonth - lagMonths;
  let expectedYear  = evtYear;
  while (expectedMonth <= 0) {
    expectedMonth += 12;
    expectedYear--;
  }

  if (obsYear === expectedYear && obsMonth === expectedMonth) {
    return {
      valid: true,
      reason: `monthly (lag=${lagMonths}mo): obsDate period ${monthLabel(obsYear, obsMonth)} matches expected period for event on ${eventDate}`,
    };
  }

  return {
    valid: false,
    reason: `Monthly cadence (lag=${lagMonths}mo): obsDate period is ${monthLabel(obsYear, obsMonth)} but expected ${monthLabel(expectedYear, expectedMonth)} for event on ${eventDate} — source has not yet published the correct period's data`,
    expectedPeriod: monthLabel(expectedYear, expectedMonth),
    actualPeriod: monthLabel(obsYear, obsMonth),
  };
}
