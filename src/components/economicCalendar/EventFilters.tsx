"use client";

import Dropdown from "@/components/Dropdown";
import { EVENT_CATEGORY_LIST, IMPORTANCE_LEVEL_LIST } from "@/lib/economicCalendar/economicCalendarRegistry";
import type { EventFilterState } from "@/lib/economicCalendar/economicCalendarData";
import type { EventCategory, ImportanceLevel } from "@/lib/economicCalendar/economicCalendarTypes";

interface Props {
  filters: EventFilterState;
  onChange: (filters: EventFilterState) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const CATEGORY_OPTIONS = [{ value: "All", label: "All Categories" }, ...EVENT_CATEGORY_LIST.map((c) => ({ value: c, label: c }))];
const IMPORTANCE_OPTIONS = [{ value: "All", label: "All Importance" }, ...IMPORTANCE_LEVEL_LIST.map((i) => ({ value: i, label: `${i} Impact` }))];
const DATE_RANGE_OPTIONS = [
  { value: "All", label: "All Upcoming" },
  { value: "Today", label: "Today" },
  { value: "This Week", label: "This Week" },
  { value: "This Month", label: "This Month" },
];

export default function EventFilters({ filters, onChange, searchQuery, onSearchChange }: Props) {
  return (
    <section className="glass-card flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="relative flex-1 sm:max-w-xs">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30 light:text-slate-400"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <circle cx="7" cy="7" r="5" />
          <path d="M11 11l3.5 3.5" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search events or categories..."
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] py-2 pl-8 pr-3 text-xs text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-neon-blue/40"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Dropdown
          label="Category"
          value={filters.category}
          onChange={(value) => onChange({ ...filters, category: value as EventCategory | "All" })}
          options={CATEGORY_OPTIONS}
        />
        <Dropdown
          label="Importance"
          value={filters.importance}
          onChange={(value) => onChange({ ...filters, importance: value as ImportanceLevel | "All" })}
          options={IMPORTANCE_OPTIONS}
        />
        <Dropdown
          label="Date Range"
          value={filters.dateRange}
          onChange={(value) => onChange({ ...filters, dateRange: value as EventFilterState["dateRange"] })}
          options={DATE_RANGE_OPTIONS}
        />
      </div>
    </section>
  );
}
