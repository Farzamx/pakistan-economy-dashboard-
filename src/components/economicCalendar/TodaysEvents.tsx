import type { EconomicEvent } from "@/lib/economicCalendar/economicCalendarTypes";
import EventRow from "./EventRow";

export default function TodaysEvents({ events }: { events: EconomicEvent[] }) {
  return (
    <section className="glass-card flex flex-col gap-4 rounded-2xl p-6 sm:p-8">
      <h2 className="text-xl font-semibold text-white light:text-slate-900">Today&apos;s Events</h2>
      {events.length === 0 ? (
        <p className="rounded-xl border border-white/5 light:border-slate-200 bg-white/[0.02] light:bg-slate-50 px-5 py-4 text-sm text-white/50 light:text-slate-500">
          No major economic events scheduled today.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {events.map((event) => (
            <EventRow key={event.id} event={event} showDate={false} />
          ))}
        </div>
      )}
    </section>
  );
}
