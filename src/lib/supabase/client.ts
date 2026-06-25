"use client";

// Browser-side Supabase client — used in Client Components (forms, the
// AuthProvider's onAuthStateChange listener). Only ever constructed with
// NEXT_PUBLIC_* env vars: the publishable key is safe to ship to the
// browser by design (Supabase's Row Level Security is what actually
// protects data, not secrecy of this key) — never import the service role
// key here or in any file under this directory.

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
