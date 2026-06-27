import type { MetadataRoute } from "next";
import { SITE_URL, SEO_PAGES } from "@/lib/seoConfig";
import { COMPARISONS, SECTOR_COMPOSITION } from "@/lib/comparisons/comparisonRegistry";
import { BUDGET_CATEGORIES, BUDGET_EXTRA_SEO_SLUGS } from "@/lib/budget/budgetRegistry";
import { PROVINCIAL_SEO_SLUGS } from "@/lib/provincial/provincialBudgetRegistry";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  return [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    ...SEO_PAGES.map((page) => ({
      url: `${SITE_URL}/${page.slug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    // /economic-calendar is now a premium tool (route-level protected, see
    // protectedSections.ts) — unlike /comparisons/budget/provincial-budget
    // below, the WHOLE section is gated here, not just the hub, so none of
    // it — hub, archive, or any /event/[slug] or /archive/[slug] detail
    // page — gets a sitemap entry anymore.
    // /comparisons itself is a premium tool (route-level protected, see
    // protectedSections.ts) — only its 16 informational detail pages below
    // are public, so the hub has no sitemap entry of its own.
    ...COMPARISONS.map((c) => ({
      url: `${SITE_URL}/comparisons/${c.slug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    {
      url: `${SITE_URL}/comparisons/${SECTOR_COMPOSITION.slug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.7,
    },
    // /budget itself is a premium tool (route-level protected) — only its
    // category + extra pages below are public.
    ...BUDGET_CATEGORIES.map((c) => ({
      url: `${SITE_URL}/budget/${c.slug}`,
      lastModified: now,
      changeFrequency: "yearly" as const,
      priority: 0.7,
    })),
    ...BUDGET_EXTRA_SEO_SLUGS.map((slug) => ({
      url: `${SITE_URL}/budget/${slug}`,
      lastModified: now,
      changeFrequency: "yearly" as const,
      priority: 0.7,
    })),
    // /provincial-budget, /compare, and each of the 4 province workspaces
    // are premium tools (route-level protected) — only the 15 informational
    // SEO pages below are public. "rankings" is explicitly excluded: unlike
    // its 15 siblings, it's also a protected premium tool (see
    // protectedSections.ts's PROTECTED_EXACT_PATHS), so listing it here
    // would advertise a URL that 307-redirects Googlebot to /login — the
    // exact problem this sitemap exists to avoid.
    ...PROVINCIAL_SEO_SLUGS.filter((slug) => slug !== "rankings").map((slug) => ({
      url: `${SITE_URL}/provincial-budget/${slug}`,
      lastModified: now,
      changeFrequency: "yearly" as const,
      priority: 0.7,
    })),
  ];
}
