"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { EconomicEvent } from "@/lib/economicCalendar/economicCalendarTypes";
import { EVENT_CATEGORIES } from "@/lib/economicCalendar/economicCalendarRegistry";
import { formatEventDate, formatRelativeDay, resolveStatus } from "@/lib/economicCalendar/economicCalendarData";
import EventCategoryBadge from "./EventCategoryBadge";
import EventImportanceBadge from "./EventImportanceBadge";
import EventStatusBadge from "./EventStatusBadge";

export default function MajorUpcomingEvents({ events, today }: { events: EconomicEvent[]; today: Date }) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold text-white light:text-slate-900">Major Upcoming Events</h2>
        <p className="mt-1 text-sm text-white/50 light:text-slate-500">
          The next occurrence of each of Pakistan&apos;s most market-moving recurring releases.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => {
          const accent = EVENT_CATEGORIES[event.category].hex;
          const status = resolveStatus(event);
          return (
            <motion.div
              key={event.id}
              whileHover={{ scale: 1.02, y: -2 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
              className="glass-card relative flex flex-col gap-3 overflow-hidden p-6"
              style={{ borderColor: `${accent}33` }}
            >
              <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full blur-3xl" style={{ backgroundColor: `${accent}26` }} />

              {/* display:contents — the Link spans the whole card's click
                  area without affecting this flex layout, since it renders
                  no box of its own. */}
              <Link href={`/economic-calendar/event/${event.id}`} className="contents">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <EventCategoryBadge category={event.category} />
                    <EventStatusBadge status={status} />
                  </div>
                  <EventImportanceBadge importance={event.importance} withTooltip={false} />
                </div>

                <h3 className="text-base font-semibold text-white light:text-slate-900">{event.title}</h3>
                <p className="text-sm leading-relaxed text-white/55 light:text-slate-500">{event.description}</p>

                <div className="mt-auto flex items-center justify-between border-t border-white/5 light:border-slate-100 pt-3">
                  <div className="flex flex-col">
                    <span className="text-xs text-white/40 light:text-slate-400">{formatEventDate(event.date)}</span>
                    <span className="text-sm font-semibold" style={{ color: accent }}>
                      {formatRelativeDay(event.date, today)}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] uppercase tracking-wide text-white/35 light:text-slate-400">Forecast</span>
                    <span className="text-sm font-medium text-white/85 light:text-slate-700">{event.forecast ?? event.previous ?? "—"}</span>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
