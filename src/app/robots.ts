import type { MetadataRoute } from "next";

// Pages are crawlable; the machine endpoints (data APIs, auth callbacks) are not pages and are kept out of crawling. Sign-in and account pages are NOT
// disallowed on purpose: they carry `noindex`, and a robots block would stop crawlers from seeing it. Members-only pages answer a guest (and so a crawler)
// with a redirect to the sign-in page, and are not in the sitemap (SEO Stage 2).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/auth/"],
    },
    sitemap: "https://www.pakeconintel.com/sitemap.xml",
  };
}
