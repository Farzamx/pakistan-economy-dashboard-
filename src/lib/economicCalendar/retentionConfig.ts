// Released Event Retention Policy — a released event keeps appearing on
// the *active* calendar (Next Major Events, Recent Releases) for this many
// days after its release date, so users have time to review the outcome
// before it's archive-only. One configuration value; nothing below should
// ever hardcode "7" directly — change this constant instead.
export const EVENT_RETENTION_DAYS = 7;

/** Whether `eventDate` (a released event's date, "YYYY-MM-DD") is still within the active-calendar retention window as of `today`. */
export function isWithinRetention(eventDate: string, today: Date): boolean {
  const todayIso = today.toISOString().slice(0, 10);
  const cutoff = new Date(`${todayIso}T00:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - EVENT_RETENTION_DAYS);
  return eventDate >= cutoff.toISOString().slice(0, 10);
}

/** Whole days since `eventDate` ("YYYY-MM-DD"), relative to `today` — used for the "Released N days ago" badge. */
export function daysSinceRelease(eventDate: string, today: Date): number {
  const todayIso = today.toISOString().slice(0, 10);
  const diffMs = new Date(`${todayIso}T00:00:00Z`).getTime() - new Date(`${eventDate}T00:00:00Z`).getTime();
  return Math.round(diffMs / 86_400_000);
}

/** "Released today" / "Released yesterday" / "Released N days ago". */
export function formatReleasedAgo(eventDate: string, today: Date): string {
  const days = daysSinceRelease(eventDate, today);
  if (days <= 0) return "Released today";
  if (days === 1) return "Released yesterday";
  return `Released ${days} days ago`;
}
