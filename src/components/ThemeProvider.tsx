"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Theme = "dark" | "light";

const STORAGE_KEY = "dashboard-theme";
// Presence (not value) is what matters: set the first time this device ever
// records an explicit local theme choice, persisted (not just an in-memory
// ref) so it survives a hard reload. PreferencesProvider (via
// shouldAdoptRemoteTheme below) treats its mere existence as "this device
// has an explicit choice, never let a remote value override it again" — see
// that function's own comment for why a timestamp comparison against it was
// tried first and turned out to be unsound.
export const STORAGE_UPDATED_AT_KEY = "dashboard-theme-updated-at";

// Pure decision function, extracted from PreferencesProvider's fetch-effect
// so the reconciliation rule is unit-testable without rendering a component.
//
// Phase 10.8 root-cause fix: an earlier version compared this device's last
// local-write timestamp against the DB row's `updated_at` to decide whether
// a remote theme value was "genuinely newer." That is unsound because
// `updated_at` on user_preferences is a whole-ROW timestamp (migration
// 0001's trigger sets it on every write, regardless of which columns
// changed) — an unrelated preference write (favorites, province, dashboard
// layout) advances it even though `preferred_theme` itself didn't change,
// so a later fetch could see a DB row that "looks newer" while still
// holding a stale theme value, and would silently push that stale value
// back onto a device that already had a correct, explicit local choice.
// Confirmed as the exact mechanism behind reported "theme reverts on its
// own after some time" reports.
//
// The fix: don't use the row's timestamp as a per-field recency signal at
// all. A remote theme value is only ever adopted when this specific device
// has no explicit local record of ever choosing a theme (`hasLocalWrite`
// false) — i.e. purely as a courtesy default for a genuinely new
// browser/device. Once a device has made any explicit choice, it is
// authoritative on that device indefinitely, matching the product
// requirement that an explicit selection persists until the user changes
// it themselves.
export function shouldAdoptRemoteTheme(args: {
  /** Is anyone signed in? Signed-out visitors have no DB row to sync from. */
  hasUser: boolean;
  /** The theme stored against this user's account, if any. */
  remoteTheme: Theme | null | undefined;
  /** This device's theme at the moment the preferences fetch started. */
  themeAtFetchStart: Theme;
  /** This device's theme right now (may differ if the user toggled while the fetch was in flight). */
  currentTheme: Theme;
  /** Has this device ever recorded an explicit local theme write (STORAGE_UPDATED_AT_KEY present)? */
  hasLocalWrite: boolean;
}): boolean {
  const { hasUser, remoteTheme, themeAtFetchStart, currentTheme, hasLocalWrite } = args;
  return (
    hasUser &&
    !!remoteTheme &&
    remoteTheme !== themeAtFetchStart &&
    currentTheme === themeAtFetchStart &&
    !hasLocalWrite
  );
}

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  setTheme: () => {},
});

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

// localStorage access THROWS (rather than returning null) when a browser
// blocks site data — Safari private mode, an embedded webview, or a
// "block cookies and site data" setting. The inline bootstrap script in
// layout.tsx already wraps its own identical read in try/catch for exactly
// this reason; these helpers extend the same guarantee to the React side,
// which previously let such a throw escape both a render effect and the
// toggle's onClick handler. The latter mattered most: the throw aborted
// setTheme() before it ever reached setAttribute(), so on those browsers
// the theme button appeared to do nothing at all.
export function readStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : null;
  } catch {
    return null;
  }
}

export function writeStoredTheme(next: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, next);
    localStorage.setItem(STORAGE_UPDATED_AT_KEY, String(Date.now()));
  } catch {
    // Storage unavailable — the choice still applies for this page's
    // lifetime via the DOM attribute; it just can't be remembered.
  }
}

/**
 * Has this device ever recorded an explicit theme choice? Read by
 * PreferencesProvider via shouldAdoptRemoteTheme's `hasLocalWrite`.
 * Returns false when storage is unreadable — a device that cannot persist
 * a choice has no local choice to defend, so deferring to the account's
 * stored preference is correct there and cannot resurrect the reverting
 * behaviour described above (that required a stored local choice to
 * override in the first place).
 */
export function hasExplicitLocalThemeChoice(): boolean {
  try {
    return localStorage.getItem(STORAGE_UPDATED_AT_KEY) !== null;
  } catch {
    return false;
  }
}

function applyThemeAttribute(next: Theme): void {
  document.documentElement.setAttribute("data-theme", next);
}

/**
 * Which theme (if any) another tab's storage write means for this tab.
 * Returns null for any key this provider doesn't own, so an unrelated
 * localStorage write elsewhere in the app can never move the theme —
 * the part of the cross-tab rule most likely to regress silently.
 */
export function themeFromStorageEvent(key: string | null, newValue: string | null): Theme | null {
  if (key !== STORAGE_KEY) return null;
  return newValue === "light" ? "light" : "dark";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Default to dark — the inline script in layout.tsx already set data-theme
  // on <html> before React hydrates, so there is no flash.
  const [theme, setThemeState] = useState<Theme>("dark");

  // On first mount, sync React state with whatever the inline script set.
  useEffect(() => {
    const resolved: Theme = readStoredTheme() ?? "dark";
    setThemeState(resolved);
    // Re-assert the attribute rather than trusting the inline script alone:
    // if that script was blocked (CSP, an extension) the document is still
    // on the SSR default while React now knows better.
    applyThemeAttribute(resolved);
  }, []);

  // Keep every tab on this device in agreement. The `storage` event fires
  // only in the OTHER tabs of the same origin, so this never echoes a tab's
  // own write back to itself. Without it, switching to Light in one tab left
  // every already-open tab on Dark until it happened to be reloaded — which
  // contradicts the rule this provider otherwise enforces, that the DEVICE's
  // explicit choice is authoritative. Deliberately updates state + the DOM
  // only, never localStorage, so two tabs can't ping-pong writes at
  // each other.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      const next = themeFromStorageEvent(e.key, e.newValue);
      if (!next) return;
      setThemeState(next);
      applyThemeAttribute(next);
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    writeStoredTheme(next);
    applyThemeAttribute(next);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
