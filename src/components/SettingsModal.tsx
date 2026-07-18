"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme, type Theme } from "@/components/ThemeProvider";
import { useAuth } from "@/components/AuthProvider";
import { usePreferences } from "@/components/PreferencesProvider";
import { useLanguage } from "@/components/LanguageProvider";
import { LANGUAGE_OPTIONS, type Language } from "@/lib/i18n/types";

interface Props {
  open: boolean;
  onClose: () => void;
}

const BACKDROP = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const PANEL = {
  hidden: { opacity: 0, scale: 0.95, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0 },
};

function ThemeOption({
  value,
  current,
  onSelect,
  label,
  description,
}: {
  value: Theme;
  current: Theme;
  onSelect: (t: Theme) => void;
  label: string;
  description: string;
}) {
  const selected = value === current;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={`flex w-full items-center gap-4 rounded-xl border px-4 py-4 text-left transition-all ${
        selected
          ? "border-sky-500/40 bg-sky-500/10"
          : "border-[var(--border)] bg-[var(--surface-raised)] hover:border-[var(--border)] hover:bg-[var(--surface-hover)]"
      }`}
    >
      {/* Theme preview swatch */}
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
          value === "dark"
            ? "border-white/10 bg-[#05060f]"
            : "border-slate-200 bg-[#F4F6FA]"
        }`}
      >
        <div
          className={`h-5 w-5 rounded ${
            value === "dark" ? "bg-white/10" : "bg-white shadow-sm"
          }`}
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
        <p className="mt-0.5 text-xs text-[var(--text-muted)]">{description}</p>
      </div>

      {/* Radio indicator */}
      <div
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
          selected ? "border-sky-500" : "border-[var(--border)]"
        }`}
      >
        {selected && <div className="h-2 w-2 rounded-full bg-sky-500" />}
      </div>
    </button>
  );
}

function LanguageOption({
  value,
  current,
  onSelect,
}: {
  value: Language;
  current: Language;
  onSelect: (l: Language) => void;
}) {
  const option = LANGUAGE_OPTIONS.find((o) => o.code === value)!;
  const selected = value === current;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
        selected
          ? "border-sky-500/40 bg-sky-500/10"
          : "border-[var(--border)] bg-[var(--surface-raised)] hover:bg-[var(--surface-hover)]"
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)]">{option.nativeLabel}</p>
        {option.nativeLabel !== option.label && (
          <p className="text-xs text-[var(--text-muted)]">{option.label}</p>
        )}
      </div>
      <div
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
          selected ? "border-sky-500" : "border-[var(--border)]"
        }`}
      >
        {selected && <div className="h-2 w-2 rounded-full bg-sky-500" />}
      </div>
    </button>
  );
}

export default function SettingsModal({ open, onClose }: Props) {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const { updatePreferences } = usePreferences();
  const { language, setLanguage, t } = useLanguage();

  // Bug fix: this modal used to call setTheme() alone, which only ever
  // wrote to localStorage — a signed-in user's choice never reached
  // Supabase, so PreferencesProvider's cross-device sync would silently
  // revert it back to whatever (older) theme was last saved via the full
  // /settings/preferences page, the next time its DB fetch resolved. Now
  // mirrors PreferencesBoard.tsx's handleThemeChange exactly.
  function handleThemeSelect(next: Theme) {
    setTheme(next);
    if (user) updatePreferences({ preferredTheme: next }).catch(() => {});
  }

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Prevent body scroll while modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="settings-backdrop"
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            variants={BACKDROP}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="settings-panel"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <motion.div
              className="pointer-events-auto w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl"
              variants={PANEL}
              initial="hidden"
              animate="visible"
              exit="hidden"
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  {t("settings.title")}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                  aria-label="Close settings"
                >
                  <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M2 2l12 12M14 2L2 14" />
                  </svg>
                </button>
              </div>

              {/* Section — Appearance */}
              <div className="mt-6">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                  {t("settings.appearance")}
                </p>
                <div className="space-y-2">
                  <ThemeOption
                    value="dark"
                    current={theme}
                    onSelect={handleThemeSelect}
                    label={t("settings.darkMode")}
                    description={t("settings.darkModeDesc")}
                  />
                  <ThemeOption
                    value="light"
                    current={theme}
                    onSelect={handleThemeSelect}
                    label={t("settings.lightMode")}
                    description={t("settings.lightModeDesc")}
                  />
                </div>
              </div>

              {/* Section — Language */}
              <div className="mt-6">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                  {t("settings.language")}
                </p>
                <div className="space-y-2">
                  {LANGUAGE_OPTIONS.map((opt) => (
                    <LanguageOption
                      key={opt.code}
                      value={opt.code}
                      current={language}
                      onSelect={setLanguage}
                    />
                  ))}
                </div>
              </div>

              {/* Section — Dashboard Preferences */}
              <div className="mt-6">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                  {t("settings.preferences")}
                </p>
                {user ? (
                  <Link
                    href="/settings/preferences"
                    onClick={onClose}
                    className="flex items-center justify-between rounded-xl border border-neon-blue/20 bg-neon-blue/5 px-4 py-3 text-sm font-medium text-neon-blue transition-colors hover:bg-neon-blue/10"
                  >
                    {t("settings.preferencesLink")}
                    <span aria-hidden="true">→</span>
                  </Link>
                ) : (
                  <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-4 py-3">
                    <p className="text-xs text-[var(--text-muted)]">
                      <Link href="/login?redirect=/settings/preferences" onClick={onClose} className="text-neon-blue hover:underline">
                        {t("settings.loginLink")}
                      </Link>{" "}
                      {t("settings.preferencesGuest")}
                    </p>
                  </div>
                )}
              </div>

              {/* Section — About */}
              <div className="mt-6">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                  {t("settings.about")}
                </p>
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-4 py-3 space-y-1">
                  <p className="text-xs text-[var(--text-secondary)]">
                    {t("settings.aboutName")}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {t("settings.aboutSources")}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg bg-sky-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-600"
                >
                  {t("settings.done")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
