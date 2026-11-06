// Body of the Overview "Latest News" panel (Phase E.1).
// Server-compatible (no hooks).
//
// A separate component rather than inline JSX in the Overview page so both of
// its states can be rendered and tested directly: the page is an async server
// component that cannot be rendered in a unit test, and "a news provider
// failure must not break the Overview" is exactly the sort of claim that
// should be exercised rather than assumed.
//
// The empty state is deliberately plain. Every feed fetcher in news.ts
// returns [] on failure and getTaggedNews([]) returns an empty result, so a
// provider outage arrives here as an empty list. Nothing is substituted for
// it: no placeholder headlines, no older articles presented as latest.

import HeadlinesList, { type HeadlineRow } from "@/components/home/HeadlinesList";

export default function LatestNewsBody({ items, windowHours }: { items: HeadlineRow[]; windowHours: number }) {
  if (items.length === 0) {
    return (
      <p className="px-4 py-3 text-[13px] text-pe-text-3">
        No headlines from the last {windowHours} hours are available right now.
      </p>
    );
  }
  // Category on, sentiment off: the panel is a narrow column beside Markets,
  // and headline + publisher + publication time + category is what a reader
  // needs to decide whether to click. The sentiment tag stays on the full
  // Headlines section, where there is room for it.
  return <HeadlinesList items={items} showCategory showSentiment={false} />;
}
