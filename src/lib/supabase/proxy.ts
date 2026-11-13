// Session refresh + route protection logic, invoked from the root proxy.ts
// (Next.js 16 renamed the `middleware.ts` file convention to `proxy.ts` —
// see proxy.ts for the file-convention requirements; this module is just a
// regular helper, not itself a special file).
//
// This is the original implementation (commit 04acfd4), extended in one way: WHICH requests need a session now comes from src/lib/accessPolicy.ts
// (everything except the Overview, the landing page and the sign-in pages), instead of the old short list in protectedSections.ts.
//
// Two jobs, both required on a page request:
//   1. Refresh the Supabase session cookie (auth.getUser() does this as a
//      side effect) — without this, a signed-in user's session silently
//      expires because nothing else in the request lifecycle refreshes it.
//   2. For a request the policy says needs a signed-in user: send a signed-out visitor to /login?redirect=<where they were going> (a page), or
//      answer 401 (an API route, file or feed). This is the server-side enforcement for direct URL visits, deep links, bookmarks and data requests;
//      the navigation's GuestAccessModal handles the common case (clicking a link) without ever reaching here.
//
// auth.getUser() asks the Supabase Auth server to validate the token (it does not trust the cookie's contents), so a forged or expired cookie is a guest.
// If Supabase cannot be reached, the visitor is treated as a guest: the gate fails CLOSED. A request with no auth cookie at all cannot have a session, so
// it never costs a Supabase round trip (anonymous traffic cannot be used to hammer the auth server).

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { loginUrlFor, type MembersSurface } from "@/lib/accessPolicy";

export type SessionRule =
  /** Never touch Supabase (machine routes, assets). */
  | { mode: "skip" }
  /** Keep the session alive, but let the request through whether or not there is one. */
  | { mode: "refresh" }
  /** A signed-in user is required; otherwise refuse as `surface` says. */
  | { mode: "require"; surface: MembersSurface };

/** Supabase's cookie for the session is `sb-<project>-auth-token`, split into `.0`, `.1`, ... when it is large. */
const AUTH_COOKIE = /^sb-.+-auth-token(\.\d+)?$/;
export const hasAuthCookie = (request: NextRequest): boolean => request.cookies.getAll().some((c) => AUTH_COOKIE.test(c.name) && c.value !== "");

/** Closed responses must never be cached as if they were content. */
const NO_STORE = { "cache-control": "no-store" };

function refuse(request: NextRequest, surface: MembersSurface): NextResponse {
  if (surface === "page") {
    const { pathname, search } = request.nextUrl;
    return NextResponse.redirect(new URL(loginUrlFor(pathname, search), request.url), { status: 307, headers: NO_STORE });
  }
  return NextResponse.json({ error: "login_required" }, { status: 401, headers: { ...NO_STORE, "www-authenticate": "Bearer realm=\"PEIC\"" } });
}

export async function updateSession(request: NextRequest, rule: SessionRule = { mode: "refresh" }): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  if (rule.mode === "skip") return response;

  // No session cookie: there is nothing to refresh and the visitor is a guest. (No Supabase call.)
  if (!hasAuthCookie(request)) {
    return rule.mode === "require" ? refuse(request, rule.surface) : response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // Do not insert any logic between createServerClient and getUser() — the
  // call itself is what triggers the token-refresh side effect above via
  // setAll. Moving or skipping it silently breaks session persistence.
  let user: unknown = null;
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch {
    user = null; // Supabase unreachable or the token is unreadable: fail closed.
  }

  if (!user && rule.mode === "require") return refuse(request, rule.surface);

  return response;
}
