// Body of the Overview "Latest News" panel.
// Server component: it prepares the rows, then hands them to the ticker.
//
// A separate component rather than inline JSX in the Overview page so both of
// its states can be rendered and tested directly: the page is an async server
// component that cannot be rendered in a unit test, and "a news provider
// failure must not break the Overview" is exactly the sort of claim that
// should be exercised rather than assumed.
//
// It does no fetching and no selection. `items` is whatever the page already
// fetched, ranked and passed through selectFreshHeadlines; this only formats it
// for display. Publication times are formatted HERE, on the server, from the
// feed's own timestamp — never in the browser — so the text cannot differ
// between server and client and is never a "3 hours ago" that a cached page
// would freeze and let go stale.
//
// The empty state is deliberately plain. Every feed fetcher in news.ts
// returns [] on failure and getTaggedNews([]) returns an empty result, so a
// provider outage arrives here as an empty list. Nothing is substituted for
// it: no placeholder headlines, no older articles presented as latest.

import { formatPublished, type HeadlineRow } from "@/components/home/HeadlinesList";
import LatestNewsTicker, { type TickerRow } from "@/components/home/LatestNewsTicker";

function toTickerRow(item: HeadlineRow): TickerRow {
  const time = Date.parse(item.publishedAt);
  return {
    title: item.title,
    url: item.url,
    source: item.source,
    published: formatPublished(item.publishedAt),
    // Normalised to ISO for the <time> element. RSS items arrive as RFC 822
    // ("Fri, 06 Nov 2026 04:45:00 GMT"), which is not a valid datetime value.
    iso: Number.isNaN(time) ? null : new Date(time).toISOString(),
    category: item.category,
  };
}

export default function LatestNewsBody({ items, windowHours }: { items: HeadlineRow[]; windowHours: number }) {
  if (items.length === 0) {
    return (
      <p className="px-4 py-3 text-[13px] text-pe-text-3">
        No headlines from the last {windowHours} hours are available right now.
      </p>
    );
  }
  // Sentiment is deliberately not carried over: the panel shows headline,
  // publisher, publication time and category, which is what a reader needs to
  // decide whether to open the article. The full Headlines section keeps it.
  return <LatestNewsTicker rows={items.map(toTickerRow)} />;
}
