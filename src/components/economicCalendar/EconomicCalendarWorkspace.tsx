"use client";

import { useMemo, useState } from "react";
import type { EconomicEvent } from "@/lib/economicCalendar/economicCalendarTypes";
import {
  getCalendarKpis,
  getThisWeekEvents,
  getRemainingThisMonthEvents,
  generateWeeklyOutlook,
  filterByCategoryAndImportance,
  searchEvents,
  isSectionVisible,
  DEFAULT_FILTER_STATE,
  type EventFilterState,
} from "@/lib/economicCalendar/economicCalendarData";
import Link from "next/link";
import ViewportFadeIn from "@/components/ViewportFadeIn";
import EconomicCalendarHero from "./EconomicCalendarHero";
import EventFilters from "./EventFilters";
import ThisWeekEvents from "./ThisWeekEvents";
import RemainingThisMonthEvents from "./RemainingThisMonthEvents";
import WeeklyOutlook from "./WeeklyOutlook";
import WhyEventsMatter from "./WhyEventsMatter";

// Rolling Calendar — deliberately scoped to the present (Current
// Week/Remaining This Month) rather than a full-year view; "Major Upcoming
// Events" (which could surface something a year out) and a separate
// "Today" section were retired in this refactor — Current Week already
// includes today, and Remaining This Month covers the rest of what's
// actually near-term. Recently Released and the Archive link live on the
// page itself (see economic-calendar/page.tsx), both already
// Supabase-backed.
export default function EconomicCalendarWorkspace({ events }: { events: EconomicEvent[] }) {
  // Computed once per mount, not per render tick — a calendar page doesn't
  // need to re-evaluate "today" on every re-render, and freezing it avoids
  // the day silently flipping under the user mid-session right at midnight.
  const [today] = useState(() => new Date());
  const [filters, setFilters] = useState<EventFilterState>(DEFAULT_FILTER_STATE);
  const [searchQuery, setSearchQuery] = useState("");

  const kpis = useMemo(() => getCalendarKpis(events, today), [events, today]);
  const outlook = useMemo(() => generateWeeklyOutlook(events, today), [events, today]);

  const weekEvents = useMemo(
    () => searchEvents(filterByCategoryAndImportance(getThisWeekEvents(events, today), filters), searchQuery),
    [events, today, filters, searchQuery],
  );
  const remainingMonthEvents = useMemo(
    () => searchEvents(filterByCategoryAndImportance(getRemainingThisMonthEvents(events, today), filters), searchQuery),
    [events, today, filters, searchQuery],
  );

  return (
    <div className="flex flex-col gap-6">
      <EconomicCalendarHero kpis={kpis} />

      <EventFilters filters={filters} onChange={setFilters} searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      {isSectionVisible("Current Week", filters.dateRange) && (
        <ViewportFadeIn>
          <ThisWeekEvents events={weekEvents} />
        </ViewportFadeIn>
      )}

      {isSectionVisible("Remaining This Month", filters.dateRange) && (
        <ViewportFadeIn delay={0.05}>
          <RemainingThisMonthEvents events={remainingMonthEvents} />
        </ViewportFadeIn>
      )}

      <ViewportFadeIn>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[var(--text-muted)]">Explore further:</span>
          <Link href="/economic-calendar/archive" className="rounded-full border border-white/10 light:border-slate-200 px-3 py-1.5 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]">
            Historical Release Archive
          </Link>
          <a href="/economic-calendar/feed.ics" className="rounded-full border border-neon-blue/20 bg-neon-blue/5 px-3 py-1.5 text-neon-blue transition-colors hover:bg-neon-blue/10">
            Subscribe to Calendar Feed (.ics)
          </a>
        </div>
      </ViewportFadeIn>

      <ViewportFadeIn>
        <WeeklyOutlook outlook={outlook} />
      </ViewportFadeIn>

      <ViewportFadeIn>
        <WhyEventsMatter />
      </ViewportFadeIn>
    </div>
  );
}
