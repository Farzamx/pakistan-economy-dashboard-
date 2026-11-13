// Every surface a visitor sees follows the owner's policy (G.20): the navigation, search and the Overview's own links are COMPLETE for guests and members alike;
// choosing a protected destination as a guest opens the sign-in dialog (which names the section and returns the visitor to it); the sitemap advertises only the
// pages open to everyone; the sign-in pages only ever send a visitor to a path on this site. Hiding a link is not the enforcement (src/proxy.ts is, see
// accessPolicy.test.ts); these tests make sure no surface hides or invents anything on its own.

import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import sitemap, { fullSitemap } from "@/app/sitemap";
import { SEARCH_INDEX, SITE_SEARCH_INDEX, matches } from "@/components/GlobalSearch";
import IndicatorsTable from "@/components/home/IndicatorsTable";
import PakistanSnapshot, { type SnapshotTile } from "@/components/home/PakistanSnapshot";
import type { IndicatorRow } from "@/components/home/indicatorRows";
import { isPublicUrl, requiresLogin } from "@/lib/accessPolicy";
import { APP_NAV, allNavLinks, hrefPath, navLinkForPath, resolveActiveNav } from "@/lib/appNav";
import { SITE_URL } from "@/lib/seoConfig";

const SRC = path.resolve(__dirname, "..");
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), "utf8");
const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);

describe("navigation: complete for everyone", () => {
  const links = allNavLinks(APP_NAV);
  const hrefs = links.map((l) => hrefPath(l.href));

  it("lists every dashboard, indicator, workshop and tool the owner named", () => {
    expect(links.length).toBeGreaterThan(50);
    for (const href of [
      "/overview", "/pakistan-bond-yields", "/budget", "/pakistan-interest-rate", "/inflation-rate-pakistan", "/download-datasets", "/macro-intelligence", "/comparisons",
      "/decision-support-lab", "/economic-calendar", "/pakistan-economic-indicators", "/gdp-breakdown-workshop", "/provincial-budget",
    ]) {
      expect(hrefs, href).toContain(href);
    }
  });

  it("keeps its categories, dropdown menus and sub-groups", () => {
    const menus = APP_NAV.filter((e) => e.kind === "menu");
    expect(menus.length).toBeGreaterThanOrEqual(3);
    expect(menus.some((m) => m.kind === "menu" && m.groups.length > 1)).toBe(true);
  });

  it("hides nothing based on sign-in status: the header and the drawer render the whole registry, with no filter", () => {
    for (const f of ["components/shell/AppHeader.tsx", "components/shell/MobileDrawer.tsx"]) {
      const src = read(f);
      expect(src, f).toMatch(/\bAPP_NAV\.map/);
      expect(src, f).not.toMatch(/PUBLIC_APP_NAV|filterNavForAccess|isPublicPagePath|ACCOUNT_UI_ENABLED/);
    }
    expect(read("lib/appNav.ts")).not.toMatch(/PUBLIC_APP_NAV|filterNavForAccess|NAVIGATION_ONLY_OVERVIEW/);
  });

  it("every link to a protected page is intercepted for guests by the shared gate (the sign-in dialog), and the Overview never is", () => {
    const protectedLinks = links.filter((l) => requiresLogin(l.href));
    expect(protectedLinks.length).toBeGreaterThan(40);
    expect(requiresLogin("/overview")).toBe(false);
    expect(links.filter((l) => !requiresLogin(l.href)).map((l) => hrefPath(l.href))).toEqual(expect.arrayContaining(["/overview"]));
    // both shells route every click through the same hook, which asks the central policy
    expect(read("components/shell/AppHeader.tsx")).toContain("useGuestGate()"); // the header owns the gate and the dialog...
    expect(read("components/shell/MobileDrawer.tsx")).toContain("if (gate(e, href))"); // ...and the drawer asks it on every link click
    const hook = read("components/shell/shellHooks.tsx");
    expect(hook).toMatch(/isProtectedPath\(hrefPath\(href\)\)/);
    expect(hook).toMatch(/if \(loading \|\| user \|\| !isProtectedPath/);
    expect(read("lib/protectedSections.ts")).toMatch(/requiresLogin/);
  });

  it("the guest dialog closes on any route change (found in the browser: it stayed open over /login and blocked the sign-in form)", () => {
    const hook = read("components/shell/shellHooks.tsx");
    expect(hook).toContain("const pathname = usePathname();");
    expect(hook.replace(/\s+/g, " ")).toContain("if (pathname !== lastPathname) { setLastPathname(pathname); setDestination(null); }");
  });

  it("the Overview is the active page on /overview", () => {
    expect(resolveActiveNav("/overview")).toEqual({ topId: "overview", linkId: "overview", match: "page" });
  });

  it("navLinkForPath names the section a visitor asked for (and nothing for a page without an entry)", () => {
    expect(navLinkForPath("/pakistan-bond-yields")?.id).toBeTruthy();
    expect(navLinkForPath("/budget#x")?.href).toBe("/budget");
    expect(navLinkForPath("/budget/some-detail-page-without-an-entry")).toBeNull();
  });
});

describe("account UI is back for everyone", () => {
  it("the shell no longer hides Log in, Sign up or the account menu behind a switch", () => {
    for (const f of ["components/shell/AccountControl.tsx", "components/shell/MobileDrawer.tsx", "components/MobileStickyCta.tsx", "components/shell/AppHeader.tsx"]) {
      expect(read(f), f).not.toMatch(/ACCOUNT_UI_ENABLED/);
    }
    expect(read("lib/accessPolicy.ts")).not.toMatch(/ACCOUNT_UI_ENABLED/);
  });

  it("the guest dialog offers Log in and Sign up, both carrying the destination, and names the section asked for", () => {
    const modal = read("components/GuestAccessModal.tsx");
    expect(modal).toMatch(/href=\{`\/login\$\{redirectQuery\}`\}/);
    expect(modal).toMatch(/href=\{`\/signup\$\{redirectQuery\}`\}/);
    expect(modal).toContain("encodeURIComponent(destination)");
    expect(modal).toContain("navLinkForPath");
    expect(modal).toContain('data-testid="guest-modal-destination"');
  });
});

describe("search", () => {
  const anchors = SITE_SEARCH_INDEX.filter((e) => e.href.startsWith("/overview#")).map((e) => e.href);
  const overviewSource = read("app/overview/page.tsx");

  it("is complete for guests: every dashboard, workshop and tool can be found", () => {
    const find = (q: string) => SITE_SEARCH_INDEX.filter((e) => matches(e, q)).map((e) => e.href);
    expect(find("budget")).toContain("/budget");
    expect(find("bond")).toContain("/pakistan-bond-yields");
    expect(find("yield curve")).toContain("/pakistan-bond-yields");
    expect(find("inflation").length).toBeGreaterThan(0);
    // the complete index (minus its legacy /overview#... anchors, which are replaced by the Overview's real sections)
    expect(SITE_SEARCH_INDEX.length).toBeGreaterThan(40);
    expect(SITE_SEARCH_INDEX.length).toBeGreaterThanOrEqual(SEARCH_INDEX.filter((e) => !e.href.startsWith("/overview#")).length);
  });

  it("every Overview anchor it offers exists on the page (no dead results)", () => {
    expect(anchors.length).toBeGreaterThan(4);
    for (const href of anchors) expect(overviewSource, href).toMatch(new RegExp(`id="${href.split("#")[1]}"`));
  });

  it("the search box uses the complete index, and the complete index is preserved", () => {
    expect(SEARCH_INDEX.some((e) => e.href === "/budget")).toBe(true);
    expect(read("components/GlobalSearch.tsx")).toContain("rankedMatches(SITE_SEARCH_INDEX, query)");
    expect(read("components/GlobalSearch.tsx")).not.toMatch(/isPublicPagePath|PUBLIC_SEARCH_INDEX/);
  });
});

describe("sitemap and robots", () => {
  it("the published sitemap lists the pages open to everyone and nothing protected", async () => {
    const entries = (await sitemap()).map((e) => e.url).sort();
    expect(entries).toEqual([SITE_URL, `${SITE_URL}/overview`].sort());
  });

  it("the complete sitemap is preserved, and every entry that needs a sign-in is filtered out", async () => {
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

describe("the Overview page keeps every section and link", () => {
  const src = read("app/overview/page.tsx");

  it("renders Explore, Provincial budgets and Popular insights unconditionally, with a link on every tile and row", () => {
    expect(src).toMatch(/<Section id="home-explore" title="Explore" flush>/);
    expect(src).toMatch(/<Section id="home-provincial" title="Provincial budgets" flush>/);
    expect(src).toMatch(/<PopularInsights \/>/);
    expect(src).not.toMatch(/offersMoreThanOverview|publicHref|isPublicPagePath/);
    expect(src).toMatch(/href: slug \? `\/\$\{slug\}` : undefined/);
    expect(src).toMatch(/All indicators →/);
    expect(src).toMatch(/Calendar →/);
  });

  it("is itself open to guests and carries no account gate", () => {
    expect(requiresLogin("/overview")).toBe(false);
    expect(src).not.toMatch(/useAuth|redirect\(["'`]\/login/);
  });

  it("the skip link has a target on the page (the no-script fallback for #main-content)", () => {
    expect(src).toContain('id="main-content"');
    expect(read("components/shell/AppHeader.tsx")).toContain('href="#main-content"');
  });
});

describe("components render the links they are given", () => {
  const kpi = { title: "CPI Inflation", value: "9.6", unit: "%", change: "+0.4 pp", source: "SBP", latestDate: "2026-10-01" } as unknown as SnapshotTile["kpi"];
  const tile = (href: string): SnapshotTile => ({ label: "CPI inflation (YoY)", kpi, href });
  const row = (slug: string): IndicatorRow => ({
    id: "cpi", slug, name: "CPI Inflation", group: "Prices", value: "9.6", unit: "%", numericValue: 9.6, change: null, period: "Oct 2026", observationDate: "2026-10-01",
    source: "SBP", freshnessLabel: "Current", freshnessSeverity: "healthy",
  });

  it("snapshot tiles and indicator rows link to their indicator page", () => {
    expect(html(createElement(PakistanSnapshot, { tiles: [tile("/inflation-rate-pakistan")] }))).toMatch(/<a [^>]*href="\/inflation-rate-pakistan"/);
    expect(html(createElement(IndicatorsTable, { rows: [row("pakistan-core-inflation")] }))).toContain('href="/pakistan-core-inflation"');
  });

  it("a tile or row without an address still shows its figures (the components stay tolerant)", () => {
    const bare = html(createElement(PakistanSnapshot, { tiles: [tile("")] }));
    expect(bare).toContain("9.6");
    expect(html(createElement(IndicatorsTable, { rows: [row("")] }))).toContain("CPI Inflation");
  });
});

describe("the sign-in flow only ever returns a visitor to this site", () => {
  it("the login and signup pages validate the destination, show why login is required, and carry it between the two pages", () => {
    for (const f of ["app/login/page.tsx", "app/signup/page.tsx"]) {
      const src = read(f);
      expect(src, f).toContain("safeRedirectPath(params.redirect)");
      expect(src, f).toContain("LoginRequiredNotice");
      expect(src, f).toContain("requiresLogin(redirectTo)");
    }
    expect(read("app/login/page.tsx")).toMatch(/\/signup\?redirect=/);
    expect(read("app/signup/page.tsx")).toMatch(/\/login\?redirect=/);
    expect(read("app/signup/page.tsx")).toMatch(/<SignUpForm redirectTo=\{redirectTo\}/);
  });

  it("the server actions and the auth callback never redirect to a raw, client-supplied address", () => {
    const actions = read("app/auth/actions.ts");
    expect(actions).toMatch(/safeRedirectPath\(formData\.get\("redirectTo"\)\)/);
    expect(actions).not.toMatch(/redirect\(redirectTo \|\| "\/"\)/);
    expect(actions).not.toMatch(/String\(formData\.get\("redirectTo"\) \?\? "\/"\)/);
    const callback = read("app/auth/callback/route.ts");
    expect(callback).toContain("safeRedirectPath(");
    expect(callback).not.toMatch(/searchParams\.get\("next"\) \?\? "\/"/);
  });

  it("a new member's destination survives the e-mail confirmation (kept in a short-lived httpOnly cookie, not in the e-mail link)", () => {
    const actions = read("app/auth/actions.ts");
    expect(actions).toContain("AFTER_AUTH_COOKIE");
    expect(actions).toMatch(/httpOnly: true/);
    expect(actions).toMatch(/emailRedirectTo: `\$\{origin\}\/auth\/callback`/);
    expect(read("app/auth/callback/route.ts")).toMatch(/jar\.delete\(AFTER_AUTH_COOKIE\)/);
  });
});
