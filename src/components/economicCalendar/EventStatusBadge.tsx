import type { EventStatus } from "@/lib/economicCalendar/economicCalendarTypes";
import { EVENT_STATUS_META } from "@/lib/economicCalendar/economicCalendarRegistry";

/** Upcoming (gray) / Released (green) / Postponed (orange) / Cancelled (red) — Phase 2B. */
export default function EventStatusBadge({ status }: { status: EventStatus }) {
  const meta = EVENT_STATUS_META[status];
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${meta.badgeClass}`}>
      {meta.label}
    </span>
  );
}
