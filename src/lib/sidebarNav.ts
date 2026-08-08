// Sidebar content-navigation tree (PEIC v3 nav-hierarchy restructure) — the
// full page/section index that used to live in the horizontal SectionNav
// ribbon underneath the Market Ribbon. TopNav.tsx keeps only global,
// site-level destinations (Overview/Markets/Calendar/Research/Academy/Risk
// Intel/Premium); everything else — every homepage section anchor plus every
// standalone indicator page — lives here instead, grouped the way an
// institutional research site organizes its content rather than as one flat
// list of every section in document order.
//
// Every `anchor` id below is a real element already rendered on the
// homepage (see the `id="..."` attributes in src/app/page.tsx); every
// `route` href is a real existing page in src/app. Nothing here is a new
// page or a new homepage section — only a reorganized index into content
// that already exists.
export type SidebarNavTarget =
  | { kind: "anchor"; id: string }
  | { kind: "route"; href: string };

export interface SidebarNavItem {
  labelKey: string;
  target: SidebarNavTarget;
  /** Phase 6 — a narrow, deliberate exception to this tree's otherwise-uniform bulleted rows (see Sidebar.tsx's own comment on why uniformity is intentional): an accent-colored dot for this one row, display only. */
  flagship?: boolean;
}

export interface SidebarNavGroup {
  key: string;
  labelKey: string;
  items: SidebarNavItem[];
}

export const SIDEBAR_NAV_GROUPS: SidebarNavGroup[] = [
  {
    key: "overview",
    labelKey: "nav.overview",
    items: [
      { labelKey: "nav.executiveSummary", target: { kind: "anchor", id: "overview" } },
      { labelKey: "nav.healthScore", target: { kind: "anchor", id: "health-score" } },
      { labelKey: "nav.macroSnapshot", target: { kind: "anchor", id: "macro-snapshot" } },
      { labelKey: "nav.riskIntel", target: { kind: "anchor", id: "risk-intelligence" } },
      { labelKey: "nav.intelligenceFeed", target: { kind: "anchor", id: "intelligence-feed" } },
    ],
  },
  {
    key: "macroeconomy",
    labelKey: "nav.macroeconomy",
    items: [
      { labelKey: "nav.gdp", target: { kind: "anchor", id: "gdp" } },
      { labelKey: "nav.inflation", target: { kind: "anchor", id: "inflation" } },
      { labelKey: "nav.prices", target: { kind: "anchor", id: "price-indices" } },
      { labelKey: "nav.monetaryPolicy", target: { kind: "anchor", id: "monetary-policy" } },
      // Fiscal Position / Money Supply have no dedicated homepage anchor —
      // both already have their own standalone indicator page, which is a
      // more substantial destination than a shared multi-metric section.
      { labelKey: "kpi.fiscalBalance", target: { kind: "route", href: "/pakistan-fiscal-deficit" } },
      { labelKey: "kpi.moneySupply", target: { kind: "route", href: "/pakistan-money-supply" } },
    ],
  },
  {
    key: "externalSector",
    labelKey: "nav.externalSector",
    items: [
      { labelKey: "dashboard.foreignReserves", target: { kind: "anchor", id: "reserves" } },
      { labelKey: "nav.exchangeRate", target: { kind: "anchor", id: "exchange-rate" } },
      { labelKey: "nav.liveFX", target: { kind: "anchor", id: "live-fx" } },
      { labelKey: "kpi.currentAccount", target: { kind: "route", href: "/current-account-deficit-pakistan" } },
      { labelKey: "kpi.tradeBalance", target: { kind: "route", href: "/pakistan-trade-deficit" } },
      { labelKey: "nav.remittances", target: { kind: "anchor", id: "remittances" } },
      { labelKey: "kpi.externalDebt", target: { kind: "route", href: "/pakistan-external-debt" } },
    ],
  },
  {
    key: "markets",
    labelKey: "topNav.markets",
    items: [
      // "KSE-100 Proxy" (not a translated key) matches the exact wording
      // MarketTicker already uses for this same instrument — this app has no
      // licensed real KSE-100 feed, only the Pakistan ETF proxy, and ticker
      // labels stay in this fixed form across all locales elsewhere too.
      { labelKey: "__kse100Proxy", target: { kind: "route", href: "/pakistan-stock-market" } },
      { labelKey: "nav.bonds", target: { kind: "route", href: "/pakistan-bond-yields" } },
      { labelKey: "nav.yieldCurve", target: { kind: "route", href: "/us-10-year-treasury-yield" } },
      { labelKey: "nav.commodities", target: { kind: "route", href: "/gold-price-pakistan" } },
      { labelKey: "nav.globalMarkets", target: { kind: "anchor", id: "global-markets" } },
    ],
  },
  {
    key: "research",
    labelKey: "nav.research",
    items: [
      { labelKey: "nav.researchLibrary", target: { kind: "anchor", id: "research" } },
      { labelKey: "nav.comparisons", target: { kind: "route", href: "/comparisons" } },
      { labelKey: "nav.academy", target: { kind: "route", href: "/academy" } },
    ],
  },
  {
    key: "tools",
    labelKey: "nav.tools",
    items: [
      { labelKey: "nav.decisionSupportLab", target: { kind: "route", href: "/decision-support-lab" }, flagship: true },
      { labelKey: "nav.budgetTracker", target: { kind: "route", href: "/budget" } },
      { labelKey: "nav.provincialBudget", target: { kind: "route", href: "/provincial-budget" } },
      { labelKey: "nav.economicCalendar", target: { kind: "route", href: "/economic-calendar" } },
      // Points at the real "Data Sources" button already in the Hero's top
      // row (id="overview" is the very top of the homepage) rather than
      // fabricating a second trigger for a modal whose data (kpis) only
      // exists inside page.tsx's Hero render, not in this global sidebar.
      { labelKey: "modal.dsTitle", target: { kind: "anchor", id: "overview" } },
    ],
  },
];

// Real homepage DOM order for every anchor id referenced above — used only
// by the scroll-spy's "last section in view wins" tie-break, independent of
// the tree's own display grouping (which is organized by topic, not by
// where each section physically sits on the page).
export const SIDEBAR_ANCHOR_ORDER: string[] = [
  "overview",
  "macro-snapshot",
  "intelligence-feed",
  "research",
  "health-score",
  "risk-intelligence",
  "gdp",
  "reserves",
  "exchange-rate",
  "live-fx",
  "remittances",
  "inflation",
  "price-indices",
  "monetary-policy",
  "global-markets",
];
