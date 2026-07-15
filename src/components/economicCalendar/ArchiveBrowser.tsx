"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Dropdown from "@/components/Dropdown";
import EventCategoryBadge from "./EventCategoryBadge";
import EventImportanceBadge from "./EventImportanceBadge";
import EventStatusBadge from "./EventStatusBadge";
import { EVENT_CATEGORY_LIST } from "@/lib/economicCalendar/economicCalendarRegistry";
import { formatEventDate } from "@/lib/economicCalendar/economicCalendarData";
import { calculateSurprise, SURPRISE_LABELS, SURPRISE_BADGE_CLASS } from "@/lib/economicCalendar/surpriseAnalysis";
import type { EventRecord } from "@/lib/economicCalendar/economicEventsRepo";
import { useLanguage } from "@/components/LanguageProvider";

interface Props {
  events: EventRecord[];
}

function StatTile({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="panel-flat flex flex-col gap-1 p-4">
      <span className="text-xs font-medium text-white/50 light:text-slate-500">{label}</span>
      <span className="text-metric" style={{ color: accent }}>{value}</span>
    </div>
  );
}

export default function ArchiveBrowser({ events }: Props) {
  const { t } = useLanguage();
  const years = useMemo(() => Array.from(new Set(events.map((e) => e.eventDate.slice(0, 4)))).sort((a, b) => b.localeCompare(a)), [events]);
  const [category, setCategory] = useState<string>("All");
  const [year, setYear] = useState<string>("All");
  const [releasedOnly, setReleasedOnly] = useState(false);
  const [query, setQuery] = useState("");

  const stats = useMemo(
    () => ({
      total: events.length,
      released: events.filter((e) => e.status === "released").length,
      highImpact: events.filter((e) => e.importance === "High").length,
    }),
    [events],
  );

  const filtered = events.filter((e) => {
    if (category !== "All" && e.series.category !== category) return false;
    if (year !== "All" && !e.eventDate.startsWith(year)) return false;
    if (releasedOnly && e.status !== "released") return false;
    const q = query.trim().toLowerCase();
    if (q && !e.title.toLowerCase().includes(q) && !e.series.category.toLowerCase().includes(q)) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
        <StatTile label={t("calendar.totalEvents")} value={stats.total} accent="#38bdf8" />
        <StatTile label={t("calendar.releasedEvents")} value={stats.released} accent="#34d399" />
        <StatTile label={t("calendar.highImpactEvents")} value={stats.highImpact} accent="#fb7185" />
      </div>

      <div className="glass-card flex flex-col gap-3 rounded-2xl p-4 sm:p-5">
        <div className="relative">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30 light:text-slate-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="7" cy="7" r="5" />
            <path d="M11 11l3.5 3.5" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("calendar.searchReleased")}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] py-2 pl-8 pr-3 text-xs text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-neon-blue/40"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-white/50 light:text-slate-500">{filtered.length} {t("calendar.eventCount")}</p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setReleasedOnly((v) => !v)}
              aria-pressed={releasedOnly}
              className={`rounded-xl border px-3 py-1.5 text-sm font-medium transition-colors ${
                releasedOnly ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-400" : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
              }`}
            >
              {t("calendar.releasedOnly")}
            </button>
            <Dropdown
              label={t("common.category")}
              value={category}
              onChange={setCategory}
              options={[{ value: "All", label: t("calendar.allCategories") }, ...EVENT_CATEGORY_LIST.map((c) => ({ value: c, label: c }))]}
            />
            <Dropdown label="Year" value={year} onChange={setYear} options={[{ value: "All", label: t("calendar.allYears") }, ...years.map((y) => ({ value: y, label: y }))]} />
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="glass-card rounded-2xl p-6 text-center text-sm text-white/50 light:text-slate-500">{t("calendar.noEventsMatch")}</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map((event) => {
            const surprise = calculateSurprise(event.actualValue, event.forecastValue);
            return (
              <Link
                key={event.id}
                href={`/economic-calendar/archive/${event.slug}`}
                className="glass-card flex flex-col gap-3 p-4 transition-colors hover:border-neon-blue/30 sm:flex-row sm:items-center sm:gap-4"
              >
                <div className="flex flex-1 flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-white/70 light:text-slate-600">{formatEventDate(event.eventDate)}</span>
                  </div>
                  <p className="text-sm font-semibold text-white light:text-slate-900">{event.title}</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <EventCategoryBadge category={event.series.category} />
                    <EventImportanceBadge importance={event.importance} withTooltip={false} />
                    <EventStatusBadge status={event.status} />
                    {surprise.direction !== "unavailable" && (
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${SURPRISE_BADGE_CLASS[surprise.direction]}`}>
                        {SURPRISE_LABELS[surprise.direction]}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-6 border-t border-white/5 light:border-slate-100 pt-3 sm:border-t-0 sm:pt-0">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] uppercase tracking-wide text-white/35 light:text-slate-400">{t("calendar.forecastCol")}</span>
                    <span className="text-sm font-medium text-white/70 light:text-slate-600">{event.forecastValue ?? "—"}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] uppercase tracking-wide text-white/35 light:text-slate-400">{t("calendar.actualCol")}</span>
                    <span className="text-sm font-semibold text-neon-blue">{event.actualValue ?? "—"}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
