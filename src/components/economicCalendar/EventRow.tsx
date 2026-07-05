"use client";

import Link from "next/link";
import type { EconomicEvent } from "@/lib/economicCalendar/economicCalendarTypes";
import { useLanguage } from "@/components/LanguageProvider";
import { formatEventDate, formatEventTime, resolveStatus } from "@/lib/economicCalendar/economicCalendarData";
import EventCategoryBadge from "./EventCategoryBadge";
import EventImportanceBadge from "./EventImportanceBadge";
import EventStatusBadge from "./EventStatusBadge";

interface Props {
  event: EconomicEvent;
  /** Hides the date column — used by Today's Events, where every row is already today. */
  showDate?: boolean;
}

/**
 * One event as a responsive row — a horizontal data row on desktop, stacking
 * into label/value pairs on mobile rather than a real <table> (which a
 * 6-column row can't survive at phone widths).
 *
 * The title links to /economic-calendar/event/[id] (Phase 2A) — this works
 * because the database seed (scripts/generateEconomicCalendarSeed.ts) uses
 * each mock event's own `id` as its Postgres slug, so this static-data
 * component can link into the database-backed detail page without knowing
 * anything about Supabase itself. Until the seed SQL has actually been run,
 * these links 404; that's an expected, transient state, not a bug here.
 */
export default function EventRow({ event, showDate = true }: Props) {
  const status = resolveStatus(event);
  const { t } = useLanguage();
  return (
    <div className="glass-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-4">
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          {showDate && (
            <span className="text-xs font-semibold text-white/70 light:text-slate-600">{formatEventDate(event.date)}</span>
          )}
          <span className="text-xs text-white/40 light:text-slate-400">{formatEventTime(event.time)}</span>
        </div>
        <Link href={`/economic-calendar/event/${event.id}`} className="text-sm font-semibold text-white light:text-slate-900 hover:text-neon-blue hover:underline">
          {event.title}
        </Link>
        <div className="flex flex-wrap items-center gap-1.5">
          <EventCategoryBadge category={event.category} />
          <EventImportanceBadge importance={event.importance} withTooltip={false} />
          <EventStatusBadge status={status} />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-6 border-t border-white/5 light:border-slate-100 pt-3 sm:border-t-0 sm:pt-0">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wide text-white/35 light:text-slate-400">{t("calendar.previousCol")}</span>
          <span className="text-sm font-medium text-white/80 light:text-slate-700">{event.previous ?? "—"}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wide text-white/35 light:text-slate-400">{t("calendar.forecastCol")}</span>
          <span className="text-sm font-medium text-neon-blue">{event.forecast ?? "—"}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wide text-white/35 light:text-slate-400">{t("calendar.actualCol")}</span>
          <span className={`text-sm font-medium ${event.actual ? "text-white" : "text-white/30 light:text-slate-400"}`}>{event.actual ?? t("calendar.pending")}</span>
        </div>
      </div>
    </div>
  );
}
