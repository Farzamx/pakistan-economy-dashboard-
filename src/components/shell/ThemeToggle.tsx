"use client";

// One-click light/dark switch for the shell (PEIC redesign Phase 2).
//
// Writes the theme exactly the way SettingsModal and PreferencesBoard do:
// ThemeProvider.setTheme (localStorage + the device's explicit-choice marker
// + <html data-theme>) and, for a signed-in user, the account preference — so
// PreferencesProvider's cross-device sync can never revert a choice made here.
//
// A toggle button with aria-pressed, so assistive tech announces both the
// control ("Dark mode, toggle button") and its state ("pressed"/"not
// pressed"). Before mount, state is ThemeProvider's default; the server and
// the first client render therefore agree, and the icon settles to a saved
// choice right after hydration without a mismatch warning.

import { useTheme, type Theme } from "@/components/ThemeProvider";
import { useAuth } from "@/components/AuthProvider";
import { usePreferences } from "@/components/PreferencesProvider";
import { useLanguage } from "@/components/LanguageProvider";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const { updatePreferences } = usePreferences();
  const { t } = useLanguage();
  const dark = theme === "dark";

  function toggle() {
    const next: Theme = dark ? "light" : "dark";
    setTheme(next);
    if (user) updatePreferences({ preferredTheme: next }).catch(() => {});
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={dark}
      aria-label={t("appNav.darkMode")}
      title={t("appNav.darkMode")}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-[var(--pe-radius)] transition-colors ${className}`}
    >
      {dark ? (
        // Sun: what pressing it will switch back to.
        <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4" />
        </svg>
      ) : (
        <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
        </svg>
      )}
    </button>
  );
}
