"use client";

import Link from "next/link";
import type { EventRecord } from "@/lib/economicCalendar/economicEventsRepo";
import { useLanguage } from "@/components/LanguageProvider";
import { formatEventDate, formatEventTime } from "@/lib/economicCalendar/economicCalendarData";
import { formatReleasedAgo, EVENT_RETENTION_DAYS } from "@/lib/economicCalendar/retentionConfig";
import { calculateSurprise, SURPRISE_LABELS, SURPRISE_BADGE_CLASS } from "@/lib/economicCalendar/surpriseAnalysis";
import EventCategoryBadge from "./EventCategoryBadge";
import EventImportanceBadge from "./EventImportanceBadge";

/**
 * "Recent Releases" — released events still within the retention window
 * (see retentionConfig.ts), so a result stays reviewable for a few days
 * instead of disappearing the moment it's released. After
 * EVENT_RETENTION_DAYS, an event simply stops appearing here (still fully
 * available at its own URL and in the Archive) — see
 * economicEventsRepo.ts's getRecentReleases. Positioned directly below the
 * Hero (see EconomicCalendarWorkspace) — "what just happened" is the first
 * thing an investor wants to see, ahead of anything upcoming.
 */
export default function RecentReleases({ events }: { events: EventRecord[] }) {
  const { t } = useLanguage();
  if (events.length === 0) return null;
  const today = new Date();

  return (
    <section className="glass-card flex flex-col gap-4 rounded-2xl p-6 sm:p-8">
      <div>
        <h2 className="text-xl font-semibold text-white light:text-slate-900">{t("calendar.recentReleases")}</h2>
        <p className="mt-1 text-sm text-white/50 light:text-slate-500">
          {t("calendar.recentReleasesDesc")}
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        {events.map((event) => {
          const surprise = calculateSurprise(event.actualValue, event.forecastValue);
          return (
            <Link
              key={event.id}
              href={`/economic-calendar/archive/${event.slug}`}
              className="glass-card flex flex-col gap-3 p-4 transition-colors hover:border-neon-blue/30 sm:flex-row sm:items-center sm:gap-4"
            >
              <div className="flex flex-1 flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <EventCategoryBadge category={event.series.category} />
                  <EventImportanceBadge importance={event.importance} withTooltip={false} />
                </div>
                <p className="text-sm font-semibold text-white light:text-slate-900">{event.title}</p>
                <span className="text-xs text-white/40 light:text-slate-400">
                  {formatEventDate(event.eventDate)} {event.eventTime && `· ${formatEventTime(event.eventTime)}`} · {formatReleasedAgo(event.eventDate, today)}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-5 border-t border-white/5 light:border-slate-100 pt-3 sm:border-t-0 sm:pt-0">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] uppercase tracking-wide text-white/35 light:text-slate-400">{t("calendar.previousCol")}</span>
                  <span className="text-sm font-medium text-white/70 light:text-slate-600">{event.previousValue ?? "—"}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] uppercase tracking-wide text-white/35 light:text-slate-400">{t("calendar.forecastCol")}</span>
                  <span className="text-sm font-medium text-white/70 light:text-slate-600">{event.forecastValue ?? "—"}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] uppercase tracking-wide text-white/35 light:text-slate-400">{t("calendar.actualCol")}</span>
                  <span className="text-sm font-semibold text-neon-blue">{event.actualValue ?? "—"}</span>
                </div>
                {surprise.direction !== "unavailable" && (
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${SURPRISE_BADGE_CLASS[surprise.direction]}`}>
                    {SURPRISE_LABELS[surprise.direction]}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
