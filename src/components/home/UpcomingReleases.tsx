// Upcoming economic releases for the homepage (PEIC redesign Phase 3).
// Server-compatible (no hooks).
//
// The caller selects the events with the existing selectUpcomingByDate(),
// which filters to today-or-later — the Phase 16 fix for past events being
// presented as upcoming. This component additionally refuses to render any
// row dated before `todayIso`, so the guarantee holds at the boundary where
// it is visible to a reader even if a future caller forgets the filter
// (see UpcomingReleases.test.ts).

import Link from "next/link";
import type { ImportanceLevel } from "@/lib/economicCalendar/economicCalendarTypes";

export interface UpcomingRow {
  /** "YYYY-MM-DD" */
  date: string;
  title: string;
  importance?: ImportanceLevel;
}

const IMPORTANCE_CLASS: Record<string, string> = {
  High: "border-[var(--pe-crit-border)] bg-[var(--pe-crit-bg)] text-[var(--pe-crit-text)]",
  Medium: "border-[var(--pe-warn-border)] bg-[var(--pe-warn-bg)] text-[var(--pe-warn-text)]",
  Low: "border-pe-border bg-pe-surface-2 text-pe-text-3",
};

/** "Thu 30 Oct" from a date-only string, with no timezone shift. */
export function formatReleaseDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

/**
 * Rows dated today or later, in chronological order. Exported for testing:
 * the boundary rule ("today counts as upcoming, yesterday never does") is
 * what these tests pin.
 */
export function selectDisplayableReleases(rows: UpcomingRow[], todayIso: string): UpcomingRow[] {
  return rows
    .filter((r) => typeof r.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.date) && r.date >= todayIso)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export default function UpcomingReleases({ rows, todayIso }: { rows: UpcomingRow[]; todayIso: string }) {
  const displayable = selectDisplayableReleases(rows, todayIso);

  if (displayable.length === 0) {
    return (
      <p className="px-4 py-3 text-[13px] text-pe-text-3">
        No upcoming releases are scheduled.{" "}
        <Link href="/economic-calendar" className="text-pe-accent hover:underline">
          Open the calendar
        </Link>
      </p>
    );
  }

  return (
    <ul className="divide-y divide-pe-border">
      {displayable.map((row) => (
        <li key={`${row.date}-${row.title}`} className="flex items-baseline gap-3 px-4 py-2">
          <time dateTime={row.date} className="w-[88px] shrink-0 font-mono text-[12px] text-pe-text-3">
            {formatReleaseDate(row.date)}
          </time>
          <span className="min-w-0 flex-1 text-[13px] leading-snug text-pe-text">{row.title}</span>
          {row.importance && (
            <span className={`shrink-0 rounded-full border px-1.5 py-px text-[11px] font-medium ${IMPORTANCE_CLASS[row.importance] ?? IMPORTANCE_CLASS.Low}`}>
              {row.importance}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
