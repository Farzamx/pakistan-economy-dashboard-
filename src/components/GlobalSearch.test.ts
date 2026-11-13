// The global jump-search (G.21): EVERY existing destination is searchable by a guest as well as a member. A result is a label and an address only; choosing a
// protected one opens the sign-in dialog (the shell's useGuestGate), never the page. These tests check the index against the real navigation registry, the real
// page routes and the real registries of Decision Lab tools, budget categories, comparisons and provincial pages, so a new destination that is not searchable
// fails here.

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { BOND_YIELDS_SEARCH_ALIASES, BUDGET_TRACKER_SEARCH_ALIASES, SEARCH_INDEX, SITE_SEARCH_INDEX, matches, rankedMatches } from "./GlobalSearch";
import { APP_NAV, allNavLinks, hrefPath } from "@/lib/appNav";
import { requiresLogin } from "@/lib/accessPolicy";
import { SEO_PAGES } from "@/lib/seoConfig";
import { SEARCH_DESTINATIONS } from "@/lib/searchDestinations";
import { DECISION_SUPPORT_TOOLS } from "@/lib/decisionSupportLab/tools";
import { BUDGET_CATEGORIES } from "@/lib/budget/budgetRegistry";
import { COMPARISONS } from "@/lib/comparisons/comparisonRegistry";
import { PROVINCIAL_SEO_PAGES } from "@/lib/provincial/provincialSeoPages";
import { en } from "@/lib/i18n/translations/en";

const SRC = path.resolve(__dirname, "..");
const APP = path.join(SRC, "app");

/** Does a route resolve to a page.tsx? A segment may be a literal folder or a Next.js dynamic folder such as [slug]. */
function routeExists(route: string, dir = APP): boolean {
  const [head, ...rest] = route.split("/").filter(Boolean);
  if (head === undefined) return fs.existsSync(path.join(dir, "page.tsx"));
  const candidates = fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory() && (d.name === head || /^\[[^\]]+\]$/.test(d.name)));
  return candidates.some((d) => routeExists(rest.join("/"), path.join(dir, d.name)));
}
const search = (q: string) => SITE_SEARCH_INDEX.filter((e) => matches(e, q));
const hrefs = (q: string) => search(q).map((e) => e.href);
const indexed = new Set(SITE_SEARCH_INDEX.map((e) => hrefPath(e.href)));
const dig = (key: string): string => key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], en) as string;

describe("the search index is complete", () => {
  it("every link in the navigation registry is searchable (except in-page anchors and 'Back to site')", () => {
    const missing = allNavLinks(APP_NAV).filter((l) => !l.href.includes("#") && l.href !== "/home" && !indexed.has(hrefPath(l.href))).map((l) => l.href);
    expect(missing).toEqual([]);
  });

  it("every indicator page in SEO_PAGES is searchable", () => {
    expect(SEO_PAGES.filter((p) => !indexed.has(`/${p.slug}`)).map((p) => p.slug)).toEqual([]);
  });

  it("the destinations the owner named are all searchable", () => {
    const named: [string, string][] = [
      ["download datasets", "/download-datasets"], ["macro intelligence", "/macro-intelligence"], ["fed funds", "/fed-funds-rate"], ["tax money", "/budget/where-does-tax-money-go"],
      ["debt vs defence", "/budget/debt-servicing-vs-defence"], ["bond yields", "/pakistan-bond-yields"], ["budget tracker", "/budget"], ["core inflation", "/pakistan-core-inflation"],
      ["food inflation", "/pakistan-food-inflation"], ["decision lab", "/decision-support-lab"], ["comparisons", "/comparisons"], ["economic calendar", "/economic-calendar"],
      ["gdp breakdown", "/gdp-breakdown-workshop"], ["academy", "/academy"], ["workshop", "/workshop"],
    ];
    // what the visitor actually SEES is the best 8 (rankedMatches), so the check is made on that, not on the unranked matches
    for (const [q, href] of named) expect(rankedMatches(SITE_SEARCH_INDEX, q).map((e) => e.href), `${q} -> ${href}`).toContain(href);
  });

  it("ranking puts the best match first: an exact or leading label beats a keyword match", () => {
    expect(rankedMatches(SITE_SEARCH_INDEX, "decision lab")[0].href).toBe("/decision-support-lab");
    expect(rankedMatches(SITE_SEARCH_INDEX, "budget tracker")[0].href).toBe("/budget");
    expect(rankedMatches(SITE_SEARCH_INDEX, "Fed Funds")[0].href).toBe("/fed-funds-rate");
    expect(rankedMatches(SITE_SEARCH_INDEX, "download datasets")[0].href).toBe("/download-datasets");
    expect(rankedMatches(SITE_SEARCH_INDEX, "  ")).toEqual([]);
    expect(rankedMatches(SITE_SEARCH_INDEX, "a").length).toBeLessThanOrEqual(8);
  });

  it("every Decision Lab tool that has a page is searchable, by its own title", () => {
    for (const t of DECISION_SUPPORT_TOOLS.filter((x) => x.status === "available" && x.href)) {
      expect(indexed.has(t.href!), t.href).toBe(true);
      expect(hrefs(dig(t.titleKey)), t.id).toContain(t.href);
    }
  });

  it("every budget category, comparison and provincial budget page is searchable", () => {
    for (const c of BUDGET_CATEGORIES) expect(indexed.has(`/budget/${c.slug}`), c.slug).toBe(true);
    for (const c of COMPARISONS) expect(indexed.has(`/comparisons/${c.slug}`), c.slug).toBe(true);
    for (const p of PROVINCIAL_SEO_PAGES) expect(indexed.has(`/provincial-budget/${p.slug}`), p.slug).toBe(true);
  });

  it("the generated destination list has not drifted from the registries it is derived from", () => {
    const expected = new Set<string>([
      ...DECISION_SUPPORT_TOOLS.filter((t) => t.status === "available" && t.href).map((t) => t.href!),
      ...BUDGET_CATEGORIES.map((c) => `/budget/${c.slug}`),
      ...COMPARISONS.map((c) => `/comparisons/${c.slug}`),
      ...PROVINCIAL_SEO_PAGES.map((p) => `/provincial-budget/${p.slug}`),
    ]);
    const have = new Set(SEARCH_DESTINATIONS.map((e) => e.href));
    for (const href of expected) expect(have.has(href), `${href} missing from src/lib/searchDestinations.ts — regenerate it`).toBe(true);
    for (const e of SEARCH_DESTINATIONS) expect(routeExists(e.href), `${e.href} is not a page`).toBe(true);
  });

  it("every information page is searchable too", () => {
    for (const href of ["/about", "/contact", "/methodology", "/site-map", "/academy/glossary", "/academy/paths", "/economic-calendar/archive", "/provincial-budget/compare"]) expect(indexed.has(href), href).toBe(true);
  });
});

describe("a guest sees protected destinations in search, and only as labels", () => {
  it("protected destinations are in the index (the guest dialog, not hiding, is the protection)", () => {
    const protectedEntries = SITE_SEARCH_INDEX.filter((e) => requiresLogin(e.href));
    expect(protectedEntries.length).toBeGreaterThan(100);
    for (const href of ["/pakistan-bond-yields", "/budget", "/download-datasets", "/macro-intelligence", "/fed-funds-rate", "/budget/where-does-tax-money-go"]) {
      expect(protectedEntries.some((e) => hrefPath(e.href) === href), href).toBe(true);
    }
  });

  it("an entry carries only a label, an address and search keywords: no page data", () => {
    for (const e of SITE_SEARCH_INDEX) expect(Object.keys(e).sort().filter((k) => !["href", "keywords", "label"].includes(k)), e.href).toEqual([]);
  });

  it("the search source has no access filter of its own, and hands every click to the host's gate", () => {
    const src = fs.readFileSync(path.join(__dirname, "GlobalSearch.tsx"), "utf8");
    expect(src).not.toMatch(/isPublicPagePath|PUBLIC_SEARCH_INDEX|requiresLogin|isProtectedPath/);
    expect(src).toMatch(/onLinkClick\(e, href\)/);
  });
});

describe("the search index is well formed", () => {
  it("no two results share a destination", () => {
    const h = SITE_SEARCH_INDEX.map((e) => (e.href.startsWith("/overview#") ? e.href : hrefPath(e.href)));
    expect(new Set(h).size).toBe(h.length);
  });

  it("every real-route result points at a page that exists (direct navigation works)", () => {
    for (const e of SITE_SEARCH_INDEX) {
      const p = e.href.split("#")[0];
      if (p === "/overview" || p === "") continue;
      expect(routeExists(p), e.href).toBe(true);
    }
  });

  it("every result has a non-empty label", () => {
    for (const e of SITE_SEARCH_INDEX) expect(e.label.trim().length, e.href).toBeGreaterThan(0);
  });

  it("an unrelated query finds nothing", () => {
    expect(search("zzzz-not-a-thing")).toEqual([]);
  });
});

describe("searches lead where they should", () => {
  it.each([
    ["core inflation", "/pakistan-core-inflation"], ["nfne", "/pakistan-core-inflation"], ["food inflation", "/pakistan-food-inflation"], ["inflation rate", "/inflation-rate-pakistan"],
    ["wholesale", "/pakistan-wholesale-inflation"], ["wpi", "/pakistan-wholesale-inflation"], ["weekly inflation", "/weekly-inflation-pakistan"], ["spi index", "/spi-index-pakistan"],
    ["fed funds", "/fed-funds-rate"], ["federal funds rate", "/fed-funds-rate"], ["us policy rate", "/fed-funds-rate"], ["interest", "/pakistan-interest-rate"],
    ["t-bills", "/pakistan-bond-yields"], ["treasury bills", "/pakistan-bond-yields"], ["pib", "/pakistan-bond-yields"], ["yield curve", "/pakistan-bond-yields"],
    ["federal budget", "/budget"], ["gold", "/gold-price-pakistan"], ["glossary", "/academy/glossary"], ["emergency fund", "/decision-support-lab/emergency-fund-planner"],
  ])("searching %p finds %s", (q, href) => {
    expect(hrefs(q)).toContain(href);
  });

  it("the aliases are carried by the entries themselves", () => {
    expect(SITE_SEARCH_INDEX.find((e) => e.href === "/pakistan-bond-yields")?.keywords).toEqual(expect.arrayContaining(BOND_YIELDS_SEARCH_ALIASES));
    expect(SITE_SEARCH_INDEX.find((e) => e.href === "/budget")?.keywords).toEqual(expect.arrayContaining(BUDGET_TRACKER_SEARCH_ALIASES));
  });

  it("the Overview's own sections are still found", () => {
    expect(hrefs("policy rate")).toContain("/overview#home-snapshot");
    expect(hrefs("news")).toContain("/overview#home-headlines");
    expect(hrefs("calendar")).toContain("/overview#home-releases");
  });

  it("the legacy hand-written list is still exported for compatibility and contains no entry that the site index lacks", () => {
    for (const e of SEARCH_INDEX.filter((x) => !x.href.startsWith("/overview#"))) expect(indexed.has(hrefPath(e.href)), e.href).toBe(true);
  });
});
