// Shared types for the Economic Calendar feature. This shape is populated
// from Supabase via economicEventsRepo.ts's toEconomicEvent() adapter for
// every rendering surface — kept generic enough that the original Phase 1
// mock array (src/data/economicCalendarEvents.ts, now legacy/unused) could
// satisfy it too, so the switchover required no changes to this file.
//
// This is a Pakistan-only calendar (no FOMC/OPEC/ECB/etc.) and "Global
// Events" is scoped to Pakistan-relevant international events specifically
// (IMF program reviews), not generic international calendars.

export type EventCategory =
  | "Inflation"
  | "Monetary Policy"
  | "External Sector"
  | "Fiscal Sector"
  | "Real Economy"
  | "Financial Markets"
  | "Global Events";

/** Renamed in user-facing copy to "{level} Market Impact" (EventImportanceBadge) — the underlying type/column name stays `importance`/`ImportanceLevel` to avoid an unnecessary DB+seed rename. */
export type ImportanceLevel = "High" | "Medium" | "Low";

export type EventStatus = "scheduled" | "released" | "postponed" | "cancelled";

export interface EconomicEvent {
  id: string;
  title: string;
  category: EventCategory;
  importance: ImportanceLevel;
  /** ISO date, "YYYY-MM-DD". */
  date: string;
  /** 24h "HH:mm", Pakistan Standard Time. */
  time: string;
  previous: string | null;
  forecast: string | null;
  /** 1-2 sentence plain-English explanation of what this specific release is. */
  description: string;
  /** Marks this as the canonical event for its type in the Major Upcoming Events section (Section 5) — set on exactly one mock entry per headline type. */
  isHeadline?: boolean;
  /** Set only on past releases (Phase 2A's Historical Archive seed) — its presence is what the seed generator uses to mark a row "released" with an actual value, instead of "scheduled". */
  actual?: string | null;
  /** Defaults to "released" when `actual` is set, "scheduled" otherwise (see economicCalendarData.ts's resolveStatus) — only set explicitly here for postponed/cancelled mock entries. */
  status?: EventStatus;
  /**
   * True when the scheduled `date` itself is sourced from an official
   * advance calendar (e.g. SBP's published FY27 MPC schedule), as opposed
   * to a projected/typical-pattern estimate — distinct from whether the
   * event's *outcome* (`actual`) is known yet. Without this, the seed
   * generator's data_confidence column conflates the two: a still-upcoming
   * but officially-dated event would otherwise read as "estimated" right
   * alongside a genuinely-guessed date, which understates how reliable the
   * date itself is on an investor-facing calendar.
   */
  dateConfirmed?: boolean;
}
