import type { EconomicEvent, EventCategory, ImportanceLevel } from "./economicCalendarTypes";

function toDateOnly(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function parseEventDate(event: EconomicEvent): Date {
  const [y, m, d] = event.date.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function daysBetween(a: Date, b: Date): number {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.round((toDateOnly(b).getTime() - toDateOnly(a).getTime()) / MS_PER_DAY);
}

/** "Mon, Jun 29" style — used wherever an event's date is displayed. */
export function formatEventDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

/** "Today" / "Tomorrow" / "In 5 days" / a formatted date once far enough out. */
export function formatRelativeDay(dateStr: string, today: Date): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const diff = daysBetween(today, new Date(y, m - 1, d));
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff > 1 && diff <= 13) return `In ${diff} days`;
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** "2:00 PM" from a 24h "HH:mm" string. */
export function formatEventTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period} PKT`;
}

export function sortByDateAsc(events: EconomicEvent[]): EconomicEvent[] {
  return [...events].sort((a, b) => (a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date)));
}

/** All events on the same calendar day as `today`. */
export function getTodayEvents(events: EconomicEvent[], today: Date): EconomicEvent[] {
  return sortByDateAsc(events.filter((e) => daysBetween(today, parseEventDate(e)) === 0));
}

/** Events from today through the next 6 days (a 7-day window), inclusive. */
export function getThisWeekEvents(events: EconomicEvent[], today: Date): EconomicEvent[] {
  return sortByDateAsc(
    events.filter((e) => {
      const diff = daysBetween(today, parseEventDate(e));
      return diff >= 0 && diff <= 6;
    }),
  );
}

/** Events within the current calendar month (today's month/year). */
export function getThisMonthEvents(events: EconomicEvent[], today: Date): EconomicEvent[] {
  return sortByDateAsc(
    events.filter((e) => {
      const d = parseEventDate(e);
      return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();
    }),
  );
}

/** Every event from today onward, soonest first. */
export function getUpcomingEvents(events: EconomicEvent[], today: Date): EconomicEvent[] {
  return sortByDateAsc(events.filter((e) => daysBetween(today, parseEventDate(e)) >= 0));
}

export function getHighImpactUpcomingEvents(events: EconomicEvent[], today: Date): EconomicEvent[] {
  return getUpcomingEvents(events, today).filter((e) => e.importance === "High");
}

/**
 * One representative card per headline event type (Section 5) — the
 * soonest upcoming event flagged `isHeadline` for each distinct title.
 * Several titles recur (e.g. "SBP Monetary Policy Committee Meeting" has
 * multiple future mock dates); this picks the nearest occurrence of each so
 * the section reads as "what's next for each major release," not a flat
 * list of every future instance.
 */
export function getMajorUpcomingEvents(events: EconomicEvent[], today: Date): EconomicEvent[] {
  const upcoming = getUpcomingEvents(events, today).filter((e) => e.isHeadline);
  const seen = new Set<string>();
  const result: EconomicEvent[] = [];
  for (const event of upcoming) {
    if (seen.has(event.title)) continue;
    seen.add(event.title);
    result.push(event);
  }
  return result;
}

export interface CalendarKpis {
  upcomingCount: number;
  highImpactCount: number;
  thisWeekCount: number;
  thisMonthCount: number;
}

export function getCalendarKpis(events: EconomicEvent[], today: Date): CalendarKpis {
  return {
    upcomingCount: getUpcomingEvents(events, today).length,
    highImpactCount: getHighImpactUpcomingEvents(events, today).length,
    thisWeekCount: getThisWeekEvents(events, today).length,
    thisMonthCount: getThisMonthEvents(events, today).length,
  };
}

export interface EventFilterState {
  category: EventCategory | "All";
  importance: ImportanceLevel | "All";
  /** Date-range preset, applied on top of whatever base list (today/week/month) a section is already showing. */
  dateRange: "All" | "Today" | "This Week" | "This Month";
}

export const DEFAULT_FILTER_STATE: EventFilterState = { category: "All", importance: "All", dateRange: "All" };

/** Category + importance only — deliberately NOT dateRange, which instead controls section visibility (see economicCalendarWorkspace) so Today/This Week/This Month keep their own fixed scope rather than fighting over which date constraint wins. */
export function filterByCategoryAndImportance(events: EconomicEvent[], filters: EventFilterState): EconomicEvent[] {
  let result = events;
  if (filters.category !== "All") result = result.filter((e) => e.category === filters.category);
  if (filters.importance !== "All") result = result.filter((e) => e.importance === filters.importance);
  return result;
}

export function isSectionVisible(section: "Today" | "This Week" | "This Month", dateRange: EventFilterState["dateRange"]): boolean {
  return dateRange === "All" || dateRange === section;
}

export function searchEvents(events: EconomicEvent[], query: string): EconomicEvent[] {
  const q = query.trim().toLowerCase();
  if (!q) return events;
  return events.filter((e) => e.title.toLowerCase().includes(q) || e.category.toLowerCase().includes(q));
}

/**
 * Computed, not hand-written — reads the actual upcoming week's events and
 * names the highest-importance ones by category so the summary never
 * drifts out of sync with the mock data it describes.
 */
export function generateWeeklyOutlook(events: EconomicEvent[], today: Date): string {
  const week = getThisWeekEvents(events, today);
  const high = week.filter((e) => e.importance === "High");
  if (high.length === 0) {
    return "No high-impact releases are scheduled in the next 7 days — a comparatively quiet week, with only routine weekly and monthly updates on the calendar.";
  }

  const categories = Array.from(new Set(high.map((e) => e.category)));
  const monetaryPolicy = high.find((e) => e.category === "Monetary Policy");
  const inflation = high.find((e) => e.category === "Inflation");
  const external = high.filter((e) => e.category === "External Sector");

  const parts: string[] = [];
  if (inflation && monetaryPolicy) {
    parts.push(`This week investors will focus on ${inflation.title} and the upcoming ${monetaryPolicy.title}.`);
  } else if (inflation) {
    parts.push(`This week's focus is ${inflation.title}, the clearest read yet on where prices are heading.`);
  } else if (monetaryPolicy) {
    parts.push(`All eyes are on the ${monetaryPolicy.title}, the week's single most market-moving event.`);
  } else {
    parts.push(`This week's highest-impact release${high.length > 1 ? "s are" : " is"} ${high.map((e) => e.title).join(" and ")}.`);
  }

  if (external.length > 0) {
    const names = external.map((e) => e.title.replace(/\s*\(.*\)/, "")).join(" and ");
    parts.push(`External sector releases including ${names} may influence market sentiment.`);
  } else if (categories.length > 1) {
    parts.push(`Releases across ${categories.filter((c) => c !== inflation?.category && c !== monetaryPolicy?.category).join(" and ") || categories.join(" and ")} round out the week.`);
  }

  return parts.join(" ");
}
