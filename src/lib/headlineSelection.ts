// Fresh-headline selection for the Overview "Latest News" panel (Phase E.1).
//
// WHY THIS EXISTS
// getNews() ranks by relevance first and publication time second, and the
// relevance score does not consider age at all. Relevance is also saturated:
// at the time this was written 20 of the 40 ranked items scored the maximum
// of 10, so recency was effectively only a tie-breaker. That is right for a
// ranked feed, but a panel headed "Latest News" must not show a PBS notice
// that is three weeks old just because it ties on score with today's
// stories — and on a thin news day it would, since nothing fresher would be
// ahead of it. Observed in the live feed: ranks 18-20 were 213-503 hours old
// and scored 10.
//
// WHAT IT DOES
// Keeps the engine's own ranking order (so Pakistan-economy stories keep
// their priority) and simply drops articles older than a window before
// taking the first few. It never re-ranks, never re-scores, and never pads
// the panel with old articles to reach a target count: fewer rows, or none,
// is the honest result when little is fresh.
//
// THE WINDOW IS A PRESENTATION POLICY, NOT A FACT ABOUT THE NEWS
// 48 hours is a judgement about what "latest" should mean on a homepage, not
// something the feeds declare. It is exported and named so it is visible and
// can be changed in one place; nothing else depends on it.
//
// An article whose publication time cannot be parsed is EXCLUDED rather than
// assumed to be recent: with no evidence of its age it cannot be presented as
// latest. Pure: the clock is passed in, never read.

export const LATEST_NEWS_MAX_AGE_HOURS = 48;
export const LATEST_NEWS_LIMIT = 6;

const HOUR_MS = 3_600_000;

export interface DatedItem {
  publishedAt: string;
}

export interface FreshSelection<T> {
  items: T[];
  /** Articles dropped because they were older than the window. */
  droppedAsOld: number;
  /** Articles dropped because their publication time was missing or unparseable. */
  droppedUndated: number;
}

/**
 * First `limit` items, in their given (ranked) order, published within
 * `maxAgeHours` of `nowMs`. Items dated in the future beyond a small clock-
 * skew allowance are treated as undated rather than as the newest news.
 */
export function selectFreshHeadlines<T extends DatedItem>(
  rankedItems: readonly T[],
  nowMs: number,
  options: { maxAgeHours?: number; limit?: number } = {},
): FreshSelection<T> {
  const maxAgeMs = (options.maxAgeHours ?? LATEST_NEWS_MAX_AGE_HOURS) * HOUR_MS;
  const limit = options.limit ?? LATEST_NEWS_LIMIT;
  // Publishers' clocks and ours can disagree slightly; an hour of tolerance
  // keeps a genuinely fresh article from being dropped for that, while a
  // timestamp far in the future is still not believed.
  const futureToleranceMs = HOUR_MS;

  const items: T[] = [];
  let droppedAsOld = 0;
  let droppedUndated = 0;

  for (const item of rankedItems) {
    const published = new Date(item.publishedAt).getTime();
    if (!item.publishedAt || Number.isNaN(published) || published - nowMs > futureToleranceMs) {
      droppedUndated += 1;
      continue;
    }
    if (nowMs - published > maxAgeMs) {
      droppedAsOld += 1;
      continue;
    }
    if (items.length < limit) items.push(item);
  }

  return { items, droppedAsOld, droppedUndated };
}
