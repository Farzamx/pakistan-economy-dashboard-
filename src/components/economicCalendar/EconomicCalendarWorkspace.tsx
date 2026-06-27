"use client";

import { useMemo, useState } from "react";
import type { EconomicEvent } from "@/lib/economicCalendar/economicCalendarTypes";
import {
  getCalendarKpis,
  getTodayEvents,
  getThisWeekEvents,
  getThisMonthEvents,
  getMajorUpcomingEvents,
  generateWeeklyOutlook,
  filterByCategoryAndImportance,
  searchEvents,
  isSectionVisible,
  DEFAULT_FILTER_STATE,
  type EventFilterState,
} from "@/lib/economicCalendar/economicCalendarData";
import ViewportFadeIn from "@/components/ViewportFadeIn";
import EconomicCalendarHero from "./EconomicCalendarHero";
import EventFilters from "./EventFilters";
import TodaysEvents from "./TodaysEvents";
import ThisWeekEvents from "./ThisWeekEvents";
import ThisMonthCalendar from "./ThisMonthCalendar";
import MajorUpcomingEvents from "./MajorUpcomingEvents";
import WeeklyOutlook from "./WeeklyOutlook";
import WhyEventsMatter from "./WhyEventsMatter";

export default function EconomicCalendarWorkspace({ events }: { events: EconomicEvent[] }) {
  // Computed once per mount, not per render tick — a calendar page doesn't
  // need to re-evaluate "today" on every re-render, and freezing it avoids
  // the day silently flipping under the user mid-session right at midnight.
  const [today] = useState(() => new Date());
  const [filters, setFilters] = useState<EventFilterState>(DEFAULT_FILTER_STATE);
  const [searchQuery, setSearchQuery] = useState("");

  const kpis = useMemo(() => getCalendarKpis(events, today), [events, today]);
  const majorEvents = useMemo(() => getMajorUpcomingEvents(events, today), [events, today]);
  const outlook = useMemo(() => generateWeeklyOutlook(events, today), [events, today]);

  const todayEvents = useMemo(
    () => searchEvents(filterByCategoryAndImportance(getTodayEvents(events, today), filters), searchQuery),
    [events, today, filters, searchQuery],
  );
  const weekEvents = useMemo(
    () => searchEvents(filterByCategoryAndImportance(getThisWeekEvents(events, today), filters), searchQuery),
    [events, today, filters, searchQuery],
  );
  const monthEvents = useMemo(
    () => searchEvents(filterByCategoryAndImportance(getThisMonthEvents(events, today), filters), searchQuery),
    [events, today, filters, searchQuery],
  );

  return (
    <div className="flex flex-col gap-6">
      <EconomicCalendarHero kpis={kpis} />

      <EventFilters filters={filters} onChange={setFilters} searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      {isSectionVisible("Today", filters.dateRange) && (
        <ViewportFadeIn>
          <TodaysEvents events={todayEvents} />
        </ViewportFadeIn>
      )}

      {isSectionVisible("This Week", filters.dateRange) && (
        <ViewportFadeIn delay={0.05}>
          <ThisWeekEvents events={weekEvents} />
        </ViewportFadeIn>
      )}

      {isSectionVisible("This Month", filters.dateRange) && (
        <ViewportFadeIn delay={0.1}>
          <ThisMonthCalendar today={today} monthEvents={monthEvents} />
        </ViewportFadeIn>
      )}

      <ViewportFadeIn delay={0.1}>
        <MajorUpcomingEvents events={majorEvents} today={today} />
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
