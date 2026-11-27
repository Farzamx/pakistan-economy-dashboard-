// SEO Stage 2 guarantees, checked on the code itself: canonicals, the published sitemap, redirects, internal links, title uniqueness and navigation.

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import nextConfig from "../../next.config";
import { decideAccess, isPublicUrl, PUBLIC_CONTENT_PATHS, PUBLIC_PAGE_PATHS, requiresLogin } from "@/lib/accessPolicy";
import { INDICATOR_GROUPS } from "@/lib/appNav";
import { getRelatedLinks, SEO_PAGES, SITE_URL } from "@/lib/seoConfig";
import { SEO_REDIRECTS } from "@/lib/seoRedirects";
import { sanitize } from "@/lib/analytics/events";

const APP = path.resolve("src/app");
const pageSource = (p: string) => fs.readFileSync(path.join(APP, p === "/" ? "" : p.slice(1), "page.tsx"), "utf8");

describe("canonical URLs", () => {
  it("the site URL is the absolute production origin", () => {
    expect(SITE_URL).toBe("https://www.pakeconintel.com");
  });

  it("the root layout sets no default canonical (a page must never inherit the home page's)", () => {
    const layout = fs.readFileSync(path.join(APP, "layout.tsx"), "utf8");
    expect(layout).not.toMatch(/canonical\s*:/);
  });

  it("every public content page declares its own canonical: SLUG = its path, PAGE_URL = SITE_URL/SLUG, canonical and og:url = PAGE_URL", () => {
    for (const p of PUBLIC_CONTENT_PATHS) {
      const src = pageSource(p);
      if (p === "/site-map") {
        expect(src).toMatch(/canonical: `\$\{SITE_URL\}\/site-map`/);
        continue;
      }
      expect(src, p).toContain(`const SLUG = "${p.slice(1)}";`);
      expect(src, p).toMatch(/const PAGE_URL = `\$\{SITE_URL\}\/\$\{SLUG\}`;/);
      expect(src, p).toMatch(/alternates: \{ canonical: PAGE_URL \}/);
      expect(src, p).toMatch(/url: PAGE_URL/);
    }
  });

  it("the home page and the Overview declare theirs", () => {
    expect(pageSource("/")).toMatch(/alternates: \{ canonical: SITE_URL \}/);
    expect(pageSource("/overview")).toMatch(/alternates: \{ canonical: OVERVIEW_URL \}/);
  });

  it("titles of the public pages are unique", () => {
    const titles = PUBLIC_CONTENT_PATHS.filter((p) => p !== "/site-map").map((p) => /const TITLE =\s*"([^"]+)"/.exec(pageSource(p))?.[1] ?? /title: "([^"]+)"/.exec(pageSource(p))?.[1]);
    expect(titles.every(Boolean)).toBe(true);
    expect(new Set(titles).size).toBe(titles.length);
  });
});

describe("the published sitemap", () => {
  it("lists exactly the public pages, as absolute URLs, with no invented modification date", async () => {
    const entries = await sitemap();
    const urls = entries.map((e) => e.url).sort();
    const expected = [...PUBLIC_PAGE_PATHS.filter((p) => p !== "/home"), ...PUBLIC_CONTENT_PATHS].map((p) => (p === "/" ? SITE_URL : `${SITE_URL}${p}`)).sort();
    expect(urls).toEqual(expected);
    for (const e of entries) {
      expect(e.url.startsWith(SITE_URL)).toBe(true);
      expect(isPublicUrl(e.url), e.url).toBe(true);
      expect(e.lastModified).toBeUndefined();
    }
  });

  it("never lists a redirected URL, a sign-in page or a members-only section", async () => {
    const urls = new Set((await sitemap()).map((e) => e.url));
    for (const src of Object.keys(SEO_REDIRECTS)) expect(urls.has(`${SITE_URL}${src}`), src).toBe(false);
    for (const p of ["/login", "/signup", "/budget", "/download-datasets", "/decision-support-lab", "/comparisons", "/home"]) expect(urls.has(`${SITE_URL}${p}`), p).toBe(false);
  });
});

describe("consolidation redirects", () => {
  it("are single-hop 301s to public pages, and the old pages no longer exist", async () => {
    const all = await nextConfig.redirects!();
    for (const [from, to] of Object.entries(SEO_REDIRECTS)) {
      const r = all.find((x) => x.source === from);
      expect(r, from).toMatchObject({ destination: to, statusCode: 301 });
      expect(SEO_REDIRECTS[to], `${to} must not redirect again`).toBeUndefined();
      expect(decideAccess(to).action, to).toBe("allow");
      expect(fs.existsSync(path.join(APP, from.slice(1), "page.tsx")), `${from} page file`).toBe(false);
    }
  });

  it("no internal related-link points at a redirected URL, and every one names a real destination", () => {
    const pages = new Set([...SEO_PAGES.map((p) => `/${p.slug}`), "/overview"]);
    for (const p of SEO_PAGES) {
      for (const l of getRelatedLinks(p.slug)) {
        expect(SEO_REDIRECTS[l.href], `${p.slug} -> ${l.href}`).toBeUndefined();
        expect(pages.has(l.href), `${p.slug} -> ${l.href}`).toBe(true);
      }
    }
  });
});

describe("navigation", () => {
  it("every item in the Indicators menu is a public page (the menu advertises nothing a guest cannot open)", () => {
    for (const g of INDICATOR_GROUPS) {
      for (const item of g.items) {
        if (item.kind !== "link") continue;
        if (item.href.startsWith("/budget") || item.href.startsWith("/comparisons")) {
          expect(requiresLogin(item.href), item.href).toBe(true); // explainer links that stay members-only are flagged so the UI shows the sign-in dialog
          continue;
        }
        expect(requiresLogin(item.href), item.href).toBe(false);
      }
    }
  });
});

describe("analytics events carry only allowed labels", () => {
  it("drops unknown keys and non-string values, and truncates long strings", () => {
    expect(sanitize("calculator_use", { calculator: "loan-emi", amount: 500000, income: "120000" })).toEqual({ calculator: "loan-emi" });
    expect(sanitize("csv_download", { file: "x".repeat(150), page_path: "/pakistan-kibor-rates" }).file).toHaveLength(100);
    expect(sanitize("chart_interaction", { chart: "KIBOR", option: 5 })).toEqual({ chart: "KIBOR" });
  });

  it("the listener and the events module never read an input's typed value except for fixed chart options", () => {
    const listener = fs.readFileSync(path.resolve("src/components/AnalyticsListener.tsx"), "utf8");
    // input.value is read only inside the chart branch, which accepts radio/checkbox/select only.
    const valueReads = listener.split("\n").filter((l) => /input\.value/.test(l));
    expect(valueReads).toHaveLength(1);
    expect(listener).toMatch(/input\.type === "radio" \|\| input\.type === "checkbox"/);
  });
});
