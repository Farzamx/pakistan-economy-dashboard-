// Every surface that could point a visitor at a closed page follows the access policy: navigation, search, sitemap, robots, the Overview page's own links and
// the account UI. Hiding a link is not the enforcement (src/proxy.ts is, see accessPolicy.test.ts); these tests make sure the public surfaces cannot advertise
// what the proxy closes, and that the full registries are still there for a reopening.

import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import sitemap, { fullSitemap } from "@/app/sitemap";
import { PUBLIC_SEARCH_INDEX, SEARCH_INDEX, matches } from "@/components/GlobalSearch";
import IndicatorsTable from "@/components/home/IndicatorsTable";
import MacroBrief from "@/components/home/MacroBrief";
import PakistanSnapshot, { type SnapshotTile } from "@/components/home/PakistanSnapshot";
import UpcomingReleases from "@/components/home/UpcomingReleases";
import type { IndicatorRow } from "@/components/home/indicatorRows";
import { ACCOUNT_UI_ENABLED, isPublicPagePath, isPublicUrl } from "@/lib/accessPolicy";
import { APP_NAV, NAVIGATION_ONLY_OVERVIEW_SECTION_IDS, PUBLIC_APP_NAV, allNavLinks, filterNavForAccess, hrefPath, resolveActiveNav } from "@/lib/appNav";
import { SITE_URL } from "@/lib/seoConfig";

const SRC = path.resolve(__dirname, "..");
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), "utf8");
const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);

describe("navigation", () => {
  it("the public navigation offers the Overview and nothing else", () => {
    expect(PUBLIC_APP_NAV.map((e) => e.id)).toEqual(["overview"]);
    expect(PUBLIC_APP_NAV.every((e) => e.kind === "link")).toBe(true);
    const links = allNavLinks(PUBLIC_APP_NAV);
    expect(links.map((l) => l.href)).toEqual(["/overview"]);
    for (const l of links) expect(isPublicPagePath(l.href), l.href).toBe(true);
  });

  it("no menu, settings action, login, signup or closed destination is left", () => {
    expect(PUBLIC_APP_NAV.some((e) => e.kind === "menu")).toBe(false);
    const hrefs = allNavLinks(PUBLIC_APP_NAV).map((l) => hrefPath(l.href));
    for (const closed of ["/pakistan-bond-yields", "/budget", "/macro-intelligence", "/download-datasets", "/login", "/signup", "/home"]) expect(hrefs).not.toContain(closed);
  });

  it("the Overview is the active page on /overview", () => {
    expect(resolveActiveNav("/overview", PUBLIC_APP_NAV)).toEqual({ topId: "overview", linkId: "overview", match: "page" });
  });

  it("the COMPLETE registry is preserved, and the filter can restore it", () => {
    const full = allNavLinks(APP_NAV);
    expect(full.length).toBeGreaterThan(50);
    for (const href of ["/budget", "/pakistan-bond-yields", "/pakistan-interest-rate", "/inflation-rate-pakistan", "/download-datasets", "/macro-intelligence"]) {
      expect(full.map((l) => hrefPath(l.href)), href).toContain(href);
    }
    // with every destination opened the filtered view lists every link again (only Settings-style actions, which are not links, are dropped)
    expect(allNavLinks(filterNavForAccess(APP_NAV, () => true)).length).toBe(full.length);
  });

  it("the header and the drawer render the public navigation, not the full registry", () => {
    for (const f of ["components/shell/AppHeader.tsx", "components/shell/MobileDrawer.tsx"]) {
      const src = read(f);
      expect(src, f).toContain("PUBLIC_APP_NAV");
      expect(src, f).not.toMatch(/\bAPP_NAV\.map/);
    }
  });
});

describe("account UI (no login, signup or account anywhere)", () => {
  it("is switched off", () => {
    expect(ACCOUNT_UI_ENABLED).toBe(false);
  });

  it("every component the app shell renders that links to /login or /signup is guarded by the switch", () => {
    const files = ["components/shell/AccountControl.tsx", "components/shell/MobileDrawer.tsx", "components/MobileStickyCta.tsx", "components/shell/AppHeader.tsx", "components/AppShell.tsx"];
    for (const f of files) {
      const src = read(f);
      if (/["'`]\/(login|signup)/.test(src)) expect(src, f).toContain("ACCOUNT_UI_ENABLED");
    }
    expect(read("components/shell/AccountControl.tsx")).toMatch(/if \(!ACCOUNT_UI_ENABLED\) return null/);
    expect(read("components/shell/MobileDrawer.tsx")).toMatch(/ACCOUNT_UI_ENABLED && !loading/);
    expect(read("components/MobileStickyCta.tsx")).toMatch(/const show = ACCOUNT_UI_ENABLED &&/);
  });
});

describe("search", () => {
  const anchors = PUBLIC_SEARCH_INDEX.map((e) => e.href);
  const overviewSource = read("app/overview/page.tsx");

  it("offers only sections of the Overview page", () => {
    expect(anchors.length).toBeGreaterThan(4);
    for (const href of anchors) expect(href, href).toMatch(/^\/overview#[a-z-]+$/);
    for (const e of PUBLIC_SEARCH_INDEX) expect(isPublicPagePath(e.href), e.href).toBe(true);
  });

  it("every anchor it offers exists on the page (no dead results)", () => {
    for (const href of anchors) {
      const id = href.split("#")[1];
      expect(overviewSource, id).toMatch(new RegExp(`id="${id}"`));
    }
  });

  it("topics that live on closed pages find nothing", () => {
    for (const q of ["budget", "provincial", "comparison", "academy", "decision lab", "dataset", "download", "login", "sign up", "subscribe", "workshop", "sankey", "yield curve"]) {
      expect(PUBLIC_SEARCH_INDEX.filter((e) => matches(e, q)).map((e) => e.href), q).toEqual([]);
    }
  });

  it("topics the Overview shows are still found", () => {
    const find = (q: string) => PUBLIC_SEARCH_INDEX.filter((e) => matches(e, q)).map((e) => e.href);
    expect(find("inflation")).toContain("/overview#home-snapshot");
    expect(find("usd")).toContain("/overview#home-markets");
    expect(find("news")).toContain("/overview#home-headlines");
    expect(find("wholesale")).toContain("/overview#home-indicators");
    expect(find("calendar")).toContain("/overview#home-releases");
  });

  it("the complete index is preserved for a reopening", () => {
    expect(SEARCH_INDEX.length).toBeGreaterThan(50);
    expect(SEARCH_INDEX.some((e) => e.href === "/budget")).toBe(true);
    expect(read("components/GlobalSearch.tsx")).toMatch(/PUBLIC_SEARCH_INDEX\.filter\(\(e\) => matches\(e, query\)\)/);
  });
});

describe("sitemap and robots", () => {
  it("the published sitemap lists the Overview and nothing else", async () => {
    const entries = await sitemap();
    expect(entries.map((e) => e.url)).toEqual([`${SITE_URL}/overview`]);
  });

  it("the complete sitemap is preserved, and every entry the policy closes is filtered out", async () => {
    const full = await fullSitemap();
    expect(full.length).toBeGreaterThan(70);
    const urls = full.map((e) => e.url);
    for (const u of [`${SITE_URL}/budget/psdp`, `${SITE_URL}/pakistan-bond-yields`, `${SITE_URL}/site-map`, SITE_URL]) expect(urls, u).toContain(u);
    const published = (await sitemap()).map((e) => e.url);
    for (const u of urls) expect(published.includes(u), u).toBe(isPublicUrl(u));
  });

  it("robots.txt points at the sitemap and does not block the Overview", () => {
    const r = robots();
    expect(r.sitemap).toBe(`${SITE_URL}/sitemap.xml`);
    expect(JSON.stringify(r.rules)).not.toMatch(/disallow[^]*overview/i);
  });
});

describe("the Overview page's own links", () => {
  const src = read("app/overview/page.tsx");

  it("the navigation-only sections are rendered only when the site offers more than the Overview", () => {
    expect([...NAVIGATION_ONLY_OVERVIEW_SECTION_IDS]).toEqual(["home-explore", "home-provincial"]);
    expect(src).toMatch(/offersMoreThanOverview\(\) && \(\s*<Section id="home-explore"/);
    expect(src).toMatch(/offersMoreThanOverview\(\) && \(\s*<Section id="home-provincial"/);
    expect(src).toMatch(/offersMoreThanOverview\(\) && <PopularInsights \/>/);
  });

  it("detail-page links are filtered on the server, so a closed page's address never reaches the browser", () => {
    expect(src).toMatch(/href: slug \? \(publicHref\(`\/\$\{slug\}`\) \?\? undefined\) : undefined/);
    expect(src).toMatch(/buildSnapshotTiles\([^)]*\)\.map\(\(t\) => \(\{ \.\.\.t, href: publicHref\(t\.href\) \?\? "" \}\)\)/);
    expect(src).toMatch(/buildIndicatorRows\(sbp\)\.map\(\(r\) => \(publicHref\(`\/\$\{r\.slug\}`\) \? r : \{ \.\.\.r, slug: "" \}\)\)/);
  });

  it("the page names no login, signup or account route", () => {
    expect(src).not.toMatch(/href="\/(login|signup|settings|subscriptions)/);
  });

  it("the skip link has a target on the page (the no-script fallback for #main-content)", () => {
    expect(src).toContain('id="main-content"');
    expect(read("components/shell/AppHeader.tsx")).toContain('href="#main-content"');
  });
});

describe("components render a link only when they were given a followable address", () => {
  const kpi = { title: "CPI Inflation", value: "9.6", unit: "%", change: "+0.4 pp", source: "SBP", latestDate: "2026-10-01" } as unknown as SnapshotTile["kpi"];
  const tile = (href: string): SnapshotTile => ({ label: "CPI inflation (YoY)", kpi, href });
  const row = (slug: string): IndicatorRow => ({
    id: "cpi", slug, name: "CPI Inflation", group: "Prices", value: "9.6", unit: "%", numericValue: 9.6, change: null, period: "Oct 2026", observationDate: "2026-10-01",
    source: "SBP", freshnessLabel: "Current", freshnessSeverity: "healthy",
  });

  it("snapshot tiles keep their figures and drop only the link", () => {
    const closed = html(createElement(PakistanSnapshot, { tiles: [tile("")] }));
    expect(closed).not.toContain("<a ");
    expect(closed).toContain("9.6");
    expect(closed).toContain("CPI inflation (YoY)");
    expect(html(createElement(PakistanSnapshot, { tiles: [tile("/overview#home-snapshot")] }))).toMatch(/<a [^>]*href="\/overview#home-snapshot"/);
  });

  it("indicator rows keep their figures and drop only the link", () => {
    const closed = html(createElement(IndicatorsTable, { rows: [row("")] }));
    expect(closed).not.toContain("<a ");
    expect(closed).toContain("CPI Inflation");
    expect(closed).toContain("Oct 2026");
    expect(html(createElement(IndicatorsTable, { rows: [row("pakistan-core-inflation")] }))).toContain('href="/pakistan-core-inflation"');
  });

  it("the calendar and macro-intelligence links are not rendered while those pages are closed", () => {
    expect(html(createElement(UpcomingReleases, { rows: [], todayIso: "2026-11-12" }))).not.toMatch(/economic-calendar|Open the calendar/);
    const brief = html(createElement(MacroBrief, { signals: [], asOf: "12 Nov 2026" }));
    expect(brief).not.toMatch(/macro-intelligence|Full analysis/);
    expect(brief).toContain("Computed 12 Nov 2026");
  });
});
