// Release calendar view-model for the Overview. Pure functions, no I/O.
//
// Takes the scheduled events the page already fetched and (1) merges events that are one publication (exports, imports and the trade balance come out
// together; so do CPI and core inflation), (2) groups them into Today / This week / Coming up, using the Pakistan date the caller passes in.

import type { ImportanceLevel } from "@/lib/economicCalendar/economicCalendarTypes";
import { endOfWeek, extractMonthYear, formatShortDay } from "./overviewFormat";

/** The fields of a scheduled event this module reads. */
export interface ReleaseEventInput {
  eventDate: string;
  title: string;
  importance: ImportanceLevel;
  series: { slug: string; title: string };
}

export interface ReleaseRow {
  key: string;
  /** "YYYY-MM-DD" */
  date: string;
  title: string;
  subtitle: string;
  importance: ImportanceLevel;
  /** Short name for the "Due today" pill, e.g. "Foreign trade (Oct)". */
  pillLabel: string;
  /** Series slugs this row covers (several for a merged release). */
  seriesSlugs: string[];
}

export interface ReleaseGroups {
  today: ReleaseRow[];
  thisWeek: ReleaseRow[];
  comingUp: ReleaseRow[];
}

interface Bundle {
  id: string;
  slugs: string[];
  title: string;
  components: string;
  short: string;
}

/** Releases published together by one agency on one day. */
const BUNDLES: Bundle[] = [
  { id: "foreign-trade", slugs: ["trade-balance", "exports-release", "imports-release"], title: "Foreign trade statistics", components: "Exports, imports, trade balance", short: "Foreign trade" },
  { id: "cpi", slugs: ["cpi-inflation-release", "core-inflation-release"], title: "CPI and core inflation", components: "", short: "CPI" },
];

/** Reader-facing names for single releases; anything else uses the series' own title. */
const SINGLE: Record<string, { title: string; components: string; short: string }> = {
  "large-scale-manufacturing-lsm-growth": { title: "Large Scale Manufacturing", components: "LSM growth", short: "LSM" },
  "spi-weekly-inflation-release": { title: "Weekly SPI", components: "Sensitive Price Indicator", short: "Weekly SPI" },
  "worker-remittances": { title: "Worker remittances", components: "", short: "Remittances" },
  "current-account-balance": { title: "Current account balance", components: "", short: "Current account" },
  "sbp-foreign-exchange-reserves": { title: "SBP foreign exchange reserves", components: "", short: "FX reserves" },
  "sbp-monetary-policy-committee-meeting": { title: "Monetary Policy Committee meeting", components: "SBP policy rate decision", short: "MPC meeting" },
};

const IMPORTANCE_RANK: Record<string, number> = { High: 3, Medium: 2, Low: 1 };

function highest(levels: ImportanceLevel[]): ImportanceLevel {
  return levels.reduce((best, l) => ((IMPORTANCE_RANK[l] ?? 0) > (IMPORTANCE_RANK[best] ?? 0) ? l : best), levels[0]);
}

function joinParts(...parts: (string | null | undefined)[]): string {
  return parts.filter((p): p is string => Boolean(p)).join(" · ");
}

/**
 * One row per publication, dated today or later, soonest first. `withDate` puts the day in the subtitle (used outside the Today group).
 */
export function buildReleaseRows(events: readonly ReleaseEventInput[], todayIso: string): ReleaseRow[] {
  const upcoming = events.filter((e) => /^\d{4}-\d{2}-\d{2}$/.test(e.eventDate) && e.eventDate >= todayIso);
  const rows: ReleaseRow[] = [];
  const used = new Set<ReleaseEventInput>();

  for (const event of upcoming) {
    if (used.has(event)) continue;
    const bundle = BUNDLES.find((b) => b.slugs.includes(event.series.slug));
    const members = bundle ? upcoming.filter((e) => e.eventDate === event.eventDate && bundle.slugs.includes(e.series.slug)) : [event];
    members.forEach((m) => used.add(m));

    const period = members.map((m) => extractMonthYear(m.title)).find((p) => p !== null) ?? null;
    const merged = bundle !== undefined && members.length > 1;
    const single = SINGLE[event.series.slug];
    const title = merged ? bundle.title : (single?.title ?? stripPeriod(event.series.title || event.title));
    const components = merged ? bundle.components : (single?.components ?? "");
    const short = merged ? bundle.short : (single?.short ?? title);

    rows.push({
      key: `${event.eventDate}:${merged ? bundle.id : event.series.slug}`,
      date: event.eventDate,
      title,
      subtitle: joinParts(components, period?.long),
      importance: highest(members.map((m) => m.importance)),
      pillLabel: period ? `${short} (${period.short})` : short,
      seriesSlugs: members.map((m) => m.series.slug),
    });
  }

  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

function stripPeriod(title: string): string {
  return title.replace(/\s*[—–-]\s*[A-Z][a-z]+ \d{4}\s*$/, "").trim();
}

/** Today / This week (through Sunday) / Coming up, capped so the card stays a summary. */
export function groupReleaseRows(rows: readonly ReleaseRow[], todayIso: string, limits = { thisWeek: 3, comingUp: 3 }): ReleaseGroups {
  const weekEnd = endOfWeek(todayIso);
  const withDay = (r: ReleaseRow): ReleaseRow => ({ ...r, subtitle: joinParts(formatShortDay(r.date), r.subtitle) });
  return {
    today: rows.filter((r) => r.date === todayIso),
    thisWeek: rows.filter((r) => r.date > todayIso && r.date <= weekEnd).slice(0, limits.thisWeek).map(withDay),
    comingUp: rows.filter((r) => r.date > weekEnd).slice(0, limits.comingUp).map(withDay),
  };
}

/** The earliest scheduled date (today or later) per series slug. */
export function nextReleaseBySeries(events: readonly ReleaseEventInput[], todayIso: string): Map<string, string> {
  const next = new Map<string, string>();
  for (const e of events) {
    if (e.eventDate < todayIso) continue;
    const current = next.get(e.series.slug);
    if (!current || e.eventDate < current) next.set(e.series.slug, e.eventDate);
  }
  return next;
}
