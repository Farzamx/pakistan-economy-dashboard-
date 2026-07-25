"use client";

import { useLanguage } from "@/components/LanguageProvider";
import type { EconomicEvent } from "@/lib/economicCalendar/economicCalendarTypes";
import EventRow from "./EventRow";

export default function ThisWeekEvents({ events }: { events: EconomicEvent[] }) {
  const { t } = useLanguage();
  return (
    <section className="glass-card flex flex-col gap-4 rounded-2xl p-6 sm:p-8">
      <div>
        <h2 className="text-xl font-semibold text-white light:text-slate-900">{t("calendar.thisWeekTitle")}</h2>
        <p className="mt-1 text-sm text-white/50 light:text-slate-500">{t("calendar.thisWeekDesc")}</p>
      </div>
      {events.length === 0 ? (
        <p className="rounded-xl border border-white/5 light:border-slate-200 bg-white/[0.02] light:bg-slate-50 px-5 py-4 text-sm text-white/50 light:text-slate-500">
          {t("calendar.thisWeekEmpty")}
        </p>
      ) : (
        // v4 Phase 2: one flat terminal panel with hairline-divided rows —
        // was a stack of individual glass cards (see EventRow's header).
        <div className="panel-flat overflow-hidden">
          {events.map((event) => (
            <EventRow key={event.id} event={event} />
          ))}
        </div>
      )}
    </section>
  );
}
