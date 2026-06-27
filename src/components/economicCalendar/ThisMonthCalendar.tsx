"use client";

import { useState } from "react";
import type { EconomicEvent } from "@/lib/economicCalendar/economicCalendarTypes";
import { EVENT_CATEGORIES, CATEGORY_BADGE_CLASS } from "@/lib/economicCalendar/economicCalendarRegistry";
import { formatEventDate } from "@/lib/economicCalendar/economicCalendarData";
import EventRow from "./EventRow";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface DayCell {
  date: Date;
  inCurrentMonth: boolean;
  isToday: boolean;
  events: EconomicEvent[];
}

function buildMonthGrid(today: Date, monthEvents: EconomicEvent[]): DayCell[] {
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay();
  const gridStart = new Date(year, month, 1 - startOffset);

  const eventsByDate = new Map<string, EconomicEvent[]>();
  for (const event of monthEvents) {
    const list = eventsByDate.get(event.date) ?? [];
    list.push(event);
    eventsByDate.set(event.date, list);
  }

  const cells: DayCell[] = [];
  const totalCells = 42; // 6 full weeks — always enough to cover any month's grid
  for (let i = 0; i < totalCells; i++) {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    cells.push({
      date,
      inCurrentMonth: date.getMonth() === month,
      isToday: date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate(),
      events: eventsByDate.get(iso) ?? [],
    });
  }
  // Trim trailing weeks that are entirely outside the current month, so a
  // 28/30-day month doesn't always render a visually-empty 6th row.
  while (cells.length > 35 && cells.slice(-7).every((c) => !c.inCurrentMonth)) {
    cells.splice(-7, 7);
  }
  return cells;
}

export default function ThisMonthCalendar({ today, monthEvents }: { today: Date; monthEvents: EconomicEvent[] }) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const cells = buildMonthGrid(today, monthEvents);
  const monthLabel = today.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const selectedCell = cells.find((c) => c.date.toDateString() === selectedDate);

  return (
    <section className="glass-card flex flex-col gap-4 rounded-2xl p-6 sm:p-8">
      <div>
        <h2 className="text-xl font-semibold text-white light:text-slate-900">This Month</h2>
        <p className="mt-1 text-sm text-white/50 light:text-slate-500">{monthLabel} — tap a day to see its release.</p>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wide text-white/35 light:text-slate-400">
        {WEEKDAY_LABELS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          const key = cell.date.toDateString();
          const isSelected = selectedDate === key;
          return (
            <button
              key={key}
              type="button"
              disabled={cell.events.length === 0}
              onClick={() => setSelectedDate(isSelected ? null : key)}
              className={`flex aspect-square flex-col items-center justify-start gap-1 rounded-lg border p-1 text-xs transition-colors sm:p-1.5 ${
                !cell.inCurrentMonth
                  ? "border-transparent text-white/15 light:text-slate-300"
                  : isSelected
                    ? "border-neon-blue/50 bg-neon-blue/15 text-white light:text-slate-900"
                    : cell.isToday
                      ? "border-neon-blue/30 bg-neon-blue/5 text-white light:text-slate-900"
                      : "border-white/5 light:border-slate-100 text-white/70 light:text-slate-600 hover:bg-white/5 light:hover:bg-slate-50 disabled:hover:bg-transparent"
              }`}
            >
              <span className="font-medium">{cell.date.getDate()}</span>
              {cell.events.length > 0 && (
                <span className="flex flex-wrap items-center justify-center gap-0.5">
                  {cell.events.slice(0, 3).map((e) => (
                    <span
                      key={e.id}
                      aria-hidden="true"
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: EVENT_CATEGORIES[e.category].hex }}
                    />
                  ))}
                  {cell.events.length > 3 && <span className="text-[8px] text-white/40">+{cell.events.length - 3}</span>}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-white/5 light:border-slate-100 pt-4 text-[10px]">
        {Object.values(EVENT_CATEGORIES).map((meta) => (
          <span key={meta.label} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${CATEGORY_BADGE_CLASS[meta.color]}`}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.hex }} aria-hidden="true" />
            {meta.label}
          </span>
        ))}
      </div>

      {selectedCell && selectedCell.events.length > 0 && (
        <div className="flex flex-col gap-2.5 border-t border-white/5 light:border-slate-100 pt-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/40 light:text-slate-500">
            {formatEventDate(`${selectedCell.date.getFullYear()}-${String(selectedCell.date.getMonth() + 1).padStart(2, "0")}-${String(selectedCell.date.getDate()).padStart(2, "0")}`)}
          </p>
          {selectedCell.events.map((event) => (
            <EventRow key={event.id} event={event} showDate={false} />
          ))}
        </div>
      )}
    </section>
  );
}
