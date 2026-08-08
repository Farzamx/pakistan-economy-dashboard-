// Next.js 16 renamed the `middleware.ts` file convention to `proxy.ts` (the
// exported function is `proxy`, not `middleware`) — verified directly
// against this project's installed Next.js docs rather than assumed from
// older tutorials, since AGENTS.md flags this version as having breaking
// changes from training-data expectations. This file's two jobs: delegate
// to the Supabase session-refresh + route-protection logic, and handle
// returning-visitor routing on "/".
//
// Next.js allows exactly one proxy.ts/middleware.ts per app, so there is no
// way to give the returning-visitor logic a matcher scoped to "/" alone
// without also giving up the session-refresh matcher's much broader
// coverage (needed on nearly every route). Both live in this one function
// instead, each gated by its own explicit pathname check — the config.matcher
// below is unchanged from before this feature existed, and the
// returning-visitor behavior itself only ever triggers for "/" or sets its
// cookie on "/overview", exactly as if it had its own narrower matcher.
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// 180 days — see the returning-visitor routing spec. Path=/ so the cookie
// is sent on every request (proxy.ts needs to read it on "/"); SameSite=Lax
// is enough since this is only ever read on same-site top-level navigation;
// Secure is conditional so local http development still works.
const RETURNING_VISITOR_COOKIE = "peic_returning";
const RETURNING_VISITOR_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // A URL fragment (e.g. "/#data-sources") never reaches the server at
  // all — the browser strips it before sending the request — so this proxy
  // has no way to tell "a deep link to a specific landing-page section"
  // apart from "a bare visit to /" by pathname alone. Links that need to
  // always land on "/" regardless of returning-visitor status (the nav/
  // footer "Data" link, currently the only one) carry an explicit
  // ?section= query param as the one signal that DOES survive to the
  // server; the actual scroll still comes from the "#data-sources" fragment
  // on the same href, once the browser's native page load reaches an id
  // that matches. This keeps the returning-visitor redirect scoped to real
  // bare "/" visits only, exactly as originally intended below.
  const isExplicitSectionLink = request.nextUrl.searchParams.has("section");

  // Checked before updateSession() so a returning visitor's redirect never
  // pays for a Supabase session lookup that /overview's own proxy
  // invocation (triggered by the redirect target) immediately repeats.
  if (pathname === "/" && !isExplicitSectionLink && request.cookies.get(RETURNING_VISITOR_COOKIE)?.value === "1") {
    // 307, not 301/308 — a permanent redirect would be cached by the
    // browser even after the cookie itself expires or is cleared, trapping
    // a visitor on /overview with no way back to "/" via the bare domain.
    return NextResponse.redirect(new URL("/overview", request.url), 307);
  }

  const response = await updateSession(request);

  // Background prefetches for every visible <Link> — including the
  // "Platform" link (href="/overview") that sits right next to "Data" in
  // the same nav — must never set this cookie, or merely having that link
  // on screen would mark a first-time visitor "returning" before they ever
  // actually pressed anything, poisoning the very next request to "/"
  // (including "Data"'s own prefetch) into redirecting to /overview too.
  // Two distinct prefetch mechanisms can produce that request, and each
  // marks it differently: Next's own RSC-fetch prefetching sets
  // next-router-prefetch itself (client JS, custom header); the browser's
  // native <link rel="prefetch"> (which Next also emits as a plain HTML
  // tag for some links) is handled entirely by Chromium's own network
  // stack instead, with no Next-specific header at all — only the
  // standard Sec-Purpose/Purpose prefetch header the fetch spec defines
  // for exactly this case. Checking next-router-prefetch alone missed
  // that second path (confirmed against a live request trace).
  const purpose = request.headers.get("sec-purpose") ?? request.headers.get("purpose") ?? "";
  const isPrefetch = request.headers.get("next-router-prefetch") === "1" || purpose.includes("prefetch");
  if (pathname === "/overview" && !isPrefetch) {
    response.cookies.set(RETURNING_VISITOR_COOKIE, "1", {
      maxAge: RETURNING_VISITOR_MAX_AGE_SECONDS,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on every request EXCEPT:
     *   - Static assets and image optimisation (_next/static, _next/image, favicon, images)
     *   - API routes (/api/...) — server-to-server callers (Resend webhooks,
     *     cron workers, etc.) have no session cookies, so auth.getUser() would
     *     always return null and add a pointless Supabase round-trip. Protected
     *     data is gated at the RPC layer via NOTIFICATION_WORKER_SECRET, not
     *     via session cookies, so skipping the proxy on API routes loses nothing.
     */
    "/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
