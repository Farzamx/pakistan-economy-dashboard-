import Link from "next/link";
import type { EventRecord } from "@/lib/economicCalendar/economicEventsRepo";
import { formatEventDate, daysUntil } from "@/lib/economicCalendar/economicCalendarData";
import { getMarketImpactScore } from "@/lib/economicCalendar/marketImpactScore";
import EventCategoryBadge from "./EventCategoryBadge";
import EventImportanceBadge from "./EventImportanceBadge";
import EventStatusBadge from "./EventStatusBadge";
import ImpactScoreBadge from "./ImpactScoreBadge";

/**
 * "Next Major Market-Moving Events" — database-backed (unlike the rest of
 * the Phase 1 hub, which deliberately keeps reading the static mock array).
 * Sorted by Market Impact Score first, then date (see economicEventsRepo.ts's
 * getNextMajorEvents) — a flat ranked list across every series, distinct
 * from "Major Upcoming Events" above it (one card per headline TYPE).
 */
export default function NextMajorEvents({ events }: { events: EventRecord[] }) {
  if (events.length === 0) return null;
  const today = new Date();

  return (
    <section className="glass-card flex flex-col gap-4 rounded-2xl p-6 sm:p-8">
      <div>
        <h2 className="text-xl font-semibold text-white light:text-slate-900">Next Major Market-Moving Events</h2>
        <p className="mt-1 text-sm text-white/50 light:text-slate-500">Ranked by Market Impact Score, then by how soon they land.</p>
      </div>

      <div className="flex flex-col gap-2.5">
        {events.map((event) => {
          const remaining = daysUntil(event.eventDate, today);
          return (
            <Link
              key={event.id}
              href={`/economic-calendar/event/${event.slug}`}
              className="glass-card flex flex-col gap-3 p-4 transition-colors hover:border-neon-blue/30 sm:flex-row sm:items-center sm:gap-4"
            >
              <div className="flex flex-1 flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <EventCategoryBadge category={event.series.category} />
                  <EventImportanceBadge importance={event.importance} withTooltip={false} />
                  <ImpactScoreBadge score={getMarketImpactScore(event.series.slug, event.importance)} />
                  <EventStatusBadge status={event.status} />
                </div>
                <p className="text-sm font-semibold text-white light:text-slate-900">{event.title}</p>
                <span className="text-xs text-white/40 light:text-slate-400">{formatEventDate(event.eventDate)}</span>
              </div>
              <div className="flex shrink-0 items-center gap-5 border-t border-white/5 light:border-slate-100 pt-3 sm:border-t-0 sm:pt-0">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] uppercase tracking-wide text-white/35 light:text-slate-400">Previous</span>
                  <span className="text-sm font-medium text-white/70 light:text-slate-600">{event.previousValue ?? "—"}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] uppercase tracking-wide text-white/35 light:text-slate-400">Forecast</span>
                  <span className="text-sm font-medium text-neon-blue">{event.forecastValue ?? "—"}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] uppercase tracking-wide text-white/35 light:text-slate-400">Actual</span>
                  <span className="text-sm font-medium text-white/30 light:text-slate-400">{event.actualValue ?? "Pending"}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] uppercase tracking-wide text-white/35 light:text-slate-400">Days Remaining</span>
                  <span className="text-sm font-medium text-white/70 light:text-slate-600">{remaining <= 0 ? "Today" : remaining}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
