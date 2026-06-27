import type { EventRecord } from "@/lib/economicCalendar/economicEventsRepo";
import { formatEventDate } from "@/lib/economicCalendar/economicCalendarData";
import { calculateSurprise, SURPRISE_LABELS, SURPRISE_BADGE_CLASS } from "@/lib/economicCalendar/surpriseAnalysis";

/** Recent prior instances of the same series, each with its own computed surprise — lets a visitor see the trend, not just one isolated number. */
export default function HistoricalContext({ events }: { events: EventRecord[] }) {
  const released = events.filter((e) => e.actualValue);
  if (released.length === 0) return null;

  return (
    <section className="glass-card mt-6 p-6 sm:p-8">
      <h2 className="text-xl font-semibold text-white light:text-slate-900">Historical Context</h2>
      <div className="mt-4 flex flex-col gap-2">
        {released.slice(0, 5).map((event) => {
          const surprise = calculateSurprise(event.actualValue, event.forecastValue);
          return (
            <div key={event.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/5 light:border-slate-100 px-4 py-2.5">
              <span className="text-xs font-medium text-white/60 light:text-slate-500">{formatEventDate(event.eventDate)}</span>
              <div className="flex items-center gap-4">
                <span className="text-xs text-white/40 light:text-slate-400">
                  Forecast <span className="text-white/70 light:text-slate-700">{event.forecastValue ?? "—"}</span>
                </span>
                <span className="text-xs text-white/40 light:text-slate-400">
                  Actual <span className="font-semibold text-neon-blue">{event.actualValue}</span>
                </span>
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${SURPRISE_BADGE_CLASS[surprise.direction]}`}>
                  {SURPRISE_LABELS[surprise.direction]}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
