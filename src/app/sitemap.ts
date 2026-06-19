import type { MetadataRoute } from "next";
import { SITE_URL, SEO_PAGES } from "@/lib/seoConfig";
import { COMPARISONS, SECTOR_COMPOSITION } from "@/lib/comparisons/comparisonRegistry";

export default function sitemap(): MetadataRoute.Sitemap {
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
    {
      url: `${SITE_URL}/comparisons`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.9,
    },
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
  ];
}
