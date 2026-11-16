// Release calendar and headlines for the Overview. Server-compatible (no hooks).
// Presentation only: the calendar rows are grouped by releaseGroups.ts, and the headlines are the articles the page already fetched.

import Link from "next/link";
import type { NewsItem } from "@/lib/data/news";
import { CARD } from "./OverviewSummary";
import { cleanSourceName, formatHeadlineTime, formatShortDay } from "./overviewFormat";
import type { ReleaseGroups, ReleaseRow } from "./releaseGroups";

function CardHeader({ id, title, href, linkLabel }: { id: string; title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 px-4 pb-2 pt-4 lg:px-5 lg:pt-5">
      <h2 id={id} className="text-[17px] font-semibold text-pe-text">{title}</h2>
      {href && linkLabel && (
        <Link href={href} className="-my-2 inline-flex min-h-11 items-center text-[13px] font-medium text-pe-accent hover:underline">{linkLabel}</Link>
      )}
    </div>
  );
}

// ── Release calendar ─────────────────────────────────────────────────────────

/** Only "High" is a filled pill. Medium and Low are plain text: three coloured pills in every row made nothing stand out. */
function Importance({ level }: { level: string }) {
  if (level === "High") {
    return <span className="shrink-0 rounded-full bg-pe-text px-2.5 py-0.5 text-[12px] font-semibold text-pe-surface">High</span>;
  }
  return <span className="shrink-0 text-[12px] text-pe-text-3">{level}</span>;
}

function ReleaseList({ rows }: { rows: ReleaseRow[] }) {
  return (
    <ul className="divide-y divide-pe-border">
      {rows.map((row) => (
        <li key={row.key} className="flex min-h-11 items-center justify-between gap-4 px-4 py-2.5 lg:px-5">
          <span className="min-w-0">
            <span className="block text-[14px] font-medium leading-snug text-pe-text">{row.title}</span>
            {row.subtitle && <span className="block text-[12px] leading-snug text-pe-text-3">{row.subtitle}</span>}
          </span>
          <Importance level={row.importance} />
        </li>
      ))}
    </ul>
  );
}

function GroupLabel({ children, today = false }: { children: React.ReactNode; today?: boolean }) {
  return (
    <h3
      className={`border-y border-pe-border px-4 py-2 font-mono text-[11px] font-medium uppercase tracking-[0.12em] lg:px-5 ${today ? "bg-pe-surface-2 text-pe-accent" : "text-pe-text-3"}`}
    >
      {children}
    </h3>
  );
}

export function ReleaseCalendar({ id, groups, todayIso }: { id: string; groups: ReleaseGroups | null; todayIso: string }) {
  const empty = groups !== null && groups.today.length + groups.thisWeek.length + groups.comingUp.length === 0;
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className={`${CARD} flex h-full flex-col overflow-hidden`}>
      <CardHeader id={`${id}-heading`} title="Release calendar" href="/economic-calendar" linkLabel="All releases →" />
      {groups === null ? (
        <p className="px-5 py-6 text-[13px] text-pe-text-3">The release calendar is unavailable right now.</p>
      ) : empty ? (
        <p className="px-5 py-6 text-[13px] text-pe-text-3">No upcoming releases are scheduled.</p>
      ) : (
        <>
          {groups.today.length > 0 && (
            <>
              <GroupLabel today>Today · {formatShortDay(todayIso)}</GroupLabel>
              <ReleaseList rows={groups.today} />
            </>
          )}
          {groups.thisWeek.length > 0 && (
            <>
              <GroupLabel>This week</GroupLabel>
              <ReleaseList rows={groups.thisWeek} />
            </>
          )}
          {groups.comingUp.length > 0 && (
            <>
              <GroupLabel>Coming up</GroupLabel>
              <ReleaseList rows={groups.comingUp} />
            </>
          )}
        </>
      )}
    </section>
  );
}

// ── Headlines ────────────────────────────────────────────────────────────────

/** Articles published by the statistics office itself (the page's only direct official feed), not journalism about it. */
function isOfficial(item: NewsItem): boolean {
  return /^PBS Official/i.test(item.source);
}

export function OverviewHeadlines({ id, items, todayIso, sourceCount }: { id: string; items: NewsItem[]; todayIso: string; sourceCount: number }) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className={`${CARD} flex h-full flex-col`}>
      {/* No news page exists yet, so this card has no "All news" link: a link to nowhere would be worse than none. */}
      <CardHeader id={`${id}-heading`} title="Headlines" />
      {items.length === 0 ? (
        <p className="px-5 py-6 text-[13px] text-pe-text-3">Headlines are unavailable right now. The news feeds are retried automatically.</p>
      ) : (
        <ul className="divide-y divide-pe-border border-t border-pe-border">
          {items.slice(0, 6).map((item, i) => {
            const time = formatHeadlineTime(item.publishedAt, todayIso);
            return (
              // Six on desktop, four on mobile.
              <li key={item.url} className={i >= 4 ? "max-lg:hidden" : ""}>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex min-h-11 flex-col gap-1 px-4 py-3 hover:bg-pe-surface-2 lg:flex-row lg:items-baseline lg:justify-between lg:gap-6 lg:px-5"
                >
                  <span className="min-w-0 text-[14px] font-medium leading-snug text-pe-text group-hover:text-pe-accent">
                    {item.title}
                    {isOfficial(item) && (
                      <span className="ms-2 inline-block whitespace-nowrap rounded-full border border-pe-border-strong px-2 py-px align-middle text-[11px] font-medium text-pe-text-2">
                        Official release
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 whitespace-nowrap text-[12px] text-pe-text-3">
                    {cleanSourceName(item.source)}
                    {time && (
                      <>
                        {" · "}
                        <time dateTime={item.publishedAt}>{time}</time>
                      </>
                    )}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      )}
      {items.length > 0 && (
        <p className="mt-auto border-t border-pe-border px-4 py-3 text-[12px] text-pe-text-3 lg:px-5">
          From {sourceCount} sources. Official PBS releases are labelled.
        </p>
      )}
    </section>
  );
}
