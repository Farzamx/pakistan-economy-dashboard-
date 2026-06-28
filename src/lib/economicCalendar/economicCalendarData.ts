import type { EconomicEvent, EventCategory, ImportanceLevel, EventStatus } from "./economicCalendarTypes";

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

/** Whole days from `today` until `dateStr` ("YYYY-MM-DD") — negative if `dateStr` is in the past. Powers the "Days Remaining" field on upcoming-event cards. */
export function daysUntil(dateStr: string, today: Date): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return daysBetween(today, new Date(y, m - 1, d));
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

/** Explicit `status` wins (postponed/cancelled mock entries); otherwise derived from whether `actual` is set — the same rule the seed generator uses when writing to Supabase, kept here so the mock-data-driven hub matches it exactly. */
export function resolveStatus(event: EconomicEvent): EventStatus {
  if (event.status) return event.status;
  return event.actual ? "released" : "scheduled";
}

export function sortByDateAsc(events: EconomicEvent[]): EconomicEvent[] {
  return [...events].sort((a, b) => (a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date)));
}

/**
 * The most recent event on/before `today` whose title starts with
 * `titlePrefix` — used to feed dataFreshness.ts's Economic-Calendar-aware
 * freshness override for live KPIs that track the exact same release as a
 * recurring Economic Calendar series (e.g. SBP MPC decisions, T-Bill/PIB
 * auctions). Deliberately title-prefix matching, not an exact id/slug
 * lookup, so it keeps working as new dated instances are added to
 * economicCalendarEvents.ts. Returns null if no matching past event exists.
 */
export function getMostRecentEvent(events: EconomicEvent[], titlePrefix: string, today: Date): EconomicEvent | null {
  const past = events.filter((e) => e.title.startsWith(titlePrefix) && daysBetween(today, parseEventDate(e)) <= 0);
  if (past.length === 0) return null;
  return sortByDateAsc(past)[past.length - 1];
}

/**
 * Whether a live KPI's current value already matches a known event's
 * outcome — e.g. an SBP "hold" decision correctly produces no new
 * SBP EasyData observation, since the rate didn't change, so the existing
 * `latestDate` can be much older than the meeting date without the figure
 * actually being wrong. Plain `parseFloat` is enough here since it stops at
 * the first non-numeric character, so "11.5% (held)" and "11.50" both
 * resolve to comparable numbers.
 */
export function valueMatchesEventOutcome(kpiValue: string, eventActual: string | null | undefined): boolean {
  if (!eventActual) return false;
  const kpiNum = parseFloat(kpiValue);
  const eventNum = parseFloat(eventActual);
  if (Number.isNaN(kpiNum) || Number.isNaN(eventNum)) return false;
  return Math.abs(kpiNum - eventNum) < 0.01;
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
 * Strips a trailing "(...)" parenthetical — e.g. "CPI Inflation Release
 * (July 2026)" -> "CPI Inflation Release" — so events whose title embeds a
 * per-instance period (month, fiscal year, quarter) are still recognized as
 * the same underlying series. Mirrors scripts/generateEconomicCalendarSeed.ts's
 * identical `baseTitle()`, which groups these same mock events into series
 * for the Supabase seed; kept here as the shared, single source of truth so
 * the two never drift into different grouping rules for the same data.
 */
export function baseEventTitle(title: string): string {
  return title.replace(/\s*\([^)]*\)\s*$/, "").trim();
}

/**
 * One representative card per headline event type (Section 5) — the
 * soonest upcoming instance of each series that's ever been marked
 * `isHeadline` anywhere in the dataset. `isHeadline` marks the SERIES as
 * headline-worthy, not a specific date — many series (CPI, GDP, Trade
 * Balance, ...) embed a per-instance period in the title itself ("CPI
 * Inflation Release (July 2026)" next becomes "...(August 2026)"), so a
 * design that required re-flagging isHeadline on every new month's
 * instance would silently go empty for that entire series the moment the
 * currently-flagged instance is released and nobody remembers to move the
 * flag forward — exactly the bug found auditing the MPC schedule, generalized
 * to every other recurring series with a dated title. Resolving "which
 * instance to show" dynamically (soonest upcoming, by baseEventTitle()) means
 * no per-instance flag maintenance is needed at all going forward.
 */
export function getMajorUpcomingEvents(events: EconomicEvent[], today: Date): EconomicEvent[] {
  const majorBaseTitles = new Set(events.filter((e) => e.isHeadline).map((e) => baseEventTitle(e.title)));
  const upcoming = getUpcomingEvents(events, today).filter((e) => majorBaseTitles.has(baseEventTitle(e.title)));
  const seen = new Set<string>();
  const result: EconomicEvent[] = [];
  for (const event of upcoming) {
    const key = baseEventTitle(event.title);
    if (seen.has(key)) continue;
    seen.add(key);
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
  /** Date-range preset, applied on top of whatever base list (today/week) a section is already showing. */
  dateRange: "All" | "Today" | "This Week";
}

export const DEFAULT_FILTER_STATE: EventFilterState = { category: "All", importance: "All", dateRange: "All" };

/** Category + importance only — deliberately NOT dateRange, which instead controls section visibility (see economicCalendarWorkspace) so Today/This Week keep their own fixed scope rather than fighting over which date constraint wins. */
export function filterByCategoryAndImportance(events: EconomicEvent[], filters: EventFilterState): EconomicEvent[] {
  let result = events;
  if (filters.category !== "All") result = result.filter((e) => e.category === filters.category);
  if (filters.importance !== "All") result = result.filter((e) => e.importance === filters.importance);
  return result;
}

export function isSectionVisible(section: "Today" | "This Week", dateRange: EventFilterState["dateRange"]): boolean {
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
    return "This week contains no High Market Impact releases — a comparatively quiet week for PSX, the Rupee, and bond yields, with only routine weekly and monthly updates on the calendar.";
  }

  const categories = Array.from(new Set(high.map((e) => e.category)));
  const monetaryPolicy = high.find((e) => e.category === "Monetary Policy");
  const inflation = high.find((e) => e.category === "Inflation");
  const external = high.filter((e) => e.category === "External Sector");
  const plural = high.length > 1;

  const parts: string[] = [`This week contains ${high.length} High Market Impact release${plural ? "s" : ""}${plural ? ":" : ":"} ${high.map((e) => e.title).join(", ")}.`];

  if (inflation && monetaryPolicy) {
    parts.push(`Investors will watch whether ${inflation.title} continues its recent trend, which could influence expectations heading into the ${monetaryPolicy.title}.`);
  } else if (inflation) {
    parts.push(`Investors will watch whether inflation continues its recent trend, which could influence expectations for future SBP policy decisions.`);
  } else if (monetaryPolicy) {
    parts.push(`All eyes are on the ${monetaryPolicy.title} — the policy rate decision is the week's single most reliably market-moving event for equities and bonds alike.`);
  }

  if (external.length > 0) {
    const names = external.map((e) => e.title.replace(/\s*\(.*\)/, "")).join(" and ");
    parts.push(`External sector releases including ${names} may influence Rupee and reserve sentiment.`);
  } else if (categories.length > 1) {
    parts.push(`Releases across ${categories.filter((c) => c !== inflation?.category && c !== monetaryPolicy?.category).join(" and ") || categories.join(" and ")} round out the week.`);
  }

  return parts.join(" ");
}
