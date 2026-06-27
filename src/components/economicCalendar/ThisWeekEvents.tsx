import type { EconomicEvent } from "@/lib/economicCalendar/economicCalendarTypes";
import EventRow from "./EventRow";

export default function ThisWeekEvents({ events }: { events: EconomicEvent[] }) {
  return (
    <section className="glass-card flex flex-col gap-4 rounded-2xl p-6 sm:p-8">
      <div>
        <h2 className="text-xl font-semibold text-white light:text-slate-900">This Week</h2>
        <p className="mt-1 text-sm text-white/50 light:text-slate-500">All events scheduled over the next 7 days.</p>
      </div>
      {events.length === 0 ? (
        <p className="rounded-xl border border-white/5 light:border-slate-200 bg-white/[0.02] light:bg-slate-50 px-5 py-4 text-sm text-white/50 light:text-slate-500">
          No events match the current filters for this week.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {events.map((event) => (
            <EventRow key={event.id} event={event} />
          ))}
        </div>
      )}
    </section>
  );
}
