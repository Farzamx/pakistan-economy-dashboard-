// PEIC redesign Phase 2 — the navigation registry is the one place a broken
// or placeholder link could enter the shell, so these tests check it against
// the real filesystem and the real access-control rules rather than trusting
// the hand-written list.

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  APP_NAV,
  INDICATOR_GROUPS,
  INDICATOR_HUB_SLUGS,
  OVERVIEW_SECTIONS,
  activeSectionAt,
  allNavLinks,
  ariaCurrentFor,
  hrefPath,
  matchNavHref,
  resolveActiveNav,
  shortIndicatorLabel,
} from "./appNav";
import { SEO_PAGES } from "./seoConfig";
import { isProtectedPath } from "./protectedSections";

const SRC = path.resolve(__dirname, "..");
const APP = path.join(SRC, "app");

function pageExists(routePath: string): boolean {
  return fs.existsSync(path.join(APP, routePath, "page.tsx"));
}

/** Every `id="…"` literal in the app and components source — the possible in-page anchor targets. */
function collectDomIds(): Set<string> {
  const ids = new Set<string>();
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.tsx$/.test(entry.name) && !/\.test\.tsx$/.test(entry.name)) {
        for (const m of fs.readFileSync(full, "utf8").matchAll(/\bid="([a-z0-9-]+)"/g)) ids.add(m[1]);
      }
    }
  };
  walk(path.join(SRC, "app"));
  walk(path.join(SRC, "components"));
  return ids;
}

describe("registry integrity — no placeholder links", () => {
  const links = allNavLinks();

  it("every destination is a page that exists under src/app", () => {
    const missing = links.map((l) => hrefPath(l.href)).filter((p) => !pageExists(p));
    expect(missing).toEqual([]);
  });

  it("does not link to routes reserved for a later phase", () => {
    for (const reserved of ["/markets", "/news", "/indicators", "/countries"]) {
      expect(links.some((l) => hrefPath(l.href) === reserved), reserved).toBe(false);
      expect(pageExists(reserved), `${reserved} should not exist yet`).toBe(false);
    }
  });

  it("every #anchor points at an id that is actually rendered somewhere", () => {
    const ids = collectDomIds();
    const anchors = links.filter((l) => l.href.includes("#")).map((l) => l.href.split("#")[1]);
    expect(anchors.length).toBeGreaterThan(0);
    expect(anchors.filter((a) => !ids.has(a))).toEqual([]);
  });

  it("link ids and hrefs are unique, so active-state resolution is unambiguous", () => {
    const ids = links.map((l) => l.id);
    const hrefs = links.map((l) => l.href);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    const topIds = APP_NAV.map((e) => e.id);
    expect(new Set(topIds).size).toBe(topIds.length);
  });

  it("every link has a label source", () => {
    for (const l of links) expect(Boolean(l.labelKey || l.label), l.id).toBe(true);
  });

  it("covers every indicator page in SEO_PAGES exactly once (hub pages via the footer)", () => {
    const listed = INDICATOR_GROUPS.flatMap((g) => g.items)
      .filter((i) => i.kind === "link")
      .map((i) => (i.kind === "link" ? hrefPath(i.href).slice(1) : ""));
    for (const page of SEO_PAGES) {
      if ((INDICATOR_HUB_SLUGS as readonly string[]).includes(page.slug)) continue;
      expect(listed.filter((s) => s === page.slug), page.slug).toHaveLength(1);
    }
  });

  it("has the approved top-level order", () => {
    expect(APP_NAV.map((e) => e.id)).toEqual(["overview", "indicators", "markets", "calendar", "news", "research", "tools"]);
  });
});

describe("/overview 'On this page' sections (Phase 2.1)", () => {
  it("every section id is actually rendered somewhere in source", () => {
    const ids = collectDomIds();
    expect(OVERVIEW_SECTIONS.map((s) => s.id).filter((id) => !ids.has(id))).toEqual([]);
  });

  it("indexes the redesigned homepage's own sections (Phase 5 consolidation)", () => {
    // The legacy per-indicator anchors were removed from /overview when the
    // homepage was consolidated; indexing them would produce dead links.
    const ours = OVERVIEW_SECTIONS.map((s) => s.id);
    expect(ours.every((id) => id.startsWith("home-"))).toBe(true);
    expect(ours).toContain("home-markets");
    expect(ours).toContain("home-indicators");
    for (const relocated of ["gdp", "reserves", "inflation", "health-score", "risk-intelligence", "macro-snapshot"]) {
      expect(ours, relocated).not.toContain(relocated);
    }
  });

  it("ids are unique", () => {
    const ids = OVERVIEW_SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  describe("activeSectionAt", () => {
    const pos = [
      { id: "overview", top: -2000 },
      { id: "gdp", top: -300 },
      { id: "reserves", top: 120 },
      { id: "inflation", top: 900 },
    ];
    it("the last section whose top has passed the probe line wins", () => expect(activeSectionAt(pos, 150)).toBe("reserves"));
    it("a section exactly at the line counts", () => expect(activeSectionAt(pos, 120)).toBe("reserves"));
    it("a tall section stays active while its top is above the line", () => expect(activeSectionAt(pos, 100)).toBe("gdp"));
    it("nothing above the first section", () => expect(activeSectionAt([{ id: "overview", top: 400 }], 150)).toBeNull());
    it("empty input", () => expect(activeSectionAt([], 150)).toBeNull());
  });
});

describe("access rules come from isProtectedPath, not the registry", () => {
  const byId = new Map(allNavLinks().map((l) => [l.id, l]));
  const isProtected = (id: string) => isProtectedPath(hrefPath(byId.get(id)!.href));

  it("premium destinations are protected", () => {
    for (const id of ["calendar", "comparisons", "budget", "provincial-budget", "email-alerts"]) expect(isProtected(id), id).toBe(true);
  });

  it("public destinations stay public (indicator pages, the Decision Lab hub, budget explainers)", () => {
    for (const id of ["overview", "ind-inflation-rate-pakistan", "decision-lab", "academy", "macro-intelligence", "budget-tax-money", "gdp-sector-composition"]) {
      expect(isProtected(id), id).toBe(false);
    }
  });
});

describe("shortIndicatorLabel", () => {
  it("drops the implied country, nothing else", () => {
    expect(shortIndicatorLabel("Pakistan Inflation Rate")).toBe("Inflation Rate");
    expect(shortIndicatorLabel("Gold Price in Pakistan")).toBe("Gold Price");
    expect(shortIndicatorLabel("FDI in Pakistan")).toBe("FDI");
    expect(shortIndicatorLabel("USD to PKR Exchange Rate")).toBe("USD to PKR Exchange Rate");
    expect(shortIndicatorLabel("US Fed Funds Rate")).toBe("US Fed Funds Rate");
  });
});

describe("matchNavHref", () => {
  it("exact page", () => expect(matchNavHref("/academy", "/academy")).toBe("page"));
  it("nested route counts as its section", () => expect(matchNavHref("/academy/glossary/inflation", "/academy")).toBe("section"));
  it("a shared prefix that is not a path segment does not match", () => expect(matchNavHref("/budgeting", "/budget")).toBeNull());
  it("hash links are never the current page", () => expect(matchNavHref("/overview", "/overview#global-markets")).toBeNull());
  it("query strings are ignored", () => expect(matchNavHref("/academy", "/academy?tab=paths")).toBe("page"));
  it("unrelated or unknown paths", () => {
    expect(matchNavHref("/login", "/academy")).toBeNull();
    expect(matchNavHref(null, "/academy")).toBeNull();
  });
});

describe("resolveActiveNav", () => {
  const cases: [string, string | null, string | null, "page" | "section" | null][] = [
    ["/overview", "overview", "overview", "page"],
    ["/inflation-rate-pakistan", "indicators", "ind-inflation-rate-pakistan", "page"],
    ["/pakistan-economic-indicators", "indicators", "all-indicators", "page"],
    ["/economic-calendar", "calendar", "calendar", "page"],
    ["/economic-calendar/archive", "calendar", "calendar", "section"],
    ["/macro-intelligence", "research", "macro-intelligence", "page"],
    ["/budget", "research", "budget", "page"],
    // An exact Indicators entry beats Research › Budget Tracker's section match.
    ["/budget/where-does-tax-money-go", "indicators", "budget-tax-money", "page"],
    ["/budget/health", "research", "budget", "section"],
    ["/comparisons/gdp-sector-composition", "indicators", "gdp-sector-composition", "page"],
    ["/comparisons/exports-vs-imports", "research", "comparisons", "section"],
    ["/academy/glossary", "tools", "academy", "section"],
    ["/decision-support-lab/loan-emi", "tools", "decision-lab", "section"],
    ["/login", null, null, null],
    ["/", null, null, null],
  ];
  for (const [pathname, topId, linkId, match] of cases) {
    it(`${pathname} -> ${topId ?? "nothing"}`, () => {
      expect(resolveActiveNav(pathname)).toEqual({ topId, linkId, match });
    });
  }

  it("ariaCurrentFor: page for the exact page, true for a parent section, undefined otherwise", () => {
    expect(ariaCurrentFor(resolveActiveNav("/academy"), "academy")).toBe("page");
    expect(ariaCurrentFor(resolveActiveNav("/academy/glossary"), "academy")).toBe("true");
    expect(ariaCurrentFor(resolveActiveNav("/academy"), "workshop")).toBeUndefined();
  });
});
