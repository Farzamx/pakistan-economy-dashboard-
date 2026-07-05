"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Language, Translations } from "@/lib/i18n/types";
import { LANGUAGE_OPTIONS } from "@/lib/i18n/types";
import { en } from "@/lib/i18n/translations/en";
import { ur } from "@/lib/i18n/translations/ur";
import { rm } from "@/lib/i18n/translations/rm";

const TRANSLATIONS: Record<Language, Translations> = { en, ur, rm };
const STORAGE_KEY = "pakecon-language";

// Resolve a dot-notation key path into a nested object value.
// Returns the key itself as fallback so missing keys are visible in the UI.
function resolve(obj: Record<string, unknown>, path: string): string {
  const parts = path.split(".");
  let cursor: unknown = obj;
  for (const part of parts) {
    if (cursor == null || typeof cursor !== "object") return path;
    cursor = (cursor as Record<string, unknown>)[part];
  }
  return typeof cursor === "string" ? cursor : path;
}

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  /** Translate a dot-notation key, e.g. t("nav.dashboard") */
  t: (key: string) => string;
  /** Current text direction — "rtl" for Urdu, "ltr" for en/rm */
  dir: "ltr" | "rtl";
  /** CSS font-family override for Urdu text nodes */
  urduFont: string;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: "en",
  setLanguage: () => {},
  t: (k) => k,
  dir: "ltr",
  urduFont: "",
});

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [mounted, setMounted] = useState(false);

  // Read persisted language on mount — only runs client-side
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Language | null;
    if (saved && (saved === "en" || saved === "ur" || saved === "rm")) {
      setLanguageState(saved);
    }
    setMounted(true);
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  }, []);

  const t = useCallback(
    (key: string): string => {
      const translations = TRANSLATIONS[language];
      return resolve(translations as unknown as Record<string, unknown>, key);
    },
    [language]
  );

  const option = LANGUAGE_OPTIONS.find((o) => o.code === language);
  const dir = option?.dir ?? "ltr";
  const urduFont = language === "ur" ? "'Noto Nastaliq Urdu', serif" : "";

  // Render with the default "en" strings on the server / before hydration
  // to avoid a flash of translated content that SSR doesn't match.
  const value: LanguageContextValue = {
    language: mounted ? language : "en",
    setLanguage,
    t: mounted ? t : (k) => resolve(en as unknown as Record<string, unknown>, k),
    dir: mounted ? dir : "ltr",
    urduFont,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
