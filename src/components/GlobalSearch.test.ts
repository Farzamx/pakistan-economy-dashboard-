// The global jump-search must not offer core or food inflation as separate destinations (their analysis lives inside the Inflation
// Rate page now), must lead anyone who still searches for them to Inflation Rate, and must leave every other result alone.

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { BOND_YIELDS_SEARCH_ALIASES, BUDGET_TRACKER_SEARCH_ALIASES, INFLATION_RATE_SEARCH_ALIASES, INTEREST_RATE_SEARCH_ALIASES, SEARCH_INDEX, matches } from "./GlobalSearch";
import { CONSOLIDATED_INTO_INFLATION_SLUGS, CONSOLIDATED_INTO_INTEREST_RATE_SLUGS } from "@/lib/appNav";
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

describe("the Fed Funds Rate, bond and budget searches lead to their workshops", () => {
  it("the Fed Funds page has no entry of its own, and the Interest Rate entry carries its aliases", () => {
    for (const slug of CONSOLIDATED_INTO_INTEREST_RATE_SLUGS) expect(SEARCH_INDEX.some((e) => e.href === `/${slug}`), slug).toBe(false);
    expect(SEARCH_INDEX.find((e) => e.href === "/pakistan-interest-rate")?.keywords).toEqual(INTEREST_RATE_SEARCH_ALIASES);
  });

  it.each(["fed funds", "federal funds rate", "us interest rate", "us policy rate"])("searching %p leads to Pakistan Interest Rate", (q) => {
    const found = hrefs(q);
    expect(found).toContain("/pakistan-interest-rate");
    expect(found).not.toContain("/fed-funds-rate");
  });

  it.each(["t-bills", "treasury bills", "pib", "yield curve", "government bonds"])("searching %p leads to Bond Yields", (q) => {
    expect(hrefs(q)).toContain("/pakistan-bond-yields");
  });

  it("the Bond Yields entry carries its aliases", () => {
    expect(SEARCH_INDEX.find((e) => e.href === "/pakistan-bond-yields")?.keywords).toEqual(BOND_YIELDS_SEARCH_ALIASES);
  });

  it.each(["tax money", "debt servicing vs defence", "defence spending", "federal budget"])("searching %p leads to the Budget Tracker", (q) => {
    expect(hrefs(q)).toContain("/budget");
  });

  it("the Budget Tracker entry carries its aliases", () => {
    expect(SEARCH_INDEX.find((e) => e.href === "/budget")?.keywords).toEqual(BUDGET_TRACKER_SEARCH_ALIASES);
  });

  it("no two results share a destination", () => {
    const h = SEARCH_INDEX.map((e) => e.href);
    expect(new Set(h).size).toBe(h.length);
  });
});

describe("nothing else about search changed", () => {
  it("every other indicator page is still in the index exactly once", () => {
    const consolidated = new Set<string>([...CONSOLIDATED_INTO_INFLATION_SLUGS, ...CONSOLIDATED_INTO_INTEREST_RATE_SLUGS]);
    for (const p of SEO_PAGES) {
      const n = SEARCH_INDEX.filter((e) => e.href === `/${p.slug}`).length;
      expect(n, p.slug).toBe(consolidated.has(p.slug) ? 0 : 1);
    }
  });

  it("the index is smaller by exactly the consolidated pages, and the hand-written entries are untouched", () => {
    expect(SEARCH_INDEX).toHaveLength(22 + SEO_PAGES.length - CONSOLIDATED_INTO_INFLATION_SLUGS.length - CONSOLIDATED_INTO_INTEREST_RATE_SLUGS.length);
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
