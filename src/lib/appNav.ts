// Application navigation registry (PEIC redesign, Phase 2 — shared shell).
//
// Single source of truth for the compact top navigation (AppHeader) and the
// mobile drawer (MobileDrawer), so the two can never drift apart. Every
// `href` here is a page that already exists under src/app — appNav.test.ts
// checks each one against the filesystem, so a placeholder link fails the
// test suite instead of shipping. Deliberately NO /markets, /news or
// /indicators: those routes belong to a later approved phase, so "Markets"
// and "News" point at the existing /overview sections that serve those roles
// today (the same destinations the previous TopNav/MobileNav used).
//
// Indicator pages are taken from SEO_PAGES (src/lib/seoConfig.ts) — the
// registry the indicator template and GlobalSearch already use — rather than
// src/lib/sidebarNav.ts, which only indexed 8 of the 38 indicator pages.
//
// Access control is NOT stored here. Whether a destination needs a signed-in
// user is always asked of isProtectedPath() at click time, so this file can
// never disagree with src/proxy.ts's server-side enforcement.

import { SEO_PAGES } from "@/lib/seoConfig";

export type NavLinkItem = {
  kind: "link";
  /** Stable id, unique across the whole registry. */
  id: string;
  href: string;
  /** Translation key. Takes precedence over `label`. */
  labelKey?: string;
  /** Fixed label — used for indicator page names, which (like GlobalSearch's
   *  results and the "KSE-100 Proxy" ticker label) are not translated today. */
  label?: string;
};

/** A menu entry that runs an action instead of navigating (e.g. open Settings). */
export type NavActionItem = {
  kind: "action";
  id: "settings";
  labelKey: string;
};

export type NavItem = NavLinkItem | NavActionItem;

export interface NavGroup {
  id: string;
  /** Group heading; omitted for single-group menus. */
  labelKey?: string;
  items: NavItem[];
}

export type TopNavEntry =
  | (NavLinkItem & { kind: "link" })
  | {
      kind: "menu";
      id: string;
      labelKey: string;
      groups: NavGroup[];
      /** Optional "see everything" link rendered below the groups. */
      footer?: NavLinkItem;
    };

// Indicator page labels in SEO_PAGES are written for page titles ("Pakistan
// Inflation Rate", "Gold Price in Pakistan"). Inside a menu titled
// "Indicators" on a Pakistan site the country is implied, so it is trimmed for
// scanability. The full title is still what the page itself renders.
export function shortIndicatorLabel(label: string): string {
  return label.replace(/^Pakistan\s+/, "").replace(/\s+in Pakistan$/, "").replace(/\s+Pakistan$/, "");
}

function indicator(slug: string): NavLinkItem {
  const page = SEO_PAGES.find((p) => p.slug === slug);
  if (!page) throw new Error(`appNav: "${slug}" is not in SEO_PAGES — add the page there first`);
  return { kind: "link", id: `ind-${slug}`, href: `/${slug}`, label: shortIndicatorLabel(page.label) };
}

/** Indicator pages that are hubs rather than single indicators — linked from the menu footer, not listed as items. */
export const INDICATOR_HUB_SLUGS = ["pakistan-economic-indicators", "pakistan-economic-dashboard"] as const;

export const INDICATOR_GROUPS: NavGroup[] = [
  {
    id: "prices",
    labelKey: "nav.prices",
    items: [
      indicator("inflation-rate-pakistan"),
      indicator("pakistan-core-inflation"),
      indicator("pakistan-food-inflation"),
      indicator("pakistan-wholesale-inflation"),
      indicator("weekly-inflation-pakistan"),
      indicator("spi-index-pakistan"),
    ],
  },
  {
    id: "money-rates",
    labelKey: "appNav.moneyRates",
    items: [
      indicator("pakistan-interest-rate"),
      indicator("pakistan-bond-yields"),
      indicator("pakistan-money-supply"),
      indicator("pakistan-private-credit-growth"),
      indicator("pakistan-bank-reserves"),
    ],
  },
  {
    id: "external",
    labelKey: "nav.externalSector",
    items: [
      indicator("foreign-exchange-reserves-pakistan"),
      indicator("usd-pkr-exchange-rate"),
      indicator("eur-to-pkr-exchange-rate"),
      indicator("gbp-to-pkr-exchange-rate"),
      indicator("sar-to-pkr-exchange-rate"),
      indicator("pakistan-real-effective-exchange-rate"),
      indicator("current-account-deficit-pakistan"),
      indicator("pakistan-trade-deficit"),
      indicator("pakistan-exports"),
      indicator("pakistan-imports"),
      indicator("pakistan-remittances"),
      indicator("fdi-in-pakistan"),
      indicator("pakistan-external-debt"),
    ],
  },
  {
    id: "fiscal",
    labelKey: "appNav.fiscal",
    items: [
      indicator("pakistan-fiscal-deficit"),
      // Public (non-premium) federal-budget explainer pages. Fixed English
      // labels are shortened from their page titles ("Where Does Pakistan's
      // Tax Money Actually Go?", "Debt Servicing vs Defence Spending —
      // Pakistan's Federal Budget"); not in SEO_PAGES because they are
      // budget-workspace content, not indicator-template pages.
      { kind: "link", id: "budget-tax-money", href: "/budget/where-does-tax-money-go", label: "Where Does the Tax Money Go?" },
      { kind: "link", id: "budget-debt-vs-defence", href: "/budget/debt-servicing-vs-defence", label: "Debt Servicing vs Defence" },
    ],
  },
  {
    id: "real-economy",
    labelKey: "nav.realEconomy",
    items: [
      indicator("gdp-growth-pakistan"),
      indicator("pakistan-lsm-growth"),
      // Label shortened from SECTOR_COMPOSITION.title ("Pakistan GDP Composition by Sector").
      { kind: "link", id: "gdp-sector-composition", href: "/comparisons/gdp-sector-composition", label: "GDP Composition by Sector" },
      indicator("pakistan-stock-market"),
    ],
  },
  {
    // Not one of the five Pakistan groups, but these pages exist and would
    // otherwise be unreachable from the menu (the old sidebar linked only Gold).
    id: "global-markets",
    labelKey: "nav.globalMarkets",
    items: [
      indicator("gold-price-pakistan"),
      indicator("silver-price-pakistan"),
      indicator("wti-crude-oil-price"),
      indicator("brent-crude-oil-price"),
      indicator("natural-gas-price"),
      indicator("us-dollar-index"),
      indicator("us-10-year-treasury-yield"),
      indicator("fed-funds-rate"),
    ],
  },
];

export const APP_NAV: TopNavEntry[] = [
  { kind: "link", id: "overview", href: "/overview", labelKey: "nav.overview" },
  {
    kind: "menu",
    id: "indicators",
    labelKey: "nav.indicators",
    groups: INDICATOR_GROUPS,
    footer: { kind: "link", id: "all-indicators", href: "/pakistan-economic-indicators", labelKey: "appNav.allIndicators" },
  },
  // No /markets or /news route exists yet (later phase) — these point at the
  // redesigned homepage's own Markets and Headlines sections (Phase 5: the
  // legacy #global-markets / #news-intelligence anchors no longer exist).
  { kind: "link", id: "markets", href: "/overview#home-markets", labelKey: "topNav.markets" },
  { kind: "link", id: "calendar", href: "/economic-calendar", labelKey: "topNav.calendar" },
  { kind: "link", id: "news", href: "/overview#home-headlines", labelKey: "nav.news" },
  {
    kind: "menu",
    id: "research",
    labelKey: "nav.research",
    groups: [
      {
        id: "research-main",
        items: [
          { kind: "link", id: "macro-intelligence", href: "/macro-intelligence", labelKey: "topNav.macroIntelligenceLong" },
          { kind: "link", id: "comparisons", href: "/comparisons", labelKey: "nav.comparisons" },
          { kind: "link", id: "budget", href: "/budget", labelKey: "nav.budgetTracker" },
          { kind: "link", id: "provincial-budget", href: "/provincial-budget", labelKey: "nav.provincialBudget" },
          // Phase 5: risk intelligence moved to /macro-intelligence with the
          // rest of the weekly analysis; the Research Library teaser was
          // retired, so this points at the homepage's Explore section, which
          // is the surviving index of research destinations.
          { kind: "link", id: "risk-intel", href: "/macro-intelligence#risk-intelligence", labelKey: "nav.riskIntel" },
          { kind: "link", id: "research-library", href: "/overview#home-explore", labelKey: "nav.researchLibrary" },
        ],
      },
    ],
  },
  {
    kind: "menu",
    id: "tools",
    labelKey: "nav.tools",
    groups: [
      {
        id: "tools-main",
        items: [
          { kind: "link", id: "decision-lab", href: "/decision-support-lab", labelKey: "nav.decisionSupportLab" },
          { kind: "link", id: "academy", href: "/academy", labelKey: "nav.academy" },
          { kind: "link", id: "workshop", href: "/workshop", labelKey: "nav.workshop" },
          { kind: "link", id: "email-alerts", href: "/economic-calendar#email-alerts", labelKey: "nav.freeSubscription" },
          // An action, not a link: the Settings modal (language + theme) is
          // usable by guests, whereas /settings/preferences requires sign-in.
          { kind: "action", id: "settings", labelKey: "nav.settings" },
          { kind: "link", id: "back-to-site", href: "/home", labelKey: "appNav.backToSite" },
        ],
      },
    ],
  },
];

// ── /overview "On this page" (redesign Phase 2.1) ─────────────────────────
// Replaces the retired sidebar's scroll-spy, which highlighted the /overview
// section in view inside its navigation tree. Every id below is rendered on
// /overview today, listed in DOM order (verified in the browser; appNav.test
// checks each id exists in source). This covers the 15 sections the sidebar
// tracked plus the five it never indexed (macro intelligence, external
// sector, real economy, news). A section a signed-in user has hidden
// (HideableSection) is simply absent from the DOM and skipped at runtime.

export const OVERVIEW_PATH = "/overview";

// Phase 5 (homepage consolidation): the legacy per-indicator sections this
// list used to index (gdp, reserves, inflation, …) no longer exist on
// /overview — their charts live on the indicator pages, and the detailed
// macro dashboard, health score, risk intelligence and intelligence feed
// moved to /macro-intelligence. These are the sections the redesigned
// homepage actually renders, in DOM order.
export const OVERVIEW_SECTIONS: { id: string; labelKey: string }[] = [
  { id: "home-markets", labelKey: "topNav.markets" },
  { id: "home-snapshot", labelKey: "nav.macroSnapshot" },
  { id: "home-headlines", labelKey: "nav.news" },
  { id: "home-releases", labelKey: "nav.calendar" },
  { id: "home-macro-brief", labelKey: "topNav.macroIntelligenceLong" },
  { id: "home-indicators", labelKey: "nav.indicators" },
  { id: "home-explore", labelKey: "nav.research" },
  { id: "home-provincial", labelKey: "nav.provincialBudget" },
];

/**
 * The section "in view": the last one (in document order) whose top edge has
 * scrolled above `probe` — a line a fixed distance below the sticky header.
 * The same "last section past the line wins" rule the sidebar's
 * IntersectionObserver used, without its blind spots for tall sections.
 * `positions` must be in document order; returns null above the first one.
 */
export function activeSectionAt(positions: { id: string; top: number }[], probe: number): string | null {
  let current: string | null = null;
  for (const p of positions) if (p.top <= probe) current = p.id;
  return current;
}

/** Path portion of an href (no query, no hash). */
export function hrefPath(href: string): string {
  return href.split("#")[0].split("?")[0];
}

export type NavMatch = "page" | "section" | null;

/**
 * How `href` relates to the current pathname:
 *   "page"    — it is exactly the current page;
 *   "section" — the current page is nested under it (e.g. /academy for /academy/glossary);
 *   null      — unrelated.
 * Hash links ("/overview#global-markets") point at a section of a page, not a
 * page, so they are never reported as the current page — otherwise "Markets",
 * "News" and "Overview" would all light up together on /overview.
 */
export function matchNavHref(pathname: string | null | undefined, href: string): NavMatch {
  if (!pathname || href.includes("#")) return null;
  const path = hrefPath(href);
  if (pathname === path) return "page";
  if (path !== "/" && pathname.startsWith(`${path}/`)) return "section";
  return null;
}

/** Every link in the registry, in display order. */
export function allNavLinks(nav: TopNavEntry[] = APP_NAV): NavLinkItem[] {
  return nav.flatMap((entry) =>
    entry.kind === "link"
      ? [entry]
      : [...entry.groups.flatMap((g) => g.items.filter((i): i is NavLinkItem => i.kind === "link")), ...(entry.footer ? [entry.footer] : [])],
  );
}

export interface ActiveNav {
  /** Id of the top-level entry to highlight (a link or a menu). */
  topId: string | null;
  /** Id of the single link that best matches the current page, if any. */
  linkId: string | null;
  match: NavMatch;
}

/**
 * Resolves the one active destination for the current pathname. An exact page
 * match beats a nested-section match, and among section matches the most
 * specific (longest) path wins — so /budget/where-does-tax-money-go
 * highlights its own Indicators entry, not Research › Budget Tracker.
 */
export function resolveActiveNav(pathname: string | null | undefined, nav: TopNavEntry[] = APP_NAV): ActiveNav {
  let best: { topId: string; linkId: string; match: NavMatch; len: number } | null = null;
  for (const entry of nav) {
    const links = entry.kind === "link" ? [entry] : allNavLinks([entry]);
    for (const link of links) {
      const match = matchNavHref(pathname, link.href);
      if (!match) continue;
      const len = hrefPath(link.href).length;
      const better = !best || (match === "page" && best.match !== "page") || (match === best.match && len > best.len);
      if (better) best = { topId: entry.id, linkId: link.id, match, len };
    }
  }
  return best ? { topId: best.topId, linkId: best.linkId, match: best.match } : { topId: null, linkId: null, match: null };
}

/** aria-current value for a link: "page" for the current page, "true" for its parent section. */
export function ariaCurrentFor(active: ActiveNav, linkId: string): "page" | "true" | undefined {
  if (active.linkId !== linkId) return undefined;
  return active.match === "page" ? "page" : "true";
}
