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
// When the theme was last changed ON THIS DEVICE, in epoch ms — persisted
// (not just an in-memory ref) so it survives a hard reload. PreferencesProvider
// compares this against a fetched preferences row's own updatedAt to tell
// "the DB genuinely has a newer value from another device" apart from "my
// own write just hasn't propagated to this read yet" (see its comment).
export const STORAGE_UPDATED_AT_KEY = "dashboard-theme-updated-at";

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

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Default to dark — the inline script in layout.tsx already set data-theme
  // on <html> before React hydrates, so there is no flash.
  const [theme, setThemeState] = useState<Theme>("dark");

  // On first mount, sync React state with whatever the inline script set.
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    const resolved: Theme = stored === "light" ? "light" : "dark";
    setThemeState(resolved);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    localStorage.setItem(STORAGE_KEY, next);
    localStorage.setItem(STORAGE_UPDATED_AT_KEY, String(Date.now()));
    document.documentElement.setAttribute("data-theme", next);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
