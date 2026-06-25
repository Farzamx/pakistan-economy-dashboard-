"use client";

// Client-side auth state — same Context + Provider + hook shape as
// ThemeProvider.tsx, so components that need to know "is anyone signed in"
// (the Sidebar's link interception, the GuestAccessModal, account UI) don't
// each need their own Supabase client + listener. proxy.ts is still the
// real source of truth for protecting a route — this provider is for UI
// state (show Login vs. Account), not authorization.

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
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

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });

    // Keeps every component reading useAuth() in sync the moment sign-in,
    // sign-out, or a token refresh happens anywhere in the app — without
    // this, the Sidebar would only learn about a successful login after a
    // full page reload.
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
