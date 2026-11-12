// The platform's access policy: ONE public page, everything else closed. This file is the single source of truth.
//
// Owner policy (G.14): only the main Overview page is publicly accessible. Every other route, workshop, indicator, detail page, dataset and tool is
// inaccessible to visitors. There is no login, signup, registration, account, payment or subscription flow: a closed route does NOT redirect to /login. It
// redirects to the public Overview page (pages) or answers 404 (APIs, files, auth callbacks).
//
// DEFAULT DENY. A request is allowed only if it matches an explicit rule below; anything new that is added to the app later (a page, an API route) is closed
// until someone adds it here on purpose. the test for this file enumerates every route under src/app and asserts exactly which ones are open.
//
// Why a few API routes stay reachable (none of them is a public page):
//   - server-to-server routes (cron, admin health, webhooks, cache revalidation): called by Vercel crons, GitHub workflows and the email provider. Each one
//     authenticates itself with its own secret (Bearer CRON_SECRET, webhook signature) and refuses everything else; closing them would stop the schedulers;
//   - the two assistant endpoints that components embedded in the Overview page call from the browser.
//
// Enforced in src/proxy.ts. Navigation, search, the sitemap and the Overview's own links are FILTERED VIEWS of this policy (see appNav.ts PUBLIC_APP_NAV,
// GlobalSearch.tsx PUBLIC_SEARCH_INDEX, sitemap.ts), so they cannot drift from it. Hiding a link is never the enforcement: the proxy is.
//
// To reopen a section later: add its path(s) to PUBLIC_PAGE_PATHS and restore the previous proxy behaviour (see docs/access-policy.md). Nothing was deleted.

/** The only page open to the public. */
export const PRIMARY_PUBLIC_PATH = "/overview";

/** Pages open to the public, as exact paths. */
export const PUBLIC_PAGE_PATHS: readonly string[] = [PRIMARY_PUBLIC_PATH];

/**
 * Account UI (Log in, Sign up, account menu, "Create Free Account" prompts). The owner does not want a login or signup anywhere, and /login and /signup are
 * closed, so no control may point at them. The account code is kept (not deleted) but not shown.
 */
export const ACCOUNT_UI_ENABLED = false;

/** Framework and metadata files every page needs. Static assets with an image extension are also excluded from the proxy by its matcher. */
const SYSTEM_EXACT: readonly string[] = ["/robots.txt", "/sitemap.xml", "/favicon.ico", "/icon.svg", "/icon.png", "/apple-icon.png"];
const SYSTEM_PREFIXES: readonly string[] = ["/_next/"];

/** Called by Vercel crons, GitHub workflows and the email provider. Each authenticates itself with its own secret and refuses anything else. */
const SERVER_TO_SERVER_PREFIXES: readonly string[] = ["/api/cron/", "/api/admin/", "/api/webhooks/"];
const SERVER_TO_SERVER_EXACT: readonly string[] = ["/api/revalidate-fx"];

/** Endpoints the Overview page's own embedded components call from the browser (the assistant and its translate helper). */
const OVERVIEW_EMBEDDED_EXACT: readonly string[] = ["/api/assistant", "/api/assistant/translate"];

export type AllowKind = "public-page" | "system" | "server-to-server" | "overview-embedded";

export type AccessDecision =
  | { action: "allow"; kind: AllowKind }
  /** A closed page: send the visitor to the public Overview. Never to a login page. */
  | { action: "redirect"; location: string }
  /** A closed API route, file or callback: answer 404 with no content. */
  | { action: "not-found" };

/**
 * The comparable form of a request path: percent-decoded, duplicate slashes collapsed, trailing slash removed. Returns null for anything malformed or
 * suspicious (bad encoding, NUL, backslash), which is then closed. Case is NOT folded: "/Overview" is not the public page.
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

/** True for a request that is not a page navigation: an API route, an auth callback, a file, or an ICS calendar route handler (which has no extension). Those get a 404, not a redirect. */
function isNonPage(p: string): boolean {
  return p === "/api" || p.startsWith("/api/") || p === "/auth" || p.startsWith("/auth/") || hasFileExtension(p) || p.endsWith("/ics");
}

/** The decision for one request path (the pathname only: no query string or fragment). */
export function decideAccess(pathname: string): AccessDecision {
  const p = normalizePathname(pathname);
  if (p === null) return { action: "not-found" };

  if (PUBLIC_PAGE_PATHS.includes(p)) return { action: "allow", kind: "public-page" };
  if (SYSTEM_EXACT.includes(p) || SYSTEM_PREFIXES.some((x) => p.startsWith(x))) return { action: "allow", kind: "system" };
  if (SERVER_TO_SERVER_EXACT.includes(p) || SERVER_TO_SERVER_PREFIXES.some((x) => p.startsWith(x))) return { action: "allow", kind: "server-to-server" };
  if (OVERVIEW_EMBEDDED_EXACT.includes(p)) return { action: "allow", kind: "overview-embedded" };

  return isNonPage(p) ? { action: "not-found" } : { action: "redirect", location: PRIMARY_PUBLIC_PATH };
}

const SCHEME = /^([a-z][a-z0-9+.-]*:|\/\/)/i;

/** An href that leaves the site (https:, mailto:, tel:, //host). Not governed by this policy. */
export const isExternalHref = (href: string): boolean => SCHEME.test(href);

/** Path of an internal href, without query or fragment. */
const pathOf = (href: string) => href.split("#")[0].split("?")[0];

/** Is this internal href a page the public may open? (An href to a section of a public page counts.) External and fragment-only hrefs are not pages: false. */
export function isPublicPagePath(href: string): boolean {
  if (isExternalHref(href) || href.startsWith("#")) return false;
  const p = normalizePathname(pathOf(href));
  return p !== null && PUBLIC_PAGE_PATHS.includes(p);
}

/**
 * The href if a visitor can follow it, otherwise null. External links and same-page fragments are always followable; an internal link is followable only if
 * it points at a public page. Use it wherever a link to another page would otherwise be rendered.
 */
export function publicHref(href: string): string | null {
  if (isExternalHref(href) || href.startsWith("#")) return href;
  return isPublicPagePath(href) ? href : null;
}

/** True while the site is open beyond the Overview: only then do the Overview's navigation-only sections (Explore, Provincial budgets, Popular insights) have anywhere to point. */
export const offersMoreThanOverview = (): boolean => PUBLIC_PAGE_PATHS.length > 1;

/** For the sitemap: is this absolute URL a public page? */
export function isPublicUrl(url: string): boolean {
  try {
    return isPublicPagePath(new URL(url).pathname);
  } catch {
    return false;
  }
}
