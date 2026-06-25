"use client";

// Browser-side Supabase client — used in Client Components (forms, the
// AuthProvider's onAuthStateChange listener). Only ever constructed with
// NEXT_PUBLIC_* env vars: the publishable key is safe to ship to the
// browser by design (Supabase's Row Level Security is what actually
// protects data, not secrecy of this key) — never import the service role
// key here or in any file under this directory.

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// Module-level singleton — AuthProvider previously called this twice (once
// in its main effect, once inside signOut()), each call constructing a
// brand-new SupabaseClient instance. They shared the same underlying
// cookie storage so it wasn't the direct cause of the authenticated-
// detection bug, but two independent client objects in memory is exactly
// the "duplicate client" risk the audit asked to rule out, so caching one
// instance per page load removes any doubt.
let browserClient: SupabaseClient | undefined;

export function createClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return browserClient;
}
