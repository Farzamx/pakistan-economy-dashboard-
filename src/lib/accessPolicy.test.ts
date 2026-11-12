// The access policy (G.14): ONLY the Overview page is public; every other route is closed; nothing redirects to a login or signup page.
// These tests do not trust the policy's own lists: they enumerate every page and route handler that really exists under src/app and assert what the policy
// does with each, so a route added later is caught the moment it appears.

import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import {
  ACCOUNT_UI_ENABLED,
  PRIMARY_PUBLIC_PATH,
  PUBLIC_PAGE_PATHS,
  decideAccess,
  isPublicPagePath,
  isPublicUrl,
  normalizePathname,
  offersMoreThanOverview,
  publicHref,
  type AccessDecision,
} from "./accessPolicy";

const SRC = path.resolve(__dirname, "..");
const APP = path.join(SRC, "app");
const read = (rel: string) => fs.readFileSync(path.join(SRC, "..", rel), "utf8");

interface RouteFile {
  kind: "page" | "handler";
  /** The URL path with sample values in place of dynamic segments. */
  url: string;
  file: string;
}

function collectRoutes(dir = APP, urlParts: string[] = []): RouteFile[] {
  const out: RouteFile[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name.startsWith("@") || e.name.startsWith("_")) continue; // parallel slots / private folders are not routes
      const group = /^\(.*\)$/.test(e.name);
      const seg = group ? null : /^\[\[?\.\.\./.test(e.name) ? "x/y" : /^\[.+\]$/.test(e.name) ? "x" : e.name;
      out.push(...collectRoutes(full, seg === null ? urlParts : [...urlParts, seg]));
    } else if (e.name === "page.tsx" || e.name === "route.ts") {
      out.push({ kind: e.name === "page.tsx" ? "page" : "handler", url: "/" + urlParts.join("/"), file: path.relative(SRC, full) });
    }
  }
  return out;
}
const ROUTES = collectRoutes();
const PAGES = ROUTES.filter((r) => r.kind === "page");
const HANDLERS = ROUTES.filter((r) => r.kind === "handler");
const decide = (p: string): AccessDecision => decideAccess(p);

// The route handlers that may answer a request, by design: each authenticates itself with its own secret (crons, admin health, the email webhook) or is called by
// components embedded in the Overview (the assistant). Everything else under /api, /auth and *.ics is closed.
const EXPECTED_OPEN_HANDLERS = [
  "/api/admin/diagnostics",
  "/api/admin/global-markets-freshness",
  "/api/admin/health",
  "/api/admin/sbp-freshness",
  "/api/assistant",
  "/api/assistant/translate",
  "/api/cron/global-markets-freshness",
  "/api/cron/macro-intelligence-snapshot",
  "/api/cron/process-notification-jobs",
  "/api/cron/sbp-ingestion-watchdog",
  "/api/cron/sync-economic-calendar",
  "/api/cron/weekly-intelligence",
  "/api/revalidate-fx",
  "/api/webhooks/resend",
];

describe("the one public page", () => {
  it("is the Overview, and only the Overview", () => {
    expect(PRIMARY_PUBLIC_PATH).toBe("/overview");
    expect([...PUBLIC_PAGE_PATHS]).toEqual(["/overview"]);
    expect(decide("/overview")).toEqual({ action: "allow", kind: "public-page" });
  });

  it("a trailing slash or a duplicate slash does not make a different page public or hide the Overview", () => {
    expect(decide("/overview/")).toEqual({ action: "allow", kind: "public-page" });
    expect(decide("//overview")).toEqual({ action: "allow", kind: "public-page" });
  });
});

describe("every page that exists, other than the Overview, is closed", () => {
  it("finds the pages (the inventory itself is sane)", () => {
    expect(PAGES.length).toBeGreaterThan(90);
    expect(PAGES.map((p) => p.url)).toContain("/overview");
    expect(HANDLERS.length).toBeGreaterThan(15);
  });

  it("exactly one page is allowed", () => {
    const allowed = PAGES.filter((p) => decide(p.url).action === "allow").map((p) => p.url);
    expect(allowed).toEqual(["/overview"]);
  });

  it("each closed page redirects to the Overview", () => {
    for (const p of PAGES.filter((x) => x.url !== "/overview")) {
      expect(decide(p.url), `${p.url} (${p.file})`).toEqual({ action: "redirect", location: "/overview" });
    }
  });

  it("covers the surfaces the owner named", () => {
    for (const p of [
      "/", "/home", "/pakistan-bond-yields", "/pakistan-interest-rate", "/inflation-rate-pakistan", "/budget", "/budget/where-does-tax-money-go",
      "/budget/debt-servicing-vs-defence", "/budget/psdp", "/budget/defence-spending", "/gdp-breakdown-workshop", "/gdp-growth-pakistan", "/pakistan-fiscal-deficit",
      "/pakistan-wholesale-inflation", "/weekly-inflation-pakistan", "/spi-index-pakistan", "/usd-pkr-exchange-rate", "/macro-intelligence", "/download-datasets",
      "/comparisons", "/provincial-budget", "/economic-calendar", "/decision-support-lab", "/academy", "/workshop", "/fed-funds-rate", "/site-map", "/about",
      "/contact", "/methodology", "/pakistan-economic-indicators",
    ]) {
      expect(decide(p), p).toEqual({ action: "redirect", location: "/overview" });
    }
  });

  it("the login, signup, account and settings routes are closed too (there is no account system to reach)", () => {
    for (const p of ["/login", "/signup", "/forgot-password", "/reset-password", "/settings", "/settings/preferences", "/subscriptions", "/admin"]) {
      expect(decide(p), p).toEqual({ action: "redirect", location: "/overview" });
    }
  });
});

describe("route handlers: only the self-authenticating server routes and the Overview's assistant are open", () => {
  const open = HANDLERS.filter((h) => decide(h.url).action === "allow").map((h) => h.url).sort();

  it("the open set is exactly the documented one (a new route handler is closed until it is added on purpose)", () => {
    expect(open).toEqual([...EXPECTED_OPEN_HANDLERS].sort());
  });

  it("every other handler answers 404", () => {
    for (const h of HANDLERS.filter((x) => !EXPECTED_OPEN_HANDLERS.includes(x.url))) {
      expect(decide(h.url), `${h.url} (${h.file})`).toEqual({ action: "not-found" });
    }
  });

  it("the data and tool endpoints are among the closed ones", () => {
    for (const p of ["/api/datasets/sbp-policy-rate", "/api/datasets/all", "/api/comparisons/series", "/api/subscribers/subscribe", "/api/subscribers/unsubscribe", "/api/subscribers/verify", "/auth/callback", "/economic-calendar/feed.ics", "/economic-calendar/event/x/ics"]) {
      expect(decide(p), p).toEqual({ action: "not-found" });
    }
  });

  it("each open server route really is secret-protected in its own code (so leaving it reachable exposes nothing)", () => {
    for (const h of HANDLERS.filter((x) => /^\/api\/(cron|admin|revalidate-fx)/.test(x.url))) {
      expect(fs.readFileSync(path.join(SRC, h.file), "utf8"), h.file).toMatch(/CRON_SECRET/);
    }
    expect(fs.readFileSync(path.join(SRC, "app/api/webhooks/resend/route.ts"), "utf8")).toMatch(/svix|RESEND_WEBHOOK_SECRET/);
  });
});

describe("the schedulers and workflows keep working (they are not touched by the policy)", () => {
  const root = path.join(SRC, "..");

  it("every Vercel cron path is allowed", () => {
    const crons = (JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8")).crons ?? []) as { path: string }[];
    expect(crons.length).toBeGreaterThanOrEqual(6);
    for (const c of crons) expect(decide(c.path), c.path).toEqual({ action: "allow", kind: "server-to-server" });
  });

  it("every internal route a GitHub workflow or the system-health check calls is allowed", () => {
    const wfDir = path.join(root, ".github", "workflows");
    const text = fs.readdirSync(wfDir).map((f) => fs.readFileSync(path.join(wfDir, f), "utf8")).join("\n") + read("src/lib/systemHealth.ts");
    const called = new Set([...text.matchAll(/\/api\/(?:cron|admin|revalidate-fx)[A-Za-z0-9/_-]*/g)].map((m) => m[0].replace(/\/$/, "")));
    expect(called.size).toBeGreaterThanOrEqual(4);
    for (const p of called) expect(decide(p.endsWith("/cron") || p.endsWith("/admin") ? p + "/x" : p).action, p).toBe("allow");
  });
});

describe("no closed route ever sends a visitor to a login or signup page", () => {
  it("across every route that exists and a set of probes", () => {
    const paths = [...ROUTES.map((r) => r.url), "/budget", "/login", "/signup", "/economic-calendar", "/comparisons", "/provincial-budget/punjab", "/settings/preferences", "/decision-support-lab/loan-emi"];
    for (const p of paths) {
      const d = decide(p);
      if (d.action === "redirect") expect(d.location, p).toBe("/overview");
      expect(JSON.stringify(d), p).not.toMatch(/login|signup|sign-up|register|subscribe/i);
    }
  });

  it("src/proxy.ts applies the policy and has no authentication, session or login logic", () => {
    // Judged on the code, not the comments (the header comment explains what was removed, so it names Supabase and /login).
    const code = read("src/proxy.ts").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    expect(code).toContain("decideAccess");
    expect(code).not.toMatch(/supabase|getUser|updateSession|auth\./i);
    expect(code).not.toMatch(/\/login|\/signup/);
  });
});

describe("bypass attempts do not open a closed route", () => {
  const closed: [string, AccessDecision][] = [
    ["/overview/x", { action: "redirect", location: "/overview" }],
    ["/overview-x", { action: "redirect", location: "/overview" }],
    ["/overviews", { action: "redirect", location: "/overview" }],
    ["/Overview", { action: "redirect", location: "/overview" }],
    ["/OVERVIEW", { action: "redirect", location: "/overview" }],
    ["/overview/../budget", { action: "redirect", location: "/overview" }],
    ["/overview%2f..%2fbudget", { action: "redirect", location: "/overview" }],
    ["/%62udget", { action: "redirect", location: "/overview" }],
    ["//budget", { action: "redirect", location: "/overview" }],
    ["/budget/", { action: "redirect", location: "/overview" }],
    ["/budget//where-does-tax-money-go", { action: "redirect", location: "/overview" }],
    ["/index.html", { action: "not-found" }],
    ["/api/datasets/../cron/x", { action: "not-found" }],
    ["/api/cronx/anything", { action: "not-found" }],
    ["/api/admin", { action: "not-found" }],
    ["/api/webhooks", { action: "not-found" }],
    ["/api/assistant/anything-else", { action: "not-found" }],
    ["/api", { action: "not-found" }],
    ["/_next", { action: "redirect", location: "/overview" }],
    ["/robots.txt/x", { action: "redirect", location: "/overview" }],
    ["/sitemap.xml.bak", { action: "not-found" }],
  ];
  it.each(closed)("%s", (p, expected) => {
    expect(decide(p)).toEqual(expected);
  });

  it("malformed or hostile encodings are closed, never allowed", () => {
    for (const p of ["/%E0%A4%A", "/overview%00", "/overview\\..\\budget", "/budget%5c..", "overview", ""]) {
      expect(decide(p).action, JSON.stringify(p)).not.toBe("allow");
    }
    expect(normalizePathname("/%E0%A4%A")).toBeNull();
    expect(normalizePathname("/a\\b")).toBeNull();
  });

  it("the system, server-to-server and assistant rules are exact, not loose prefixes", () => {
    expect(decide("/api/revalidate-fx")).toEqual({ action: "allow", kind: "server-to-server" });
    expect(decide("/api/revalidate-fx/x")).toEqual({ action: "not-found" });
    expect(decide("/api/cron/weekly-intelligence")).toEqual({ action: "allow", kind: "server-to-server" });
    expect(decide("/api/assistant")).toEqual({ action: "allow", kind: "overview-embedded" });
    expect(decide("/_next/static/chunks/a.js")).toEqual({ action: "allow", kind: "system" });
    expect(decide("/robots.txt")).toEqual({ action: "allow", kind: "system" });
    expect(decide("/sitemap.xml")).toEqual({ action: "allow", kind: "system" });
  });
});

describe("the matcher keeps the proxy in front of every request that matters", () => {
  const src = read("src/proxy.ts").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const matcher = /matcher:\s*\[\s*"([^"]+)"/.exec(src)?.[1] ?? "";
  // Next's matcher strings are path-to-regexp-like; this one is a negative-lookahead regex, so test it as one.
  const re = new RegExp(`^${matcher.replace(/\\\\/g, "\\")}$`);

  it("API routes are not excluded", () => {
    expect(matcher).not.toMatch(/\(\?!api/);
    expect(re.test("/api/datasets/x")).toBe(true);
    expect(re.test("/auth/callback")).toBe(true);
  });

  it("pages, and non-image files such as .ics and .xlsx, are covered", () => {
    for (const p of ["/budget", "/", "/login", "/economic-calendar/feed.ics", "/robots.txt", "/sitemap.xml", "/download.xlsx"]) expect(re.test(p), p).toBe(true);
  });

  it("only Next's static files and image assets are excluded", () => {
    for (const p of ["/_next/static/chunks/a.js", "/_next/image", "/favicon.ico", "/icon.png", "/x.svg"]) expect(re.test(p), p).toBe(false);
  });
});

describe("links, hrefs and the sitemap follow the same policy", () => {
  it("isPublicPagePath / publicHref", () => {
    expect(isPublicPagePath("/overview")).toBe(true);
    expect(isPublicPagePath("/overview#home-markets")).toBe(true);
    expect(isPublicPagePath("/overview?x=1")).toBe(true);
    expect(isPublicPagePath("/budget")).toBe(false);
    expect(isPublicPagePath("/budget#x")).toBe(false);
    expect(isPublicPagePath("https://example.com/budget")).toBe(false);
    expect(publicHref("/overview#home-markets")).toBe("/overview#home-markets");
    expect(publicHref("/pakistan-interest-rate")).toBeNull();
    expect(publicHref("#home-headlines")).toBe("#home-headlines");
    expect(publicHref("https://www.sbp.org.pk/")).toBe("https://www.sbp.org.pk/");
    expect(publicHref("mailto:x@y.z")).toBe("mailto:x@y.z");
    expect(publicHref("//cdn.example.com/a")).toBe("//cdn.example.com/a");
  });

  it("isPublicUrl", () => {
    expect(isPublicUrl("https://www.pakeconintel.com/overview")).toBe(true);
    expect(isPublicUrl("https://www.pakeconintel.com/")).toBe(false);
    expect(isPublicUrl("https://www.pakeconintel.com/budget/psdp")).toBe(false);
    expect(isPublicUrl("not a url")).toBe(false);
  });

  it("while the policy is Overview-only, the navigation-only Overview sections and the account UI are off", () => {
    expect(offersMoreThanOverview()).toBe(false);
    expect(ACCOUNT_UI_ENABLED).toBe(false);
  });
});

// The proxy function itself, driven with real requests (not just its source text): this is what actually answers visitors.
describe("proxy() behaviour", () => {
  const call = async (p: string, init?: ConstructorParameters<typeof NextRequest>[1]) => {
    const { proxy } = await import("@/proxy");
    return proxy(new NextRequest(`http://localhost:3000${p}`, init));
  };
  const isPassThrough = (r: Response) => r.headers.get("x-middleware-next") === "1";

  it("lets the Overview through", async () => {
    expect(isPassThrough(await call("/overview"))).toBe(true);
  });

  it("redirects a closed page (any method) to the Overview with a 307, never to a login page", async () => {
    for (const [p, method] of [["/budget", "GET"], ["/pakistan-bond-yields", "GET"], ["/", "GET"], ["/login", "GET"], ["/budget", "POST"], ["/inflation-rate-pakistan", "HEAD"]] as const) {
      const r = await call(p, { method });
      expect(r.status, `${method} ${p}`).toBe(307);
      expect(new URL(r.headers.get("location")!).pathname, p).toBe("/overview");
      expect(r.headers.get("location")).not.toMatch(/login|signup/);
      expect(r.headers.get("cache-control")).toBe("no-store");
    }
  });

  it("answers 404 with no content for a closed API route, file or callback", async () => {
    for (const p of ["/api/datasets/sbp-policy-rate", "/api/comparisons/series", "/api/subscribers/subscribe", "/auth/callback", "/economic-calendar/feed.ics"]) {
      const r = await call(p);
      expect(r.status, p).toBe(404);
      expect(await r.text(), p).toBe("Not found");
      expect(r.headers.get("cache-control")).toBe("no-store");
    }
  });

  it("lets the self-authenticating server routes and the Overview's assistant through (their own code decides)", async () => {
    for (const p of ["/api/cron/weekly-intelligence", "/api/admin/health", "/api/revalidate-fx", "/api/webhooks/resend", "/api/assistant", "/api/assistant/translate"]) {
      expect(isPassThrough(await call(p)), p).toBe(true);
    }
  });

  it("is not fooled by the header that skips middleware in other deployments", async () => {
    const r = await call("/budget", { headers: { "x-middleware-subrequest": "middleware:middleware:middleware:middleware:middleware" } });
    expect(r.status).toBe(307);
  });
});

// G.15: hardening checks. A visitor who already holds an old session, or who sends credentials or framework headers, is treated exactly like anyone else.
describe("an existing session, credentials or framework headers grant nothing", () => {
  const call = async (p: string, init?: ConstructorParameters<typeof NextRequest>[1]) => {
    const { proxy } = await import("@/proxy");
    return proxy(new NextRequest(`http://localhost:3000${p}`, init));
  };
  const closed = ["/budget", "/pakistan-bond-yields", "/macro-intelligence", "/download-datasets", "/inflation-rate-pakistan", "/settings/preferences", "/economic-calendar", "/decision-support-lab/loan-emi"];

  it("a Supabase-style session cookie does not open a closed page", async () => {
    const cookie = "sb-abcdefghijklmnopqrst-auth-token=" + encodeURIComponent(JSON.stringify({ access_token: "x.y.z", refresh_token: "r", user: { id: "u" } })) + "; sb-abcdefghijklmnopqrst-auth-token.0=chunk";
    for (const p of closed) {
      const r = await call(p, { headers: { cookie } });
      expect(r.status, p).toBe(307);
      expect(new URL(r.headers.get("location")!).pathname, p).toBe("/overview");
    }
  });

  it("an Authorization header, an API key header or the cron secret on a page request does not open it", async () => {
    const credentialHeaders: Record<string, string>[] = [{ authorization: "Bearer anything" }, { "x-api-key": "k" }, { authorization: "Bearer cron-secret-value" }, { "x-vercel-cron": "1", "user-agent": "vercel-cron/1.0" }];
    for (const headers of credentialHeaders) {
      for (const p of closed.slice(0, 4)) expect((await call(p, { headers })).status, `${JSON.stringify(headers)} ${p}`).toBe(307);
    }
  });

  it("the cron secret does not turn a closed data endpoint into an open one", async () => {
    for (const p of ["/api/datasets/sbp-policy-rate", "/api/comparisons/series", "/api/subscribers/subscribe", "/auth/callback"]) {
      const r = await call(p, { headers: { authorization: "Bearer cron-secret-value" } });
      expect(r.status, p).toBe(404);
    }
  });

  it("framework-internal request headers (RSC, prefetch, data, middleware) do not bypass it", async () => {
    const variants: Record<string, string>[] = [
      { rsc: "1" },
      { rsc: "1", "next-router-prefetch": "1", "next-router-segment-prefetch": "/budget" },
      { "next-url": "/overview", rsc: "1" },
      { "x-nextjs-data": "1" },
      { "x-middleware-prefetch": "1" },
      { "x-middleware-subrequest": "src/middleware" },
      { "x-middleware-subrequest": "proxy:proxy:proxy:proxy:proxy" },
      { "x-forwarded-host": "www.pakeconintel.com", "x-forwarded-proto": "https" },
      { "x-original-url": "/overview", "x-rewrite-url": "/overview" },
    ];
    for (const headers of variants) {
      for (const p of ["/budget", "/pakistan-bond-yields?_rsc=abc123", "/budget.rsc"]) {
        const r = await call(p, { headers });
        expect(r.status, `${JSON.stringify(headers)} ${p}`).toBeGreaterThanOrEqual(307);
        expect(r.headers.get("x-middleware-next"), `${JSON.stringify(headers)} ${p}`).not.toBe("1");
      }
    }
  });

  it("a query string or fragment-like suffix cannot make a closed page look like the Overview", async () => {
    for (const p of ["/budget?next=/overview", "/budget?/overview", "/budget;/overview", "/budget/overview", "/overview/../budget", "/budget%2foverview"]) {
      const r = await call(p);
      expect(r.headers.get("x-middleware-next"), p).not.toBe("1");
    }
  });
});

describe("the root route and the reviewed inventory", () => {
  const call = async (p: string) => {
    const { proxy } = await import("@/proxy");
    return proxy(new NextRequest(`http://localhost:3000${p}`));
  };

  it("`/` is not a public page: it redirects to /overview (307), exactly like any other closed page", async () => {
    expect(decide("/")).toEqual({ action: "redirect", location: "/overview" });
    const r = await call("/");
    expect(r.status).toBe(307);
    expect(new URL(r.headers.get("location")!).pathname).toBe("/overview");
  });

  it("the marketing landing page and its siblings are closed", async () => {
    for (const p of ["/", "/home", "/about", "/contact", "/methodology"]) expect((await call(p)).status, p).toBe(307);
  });

  it("the Overview itself is never redirected, with or without a trailing slash or query", async () => {
    for (const p of ["/overview", "/overview/", "/overview?utm_source=x", "/overview#home-markets"]) expect((await call(p)).status, p).not.toBe(307);
  });

  it("the route inventory is the reviewed one (107 pages, 22 route handlers); a new route is closed by default and shows up here", () => {
    // If this fails you added or removed a route: confirm it is closed (or deliberately open) in accessPolicy.ts, then update these numbers.
    expect(PAGES.length).toBe(107);
    expect(HANDLERS.length).toBe(22);
    expect(ROUTES.length).toBe(129);
  });
});
