// Session refresh + route protection logic, invoked from the root proxy.ts
// (Next.js 16 renamed the `middleware.ts` file convention to `proxy.ts` —
// see proxy.ts for the file-convention requirements; this module is just a
// regular helper, not itself a special file).
//
// Two jobs, both required on every request:
//   1. Refresh the Supabase session cookie (auth.getUser() does this as a
//      side effect) — without this, a signed-in user's session silently
//      expires because nothing else in the request lifecycle refreshes it.
//   2. Redirect signed-out users away from the three protected sections
//      (Comparisons, Federal Budget Workshop, Provincial Budget Workshop)
//      to /login. This is the server-side safety net for direct URL
//      visits/deep links/bookmarks — the Sidebar's GuestAccessModal handles
//      the common case (clicking a nav link) without ever reaching here.

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isProtectedPath } from "@/lib/protectedSections";

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

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
  const { data: { user } } = await supabase.auth.getUser();

  if (isProtectedPath(request.nextUrl.pathname) && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
