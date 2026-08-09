// Next.js 16 renamed the `middleware.ts` file convention to `proxy.ts` (the
// exported function is `proxy`, not `middleware`) — verified directly
// against this project's installed Next.js docs rather than assumed from
// older tutorials, since AGENTS.md flags this version as having breaking
// changes from training-data expectations. This file's job: delegate to the
// Supabase session-refresh + route-protection logic.
//
// This used to also handle returning-visitor routing on "/" (a
// peic_returning cookie that redirected "/" straight to /overview for
// anyone who'd visited before) — removed because "/" must always render
// the marketing landing page; /overview is reached only by explicit
// navigation (the "Open the platform" CTA or a direct URL), never by an
// automatic redirect based on visit history.
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
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
