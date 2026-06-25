"use client";

// Client-side auth state — same Context + Provider + hook shape as
// ThemeProvider.tsx, so components that need to know "is anyone signed in"
// (the Sidebar's link interception, the GuestAccessModal, account UI) don't
// each need their own Supabase client + listener. proxy.ts is still the
// real source of truth for protecting a route — this provider is for UI
// state (show Login vs. Account), not authorization.

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

interface AuthContextValue {
  user: User | null;
  /** True only until the first session check resolves — lets UI avoid a flash of "signed out" while Supabase reads the existing session cookie. */
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signOut: async () => {},
});

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  // Re-checks the session on every route change, not just once on mount.
  // Root cause (confirmed live): /login's signIn Server Action authenticates
  // and sets the session cookie entirely server-side, then redirect()s —
  // a soft, client-side route transition that does NOT remount this
  // provider. The browser's own Supabase client never performed that
  // sign-in itself, so onAuthStateChange (below) never fires for it, and
  // without this effect `user` stayed stuck at whatever it was before
  // logging in (null) for the rest of the session — exactly matching the
  // reported bug, where the modal reappeared on every later protected
  // click despite a genuinely valid session. Doesn't touch `loading` on
  // these re-checks (only the initial mount sets it), so navigating around
  // an already-resolved session never re-flashes a loading state.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });
  }, [pathname]);

  useEffect(() => {
    const supabase = createClient();

    // Keeps every component reading useAuth() in sync the moment sign-in,
    // sign-out, or a token refresh happens through THIS browser client
    // directly (e.g. signOut() below) — the pathname effect above is what
    // covers session changes made server-side, like signIn().
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, loading, signOut }}>{children}</AuthContext.Provider>;
}
