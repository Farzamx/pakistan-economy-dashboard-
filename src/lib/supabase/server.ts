// Server-side Supabase client — for Server Components, Server Actions, and
// Route Handlers. Reads/writes the session via Next's `cookies()`, which is
// async in this Next.js version (15+). Creating a new client per request
// (rather than a shared singleton) is intentional and matches Supabase's
// own guidance — Server Components/Actions are request-scoped, and a
// shared client would leak one request's cookies into another's.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // setAll is called from a Server Component sometimes (e.g. when
            // Supabase silently refreshes a token mid-render) — cookies()
            // can't be mutated there. Safe to ignore: proxy.ts already
            // refreshes the session on every request, so the cookie is
            // still kept current overall.
          }
        },
      },
    },
  );
}
