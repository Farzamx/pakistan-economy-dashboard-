import { unstable_cache } from "next/cache";
import { createPublicDataClient } from "@/lib/supabase/publicDataClient";
import type { EconomicEvent, EventCategory, ImportanceLevel } from "./economicCalendarTypes";
import { getMarketImpactScore } from "./marketImpactScore";
import { isWithinRetention } from "./retentionConfig";

// Data-access layer for the Economic Calendar. Supabase is the single
// source of truth for every display surface — the hub page
// (/economic-calendar), the homepage's KPI freshness cross-reference, Event
// Detail pages, the Historical Archive, and the .ics feed all read through
// this file (the hub/homepage via toEconomicEvent() below). This was NOT
// always true: until the Economic Calendar integrity audit (migration
// 0012), the hub page and homepage read src/data/economicCalendarEvents.ts
// directly, a static mock array that could silently drift from Supabase the
// moment either side was corrected independently — exactly the kind of
// inconsistency that audit was meant to eliminate. That file is now legacy
// (kept only as the historical input to the now-unused seed regenerator
// script) and is never imported by any rendering code.
//
// Every query is wrapped in unstable_cache (5 min) rather than left
// uncached — this is public, identical-for-everyone reference data with no
// per-user variation, the same shape of caching every other indicator
// fetch on this dashboard already uses.

const REVALIDATE_SECONDS = 300;

export type EventStatus = "scheduled" | "released" | "postponed" | "cancelled";
export type DataConfidence = "confirmed" | "estimated";
/** Four-way date/time certainty classification (Economic Calendar integrity audit, migration 0012) — distinct from DataConfidence, which tracks actual-VALUE certainty, not date/time certainty. */
export type DateTimeClassification = "confirmed" | "official_date_only" | "estimated" | "manual";

export interface EventSeriesRecord {
  id: string;
  slug: string;
  title: string;
  category: EventCategory;
  defaultImportance: ImportanceLevel;
  cadence: string;
  sourceName: string;
  sourceUrl: string | null;
  automationTier: string;
  reliabilityScore: number;
  description: string | null;
  /** Carried over from the pre-Rolling-Calendar "Major Upcoming Events" section, which the Rolling Calendar refactor retired (Current Week/Remaining This Month replaced it). Not read by any component today — left in place rather than dropped mid-refactor; safe to remove in a future cleanup if it stays unused. */
  isHeadline: boolean;
}

export interface EventRecord {
  id: string;
  slug: string;
  title: string;
  eventDate: string;
  eventTime: string | null;
  previousValue: string | null;
  forecastValue: string | null;
  actualValue: string | null;
  status: EventStatus;
  importance: ImportanceLevel;
  description: string | null;
  sourceUrl: string | null;
  dataConfidence: DataConfidence;
  dateTimeClassification: DateTimeClassification;
  updatedAt: string;
  series: EventSeriesRecord;
}

interface SeriesRow {
  id: string;
  slug: string;
  title: string;
  category: string;
  default_importance: string;
  cadence: string;
  source_name: string;
  source_url: string | null;
  automation_tier: string;
  reliability_score: number;
  description: string | null;
  is_headline: boolean;
}

interface EventRow {
  id: string;
  slug: string;
  title: string;
  event_date: string;
  event_time: string | null;
  previous_value: string | null;
  forecast_value: string | null;
  actual_value: string | null;
  status: string;
  importance: string;
  description: string | null;
  source_url: string | null;
  data_confidence: string;
  date_time_classification: string;
  updated_at: string;
  economic_event_series: SeriesRow | SeriesRow[];
}

const EVENT_SELECT = "id, slug, title, event_date, event_time, previous_value, forecast_value, actual_value, status, importance, description, source_url, data_confidence, date_time_classification, updated_at, economic_event_series(*)";
// Same column list but with the series embed forced to an inner join — used
// only by queries that also .eq()/.neq() a column on economic_event_series
// itself (PostgREST requires !inner for that), and used INSTEAD OF
// EVENT_SELECT in those queries, never alongside it: selecting
// economic_event_series(*) and economic_event_series!inner(...) in the same
// query both target the same relationship and Postgres rejects it
// ("table name ... specified more than once") — caught live while
// verifying "Related Calendar Events"/"Related Events" against the
// just-seeded database.
const EVENT_SELECT_INNER_SERIES = "id, slug, title, event_date, event_time, previous_value, forecast_value, actual_value, status, importance, description, source_url, data_confidence, date_time_classification, updated_at, economic_event_series!inner(*)";

function mapSeries(row: SeriesRow): EventSeriesRecord {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category as EventCategory,
    defaultImportance: row.default_importance as ImportanceLevel,
    cadence: row.cadence,
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    automationTier: row.automation_tier,
    reliabilityScore: row.reliability_score,
    description: row.description,
    isHeadline: row.is_headline,
  };
}

function mapEvent(row: EventRow): EventRecord | null {
  const seriesRow = Array.isArray(row.economic_event_series) ? row.economic_event_series[0] : row.economic_event_series;
  if (!seriesRow) return null;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    eventDate: row.event_date,
    eventTime: row.event_time,
    previousValue: row.previous_value,
    forecastValue: row.forecast_value,
    actualValue: row.actual_value,
    status: row.status as EventStatus,
    importance: row.importance as ImportanceLevel,
    description: row.description,
    sourceUrl: row.source_url,
    dataConfidence: row.data_confidence as DataConfidence,
    dateTimeClassification: row.date_time_classification as DateTimeClassification,
    updatedAt: row.updated_at,
    series: mapSeries(seriesRow),
  };
}

/** Adapts a repo EventRecord to the EconomicEvent shape economicCalendarData.ts's query/filter utilities operate on — the one place that bridges Supabase's column names to the app's internal calendar type, now that Supabase (not the static mock array) is the single source of truth for every display surface. */
export function toEconomicEvent(record: EventRecord): EconomicEvent {
  return {
    id: record.slug,
    title: record.title,
    category: record.series.category,
    importance: record.importance,
    date: record.eventDate,
    time: record.eventTime ?? "00:00",
    previous: record.previousValue,
    forecast: record.forecastValue,
    description: record.description ?? "",
    actual: record.actualValue,
    status: record.status,
    isHeadline: record.series.isHeadline,
  };
}

/** Every event whose canonical home is /economic-calendar/event/[slug] — still upcoming. */
export const getScheduledEventSlugs = unstable_cache(
  async (): Promise<string[]> => {
    const supabase = createPublicDataClient();
    const { data, error } = await supabase.from("economic_events").select("slug").eq("status", "scheduled");
    if (error || !data) return [];
    return data.map((r) => r.slug);
  },
  ["economic-calendar-scheduled-slugs"],
  { revalidate: REVALIDATE_SECONDS },
);

/** Every event whose canonical home is /economic-calendar/archive/[slug] — released, postponed, or cancelled (i.e. no longer "upcoming"). */
export const getReleasedEventSlugs = unstable_cache(
  async (): Promise<string[]> => {
    const supabase = createPublicDataClient();
    const { data, error } = await supabase.from("economic_events").select("slug").neq("status", "scheduled");
    if (error || !data) return [];
    return data.map((r) => r.slug);
  },
  ["economic-calendar-released-slugs"],
  { revalidate: REVALIDATE_SECONDS },
);

export const getEventBySlug = unstable_cache(
  async (slug: string): Promise<EventRecord | null> => {
    const supabase = createPublicDataClient();
    const { data, error } = await supabase.from("economic_events").select(EVENT_SELECT).eq("slug", slug).maybeSingle();
    if (error || !data) return null;
    return mapEvent(data as unknown as EventRow);
  },
  ["economic-calendar-event-by-slug"],
  { revalidate: REVALIDATE_SECONDS },
);

/**
 * All upcoming (still-scheduled) events, soonest first — powers feed.ics,
 * "Related Events", and the Next Major Events panel.
 *
 * Excludes the `_verify_test_sync` fixture series (migration 0027) — its two
 * permanent test events sit on 1970-01-01/02 so verification scripts never
 * collide with real calendar dates, but that also makes them the
 * chronologically-earliest "scheduled" rows, so an unfiltered ascending sort
 * surfaced "[TEST ONLY] Sync Verification Event A" as the next release.
 */
export const getAllScheduledEvents = unstable_cache(
  async (): Promise<EventRecord[]> => {
    const supabase = createPublicDataClient();
    const { data, error } = await supabase
      .from("economic_events")
      .select(EVENT_SELECT_INNER_SERIES)
      .eq("status", "scheduled")
      .neq("economic_event_series.slug", "_verify_test_sync")
      .order("event_date", { ascending: true });
    if (error || !data) return [];
    return (data as unknown as EventRow[]).map(mapEvent).filter((e): e is EventRecord => e !== null);
  },
  ["economic-calendar-all-scheduled"],
  { revalidate: REVALIDATE_SECONDS },
);

/**
 * "Next Major Market-Moving Events" panel — scheduled events sorted by
 * Market Impact Score (highest first), then soonest date within the same
 * score. Reuses getAllScheduledEvents's own cached result rather than
 * issuing a second query.
 */
export async function getNextMajorEvents(limit = 6): Promise<EventRecord[]> {
  const events = await getAllScheduledEvents();
  return [...events]
    .sort((a, b) => {
      const scoreDiff = getMarketImpactScore(b.series.slug, b.importance) - getMarketImpactScore(a.series.slug, a.importance);
      return scoreDiff !== 0 ? scoreDiff : a.eventDate.localeCompare(b.eventDate);
    })
    .slice(0, limit);
}

/**
 * "Recent Releases" section — released events still within the
 * EVENT_RETENTION_DAYS window, sorted the same way as Next Major Events
 * (Impact Score, then most-recently-released first). Postponed/cancelled
 * events are deliberately excluded — there's no "Actual vs Forecast" to
 * review for those, which is the whole point of this section.
 */
export async function getRecentReleases(limit = 6): Promise<EventRecord[]> {
  const events = await getHistoricalEvents();
  const today = new Date();
  return events
    .filter((e) => e.status === "released" && isWithinRetention(e.eventDate, today))
    .sort((a, b) => {
      const scoreDiff = getMarketImpactScore(b.series.slug, b.importance) - getMarketImpactScore(a.series.slug, a.importance);
      return scoreDiff !== 0 ? scoreDiff : b.eventDate.localeCompare(a.eventDate);
    })
    .slice(0, limit);
}

/** Released, postponed, and cancelled events, most recent first — powers the Archive list (its "Released only" filter narrows this client-side). */
export const getHistoricalEvents = unstable_cache(
  async (): Promise<EventRecord[]> => {
    const supabase = createPublicDataClient();
    const { data, error } = await supabase.from("economic_events").select(EVENT_SELECT).neq("status", "scheduled").order("event_date", { ascending: false });
    if (error || !data) return [];
    return (data as unknown as EventRow[]).map(mapEvent).filter((e): e is EventRecord => e !== null);
  },
  ["economic-calendar-historical"],
  { revalidate: REVALIDATE_SECONDS },
);

/** Same series (e.g. other CPI releases), excluding the current event — "Related Calendar Events". */
export const getEventsBySeriesSlug = unstable_cache(
  async (seriesSlug: string, excludeEventId: string): Promise<EventRecord[]> => {
    const supabase = createPublicDataClient();
    const { data, error } = await supabase
      .from("economic_events")
      .select(EVENT_SELECT_INNER_SERIES)
      .eq("economic_event_series.slug", seriesSlug)
      .neq("id", excludeEventId)
      .order("event_date", { ascending: false })
      .limit(6);
    if (error || !data) return [];
    return (data as unknown as EventRow[]).map(mapEvent).filter((e): e is EventRecord => e !== null);
  },
  ["economic-calendar-events-by-series"],
  { revalidate: REVALIDATE_SECONDS },
);

/** Other series in the same category (e.g. a CPI event -> SPI, Food Inflation) — "Related Events". */
export const getEventsByCategory = unstable_cache(
  async (category: EventCategory, excludeSeriesSlug: string): Promise<EventRecord[]> => {
    const supabase = createPublicDataClient();
    const { data, error } = await supabase
      .from("economic_events")
      .select(EVENT_SELECT_INNER_SERIES)
      .eq("economic_event_series.category", category)
      .neq("economic_event_series.slug", excludeSeriesSlug)
      .eq("status", "scheduled")
      .order("event_date", { ascending: true })
      .limit(6);
    if (error || !data) return [];
    const seen = new Set<string>();
    const result: EventRecord[] = [];
    for (const row of data as unknown as EventRow[]) {
      const mapped = mapEvent(row);
      if (!mapped || seen.has(mapped.series.slug)) continue;
      seen.add(mapped.series.slug);
      result.push(mapped);
    }
    return result;
  },
  ["economic-calendar-events-by-category"],
  { revalidate: REVALIDATE_SECONDS },
);
