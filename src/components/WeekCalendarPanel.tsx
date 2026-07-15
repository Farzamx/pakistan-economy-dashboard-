"use client";

import { useLanguage } from "@/components/LanguageProvider";
import type { HeroUpcomingEvent } from "@/components/Hero";

interface Props {
  events: HeroUpcomingEvent[];
}

/** "2026-07-16" -> "WED 16 JUL" — the reference design's calendar-row date format. */
function formatCalendarDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-GB", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" }).toUpperCase();
}

/**
 * "This Week's Calendar" — the reference design's companion panel to the
 * Intelligence Feed, sharing the same upcomingEvents page.tsx already
 * fetches for Hero's "Next Scheduled Release" tile (no new query).
 */
export default function WeekCalendarPanel({ events }: Props) {
  const { t } = useLanguage();

  return (
    <div>
      <p className="text-label text-white/40 light:text-slate-400">{t("hero.upcomingCalendar")}</p>
      {events.length > 0 ? (
        <div className="mt-3 flex flex-col gap-3">
          {events.slice(0, 3).map((event, i) => (
            <div key={i}>
              <p className="text-caption font-medium text-neon-blue">{formatCalendarDate(event.date)}</p>
              <p className="text-sm text-white/80 light:text-slate-700">{event.title}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-caption mt-3 text-white/40 light:text-slate-400">No releases scheduled</p>
      )}
    </div>
  );
}
