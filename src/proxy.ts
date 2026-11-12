// Next.js 16 renamed the `middleware.ts` file convention to `proxy.ts` (the exported function is `proxy`, not `middleware`), verified against this
// project's installed Next.js docs (node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md).
//
// ACCESS POLICY (G.14). This file enforces src/lib/accessPolicy.ts and nothing else: only the Overview page is public; every other route is closed. There is
// no login, signup or session here: a closed page redirects to the public Overview, a closed API route, file or callback answers 404.
//
// Previously this delegated to src/lib/supabase/proxy.ts (session refresh, redirect to /login for premium tools). That module is kept, unused, with the rest of
// the account code, for a possible future reopening. No Supabase call happens on any request any more.
//
// The matcher runs the proxy on EVERY request except Next's own static files, image optimisation and image-extension assets. API routes are NOT excluded:
// the open ones (crons, webhooks, admin health, the Overview's assistant) are allowed by name in accessPolicy.ts, everything else is closed.
import { NextResponse, type NextRequest } from "next/server";
import { decideAccess } from "@/lib/accessPolicy";

export function proxy(request: NextRequest) {
  const decision = decideAccess(request.nextUrl.pathname);

  if (decision.action === "allow") return NextResponse.next();

  // Closed responses must never be cached as if they were content.
  const headers = { "cache-control": "no-store" };

  if (decision.action === "redirect") {
    return NextResponse.redirect(new URL(decision.location, request.url), { status: 307, headers });
  }

  return new NextResponse("Not found", { status: 404, headers: { ...headers, "content-type": "text/plain; charset=utf-8" } });
}

export const config = {
  matcher: [
    /*
     * Run on every request EXCEPT:
     *   - Next's static files and image optimisation (_next/static, _next/image),
     *   - the favicon and image-extension assets (svg, png, jpg, jpeg, gif, webp, ico): public icons, nothing of the product.
     * API routes are deliberately included (see the header comment).
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
