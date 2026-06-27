"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Dropdown from "@/components/Dropdown";
import EventCategoryBadge from "./EventCategoryBadge";
import EventImportanceBadge from "./EventImportanceBadge";
import { EVENT_CATEGORY_LIST } from "@/lib/economicCalendar/economicCalendarRegistry";
import { formatEventDate } from "@/lib/economicCalendar/economicCalendarData";
import type { EventRecord } from "@/lib/economicCalendar/economicEventsRepo";

interface Props {
  events: EventRecord[];
}

export default function ArchiveBrowser({ events }: Props) {
  const years = useMemo(() => Array.from(new Set(events.map((e) => e.eventDate.slice(0, 4)))).sort((a, b) => b.localeCompare(a)), [events]);
  const [category, setCategory] = useState<string>("All");
  const [year, setYear] = useState<string>("All");

  const filtered = events.filter((e) => (category === "All" || e.series.category === category) && (year === "All" || e.eventDate.startsWith(year)));

  return (
    <div className="flex flex-col gap-4">
      <div className="glass-card flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <p className="text-sm text-white/50 light:text-slate-500">{filtered.length} released event{filtered.length === 1 ? "" : "s"}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Dropdown
            label="Category"
            value={category}
            onChange={setCategory}
            options={[{ value: "All", label: "All Categories" }, ...EVENT_CATEGORY_LIST.map((c) => ({ value: c, label: c }))]}
          />
          <Dropdown label="Year" value={year} onChange={setYear} options={[{ value: "All", label: "All Years" }, ...years.map((y) => ({ value: y, label: y }))]} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="glass-card rounded-2xl p-6 text-center text-sm text-white/50 light:text-slate-500">No released events match these filters yet.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map((event) => (
            <Link
              key={event.id}
              href={`/economic-calendar/archive/${event.slug}`}
              className="glass-card flex flex-col gap-3 p-4 transition-colors hover:border-neon-blue/30 sm:flex-row sm:items-center sm:gap-4"
            >
              <div className="flex flex-1 flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-white/70 light:text-slate-600">{formatEventDate(event.eventDate)}</span>
                </div>
                <p className="text-sm font-semibold text-white light:text-slate-900">{event.title}</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <EventCategoryBadge category={event.series.category} />
                  <EventImportanceBadge importance={event.importance} />
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-6 border-t border-white/5 light:border-slate-100 pt-3 sm:border-t-0 sm:pt-0">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] uppercase tracking-wide text-white/35 light:text-slate-400">Forecast</span>
                  <span className="text-sm font-medium text-white/70 light:text-slate-600">{event.forecastValue ?? "—"}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] uppercase tracking-wide text-white/35 light:text-slate-400">Actual</span>
                  <span className="text-sm font-semibold text-neon-blue">{event.actualValue ?? "—"}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
