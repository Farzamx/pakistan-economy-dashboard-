// Permanent (301) consolidations of overlapping pages (SEO Stage 2, owner-approved 27 Nov 2026; docs/seo-implementation.md).
//
// One map, read by next.config.ts (the redirects themselves) and by src/lib/seoConfig.ts (so an internal related-link can never point at a redirected
// URL). No imports: next.config.ts loads this file directly.
//
//   /pakistan-economic-indicators, /pakistan-economic-dashboard -> /overview
//       Three near-identical "all indicators" dashboards. /overview is the richest, already public and indexed; the other two were SeoPageLayout
//       wrappers around the same KPIs. Their useful FAQ answers (which indicators matter, sources, update frequency) moved into /overview.
//   /spi-index-pakistan -> /weekly-inflation-pakistan
//       Both pages showed the weekly Sensitive Price Indicator. The weekly page (year-on-year rate, the figure people search for) now also carries the
//       index level and the base-year explanation that were unique to the SPI index page.

export const SEO_REDIRECTS: Readonly<Record<string, string>> = {
  "/pakistan-economic-indicators": "/overview",
  "/pakistan-economic-dashboard": "/overview",
  "/spi-index-pakistan": "/weekly-inflation-pakistan",
};

/** The destination of a path after consolidation (the path itself when it was not consolidated). One hop only: destinations are never redirected. */
export const resolveSeoRedirect = (path: string): string => SEO_REDIRECTS[path] ?? path;
