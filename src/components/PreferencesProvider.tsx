"use client";

// Dashboard Preference System — same Context + Provider + hook shape as
// AuthProvider.tsx, deliberately kept separate from it (per the audit:
// AuthProvider re-validates on every route change for session-correctness
// reasons that have nothing to do with preferences; coupling the two would
// mean every route change re-fetches preferences for no reason, or every
// preference write risks interfering with the auth-state effect).
//
// Fetches once when `user` becomes available and again whenever `user`
// changes (covers sign-in/sign-out without a page reload). There is no
// localStorage cache for preferences themselves — Supabase is the single
// source of truth, so a second device always sees this device's latest
// write on its own next fetch, which is the entire mechanism behind
// "sync across devices."

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useTheme } from "@/components/ThemeProvider";
import {
  getUserPreferences,
  upsertUserPreferences,
  type UserPreferences,
  type PreferencesPatch,
} from "@/lib/supabase/preferences";

interface PreferencesContextValue {
  preferences: UserPreferences | null;
  /** True only until the first fetch resolves (or immediately false for a signed-out visitor, who has nothing to fetch). */
  loading: boolean;
  /** Optimistically updates local state, then persists to Supabase. Throws on failure — callers decide how to surface that. */
  updatePreferences: (patch: PreferencesPatch) => Promise<void>;
}

const PreferencesContext = createContext<PreferencesContextValue>({
  preferences: null,
  loading: false,
  updatePreferences: async () => {},
});

export function usePreferences(): PreferencesContextValue {
  return useContext(PreferencesContext);
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { theme, setTheme } = useTheme();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  // Cross-device theme sync needs to happen exactly once per fresh load —
  // without this guard, every re-render after the fetch would re-apply the
  // DB's theme and silently fight a manual toggle made later in the same
  // session.
  const syncedThemeRef = useRef(false);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    syncedThemeRef.current = false;
    // No synchronous setLoading(true) here — same convention as
    // AuthProvider.tsx's pathname effect: only the initial mount's
    // useState(true) default matters for `loading`; a later re-fetch
    // (user switching accounts without a refresh) doesn't re-flash a
    // loading state. This also sidesteps react-hooks/set-state-in-effect,
    // the same purity rule hit earlier in AuthProvider.tsx and
    // MobileStickyCta.tsx this session — every setState call below happens
    // inside a .then()/.catch()/.finally() callback, never synchronously
    // in the effect body itself.
    const load = user ? getUserPreferences() : Promise.resolve(null);
    load
      .then((prefs) => {
        if (cancelled) return;
        setPreferences(prefs);
        // This device's localStorage may predate the account, or another
        // device may have changed the theme since — DB wins on first load.
        if (user && !syncedThemeRef.current && prefs?.preferredTheme && prefs.preferredTheme !== theme) {
          setTheme(prefs.preferredTheme);
        }
        syncedThemeRef.current = true;
      })
      .catch(() => { if (!cancelled) setPreferences(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // theme/setTheme intentionally omitted — this effect's job is "run once
    // per user/login," not "re-run whenever the theme changes" (which would
    // happen on every toggle, since this same effect just set it).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const updatePreferences = useCallback(
    async (patch: PreferencesPatch) => {
      if (!user) return;
      // Optimistic merge so the UI (drag reorder, hide toggle, theme swap)
      // feels instant rather than waiting on a round trip.
      setPreferences((prev) => ({
        id: prev?.id ?? "",
        userId: user.id,
        favoriteIndicators: patch.favoriteIndicators ?? prev?.favoriteIndicators ?? [],
        dashboardLayout: patch.dashboardLayout ?? prev?.dashboardLayout ?? { hidden: [] },
        preferredProvince: patch.preferredProvince !== undefined ? patch.preferredProvince : prev?.preferredProvince ?? null,
        preferredTheme: patch.preferredTheme !== undefined ? patch.preferredTheme : prev?.preferredTheme ?? null,
        createdAt: prev?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      const saved = await upsertUserPreferences(user.id, patch);
      setPreferences(saved);
    },
    [user],
  );

  return (
    <PreferencesContext.Provider value={{ preferences, loading, updatePreferences }}>
      {children}
    </PreferencesContext.Provider>
  );
}
