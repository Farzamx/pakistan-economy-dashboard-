"use client";

import Link from "next/link";
import type { EconomicEvent } from "@/lib/economicCalendar/economicCalendarTypes";
import { useLanguage } from "@/components/LanguageProvider";
import { formatEventDate, formatEventTime, resolveStatus } from "@/lib/economicCalendar/economicCalendarData";
import { IMPORTANCE_LEVELS } from "@/lib/economicCalendar/economicCalendarRegistry";
import CategoryIcon from "./CategoryIcon";
import EventStatusBadge from "./EventStatusBadge";
import AutomationStatusBadge from "./AutomationStatusBadge";

interface Props {
  event: EconomicEvent;
  /** Hides the date column — used by Today's Events, where every row is already today. */
  showDate?: boolean;
}

/**
 * One event as a TERMINAL ROW (PEIC v4 Phase 2) — replaces the previous
 * one-glass-card-per-event presentation, which spent ~2× the vertical space
 * on borders, per-card padding, and a four-pill badge row louder than the
 * event itself. Now: a hairline-divided row inside the parent's single
 * panel — mono date column, title with a compact category glyph, importance
 * compressed from a pill to a colored dot (full text in the tooltip), and
 * the Prev/Forecast/Actual triple right-aligned in tabular mono so values
 * scan as columns down the whole list, the way a terminal blotter reads.
 * Parents supply the container (see ThisWeekEvents/RemainingThisMonthEvents).
 */
export default function EventRow({ event, showDate = true }: Props) {
  const status = resolveStatus(event);
  const { t } = useLanguage();
  const importanceMeta = IMPORTANCE_LEVELS[event.importance];

  return (
    <div className="panel-row group flex flex-col gap-2 px-3.5 py-2.5 transition-colors duration-150 hover:bg-white/[0.03] light:hover:bg-slate-50 sm:flex-row sm:items-center sm:gap-4">
      {/* Date + time — fixed-width mono column so titles align down the list */}
      <div className="flex shrink-0 items-baseline gap-2 sm:w-[7.5rem] sm:flex-col sm:gap-0.5">
        {showDate && (
          <span className="text-data text-white/70 light:text-slate-600">{formatEventDate(event.date)}</span>
        )}
        <span className="text-data text-white/40 light:text-slate-400">{formatEventTime(event.time)}</span>
      </div>

      {/* Title + compressed signals */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${importanceMeta.dotClass}`}
          title={importanceMeta.displayLabel}
        >
          <span className="sr-only">{importanceMeta.displayLabel}</span>
        </span>
        <CategoryIcon category={event.category} className="h-3.5 w-3.5 shrink-0 text-white/35 light:text-slate-400" />
        <Link
          href={`/economic-calendar/event/${event.id}`}
          className="truncate text-sm font-medium text-white light:text-slate-900 hover:text-neon-blue hover:underline"
        >
          {event.title}
        </Link>
        <EventStatusBadge status={status} />
        <AutomationStatusBadge tier={event.automationTier} />
      </div>

      {/* Prev / Forecast / Actual — right-aligned tabular columns */}
      <div className="flex shrink-0 items-center gap-5 border-t border-white/5 pt-2 light:border-slate-100 sm:border-t-0 sm:pt-0">
        <div className="flex flex-col items-start gap-0.5 sm:items-end">
          <span className="text-overline text-white/35 light:text-slate-400">{t("calendar.previousCol")}</span>
          <span className="text-data text-white/75 light:text-slate-700">{event.previous ?? "—"}</span>
        </div>
        <div className="flex flex-col items-start gap-0.5 sm:items-end">
          <span className="text-overline text-white/35 light:text-slate-400">{t("calendar.forecastCol")}</span>
          <span className="text-data text-neon-blue">{event.forecast ?? "—"}</span>
        </div>
        <div className="flex flex-col items-start gap-0.5 sm:items-end">
          <span className="text-overline text-white/35 light:text-slate-400">{t("calendar.actualCol")}</span>
          <span className={`text-data font-medium ${event.actual ? "text-white light:text-slate-900" : "text-white/35 light:text-slate-400"}`}>
            {event.actual ?? t("calendar.pending")}
          </span>
        </div>
      </div>
    </div>
  );
}
