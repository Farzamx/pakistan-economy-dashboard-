// Next.js 16 renamed the `middleware.ts` file convention to `proxy.ts` (the exported function is `proxy`, not `middleware`), verified against this
// project's installed Next.js docs (node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md).
//
// ACCESS POLICY (G.20). This file applies src/lib/accessPolicy.ts to EVERY request, before any page renders and before any cache is read:
//   - open routes (the Overview, the landing page, the sign-in pages, machine routes with their own secrets) pass through; pages also get their session
//     cookie refreshed;
//   - everything else needs a signed-in user (src/lib/supabase/proxy.ts checks the session with Supabase): a guest is sent to /login?redirect=<page>
//     (pages) or receives 401 (API routes, feeds and files), so a protected page's content and data never reach a signed-out browser, whether it asked for
//     the HTML, the client-navigation payload or a data endpoint;
//   - a malformed path is answered 404.
//
// The matcher runs the proxy on every request except Next's own static files, image optimisation and image-extension assets. API routes are NOT
// excluded (they used to be at 04acfd4): data endpoints must be gated too, and the machine routes are allowed by name in accessPolicy.ts.
import { NextResponse, type NextRequest } from "next/server";
import { decideAccess } from "@/lib/accessPolicy";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const decision = decideAccess(request.nextUrl.pathname);

  if (decision.action === "not-found") {
    return new NextResponse("Not found", { status: 404, headers: { "cache-control": "no-store", "content-type": "text/plain; charset=utf-8" } });
  }

  if (decision.action === "allow") {
    return updateSession(request, decision.session === "refresh" ? { mode: "refresh" } : { mode: "skip" });
  }

  return updateSession(request, { mode: "require", surface: decision.surface });
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
