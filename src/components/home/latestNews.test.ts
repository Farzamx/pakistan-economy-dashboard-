// Phase E.1 — rendering of the Latest News panel body and the shared list.
//
// These render the real components to static HTML, so the claims below are
// about what a visitor actually receives rather than about props.

import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import HeadlinesList, { type HeadlineRow } from "./HeadlinesList";
import LatestNewsBody from "./LatestNewsBody";

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

const html = (el: ReturnType<typeof createElement>) => renderToStaticMarkup(el);

describe("Latest News body with articles", () => {
  const out = html(createElement(LatestNewsBody, { items: [row(), row({ title: "Second story", url: "https://example.test/two", source: "Dawn Business", category: "Central Banks" })], windowHours: 48 }));

  it("links every article to its original source in a new tab", () => {
    expect((out.match(/<a /g) ?? []).length).toBe(2);
    expect(out).toContain('href="https://example.test/sbp-reserves"');
    expect(out).toContain('target="_blank"');
    expect(out).toContain("noopener");
  });

  it("shows headline, publisher and the article's own category", () => {
    expect(out).toContain("SBP reserves rise $39m to $21.6bn");
    expect(out).toContain("Investify");
    expect(out).toContain("Pakistan Economy");
    expect(out).toContain("Central Banks");
  });

  it("shows the PUBLICATION time, in PKT, as a machine-readable <time>", () => {
    // 04:45Z is 09:45 in Karachi — the feed's own timestamp, converted, not
    // the time the page happened to be rendered.
    expect(out).toContain("09:45 PKT");
    expect(out).toContain('dateTime="2026-11-06T04:45:00Z"');
  });

  it("never renders a relative 'x hours ago' that ISR would freeze and let go stale", () => {
    expect(out).not.toMatch(/\bago\b/i);
  });
});

describe("Latest News body when nothing is available", () => {
  // This is the state a provider outage produces: every feed fetcher in
  // news.ts returns [] on failure, so an outage reaches the panel as [].
  const out = html(createElement(LatestNewsBody, { items: [], windowHours: 48 }));

  it("renders a plain message instead of throwing", () => {
    expect(out).toMatch(/No headlines/i);
    expect(out).toContain("48 hours");
  });

  it("fabricates nothing: no links, no list, no articles", () => {
    expect((out.match(/<a /g) ?? []).length).toBe(0);
    expect(out).not.toContain("<ul");
    expect(out).not.toContain("<li");
    expect(out).not.toContain("<time");
  });
});

describe("a missing publication time is shown neutrally, never invented", () => {
  it("omits the time rather than substituting one", () => {
    const out = html(createElement(LatestNewsBody, { items: [row({ publishedAt: "garbage" })], windowHours: 48 }));
    expect(out).not.toContain("<time");
    expect(out).not.toContain("PKT");
    // The article itself is still listed and linked.
    expect(out).toContain("SBP reserves rise");
  });
});

describe("the compact panel drops the sentiment tag to stay readable", () => {
  // Beside Markets the metadata row is only ~290-460px wide. With sentiment
  // as a fourth item it wrapped onto a second line in 4-6 of 6 rows at the
  // common desktop widths; headline, publisher, time and category are what a
  // reader needs to decide whether to click.
  const tagged = row({ intelligence: { sentiment: "Bullish", riskLevel: "Low", impactScore: 3, reason: "r", marketImpact: null } as HeadlineRow["intelligence"] });

  it("shows no sentiment in the Latest News body", () => {
    const out = html(createElement(LatestNewsBody, { items: [tagged], windowHours: 48 }));
    expect(out).not.toContain("Bullish");
  });

  it("still shows headline, publisher, publication time, category and the link", () => {
    const out = html(createElement(LatestNewsBody, { items: [tagged], windowHours: 48 }));
    expect(out).toContain("SBP reserves rise $39m to $21.6bn");
    expect(out).toContain("Investify");
    expect(out).toContain("09:45 PKT");
    expect(out).toContain("Pakistan Economy");
    expect(out).toContain('href="https://example.test/sbp-reserves"');
  });

  it("keeps the link a full-width block, so the touch target is the whole row", () => {
    const out = html(createElement(LatestNewsBody, { items: [tagged], windowHours: 48 }));
    expect(out).toMatch(/<a [^>]*class="[^"]*\bflex\b[^"]*\bflex-col\b[^"]*\bpy-2\.5\b/);
  });
});

describe("the existing Headlines section is unchanged", () => {
  const tagged = row({ intelligence: { sentiment: "Bullish", riskLevel: "Low", impactScore: 3, reason: "r", marketImpact: null } as HeadlineRow["intelligence"] });

  it("still shows the sentiment tag by default", () => {
    const out = html(createElement(HeadlinesList, { items: [tagged] }));
    expect(out).toContain("Bullish");
  });

  it("hides sentiment only when a caller explicitly turns it off", () => {
    expect(html(createElement(HeadlinesList, { items: [tagged], showSentiment: false }))).not.toContain("Bullish");
  });

  it("does not show category unless the caller opts in", () => {
    const out = html(createElement(HeadlinesList, { items: [row()] }));
    expect(out).not.toContain("Pakistan Economy");
    expect(out).toContain("SBP reserves rise");
  });

  it("keeps its own empty-state wording", () => {
    expect(html(createElement(HeadlinesList, { items: [] }))).toContain("Headlines are unavailable right now");
  });
});
