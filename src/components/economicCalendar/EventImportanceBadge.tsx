import type { ImportanceLevel } from "@/lib/economicCalendar/economicCalendarTypes";
import { IMPORTANCE_LEVELS } from "@/lib/economicCalendar/economicCalendarRegistry";
import InfoTooltip from "@/components/InfoTooltip";

interface Props {
  importance: ImportanceLevel;
  /** Hides the adjacent (?) tooltip trigger — used where the badge repeats many times on one page (e.g. a calendar grid) and a single tooltip elsewhere already explains the term. */
  withTooltip?: boolean;
}

/** Renamed from a bare "High/Medium/Low" to "{Level} Market Impact" in Phase 2B — the label refers specifically to expected PSX/bond/PKR impact, not a generic priority. */
export default function EventImportanceBadge({ importance, withTooltip = true }: Props) {
  const meta = IMPORTANCE_LEVELS[importance];
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${meta.badgeClass}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} aria-hidden="true" />
        {meta.displayLabel}
      </span>
      {withTooltip && <InfoTooltip termKey="market-impact" size="xs" />}
    </span>
  );
}
