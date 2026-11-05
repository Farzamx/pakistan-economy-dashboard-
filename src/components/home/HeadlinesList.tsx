// Economic headlines for the homepage (PEIC redesign Phase 3).
// Server-compatible (no hooks).
//
// Renders the articles the overview page already fetched (Google News /
// BBC / Dawn / Express Tribune RSS, optionally AI-tagged by the existing
// intelligence layer). Every field shown — title, source, publication time,
// link, sentiment tag — comes from the feed or the existing tagger; nothing
// here writes a summary or infers a time. Each row links to the real article.
//
// Publication times are rendered on the server from the feed's own ISO
// timestamp as an absolute date (never "3 hours ago"): a relative string
// computed at render time would be frozen by ISR and grow wrong as the
// cached page ages.

import type { NewsItem } from "@/lib/data/news";
import type { IntelligenceTag } from "@/lib/data/intelligence";

export interface HeadlineRow extends NewsItem {
  intelligence?: IntelligenceTag;
}

const SENTIMENT_CLASS: Record<string, string> = {
  Positive: "text-pe-up",
  Negative: "text-pe-down",
  Neutral: "text-pe-text-3",
};

/** "29 Oct · 14:05 PKT" — the article's own publication time, in the site's timezone. */
function formatPublished(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const opts: Intl.DateTimeFormatOptions = { timeZone: "Asia/Karachi", hour12: false };
  const day = d.toLocaleString("en-GB", { ...opts, day: "numeric" });
  const month = d.toLocaleString("en-GB", { ...opts, month: "short" });
  const time = d.toLocaleString("en-GB", { ...opts, hour: "2-digit", minute: "2-digit" });
  return `${day} ${month} · ${time} PKT`;
}

export default function HeadlinesList({ items }: { items: HeadlineRow[] }) {
  if (items.length === 0) {
    return (
      <p className="px-4 py-3 text-[13px] text-pe-text-3">
        Headlines are unavailable right now. The news feeds will be retried automatically.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-pe-border">
      {items.map((item) => {
        const published = formatPublished(item.publishedAt);
        const sentiment = item.intelligence?.sentiment;
        return (
          <li key={item.url}>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col gap-1 px-4 py-2.5 hover:bg-pe-surface-2"
            >
              <span className="text-[14px] font-medium leading-snug text-pe-text group-hover:text-pe-accent">
                {item.title}
              </span>
              <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-pe-text-3">
                <span className="font-medium text-pe-text-2">{item.source}</span>
                {published && (
                  <>
                    <span aria-hidden="true">·</span>
                    <time dateTime={item.publishedAt} className="font-mono text-[11px]">
                      {published}
                    </time>
                  </>
                )}
                {sentiment && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className={SENTIMENT_CLASS[sentiment] ?? "text-pe-text-3"}>{sentiment}</span>
                  </>
                )}
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
