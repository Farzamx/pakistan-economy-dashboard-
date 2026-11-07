// The global jump-search must not offer core or food inflation as separate destinations (their analysis lives inside the Inflation
// Rate page now), must lead anyone who still searches for them to Inflation Rate, and must leave every other result alone.

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { INFLATION_RATE_SEARCH_ALIASES, SEARCH_INDEX, matches } from "./GlobalSearch";
import { CONSOLIDATED_INTO_INFLATION_SLUGS } from "@/lib/appNav";
import { SEO_PAGES } from "@/lib/seoConfig";

const APP = path.resolve(__dirname, "..", "app");

/** Does a route resolve to a page.tsx? A segment may be a literal folder or a Next.js dynamic folder such as [slug]. */
function routeExists(route: string, dir = APP): boolean {
  const [head, ...rest] = route.split("/").filter(Boolean);
  if (head === undefined) return fs.existsSync(path.join(dir, "page.tsx"));
  const candidates = fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory() && (d.name === head || /^\[[^\]]+\]$/.test(d.name)));
  return candidates.some((d) => routeExists(rest.join("/"), path.join(dir, d.name)));
}
const search = (q: string) => SEARCH_INDEX.filter((e) => matches(e, q));
const hrefs = (q: string) => search(q).map((e) => e.href);

describe("core and food inflation are no longer separate search results", () => {
  it("neither page has an entry, by href or by label", () => {
    for (const slug of CONSOLIDATED_INTO_INFLATION_SLUGS) expect(SEARCH_INDEX.some((e) => e.href === `/${slug}`), slug).toBe(false);
    expect(SEARCH_INDEX.some((e) => /^pakistan (core|food) inflation/i.test(e.label))).toBe(false);
  });

  it("the 'Prices' entry no longer answers to 'core inflation' (that was a second, duplicate shortcut)", () => {
    const prices = SEARCH_INDEX.find((e) => e.label === "Prices");
    expect(prices?.keywords).toEqual(["WPI", "Wholesale"]);
    expect(search("core inflation").some((e) => e.label === "Prices")).toBe(false);
  });

  it.each(["core inflation", "core", "nfne", "food inflation"])("searching %p leads to the Inflation Rate page, and only to it", (q) => {
    const found = hrefs(q);
    expect(found).toContain("/inflation-rate-pakistan");
    for (const slug of CONSOLIDATED_INTO_INFLATION_SLUGS) expect(found).not.toContain(`/${slug}`);
    if (q !== "core") expect(found.filter((h) => h.startsWith("/") && !h.includes("#"))).toEqual(["/inflation-rate-pakistan"]);
  });

  it("the aliases are carried by the Inflation Rate entry itself", () => {
    expect(SEARCH_INDEX.find((e) => e.href === "/inflation-rate-pakistan")?.keywords).toEqual(INFLATION_RATE_SEARCH_ALIASES);
  });
});

describe("distinct price indicators stay searchable", () => {
  it.each([
    ["wholesale", "/pakistan-wholesale-inflation"],
    ["wpi", "/pakistan-wholesale-inflation"],
    ["weekly inflation", "/weekly-inflation-pakistan"],
    ["spi index", "/spi-index-pakistan"],
    ["inflation rate", "/inflation-rate-pakistan"],
  ])("searching %p finds %s", (q, href) => {
    expect(hrefs(q)).toContain(href);
  });

  it("a plain 'inflation' search lists Inflation Rate, WPI and SPI, and neither consolidated page", () => {
    const found = hrefs("inflation");
    for (const h of ["/inflation-rate-pakistan", "/pakistan-wholesale-inflation", "/weekly-inflation-pakistan"]) expect(found).toContain(h);
    for (const slug of CONSOLIDATED_INTO_INFLATION_SLUGS) expect(found).not.toContain(`/${slug}`);
  });
});

describe("nothing else about search changed", () => {
  it("every other indicator page is still in the index exactly once", () => {
    const consolidated = new Set<string>(CONSOLIDATED_INTO_INFLATION_SLUGS);
    for (const p of SEO_PAGES) {
      const n = SEARCH_INDEX.filter((e) => e.href === `/${p.slug}`).length;
      expect(n, p.slug).toBe(consolidated.has(p.slug) ? 0 : 1);
    }
  });

  it("the index is smaller by exactly the two consolidated pages, and the hand-written entries are untouched", () => {
    expect(SEARCH_INDEX).toHaveLength(22 + SEO_PAGES.length - CONSOLIDATED_INTO_INFLATION_SLUGS.length);
  });

  it("unrelated searches are unaffected", () => {
    expect(hrefs("gold")).toContain("/gold-price-pakistan");
    expect(hrefs("policy rate")).toContain("/overview#monetary-policy");
    expect(hrefs("interest")).toContain("/pakistan-interest-rate");
    expect(search("zzzz-not-a-thing")).toEqual([]);
  });

  it("every real-route result still points at a page that exists (direct navigation works)", () => {
    for (const e of SEARCH_INDEX) {
      const p = e.href.split("#")[0];
      if (p === "/overview" || p === "") continue;
      expect(routeExists(p), e.href).toBe(true);
    }
  });
});
