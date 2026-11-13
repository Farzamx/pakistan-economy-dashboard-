// The access policy (G.20): the navigation is complete for everyone; the Overview, the landing page and the sign-in pages are open; EVERY other page and data
// route needs a signed-in user; a guest is sent to /login?redirect=<page> (pages) or gets 401 (data). Being signed in is the only entitlement.
// These tests do not trust the policy's own lists: they enumerate every page and route handler that really exists under src/app and assert what the policy
// does with each, so a route added later is caught the moment it appears. The proxy is driven with real requests and a MOCKED Supabase auth (no network).

import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ── mocked Supabase auth: the only thing the proxy asks Supabase is "who is this?" ──
const auth = vi.hoisted(() => ({ user: null as unknown, throws: false, calls: 0 }));
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: {
      getUser: async () => {
        auth.calls++;
        if (auth.throws) throw new Error("supabase unreachable");
        return { data: { user: auth.user } };
      },
    },
  }),
}));

import {
  AFTER_AUTH_COOKIE,
  AUTH_PAGE_PATHS,
  LOGIN_PATH,
  PRIMARY_PUBLIC_PATH,
  PUBLIC_PAGE_PATHS,
  decideAccess,
  isExternalHref,
  isPublicUrl,
  loginUrlFor,
  normalizePathname,
  requiresLogin,
  safeRedirectPath,
  type AccessDecision,
} from "./accessPolicy";
import { isProtectedPath } from "./protectedSections";

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

const MEMBERS_PAGE: AccessDecision = { action: "members", surface: "page" };
const MEMBERS_API: AccessDecision = { action: "members", surface: "api" };

/** Pages a guest may open: the Overview, the landing page (and its alias), and the sign-in pages. Everything else needs a session. */
const EXPECTED_OPEN_PAGES = ["/", "/forgot-password", "/home", "/login", "/overview", "/reset-password", "/signup"];

// Route handlers that need no session, by design. Each authenticates itself (secret, signature, token) or is the guarded assistant or the auth callback.
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
  "/api/subscribers/unsubscribe",
  "/api/subscribers/verify",
  "/api/webhooks/resend",
  "/auth/callback",
];

describe("the pages open to everyone", () => {
  it("are the Overview, the landing page (and its alias) and the sign-in pages", () => {
    expect(PRIMARY_PUBLIC_PATH).toBe("/overview");
    expect([...PUBLIC_PAGE_PATHS].sort()).toEqual(["/", "/home", "/overview"]);
    expect([...AUTH_PAGE_PATHS].sort()).toEqual(["/forgot-password", "/login", "/reset-password", "/signup"]);
    expect(decide("/overview")).toEqual({ action: "allow", kind: "public-page", session: "refresh" });
    expect(decide("/")).toEqual({ action: "allow", kind: "public-page", session: "refresh" });
    expect(decide("/login")).toEqual({ action: "allow", kind: "auth", session: "refresh" });
  });

  it("a trailing slash or a duplicate slash neither hides the Overview nor opens another page", () => {
    expect(decide("/overview/").action).toBe("allow");
    expect(decide("//overview").action).toBe("allow");
    expect(decide("/budget/")).toEqual(MEMBERS_PAGE);
    expect(decide("//budget")).toEqual(MEMBERS_PAGE);
  });
});

describe("every page that exists needs a session, except the open ones", () => {
  it("finds the pages (the inventory itself is sane)", () => {
    expect(PAGES.length).toBeGreaterThan(90);
    expect(PAGES.map((p) => p.url)).toContain("/overview");
    expect(HANDLERS.length).toBeGreaterThan(15);
  });

  it("exactly the documented pages are open", () => {
    const open = PAGES.filter((p) => decide(p.url).action === "allow").map((p) => p.url).sort();
    expect(open).toEqual(EXPECTED_OPEN_PAGES);
  });

  it("every other page is members-only", () => {
    for (const p of PAGES.filter((x) => !EXPECTED_OPEN_PAGES.includes(x.url))) {
      expect(decide(p.url), `${p.url} (${p.file})`).toEqual(MEMBERS_PAGE);
    }
  });

  it("covers the destinations the owner named, including every one of the workshops and tools", () => {
    for (const p of [
      "/pakistan-bond-yields", "/pakistan-interest-rate", "/inflation-rate-pakistan", "/budget", "/budget/where-does-tax-money-go", "/budget/debt-servicing-vs-defence",
      "/budget/psdp", "/budget/defence-spending", "/gdp-breakdown-workshop", "/gdp-growth-pakistan", "/pakistan-fiscal-deficit", "/pakistan-wholesale-inflation",
      "/weekly-inflation-pakistan", "/spi-index-pakistan", "/usd-pkr-exchange-rate", "/macro-intelligence", "/download-datasets", "/comparisons", "/comparisons/x",
      "/provincial-budget", "/provincial-budget/punjab", "/economic-calendar", "/economic-calendar/archive/x", "/decision-support-lab", "/decision-support-lab/loan-emi",
      "/academy", "/workshop", "/fed-funds-rate", "/site-map", "/about", "/contact", "/methodology", "/pakistan-economic-indicators", "/settings", "/settings/preferences",
      "/subscriptions", "/subscriptions/manage", "/admin", "/admin/system-health",
    ]) {
      expect(decide(p), p).toEqual(MEMBERS_PAGE);
      expect(requiresLogin(p), p).toBe(true);
      expect(isProtectedPath(p), p).toBe(true);
    }
  });

  it("the open pages never ask for a sign-in", () => {
    for (const p of EXPECTED_OPEN_PAGES) {
      expect(requiresLogin(p), p).toBe(false);
      expect(isProtectedPath(p), p).toBe(false);
    }
  });

  it("an unknown page is members-only too (default: login required)", () => {
    expect(decide("/a-page-added-next-year")).toEqual(MEMBERS_PAGE);
    expect(decide("/overview/x")).toEqual(MEMBERS_PAGE);
  });
});

describe("route handlers: only self-authenticating routes need no session; data endpoints need one", () => {
  const open = HANDLERS.filter((h) => decide(h.url).action === "allow").map((h) => h.url).sort();

  it("the open set is exactly the documented one (a new route handler needs a session until it is added on purpose)", () => {
    expect(open).toEqual([...EXPECTED_OPEN_HANDLERS].sort());
  });

  it("every other handler needs a session and is answered 401 (not a redirect) without one", () => {
    const others = HANDLERS.filter((x) => !EXPECTED_OPEN_HANDLERS.includes(x.url));
    expect(others.length).toBeGreaterThanOrEqual(5);
    for (const h of others) expect(decide(h.url), `${h.url} (${h.file})`).toEqual(MEMBERS_API);
  });

  it("the data, calendar-feed and subscription-form endpoints are among the members-only ones", () => {
    for (const p of ["/api/datasets/sbp-policy-rate", "/api/datasets/all", "/api/comparisons/series", "/api/subscribers/subscribe", "/economic-calendar/feed.ics", "/economic-calendar/event/x/ics"]) {
      expect(decide(p), p).toEqual(MEMBERS_API);
    }
  });

  it("each route that needs no session is protected by its own secret, signature or token (so leaving it reachable exposes nothing)", () => {
    for (const h of HANDLERS.filter((x) => /^\/api\/(cron|admin|revalidate-fx)/.test(x.url))) {
      expect(fs.readFileSync(path.join(SRC, h.file), "utf8"), h.file).toMatch(/CRON_SECRET/);
    }
    expect(fs.readFileSync(path.join(SRC, "app/api/webhooks/resend/route.ts"), "utf8")).toMatch(/svix|RESEND_WEBHOOK_SECRET/);
    // the email links are opened from an inbox by someone who may have no account: they carry a one-time token that is checked by the database function
    for (const f of ["app/api/subscribers/verify/route.ts", "app/api/subscribers/unsubscribe/route.ts"]) {
      const src = fs.readFileSync(path.join(SRC, f), "utf8");
      expect(src, f).toMatch(/searchParams\.get\("token"\)/);
      expect(src, f).toMatch(/if \(!token\)/);
    }
  });
});

describe("the schedulers and workflows keep working (they are not touched by the policy)", () => {
  const root = path.join(SRC, "..");

  it("every Vercel cron path is allowed without a session", () => {
    const crons = (JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8")).crons ?? []) as { path: string }[];
    expect(crons.length).toBeGreaterThanOrEqual(6);
    for (const c of crons) expect(decide(c.path), c.path).toEqual({ action: "allow", kind: "server-to-server", session: "skip" });
  });

  it("every internal route a GitHub workflow or the system-health check calls is allowed", () => {
    const wfDir = path.join(root, ".github", "workflows");
    const text = fs.readdirSync(wfDir).map((f) => fs.readFileSync(path.join(wfDir, f), "utf8")).join("\n") + read("src/lib/systemHealth.ts");
    const called = new Set([...text.matchAll(/\/api\/(?:cron|admin|revalidate-fx)[A-Za-z0-9/_-]*/g)].map((m) => m[0].replace(/\/$/, "")));
    expect(called.size).toBeGreaterThanOrEqual(4);
    for (const p of called) expect(decide(p.endsWith("/cron") || p.endsWith("/admin") ? p + "/x" : p).action, p).toBe("allow");
  });

  it("the links in e-mails already sent keep working: confirm and unsubscribe need no account", () => {
    expect(decide("/api/subscribers/verify")).toEqual({ action: "allow", kind: "email-link", session: "skip" });
    expect(decide("/api/subscribers/unsubscribe")).toEqual({ action: "allow", kind: "email-link", session: "skip" });
    const template = read("src/lib/notifications/alertEmailTemplate.ts") + read("src/lib/notifications/subscribers.ts");
    for (const m of template.matchAll(/\$\{SITE_URL\}(\/api\/subscribers\/[a-z]+)/g)) expect(decide(m[1]).action, m[1]).toBe("allow");
  });
});

describe("bypass attempts never open a protected route", () => {
  const protectedCases: [string, AccessDecision][] = [
    ["/overview/x", MEMBERS_PAGE],
    ["/overview-x", MEMBERS_PAGE],
    ["/overviews", MEMBERS_PAGE],
    ["/Overview", MEMBERS_PAGE],
    ["/OVERVIEW", MEMBERS_PAGE],
    ["/Login", MEMBERS_PAGE],
    ["/overview/../budget", MEMBERS_PAGE],
    ["/overview%2f..%2fbudget", MEMBERS_PAGE],
    ["/%62udget", MEMBERS_PAGE],
    ["//budget", MEMBERS_PAGE],
    ["/budget/", MEMBERS_PAGE],
    ["/budget//where-does-tax-money-go", MEMBERS_PAGE],
    ["/login/x", MEMBERS_PAGE],
    ["/index.html", MEMBERS_API],
    ["/api/datasets/../cron/x", MEMBERS_API],
    ["/api/cronx/anything", MEMBERS_API],
    ["/api/admin", MEMBERS_API],
    ["/api/webhooks", MEMBERS_API],
    ["/api/assistant/anything-else", MEMBERS_API],
    ["/api/subscribers/verify/x", MEMBERS_API],
    ["/api/subscribers/subscribe", MEMBERS_API],
    ["/api", MEMBERS_API],
    ["/auth/other", MEMBERS_API],
    ["/_next", MEMBERS_PAGE],
    ["/robots.txt/x", MEMBERS_PAGE],
    ["/sitemap.xml.bak", MEMBERS_API],
  ];
  it.each(protectedCases)("%s", (p, expected) => {
    expect(decide(p)).toEqual(expected);
  });

  it("malformed or hostile encodings are refused, never allowed", () => {
    for (const p of ["/%E0%A4%A", "/overview%00", "/overview\\..\\budget", "/budget%5c..", "overview", ""]) {
      expect(decide(p).action, JSON.stringify(p)).not.toBe("allow");
    }
    expect(normalizePathname("/%E0%A4%A")).toBeNull();
    expect(normalizePathname("/a\\b")).toBeNull();
  });

  it("the system, server-to-server and assistant rules are exact, not loose prefixes", () => {
    expect(decide("/api/revalidate-fx")).toEqual({ action: "allow", kind: "server-to-server", session: "skip" });
    expect(decide("/api/revalidate-fx/x")).toEqual(MEMBERS_API);
    expect(decide("/api/cron/weekly-intelligence")).toEqual({ action: "allow", kind: "server-to-server", session: "skip" });
    expect(decide("/api/assistant")).toEqual({ action: "allow", kind: "assistant", session: "skip" });
    expect(decide("/_next/static/chunks/a.js")).toEqual({ action: "allow", kind: "system", session: "skip" });
    expect(decide("/robots.txt")).toEqual({ action: "allow", kind: "system", session: "skip" });
    expect(decide("/sitemap.xml")).toEqual({ action: "allow", kind: "system", session: "skip" });
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

describe("where to go after signing in (open-redirect guard)", () => {
  it("accepts a path on this site, query and fragment included", () => {
    expect(safeRedirectPath("/pakistan-bond-yields")).toBe("/pakistan-bond-yields");
    expect(safeRedirectPath("/budget/psdp?year=2026#chart")).toBe("/budget/psdp?year=2026#chart");
    expect(safeRedirectPath("/overview#home-markets")).toBe("/overview#home-markets");
  });

  it("refuses everything that could leave the site, and falls back to the Overview", () => {
    for (const bad of [
      "https://evil.example/", "http://evil.example", "//evil.example", "///evil.example", "/\\evil.example", "\\\\evil.example", "javascript:alert(1)", "data:text/html,x",
      "evil.example", "", "   ", null, undefined, 42, {}, [], "/a\u0000b", "/a\nb", "/x\\y", "/" + "a".repeat(3000),
    ]) {
      expect(safeRedirectPath(bad as unknown), JSON.stringify(bad)).toBe("/overview");
    }
  });

  it("never returns a sign-in page (that would loop), and uses the given fallback", () => {
    for (const p of ["/login", "/signup", "/forgot-password", "/reset-password", "/login?redirect=/budget", "/auth/callback"]) expect(safeRedirectPath(p), p).toBe("/overview");
    expect(safeRedirectPath("https://evil.example", "/")).toBe("/");
  });

  it("loginUrlFor round-trips through safeRedirectPath", () => {
    const url = loginUrlFor("/pakistan-bond-yields", "?tab=curve&x=1");
    expect(url.startsWith(`${LOGIN_PATH}?redirect=`)).toBe(true);
    const back = new URL(url, "http://x.test").searchParams.get("redirect");
    expect(back).toBe("/pakistan-bond-yields?tab=curve&x=1");
    expect(safeRedirectPath(back)).toBe(back);
  });

  it("exposes the cookie name the sign-up flow uses", () => {
    expect(AFTER_AUTH_COOKIE).toBe("peic_after_auth");
  });
});

describe("links and the sitemap follow the same policy", () => {
  it("requiresLogin: hash and query are ignored, external links and fragments never ask", () => {
    expect(requiresLogin("/pakistan-bond-yields#curve")).toBe(true);
    expect(requiresLogin("/economic-calendar#email-alerts")).toBe(true);
    expect(requiresLogin("/overview#home-markets")).toBe(false);
    expect(requiresLogin("/overview?x=1")).toBe(false);
    expect(requiresLogin("https://www.sbp.org.pk/")).toBe(false);
    expect(requiresLogin("mailto:x@y.z")).toBe(false);
    expect(requiresLogin("//cdn.example.com/a")).toBe(false);
    expect(requiresLogin("#home-headlines")).toBe(false);
    expect(isExternalHref("https://example.com")).toBe(true);
    expect(isExternalHref("/budget")).toBe(false);
  });

  it("the sitemap may advertise only the pages open to everyone", () => {
    expect(isPublicUrl("https://www.pakeconintel.com/overview")).toBe(true);
    expect(isPublicUrl("https://www.pakeconintel.com/")).toBe(true);
    expect(isPublicUrl("https://www.pakeconintel.com/budget/psdp")).toBe(false);
    expect(isPublicUrl("https://www.pakeconintel.com/login")).toBe(false);
    expect(isPublicUrl("not a url")).toBe(false);
  });
});

// ── the proxy itself, driven with real requests and a mocked Supabase ──
describe("proxy() behaviour", () => {
  const call = async (p: string, init?: ConstructorParameters<typeof NextRequest>[1]) => {
    const { proxy } = await import("@/proxy");
    return proxy(new NextRequest(`http://localhost:3000${p}`, init));
  };
  const isPassThrough = (r: Response) => r.headers.get("x-middleware-next") === "1";
  const SESSION = "sb-abcdefghijklmnopqrst-auth-token=" + encodeURIComponent(JSON.stringify({ access_token: "x.y.z", refresh_token: "r" }));
  const asMember = { cookie: SESSION };

  beforeEach(() => {
    auth.user = null;
    auth.throws = false;
    auth.calls = 0;
  });

  describe("a guest (no session cookie)", () => {
    it("opens the Overview, the landing page and the sign-in pages", async () => {
      for (const p of ["/overview", "/overview/", "/overview?utm_source=x", "/", "/home", "/login", "/signup", "/forgot-password", "/reset-password"]) {
        expect(isPassThrough(await call(p)), p).toBe(true);
      }
    });

    it("is sent from any protected page to /login?redirect=<that page> with a 307, no-store (any method)", async () => {
      for (const [p, method] of [["/budget", "GET"], ["/pakistan-bond-yields", "GET"], ["/macro-intelligence", "GET"], ["/budget", "POST"], ["/inflation-rate-pakistan", "HEAD"]] as const) {
        const r = await call(p, { method });
        expect(r.status, `${method} ${p}`).toBe(307);
        const loc = new URL(r.headers.get("location")!);
        expect(loc.pathname, p).toBe("/login");
        expect(loc.searchParams.get("redirect"), p).toBe(p);
        expect(r.headers.get("cache-control")).toBe("no-store");
      }
    });

    it("keeps the query string of the page asked for, so the return trip lands on exactly that view", async () => {
      const r = await call("/pakistan-bond-yields?tab=curve&date=2026-11-01");
      expect(new URL(r.headers.get("location")!).searchParams.get("redirect")).toBe("/pakistan-bond-yields?tab=curve&date=2026-11-01");
    });

    it("gets 401 JSON (not a redirect, not data) from a protected data route, calendar feed or file", async () => {
      for (const p of ["/api/datasets/sbp-policy-rate", "/api/datasets/all", "/api/comparisons/series?a=1&b=2", "/api/subscribers/subscribe", "/economic-calendar/feed.ics", "/economic-calendar/event/x/ics", "/auth/other"]) {
        const r = await call(p);
        expect(r.status, p).toBe(401);
        expect(r.headers.get("content-type"), p).toMatch(/application\/json/);
        expect(await r.json(), p).toEqual({ error: "login_required" });
        expect(r.headers.get("cache-control")).toBe("no-store");
        expect(r.headers.get("location")).toBeNull();
      }
    });

    it("answers 404 for a malformed path", async () => {
      const r = await call("/%E0%A4%A");
      expect(r.status).toBe(404);
    });

    it("never calls Supabase (anonymous traffic cannot be used to hammer the auth server)", async () => {
      for (const p of ["/overview", "/budget", "/api/datasets/x", "/api/cron/weekly-intelligence", "/api/assistant", "/login"]) await call(p);
      expect(auth.calls).toBe(0);
    });

    it("lets the self-authenticating server routes, the assistant and the e-mail links through (their own code decides)", async () => {
      for (const p of ["/api/cron/weekly-intelligence", "/api/admin/health", "/api/revalidate-fx", "/api/webhooks/resend", "/api/assistant", "/api/assistant/translate", "/api/subscribers/verify?token=t", "/api/subscribers/unsubscribe?token=t", "/auth/callback?code=c"]) {
        expect(isPassThrough(await call(p)), p).toBe(true);
      }
    });
  });

  describe("a member (a session Supabase accepts)", () => {
    it("opens protected pages and data routes", async () => {
      auth.user = { id: "u1", email: "member@example.test" };
      for (const p of ["/budget", "/pakistan-bond-yields", "/macro-intelligence", "/download-datasets", "/economic-calendar", "/decision-support-lab/loan-emi", "/api/datasets/sbp-policy-rate", "/api/comparisons/series", "/economic-calendar/feed.ics"]) {
        const r = await call(p, { headers: asMember });
        expect(isPassThrough(r), p).toBe(true);
      }
      expect(auth.calls).toBeGreaterThan(0);
    });

    it("has the session refreshed on the open pages too, without being blocked", async () => {
      auth.user = { id: "u1" };
      expect(isPassThrough(await call("/overview", { headers: asMember }))).toBe(true);
      expect(auth.calls).toBe(1);
    });

    it("does not call Supabase for machine routes even with a cookie", async () => {
      auth.user = { id: "u1" };
      await call("/api/cron/weekly-intelligence", { headers: asMember });
      await call("/api/assistant", { headers: asMember });
      expect(auth.calls).toBe(0);
    });
  });

  describe("an invalid session gets nothing (the gate fails closed)", () => {
    it("a cookie that Supabase does not accept (forged, expired, revoked) is a guest", async () => {
      auth.user = null;
      for (const p of ["/budget", "/pakistan-bond-yields", "/download-datasets"]) {
        const r = await call(p, { headers: asMember });
        expect(r.status, p).toBe(307);
        expect(new URL(r.headers.get("location")!).pathname).toBe("/login");
      }
      expect((await call("/api/datasets/x", { headers: asMember })).status).toBe(401);
      expect(auth.calls).toBeGreaterThan(0);
    });

    it("if Supabase cannot be reached, a protected page stays closed and an open page still opens", async () => {
      auth.throws = true;
      expect((await call("/budget", { headers: asMember })).status).toBe(307);
      expect((await call("/api/datasets/x", { headers: asMember })).status).toBe(401);
      expect(isPassThrough(await call("/overview", { headers: asMember }))).toBe(true);
    });

    it("an empty or unrelated cookie is not a session", async () => {
      for (const cookie of ["sb-abcdefghijklmnopqrst-auth-token=", "other=1", "sb-x-something-else=abc", "peic_after_auth=/budget"]) {
        expect((await call("/budget", { headers: { cookie } })).status, cookie).toBe(307);
      }
      expect(auth.calls).toBe(0);
    });

    it("chunked session cookies (sb-…-auth-token.0) count as a session", async () => {
      auth.user = { id: "u1" };
      const r = await call("/budget", { headers: { cookie: "sb-abcdefghijklmnopqrst-auth-token.0=chunk0; sb-abcdefghijklmnopqrst-auth-token.1=chunk1" } });
      expect(isPassThrough(r)).toBe(true);
    });
  });

  describe("credentials and framework headers grant nothing to a guest", () => {
    const protectedPages = ["/budget", "/pakistan-bond-yields", "/macro-intelligence", "/download-datasets", "/inflation-rate-pakistan", "/settings/preferences", "/economic-calendar", "/decision-support-lab/loan-emi"];

    it("an Authorization header, an API key, the cron secret or a Vercel-cron user agent does not open a page or a data route", async () => {
      const credentialHeaders: Record<string, string>[] = [{ authorization: "Bearer anything" }, { "x-api-key": "k" }, { authorization: "Bearer cron-secret-value" }, { "x-vercel-cron": "1", "user-agent": "vercel-cron/1.0" }];
      for (const headers of credentialHeaders) {
        for (const p of protectedPages.slice(0, 4)) expect((await call(p, { headers })).status, `${JSON.stringify(headers)} ${p}`).toBe(307);
        for (const p of ["/api/datasets/sbp-policy-rate", "/api/comparisons/series"]) expect((await call(p, { headers })).status, `${JSON.stringify(headers)} ${p}`).toBe(401);
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

    it("a query string or path trick cannot make a protected page look like the Overview", async () => {
      for (const p of ["/budget?next=/overview", "/budget?/overview", "/budget;/overview", "/budget/overview", "/overview/../budget", "/budget%2foverview", "/Overview", "/overview/x"]) {
        const r = await call(p);
        expect(r.headers.get("x-middleware-next"), p).not.toBe("1");
      }
    });
  });

  describe("the sign-in destination cannot be used to leave the site through the proxy", () => {
    it("the redirect parameter is always a relative path on this site", async () => {
      for (const p of ["/budget", "//budget", "/budget?next=https://evil.example", "/budget/%2e%2e/%2e%2e"]) {
        const r = await call(p);
        if (r.status !== 307) continue;
        const loc = new URL(r.headers.get("location")!);
        expect(loc.origin, p).toBe("http://localhost:3000");
        expect(loc.pathname, p).toBe("/login");
      }
    });
  });
});

describe("the reviewed route inventory", () => {
  it("is 107 pages and 22 route handlers; a new route needs a session by default and shows up here", () => {
    // If this fails you added or removed a route: confirm it is protected (or deliberately open) in accessPolicy.ts, then update these numbers.
    expect(PAGES.length).toBe(107);
    expect(HANDLERS.length).toBe(22);
    expect(ROUTES.length).toBe(129);
  });
});
