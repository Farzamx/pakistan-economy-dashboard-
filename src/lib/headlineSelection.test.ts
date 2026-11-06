// Phase E.1 — "Latest News" headline selection.
//
// The risk guarded here is a panel headed "Latest News" presenting an old
// article as current. getNews() ranks by relevance, relevance ignores age and
// is saturated at 10 for many items, so without this guard a three-week-old
// PBS notice can sit in the panel on a quiet news day.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { LATEST_NEWS_LIMIT, LATEST_NEWS_MAX_AGE_HOURS, selectFreshHeadlines } from "./headlineSelection";

const NOW = Date.parse("2026-11-06T12:00:00Z");
const hoursAgo = (h: number) => new Date(NOW - h * 3_600_000).toISOString();
const item = (id: string, h: number) => ({ id, publishedAt: hoursAgo(h) });

describe("selectFreshHeadlines", () => {
  it("keeps the engine's ranked order rather than re-sorting by time", () => {
    // Rank order is the engine's Pakistan-economy priority; the selector
    // must not reorder it, only filter.
    const out = selectFreshHeadlines([item("a", 10), item("b", 1), item("c", 5)], NOW);
    expect(out.items.map((i) => i.id)).toEqual(["a", "b", "c"]);
  });

  it("drops articles older than the window", () => {
    const out = selectFreshHeadlines([item("fresh", 3), item("old", 49)], NOW);
    expect(out.items.map((i) => i.id)).toEqual(["fresh"]);
    expect(out.droppedAsOld).toBe(1);
  });

  it("keeps an article just inside the window", () => {
    expect(selectFreshHeadlines([item("edge", LATEST_NEWS_MAX_AGE_HOURS - 0.1)], NOW).items).toHaveLength(1);
  });

  it("reproduces the live hazard: stale max-relevance items are not shown", () => {
    // Shape of the real feed: fresh items first, then PBS notices that tie
    // on relevance but are 9-21 days old.
    const ranked = [item("f1", 0.3), item("f2", 4.3), item("pbs-9d", 213.3), item("pbs-18d", 431.5), item("pbs-21d", 502.9)];
    const out = selectFreshHeadlines(ranked, NOW);
    expect(out.items.map((i) => i.id)).toEqual(["f1", "f2"]);
    expect(out.droppedAsOld).toBe(3);
  });

  it("NEVER pads with old articles to reach the limit", () => {
    const out = selectFreshHeadlines([item("only-fresh", 2), item("old1", 100), item("old2", 200)], NOW);
    expect(out.items).toHaveLength(1);
  });

  it("returns nothing, not stale filler, when nothing is fresh", () => {
    const out = selectFreshHeadlines([item("old1", 100), item("old2", 200)], NOW);
    expect(out.items).toEqual([]);
  });

  it("caps at the limit and still counts what it dropped", () => {
    const many = Array.from({ length: 10 }, (_, i) => item(`n${i}`, i));
    const out = selectFreshHeadlines([...many, item("old", 300)], NOW);
    expect(out.items).toHaveLength(LATEST_NEWS_LIMIT);
    expect(out.droppedAsOld).toBe(1);
  });

  it("honours a custom window and limit", () => {
    const out = selectFreshHeadlines([item("a", 5), item("b", 30)], NOW, { maxAgeHours: 24, limit: 1 });
    expect(out.items.map((i) => i.id)).toEqual(["a"]);
    expect(out.droppedAsOld).toBe(1);
  });
});

describe("publication time is never invented", () => {
  it("excludes an unparseable timestamp instead of assuming it is recent", () => {
    const out = selectFreshHeadlines([{ id: "bad", publishedAt: "not a date" }, item("ok", 1)], NOW);
    expect(out.items.map((i) => i.id)).toEqual(["ok"]);
    expect(out.droppedUndated).toBe(1);
  });

  it("excludes an empty timestamp", () => {
    const out = selectFreshHeadlines([{ id: "empty", publishedAt: "" }], NOW);
    expect(out.items).toEqual([]);
    expect(out.droppedUndated).toBe(1);
  });

  it("does not treat a far-future timestamp as the newest news", () => {
    const out = selectFreshHeadlines([item("future", -48), item("ok", 1)], NOW);
    expect(out.items.map((i) => i.id)).toEqual(["ok"]);
    expect(out.droppedUndated).toBe(1);
  });

  it("tolerates small publisher clock skew", () => {
    // 20 minutes ahead is skew, not a bad timestamp.
    expect(selectFreshHeadlines([item("skew", -(20 / 60))], NOW).items).toHaveLength(1);
  });

  it("does not mutate its input", () => {
    const input = [item("a", 1), item("old", 999)];
    const copy = JSON.stringify(input);
    selectFreshHeadlines(input, NOW);
    expect(JSON.stringify(input)).toBe(copy);
  });

  it("is a pure function of its inputs (clock is passed in)", () => {
    const input = [item("a", 47)];
    expect(selectFreshHeadlines(input, NOW).items).toHaveLength(1);
    // Same article, an hour later on the caller's clock: now outside the window.
    expect(selectFreshHeadlines(input, NOW + 2 * 3_600_000).items).toHaveLength(0);
  });
});

describe("the Overview wires the panel safely", () => {
  const raw = readFileSync(join(__dirname, "..", "app", "overview", "page.tsx"), "utf-8");
  // Comments here legitimately talk about getNews(); only real call sites
  // count, so comments are removed before any count (same approach as
  // macroIntelligenceIsolation.test.ts).
  const page = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

  it("fetches news exactly once — the panel reuses the page's own list", () => {
    // The brief: avoid fetching news independently for the panel.
    expect((page.match(/\bgetNews\(/g) ?? []).length).toBe(1);
  });

  it("reads the render-time clock once rather than adding a second one", () => {
    // The panel must share the page's existing clock reading, so the
    // freshness window and the rest of the page agree on "now".
    expect(page).toMatch(/selectFreshHeadlines\(taggedNewsResult\.items, todayForCalendar\.getTime\(\)\)/);
    expect(page).not.toMatch(/Date\.now\(\)/);
  });

  it("routes the panel through the freshness guard", () => {
    expect(page).toMatch(/selectFreshHeadlines\(/);
    expect(page).not.toMatch(/marketsSideNews\s*=\s*taggedNewsResult\.items\.slice\(/);
  });

  it("keeps the existing Headlines section and Markets panel", () => {
    expect(page).toMatch(/id="home-headlines"/);
    expect(page).toMatch(/<MarketsPanel rows=\{homeMarketRows\}/);
  });
});
