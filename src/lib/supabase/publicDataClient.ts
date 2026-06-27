// Minimal Supabase client for PUBLIC, non-personalized reference data
// (Economic Calendar's events/series tables) — deliberately NOT the
// cookie-aware @supabase/ssr client in server.ts. That client calls
// next/headers' cookies(), which forces the calling route into dynamic
// rendering — appropriate for session-dependent pages, wrong for the
// Economic Calendar's Event Detail/Archive pages, which are public,
// identical for every visitor, and meant to stay statically generated
// (generateStaticParams + ISR) like every other SEO detail page on this
// dashboard. RLS — not key secrecy — is what protects this data; the same
// anon key used everywhere else is safe here too.

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createPublicDataClient() {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
