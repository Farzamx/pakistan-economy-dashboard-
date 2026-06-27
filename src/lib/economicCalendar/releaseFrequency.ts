// Release Frequency & Next Expected Release — deliberately separate from
// the automation "how often we re-check the source" cadence (sbp.ts's
// REVALIDATE_* windows, dataFreshness.ts's per-frequency thresholds): this
// is about how often the SOURCE actually publishes, so a once-a-month CPI
// release doesn't read as broken just because the sync cron checks daily.

const RELEASE_FREQUENCY_LABEL: Record<string, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  annual: "Annual",
  irregular: "As Needed",
};

// SBP's Monetary Policy Committee doesn't follow a fixed-interval cadence
// (no weekly/monthly/quarterly bucket fits), but it's far more specific
// than the generic "As Needed" the registry's cadence type would otherwise
// show — SBP's own advance calendar targets roughly six to eight weeks
// between meetings.
const SERIES_FREQUENCY_OVERRIDE: Record<string, string> = {
  "sbp-monetary-policy-committee-meeting": "Every 6–8 Weeks",
};

export function getReleaseFrequencyLabel(seriesSlug: string, cadence: string): string {
  return SERIES_FREQUENCY_OVERRIDE[seriesSlug] ?? RELEASE_FREQUENCY_LABEL[cadence] ?? "As Needed";
}

// Approximate day-count per cadence, used only as a fallback estimate when
// no concrete future instance of a series is in the calendar yet (see
// computeNextExpectedRelease below). 49 days (~7 weeks) is the midpoint of
// SBP's 6-8 week MPC cycle.
const CADENCE_DAYS: Record<string, number> = {
  weekly: 7,
  monthly: 30,
  quarterly: 91,
  annual: 365,
  irregular: 49,
};

export interface NextExpectedRelease {
  /** "YYYY-MM-DD" */
  date: string;
  /** false when a real, already-scheduled calendar entry exists for this date; true when estimated purely from cadence. */
  isEstimated: boolean;
}

interface SeriesEventLike {
  eventDate: string;
  status: string;
}

/**
 * Resolves "Next Expected Release" for a series: prefers a real,
 * already-scheduled future instance from the calendar (most series have
 * one seeded — see economicCalendarEvents.ts); falls back to a
 * cadence-based estimate (current event/today + the cadence's typical
 * interval) only when no confirmed future date exists yet, so the field is
 * never empty.
 */
export function computeNextExpectedRelease(
  cadence: string,
  sameSeriesEvents: SeriesEventLike[],
  currentEventDate: string,
  today: Date,
): NextExpectedRelease {
  const todayIso = today.toISOString().slice(0, 10);

  const scheduled = sameSeriesEvents
    .filter((e) => e.status === "scheduled" && e.eventDate > todayIso && e.eventDate !== currentEventDate)
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  if (scheduled.length > 0) return { date: scheduled[0].eventDate, isEstimated: false };

  const baseDateStr = currentEventDate > todayIso ? currentEventDate : todayIso;
  const days = CADENCE_DAYS[cadence] ?? CADENCE_DAYS.irregular;
  const base = new Date(`${baseDateStr}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return { date: base.toISOString().slice(0, 10), isEstimated: true };
}
