// The platform's access policy. This file is the single source of truth for "who may open what".
//
// Owner policy (G.20, replacing the G.14 Overview-only policy):
//   - The navigation is complete for everyone. Nothing is hidden from a visitor because they are signed out.
//   - A small set of pages is open to guests: the Overview, the marketing landing page, and the sign-in pages themselves.
//   - EVERY other page, workshop, indicator, tool and dataset needs a signed-in account. A guest who asks for one (a click or a typed URL) gets the sign-in
//     experience, and after signing in is returned to the page they asked for.
//   - Being signed in is the only entitlement the product has. There is no paid tier, plan or role in the database or the code (admin pages additionally
//     additionally require a confirmed e-mail and the server-side ADMIN_USER_ID: src/lib/adminAccess.ts, which this file does not change).
//
// DEFAULT: LOGIN REQUIRED. A request that matches none of the explicit rules below needs a session. A page or API route added later is therefore protected
// until someone opens it here on purpose. The test for this file enumerates every route under src/app and asserts exactly which ones are open.
//
// Enforced in src/proxy.ts (every request, before any page renders or any cache is read), which asks decideAccess() what to do and then, only for a request
// that needs it, asks Supabase who the visitor is (src/lib/supabase/proxy.ts). The navigation, the guest dialog (GuestAccessModal), search and the sitemap
// ask the same functions below, so no surface can disagree with the server. Hiding or showing a link is never the enforcement: the proxy is.
//
// Why a few routes stay reachable without a session (none of them is a protected page or protected data):
//   - server-to-server routes (cron, admin health, webhooks, cache revalidation): called by Vercel crons, GitHub workflows and the email provider. Each
//     authenticates itself with its own secret and refuses everything else; protecting them with a user session would stop the schedulers;
//   - the two assistant endpoints that components embedded in the Overview and the landing page call from the browser (guarded by assistantGuard.ts);
//   - the email-link endpoints (confirm / unsubscribe): opened from an email by someone who may have no account; each is gated by its own secret token.

/** The page signed-out visitors may always open, and where a sign-in lands by default. */
export const PRIMARY_PUBLIC_PATH = "/overview";

/** The sign-in page. */
export const LOGIN_PATH = "/login";

/**
 * Pages open to guests, as exact paths: the Overview, and the marketing landing page ("/" and its identical alias "/home", whose canonical URL is "/").
 * These are also the only pages the sitemap lists.
 */
export const PUBLIC_PAGE_PATHS: readonly string[] = [PRIMARY_PUBLIC_PATH, "/", "/home"];

/** The account pages. They must be open to guests (they are how a guest becomes a member) and each redirects a signed-in visitor away by itself. */
export const AUTH_PAGE_PATHS: readonly string[] = ["/login", "/signup", "/forgot-password", "/reset-password"];

/** Account route handler: the link Supabase emails for sign-up confirmation and password reset, which sets the session. */
const AUTH_ROUTE_EXACT: readonly string[] = ["/auth/callback"];

/** Framework and metadata files every page needs. Static assets with an image extension are also excluded from the proxy by its matcher. */
const SYSTEM_EXACT: readonly string[] = ["/robots.txt", "/sitemap.xml", "/favicon.ico", "/icon.svg", "/icon.png", "/apple-icon.png"];
const SYSTEM_PREFIXES: readonly string[] = ["/_next/"];

/** Called by Vercel crons, GitHub workflows and the email provider. Each authenticates itself with its own secret and refuses anything else. */
const SERVER_TO_SERVER_PREFIXES: readonly string[] = ["/api/cron/", "/api/admin/", "/api/webhooks/"];
const SERVER_TO_SERVER_EXACT: readonly string[] = ["/api/revalidate-fx"];

/** Endpoints the Overview and landing page's own embedded components call from the browser (the assistant and its translate helper). */
const ASSISTANT_EXACT: readonly string[] = ["/api/assistant", "/api/assistant/translate"];

/** Links inside emails already sent to subscribers (confirm, unsubscribe). Opened by people who may have no account; each needs its own secret token. */
const EMAIL_LINK_EXACT: readonly string[] = ["/api/subscribers/verify", "/api/subscribers/unsubscribe"];

export type AllowKind = "public-page" | "auth" | "system" | "server-to-server" | "assistant" | "email-link";

/** How a request that needs a session is answered when there is none: a page is sent to the sign-in page; anything else (API, file, feed) is refused with 401. */
export type MembersSurface = "page" | "api";

export type AccessDecision =
  /** No session is needed. `session` says whether the proxy should still refresh the visitor's session cookie (pages: yes; machine routes: no). */
  | { action: "allow"; kind: AllowKind; session: "refresh" | "skip" }
  /** A signed-in visitor is required. */
  | { action: "members"; surface: MembersSurface }
  /** A malformed or hostile path. */
  | { action: "not-found" };

/**
 * The comparable form of a request path: percent-decoded, duplicate slashes collapsed, trailing slash removed. Returns null for anything malformed or
 * suspicious (bad encoding, NUL, backslash), which is then refused. Case is NOT folded: "/Overview" is not the public page (it needs a session).
 */
export function normalizePathname(raw: string): string | null {
  let p: string;
  try {
    p = decodeURIComponent(raw);
  } catch {
    return null;
  }
  if (p.includes("\0") || p.includes("\\")) return null;
  p = p.replace(/\/{2,}/g, "/");
  if (!p.startsWith("/")) return null;
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p;
}

const hasFileExtension = (p: string) => /\.[A-Za-z0-9]{1,8}$/.test(p.slice(p.lastIndexOf("/") + 1));

/** True for a request that is not a page navigation: an API route, an auth route, a file, or an ICS calendar route handler (which has no extension). */
function isNonPage(p: string): boolean {
  return p === "/api" || p.startsWith("/api/") || p === "/auth" || p.startsWith("/auth/") || hasFileExtension(p) || p.endsWith("/ics");
}

/** The decision for one request path (the pathname only: no query string or fragment). */
export function decideAccess(pathname: string): AccessDecision {
  const p = normalizePathname(pathname);
  if (p === null) return { action: "not-found" };

  if (PUBLIC_PAGE_PATHS.includes(p)) return { action: "allow", kind: "public-page", session: "refresh" };
  if (AUTH_PAGE_PATHS.includes(p)) return { action: "allow", kind: "auth", session: "refresh" };
  if (AUTH_ROUTE_EXACT.includes(p)) return { action: "allow", kind: "auth", session: "skip" };
  if (SYSTEM_EXACT.includes(p) || SYSTEM_PREFIXES.some((x) => p.startsWith(x))) return { action: "allow", kind: "system", session: "skip" };
  if (SERVER_TO_SERVER_EXACT.includes(p) || SERVER_TO_SERVER_PREFIXES.some((x) => p.startsWith(x))) return { action: "allow", kind: "server-to-server", session: "skip" };
  if (ASSISTANT_EXACT.includes(p)) return { action: "allow", kind: "assistant", session: "skip" };
  if (EMAIL_LINK_EXACT.includes(p)) return { action: "allow", kind: "email-link", session: "skip" };

  return { action: "members", surface: isNonPage(p) ? "api" : "page" };
}

const SCHEME = /^([a-z][a-z0-9+.-]*:|\/\/)/i;

/** An href that leaves the site (https:, mailto:, tel:, //host). Not governed by this policy. */
export const isExternalHref = (href: string): boolean => SCHEME.test(href);

/** Path of an internal href, without query or fragment. */
const pathOf = (href: string) => href.split("#")[0].split("?")[0];

/** Does following this internal href need a signed-in visitor? External links and same-page fragments never do. (Used by the navigation to show the sign-in dialog.) */
export function requiresLogin(href: string): boolean {
  if (isExternalHref(href) || href.startsWith("#")) return false;
  const decision = decideAccess(pathOf(href));
  return decision.action === "members";
}

/** For the sitemap: is this absolute URL one of the pages open to everyone? (Protected pages must not be advertised: a crawler would only reach the sign-in page.) */
export function isPublicUrl(url: string): boolean {
  try {
    const p = normalizePathname(new URL(url).pathname);
    return p !== null && PUBLIC_PAGE_PATHS.includes(p);
  } catch {
    return false;
  }
}

// ── Where to go after signing in ───────────────────────────────────────────

const MAX_REDIRECT_LENGTH = 2048;

/**
 * A destination that is safe to send a visitor to after they sign in. It must be a path ON THIS SITE: it starts with exactly one "/", has no backslash or
 * control character, no scheme and no "//host" form, and it is not itself a sign-in page (that would loop). Anything else (an absolute URL to another site,
 * "//evil.example", "/\evil.example", "javascript:", an empty value) becomes `fallback`. This is the open-redirect guard for every place that reads a
 * `redirect` / `next` value that came from a URL or a form.
 */
export function safeRedirectPath(raw: unknown, fallback: string = PRIMARY_PUBLIC_PATH): string {
  if (typeof raw !== "string") return fallback;
  const value = raw.trim();
  if (!value || value.length > MAX_REDIRECT_LENGTH) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return fallback;
  let url: URL;
  try {
    url = new URL(value, "http://peic.invalid");
  } catch {
    return fallback;
  }
  if (url.origin !== "http://peic.invalid") return fallback;
  const path = normalizePathname(url.pathname);
  if (path === null || AUTH_PAGE_PATHS.includes(path) || AUTH_ROUTE_EXACT.includes(path)) return fallback;
  return `${url.pathname}${url.search}${url.hash}`;
}

/** Short-lived cookie that remembers the page a new member was trying to open while they confirm their e-mail address (see auth/actions.ts and auth/callback). */
export const AFTER_AUTH_COOKIE = "peic_after_auth";

/** The sign-in URL for a page a guest asked for: `/login?redirect=<that page, query included>`. */
export function loginUrlFor(pathname: string, search: string = ""): string {
  return `${LOGIN_PATH}?redirect=${encodeURIComponent(`${pathname}${search}`)}`;
}
