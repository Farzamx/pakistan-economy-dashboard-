// Phase E.1.x — rendering of the Overview "Latest News" panel body (the ticker)
// and of the shared headline list.
//
// These render the real components to static HTML, so the claims below are
// about what a visitor actually receives rather than about props.

import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import HeadlinesList, { type HeadlineRow } from "./HeadlinesList";
import LatestNewsBody from "./LatestNewsBody";
import { TICKER_SECONDS_PER_ITEM, TICKER_STATIC_VISIBLE_AT_DESKTOP } from "@/lib/newsTicker";

const row = (over: Partial<HeadlineRow> = {}): HeadlineRow =>
  ({
    title: "SBP reserves rise $39m to $21.6bn",
    url: "https://example.test/sbp-reserves",
    source: "Investify",
    publishedAt: "2026-11-06T04:45:00Z",
    category: "Pakistan Economy",
    relevanceScore: 10,
    ...over,
  }) as HeadlineRow;

/** n distinct articles. */
const many = (n: number): HeadlineRow[] =>
  Array.from({ length: n }, (_, i) =>
    row({ title: `Headline number ${i + 1}`, url: `https://example.test/a${i + 1}`, source: i % 2 ? "Dawn Business" : "Investify" }),
  );

const html = (el: ReturnType<typeof createElement>) => renderToStaticMarkup(el);
const body = (items: HeadlineRow[]) => html(createElement(LatestNewsBody, { items, windowHours: 48 }));

/** The markup of one of the ticker's two <ul> sets. */
function setMarkup(out: string, which: "primary" | "duplicate"): string {
  const start = out.indexOf(`data-set="${which}"`);
  if (start === -1) return "";
  const open = out.lastIndexOf("<ul", start);
  return out.slice(open, out.indexOf("</ul>", start) + 5);
}
const count = (s: string, re: RegExp) => (s.match(re) ?? []).length;

describe("the ticker renders every headline, linked to its original article", () => {
  const out = body(many(6));
  const primary = setMarkup(out, "primary");

  it("has one linked card per headline in the primary set", () => {
    expect(count(primary, /<li /g)).toBe(6);
    expect(count(primary, /<a /g)).toBe(6);
    for (let i = 1; i <= 6; i++) expect(primary).toContain(`href="https://example.test/a${i}"`);
  });

  it("opens articles in a new tab without leaking the opener", () => {
    expect(count(primary, /target="_blank"/g)).toBe(6);
    expect(count(primary, /rel="noopener noreferrer"/g)).toBe(6);
  });

  it("makes each whole card the link, so the touch target is the card", () => {
    expect(count(primary, /class="pe-newsticker-card"/g)).toBe(6);
  });

  it("shows publisher, publication time and category on each card", () => {
    expect(primary).toContain("Investify");
    expect(primary).toContain("Dawn Business");
    expect(primary).toContain("09:45 PKT");
    expect(primary).toContain("Pakistan Economy");
  });

  it("uses the PUBLICATION time, in PKT, as a machine-readable <time>", () => {
    // 04:45Z is 09:45 in Karachi: the feed's own timestamp, converted — not the
    // time the page happened to render.
    expect(primary).toContain('dateTime="2026-11-06T04:45:00.000Z"');
  });

  it("never renders a relative 'x hours ago' that ISR would freeze and let go stale", () => {
    expect(out).not.toMatch(/\bago\b/i);
  });

  it("shows no sentiment tag", () => {
    const withSentiment = (url: string) =>
      row({ url, intelligence: { sentiment: "Bullish", riskLevel: "Low", impactScore: 3, reason: "r", marketImpact: null } as HeadlineRow["intelligence"] });
    const out = body([withSentiment("https://example.test/one"), withSentiment("https://example.test/two")]);
    expect(out).not.toContain("Bullish");
  });
});

describe("the seamless loop", () => {
  const out = body(many(6));
  const primary = setMarkup(out, "primary");
  const duplicate = setMarkup(out, "duplicate");

  it("renders an identical second copy, so the loop can wrap without a jump", () => {
    expect(count(duplicate, /<li /g)).toBe(6);
    const hrefs = (s: string) => [...s.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    // Same articles, same order: the frame at the end of a loop equals the start.
    expect(hrefs(duplicate)).toEqual(hrefs(primary));
  });

  it("keeps the copy out of reach of assistive technology and the keyboard", () => {
    // Otherwise a screen-reader or keyboard user meets every headline twice.
    expect(duplicate).toMatch(/aria-hidden="true"/);
    expect(duplicate).toMatch(/\binert=""/);
    expect(count(duplicate, /tabindex="-1"/g)).toBe(6);
  });

  it("does not mark the primary set, or its links, inert or hidden", () => {
    // Checked on the list's own opening tag and on the links, not on the whole
    // markup: the decorative "·" separators inside a byline are legitimately
    // aria-hidden, and that is unrelated to whether the list is reachable.
    const listTag = primary.slice(0, primary.indexOf(">") + 1);
    expect(listTag).not.toMatch(/aria-hidden/);
    expect(listTag).not.toMatch(/\binert/);
    const linkTags = [...primary.matchAll(/<a [^>]*>/g)].map((m) => m[0]);
    expect(linkTags).toHaveLength(6);
    for (const tag of linkTags) expect(tag).not.toMatch(/tabindex/);
  });

  it("tells the stylesheet how many headlines and how long each card takes", () => {
    expect(out).toContain("--pe-newsticker-count:6");
    expect(out).toContain(`--pe-newsticker-seconds:${TICKER_SECONDS_PER_ITEM}s`);
    expect(out).toContain('data-animated="true"');
  });
});

describe("the Pause control", () => {
  it("is a real, labelled button when the ticker moves", () => {
    const out = body(many(4));
    expect(out).toMatch(/<button[^>]*type="button"[^>]*>/);
    expect(out).toContain('aria-label="Pause headline ticker"');
    expect(out).toContain(">Pause<");
  });

  it("sits outside the moving track, so it can never be carried away or covered", () => {
    const out = body(many(4));
    const track = out.slice(out.indexOf("pe-newsticker-track"), out.indexOf("pe-newsticker-controls"));
    expect(track).not.toContain("<button");
  });
});

describe("a single headline does not move", () => {
  const out = body(many(1));

  it("is static, with no duplicate copy and no Pause control", () => {
    expect(out).toContain('data-animated="false"');
    expect(setMarkup(out, "duplicate")).toBe("");
    expect(out).not.toContain("<button");
  });

  it("still shows the headline as a link", () => {
    expect(count(setMarkup(out, "primary"), /<a /g)).toBe(1);
  });
});

describe("the static presentation (reduced motion) caps what shows beside Markets", () => {
  // Each <li> opens with its own attributes, so the cap is read per row.
  const items = (out: string) => [...setMarkup(out, "primary").matchAll(/<li ([^>]*)>/g)].map((m) => m[1]);

  it("marks only the rows past the desktop cap, so the stylesheet can hide them without a scrollbar", () => {
    const rows = items(body(many(6)));
    expect(rows).toHaveLength(6);
    rows.forEach((attrs, i) => {
      const marked = /data-extra=""/.test(attrs);
      expect(marked, "row " + i).toBe(i >= TICKER_STATIC_VISIBLE_AT_DESKTOP);
    });
  });

  it("numbers each row, which the keyboard focus alignment relies on", () => {
    items(body(many(6))).forEach((attrs, i) => expect(attrs).toContain("data-ticker-index=\"" + i + "\""));
  });
});

describe("publication time is never invented", () => {
  it("omits the time, and any PKT label, rather than substituting one", () => {
    const out = body(many(2).map((r) => ({ ...r, publishedAt: "garbage" })));
    expect(out).not.toContain("<time");
    expect(out).not.toContain("PKT");
    // The articles themselves are still listed and linked.
    expect(out).toContain("Headline number 1");
    expect(out).toContain('href="https://example.test/a1"');
  });

  it("normalises an RFC 822 feed date to ISO, which is a valid <time> value", () => {
    const out = body(many(2).map((r) => ({ ...r, publishedAt: "Fri, 06 Nov 2026 04:45:00 GMT" })));
    expect(out).toContain('dateTime="2026-11-06T04:45:00.000Z"');
    expect(out).not.toContain("GMT");
  });
});

describe("when nothing is available", () => {
  // This is the state a provider outage produces: every feed fetcher in
  // news.ts returns [] on failure, so an outage reaches the panel as [].
  const out = body([]);

  it("renders a plain message instead of throwing", () => {
    expect(out).toMatch(/No headlines/i);
    expect(out).toContain("48 hours");
  });

  it("fabricates nothing: no ticker, no links, no articles", () => {
    expect(out).not.toContain("pe-newsticker");
    expect(count(out, /<a /g)).toBe(0);
    expect(out).not.toContain("<li");
    expect(out).not.toContain("<time");
  });
});

describe("the existing Headlines section is unchanged", () => {
  const tagged = row({ intelligence: { sentiment: "Bullish", riskLevel: "Low", impactScore: 3, reason: "r", marketImpact: null } as HeadlineRow["intelligence"] });

  it("still shows the sentiment tag by default", () => {
    expect(html(createElement(HeadlinesList, { items: [tagged] }))).toContain("Bullish");
  });

  it("hides sentiment only when a caller explicitly turns it off", () => {
    expect(html(createElement(HeadlinesList, { items: [tagged], showSentiment: false }))).not.toContain("Bullish");
  });

  it("does not show category unless the caller opts in", () => {
    const out = html(createElement(HeadlinesList, { items: [row()] }));
    expect(out).not.toContain("Pakistan Economy");
    expect(out).toContain("SBP reserves rise");
  });

  it("is a static list: no ticker markup", () => {
    expect(html(createElement(HeadlinesList, { items: many(3) }))).not.toContain("pe-newsticker");
  });

  it("keeps its own empty-state wording", () => {
    expect(html(createElement(HeadlinesList, { items: [] }))).toContain("Headlines are unavailable right now");
  });
});

describe("the Latest News panel keeps its place on the Overview", () => {
  // The brief's strict requirement: only what is INSIDE the panel changes. Its
  // position, its width, its heading and its All headlines link do not.
  const page = readFileSync(join(__dirname, "..", "..", "app", "overview", "page.tsx"), "utf-8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

  it("is still the right-hand cell of the same ~70/30 grid, stacked below lg", () => {
    expect(page).toContain("lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]");
    expect(page).toContain("grid-cols-1");
  });

  it("comes after Markets in the grid, so it stays on the right", () => {
    expect(page.indexOf('id="home-markets"')).toBeGreaterThan(-1);
    expect(page.indexOf('id="home-latest-news"')).toBeGreaterThan(page.indexOf('id="home-markets"'));
  });

  it("is still stretched to Markets' height, with the same heading and link", () => {
    expect(page).toContain("lg:grid lg:h-0 lg:min-h-full lg:grid-rows-[auto_minmax(0,1fr)]");
    expect(page).toContain('title="Latest News"');
    expect(page).toContain('href="#home-headlines"');
    expect(page).toContain("All headlines");
  });

  it("no longer scrolls: the panel body has no scroll container", () => {
    const panel = page.slice(page.indexOf('id="home-latest-news"'), page.indexOf("</Section>", page.indexOf('id="home-latest-news"')));
    expect(panel).not.toMatch(/overflow-y-(auto|scroll)|overflow-(auto|scroll)/);
    expect(panel).toContain("<LatestNewsBody");
  });
});
