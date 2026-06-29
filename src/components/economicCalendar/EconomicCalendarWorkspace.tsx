"use client";

import { useMemo, useState } from "react";
import type { EconomicEvent } from "@/lib/economicCalendar/economicCalendarTypes";
import type { EventRecord } from "@/lib/economicCalendar/economicEventsRepo";
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
import ViewportFadeIn from "@/components/ViewportFadeIn";
import EconomicCalendarHero from "./EconomicCalendarHero";
import RecentReleases from "./RecentReleases";
import EventFilters from "./EventFilters";
import ThisWeekEvents from "./ThisWeekEvents";
import RemainingThisMonthEvents from "./RemainingThisMonthEvents";
import NextMajorEvents from "./NextMajorEvents";
import CalendarStatistics from "./CalendarStatistics";
import MarketImpactRanking from "./MarketImpactRanking";
import WeeklyOutlook from "./WeeklyOutlook";
import WhyEventsMatter from "./WhyEventsMatter";

// Information hierarchy (investor-grade calendar UX, matching Forex
// Factory/Investing.com conventions): latest releases first, upcoming
// releases second, summary statistics afterwards, educational content near
// the bottom. Hero -> Recent Releases -> filters/Current Week/Remaining
// This Month/Next Major Events -> Calendar Statistics -> Top
// Market-Moving Events (educational, not time-sensitive) -> Weekly
// Outlook/Why Events Matter. The Archive link and FAQ live on the page
// itself (see economic-calendar/page.tsx), positioned as the very last
// thing on the page.
export default function EconomicCalendarWorkspace({
  events,
  recentReleases,
  nextMajorEvents,
}: {
  events: EconomicEvent[];
  recentReleases: EventRecord[];
  nextMajorEvents: EventRecord[];
}) {
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
      <EconomicCalendarHero />

      {recentReleases.length > 0 && (
        <ViewportFadeIn>
          <RecentReleases events={recentReleases} />
        </ViewportFadeIn>
      )}

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

      {nextMajorEvents.length > 0 && (
        <ViewportFadeIn>
          <NextMajorEvents events={nextMajorEvents} />
        </ViewportFadeIn>
      )}

      <ViewportFadeIn>
        <CalendarStatistics kpis={kpis} />
      </ViewportFadeIn>

      <ViewportFadeIn>
        <MarketImpactRanking />
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
