// Cross-category internal-linking layer (SEO Architecture Migration, Phase
// B) — computes "Related Indicators" / "Related Provincial Pages" / "Related
// Budget Topics" link groups for Comparisons, Budget, and Provincial pages.
// Deliberately separate from each category's own same-category "related"
// section (e.g. comparisonRegistry-driven "Related Comparisons" on
// /comparisons/[slug]): this file only computes the CROSS-category links
// those sections don't cover. Every mapping below is hand-curated against
// the real registries (comparisonRegistry.ts, budgetRegistry.ts,
// provincialSeoPages.ts, seoConfig.ts) rather than derived heuristically, so
// every link points at content that's actually topically related.

import { SEO_PAGES } from "@/lib/seoConfig";
import type { BudgetCategoryId } from "@/lib/budget/budgetRegistry";
import { PROVINCES } from "@/lib/provincial/provincialBudgetRegistry";
import { PROVINCIAL_SEO_PAGES, getCrossComparisonSeoPages, type ProvincialSeoPageDef } from "@/lib/provincial/provincialSeoPages";
import type { EventCategory } from "@/lib/economicCalendar/economicCalendarTypes";

export interface RelatedLink {
  href: string;
  label: string;
}

export interface RelatedGroup {
  heading: string;
  links: RelatedLink[];
}

function indicatorLinks(slugs: string[]): RelatedLink[] {
  return slugs
    .map((slug) => SEO_PAGES.find((p) => p.slug === slug))
    .filter((p): p is NonNullable<typeof p> => p !== undefined)
    .map((p) => ({ href: `/${p.slug}`, label: p.label }));
}

// Comparison slug -> standalone indicator page slugs (SEO_PAGES).
const COMPARISON_INDICATOR_LINKS: Record<string, string[]> = {
  "usd-pkr-vs-forex-reserves": ["usd-pkr-exchange-rate", "foreign-exchange-reserves-pakistan"],
  "current-account-vs-forex-reserves": ["current-account-deficit-pakistan", "foreign-exchange-reserves-pakistan"],
  "external-debt-vs-forex-reserves": ["pakistan-external-debt", "foreign-exchange-reserves-pakistan"],
  "exports-vs-imports": ["pakistan-trade-deficit"],
  "trade-balance-vs-usd-pkr": ["pakistan-trade-deficit", "usd-pkr-exchange-rate"],
  "inflation-vs-policy-rate": ["inflation-rate-pakistan", "pakistan-interest-rate"],
  "inflation-vs-core-inflation": ["inflation-rate-pakistan"],
  "inflation-vs-money-supply": ["inflation-rate-pakistan"],
  "inflation-vs-urban-food-inflation": ["inflation-rate-pakistan", "pakistan-food-inflation", "spi-index-pakistan", "weekly-inflation-pakistan"],
  "pakistan-vs-us-inflation": ["inflation-rate-pakistan"],
  "pakistan-vs-fed-funds-rate": ["pakistan-interest-rate"],
  "pakistan-vs-india-gdp-growth": ["gdp-growth-pakistan"],
  "pakistan-vs-bangladesh-gdp-growth": ["gdp-growth-pakistan"],
  "gold-vs-usd-pkr": ["gold-price-pakistan", "usd-pkr-exchange-rate"],
  "gold-vs-treasury-bills": ["gold-price-pakistan", "pakistan-bond-yields"],
  "gdp-sector-composition": ["gdp-growth-pakistan"],
};

// Comparison slug -> other comparison slugs OUTSIDE its own registry group —
// the same-group "Related Comparisons" section on each /comparisons/[slug]
// page can't surface these (it only ever looks within def.group), and
// "GDP Sector Composition" (group: "economic-structure", with no other
// member) would otherwise get zero inbound comparison links at all.
const COMPARISON_CROSS_GROUP_LINKS: Record<string, { slug: string; label: string }[]> = {
  "pakistan-vs-india-gdp-growth": [{ slug: "gdp-sector-composition", label: "GDP Sector Composition" }],
  "pakistan-vs-bangladesh-gdp-growth": [{ slug: "gdp-sector-composition", label: "GDP Sector Composition" }],
  "gdp-sector-composition": [
    { slug: "pakistan-vs-india-gdp-growth", label: "Pakistan vs India GDP Growth" },
    { slug: "pakistan-vs-bangladesh-gdp-growth", label: "Pakistan vs Bangladesh GDP Growth" },
  ],
};

export function getComparisonRelatedContent(slug: string): RelatedGroup[] {
  const groups: RelatedGroup[] = [];
  const crossGroup = COMPARISON_CROSS_GROUP_LINKS[slug];
  if (crossGroup?.length) {
    groups.push({
      heading: "Also See",
      links: crossGroup.map((c) => ({ href: `/comparisons/${c.slug}`, label: c.label })),
    });
  }
  const indicators = indicatorLinks(COMPARISON_INDICATOR_LINKS[slug] ?? []);
  if (indicators.length > 0) groups.push({ heading: "Related Indicators", links: indicators });
  return groups;
}

// Budget category id -> { provincial SEO slugs, standalone indicator slugs }.
const BUDGET_CATEGORY_CROSS_LINKS: Record<BudgetCategoryId, { provincial?: { slug: string; label: string }[]; indicators?: string[] }> = {
  debtServicing: {
    provincial: [
      { slug: "provincial-debt-comparison", label: "Provincial Debt Comparison" },
      { slug: "debt-burden-rankings", label: "Provincial Debt Burden Rankings" },
    ],
    indicators: ["pakistan-external-debt"],
  },
  defence: {},
  federalPsdp: {
    provincial: [{ slug: "development-spending-rankings", label: "Provincial Development Spending Rankings" }],
  },
  subsidies: {},
  fiscalDeficit: {
    indicators: ["pakistan-fiscal-deficit"],
  },
  provincialTransfer: {
    provincial: [
      { slug: "rankings", label: "Province Rankings" },
      { slug: "own-revenue-rankings", label: "Provincial Own Revenue Rankings" },
    ],
  },
  federalEducation: {
    provincial: [
      { slug: "provincial-education-comparison", label: "Provincial Education Spending Comparison" },
      { slug: "punjab-education-budget", label: "Punjab Education Budget" },
    ],
  },
  federalHealth: {
    provincial: [
      { slug: "provincial-health-comparison", label: "Provincial Health Spending Comparison" },
      { slug: "sindh-health-budget", label: "Sindh Health Budget" },
    ],
  },
};

export function getBudgetCategoryRelatedContent(id: BudgetCategoryId): RelatedGroup[] {
  const cross = BUDGET_CATEGORY_CROSS_LINKS[id];
  const groups: RelatedGroup[] = [];
  if (cross.provincial?.length) {
    groups.push({
      heading: "Related Provincial Pages",
      links: cross.provincial.map((p) => ({ href: `/provincial-budget/${p.slug}`, label: p.label })),
    });
  }
  if (cross.indicators?.length) {
    groups.push({ heading: "Related Indicators", links: indicatorLinks(cross.indicators) });
  }
  return groups;
}

// Short, pill-friendly label for a provincial SEO page — its title up to the
// first em-dash, since several titles (e.g. "Punjab Budget — Total Outlay,
// Development & Sector Spending") are written for <title>/<h1>, not a link.
export function shortProvincialLabel(page: ProvincialSeoPageDef): string {
  return page.title.split(" — ")[0];
}

/**
 * Cross-links for the 16 /provincial-budget/[slug] SEO pages (the
 * province-overview/category/cross-comparison/growth-explorer/ranking-dashboard
 * pages rendered by ProvincialSeoTemplate) — every one of these previously
 * had exactly one inbound link (from its own province workspace or
 * /provincial-budget/compare) and no outbound links beyond a single "back to
 * workspace" line. This adds same-type sibling links plus the one or two
 * genuinely-matching cross-type pages (e.g. a field-matched ranking <->
 * cross-comparison pair), so every page sits in a small mesh rather than a
 * dead end.
 */
export function getProvincialSeoPageRelatedContent(page: ProvincialSeoPageDef): RelatedGroup[] {
  const groups: RelatedGroup[] = [];

  if (page.type === "province-overview" || page.type === "province-category") {
    if (page.field) {
      const comparisonMatch = PROVINCIAL_SEO_PAGES.find((p) => p.type === "cross-comparison" && p.field === page.field);
      if (comparisonMatch) {
        groups.push({
          heading: "Compare Across Provinces",
          links: [{ href: `/provincial-budget/${comparisonMatch.slug}`, label: shortProvincialLabel(comparisonMatch) }],
        });
      }
    }
    const siblingOverviews = PROVINCIAL_SEO_PAGES.filter((p) => p.type === "province-overview" && p.slug !== page.slug);
    groups.push({
      heading: "Other Provinces",
      links: siblingOverviews.map((p) => ({ href: `/provincial-budget/${p.slug}`, label: shortProvincialLabel(p) })),
    });
    groups.push({
      heading: "Rankings & Tools",
      links: [
        { href: "/provincial-budget/rankings", label: "Province Rankings" },
        { href: "/provincial-budget/growth-explorer", label: "Growth Explorer" },
      ],
    });
  }

  if (page.type === "cross-comparison") {
    const siblings = getCrossComparisonSeoPages().filter((p) => p.slug !== page.slug);
    const rankingMatch = PROVINCIAL_SEO_PAGES.find((p) => p.type === "ranking-dashboard" && p.field === page.field);
    groups.push({
      heading: "Other Comparisons",
      links: siblings.map((p) => ({ href: `/provincial-budget/${p.slug}`, label: p.fieldLabel ? `${p.fieldLabel} Comparison` : shortProvincialLabel(p) })),
    });
    if (rankingMatch) {
      groups.push({
        heading: "Related Ranking",
        links: [{ href: `/provincial-budget/${rankingMatch.slug}`, label: shortProvincialLabel(rankingMatch) }],
      });
    }
  }

  if (page.type === "ranking-dashboard") {
    const siblings = PROVINCIAL_SEO_PAGES.filter((p) => p.type === "ranking-dashboard" && p.slug !== page.slug);
    const comparisonMatch = PROVINCIAL_SEO_PAGES.find((p) => p.type === "cross-comparison" && p.field === page.field);
    groups.push({
      heading: "Other Rankings",
      links: siblings.map((p) => ({ href: `/provincial-budget/${p.slug}`, label: p.fieldLabel ? `${p.fieldLabel} Rankings` : shortProvincialLabel(p) })),
    });
    if (comparisonMatch) {
      groups.push({
        heading: "Related Comparison",
        links: [{ href: `/provincial-budget/${comparisonMatch.slug}`, label: shortProvincialLabel(comparisonMatch) }],
      });
    }
    groups.push({
      heading: "Browse by Province",
      links: PROVINCES.map((p) => ({ href: `/provincial-budget/${p.slug}`, label: `${p.name} Budget Workshop` })),
    });
  }

  if (page.type === "growth-explorer") {
    groups.push({
      heading: "Browse by Province",
      links: PROVINCES.map((p) => ({ href: `/provincial-budget/${p.slug}`, label: `${p.name} Budget Workshop` })),
    });
    groups.push({
      heading: "Cross-Province Comparisons",
      links: getCrossComparisonSeoPages().map((p) => ({ href: `/provincial-budget/${p.slug}`, label: shortProvincialLabel(p) })),
    });
  }

  return groups;
}

// Economic Calendar event category -> standalone indicator page slugs
// (SEO_PAGES) — "Related Indicators" on /economic-calendar/event/[slug] and
// /economic-calendar/archive/[slug]. One list per category rather than per
// series/event, since every event in a category (e.g. every CPI and SPI
// release, both "Inflation") points at the same handful of indicator pages.
const EVENT_CATEGORY_INDICATOR_LINKS: Record<EventCategory, string[]> = {
  Inflation: ["inflation-rate-pakistan", "weekly-inflation-pakistan", "pakistan-food-inflation", "spi-index-pakistan"],
  "Monetary Policy": ["pakistan-interest-rate", "pakistan-bond-yields"],
  "External Sector": ["foreign-exchange-reserves-pakistan", "current-account-deficit-pakistan", "pakistan-trade-deficit", "pakistan-remittances", "pakistan-external-debt"],
  "Fiscal Sector": ["pakistan-fiscal-deficit"],
  "Real Economy": ["gdp-growth-pakistan"],
  "Financial Markets": ["pakistan-stock-market"],
  "Global Events": ["usd-pkr-exchange-rate", "gold-price-pakistan"],
};

export function getEventCategoryRelatedContent(category: EventCategory): RelatedGroup[] {
  const links = indicatorLinks(EVENT_CATEGORY_INDICATOR_LINKS[category] ?? []);
  return links.length > 0 ? [{ heading: "Related Indicators", links }] : [];
}
