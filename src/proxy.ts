// Next.js 16 renamed the `middleware.ts` file convention to `proxy.ts` (the
// exported function is `proxy`, not `middleware`) — verified directly
// against this project's installed Next.js docs rather than assumed from
// older tutorials, since AGENTS.md flags this version as having breaking
// changes from training-data expectations. This file's only job is to
// delegate to the Supabase session-refresh + route-protection logic.

import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on every request except static assets and image optimization —
     * Proxy still needs to run on the rest, including API/data routes, per
     * Next's own guidance not to rely on a matcher alone for protecting
     * Server Functions on excluded paths (none of ours touch protected
     * data, but this keeps the session-refresh behavior consistent
     * everywhere it matters).
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
