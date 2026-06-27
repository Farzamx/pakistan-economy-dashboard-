import type { ImportanceLevel } from "@/lib/economicCalendar/economicCalendarTypes";
import { IMPORTANCE_LEVELS } from "@/lib/economicCalendar/economicCalendarRegistry";

export default function EventImportanceBadge({ importance }: { importance: ImportanceLevel }) {
  const meta = IMPORTANCE_LEVELS[importance];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${meta.badgeClass}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} aria-hidden="true" />
      {meta.label}
    </span>
  );
}
