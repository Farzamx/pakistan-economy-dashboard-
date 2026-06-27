// Shared types for the Economic Calendar feature. Phase 1 is mock-data only
// (see src/data/economicCalendarEvents.ts) — this shape is deliberately
// generic enough that Phase 2 (a real event feed) can populate the same
// EconomicEvent[] without any consuming component needing to change.
//
// Phase 2B: this is now a Pakistan-only calendar (no FOMC/OPEC/ECB/etc — see
// economicCalendarEvents.ts's removal note) and "Global Events" is scoped
// to Pakistan-relevant international events specifically (IMF program
// reviews), not generic international calendars.

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
}
